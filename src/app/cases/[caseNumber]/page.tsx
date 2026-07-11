import { db } from "@/db/client";
import { surgicalCases, patients, surgeons, operatingRooms, readinessRequirements, evidenceDocuments, actionItems, communications, auditEvents } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import CaseDetailClient from "./CaseDetailClient";

interface PageProps {
  params: {
    caseNumber: string;
  };
}

export default async function CaseDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const { caseNumber } = params;

  // 1. Fetch main case details
  const [sCase] = db
    .select({
      id: surgicalCases.id,
      caseNumber: surgicalCases.caseNumber,
      procedureName: surgicalCases.procedureName,
      scheduledStart: surgicalCases.scheduledStart,
      durationMinutes: surgicalCases.durationMinutes,
      readinessScore: surgicalCases.readinessScore,
      readinessStatus: surgicalCases.readinessStatus,
      caseStatus: surgicalCases.caseStatus,
      patientName: patients.maskedName,
      patientMrn: patients.syntheticPatientId,
      surgeonName: surgeons.fullName,
      roomCode: operatingRooms.code,
    })
    .from(surgicalCases)
    .innerJoin(patients, eq(surgicalCases.patientId, patients.id))
    .innerJoin(surgeons, eq(surgicalCases.surgeonId, surgeons.id))
    .innerJoin(operatingRooms, eq(surgicalCases.operatingRoomId, operatingRooms.id))
    .where(eq(surgicalCases.caseNumber, caseNumber))
    .limit(1)
    .all();

  if (!sCase) {
    notFound();
  }

  // 2. Fetch requirements
  const requirements = db
    .select()
    .from(readinessRequirements)
    .where(eq(readinessRequirements.surgicalCaseId, sCase.id))
    .all();

  // 3. Fetch evidence documents
  const evidence = db
    .select()
    .from(evidenceDocuments)
    .where(eq(evidenceDocuments.surgicalCaseId, sCase.id))
    .all();

  // 4. Fetch action items
  const actions = db
    .select()
    .from(actionItems)
    .where(eq(actionItems.surgicalCaseId, sCase.id))
    .all();

  // 5. Fetch communications
  const comms = db
    .select()
    .from(communications)
    .where(eq(communications.surgicalCaseId, sCase.id))
    .all();

  // 6. Fetch audit trail for the case
  const audit = db
    .select({
      id: auditEvents.id,
      actorType: auditEvents.actorType,
      eventType: auditEvents.eventType,
      reason: auditEvents.reason,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .where(eq(auditEvents.caseId, sCase.id))
    .orderBy(desc(auditEvents.createdAt))
    .all();

  return (
    <CaseDetailClient
      sCase={sCase}
      requirements={requirements}
      evidence={evidence}
      actions={actions}
      comms={comms}
      audit={audit}
    />
  );
}
