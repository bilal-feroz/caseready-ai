import { db } from "@/db/client";
import { auditEvents, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AuditClient from "./AuditClient";

interface PageProps {
  searchParams: {
    q?: string;
    actor?: string;
    type?: string;
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
  const pageNum = parseInt(searchParams.page || "1", 10);
  const pageSize = 10;

  // Query events
  let events = db
    .select({
      id: auditEvents.id,
      caseId: auditEvents.caseId,
      actorType: auditEvents.actorType,
      eventType: auditEvents.eventType,
      entityType: auditEvents.entityType,
      entityId: auditEvents.entityId,
      previousStateJson: auditEvents.previousStateJson,
      newStateJson: auditEvents.newStateJson,
      reason: auditEvents.reason,
      createdAt: auditEvents.createdAt,
      actorName: users.fullName,
      actorEmail: users.email,
    })
    .from(auditEvents)
    .leftJoin(users, eq(auditEvents.actorUserId, users.id))
    .orderBy(desc(auditEvents.createdAt))
    .all();

  // Filter in memory
  if (query) {
    const qLower = query.toLowerCase();
    events = events.filter(
      (e) =>
        (e.reason && e.reason.toLowerCase().includes(qLower)) ||
        e.eventType.toLowerCase().includes(qLower) ||
        (e.actorName && e.actorName.toLowerCase().includes(qLower))
    );
  }

  if (actorFilter !== "all") {
    events = events.filter((e) => e.actorType === actorFilter);
  }

  if (typeFilter !== "all") {
    events = events.filter((e) => e.eventType === typeFilter);
  }

  const totalEntries = events.length;
  const totalPages = Math.ceil(totalEntries / pageSize);
  const startIndex = (pageNum - 1) * pageSize;
  const paginatedEvents = events.slice(startIndex, startIndex + pageSize);

  // Distinct types for filters
  const distinctTypes = Array.from(new Set(events.map(e => e.eventType)));

  return (
    <AuditClient
      events={paginatedEvents}
      totalEntries={totalEntries}
      totalPages={totalPages}
      pageNum={pageNum}
      query={query}
      actorFilter={actorFilter}
      typeFilter={typeFilter}
      distinctTypes={distinctTypes}
    />
  );
}
