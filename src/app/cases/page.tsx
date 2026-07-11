import { db } from "@/db/client";
import { surgicalCases, patients, surgeons, operatingRooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { formatSurgeonName, formatTime } from "@/lib/format";

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
    room?: string;
    surgeon?: string;
    sort?: string;
  };
}

export default async function CasesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const query = searchParams.q || "";
  const statusFilter = searchParams.status || "all";
  const roomFilter = searchParams.room || "all";
  const surgeonFilter = searchParams.surgeon || "all";
  const sortBy = searchParams.sort || "time";

  // Fetch lists for filters
  const rooms = db.select().from(operatingRooms).all();
  const allSurgeons = db.select().from(surgeons).all();

  let casesList = db
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
    .where(eq(surgicalCases.caseStatus, "scheduled"))
    .all();

  // Search filter
  if (query) {
    const qLower = query.toLowerCase();
    casesList = casesList.filter(
      (c) =>
        c.caseNumber.toLowerCase().includes(qLower) ||
        c.patientName.toLowerCase().includes(qLower) ||
        c.procedureName.toLowerCase().includes(qLower) ||
        c.surgeonName.toLowerCase().includes(qLower)
    );
  }

  // Status Filter
  if (statusFilter !== "all") {
    casesList = casesList.filter((c) => c.readinessStatus === statusFilter);
  }

  // Room Filter
  if (roomFilter !== "all") {
    casesList = casesList.filter((c) => c.roomCode === roomFilter);
  }

  // Surgeon Filter
  if (surgeonFilter !== "all") {
    casesList = casesList.filter((c) => c.surgeonName === surgeonFilter);
  }

  // Sorting
  if (sortBy === "readiness") {
    casesList.sort((a, b) => b.readinessScore - a.readinessScore);
  } else if (sortBy === "risk") {
    // blocked first, then at_risk, then ready
    const statusPriority = { blocked: 3, at_risk: 2, ready: 1 };
    casesList.sort((a, b) => {
      const aVal = statusPriority[a.readinessStatus as keyof typeof statusPriority] || 0;
      const bVal = statusPriority[b.readinessStatus as keyof typeof statusPriority] || 0;
      return bVal - aVal;
    });
  } else {
    // Default time sorting
    casesList.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
  }

  return (
    <div className="p-4 md:p-container_padding max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-stack_lg gap-stack_md">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface mb-1">Surgical Cases</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Readiness status for every scheduled case.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack_md shadow-sm mb-stack_lg">
        <form method="GET" action="/cases" className="grid grid-cols-1 md:grid-cols-5 gap-stack_md">
          {/* Search */}
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant mb-1 block">Search</label>
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Case ID, Patient, Procedure..."
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md"
            />
          </div>

          {/* Status */}
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant mb-1 block">Readiness Status</label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="ready">Ready</option>
              <option value="at_risk">At Risk</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          {/* Room */}
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant mb-1 block">Operating Room</label>
            <select
              name="room"
              defaultValue={roomFilter}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md cursor-pointer"
            >
              <option value="all">All Rooms</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.code}>{r.code}</option>
              ))}
            </select>
          </div>

          {/* Surgeon */}
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant mb-1 block">Surgeon</label>
            <select
              name="surgeon"
              defaultValue={surgeonFilter}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md cursor-pointer"
            >
              <option value="all">All Surgeons</option>
              {allSurgeons.map((s) => (
                <option key={s.id} value={s.fullName}>{s.fullName}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant mb-1 block">Sort By</label>
            <select
              name="sort"
              defaultValue={sortBy}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md cursor-pointer"
            >
              <option value="time">Scheduled Time</option>
              <option value="readiness">Readiness Score</option>
              <option value="risk">Risk Priority</option>
            </select>
          </div>

          <div className="md:col-span-5 flex justify-end gap-3 mt-2">
            <Link
              href="/cases"
              className="px-4 py-2 border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              Reset Filters
            </Link>
            <button
              type="submit"
              className="px-5 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {/* Result count */}
      <p className="font-caption text-caption text-on-surface-variant mb-2" aria-live="polite">
        {casesList.length} {casesList.length === 1 ? "case" : "cases"}
        {statusFilter !== "all" || roomFilter !== "all" || surgeonFilter !== "all" || query ? " matching filters" : " scheduled"}
      </p>

      {/* Cases Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead className="bg-surface-container border-b border-outline-variant">
              <tr>
                <th scope="col" className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">Case ID</th>
                <th scope="col" className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">Time</th>
                <th scope="col" className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">Patient / MRN</th>
                <th scope="col" className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">Procedure</th>
                <th scope="col" className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">Room / Surgeon</th>
                <th scope="col" className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">Readiness</th>
                <th scope="col" className="py-3 px-4 font-label-md text-label-md text-on-surface-variant">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-body-md text-body-md">
              {casesList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[40px] block mb-2" aria-hidden="true">search_off</span>
                    <p className="font-body-lg mb-1">No cases match these filters.</p>
                    <Link href="/cases" className="text-primary font-label-md hover:underline">Reset filters</Link>
                  </td>
                </tr>
              ) : (
                casesList.map((c) => {
                  let statusBg = "clinical-teal-bg clinical-teal-text";
                  let statusLabel = "Ready";
                  let bar = "bg-[#177C76]";
                  if (c.readinessStatus === "at_risk") {
                    statusBg = "clinical-amber-bg clinical-amber-text";
                    statusLabel = "At Risk";
                    bar = "bg-[#E65100]";
                  } else if (c.readinessStatus === "blocked") {
                    statusBg = "clinical-red-bg clinical-red-text";
                    statusLabel = "Blocked";
                    bar = "bg-[#C62828]";
                  }

                  return (
                    <tr key={c.id} className="hover:bg-surface-container-low transition-colors cursor-pointer h-[72px]">
                      <td className="py-3 px-4 font-title-md text-primary font-bold">
                        <Link href={`/cases/${c.caseNumber}`} className="block h-full w-full focus-visible:outline-none focus-visible:underline">{c.caseNumber}</Link>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant tabular-nums">
                        <Link href={`/cases/${c.caseNumber}`} className="block h-full w-full">{formatTime(c.scheduledStart)}</Link>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/cases/${c.caseNumber}`} className="block h-full w-full">
                          <div className="font-title-md text-title-md">{c.patientName}</div>
                          <div className="font-caption text-caption text-on-surface-variant">MRN: {c.patientMrn}</div>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/cases/${c.caseNumber}`} className="block h-full w-full">{c.procedureName}</Link>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/cases/${c.caseNumber}`} className="block h-full w-full">
                          <div>{c.roomCode}</div>
                          <div className="font-caption text-caption text-on-surface-variant">{formatSurgeonName(c.surgeonName)}</div>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/cases/${c.caseNumber}`} className="block h-full w-full">
                          <div className="flex items-center gap-2">
                            <span className="font-title-md font-bold tabular-nums">{c.readinessScore}%</span>
                            <div className="w-16 h-2 bg-surface-variant rounded-full overflow-hidden">
                              <div className={`h-full ${bar}`} style={{ width: `${c.readinessScore}%` }}></div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/cases/${c.caseNumber}`} className="block h-full w-full">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${statusBg} font-label-md text-[10px] uppercase font-bold`}>
                            <span className="material-symbols-outlined" style={{ fontSize: "13px" }} aria-hidden="true">{statusLabel === "Ready" ? "check_circle" : statusLabel === "At Risk" ? "warning" : "block"}</span>
                            {statusLabel}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
