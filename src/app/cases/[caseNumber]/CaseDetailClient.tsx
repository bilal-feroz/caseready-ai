"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateEvidenceStatus, updateRequirementStatus } from "@/app/actions";

interface CaseDetailProps {
  sCase: any;
  requirements: any[];
  evidence: any[];
  actions: any[];
  comms: any[];
  audit: any[];
}

export default function CaseDetailClient({
  sCase,
  requirements,
  evidence,
  actions,
  comms,
  audit,
}: CaseDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("checklist");
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Find requirement linked to selected requirement
  const selectedReq = requirements.find(r => r.id === selectedReqId);
  const selectedEvidence = evidence.find(e => e.requirementId === selectedReqId);

  // Group requirements
  const patientPrep = requirements.filter(r => r.category === "patient_prep");
  const clinicalClearance = requirements.filter(r => r.category === "clinical_clearance");
  const operationalLogistical = requirements.filter(r => r.category === "operational_logistical");

  // Status summaries
  const completedCount = requirements.filter(r => r.status === "completed" || r.status === "not_applicable").length;
  const blockerCount = requirements.filter(r => r.status === "blocked" || r.status === "overdue" || r.status === "missing").length;
  const reviewCount = requirements.filter(r => r.status === "clinical_review" || r.status === "pending").length;
  const surgeonDisplayName = sCase.surgeonName?.startsWith("Dr.")
    ? sCase.surgeonName
    : `Dr. ${sCase.surgeonName}`;

  const handleEvidenceAction = async (status: "acknowledged" | "flagged_incorrect") => {
    if (!selectedEvidence) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await updateEvidenceStatus(selectedEvidence.id, status);
      if (res.success) {
        setMessage(`Evidence successfully ${status === "acknowledged" ? "acknowledged" : "flagged as incorrect"}.`);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setMessage("Error updating evidence.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualRequirementUpdate = async (reqId: string, status: any) => {
    setLoading(true);
    try {
      const res = await updateRequirementStatus(reqId, status);
      if (res.success) {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Status Icon Selector
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "not_applicable":
        return <span className="material-symbols-outlined clinical-teal-text icon-fill" style={{ fontSize: "22px" }}>check_circle</span>;
      case "blocked":
      case "overdue":
      case "missing":
        return <span className="material-symbols-outlined text-error" style={{ fontSize: "22px" }}>error</span>;
      case "clinical_review":
        return <span className="material-symbols-outlined clinical-amber-text" style={{ fontSize: "22px" }}>warning</span>;
      case "pending":
      default:
        return <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "22px" }}>pending</span>;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden antialiased font-body-md text-body-md bg-background">
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Breadcrumbs & Header */}
        <div className="px-container_padding pt-stack_lg pb-stack_md flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 font-body-md text-body-md text-on-surface-variant mb-2">
              <Link className="hover:underline" href="/">Command Centre</Link>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="text-on-surface font-medium">{sCase.caseNumber}</span>
              <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-surface-variant text-on-surface-variant border border-outline-variant">Synthetic Data</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface">{sCase.procedureName}</h2>
          </div>
        </div>

        {/* Case Details Card */}
        <div className="px-container_padding pb-stack_lg">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack_lg flex flex-wrap lg:flex-nowrap justify-between items-start lg:items-center gap-stack_lg shadow-sm">
            <div className="flex gap-stack_lg flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">calendar_today</span>
                </div>
                <div>
                  <p className="font-caption text-caption text-on-surface-variant">Scheduled</p>
                  <p className="font-title-md text-title-md text-on-surface">Mon, 13 July</p>
                </div>
              </div>
              <div className="w-px h-10 bg-outline-variant hidden md:block"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">meeting_room</span>
                </div>
                <div>
                  <p className="font-caption text-caption text-on-surface-variant">Location</p>
                  <p className="font-title-md text-title-md text-on-surface">{sCase.roomCode}</p>
                </div>
              </div>
              <div className="w-px h-10 bg-outline-variant hidden md:block"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center font-bold text-white shadow-sm">
                  LH
                </div>
                <div>
                  <p className="font-caption text-caption text-on-surface-variant">Primary Surgeon</p>
                  <p className="font-title-md text-title-md text-on-surface">{surgeonDisplayName}</p>
                </div>
              </div>
              <div className="w-px h-10 bg-outline-variant hidden md:block"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">schedule</span>
                </div>
                <div>
                  <p className="font-caption text-caption text-on-surface-variant">Est. Duration</p>
                  <p className="font-title-md text-title-md text-on-surface">{sCase.durationMinutes} min</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-label-md text-label-md font-bold uppercase">Readiness:</span>
              <span className={`px-3 py-1.5 rounded-lg text-title-md font-black shadow-sm ${
                sCase.readinessStatus === "ready" ? "clinical-teal-bg clinical-teal-text" : sCase.readinessStatus === "at_risk" ? "clinical-amber-bg clinical-amber-text" : "clinical-red-bg clinical-red-text"
              }`}>{sCase.readinessScore}%</span>
            </div>
          </div>
        </div>

        {/* Content Area: Two columns */}
        <div className="px-container_padding pb-stack_lg flex gap-grid_gutter flex-1">
          {/* Left Column: Status + Tabs + Checklist */}
          <div className="flex-1 min-w-0">
            {/* Status Strip */}
            <div className="flex items-center gap-4 mb-stack_md font-body-md text-body-md flex-wrap">
              <span className="flex items-center gap-1.5 clinical-teal-text"><span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span> {completedCount} Completed</span>
              <span className="text-outline-variant">&middot;</span>
              <span className="flex items-center gap-1.5 clinical-red-text"><span className="material-symbols-outlined" style={{ fontSize: "18px" }}>block</span> {blockerCount} Unresolved Blockers</span>
              <span className="text-outline-variant">&middot;</span>
              <span className="flex items-center gap-1.5 text-on-surface-variant"><span className="material-symbols-outlined" style={{ fontSize: "18px" }}>rate_review</span> {reviewCount} Reviews Pending</span>
            </div>

            {/* Tabs */}
            <div className="border-b border-outline-variant flex gap-stack_md mb-stack_lg">
              {["checklist", "timeline", "documents", "comms", "audit"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`font-label-md text-label-md py-3 whitespace-nowrap capitalize transition-colors ${
                    activeTab === tab ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Checklist Tab */}
            {activeTab === "checklist" && (
              <div>
                {/* Groups */}
                {[
                  { name: "Patient Preparation", icon: "person", items: patientPrep },
                  { name: "Clinical Clearance", icon: "local_hospital", items: clinicalClearance },
                  { name: "Operational & Logistical", icon: "inventory_2", items: operationalLogistical },
                ].map((group) => (
                  <div key={group.name} className="mb-stack_lg">
                    <div className="flex items-center gap-2 mb-stack_md px-1">
                      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "20px" }}>{group.icon}</span>
                      <h4 className="font-title-md text-title-md text-on-surface font-semibold">{group.name}</h4>
                    </div>
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
                      {group.items.map((req) => {
                        const hasEvidence = evidence.some(e => e.requirementId === req.id);
                        const isSelected = selectedReqId === req.id;

                        return (
                          <div
                            key={req.id}
                            onClick={() => {
                              if (hasEvidence) {
                                setSelectedReqId(isSelected ? null : req.id);
                              }
                            }}
                            className={`flex items-center gap-4 px-stack_md py-3 border-b border-outline-variant hover:bg-surface-container-low transition-colors cursor-pointer ${
                              isSelected ? "bg-primary-fixed/20 hover:bg-primary-fixed/30" : ""
                            }`}
                          >
                            {getStatusIcon(req.status)}
                            <div className="flex-1 min-w-0">
                              <p className="font-title-md text-title-md text-on-surface capitalize">
                                {formatRequirementType(req.requirementType)}
                              </p>
                              {req.notes && <p className="font-caption text-caption text-on-surface-variant">{req.notes}</p>}
                            </div>
                            <span className="font-caption text-caption text-on-surface-variant hidden sm:block">{req.ownerDepartment}</span>
                            
                            {/* Requirement Interactive Status Modifier */}
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={req.status}
                                onChange={(e) => handleManualRequirementUpdate(req.id, e.target.value)}
                                className="px-2 py-1 text-xs border border-outline-variant rounded bg-surface cursor-pointer focus:outline-none focus:border-primary text-on-surface"
                              >
                                <option value="completed">Completed</option>
                                <option value="pending">Pending</option>
                                <option value="missing">Missing</option>
                                <option value="overdue">Overdue</option>
                                <option value="blocked">Blocked</option>
                                <option value="clinical_review">Clinical Review</option>
                                <option value="not_applicable">N/A</option>
                              </select>
                              {hasEvidence && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-primary-fixed text-primary text-[10px] font-bold rounded">
                                  Evidence
                                </span>
                              )}
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
                <div className="space-y-6">
                  {audit.map((evt, idx) => (
                    <div key={evt.id} className="relative pl-6 pb-2 border-l border-outline-variant last:border-none">
                      <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary"></div>
                      <p className="font-title-md text-on-surface font-semibold capitalize">{evt.eventType.replace(/_/g, " ")}</p>
                      <p className="font-body-md text-on-surface-variant mt-0.5">{evt.reason}</p>
                      <p className="font-caption text-caption text-on-surface-variant mt-1">
                        {formatDateTime(evt.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === "documents" && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack_lg shadow-sm">
                {evidence.length === 0 ? (
                  <p className="text-on-surface-variant text-center py-4">No documents available.</p>
                ) : (
                  <div className="space-y-4">
                    {evidence.map((doc) => (
                      <div key={doc.id} className="border border-outline-variant rounded-lg p-stack_md flex items-center justify-between hover:bg-surface-container-low transition-colors">
                        <div>
                          <p className="font-title-md font-semibold text-on-surface">{doc.title}</p>
                          <p className="font-caption text-caption text-on-surface-variant">{doc.documentType} &middot; Confidence: {doc.confidence}%</p>
                        </div>
                        <button
                          onClick={() => {
                            const req = requirements.find(r => r.id === doc.requirementId);
                            if (req) setSelectedReqId(req.id);
                          }}
                          className="px-3 py-1.5 bg-surface border border-outline-variant rounded-lg font-label-md text-label-md hover:border-primary hover:text-primary transition-all"
                        >
                          View Document
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Comms Tab */}
            {activeTab === "comms" && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack_lg shadow-sm">
                {comms.length === 0 ? (
                  <p className="text-on-surface-variant text-center py-4">No communications generated.</p>
                ) : (
                  <div className="space-y-4">
                    {comms.map((c) => {
                      const content = JSON.parse(c.draftContent);
                      return (
                        <div key={c.id} className="border border-outline-variant rounded-lg p-stack_md">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-label-md text-label-md text-on-surface-variant uppercase">WhatsApp Message</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status === "sent" ? "clinical-teal-bg clinical-teal-text" : "bg-surface-variant text-on-surface-variant"}`}>
                              {c.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="font-body-md font-bold mb-1">English:</p>
                          <p className="font-body-md text-on-surface-variant mb-3">{content.en}</p>
                          <p className="font-body-md font-bold mb-1">Arabic:</p>
                          <p className="font-body-md text-on-surface-variant text-right" dir="rtl">{content.ar}</p>
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
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container border-b border-outline-variant">
                    <tr>
                      <th className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Time</th>
                      <th className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Action / Event</th>
                      <th className="py-2 px-4 font-label-md text-label-md text-on-surface-variant">Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((evt) => (
                      <tr key={evt.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                        <td className="py-3 px-4 font-caption text-caption text-on-surface-variant">
                          {formatDateTime(evt.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-title-md text-on-surface font-semibold capitalize">{evt.eventType.replace(/_/g, " ")}</p>
                          <p className="font-body-md text-on-surface-variant mt-0.5">{evt.reason}</p>
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant capitalize">
                          {evt.actorType}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column: Evidence Panel */}
          {selectedEvidence && (
            <div className="w-[380px] shrink-0 hidden xl:block">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden sticky top-4">
                {/* Panel Header */}
                <div className="flex items-center justify-between px-stack_md py-3 border-b border-outline-variant bg-surface">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "20px" }}>description</span>
                    <h4 className="font-title-md text-title-md text-on-surface font-semibold">Evidence: {selectedEvidence.title}</h4>
                  </div>
                  <button onClick={() => setSelectedReqId(null)} className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-high">
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>close</span>
                  </button>
                </div>

                {message && (
                  <div className="p-3 bg-primary-fixed/20 text-primary font-caption text-caption text-center border-b border-outline-variant">
                    {message}
                  </div>
                )}

                {/* Source info */}
                <div className="px-stack_md py-3 border-b border-outline-variant flex justify-between">
                  <div>
                    <p className="font-caption text-caption text-on-surface-variant">Source</p>
                    <p className="font-body-md text-body-md text-on-surface">{selectedEvidence.documentType}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-caption text-caption text-on-surface-variant">Extracted On</p>
                    <p className="font-body-md text-body-md text-on-surface">{formatTime(selectedEvidence.createdAt)}</p>
                  </div>
                </div>

                {/* Scanned Document Image */}
                <div className="px-stack_md py-3 border-b border-outline-variant">
                  <div className="bg-surface-variant rounded-lg overflow-hidden aspect-[4/3] flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-variant/60"></div>
                    <div className="text-center z-10 p-4">
                      <span className="material-symbols-outlined text-[64px] text-on-surface-variant mb-2 block">picture_as_pdf</span>
                      <p className="font-caption text-caption text-on-surface-variant">{selectedEvidence.title}</p>
                      <div className="mt-3 border-2 border-dashed border-primary/40 rounded-lg p-2 bg-surface-container-lowest/80">
                        <p className="font-label-md text-label-md text-primary">{selectedEvidence.extractedText}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extracted Entity */}
                <div className="px-stack_md py-3 border-b border-outline-variant">
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-2">Extracted Entity</p>
                  <div className="bg-surface-container rounded-lg p-stack_md">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-title-md text-title-md text-on-surface">Extracted Values</p>
                      <span className="font-label-md text-label-md text-on-surface-variant px-2 py-0.5 border border-outline-variant rounded">{selectedEvidence.confidence}% Confidence</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">{selectedEvidence.extractedText}</p>
                    <p className="font-caption text-caption text-on-surface-variant mt-2">
                      Review Status: <span className="font-bold text-on-surface capitalize">{selectedEvidence.reviewStatus.replace(/_/g, " ")}</span>
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-stack_md py-3 flex justify-end gap-3">
                  <button
                    disabled={loading}
                    onClick={() => handleEvidenceAction("flagged_incorrect")}
                    className="px-4 py-2 border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface-variant hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                  >
                    Flag as Incorrect
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleEvidenceAction("acknowledged")}
                    className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-50"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
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

  return labels[requirementType] ?? requirementType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value: string) {
  return new Date(value).toISOString().replace("T", " ").slice(0, 16);
}

function formatTime(value: string) {
  return new Date(value).toISOString().slice(11, 16);
}
