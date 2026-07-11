import { db } from "@/db/client";
import { surgicalCases, patients, surgeons, operatingRooms, actionItems } from "@/db/schema";
import { eq, or, like, and } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

interface PageProps {
  searchParams: {
    q?: string;
    tab?: string;
  };
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const query = searchParams.q || "";
  const selectedTab = searchParams.tab || "all";

  // Fetch all cases for Monday, 13 July 2026 (or all tomorrow cases)
  let allCases = db
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
    .all();

  // Search filter (in-memory or SQLite)
  if (query) {
    const qLower = query.toLowerCase();
    allCases = allCases.filter(
      (c) =>
        c.caseNumber.toLowerCase().includes(qLower) ||
        c.patientName.toLowerCase().includes(qLower) ||
        c.procedureName.toLowerCase().includes(qLower) ||
        c.surgeonName.toLowerCase().includes(qLower) ||
        c.roomCode.toLowerCase().includes(qLower)
    );
  }

  // OR filter
  if (selectedTab !== "all") {
    // tab format e.g. "or1", "or2", mapping to "OR 01", "OR 02"
    const orCode = selectedTab.toUpperCase().replace("OR", "OR ");
    allCases = allCases.filter((c) => c.roomCode === orCode);
  }

  // Calculate dynamic KPIs
  const scheduledCount = allCases.length;
  const readyCount = allCases.filter((c) => c.readinessStatus === "ready").length;
  const atRiskCount = allCases.filter((c) => c.readinessStatus === "at_risk").length;
  const blockedCount = allCases.filter((c) => c.readinessStatus === "blocked").length;

  // OR Mins At Risk: sum of duration of at_risk and blocked cases
  const minsAtRisk = allCases
    .filter((c) => c.readinessStatus === "at_risk" || c.readinessStatus === "blocked")
    .reduce((sum, c) => sum + c.durationMinutes, 0);

  // Fetch real action items for the attention queue
  const attentionItems = db
    .select({
      id: actionItems.id,
      title: actionItems.title,
      description: actionItems.description,
      priority: actionItems.priority,
      dueAt: actionItems.dueAt,
      ownerDepartment: actionItems.ownerDepartment,
      caseNumber: surgicalCases.caseNumber,
      patientName: patients.maskedName,
      scheduledStart: surgicalCases.scheduledStart,
      roomCode: operatingRooms.code,
    })
    .from(actionItems)
    .innerJoin(surgicalCases, eq(actionItems.surgicalCaseId, surgicalCases.id))
    .innerJoin(patients, eq(surgicalCases.patientId, patients.id))
    .innerJoin(operatingRooms, eq(surgicalCases.operatingRoomId, operatingRooms.id))
    .where(eq(actionItems.status, "pending"))
    .all();

  return (
    <main className="p-container_padding max-w-[1600px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-stack_lg gap-stack_md">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface mb-stack_sm">Good morning, {session.user?.name}</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Here is tomorrow&apos;s surgical readiness across {scheduledCount} cases.</p>
        </div>
        <div className="flex items-center gap-stack_md">
          <div className="flex items-center gap-2 bg-surface-container-lowest px-4 py-2 border border-outline-variant rounded-lg shadow-sm">
            <span className="material-symbols-outlined text-primary">calendar_month</span>
            <span className="font-title-md text-title-md text-on-surface">Monday, 13 July 2026</span>
          </div>
          <a
            href="/actions"
            className="bg-primary text-on-primary font-title-md text-title-md py-2 px-6 rounded-lg hover:bg-primary-container transition-all shadow-sm block text-center"
          >
            Review attention queue
          </a>
        </div>
      </div>

      {/* Horizontal Readiness Strip */}
      <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm mb-stack_lg overflow-hidden flex divide-x divide-outline-variant">
        <div className="flex-1 px-container_padding py-4 flex flex-col justify-center items-center group hover:bg-surface-container-low transition-colors cursor-pointer">
          <span className="font-headline-md text-headline-md text-on-surface">{scheduledCount}</span>
          <span className="font-label-md text-label-md text-on-surface-variant uppercase mt-1">Scheduled Cases</span>
        </div>
        <div className="flex-1 px-container_padding py-4 flex flex-col justify-center items-center clinical-teal-bg group hover:brightness-95 transition-all cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined clinical-teal-text">check_circle</span>
            <span className="font-headline-md text-headline-md clinical-teal-text">{readyCount}</span>
          </div>
          <span className="font-label-md text-label-md clinical-teal-text uppercase mt-1">Ready</span>
        </div>
        <div className="flex-1 px-container_padding py-4 flex flex-col justify-center items-center clinical-amber-bg group hover:brightness-95 transition-all cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined clinical-amber-text">warning</span>
            <span className="font-headline-md text-headline-md clinical-amber-text">{atRiskCount}</span>
          </div>
          <span className="font-label-md text-label-md clinical-amber-text uppercase mt-1">At Risk</span>
        </div>
        <div className="flex-1 px-container_padding py-4 flex flex-col justify-center items-center clinical-red-bg group hover:brightness-95 transition-all cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined clinical-red-text">block</span>
            <span className="font-headline-md text-headline-md clinical-red-text">{blockedCount}</span>
          </div>
          <span className="font-label-md text-label-md clinical-red-text uppercase mt-1">Blocked</span>
        </div>
        <div className="flex-1 px-container_padding py-4 flex flex-col justify-center items-center group hover:bg-surface-container-low transition-colors cursor-pointer bg-surface-container">
          <span className="font-headline-md text-headline-md text-error">{minsAtRisk}</span>
          <span className="font-label-md text-label-md text-on-surface-variant uppercase mt-1">OR Mins At Risk</span>
        </div>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-grid_gutter">
        {/* Left: Tomorrow's Operating List */}
        <div className="xl:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex flex-col overflow-hidden h-[800px]">
          <div className="px-container_padding py-stack_md border-b border-outline-variant flex justify-between items-center bg-surface bg-surface-bright">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Tomorrow&apos;s Operating List</h3>
            <div className="flex gap-2">
              <button type="button" disabled title="Not included in this demonstration." className="p-1 text-on-surface-variant/50 cursor-not-allowed transition-colors">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
              <button type="button" disabled title="Not included in this demonstration." className="p-1 text-on-surface-variant/50 cursor-not-allowed transition-colors">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
          </div>

          {/* OR Tabs */}
          <div className="px-container_padding border-b border-outline-variant flex gap-stack_md overflow-x-auto no-scrollbar">
            {["all", "or01", "or02", "or03", "or04", "or05", "or06"].map((t) => {
              const label = t === "all" ? "All Rooms" : t.toUpperCase().replace("OR", "OR ");
              const isSelected = selectedTab === t || (t === "or01" && selectedTab === "or1") || (t === "or02" && selectedTab === "or2");
              const targetTab = t.replace("or0", "or");

              return (
                <Link
                  key={t}
                  href={`/?tab=${targetTab}${query ? `&q=${query}` : ""}`}
                  className={`font-label-md text-label-md py-3 whitespace-nowrap transition-colors ${
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
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-container border-b border-outline-variant z-10">
                <tr>
                  <th className="py-2 px-4 font-label-md text-label-md text-on-surface-variant w-20">Time</th>
                  <th className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Patient / ID</th>
                  <th className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Procedure / Surgeon</th>
                  <th className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Readiness</th>
                  <th className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-body-md text-body-md text-on-surface bg-surface-container-lowest">
                {allCases.map((c) => {
                  const startTime = new Date(c.scheduledStart).toISOString().slice(11, 16);
                  
                  let barColorClass = "clinical-teal-bg";
                  let statusBg = "clinical-teal-bg clinical-teal-text";
                  let statusLabel = "Ready";
                  let statusIcon = "check_circle";

                  if (c.readinessStatus === "at_risk") {
                    barColorClass = "clinical-amber-bg";
                    statusBg = "clinical-amber-bg clinical-amber-text";
                    statusLabel = "At Risk";
                    statusIcon = "warning";
                  } else if (c.readinessStatus === "blocked") {
                    barColorClass = "clinical-red-bg";
                    statusBg = "clinical-red-bg clinical-red-text";
                    statusLabel = "Blocked";
                    statusIcon = "block";
                  }

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-surface-container-low transition-colors group cursor-pointer h-[72px]"
                    >
                      <td className="py-3 px-4 text-on-surface-variant border-r border-outline-variant relative">
                        <Link href={`/cases/${c.caseNumber}`} className="block h-full w-full">
                          {startTime}
                          <div className={`absolute right-0 top-0 bottom-0 w-1 ${barColorClass}`}></div>
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
                          <div className="font-caption text-caption text-on-surface-variant">Dr. {c.surgeonName}</div>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/cases/${c.caseNumber}`} className="block h-full w-full">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  c.readinessStatus === "ready"
                                    ? "clinical-teal-bg bg-[#177C76]"
                                    : c.readinessStatus === "at_risk"
                                    ? "clinical-amber-bg bg-[#E65100]"
                                    : "clinical-red-bg bg-[#C62828]"
                                }`}
                                style={{ width: `${c.readinessScore}%` }}
                              ></div>
                            </div>
                            <span className="font-label-md text-label-md">{c.readinessScore}%</span>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/cases/${c.caseNumber}`} className="block h-full w-full">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${statusBg} font-label-md text-[10px]`}>
                            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{statusIcon}</span> {statusLabel}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: AI Attention Queue */}
        <div className="xl:col-span-5 flex flex-col gap-stack_md h-[800px]">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex flex-col overflow-hidden flex-1 bg-surface">
            <div className="px-container_padding py-stack_md border-b border-outline-variant flex justify-between items-center bg-surface">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">campaign</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Needs attention</h3>
              </div>
              <span className="bg-error-container text-on-error-container font-label-md text-label-md px-2 py-1 rounded-full">{attentionItems.length} Items</span>
            </div>
            <div className="flex-1 overflow-auto p-container_padding flex flex-col gap-stack_md">
              {attentionItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-surface-container-lowest border border-outline-variant rounded-lg p-stack_md shadow-sm border-l-4 relative group ${
                    item.priority === "high" ? "border-l-error" : "border-l-secondary"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined ${item.priority === "high" ? "text-error" : "text-secondary"}`} style={{ fontSize: "18px" }}>
                        {item.priority === "high" ? "priority_high" : "info"}
                      </span>
                      <span className={`font-label-md text-label-md uppercase ${item.priority === "high" ? "text-error" : "text-secondary"}`}>
                        {item.priority === "high" ? "High Urgency" : "Medium Urgency"}
                      </span>
                    </div>
                    <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>schedule</span> Due Soon
                    </span>
                  </div>
                  <h4 className="font-title-md text-title-md text-on-surface mb-1">
                    {item.patientName} ({item.roomCode} - {item.caseNumber})
                  </h4>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-stack_md">{item.description}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-surface-variant flex items-center justify-center font-caption text-[10px] text-on-surface-variant border border-outline-variant">
                        {item.ownerDepartment.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-caption text-caption text-on-surface-variant">{item.ownerDepartment}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/cases/${item.caseNumber}`} className="px-3 py-1.5 border border-outline-variant rounded-md font-label-md text-label-md text-on-surface-variant hover:border-primary hover:text-primary transition-colors">
                        View evidence
                      </Link>
                      <Link href="/actions" className="px-3 py-1.5 bg-primary text-on-primary rounded-md font-label-md text-label-md hover:bg-primary-container transition-colors">
                        Review action
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* AI Insight Panel */}
          <div className="bg-primary-container text-on-primary-container rounded-xl p-container_padding shadow-sm flex items-start gap-stack_md border border-outline-variant shrink-0">
            <span className="material-symbols-outlined text-inverse-primary" style={{ fontSize: "28px" }}>auto_awesome</span>
            <div>
              <h4 className="font-title-md text-title-md text-inverse-primary mb-1">AI Insight Generated</h4>
              <p className="font-body-md text-body-md text-primary-fixed">CaseReady found {attentionItems.length} actions that may prevent cancellations across tomorrow&apos;s schedule.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
