import { db } from "@/db/client";
import { surgicalCases, actionItems, replacementProposals, operatingRoomSlots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const cases = await db.select().from(surgicalCases).where(eq(surgicalCases.caseStatus, "scheduled"));
  const totalCases = cases.length;
  const readyCases = cases.filter((c) => c.readinessStatus === "ready").length;
  const atRiskCases = cases.filter((c) => c.readinessStatus === "at_risk").length;
  const blockedCases = cases.filter((c) => c.readinessStatus === "blocked").length;
  const orMinsAtRisk = cases
    .filter((c) => c.readinessStatus === "at_risk" || c.readinessStatus === "blocked")
    .reduce((sum, c) => sum + c.durationMinutes, 0);

  const actions = await db.select().from(actionItems);
  const completed = actions.filter((a) => a.status === "completed");
  const pendingActions = actions.filter((a) => a.status === "pending").length;
  const overdueActions = actions.filter((a) => a.status === "overdue").length;

  // Average resolution time from real timestamps (completed actions only).
  const resolutionHours = completed
    .filter((a) => a.createdAt && a.completedAt)
    .map((a) => (new Date(a.completedAt as string).getTime() - new Date(a.createdAt).getTime()) / 3_600_000)
    .filter((h) => h >= 0);
  const avgResolution =
    resolutionHours.length > 0
      ? `${(resolutionHours.reduce((s, h) => s + h, 0) / resolutionHours.length).toFixed(1)} hours`
      : "No data yet";

  const proposals = await db.select().from(replacementProposals);
  const approvedProposals = proposals.filter((p) => p.status === "approved").length;

  // Recovered capacity = duration of slots that have been rescued.
  const slots = await db.select().from(operatingRoomSlots);
  const recoveredMinutes = slots.filter((s) => s.status === "rescued").reduce((sum, s) => sum + s.durationMinutes, 0);

  // Open (pending or overdue) work by owning department, scaled relative to the largest bucket.
  const deptCounts = actions.filter((a) => a.status !== "completed").reduce((acc: Record<string, number>, item) => {
    acc[item.ownerDepartment] = (acc[item.ownerDepartment] || 0) + 1;
    return acc;
  }, {});
  const commonBlockers = Object.entries(deptCounts)
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);
  const maxDept = commonBlockers.length > 0 ? commonBlockers[0].count : 1;

  const kpis = [
    { label: "Scheduled cases", val: totalCases, icon: "clinical_notes", color: "text-primary" },
    { label: "Ready", val: readyCases, icon: "check_circle", color: "clinical-teal-text" },
    { label: "At risk", val: atRiskCases, icon: "warning", color: "clinical-amber-text" },
    { label: "Blocked", val: blockedCases, icon: "block", color: "clinical-red-text" },
  ];

  const summary = [
    { label: "OR minutes at risk", val: orMinsAtRisk, tone: "text-error" },
    { label: "Actions resolved", val: completed.length, tone: "text-primary" },
    { label: "Actions pending", val: pendingActions, tone: "clinical-amber-text" },
    { label: "Actions overdue", val: overdueActions, tone: "text-error" },
    { label: "Average resolution time", val: avgResolution, tone: "text-on-surface" },
    { label: "Slot rescue proposals", val: proposals.length, tone: "text-on-surface" },
    { label: "Swaps approved", val: approvedProposals, tone: "clinical-teal-text" },
    { label: "Recovered OR capacity", val: `${recoveredMinutes} min`, tone: "clinical-teal-text" },
  ];

  return (
    <div className="p-4 md:p-container_padding max-w-[1200px] mx-auto w-full">
      <div className="pb-stack_md">
        <h1 className="font-headline-md text-headline-md text-on-surface mb-1">Analytics</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Readiness and operational metrics for tomorrow&apos;s list. All figures are computed from the database.</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-stack_md mb-stack_lg">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack_md shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{kpi.label}</span>
              <span className={`material-symbols-outlined ${kpi.color}`} aria-hidden="true">{kpi.icon}</span>
            </div>
            <p className="font-display-lg text-display-lg text-on-surface font-black mt-1 tabular-nums">{kpi.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-grid_gutter">
        {/* Blockers by department */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-container_padding shadow-sm">
          <h2 className="font-title-md text-title-md text-on-surface font-bold mb-4">Open work by department</h2>
          {commonBlockers.length === 0 ? (
            <p className="text-on-surface-variant text-center py-6">No open actions.</p>
          ) : (
            <div className="space-y-4">
              {commonBlockers.map((b) => (
                <div key={b.department}>
                  <div className="flex justify-between font-body-md text-body-md text-on-surface mb-1">
                    <span>{b.department}</span>
                    <span className="font-semibold tabular-nums">{b.count} {b.count === 1 ? "action" : "actions"}</span>
                  </div>
                  <div className="w-full bg-surface-variant h-2.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${Math.round((b.count / maxDept) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operational summary */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-container_padding shadow-sm">
          <h2 className="font-title-md text-title-md text-on-surface font-bold mb-4">Operational summary</h2>
          <dl className="font-body-md text-body-md text-on-surface">
            {summary.map((row, i) => (
              <div key={row.label} className={`flex justify-between py-2 ${i < summary.length - 1 ? "border-b border-outline-variant" : ""}`}>
                <dt className="text-on-surface-variant">{row.label}</dt>
                <dd className={`font-semibold tabular-nums ${row.tone}`}>{row.val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
