"use server";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateReadiness } from "@/lib/readiness";
import { auth, signOut } from "@/auth";
import { revalidatePath } from "next/cache";
import { isDemoMode } from "@/lib/env";
import { seedDatabase } from "@/lib/seed";
import { getReadinessThresholds } from "@/lib/settings";
import { z } from "zod";

// Helper to check user authorization
async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// Monotonic-ish unique id for audit rows so two events in the same millisecond never collide.
let auditCounter = 0;
function auditId() {
  auditCounter = (auditCounter + 1) % 1_000_000;
  return `au-evt-${Date.now()}-${auditCounter}`;
}

// Id + ISO timestamp for a new audit row. The column default (SQLite CURRENT_TIMESTAMP) uses a
// different format from the seeded ISO rows, which breaks the newest-first ordering.
function auditStamp() {
  return { id: auditId(), createdAt: new Date().toISOString() };
}

const idSchema = z.string().trim().min(1).max(128);

// Server-side sign-out (Auth.js v5). Using the server action avoids the client-side
// CSRF token dance that can log "MissingCSRF" during signout in the beta client.
export async function logout() {
  await signOut({ redirectTo: "/login" });
}

// 1. Evidence Verification Actions
export async function updateEvidenceStatus(
  evidenceId: string,
  status: "acknowledged" | "flagged_incorrect"
) {
  const user = await requireAuth();
  idSchema.parse(evidenceId);
  z.enum(["acknowledged", "flagged_incorrect"]).parse(status);
  const thresholds = await getReadinessThresholds();

  return db.transaction(async (tx) => {
    const [evidence] = await tx
      .select()
      .from(schema.evidenceDocuments)
      .where(eq(schema.evidenceDocuments.id, evidenceId))
      .limit(1);

    if (!evidence) {
      throw new Error("Evidence not found");
    }

    const previousState = { reviewStatus: evidence.reviewStatus };

    await tx
      .update(schema.evidenceDocuments)
      .set({ reviewStatus: status })
      .where(eq(schema.evidenceDocuments.id, evidenceId));

    const reqStatus = status === "acknowledged" ? "completed" : "missing";

    const [requirement] = await tx
      .select()
      .from(schema.readinessRequirements)
      .where(eq(schema.readinessRequirements.id, evidence.requirementId))
      .limit(1);

    const previousReqStatus = requirement?.status;

    if (requirement) {
      await tx
        .update(schema.readinessRequirements)
        .set({ status: reqStatus, lastCheckedAt: new Date().toISOString() })
        .where(eq(schema.readinessRequirements.id, evidence.requirementId));
    }

    const reqs = await tx
      .select()
      .from(schema.readinessRequirements)
      .where(eq(schema.readinessRequirements.surgicalCaseId, evidence.surgicalCaseId));

    const mappedReqs = reqs.map((r) => ({
      id: r.id,
      requirementType: r.requirementType,
      category: r.category,
      status: r.status as any,
      severity: r.severity as any,
    }));

    const calculation = calculateReadiness(mappedReqs, thresholds);

    const [sCase] = await tx
      .select()
      .from(schema.surgicalCases)
      .where(eq(schema.surgicalCases.id, evidence.surgicalCaseId))
      .limit(1);

    const previousCaseState = sCase
      ? { readinessScore: sCase.readinessScore, readinessStatus: sCase.readinessStatus }
      : null;

    await tx
      .update(schema.surgicalCases)
      .set({
        readinessScore: calculation.score,
        readinessStatus: calculation.status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.surgicalCases.id, evidence.surgicalCaseId));

    await tx.insert(schema.auditEvents).values({
      ...auditStamp(),
      caseId: evidence.surgicalCaseId,
      actorUserId: (user as any).id,
      actorType: "user",
      eventType: status === "acknowledged" ? "evidence_acknowledged" : "evidence_flagged",
      entityType: "evidence_document",
      entityId: evidenceId,
      previousStateJson: JSON.stringify({
        evidence: previousState,
        requirement: { status: previousReqStatus },
        case: previousCaseState,
      }),
      newStateJson: JSON.stringify({
        evidence: { reviewStatus: status },
        requirement: { status: reqStatus },
        case: { readinessScore: calculation.score, readinessStatus: calculation.status },
      }),
      reason:
        status === "acknowledged"
          ? `Evidence acknowledged by ${user.name ?? "coordinator"}; requirement marked completed.`
          : `Evidence flagged as incorrect by ${user.name ?? "coordinator"}; requirement returned to missing.`,
      approvalStatus: "recorded",
    });

    revalidatePath("/cases");
    return { success: true, status: calculation.status, score: calculation.score };
  });
}

// 1b. Request clinical review on a requirement: sets clinical_review, opens a follow-up action, recalculates, audits.
export async function requestClinicalReview(requirementId: string) {
  const user = await requireAuth();
  idSchema.parse(requirementId);
  const thresholds = await getReadinessThresholds();

  return db.transaction(async (tx) => {
    const [requirement] = await tx
      .select()
      .from(schema.readinessRequirements)
      .where(eq(schema.readinessRequirements.id, requirementId))
      .limit(1);
    if (!requirement) throw new Error("Requirement not found");

    const previousStatus = requirement.status;
    const now = new Date().toISOString();

    await tx
      .update(schema.readinessRequirements)
      .set({ status: "clinical_review", lastCheckedAt: now })
      .where(eq(schema.readinessRequirements.id, requirementId));

    const followId = `a-review-${requirement.id}`;
    const [existing] = await tx
      .select({ id: schema.actionItems.id })
      .from(schema.actionItems)
      .where(eq(schema.actionItems.id, followId))
      .limit(1);
    if (!existing) {
      await tx.insert(schema.actionItems).values({
        id: followId,
        surgicalCaseId: requirement.surgicalCaseId,
        requirementId: requirement.id,
        title: `Clinical review: ${requirement.requirementType.replace(/_/g, " ")}`,
        description: `Clinical review requested for ${requirement.requirementType.replace(/_/g, " ")}. A reviewer must confirm before this requirement clears.`,
        actionType: "review_comms",
        priority: "high",
        status: "pending",
        ownerDepartment: "Clinical Review",
        requiresApproval: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const reqs = await tx
      .select()
      .from(schema.readinessRequirements)
      .where(eq(schema.readinessRequirements.surgicalCaseId, requirement.surgicalCaseId));
    const calculation = calculateReadiness(
      reqs.map((r) => ({ id: r.id, requirementType: r.requirementType, category: r.category, status: r.status as any, severity: r.severity as any })),
      thresholds
    );
    await tx
      .update(schema.surgicalCases)
      .set({ readinessScore: calculation.score, readinessStatus: calculation.status, updatedAt: now })
      .where(eq(schema.surgicalCases.id, requirement.surgicalCaseId));

    await tx.insert(schema.auditEvents).values({
      ...auditStamp(),
      caseId: requirement.surgicalCaseId,
      actorUserId: (user as any).id,
      actorType: "user",
      eventType: "clinical_review_requested",
      entityType: "readiness_requirement",
      entityId: requirementId,
      previousStateJson: JSON.stringify({ status: previousStatus }),
      newStateJson: JSON.stringify({ status: "clinical_review", followUpAction: followId }),
      reason: `Clinical review requested for ${requirement.requirementType.replace(/_/g, " ")} by ${user.name ?? "coordinator"}; follow-up action opened.`,
      approvalStatus: "pending",
    });

    revalidatePath("/cases");
    return { success: true };
  });
}

// 2. Action Items / Communication Approval
export async function approveCommunication(communicationId: string, enText: string, arText: string) {
  const user = await requireAuth();
  idSchema.parse(communicationId);
  const content = z
    .object({ en: z.string().trim().min(1).max(4000), ar: z.string().trim().min(1).max(4000) })
    .parse({ en: enText, ar: arText });
  enText = content.en;
  arText = content.ar;

  return db.transaction(async (tx) => {
    const [comms] = await tx
      .select()
      .from(schema.communications)
      .where(eq(schema.communications.id, communicationId))
      .limit(1);

    if (!comms) {
      throw new Error("Communication draft not found");
    }

    const previousCommsState = { status: comms.status, finalContent: comms.finalContent };
    const now = new Date().toISOString();

    await tx
      .update(schema.communications)
      .set({
        status: "sent",
        finalContent: JSON.stringify({ en: enText, ar: arText }),
        approvedBy: (user as any).id,
        approvedAt: now,
        sentAt: now,
      })
      .where(eq(schema.communications.id, communicationId));

    const [action] = await tx
      .select()
      .from(schema.actionItems)
      .where(eq(schema.actionItems.id, comms.actionItemId))
      .limit(1);

    const previousActionState = action ? { status: action.status } : null;

    if (action) {
      await tx
        .update(schema.actionItems)
        .set({ status: "completed", approvedBy: (user as any).id, approvedAt: now, completedAt: now, updatedAt: now })
        .where(eq(schema.actionItems.id, comms.actionItemId));
    }

    await tx.insert(schema.auditEvents).values({
      ...auditStamp(),
      caseId: comms.surgicalCaseId,
      actorUserId: (user as any).id,
      actorType: "user",
      eventType: "communication_sent",
      entityType: "communication",
      entityId: communicationId,
      previousStateJson: JSON.stringify({ communication: previousCommsState, action: previousActionState }),
      newStateJson: JSON.stringify({
        communication: { status: "sent", finalContent: { en: enText, ar: arText } },
        action: { status: "completed" },
      }),
      reason: `Bilingual patient message approved by ${user.name ?? "coordinator"}. Simulated send recorded — no external message was dispatched.`,
      approvalStatus: "approved",
    });

    revalidatePath("/actions");
    return { success: true };
  });
}

// 2a. Save an edited communication draft without approving it.
export async function saveCommunicationDraft(communicationId: string, enText: string, arText: string) {
  const user = await requireAuth();
  idSchema.parse(communicationId);
  const content = z
    .object({ en: z.string().trim().min(1).max(4000), ar: z.string().trim().min(1).max(4000) })
    .parse({ en: enText, ar: arText });

  return db.transaction(async (tx) => {
    const [comms] = await tx
      .select()
      .from(schema.communications)
      .where(eq(schema.communications.id, communicationId))
      .limit(1);
    if (!comms) throw new Error("Communication draft not found");
    if (comms.status === "sent") throw new Error("This message has already been sent and cannot be edited.");

    await tx
      .update(schema.communications)
      .set({ draftContent: JSON.stringify({ en: content.en, ar: content.ar }) })
      .where(eq(schema.communications.id, communicationId));

    await tx.insert(schema.auditEvents).values({
      ...auditStamp(),
      caseId: comms.surgicalCaseId,
      actorUserId: (user as any).id,
      actorType: "user",
      eventType: "communication_draft_saved",
      entityType: "communication",
      entityId: communicationId,
      newStateJson: JSON.stringify({ status: "draft" }),
      reason: `Draft edited and saved by ${user.name ?? "coordinator"}. Not sent.`,
      approvalStatus: "recorded",
    });

    revalidatePath("/actions");
    return { success: true };
  });
}

// 2b. Return a communication draft for further review (auditable, keeps it in draft).
export async function returnCommunicationForReview(communicationId: string, note?: string) {
  const user = await requireAuth();
  idSchema.parse(communicationId);
  const reason = z.string().trim().max(500).optional().parse(note);

  return db.transaction(async (tx) => {
    const [comms] = await tx
      .select()
      .from(schema.communications)
      .where(eq(schema.communications.id, communicationId))
      .limit(1);
    if (!comms) throw new Error("Communication draft not found");

    await tx.insert(schema.auditEvents).values({
      ...auditStamp(),
      caseId: comms.surgicalCaseId,
      actorUserId: (user as any).id,
      actorType: "user",
      eventType: "communication_returned",
      entityType: "communication",
      entityId: communicationId,
      previousStateJson: JSON.stringify({ status: comms.status }),
      newStateJson: JSON.stringify({ status: "draft" }),
      reason:
        reason && reason.length > 0
          ? `Draft returned for review by ${user.name ?? "coordinator"}: ${reason}`
          : `Draft returned for review by ${user.name ?? "coordinator"}. Not sent.`,
      approvalStatus: "returned",
    });

    revalidatePath("/actions");
    return { success: true };
  });
}

// 3. Slot Rescue Propose Replacement
export async function proposeReplacement(slotId: string, proposedCaseId: string) {
  const user = await requireAuth();
  idSchema.parse(slotId);
  idSchema.parse(proposedCaseId);

  return db.transaction(async (tx) => {
    const [slot] = await tx
      .select()
      .from(schema.operatingRoomSlots)
      .where(eq(schema.operatingRoomSlots.id, slotId))
      .limit(1);

    if (!slot) {
      throw new Error("OR slot not found");
    }
    // Refusals are returned rather than thrown: production builds hide thrown messages from the client.
    if (slot.status !== "endangered") {
      return { success: false, error: "This slot has already been rescued." };
    }

    const [candidate] = await tx
      .select({ eligible: schema.standbyCandidates.eligible })
      .from(schema.standbyCandidates)
      .where(and(eq(schema.standbyCandidates.slotId, slotId), eq(schema.standbyCandidates.surgicalCaseId, proposedCaseId)))
      .limit(1);
    if (!candidate) return { success: false, error: "That case is not a standby candidate for this slot." };
    if (!candidate.eligible) return { success: false, error: "That candidate is ineligible and cannot be proposed." };

    // One open proposal per slot, so the scheduling officer never faces competing swaps.
    const [pending] = await tx
      .select({ id: schema.replacementProposals.id })
      .from(schema.replacementProposals)
      .where(and(eq(schema.replacementProposals.slotId, slotId), eq(schema.replacementProposals.status, "pending")))
      .limit(1);
    if (pending) {
      return { success: false, error: "A proposal for this slot is already awaiting scheduling-officer review." };
    }

    const now = new Date().toISOString();
    const proposalId = `prop-${Date.now()}-${auditCounter}`;
    await tx.insert(schema.replacementProposals).values({
      id: proposalId,
      slotId,
      originalCaseId: slot.originalCaseId,
      proposedCaseId,
      status: "pending",
      proposedBy: (user as any).id,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(schema.auditEvents).values({
      ...auditStamp(),
      caseId: proposedCaseId,
      actorUserId: (user as any).id,
      actorType: "user",
      eventType: "proposal_created",
      entityType: "replacement_proposal",
      entityId: proposalId,
      newStateJson: JSON.stringify({ slotId, originalCaseId: slot.originalCaseId, proposedCaseId, status: "pending" }),
      reason: `Standby candidate proposed for the endangered slot by ${user.name ?? "coordinator"}. Requires scheduling-officer approval; no booking has been made.`,
      approvalStatus: "pending",
    });

    revalidatePath("/slot-rescue");
    return { success: true, proposalId };
  });
}

// 3b. Request patient confirmation for a standby candidate (simulated, audited — no external message).
export async function requestPatientConfirmation(slotId: string, proposedCaseId: string) {
  const user = await requireAuth();
  idSchema.parse(slotId);
  idSchema.parse(proposedCaseId);

  const [slot] = await db
    .select({ id: schema.operatingRoomSlots.id, roomCode: schema.operatingRooms.code })
    .from(schema.operatingRoomSlots)
    .innerJoin(schema.operatingRooms, eq(schema.operatingRoomSlots.operatingRoomId, schema.operatingRooms.id))
    .where(eq(schema.operatingRoomSlots.id, slotId))
    .limit(1);
  if (!slot) throw new Error("OR slot not found");

  await db.insert(schema.auditEvents).values({
    ...auditStamp(),
    caseId: proposedCaseId,
    actorUserId: (user as any).id,
    actorType: "user",
    eventType: "patient_confirmation_requested",
    entityType: "surgical_case",
    entityId: proposedCaseId,
    reason: `Standby confirmation requested for the ${slot.roomCode} slot by ${user.name ?? "coordinator"}. Simulated request recorded — no external message was sent.`,
    approvalStatus: "recorded",
  });

  revalidatePath("/slot-rescue");
  return { success: true };
}

// 4. Approve/Reject Proposal
export async function approveProposal(proposalId: string, approve: boolean, rejectionReason?: string) {
  const user = await requireAuth();
  idSchema.parse(proposalId);
  z.boolean().parse(approve);
  const reason = z.string().trim().max(500).optional().parse(rejectionReason);

  if (user.role !== "scheduling_officer" && user.role !== "administrator") {
    throw new Error("Forbidden");
  }

  return db.transaction(async (tx) => {
    const [proposal] = await tx
      .select()
      .from(schema.replacementProposals)
      .where(eq(schema.replacementProposals.id, proposalId))
      .limit(1);

    if (!proposal) {
      throw new Error("Proposal not found");
    }
    if (proposal.status !== "pending") {
      return { success: false, error: `This proposal has already been ${proposal.status}.` };
    }

    const [slot] = await tx
      .select({ status: schema.operatingRoomSlots.status })
      .from(schema.operatingRoomSlots)
      .where(eq(schema.operatingRoomSlots.id, proposal.slotId))
      .limit(1);
    if (approve && slot?.status === "rescued") {
      return { success: false, error: "This slot has already been rescued by another approved swap." };
    }

    const previousState = { status: proposal.status };
    const status = approve ? "approved" : "rejected";
    const now = new Date().toISOString();

    await tx
      .update(schema.replacementProposals)
      .set({ status, approvedBy: (user as any).id, rejectionReason: approve ? null : reason, updatedAt: now })
      .where(eq(schema.replacementProposals.id, proposalId));

    if (approve) {
      await tx
        .update(schema.operatingRoomSlots)
        .set({ status: "rescued" })
        .where(eq(schema.operatingRoomSlots.id, proposal.slotId));

      // The slot is filled, so any competing proposal for it is closed out (and audited).
      const competing = await tx
        .select({ id: schema.replacementProposals.id, proposedCaseId: schema.replacementProposals.proposedCaseId })
        .from(schema.replacementProposals)
        .where(and(eq(schema.replacementProposals.slotId, proposal.slotId), eq(schema.replacementProposals.status, "pending")));
      for (const other of competing) {
        await tx
          .update(schema.replacementProposals)
          .set({ status: "rejected", approvedBy: (user as any).id, rejectionReason: "Slot filled by another approved swap.", updatedAt: now })
          .where(eq(schema.replacementProposals.id, other.id));
        await tx.insert(schema.auditEvents).values({
          ...auditStamp(),
          caseId: other.proposedCaseId,
          actorUserId: (user as any).id,
          actorType: "user",
          eventType: "proposal_rejected",
          entityType: "replacement_proposal",
          entityId: other.id,
          previousStateJson: JSON.stringify({ status: "pending" }),
          newStateJson: JSON.stringify({ status: "rejected" }),
          reason: "Proposal closed automatically: the slot was filled by another approved swap.",
          approvalStatus: "rejected",
        });
      }
    }

    await tx.insert(schema.auditEvents).values({
      ...auditStamp(),
      caseId: proposal.proposedCaseId,
      actorUserId: (user as any).id,
      actorType: "user",
      eventType: approve ? "proposal_approved" : "proposal_rejected",
      entityType: "replacement_proposal",
      entityId: proposalId,
      previousStateJson: JSON.stringify(previousState),
      newStateJson: JSON.stringify({ status, approvedBy: (user as any).id }),
      reason: approve
        ? `Standby swap approved by ${user.name ?? "scheduling officer"}; slot marked rescued.`
        : `Standby swap rejected by ${user.name ?? "scheduling officer"}${reason ? `: ${reason}` : "."}`,
      approvalStatus: approve ? "approved" : "rejected",
    });

    revalidatePath("/slot-rescue");
    return { success: true };
  });
}

// 5. Update global settings (administrator only)
const settingsSchema = z.object({
  hospitalName: z.string().trim().min(2).max(120),
  warningThreshold: z.number().int().min(0).max(100),
  criticalThreshold: z.number().int().min(0).max(100),
  defaultLanguage: z.enum(["en", "ar"]),
});

export async function updateSettings(input: z.infer<typeof settingsSchema>) {
  const user = await requireAuth();
  if (user.role !== "administrator") {
    throw new Error("Forbidden: settings can only be changed by an administrator.");
  }

  const parsed = settingsSchema.parse(input);
  if (parsed.criticalThreshold > parsed.warningThreshold) {
    throw new Error("Critical threshold cannot exceed the warning threshold.");
  }

  const now = new Date().toISOString();
  const userId = (user as any).id as string;

  await db.transaction(async (tx) => {
    const write = (key: string, value: unknown) =>
      tx
        .update(schema.systemSettings)
        .set({ valueJson: JSON.stringify(value), updatedAt: now, updatedBy: userId })
        .where(eq(schema.systemSettings.key, key));
    await write("hospital_name", parsed.hospitalName);
    await write("warning_threshold", parsed.warningThreshold);
    await write("critical_threshold", parsed.criticalThreshold);
    await write("default_language", parsed.defaultLanguage);
  });

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

// 6. Reset database (administrator only, demo mode) — runs the seed in-process and audits it.
export async function resetDemoData() {
  const user = await requireAuth();

  if (user.role !== "administrator") {
    throw new Error("Forbidden");
  }
  if (!isDemoMode()) {
    throw new Error("Demo data reset is disabled unless DEMO_MODE=true");
  }

  try {
    await seedDatabase();

    await db.insert(schema.auditEvents).values({
      ...auditStamp(),
      caseId: null,
      actorUserId: (user as any).id,
      actorType: "user",
      eventType: "demo_data_reset",
      entityType: "system",
      entityId: "database",
      reason: `Demo data reset to seeded baseline by ${user.name ?? "administrator"}.`,
      approvalStatus: "approved",
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error(err);
    throw new Error("Seed failed");
  }
}

// 7. Manual update requirement status (e.g. anaesthesia review)
const requirementStatusSchema = z.enum([
  "completed",
  "pending",
  "missing",
  "overdue",
  "blocked",
  "clinical_review",
  "not_applicable",
]);

export async function updateRequirementStatus(requirementId: string, status: schema.RequirementStatus) {
  const user = await requireAuth();
  idSchema.parse(requirementId);
  requirementStatusSchema.parse(status);
  const thresholds = await getReadinessThresholds();

  return db.transaction(async (tx) => {
    const [requirement] = await tx
      .select()
      .from(schema.readinessRequirements)
      .where(eq(schema.readinessRequirements.id, requirementId))
      .limit(1);

    if (!requirement) {
      throw new Error("Requirement not found");
    }

    const previousStatus = requirement.status;

    await tx
      .update(schema.readinessRequirements)
      .set({ status, lastCheckedAt: new Date().toISOString() })
      .where(eq(schema.readinessRequirements.id, requirementId));

    const reqs = await tx
      .select()
      .from(schema.readinessRequirements)
      .where(eq(schema.readinessRequirements.surgicalCaseId, requirement.surgicalCaseId));

    const calculation = calculateReadiness(
      reqs.map((r) => ({
        id: r.id,
        requirementType: r.requirementType,
        category: r.category,
        status: r.status as any,
        severity: r.severity as any,
      })),
      thresholds
    );

    await tx
      .update(schema.surgicalCases)
      .set({
        readinessScore: calculation.score,
        readinessStatus: calculation.status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.surgicalCases.id, requirement.surgicalCaseId));

    await tx.insert(schema.auditEvents).values({
      ...auditStamp(),
      caseId: requirement.surgicalCaseId,
      actorUserId: (user as any).id,
      actorType: "user",
      eventType: "requirement_updated",
      entityType: "readiness_requirement",
      entityId: requirementId,
      previousStateJson: JSON.stringify({ status: previousStatus, readiness: null }),
      newStateJson: JSON.stringify({ status, readinessScore: calculation.score, readinessStatus: calculation.status }),
      reason: `${requirement.requirementType.replace(/_/g, " ")} set to ${status.replace(/_/g, " ")} by ${user.name ?? "coordinator"}; readiness recalculated to ${calculation.score}%.`,
      approvalStatus: "recorded",
    });

    revalidatePath("/cases");
    return { success: true, status: calculation.status, score: calculation.score };
  });
}
