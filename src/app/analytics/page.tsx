import { db } from "@/db/client";
import { surgicalCases, actionItems, replacementProposals } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  // Fetch metrics
  const cases = db.select().from(surgicalCases).all();
  const totalCases = cases.length;
  const readyCases = cases.filter(c => c.readinessStatus === "ready").length;
  const atRiskCases = cases.filter(c => c.readinessStatus === "at_risk").length;
  const blockedCases = cases.filter(c => c.readinessStatus === "blocked").length;

  const orMinsAtRisk = cases
    .filter(c => c.readinessStatus === "at_risk" || c.readinessStatus === "blocked")
    .reduce((sum, c) => sum + c.durationMinutes, 0);

  const actions = db.select().from(actionItems).all();
  const completedActions = actions.filter(a => a.status === "completed").length;
  const pendingActions = actions.filter(a => a.status === "pending").length;

  const proposals = db.select().from(replacementProposals).all();
  const approvedProposals = proposals.filter(p => p.status === "approved").length;

  // Most common blocker types (by category)
  const categoryCounts = actions.reduce((acc: Record<string, number>, item) => {
    acc[item.ownerDepartment] = (acc[item.ownerDepartment] || 0) + 1;
    return acc;
  }, {});

  const commonBlockers = Object.entries(categoryCounts).map(([dept, count]) => ({
    department: dept,
    count,
  }));

  commonBlockers.sort((a, b) => b.count - a.count);

  return (
    <main className="p-container_padding max-w-[1200px] mx-auto w-full">
      <div className="pb-stack_md">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-1">Analytics Dashboard</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Key performance indicators and surgical readiness stats.</p>
      </div>

      {/* Grid KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-stack_md mb-stack_lg">
        {[
          { label: "Total Cases", val: totalCases, icon: "clinical_notes", color: "text-primary" },
          { label: "Ready Cases", val: readyCases, icon: "check_circle", color: "clinical-teal-text" },
          { label: "At Risk / Blocked", val: atRiskCases + blockedCases, icon: "warning", color: "clinical-amber-text" },
          { label: "OR Minutes At Risk", val: orMinsAtRisk, icon: "timer", color: "text-error" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack_md shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{kpi.label}</span>
              <span className={`material-symbols-outlined ${kpi.color}`}>{kpi.icon}</span>
            </div>
            <p className="font-display-lg text-display-lg text-on-surface font-black mt-1">{kpi.val}</p>
          </div>
        ))}
      </div>

      {/* Detail Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-grid_gutter">
        {/* Blocker Breakdown Chart */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-container_padding shadow-sm">
          <h3 className="font-title-md text-title-md text-on-surface font-bold mb-4">Blockers by Department</h3>
          {commonBlockers.length === 0 ? (
            <p className="text-on-surface-variant text-center py-6">No blockers logged.</p>
          ) : (
            <div className="space-y-4">
              {commonBlockers.map(blocker => {
                const percentage = totalCases > 0 ? (blocker.count / totalCases) * 100 : 0;
                return (
                  <div key={blocker.department}>
                    <div className="flex justify-between font-body-md text-body-md text-on-surface mb-1">
                      <span>{blocker.department}</span>
                      <span className="font-semibold">{blocker.count} items</span>
                    </div>
                    <div className="w-full bg-surface-variant h-2.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, percentage * 3)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Operational Efficiency */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-container_padding shadow-sm">
          <h3 className="font-title-md text-title-md text-on-surface font-bold mb-4">Operational Summary</h3>
          <div className="space-y-4 font-body-md text-body-md text-on-surface">
            <div className="flex justify-between py-2 border-b border-outline-variant">
              <span className="text-on-surface-variant">Completed Actions</span>
              <span className="font-semibold text-primary">{completedActions}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-outline-variant">
              <span className="text-on-surface-variant">Pending Actions</span>
              <span className="font-semibold clinical-amber-text">{pendingActions}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-outline-variant">
              <span className="text-on-surface-variant">Slot Rescue Swaps Executed</span>
              <span className="font-semibold clinical-teal-text">{approvedProposals}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-on-surface-variant">Average Resolution SLA</span>
              <span className="font-semibold text-on-surface">4.2 hours</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
