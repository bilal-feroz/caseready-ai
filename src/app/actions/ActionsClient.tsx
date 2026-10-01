"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { approveCommunication, returnCommunicationForReview, saveCommunicationDraft } from "@/app/actions";
import { formatEventTime, formatTime } from "@/lib/format";

interface ActionsClientProps {
  initialActions: any[];
  comms: any[];
}

const TABS = [
  { key: "my-actions", label: "My actions" },
  { key: "all-actions", label: "All actions" },
  { key: "awaiting", label: "Awaiting approval" },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Completed" },
];

export default function ActionsClient({ initialActions, comms }: ActionsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("my-actions");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [enDraft, setEnDraft] = useState("");
  const [arDraft, setArDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; tone: "info" | "error" } | null>(null);

  const selectedAction = initialActions.find((a) => a.id === selectedActionId);
  const selectedComms = comms.find((c) => c.actionItemId === selectedActionId);
  const guidedActionId = initialActions.find((action) =>
    action.status === "pending" && comms.some((comm) => comm.actionItemId === action.id)
  )?.id;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedActionId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleOpenAction = (actionId: string) => {
    setSelectedActionId(actionId);
    setFeedback(null);
    const associated = comms.find((c) => c.actionItemId === actionId);
    if (associated) {
      const content = JSON.parse(associated.status === "sent" && associated.finalContent ? associated.finalContent : associated.draftContent);
      setEnDraft(content.en || "");
      setArDraft(content.ar || "");
    } else {
      setEnDraft("");
      setArDraft("");
    }
  };

  const run = async (fn: () => Promise<any>, text: string, close = false) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fn();
      if (res?.success) {
        setFeedback({ text, tone: "info" });
        router.refresh();
        if (close) setTimeout(() => { setSelectedActionId(null); setFeedback(null); }, 1400);
      } else {
        setFeedback({ text: "The update did not complete.", tone: "error" });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ text: "Something went wrong. Please try again.", tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSend = () => {
    if (!selectedComms) return;
    run(() => approveCommunication(selectedComms.id, enDraft, arDraft), "Draft approved. Simulated send recorded — no external message was dispatched.", true);
  };
  const handleSaveDraft = () => {
    if (!selectedComms) return;
    run(() => saveCommunicationDraft(selectedComms.id, enDraft, arDraft), "Draft saved. Not sent.");
  };
  const handleReturn = () => {
    if (!selectedComms) return;
    run(() => returnCommunicationForReview(selectedComms.id), "Returned for review. The draft was not sent.", true);
  };

  const getFilteredActions = () => {
    switch (activeTab) {
      case "awaiting":
        return initialActions.filter((a) => a.requiresApproval && a.status === "pending");
      case "overdue":
        return initialActions.filter((a) => a.status === "overdue");
      case "completed":
        return initialActions.filter((a) => a.status === "completed");
      case "all-actions":
        return initialActions;
      case "my-actions":
      default:
        return initialActions.filter((a) => a.status === "pending" || a.status === "overdue");
    }
  };

  const filtered = getFilteredActions();
  const awaitingCount = initialActions.filter((a) => a.requiresApproval && a.status === "pending").length;
  const overdueCount = initialActions.filter((a) => a.status === "overdue").length;

  const priorityRank = (p: string) => (p === "high" ? 0 : p === "medium" ? 1 : 2);
  const sorted = [...filtered].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  return (
    <div className="p-4 md:p-container_padding max-w-[1200px] mx-auto w-full relative">
      <div className="pb-stack_md">
        <h1 className="font-headline-md text-headline-md text-on-surface mb-1">Action Centre</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Resolve readiness blockers before they become cancellations.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-outline-variant flex gap-stack_md overflow-x-auto no-scrollbar" role="tablist" aria-label="Action queues">
        {TABS.map((tab) => {
          const badge = tab.key === "awaiting" ? awaitingCount : tab.key === "overdue" ? overdueCount : undefined;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`font-label-md text-label-md py-3 whitespace-nowrap transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                activeTab === tab.key ? "text-primary border-b-2 border-primary font-bold" : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {tab.label}
              {badge !== undefined && badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab.key === "overdue" ? "bg-error text-on-error" : "bg-primary text-on-primary"}`}>{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="py-stack_lg">
        {sorted.length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack_lg text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] mb-2 block clinical-teal-text" aria-hidden="true">task_alt</span>
            <p className="font-body-lg text-body-lg">Nothing here. This queue is clear.</p>
          </div>
        ) : (
          <ul className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden divide-y divide-outline-variant">
            {sorted.map((a) => {
              const isSelected = selectedActionId === a.id;
              const overdue = a.status === "overdue";
              const done = a.status === "completed";
              return (
                <li key={a.id}>
                  <button
                    onClick={() => handleOpenAction(a.id)}
                    data-tour={a.id === guidedActionId ? "first-action-row" : undefined}
                    aria-expanded={isSelected}
                    className={`w-full text-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-stack_md py-3 hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                      isSelected ? "bg-primary-fixed/20" : ""
                    } ${overdue ? "border-l-4 border-l-error" : ""}`}
                  >
                    <div className="flex items-center gap-2 sm:w-40 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.priority === "high" ? "bg-error" : a.priority === "medium" ? "bg-secondary" : "bg-outline"}`} aria-hidden="true" />
                      <span className={`font-title-md text-title-md font-semibold ${isSelected ? "text-primary" : "text-on-surface"}`}>#{a.caseNumber}</span>
                      {done && <span className="material-symbols-outlined clinical-teal-text" style={{ fontSize: "16px" }} aria-hidden="true">check_circle</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md text-body-md text-on-surface">{a.title}</p>
                      <p className="font-caption text-caption text-on-surface-variant truncate">{a.procedureName} · {a.patientName}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:justify-end sm:w-64 shrink-0">
                      <span className="font-caption text-caption text-on-surface-variant">{a.ownerDepartment}</span>
                      {a.requiresApproval && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary-fixed text-primary text-[10px] font-bold uppercase">Approval</span>
                      )}
                      <span className={`inline-flex items-center gap-0.5 font-caption text-caption ${overdue ? "text-error font-semibold" : "text-on-surface-variant"}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }} aria-hidden="true">{overdue ? "event_busy" : done ? "event_available" : "schedule"}</span>
                        {done ? `Done ${formatEventTime(a.completedAt)}` : `${overdue ? "Overdue" : "Due"} ${formatTime(a.dueAt)}`}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Drawer */}
      {selectedAction && <div className="fixed inset-0 bg-black/30 z-30" onClick={() => setSelectedActionId(null)} aria-hidden="true" />}
      <aside
        role="dialog"
        aria-modal={selectedAction ? "true" : undefined}
        aria-label="Review communication"
        aria-hidden={!selectedAction}
        data-tour={selectedActionId === guidedActionId ? "action-drawer" : undefined}
        className={`fixed top-0 right-0 h-full w-[460px] max-w-full bg-surface-container-lowest border-l border-outline-variant shadow-xl z-40 flex flex-col transition-transform duration-300 motion-reduce:transition-none ${
          selectedAction ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedAction && (
          <>
            <div className="flex items-center justify-between px-container_padding py-4 border-b border-outline-variant bg-surface shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-inverse-primary" style={{ fontSize: "20px" }} aria-hidden="true">forward_to_inbox</span>
                </div>
                <div className="min-w-0">
                  <h2 className="font-title-md text-title-md text-on-surface font-semibold">Review communication</h2>
                  <p className="font-caption text-caption text-on-surface-variant truncate">{selectedAction.caseNumber} · {selectedAction.ownerDepartment}</p>
                </div>
              </div>
              <button data-tour="close-action-drawer" onClick={() => setSelectedActionId(null)} aria-label="Close" className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-high">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-container_padding py-stack_md border-b border-outline-variant bg-surface-container-low">
                <p className="font-body-md text-body-md text-on-surface"><strong>Intent:</strong> {selectedAction.description}</p>
                {selectedComms && (
                  <div className="mt-2 grid grid-cols-2 gap-2 font-caption text-caption text-on-surface-variant">
                    <p><strong className="text-on-surface">Recipient:</strong> Patient</p>
                    <p><strong className="text-on-surface">Channel:</strong> WhatsApp (simulated)</p>
                    <p><strong className="text-on-surface">Status:</strong> <span className="capitalize">{selectedComms.status}</span></p>
                    <p><strong className="text-on-surface">Approval:</strong> {selectedAction.requiresApproval ? "Required" : "Not required"}</p>
                  </div>
                )}
              </div>

              {selectedComms ? (
                <div className="px-container_padding py-stack_lg space-y-stack_lg">
                  <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Bilingual draft — editable</h3>
                  <div className="border border-outline-variant rounded-lg p-stack_md bg-surface-container-lowest shadow-sm">
                    <label htmlFor="en-draft" className="inline-block font-label-md text-label-md text-on-primary bg-primary px-2 py-0.5 rounded mb-2">ENGLISH</label>
                    <textarea id="en-draft" value={enDraft} onChange={(e) => setEnDraft(e.target.value)} rows={4} disabled={selectedComms.status === "sent"}
                      className="w-full p-2 bg-surface border border-outline-variant rounded-md font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60" />
                  </div>
                  <div className="border border-outline-variant rounded-lg p-stack_md bg-surface-container-lowest shadow-sm">
                    <div className="flex justify-end mb-2">
                      <label htmlFor="ar-draft" className="inline-block font-label-md text-label-md text-on-surface-variant bg-surface-variant px-2 py-0.5 rounded">ARABIC</label>
                    </div>
                    <textarea id="ar-draft" value={arDraft} onChange={(e) => setArDraft(e.target.value)} rows={4} dir="rtl" lang="ar" disabled={selectedComms.status === "sent"}
                      className="w-full p-2 bg-surface border border-outline-variant rounded-md font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-right disabled:opacity-60" />
                  </div>
                </div>
              ) : (
                <div className="p-stack_lg text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[40px] block mb-2" aria-hidden="true">info</span>
                  <p className="mb-3">This action has no patient message to review.</p>
                  <Link href={`/cases/${selectedAction.caseNumber}`} className="text-primary font-label-md hover:underline">Open {selectedAction.caseNumber}</Link>
                </div>
              )}
            </div>

            {selectedComms && (
              <div className="border-t border-outline-variant px-container_padding py-stack_md bg-surface shrink-0">
                {feedback && (
                  <div className={`mb-stack_md p-2 font-caption text-caption text-center rounded border ${feedback.tone === "error" ? "bg-error-container text-on-error-container border-error/20" : "bg-primary-fixed/20 text-primary border-primary/20"}`} role="status">
                    {feedback.text}
                  </div>
                )}
                <p className="font-caption text-caption text-on-surface-variant mb-stack_md">
                  Template-generated bilingual message. Human approval is required before any send; sending is simulated for this demo.
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button disabled={loading || selectedComms.status === "sent"} onClick={handleSaveDraft}
                    className="px-3 py-2 text-on-surface-variant hover:text-primary font-label-md text-label-md transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
                    Save draft
                  </button>
                  <div className="flex gap-2">
                    <button disabled={loading || selectedComms.status === "sent"} onClick={handleReturn}
                      className="px-4 py-2 border border-error text-error rounded-lg font-label-md text-label-md hover:bg-error-container transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error">
                      Return for review
                    </button>
                    <button disabled={loading || selectedComms.status === "sent"} onClick={handleApproveSend}
                      className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors flex items-center gap-1.5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">send</span> Approve and send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
