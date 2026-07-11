import { db } from "@/db/client";
import { auditEvents, users, surgicalCases } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AuditClient from "./AuditClient";

interface PageProps {
  searchParams: {
    q?: string;
    actor?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: string;
  };
}

export default async function AuditPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const query = searchParams.q || "";
  const actorFilter = searchParams.actor || "all";
  const typeFilter = searchParams.type || "all";
  const fromDate = searchParams.from || "";
  const toDate = searchParams.to || "";
  const pageNum = parseInt(searchParams.page || "1", 10);
  const pageSize = 10;

  let events = db
    .select({
      id: auditEvents.id,
      caseId: auditEvents.caseId,
      caseNumber: surgicalCases.caseNumber,
      actorType: auditEvents.actorType,
      eventType: auditEvents.eventType,
      entityType: auditEvents.entityType,
      entityId: auditEvents.entityId,
      approvalStatus: auditEvents.approvalStatus,
      previousStateJson: auditEvents.previousStateJson,
      newStateJson: auditEvents.newStateJson,
      reason: auditEvents.reason,
      createdAt: auditEvents.createdAt,
      actorName: users.fullName,
    })
    .from(auditEvents)
    .leftJoin(users, eq(auditEvents.actorUserId, users.id))
    .leftJoin(surgicalCases, eq(auditEvents.caseId, surgicalCases.id))
    .orderBy(desc(auditEvents.createdAt))
    .all();

  if (query) {
    const qLower = query.toLowerCase();
    events = events.filter(
      (e) =>
        (e.reason && e.reason.toLowerCase().includes(qLower)) ||
        e.eventType.toLowerCase().includes(qLower) ||
        (e.caseNumber && e.caseNumber.toLowerCase().includes(qLower)) ||
        (e.actorName && e.actorName.toLowerCase().includes(qLower))
    );
  }
  if (actorFilter !== "all") events = events.filter((e) => e.actorType === actorFilter);
  if (typeFilter !== "all") events = events.filter((e) => e.eventType === typeFilter);
  if (fromDate) events = events.filter((e) => e.createdAt.slice(0, 10) >= fromDate);
  if (toDate) events = events.filter((e) => e.createdAt.slice(0, 10) <= toDate);

  const totalEntries = events.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safePage = Math.min(Math.max(1, pageNum), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedEvents = events.slice(startIndex, startIndex + pageSize);

  // Distinct types computed from the full (unfiltered by type) set for stable options.
  const distinctTypes = Array.from(
    new Set(db.select({ t: auditEvents.eventType }).from(auditEvents).all().map((e) => e.t))
  ).sort();

  return (
    <AuditClient
      events={paginatedEvents}
      totalEntries={totalEntries}
      totalPages={totalPages}
      pageNum={safePage}
      query={query}
      actorFilter={actorFilter}
      typeFilter={typeFilter}
      fromDate={fromDate}
      toDate={toDate}
      distinctTypes={distinctTypes}
    />
  );
}
