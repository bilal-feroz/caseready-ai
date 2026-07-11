"use server";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateReadiness } from "@/lib/readiness";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { execSync } from "node:child_process";
import { isDemoMode } from "@/lib/env";

// Helper to check user authorization
async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// 1. Evidence Verification Actions
export async function updateEvidenceStatus(
  evidenceId: string,
  status: "acknowledged" | "flagged_incorrect"
) {
  const user = await requireAuth();

  return db.transaction((tx) => {
    // 1. Get the evidence doc
    const [evidence] = tx
      .select()
      .from(schema.evidenceDocuments)
      .where(eq(schema.evidenceDocuments.id, evidenceId))
      .limit(1)
      .all();

    if (!evidence) {
      throw new Error("Evidence not found");
    }

    const previousState = { reviewStatus: evidence.reviewStatus };

    // 2. Update review status
    tx.update(schema.evidenceDocuments)
      .set({ reviewStatus: status })
      .where(eq(schema.evidenceDocuments.id, evidenceId))
      .run();

    // 3. Map review status to requirement status
    const reqStatus = status === "acknowledged" ? "completed" : "missing";

    const [requirement] = tx
      .select()
      .from(schema.readinessRequirements)
      .where(eq(schema.readinessRequirements.id, evidence.requirementId))
      .limit(1)
      .all();

    const previousReqStatus = requirement?.status;

    if (requirement) {
      tx.update(schema.readinessRequirements)
        .set({ status: reqStatus, lastCheckedAt: new Date().toISOString() })
        .where(eq(schema.readinessRequirements.id, evidence.requirementId))
        .run();
    }

    // 4. Recalculate case readiness
    const reqs = tx
      .select()
      .from(schema.readinessRequirements)
      .where(eq(schema.readinessRequirements.surgicalCaseId, evidence.surgicalCaseId))
      .all();

    // Map DB fields to Readiness engine interface
    const mappedReqs = reqs.map(r => ({
      id: r.id,
      requirementType: r.requirementType,
      category: r.category,
      status: r.status as any,
      severity: r.severity as any,
    }));

    const calculation = calculateReadiness(mappedReqs);

    const [sCase] = tx
      .select()
      .from(schema.surgicalCases)
      .where(eq(schema.surgicalCases.id, evidence.surgicalCaseId))
      .limit(1)
      .all();

    const previousCaseState = sCase
      ? { readinessScore: sCase.readinessScore, readinessStatus: sCase.readinessStatus }
      : null;

    tx.update(schema.surgicalCases)
      .set({
        readinessScore: calculation.score,
        readinessStatus: calculation.status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.surgicalCases.id, evidence.surgicalCaseId))
      .run();

    // 5. Log audit event
    tx.insert(schema.auditEvents)
      .values({
        id: `au-evt-${Date.now()}`,
        caseId: evidence.surgicalCaseId,
        actorUserId: (user as any).id,
        actorType: "user",
        eventType: "evidence_acknowledged",
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
        reason: `Evidence ${status} by medical coordinator`,
      })
      .run();

    return { success: true };
  });
}

// 2. Action Items / Communication Approval
export async function approveCommunication(
  communicationId: string,
  enText: string,
  arText: string
) {
  const user = await requireAuth();

  return db.transaction((tx) => {
    // 1. Get communication
    const [comms] = tx
      .select()
      .from(schema.communications)
      .where(eq(schema.communications.id, communicationId))
      .limit(1)
      .all();

    if (!comms) {
      throw new Error("Communication draft not found");
    }

    const previousCommsState = { status: comms.status, finalContent: comms.finalContent };

    // 2. Update communication to sent
    const now = new Date().toISOString();
    tx.update(schema.communications)
      .set({
        status: "sent",
        finalContent: JSON.stringify({ en: enText, ar: arText }),
        approvedBy: (user as any).id,
        approvedAt: now,
        sentAt: now,
      })
      .where(eq(schema.communications.id, communicationId))
      .run();

    // 3. Mark action item as completed
    const [action] = tx
      .select()
      .from(schema.actionItems)
      .where(eq(schema.actionItems.id, comms.actionItemId))
      .limit(1)
      .all();

    const previousActionState = action ? { status: action.status } : null;

    if (action) {
      tx.update(schema.actionItems)
        .set({
          status: "completed",
          approvedBy: (user as any).id,
          approvedAt: now,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.actionItems.id, comms.actionItemId))
        .run();
    }

    // 4. Log audit event
    tx.insert(schema.auditEvents)
      .values({
        id: `au-evt-${Date.now()}`,
        caseId: comms.surgicalCaseId,
        actorUserId: (user as any).id,
        actorType: "user",
        eventType: "communication_sent",
        entityType: "communication",
        entityId: communicationId,
        previousStateJson: JSON.stringify({
          communication: previousCommsState,
          action: previousActionState,
        }),
        newStateJson: JSON.stringify({
          communication: { status: "sent", finalContent: { en: enText, ar: arText } },
          action: { status: "completed" },
        }),
        reason: "Pre-admissions WhatsApp notification draft approved and sent",
      })
      .run();

    return { success: true };
  });
}

// 3. Slot Rescue Propose Replacement
export async function proposeReplacement(slotId: string, proposedCaseId: string) {
  const user = await requireAuth();

  return db.transaction((tx) => {
    // Check if slot exists
    const [slot] = tx
      .select()
      .from(schema.operatingRoomSlots)
      .where(eq(schema.operatingRoomSlots.id, slotId))
      .limit(1)
      .all();

    if (!slot) {
      throw new Error("OR slot not found");
    }

    // Create proposal
    const proposalId = `prop-${Date.now()}`;
    tx.insert(schema.replacementProposals)
      .values({
        id: proposalId,
        slotId,
        originalCaseId: slot.originalCaseId,
        proposedCaseId,
        status: "pending",
        proposedBy: (user as any).id,
      })
      .run();

    // Log audit event
    tx.insert(schema.auditEvents)
      .values({
        id: `au-evt-${Date.now()}`,
        caseId: proposedCaseId,
        actorUserId: (user as any).id,
        actorType: "user",
        eventType: "proposal_created",
        entityType: "replacement_proposal",
        entityId: proposalId,
        newStateJson: JSON.stringify({ slotId, originalCaseId: slot.originalCaseId, proposedCaseId, status: "pending" }),
        reason: "Rescheduled standby candidate proposed for endangered slot",
      })
      .run();

    return { success: true, proposalId };
  });
}

// 4. Approve/Reject Proposal
export async function approveProposal(
  proposalId: string,
  approve: boolean,
  rejectionReason?: string
) {
  const user = await requireAuth();

  // Authorize: scheduling_officer or administrator
  if (user.role !== "scheduling_officer" && user.role !== "administrator") {
    throw new Error("Forbidden");
  }

  return db.transaction((tx) => {
    const [proposal] = tx
      .select()
      .from(schema.replacementProposals)
      .where(eq(schema.replacementProposals.id, proposalId))
      .limit(1)
      .all();

    if (!proposal) {
      throw new Error("Proposal not found");
    }

    const previousState = { status: proposal.status };
    const status = approve ? "approved" : "rejected";
    const now = new Date().toISOString();

    // Update proposal
    tx.update(schema.replacementProposals)
      .set({
        status,
        approvedBy: (user as any).id,
        rejectionReason: approve ? null : rejectionReason,
        updatedAt: now,
      })
      .where(eq(schema.replacementProposals.id, proposalId))
      .run();

    // Update OR slot status if approved
    if (approve) {
      tx.update(schema.operatingRoomSlots)
        .set({ status: "rescued" })
        .where(eq(schema.operatingRoomSlots.id, proposal.slotId))
        .run();
    }

    // Log audit event
    tx.insert(schema.auditEvents)
      .values({
        id: `au-evt-${Date.now()}`,
        caseId: proposal.proposedCaseId,
        actorUserId: (user as any).id,
        actorType: "user",
        eventType: approve ? "proposal_approved" : "proposal_rejected",
        entityType: "replacement_proposal",
        entityId: proposalId,
        previousStateJson: JSON.stringify(previousState),
        newStateJson: JSON.stringify({ status, approvedBy: (user as any).id }),
        reason: approve ? "Standby swap approved" : `Standby swap rejected: ${rejectionReason}`,
      })
      .run();

    return { success: true };
  });
}

// 5. Update global settings
export async function updateSettings(
  hospitalName: string,
  warningThreshold: number,
  criticalThreshold: number
) {
  const user = await requireAuth();

  db.transaction((tx) => {
    tx.update(schema.systemSettings)
      .set({ valueJson: JSON.stringify(hospitalName), updatedAt: new Date().toISOString(), updatedBy: (user as any).id })
      .where(eq(schema.systemSettings.key, "hospital_name"))
      .run();

    tx.update(schema.systemSettings)
      .set({ valueJson: JSON.stringify(warningThreshold), updatedAt: new Date().toISOString(), updatedBy: (user as any).id })
      .where(eq(schema.systemSettings.key, "warning_threshold"))
      .run();

    tx.update(schema.systemSettings)
      .set({ valueJson: JSON.stringify(criticalThreshold), updatedAt: new Date().toISOString(), updatedBy: (user as any).id })
      .where(eq(schema.systemSettings.key, "critical_threshold"))
      .run();
  });

  return { success: true };
}

// 6. Reset database
export async function resetDemoData() {
  const user = await requireAuth();

  if (user.role !== "administrator") {
    throw new Error("Forbidden");
  }
  if (!isDemoMode()) {
    throw new Error("Demo data reset is disabled unless DEMO_MODE=true");
  }

  try {
    execSync("npm run db:seed", { stdio: "inherit" });
    return { success: true };
  } catch (err) {
    console.error(err);
    throw new Error("Seed failed");
  }
}

// 7. Manual update requirement status (e.g. anaesthesia review)
export async function updateRequirementStatus(requirementId: string, status: schema.RequirementStatus) {
  const user = await requireAuth();

  return db.transaction((tx) => {
    const [requirement] = tx
      .select()
      .from(schema.readinessRequirements)
      .where(eq(schema.readinessRequirements.id, requirementId))
      .limit(1)
      .all();

    if (!requirement) {
      throw new Error("Requirement not found");
    }

    const previousStatus = requirement.status;

    tx.update(schema.readinessRequirements)
      .set({ status, lastCheckedAt: new Date().toISOString() })
      .where(eq(schema.readinessRequirements.id, requirementId))
      .run();

    // Recalculate case readiness
    const reqs = tx
      .select()
      .from(schema.readinessRequirements)
      .where(eq(schema.readinessRequirements.surgicalCaseId, requirement.surgicalCaseId))
      .all();

    const calculation = calculateReadiness(
      reqs.map(r => ({
        id: r.id,
        requirementType: r.requirementType,
        category: r.category,
        status: r.status as any,
        severity: r.severity as any,
      }))
    );

    tx.update(schema.surgicalCases)
      .set({
        readinessScore: calculation.score,
        readinessStatus: calculation.status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.surgicalCases.id, requirement.surgicalCaseId))
      .run();

    // Log audit
    tx.insert(schema.auditEvents)
      .values({
        id: `au-evt-${Date.now()}`,
        caseId: requirement.surgicalCaseId,
        actorUserId: (user as any).id,
        actorType: "user",
        eventType: "readiness_recalculated",
        entityType: "readiness_requirement",
        entityId: requirementId,
        previousStateJson: JSON.stringify({ status: previousStatus }),
        newStateJson: JSON.stringify({ status }),
        reason: `Requirement ${requirement.requirementType} updated manually to ${status}`,
      })
      .run();

    return { success: true };
  });
}
