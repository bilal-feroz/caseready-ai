import { db } from "@/db/client";
import { surgicalCases, patients, surgeons, operatingRooms, actionItems } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { formatLongDate, formatSurgeonName, formatTime, initials, uaeGreeting } from "@/lib/format";

interface PageProps {
  searchParams: {
    q?: string;
    tab?: string;
  };
}

const STATUS_META = {
  ready: { bar: "bg-[#177C76]", chip: "clinical-teal-bg clinical-teal-text", label: "Ready", icon: "check_circle" },
  at_risk: { bar: "bg-[#E65100]", chip: "clinical-amber-bg clinical-amber-text", label: "At Risk", icon: "warning" },
  blocked: { bar: "bg-[#C62828]", chip: "clinical-red-bg clinical-red-text", label: "Blocked", icon: "block" },
} as const;

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const query = searchParams.q || "";
  const selectedTab = searchParams.tab || "all";

  // Only real, scheduled cases belong on tomorrow's operating list (excludes cancelled + standby pool).
  const allCases = await db
    .select({
      id: surgicalCases.id,
      caseNumber: surgicalCases.caseNumber,
      procedureName: surgicalCases.procedureName,
      scheduledStart: surgicalCases.scheduledStart,
      durationMinutes: surgicalCases.durationMinutes,
      readinessScore: surgicalCases.readinessScore,
      readinessStatus: surgicalCases.readinessStatus,
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

  allCases.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());

  // KPIs are computed over the full scheduled list, before room/search filtering.
  const scheduledCount = allCases.length;
  const readyCount = allCases.filter((c) => c.readinessStatus === "ready").length;
  const atRiskCount = allCases.filter((c) => c.readinessStatus === "at_risk").length;
  const blockedCount = allCases.filter((c) => c.readinessStatus === "blocked").length;
  const minsAtRisk = allCases
    .filter((c) => c.readinessStatus === "at_risk" || c.readinessStatus === "blocked")
    .reduce((sum, c) => sum + c.durationMinutes, 0);

  // Apply search + OR-tab filters to the visible list only.
  let visibleCases = allCases;
  if (query) {
    const qLower = query.toLowerCase();
    visibleCases = visibleCases.filter(
      (c) =>
        c.caseNumber.toLowerCase().includes(qLower) ||
        c.patientName.toLowerCase().includes(qLower) ||
        c.procedureName.toLowerCase().includes(qLower) ||
        c.surgeonName.toLowerCase().includes(qLower) ||
        c.roomCode.toLowerCase().includes(qLower)
    );
  }
  if (selectedTab !== "all") {
    const orCode = selectedTab.toUpperCase().replace("OR", "OR ");
    visibleCases = visibleCases.filter((c) => c.roomCode === orCode);
  }

  // Attention queue: open actions (pending or overdue), most urgent first.
  const attentionItems = await db
    .select({
      id: actionItems.id,
      description: actionItems.description,
      priority: actionItems.priority,
      status: actionItems.status,
      dueAt: actionItems.dueAt,
      requiresApproval: actionItems.requiresApproval,
      ownerDepartment: actionItems.ownerDepartment,
      caseNumber: surgicalCases.caseNumber,
      patientName: patients.maskedName,
      roomCode: operatingRooms.code,
    })
    .from(actionItems)
    .innerJoin(surgicalCases, eq(actionItems.surgicalCaseId, surgicalCases.id))
    .innerJoin(patients, eq(surgicalCases.patientId, patients.id))
    .innerJoin(operatingRooms, eq(surgicalCases.operatingRoomId, operatingRooms.id))
    .where(inArray(actionItems.status, ["pending", "overdue"]))
    .all();
  // Overdue first, then high priority, then earliest due time.
  const urgency = (a: (typeof attentionItems)[number]) => (a.status === "overdue" ? 0 : a.priority === "high" ? 1 : 2);
  attentionItems.sort((a, b) => urgency(a) - urgency(b) || (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));

  const listDate = allCases.length > 0 ? formatLongDate(allCases[0].scheduledStart) : null;

  const kpiTiles = [
    { key: "all", label: "Scheduled Cases", value: scheduledCount, href: "/cases", tone: "plain", icon: null },
    { key: "ready", label: "Ready", value: readyCount, href: "/cases?status=ready", tone: "teal", icon: "check_circle" },
    { key: "at_risk", label: "At Risk", value: atRiskCount, href: "/cases?status=at_risk", tone: "amber", icon: "warning" },
    { key: "blocked", label: "Blocked", value: blockedCount, href: "/cases?status=blocked", tone: "red", icon: "block" },
  ];

  return (
    <div className="p-4 md:p-container_padding max-w-[1600px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-stack_lg gap-stack_md">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface mb-stack_sm">{uaeGreeting()}, {session.user?.name}</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Tomorrow&apos;s surgical readiness across {scheduledCount} cases in 6 operating rooms.
          </p>
        </div>
        <div className="flex items-center gap-stack_md flex-wrap">
          {listDate && (
            <div className="flex items-center gap-2 bg-surface-container-lowest px-4 py-2 border border-outline-variant rounded-lg shadow-sm">
              <span className="material-symbols-outlined text-primary" aria-hidden="true">calendar_month</span>
              <span className="font-title-md text-title-md text-on-surface">{listDate}</span>
            </div>
          )}
          <Link
            data-tour="attention-queue-button"
            href="/actions"
            className="bg-primary text-on-primary font-title-md text-title-md py-2 px-6 rounded-lg hover:bg-primary-container transition-all shadow-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Review attention queue
          </Link>
        </div>
      </div>

      {/* Readiness KPI strip — each status tile filters the case list */}
      <div data-tour="dashboard-kpis" className="w-full grid grid-cols-2 md:grid-cols-5 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm mb-stack_lg overflow-hidden divide-x divide-y md:divide-y-0 divide-outline-variant">
        {kpiTiles.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-label={`${t.value} ${t.label} — view in cases`}
            className={`px-container_padding py-4 flex flex-col justify-center items-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
              t.tone === "teal" ? "clinical-teal-bg hover:brightness-95" : t.tone === "amber" ? "clinical-amber-bg hover:brightness-95" : t.tone === "red" ? "clinical-red-bg hover:brightness-95" : "hover:bg-surface-container-low"
            }`}
          >
            <div className="flex items-center gap-2">
              {t.icon && (
                <span className={`material-symbols-outlined ${t.tone === "teal" ? "clinical-teal-text" : t.tone === "amber" ? "clinical-amber-text" : "clinical-red-text"}`} aria-hidden="true">{t.icon}</span>
              )}
              <span className={`font-headline-md text-headline-md ${t.tone === "teal" ? "clinical-teal-text" : t.tone === "amber" ? "clinical-amber-text" : t.tone === "red" ? "clinical-red-text" : "text-on-surface"}`}>{t.value}</span>
            </div>
            <span className={`font-label-md text-label-md uppercase mt-1 text-center ${t.tone === "teal" ? "clinical-teal-text" : t.tone === "amber" ? "clinical-amber-text" : t.tone === "red" ? "clinical-red-text" : "text-on-surface-variant"}`}>{t.label}</span>
          </Link>
        ))}
        <div className="px-container_padding py-4 flex flex-col justify-center items-center bg-surface-container col-span-2 md:col-span-1">
          <span className="font-headline-md text-headline-md text-error">{minsAtRisk}</span>
          <span className="font-label-md text-label-md text-on-surface-variant uppercase mt-1 text-center">OR Mins At Risk</span>
        </div>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-grid_gutter">
        {/* Left: Tomorrow's Operating List */}
        <div className="xl:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex flex-col overflow-hidden xl:h-[800px]">
          <div className="px-container_padding py-stack_md border-b border-outline-variant bg-surface-bright">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Tomorrow&apos;s Operating List</h2>
          </div>

          {/* OR Tabs */}
          <div className="px-container_padding border-b border-outline-variant flex gap-stack_md overflow-x-auto no-scrollbar" role="tablist" aria-label="Filter by operating room">
            {["all", "or01", "or02", "or03", "or04", "or05", "or06"].map((t) => {
              const label = t === "all" ? "All Rooms" : t.toUpperCase().replace("OR", "OR ");
              const isSelected = selectedTab === t;
              const targetTab = t.replace("or0", "or");
              return (
                <Link
                  key={t}
                  href={`/?tab=${targetTab}${query ? `&q=${query}` : ""}`}
                  role="tab"
                  aria-selected={isSelected}
                  className={`font-label-md text-label-md py-3 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                    isSelected ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Schedule Table */}
          <div className="flex-1 overflow-auto bg-surface-container-lowest relative">
            {visibleCases.length === 0 ? (
              <div className="p-stack_lg text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[40px] block mb-2" aria-hidden="true">search_off</span>
                <p className="font-body-md">No cases match this room or search.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[560px]">
                <thead className="sticky top-0 bg-surface-container border-b border-outline-variant z-10">
                  <tr>
                    <th scope="col" className="py-2 px-4 font-label-md text-label-md text-on-surface-variant w-20">Time</th>
                    <th scope="col" className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Patient / ID</th>
                    <th scope="col" className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Procedure / Surgeon</th>
                    <th scope="col" className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Readiness</th>
                    <th scope="col" className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant font-body-md text-body-md text-on-surface bg-surface-container-lowest">
                  {visibleCases.map((c) => {
                    const meta = STATUS_META[c.readinessStatus as keyof typeof STATUS_META] ?? STATUS_META.ready;
                    return (
                      <tr key={c.id} className="hover:bg-surface-container-low transition-colors group cursor-pointer h-[72px]">
                        <td className="py-3 px-4 text-on-surface-variant border-r border-outline-variant relative">
                          <Link href={`/cases/${c.caseNumber}`} className="block h-full w-full focus-visible:outline-none focus-visible:text-primary">
                            {formatTime(c.scheduledStart)}
                            <div className={`absolute right-0 top-0 bottom-0 w-1 ${meta.bar}`} aria-hidden="true"></div>
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/cases/${c.caseNumber}`} className="block h-full w-full">
                            <div className="font-title-md text-title-md">{c.patientName}</div>
                            <div className="font-caption text-caption text-on-surface-variant">MRN: {c.patientMrn}</div>
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/cases/${c.caseNumber}`} className="block h-full w-full">
                            <div>{c.procedureName}</div>
                            <div className="font-caption text-caption text-on-surface-variant">{formatSurgeonName(c.surgeonName)}</div>
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/cases/${c.caseNumber}`} className="block h-full w-full">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-surface-variant rounded-full overflow-hidden">
                                <div className={`h-full ${meta.bar}`} style={{ width: `${c.readinessScore}%` }}></div>
                              </div>
                              <span className="font-label-md text-label-md tabular-nums">{c.readinessScore}%</span>
                            </div>
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/cases/${c.caseNumber}`} className="block h-full w-full">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${meta.chip} font-label-md text-[10px]`}>
                              <span className="material-symbols-outlined" style={{ fontSize: "14px" }} aria-hidden="true">{meta.icon}</span> {meta.label}
                            </span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Attention Queue */}
        <div className="xl:col-span-5 flex flex-col gap-stack_md xl:h-[800px]">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex flex-col overflow-hidden flex-1">
            <div className="px-container_padding py-stack_md border-b border-outline-variant flex justify-between items-center bg-surface-bright">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" aria-hidden="true">campaign</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Needs attention</h2>
              </div>
              <span className="bg-error-container text-on-error-container font-label-md text-label-md px-2 py-1 rounded-full">{attentionItems.length} open</span>
            </div>
            <div className="flex-1 overflow-auto p-container_padding flex flex-col gap-stack_md">
              {attentionItems.length === 0 ? (
                <div className="text-center text-on-surface-variant py-8">
                  <span className="material-symbols-outlined text-[40px] block mb-2 clinical-teal-text" aria-hidden="true">task_alt</span>
                  <p className="font-body-md">No open blockers. Every case is on track.</p>
                </div>
              ) : (
                attentionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-surface-container-lowest border border-outline-variant rounded-lg p-stack_md shadow-sm border-l-4 ${
                      item.status === "overdue" || item.priority === "high" ? "border-l-error" : "border-l-secondary"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined ${item.status === "overdue" || item.priority === "high" ? "text-error" : "text-secondary"}`} style={{ fontSize: "18px" }} aria-hidden="true">
                          {item.status === "overdue" ? "event_busy" : item.priority === "high" ? "priority_high" : "info"}
                        </span>
                        <span className={`font-label-md text-label-md uppercase ${item.status === "overdue" || item.priority === "high" ? "text-error" : "text-secondary"}`}>
                          {item.status === "overdue" ? "Overdue" : item.priority === "high" ? "High priority" : "Medium priority"}
                        </span>
                      </div>
                      <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1 shrink-0">
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }} aria-hidden="true">schedule</span> {item.status === "overdue" ? "Was due" : "Due"} {formatTime(item.dueAt)}
                      </span>
                    </div>
                    <h3 className="font-title-md text-title-md text-on-surface mb-1">
                      {item.patientName} · {item.roomCode} · {item.caseNumber}
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-stack_md">{item.description}</p>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-surface-variant flex items-center justify-center font-caption text-[10px] text-on-surface-variant border border-outline-variant" aria-hidden="true">
                          {initials(item.ownerDepartment)}
                        </div>
                        <span className="font-caption text-caption text-on-surface-variant">{item.ownerDepartment}{item.requiresApproval ? " · approval required" : ""}</span>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/cases/${item.caseNumber}`} className="px-3 py-1.5 border border-outline-variant rounded-md font-label-md text-label-md text-on-surface-variant hover:border-primary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                          Open case
                        </Link>
                        <Link href="/actions" className="px-3 py-1.5 bg-primary text-on-primary rounded-md font-label-md text-label-md hover:bg-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">
                          Review action
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Operational summary — concrete, no marketing */}
          <div className="bg-primary-container text-on-primary-container rounded-xl p-container_padding shadow-sm flex items-start gap-stack_md shrink-0">
            <span className="material-symbols-outlined text-inverse-primary" style={{ fontSize: "28px" }} aria-hidden="true">insights</span>
            <div>
              <h2 className="font-title-md text-title-md text-inverse-primary mb-1">Today&apos;s coordination summary</h2>
              <p className="font-body-md text-body-md text-primary-fixed">
                {atRiskCount + blockedCount} of {scheduledCount} cases need attention · {attentionItems.length} open actions · {minsAtRisk} OR minutes at risk. Resolve blockers before the cut-off to prevent cancellations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
