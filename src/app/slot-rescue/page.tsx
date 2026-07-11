import { db } from "@/db/client";
import { operatingRoomSlots, standbyCandidates, surgicalCases, patients, surgeons, operatingRooms, replacementProposals } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SlotRescueClient from "./SlotRescueClient";

export default async function SlotRescuePage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  // 1. Fetch the active demo OR slot, including rescued status after officer approval.
  const [slot] = await db
    .select({
      id: operatingRoomSlots.id,
      operatingRoomId: operatingRoomSlots.operatingRoomId,
      originalCaseId: operatingRoomSlots.originalCaseId,
      startTime: operatingRoomSlots.startTime,
      endTime: operatingRoomSlots.endTime,
      durationMinutes: operatingRoomSlots.durationMinutes,
      status: operatingRoomSlots.status,
      roomCode: operatingRooms.code,
      roomName: operatingRooms.name,
      originalCaseNumber: surgicalCases.caseNumber,
      originalProcedure: surgicalCases.procedureName,
    })
    .from(operatingRoomSlots)
    .innerJoin(operatingRooms, eq(operatingRoomSlots.operatingRoomId, operatingRooms.id))
    .innerJoin(surgicalCases, eq(operatingRoomSlots.originalCaseId, surgicalCases.id))
    .where(inArray(operatingRoomSlots.status, ["endangered", "rescued"]))
    .limit(1)
    .all();

  // 2. Fetch candidates for this slot
  const candidates = slot
    ? await db
        .select({
          id: standbyCandidates.id,
          overallScore: standbyCandidates.overallScore,
          eligible: standbyCandidates.eligible,
          rankingReason: standbyCandidates.rankingReason,
          failedConstraintsJson: standbyCandidates.failedConstraintsJson,
          durationScore: standbyCandidates.durationScore,
          teamScore: standbyCandidates.teamScore,
          equipmentScore: standbyCandidates.equipmentScore,
          availabilityScore: standbyCandidates.availabilityScore,
          candidateReadiness: standbyCandidates.readinessScore,
          caseId: surgicalCases.id,
          caseNumber: surgicalCases.caseNumber,
          procedureName: surgicalCases.procedureName,
          durationMinutes: surgicalCases.durationMinutes,
          readinessScore: surgicalCases.readinessScore,
          patientName: patients.maskedName,
          surgeonName: surgeons.fullName,
        })
        .from(standbyCandidates)
        .innerJoin(surgicalCases, eq(standbyCandidates.surgicalCaseId, surgicalCases.id))
        .innerJoin(patients, eq(surgicalCases.patientId, patients.id))
        .innerJoin(surgeons, eq(surgicalCases.surgeonId, surgeons.id))
        .where(eq(standbyCandidates.slotId, slot.id))
        .all()
    : [];

  // Sort candidates by overall score descending
  candidates.sort((a, b) => b.overallScore - a.overallScore);

  // 3. Fetch active proposals for this slot
  const proposals = slot
    ? await db
        .select({
          id: replacementProposals.id,
          status: replacementProposals.status,
          proposedCaseId: replacementProposals.proposedCaseId,
          proposedCaseNumber: surgicalCases.caseNumber,
          proposedPatientName: patients.maskedName,
          proposedProcedure: surgicalCases.procedureName,
        })
        .from(replacementProposals)
        .innerJoin(surgicalCases, eq(replacementProposals.proposedCaseId, surgicalCases.id))
        .innerJoin(patients, eq(surgicalCases.patientId, patients.id))
        .where(eq(replacementProposals.slotId, slot.id))
        .all()
    : [];

  return (
    <SlotRescueClient
      slot={slot}
      candidates={candidates}
      proposals={proposals}
      userRole={session.user?.role || "coordinator"}
    />
  );
}
