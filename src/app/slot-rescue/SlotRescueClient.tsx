"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { proposeReplacement, approveProposal } from "@/app/actions";

interface SlotRescueClientProps {
  slot: any;
  candidates: any[];
  proposals: any[];
  userRole: string;
}

export default function SlotRescueClient({
  slot,
  candidates,
  proposals,
  userRole,
}: SlotRescueClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Active constraints toggles
  const [constraints, setConstraints] = useState({
    team: true,
    duration: true,
    equipment: true,
    preOp: true,
    bed: true,
    standby: true,
  });

  if (!slot) {
    return (
      <main className="p-container_padding max-w-[1100px] mx-auto w-full">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack_lg text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px] block mb-2">task_alt</span>
          <p className="font-body-lg text-body-lg">No endangered slots require rescue at this time.</p>
        </div>
      </main>
    );
  }

  // Get best candidate (first eligible candidate)
  const bestCandidate = candidates.find(c => c.eligible);

  const handlePropose = async (candidateCaseId: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await proposeReplacement(slot.id, candidateCaseId);
      if (res.success) {
        setFeedback("Replacement proposed successfully. Awaiting scheduling officer approval.");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setFeedback("Failed to propose replacement.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProposal = async (proposalId: string, approve: boolean) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await approveProposal(proposalId, approve, approve ? undefined : "Declined by officer request");
      if (res.success) {
        setFeedback(`Proposal successfully ${approve ? "approved" : "rejected"}.`);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setFeedback("Failed to process proposal.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestConfirmation = () => {
    setFeedback("SMS confirmation request dispatched to patient standby contact.");
  };

  return (
    <main className="flex-1 overflow-y-auto p-container_padding max-w-[1100px] mx-auto w-full">
      <div className="pb-stack_md">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-1">Slot Rescue</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Recover operating-room capacity when a scheduled case cannot proceed.</p>
      </div>

      {feedback && (
        <div className="mb-stack_lg p-3 bg-primary-fixed/20 text-primary border border-primary/20 rounded-lg flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>info</span>
          <span className="font-title-md text-[13px]">{feedback}</span>
        </div>
      )}

      {/* Target Slot Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-container_padding shadow-sm mb-stack_lg">
        <div className="flex flex-wrap items-center justify-between gap-stack_md">
          <div className="flex items-center gap-stack_md">
            <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center">
              <span className="material-symbols-outlined text-error" style={{ fontSize: "24px" }}>event_busy</span>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Target Slot</p>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">{slot.roomCode} • Monday 13 July</h3>
              <div className="flex items-center gap-3 mt-1 font-body-md text-body-md text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>schedule</span> 11:45–13:00 ({slot.durationMinutes} min)
                </span>
                <span>|</span>
                <span>Original: {slot.originalProcedure}</span>
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 clinical-amber-bg clinical-amber-text font-label-md text-label-md rounded-lg border border-amber-200">
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>warning</span>
            Status: Cancellation likely
          </span>
        </div>
      </div>

      {/* Active Proposals Section */}
      {proposals.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-container_padding shadow-sm mb-stack_lg">
          <h3 className="font-title-md text-title-md text-on-surface font-bold mb-3">Pending Replacement Proposals</h3>
          <div className="space-y-3">
            {proposals.map((prop) => (
              <div key={prop.id} className="p-stack_md border border-outline-variant rounded-lg flex items-center justify-between bg-surface-container-low">
                <div>
                  <p className="font-title-md font-semibold text-on-surface">Candidate: {prop.proposedPatientName} ({prop.proposedCaseNumber})</p>
                  <p className="font-body-md text-on-surface-variant mt-0.5">{prop.proposedProcedure}</p>
                  <p className="font-caption text-caption text-on-surface-variant mt-1">Status: <span className="font-bold uppercase text-primary">{prop.status}</span></p>
                </div>
                {prop.status === "pending" && (userRole === "scheduling_officer" || userRole === "administrator") ? (
                  <div className="flex gap-2">
                    <button
                      disabled={loading}
                      onClick={() => handleApproveProposal(prop.id, false)}
                      className="px-3 py-1.5 border border-error text-error rounded-lg font-label-md text-label-md hover:bg-error-container transition-colors disabled:opacity-50"
                    >
                      Reject Swap
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => handleApproveProposal(prop.id, true)}
                      className="px-4 py-1.5 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-50"
                    >
                      Approve Swap
                    </button>
                  </div>
                ) : (
                  <span className="text-on-surface-variant font-caption text-caption">Awaiting Officer Review</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matching Constraints */}
      <div className="flex items-center gap-3 mb-stack_lg flex-wrap">
        <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider shrink-0">Matching Constraints:</span>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "team", label: "Team compatible", icon: "groups" },
            { key: "duration", label: "75m fit", icon: "timer" },
            { key: "equipment", label: "Equipment available", icon: "inventory_2" },
            { key: "preOp", label: "Pre-op complete", icon: "check_circle" },
            { key: "bed", label: "Bed available", icon: "bed" },
            { key: "standby", label: "Standby opt-in", icon: "notifications_active" },
          ].map((chip) => {
            const isEnabled = constraints[chip.key as keyof typeof constraints];
            return (
              <button
                key={chip.key}
                onClick={() => setConstraints(prev => ({ ...prev, [chip.key]: !isEnabled }))}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full font-body-md text-body-md transition-colors ${
                  isEnabled
                    ? "bg-primary-fixed text-primary border-primary"
                    : "bg-surface-container border-outline-variant text-on-surface hover:border-primary hover:text-primary"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>{chip.icon}</span>
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Best Match Card */}
      {bestCandidate && (
        <div className="bg-surface-container-lowest border-2 border-primary rounded-xl shadow-sm mb-stack_lg overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Left */}
            <div className="flex-1 p-container_padding">
              <div className="flex items-center gap-3 mb-stack_md">
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-inverse-primary font-headline-sm text-headline-sm">
                  {bestCandidate.patientName?.[0]}
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">{bestCandidate.patientName}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">{bestCandidate.procedureName}</p>
                </div>
              </div>

              {/* AI Recommendation */}
              <div className="bg-primary-fixed/20 border border-primary-fixed rounded-lg p-stack_md mb-stack_md">
                <p className="font-label-md text-label-md text-primary mb-1">Recommendation Summary</p>
                <p className="font-body-md text-body-md text-on-surface italic">"{bestCandidate.rankingReason}"</p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-stack_lg flex-wrap">
                <div>
                  <p className="font-caption text-caption text-on-surface-variant">Readiness</p>
                  <p className="font-title-md text-title-md clinical-teal-text flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span> {bestCandidate.readinessScore}%
                  </p>
                </div>
                <div>
                  <p className="font-caption text-caption text-on-surface-variant">Est. Duration</p>
                  <p className="font-title-md text-title-md text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>hourglass_bottom</span> {bestCandidate.durationMinutes} min
                  </p>
                </div>
                <div>
                  <p className="font-caption text-caption text-on-surface-variant">Surgeon</p>
                  <p className="font-title-md text-title-md text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>person</span> Dr. {bestCandidate.surgeonName}
                  </p>
                </div>
              </div>
            </div>

            {/* Right actions */}
            <div className="lg:w-[220px] bg-surface-container p-container_padding flex flex-col gap-3 items-stretch justify-center border-t lg:border-t-0 lg:border-l border-outline-variant">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-container text-inverse-primary font-label-md text-label-md rounded-lg justify-center self-end w-fit mb-1">
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>star</span> Best Match
              </span>
              <button
                disabled={loading}
                onClick={() => handlePropose(bestCandidate.caseId)}
                className="w-full bg-primary text-on-primary font-label-md text-label-md py-2.5 rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50"
              >
                Propose replacement
              </button>
              <button
                disabled={loading}
                onClick={handleRequestConfirmation}
                className="w-full border border-outline-variant text-on-surface font-label-md text-label-md py-2.5 rounded-lg hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
              >
                Request patient confirmation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standby Candidates Comparison Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="px-container_padding py-stack_md border-b border-outline-variant flex justify-between items-center bg-surface bg-surface-bright">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Standby Candidates Comparison</h3>
          <div className="flex gap-2">
            <button className="p-1 text-on-surface-variant hover:text-primary transition-colors"><span class="material-symbols-outlined">tune</span></button>
            <button className="p-1 text-on-surface-variant hover:text-primary transition-colors"><span className="material-symbols-outlined">more_vert</span></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-surface-container border-b border-outline-variant">
              <tr>
                <th className="py-2 px-4 font-label-md text-label-md text-on-surface-variant w-14">Rank</th>
                <th className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Candidate</th>
                <th className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Procedure</th>
                <th className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Readiness</th>
                <th className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Duration</th>
                <th className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Safety Blockers</th>
                <th className="py-2 px-4 font-label-md text-label-md text-on-surface-variant w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {candidates.map((c, index) => {
                const rank = index + 1;
                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-surface-container-low transition-colors cursor-pointer ${
                      rank === 1 ? "bg-primary-fixed/10" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-title-md text-primary font-bold">{rank}</td>
                    <td className="py-3 px-4">
                      <div className="font-title-md text-title-md text-on-surface">{c.patientName}</div>
                      <div className="font-caption text-caption text-on-surface-variant">{c.caseNumber}</div>
                    </td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface">{c.procedureName}</td>
                    <td className="py-3 px-4 font-title-md text-title-md clinical-teal-text">{c.readinessScore}%</td>
                    <td className="py-3 px-4 font-body-md text-body-md text-on-surface">{c.durationMinutes} min</td>
                    <td className="py-3 px-4">
                      {c.eligible ? (
                        <span className="text-on-surface-variant font-caption text-caption">—</span>
                      ) : (
                        <span className="material-symbols-outlined text-error" style={{ fontSize: "18px" }}>block</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {c.eligible ? (
                        <button
                          disabled={loading}
                          onClick={() => handlePropose(c.caseId)}
                          className="px-2.5 py-1 text-xs bg-primary text-on-primary rounded hover:bg-primary-container transition-colors disabled:opacity-50"
                        >
                          Propose
                        </button>
                      ) : (
                        <span className="text-error font-caption text-[11px] font-bold">Ineligible</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
