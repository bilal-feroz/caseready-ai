import { db } from "@/db/client";
import { actionItems, surgicalCases, patients, communications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ActionsClient from "./ActionsClient";

export default async function ActionsPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  // Fetch actions
  const allActions = await db
    .select({
      id: actionItems.id,
      title: actionItems.title,
      description: actionItems.description,
      actionType: actionItems.actionType,
      priority: actionItems.priority,
      status: actionItems.status,
      ownerDepartment: actionItems.ownerDepartment,
      requiresApproval: actionItems.requiresApproval,
      dueAt: actionItems.dueAt,
      completedAt: actionItems.completedAt,
      caseNumber: surgicalCases.caseNumber,
      procedureName: surgicalCases.procedureName,
      patientName: patients.maskedName,
    })
    .from(actionItems)
    .innerJoin(surgicalCases, eq(actionItems.surgicalCaseId, surgicalCases.id))
    .innerJoin(patients, eq(surgicalCases.patientId, patients.id))
    .orderBy(desc(actionItems.priority))
    .all();

  // Fetch communications
  const comms = await db.select().from(communications);

  return (
    <ActionsClient
      initialActions={allActions}
      comms={comms}
    />
  );
}
