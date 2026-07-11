import { auth } from "@/auth";
import { db } from "@/db/client";
import {
  actionItems,
  auditEvents,
  patients,
  readinessRequirements,
  replacementProposals,
  surgicalCases,
} from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ notifications: [] }, { status: 401 });
  }

  const overdueActions = await db
    .select({
      id: actionItems.id,
      title: actionItems.title,
      caseNumber: surgicalCases.caseNumber,
    })
    .from(actionItems)
    .innerJoin(surgicalCases, eq(actionItems.surgicalCaseId, surgicalCases.id))
    .where(eq(actionItems.status, "overdue"))
    .limit(3)
    .all();

  const reviewCases = await db
    .select({
      id: readinessRequirements.id,
      caseNumber: surgicalCases.caseNumber,
      patientName: patients.maskedName,
      requirementType: readinessRequirements.requirementType,
    })
    .from(readinessRequirements)
    .innerJoin(surgicalCases, eq(readinessRequirements.surgicalCaseId, surgicalCases.id))
    .innerJoin(patients, eq(surgicalCases.patientId, patients.id))
    .where(inArray(readinessRequirements.status, ["clinical_review", "pending"]))
    .limit(4)
    .all();

  const proposals = await db
    .select({
      id: replacementProposals.id,
      proposedCaseId: replacementProposals.proposedCaseId,
      caseNumber: surgicalCases.caseNumber,
      status: replacementProposals.status,
    })
    .from(replacementProposals)
    .innerJoin(surgicalCases, eq(replacementProposals.proposedCaseId, surgicalCases.id))
    .where(eq(replacementProposals.status, "pending"))
    .limit(3)
    .all();

  const recentAudit = await db
    .select({
      id: auditEvents.id,
      eventType: auditEvents.eventType,
      reason: auditEvents.reason,
      caseId: auditEvents.caseId,
    })
    .from(auditEvents)
    .where(
      inArray(auditEvents.eventType, [
        "evidence_acknowledged",
        "communication_sent",
        "proposal_created",
        "proposal_approved",
        "proposal_rejected",
      ])
    )
    .orderBy(desc(auditEvents.createdAt))
    .limit(3)
    .all();

  const notifications = [
    ...overdueActions.map((item) => ({
      id: `action-${item.id}`,
      title: "Overdue action",
      detail: `${item.caseNumber}: ${item.title}`,
      href: "/actions",
    })),
    ...reviewCases.map((item) => ({
      id: `review-${item.id}`,
      title: "Clinical review needed",
      detail: `${item.caseNumber} (${item.patientName}): ${item.requirementType.replace(/_/g, " ")}`,
      href: `/cases/${item.caseNumber}`,
    })),
    ...proposals.map((item) => ({
      id: `proposal-${item.id}`,
      title: "Pending slot proposal",
      detail: `${item.caseNumber} requires scheduling officer approval`,
      href: "/slot-rescue",
    })),
    ...recentAudit.map((item) => ({
      id: `audit-${item.id}`,
      title: item.eventType.replace(/_/g, " "),
      detail: item.reason || "Recent audit event",
      href: "/audit",
    })),
  ];

  return NextResponse.json({ notifications: notifications.slice(0, 8) });
}
