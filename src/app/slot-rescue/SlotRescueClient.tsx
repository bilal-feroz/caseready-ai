"use client";

import { useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { proposeReplacement, approveProposal, requestPatientConfirmation } from "@/app/actions";
import { formatSurgeonName, formatDate, formatTimeRange } from "@/lib/format";

interface SlotRescueClientProps {
  slot: any;
  candidates: any[];
  proposals: any[];
  userRole: string;
}

const CRITERIA = [
  { label: "Standby consent", icon: "how_to_reg" },
  { label: "Fits slot duration", icon: "timer" },
  { label: "Team compatible", icon: "groups" },
  { label: "Equipment available", icon: "inventory_2" },
  { label: "Post-op bed available", icon: "bed" },
  { label: "No hard blockers", icon: "verified" },
];

export default function SlotRescueClient({ slot, candidates, proposals, userRole }: SlotRescueClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; tone: "info" | "error" } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!slot) {
    return (
      <div className="p-4 md:p-container_padding max-w-[1100px] mx-auto w-full">
        <h1 className="font-headline-md text-headline-md text-on-surface mb-1">Slot Rescue</h1>
        <div className="mt-stack_lg bg-surface-container-lowest border border-outline-variant rounded-lg p-stack_lg text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px] block mb-2 clinical-teal-text" aria-hidden="true">task_alt</span>
          <p className="font-body-lg text-body-lg">No endangered slots require rescue right now.</p>
        </div>
      </div>
    );
  }

  const canApprove = userRole === "scheduling_officer" || userRole === "administrator";
  const bestCandidate = candidates.find((c) => c.eligible);
  const isRescued = slot.status === "rescued";

  const run = async (fn: () => Promise<any>, text: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fn();
      if (res?.success) {
        setFeedback({ text, tone: "info" });
        router.refresh();
      } else {
        setFeedback({ text: "The update did not complete.", tone: "error" });
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({ text: err?.message?.includes("ineligible") ? "That candidate is ineligible and cannot be proposed." : "Something went wrong. Please try again.", tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePropose = (caseId: string) => run(() => proposeReplacement(slot.id, caseId), "Replacement proposed. Awaiting scheduling officer approval. No booking has been made.");
  const handleApproveProposal = (proposalId: string, approve: boolean) =>
    run(() => approveProposal(proposalId, approve, approve ? undefined : "Declined by scheduling officer"), `Proposal ${approve ? "approved — slot marked rescued" : "rejected"}.`);
  const handleRequestConfirmation = (caseId: string) =>
    run(() => requestPatientConfirmation(slot.id, caseId), "Confirmation request recorded (simulated). No external message was sent.");

  return (
    <div className="p-4 md:p-container_padding max-w-[1100px] mx-auto w-full">
      <div className="pb-stack_md">
        <h1 className="font-headline-md text-headline-md text-on-surface mb-1">Slot Rescue</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Recover operating-room capacity when a scheduled case cannot proceed. Every swap needs human approval — nothing is booked automatically.</p>
      </div>

      {feedback && (
        <div className={`mb-stack_lg p-3 rounded-lg flex items-center gap-2 border ${feedback.tone === "error" ? "bg-error-container text-on-error-container border-error/20" : "bg-primary-fixed/20 text-primary border-primary/20"}`} role="status">
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }} aria-hidden="true">{feedback.tone === "error" ? "error" : "info"}</span>
          <span className="font-title-md text-[13px]">{feedback.text}</span>
        </div>
      )}

      {/* Target Slot */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-container_padding shadow-sm mb-stack_lg">
        <div className="flex flex-wrap items-center justify-between gap-stack_md">
          <div className="flex items-center gap-stack_md">
            <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-error" style={{ fontSize: "24px" }} aria-hidden="true">event_busy</span>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Endangered slot</p>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">{slot.roomCode} · {formatDate(slot.startTime)}</h2>
              <div className="flex items-center gap-3 mt-1 font-body-md text-body-md text-on-surface-variant flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">schedule</span> {formatTimeRange(slot.startTime, slot.endTime)} ({slot.durationMinutes} min)
                </span>
                <span aria-hidden="true">|</span>
                <span>Original: {slot.originalProcedure}</span>
                <span aria-hidden="true">|</span>
                <span>Cancelled: patient unavailable</span>
              </div>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-label-md text-label-md rounded-lg border ${
            isRescued ? "clinical-teal-bg clinical-teal-text border-teal-200" : "clinical-amber-bg clinical-amber-text border-amber-200"
          }`}>
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">{isRescued ? "task_alt" : "warning"}</span>
            Status: {isRescued ? "Rescued" : "Cancellation likely"}
          </span>
        </div>
      </div>

      {/* Proposals */}
      {proposals.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-container_padding shadow-sm mb-stack_lg">
          <h2 className="font-title-md text-title-md text-on-surface font-bold mb-1">Replacement proposals</h2>
          <p className="font-caption text-caption text-on-surface-variant mb-3">Human approval required. A scheduling officer must approve before the slot is rescued.</p>
          <div className="space-y-3">
            {proposals.map((prop) => (
              <div key={prop.id} className="p-stack_md border border-outline-variant rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low">
                <div>
                  <p className="font-title-md font-semibold text-on-surface">{prop.proposedPatientName} · {prop.proposedCaseNumber}</p>
                  <p className="font-body-md text-on-surface-variant mt-0.5">{prop.proposedProcedure}</p>
                  <p className="font-caption text-caption text-on-surface-variant mt-1">Status: <span className="font-bold uppercase text-primary">{prop.status}</span></p>
                </div>
                {prop.status === "pending" && canApprove ? (
                  <div className="flex gap-2 shrink-0">
                    <button disabled={loading} onClick={() => handleApproveProposal(prop.id, false)}
                      className="px-3 py-1.5 border border-error text-error rounded-lg font-label-md text-label-md hover:bg-error-container transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error">
                      Reject Swap
                    </button>
                    <button disabled={loading} onClick={() => handleApproveProposal(prop.id, true)}
                      className="px-4 py-1.5 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">
                      Approve Swap
                    </button>
                  </div>
                ) : prop.status === "pending" ? (
                  <span className="text-on-surface-variant font-caption text-caption shrink-0">Awaiting scheduling officer review</span>
                ) : (
                  <span className={`font-label-md text-label-md uppercase shrink-0 ${prop.status === "approved" ? "clinical-teal-text" : "text-error"}`}>{prop.status}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Eligibility criteria (read-only — enforced by the deterministic matching engine) */}
      <div className="flex items-start gap-3 mb-stack_lg flex-wrap">
        <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider shrink-0 pt-1.5">Eligibility criteria applied:</span>
        <div className="flex flex-wrap gap-2">
          {CRITERIA.map((chip) => (
            <span key={chip.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant bg-surface-container rounded-full font-body-md text-body-md text-on-surface">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "16px" }} aria-hidden="true">{chip.icon}</span>
              {chip.label}
            </span>
          ))}
        </div>
      </div>

      {/* Best Match */}
      {bestCandidate && (
        <div data-tour="slot-recommendation" className="bg-surface-container-lowest border-2 border-primary rounded-xl shadow-sm mb-stack_lg overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 p-container_padding">
              <div className="flex items-center gap-3 mb-stack_md">
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-inverse-primary font-headline-sm text-headline-sm shrink-0">
                  {bestCandidate.patientName?.[0]}
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">{bestCandidate.patientName}</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">{bestCandidate.procedureName} · {bestCandidate.caseNumber}</p>
                </div>
              </div>
              <div className="bg-primary-fixed/20 border border-primary-fixed rounded-lg p-stack_md mb-stack_md">
                <p className="font-label-md text-label-md text-primary mb-1">Why this match (match score {bestCandidate.overallScore}%)</p>
                <p className="font-body-md text-body-md text-on-surface">{bestCandidate.rankingReason}</p>
              </div>
              <div className="flex items-center gap-stack_lg flex-wrap">
                <div>
                  <p className="font-caption text-caption text-on-surface-variant">Readiness</p>
                  <p className="font-title-md text-title-md clinical-teal-text flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }} aria-hidden="true">check_circle</span> {bestCandidate.candidateReadiness}%
                  </p>
                </div>
                <div>
                  <p className="font-caption text-caption text-on-surface-variant">Duration</p>
                  <p className="font-title-md text-title-md text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }} aria-hidden="true">hourglass_bottom</span> {bestCandidate.durationMinutes} min (slot {slot.durationMinutes})
                  </p>
                </div>
                <div>
                  <p className="font-caption text-caption text-on-surface-variant">Surgeon</p>
                  <p className="font-title-md text-title-md text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }} aria-hidden="true">person</span> {formatSurgeonName(bestCandidate.surgeonName)}
                  </p>
                </div>
              </div>
            </div>
            <div className="lg:w-[240px] bg-surface-container p-container_padding flex flex-col gap-3 items-stretch justify-center border-t lg:border-t-0 lg:border-l border-outline-variant">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-container text-inverse-primary font-label-md text-label-md rounded-lg justify-center self-end w-fit mb-1">
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">star</span> Best Match
              </span>
              <button disabled={loading || isRescued} onClick={() => handlePropose(bestCandidate.caseId)}
                className="w-full bg-primary text-on-primary font-label-md text-label-md py-2.5 rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">
                Propose replacement
              </button>
              <button disabled={loading || isRescued} onClick={() => handleRequestConfirmation(bestCandidate.caseId)}
                className="w-full border border-outline-variant text-on-surface font-label-md text-label-md py-2.5 rounded-lg hover:border-primary hover:text-primary transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                Request patient confirmation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate comparison */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-container_padding py-stack_md border-b border-outline-variant bg-surface-bright">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Standby Candidates Comparison</h2>
          <p className="font-caption text-caption text-on-surface-variant mt-0.5">Ranked by the deterministic matching engine. Select a row to see the score breakdown and any failed constraints.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead className="bg-surface-container border-b border-outline-variant">
              <tr>
                <th scope="col" className="py-2 px-4 font-label-md text-label-md text-on-surface-variant w-14">Rank</th>
                <th scope="col" className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Candidate</th>
                <th scope="col" className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Procedure</th>
                <th scope="col" className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Match</th>
                <th scope="col" className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Duration</th>
                <th scope="col" className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Eligibility</th>
                <th scope="col" className="py-2 px-4 font-label-md text-label-md text-on-surface-variant w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {candidates.map((c, index) => {
                const rank = index + 1;
                const failed: string[] = JSON.parse(c.failedConstraintsJson || "[]");
                const isOpen = expanded === c.id;
                return (
                  <Fragment key={c.id}>
                    <tr
                      onClick={() => setExpanded(isOpen ? null : c.id)}
                      className={`hover:bg-surface-container-low transition-colors cursor-pointer ${rank === 1 && c.eligible ? "bg-primary-fixed/10" : ""}`}
                    >
                      <td className="py-3 px-4 font-title-md text-primary font-bold">{c.eligible ? rank : "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-title-md text-title-md text-on-surface">
                          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "16px" }} aria-hidden="true">{isOpen ? "expand_more" : "chevron_right"}</span>
                          {c.patientName}
                        </div>
                        <div className="font-caption text-caption text-on-surface-variant pl-5">{c.caseNumber}</div>
                      </td>
                      <td className="py-3 px-4 font-body-md text-body-md text-on-surface">{c.procedureName}</td>
                      <td className="py-3 px-4 font-title-md text-title-md text-on-surface tabular-nums">{c.eligible ? `${c.overallScore}%` : "—"}</td>
                      <td className="py-3 px-4 font-body-md text-body-md text-on-surface tabular-nums">{c.durationMinutes} min</td>
                      <td className="py-3 px-4">
                        {c.eligible ? (
                          <span className="inline-flex items-center gap-1 clinical-teal-text font-label-md text-label-md">
                            <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">check_circle</span> Eligible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-error font-label-md text-label-md">
                            <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">block</span> Ineligible
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {c.eligible ? (
                          <button disabled={loading || isRescued} onClick={(e) => { e.stopPropagation(); handlePropose(c.caseId); }}
                            className="px-2.5 py-1 text-xs bg-primary text-on-primary rounded hover:bg-primary-container transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                            Propose
                          </button>
                        ) : (
                          <span className="text-on-surface-variant font-caption text-[11px]">Excluded</span>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-surface-container-low">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                            {[
                              { l: "Readiness", v: c.candidateReadiness },
                              { l: "Duration fit", v: c.durationScore },
                              { l: "Team", v: c.teamScore },
                              { l: "Equipment", v: c.equipmentScore },
                              { l: "Availability", v: c.availabilityScore },
                            ].map((s) => (
                              <div key={s.l}>
                                <p className="font-caption text-caption text-on-surface-variant">{s.l}</p>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${s.v}%` }} />
                                  </div>
                                  <span className="font-caption text-caption tabular-nums text-on-surface">{s.v}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          {failed.length > 0 ? (
                            <div className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-error" style={{ fontSize: "16px" }} aria-hidden="true">report</span>
                              <p className="font-body-md text-body-md text-on-surface"><strong className="text-error">Failed constraints:</strong> {failed.join(", ")}</p>
                            </div>
                          ) : (
                            <p className="font-body-md text-body-md text-on-surface-variant">{c.rankingReason}</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-stack_md font-caption text-caption text-on-surface-variant flex items-center gap-1.5">
        <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">shield</span>
        No scheduling change has been made. A proposal only records a recommendation for a scheduling officer to approve.
      </p>
    </div>
  );
}
