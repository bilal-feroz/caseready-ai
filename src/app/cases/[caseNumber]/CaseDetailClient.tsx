"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateEvidenceStatus, updateRequirementStatus, requestClinicalReview } from "@/app/actions";
import { formatSurgeonName, formatDate, formatTime, formatEventDateTime, initials } from "@/lib/format";

interface CaseDetailProps {
  sCase: any;
  requirements: any[];
  evidence: any[];
  actions: any[];
  comms: any[];
  audit: any[];
}

const TABS = [
  { key: "checklist", label: "Checklist" },
  { key: "timeline", label: "Timeline" },
  { key: "documents", label: "Documents" },
  { key: "comms", label: "Communications" },
  { key: "audit", label: "Audit" },
];

export default function CaseDetailClient({ sCase, requirements, evidence, actions, comms, audit }: CaseDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("checklist");
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedEvidence = evidence.find((e) => e.requirementId === selectedReqId);

  const patientPrep = requirements.filter((r) => r.category === "patient_prep");
  const clinicalClearance = requirements.filter((r) => r.category === "clinical_clearance");
  const operationalLogistical = requirements.filter((r) => r.category === "operational_logistical");

  const completedCount = requirements.filter((r) => r.status === "completed" || r.status === "not_applicable").length;
  const blockerCount = requirements.filter((r) => r.status === "blocked" || r.status === "overdue" || r.status === "missing").length;
  const reviewCount = requirements.filter((r) => r.status === "clinical_review" || r.status === "pending").length;
  const blockers = requirements.filter((r) => r.status === "blocked" || r.status === "overdue" || r.status === "missing");

  const statusMeta =
    sCase.readinessStatus === "ready"
      ? { chip: "clinical-teal-bg clinical-teal-text", label: "Ready", icon: "check_circle" }
      : sCase.readinessStatus === "at_risk"
      ? { chip: "clinical-amber-bg clinical-amber-text", label: "At Risk", icon: "warning" }
      : { chip: "clinical-red-bg clinical-red-text", label: "Blocked", icon: "block" };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedReqId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const runAction = async (fn: () => Promise<any>, successText: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fn();
      if (res?.success) {
        setMessage(successText);
        router.refresh();
      } else {
        setMessage("Update did not complete.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong while saving. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEvidenceAction = (status: "acknowledged" | "flagged_incorrect") => {
    if (!selectedEvidence) return;
    runAction(
      () => updateEvidenceStatus(selectedEvidence.id, status),
      status === "acknowledged" ? "Evidence acknowledged. Requirement marked complete and readiness recalculated." : "Evidence flagged as incorrect. Requirement returned to missing."
    );
  };

  const handleManualRequirementUpdate = (reqId: string, status: any) =>
    runAction(() => updateRequirementStatus(reqId, status), "Requirement updated and readiness recalculated.");

  const handleRequestReview = () => {
    if (!selectedReqId) return;
    runAction(() => requestClinicalReview(selectedReqId), "Clinical review requested. A follow-up action was opened in the Action Centre.");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "not_applicable":
        return <span className="material-symbols-outlined clinical-teal-text icon-fill" style={{ fontSize: "22px" }} aria-hidden="true">check_circle</span>;
      case "blocked":
      case "overdue":
      case "missing":
        return <span className="material-symbols-outlined text-error" style={{ fontSize: "22px" }} aria-hidden="true">error</span>;
      case "clinical_review":
        return <span className="material-symbols-outlined clinical-amber-text" style={{ fontSize: "22px" }} aria-hidden="true">warning</span>;
      default:
        return <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "22px" }} aria-hidden="true">pending</span>;
    }
  };

  const summaryItems = [
    { icon: "badge", label: "Patient", value: `${sCase.patientName}`, sub: `MRN: ${sCase.patientMrn}` },
    { icon: "calendar_today", label: "Scheduled", value: formatDate(sCase.scheduledStart), sub: `${formatTime(sCase.scheduledStart)} · ${sCase.durationMinutes} min` },
    { icon: "meeting_room", label: "Operating room", value: sCase.roomCode, sub: `Case ${sCase.caseNumber}` },
    { icon: "stethoscope", label: "Primary surgeon", value: formatSurgeonName(sCase.surgeonName), sub: null, avatar: initials(sCase.surgeonName) },
  ];

  return (
    <div className="p-4 md:p-container_padding max-w-[1400px] mx-auto w-full">
      {/* Breadcrumbs & Header */}
      <div className="mb-stack_md">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 flex-wrap font-body-md text-body-md text-on-surface-variant mb-2">
          <Link className="hover:underline focus-visible:underline" href="/">Command Centre</Link>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_right</span>
          <Link className="hover:underline focus-visible:underline" href="/cases">Surgical Cases</Link>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_right</span>
          <span className="text-on-surface font-medium">{sCase.caseNumber}</span>
          <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-surface-variant text-on-surface-variant border border-outline-variant">Synthetic Data</span>
        </nav>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="font-headline-md text-headline-md text-on-surface">{sCase.procedureName}</h1>
          <div className="flex items-center gap-3">
            <span className="font-label-md text-label-md font-bold uppercase text-on-surface-variant">Readiness</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-title-md font-black shadow-sm ${statusMeta.chip}`}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }} aria-hidden="true">{statusMeta.icon}</span>
              {sCase.readinessScore}% · {statusMeta.label}
            </span>
          </div>
        </div>
      </div>

      {/* Case Details Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack_lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-stack_lg shadow-sm mb-stack_lg">
        {summaryItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            {item.avatar ? (
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center font-bold text-white shadow-sm shrink-0">{item.avatar}</div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-caption text-caption text-on-surface-variant">{item.label}</p>
              <p className="font-title-md text-title-md text-on-surface truncate">{item.value}</p>
              {item.sub && <p className="font-caption text-caption text-on-surface-variant truncate">{item.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Blockers callout */}
      {blockers.length > 0 && (
        <div className="mb-stack_lg clinical-red-bg border border-error/30 rounded-lg p-stack_md flex items-start gap-3">
          <span className="material-symbols-outlined clinical-red-text mt-0.5" aria-hidden="true">block</span>
          <div className="min-w-0">
            <p className="font-title-md text-title-md clinical-red-text font-semibold">Human approval required to clear {blockers.length} {blockers.length === 1 ? "blocker" : "blockers"}</p>
            <p className="font-body-md text-body-md text-on-surface mt-0.5">
              {blockers.map((b) => formatRequirementType(b.requirementType)).join(", ")}. No scheduling change has been made. Resolve in the checklist or Action Centre.
            </p>
          </div>
        </div>
      )}

      {/* Status Strip */}
      <div className="flex items-center gap-4 mb-stack_md font-body-md text-body-md flex-wrap">
        <span className="flex items-center gap-1.5 clinical-teal-text"><span className="material-symbols-outlined" style={{ fontSize: "18px" }} aria-hidden="true">check_circle</span> {completedCount} completed</span>
        <span className="text-outline-variant" aria-hidden="true">&middot;</span>
        <span className="flex items-center gap-1.5 clinical-red-text"><span className="material-symbols-outlined" style={{ fontSize: "18px" }} aria-hidden="true">block</span> {blockerCount} unresolved {blockerCount === 1 ? "blocker" : "blockers"}</span>
        <span className="text-outline-variant" aria-hidden="true">&middot;</span>
        <span className="flex items-center gap-1.5 text-on-surface-variant"><span className="material-symbols-outlined" style={{ fontSize: "18px" }} aria-hidden="true">rate_review</span> {reviewCount} in review</span>
      </div>

      {/* Tabs */}
      <div className="border-b border-outline-variant flex gap-stack_md mb-stack_lg overflow-x-auto no-scrollbar" role="tablist" aria-label="Case detail sections">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            data-tour={tab.key === "documents" ? "documents-tab" : undefined}
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`font-label-md text-label-md py-3 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
              activeTab === tab.key ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Checklist Tab */}
      {activeTab === "checklist" && (
        <div>
          {[
            { name: "Patient Preparation", icon: "person", items: patientPrep },
            { name: "Clinical Clearance", icon: "local_hospital", items: clinicalClearance },
            { name: "Operational & Logistical", icon: "inventory_2", items: operationalLogistical },
          ].map((group) => (
            <div key={group.name} className="mb-stack_lg">
              <div className="flex items-center gap-2 mb-stack_md px-1">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "20px" }} aria-hidden="true">{group.icon}</span>
                <h2 className="font-title-md text-title-md text-on-surface font-semibold">{group.name}</h2>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm divide-y divide-outline-variant">
                {group.items.map((req) => {
                  const hasEvidence = evidence.some((e) => e.requirementId === req.id);
                  const isSelected = selectedReqId === req.id;
                  const isQuiet = req.status === "completed" || req.status === "not_applicable";
                  const isBlocker = req.status === "blocked" || req.status === "overdue" || req.status === "missing";
                  return (
                    <div
                      key={req.id}
                      onClick={() => hasEvidence && setSelectedReqId(isSelected ? null : req.id)}
                      className={`flex items-center gap-3 md:gap-4 px-stack_md py-3 transition-colors ${hasEvidence ? "cursor-pointer hover:bg-surface-container-low" : ""} ${
                        isSelected ? "bg-primary-fixed/20" : isBlocker ? "border-l-4 border-l-error" : ""
                      } ${isQuiet ? "opacity-70" : ""}`}
                    >
                      {getStatusIcon(req.status)}
                      <div className="flex-1 min-w-0">
                        <p className={`font-title-md text-title-md capitalize ${isQuiet ? "text-on-surface-variant" : "text-on-surface"}`}>
                          {formatRequirementType(req.requirementType)}
                        </p>
                        {req.notes && <p className="font-caption text-caption text-on-surface-variant">{req.notes}</p>}
                        <p className="font-caption text-caption text-on-surface-variant mt-0.5">
                          {req.ownerDepartment}{req.dueAt ? ` · due ${formatTime(req.dueAt)}` : ""}
                        </p>
                      </div>
                      {hasEvidence && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedReqId(isSelected ? null : req.id); }}
                          className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-primary-fixed text-primary text-[10px] font-bold rounded hover:bg-primary-fixed/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "12px" }} aria-hidden="true">description</span>
                          Evidence
                        </button>
                      )}
                      <div onClick={(e) => e.stopPropagation()}>
                        <label className="sr-only" htmlFor={`status-${req.id}`}>Update {formatRequirementType(req.requirementType)} status</label>
                        <select
                          id={`status-${req.id}`}
                          value={req.status}
                          disabled={loading}
                          onChange={(e) => handleManualRequirementUpdate(req.id, e.target.value)}
                          className="px-2 py-1 text-xs border border-outline-variant rounded bg-surface cursor-pointer focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary text-on-surface disabled:opacity-50"
                        >
                          <option value="completed">Completed</option>
                          <option value="pending">Pending</option>
                          <option value="missing">Missing</option>
                          <option value="overdue">Overdue</option>
                          <option value="blocked">Blocked</option>
                          <option value="clinical_review">Clinical Review</option>
                          <option value="not_applicable">N/A</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === "timeline" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack_lg shadow-sm">
          {audit.length === 0 ? (
            <p className="text-on-surface-variant text-center py-4">No activity recorded for this case yet.</p>
          ) : (
            <div className="space-y-6">
              {audit.map((evt) => (
                <div key={evt.id} className="relative pl-6 pb-2 border-l border-outline-variant last:border-none">
                  <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" aria-hidden="true"></div>
                  <p className="font-title-md text-on-surface font-semibold capitalize">{evt.eventType.replace(/_/g, " ")}</p>
                  <p className="font-body-md text-on-surface-variant mt-0.5">{evt.reason}</p>
                  <p className="font-caption text-caption text-on-surface-variant mt-1">{formatEventDateTime(evt.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === "documents" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack_lg shadow-sm">
          {evidence.length === 0 ? (
            <p className="text-on-surface-variant text-center py-4">No evidence documents attached to this case.</p>
          ) : (
            <div className="space-y-4">
              {evidence.map((doc, index) => (
                <div key={doc.id} className="border border-outline-variant rounded-lg p-stack_md flex items-center justify-between gap-3 hover:bg-surface-container-low transition-colors">
                  <div className="min-w-0">
                    <p className="font-title-md font-semibold text-on-surface truncate">{doc.title}</p>
                    <p className="font-caption text-caption text-on-surface-variant">{doc.documentType} · confidence {doc.confidence}% · {doc.reviewStatus.replace(/_/g, " ")}</p>
                  </div>
                  <button
                    data-tour={index === 0 ? "first-document" : undefined}
                    onClick={() => { const req = requirements.find((r) => r.id === doc.requirementId); if (req) setSelectedReqId(req.id); }}
                    className="px-3 py-1.5 bg-surface border border-outline-variant rounded-lg font-label-md text-label-md hover:border-primary hover:text-primary transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Communications Tab */}
      {activeTab === "comms" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack_lg shadow-sm">
          {comms.length === 0 ? (
            <p className="text-on-surface-variant text-center py-4">No patient communications for this case.</p>
          ) : (
            <div className="space-y-4">
              {comms.map((c) => {
                // Once sent, show the approved final text (it may have been edited before approval).
                const content = JSON.parse(c.status === "sent" && c.finalContent ? c.finalContent : c.draftContent);
                return (
                  <div key={c.id} className="border border-outline-variant rounded-lg p-stack_md">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-label-md text-label-md text-on-surface-variant uppercase">Patient message · WhatsApp</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.status === "sent" ? "clinical-teal-bg clinical-teal-text" : "bg-surface-variant text-on-surface-variant"}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="font-body-md font-bold mb-1">English</p>
                    <p className="font-body-md text-on-surface-variant mb-3">{content.en}</p>
                    <p className="font-body-md font-bold mb-1">العربية</p>
                    <p className="font-body-md text-on-surface-variant text-right" dir="rtl" lang="ar">{content.ar}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === "audit" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead className="bg-surface-container border-b border-outline-variant">
                <tr>
                  <th scope="col" className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Time</th>
                  <th scope="col" className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Action / Event</th>
                  <th scope="col" className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Actor</th>
                </tr>
              </thead>
              <tbody>
                {audit.length === 0 ? (
                  <tr><td colSpan={3} className="py-6 text-center text-on-surface-variant">No audit records for this case.</td></tr>
                ) : (
                  audit.map((evt) => (
                    <tr key={evt.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                      <td className="py-3 px-4 font-caption text-caption text-on-surface-variant whitespace-nowrap">{formatEventDateTime(evt.createdAt)}</td>
                      <td className="py-3 px-4">
                        <p className="font-title-md text-on-surface font-semibold capitalize">{evt.eventType.replace(/_/g, " ")}</p>
                        <p className="font-body-md text-on-surface-variant mt-0.5">{evt.reason}</p>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant capitalize">{evt.actorType.replace(/_/g, " ")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evidence Drawer */}
      {selectedEvidence && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedReqId(null)} aria-hidden="true" />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`Evidence: ${selectedEvidence.title}`}
            data-tour="evidence-panel"
            className="fixed top-0 right-0 h-full w-[420px] max-w-full bg-surface-container-lowest border-l border-outline-variant shadow-xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-stack_md py-3 border-b border-outline-variant bg-surface shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "20px" }} aria-hidden="true">description</span>
                <h2 className="font-title-md text-title-md text-on-surface font-semibold truncate">{selectedEvidence.title}</h2>
              </div>
              <button data-tour="close-evidence" onClick={() => setSelectedReqId(null)} aria-label="Close evidence" className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-high">
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }} aria-hidden="true">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {message && (
                <div className="p-3 bg-primary-fixed/20 text-primary font-caption text-caption text-center border-b border-outline-variant" role="status">{message}</div>
              )}

              <div className="px-stack_md py-3 border-b border-outline-variant flex justify-between">
                <div>
                  <p className="font-caption text-caption text-on-surface-variant">Source</p>
                  <p className="font-body-md text-body-md text-on-surface">{selectedEvidence.documentType}</p>
                </div>
                <div className="text-right">
                  <p className="font-caption text-caption text-on-surface-variant">Confidence</p>
                  <p className="font-body-md text-body-md text-on-surface">{selectedEvidence.confidence}%</p>
                </div>
              </div>

              <div className="px-stack_md py-3 border-b border-outline-variant">
                <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-2">Extracted text</p>
                <div className="bg-surface-container rounded-lg p-stack_md">
                  <p className="font-body-md text-body-md text-on-surface">{selectedEvidence.extractedText}</p>
                  <p className="font-caption text-caption text-on-surface-variant mt-2">
                    Review status: <span className="font-bold text-on-surface capitalize">{selectedEvidence.reviewStatus.replace(/_/g, " ")}</span>
                  </p>
                </div>
              </div>

              <p className="px-stack_md py-2 font-caption text-caption text-on-surface-variant">
                Synthetic document. Human review is required before this requirement can clear.
              </p>
            </div>

            <div className="border-t border-outline-variant px-stack_md py-3 flex flex-col gap-2 shrink-0">
              <button
                disabled={loading}
                onClick={handleRequestReview}
                className="w-full px-4 py-2 border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:border-primary hover:text-primary transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Request clinical review
              </button>
              <div className="flex gap-2">
                <button
                  disabled={loading || selectedEvidence.reviewStatus === "flagged_incorrect"}
                  onClick={() => handleEvidenceAction("flagged_incorrect")}
                  className="flex-1 px-4 py-2 border border-error text-error rounded-lg font-label-md text-label-md hover:bg-error-container transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
                >
                  Flag as Incorrect
                </button>
                <button
                  disabled={loading || selectedEvidence.reviewStatus === "acknowledged"}
                  onClick={() => handleEvidenceAction("acknowledged")}
                  className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function formatRequirementType(requirementType: string) {
  const labels: Record<string, string> = {
    identity_confirmed: "Identity Confirmed",
    surgical_consent: "Surgical Consent",
    anaesthesia_review: "Anaesthesia Review",
    pre_op_labs: "Pre-op Labs",
    insurance_authorization: "Insurance Authorization",
  };
  return (
    labels[requirementType] ??
    requirementType.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );
}
