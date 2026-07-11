"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveCommunication } from "@/app/actions";

interface ActionsClientProps {
  initialActions: any[];
  comms: any[];
}

export default function ActionsClient({
  initialActions,
  comms,
}: ActionsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("my-actions");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  
  // Drawer draft editing state
  const [enDraft, setEnDraft] = useState("");
  const [arDraft, setArDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedAction = initialActions.find(a => a.id === selectedActionId);
  const selectedComms = comms.find(c => c.actionItemId === selectedActionId);

  // Initialize draft when action is selected
  const handleOpenAction = (actionId: string) => {
    setSelectedActionId(actionId);
    setSuccessMsg(null);
    const associatedComms = comms.find(c => c.actionItemId === actionId);
    if (associatedComms) {
      const content = JSON.parse(associatedComms.draftContent);
      setEnDraft(content.en || "");
      setArDraft(content.ar || "");
    } else {
      setEnDraft("");
      setArDraft("");
    }
  };

  const handleApproveSend = async () => {
    if (!selectedComms) return;
    setLoading(true);
    setSuccessMsg(null);

    try {
      const res = await approveCommunication(selectedComms.id, enDraft, arDraft);
      if (res.success) {
        setSuccessMsg("Communication draft approved and dispatched via WhatsApp gateway.");
        router.refresh();
        // Wait a second and close
        setTimeout(() => {
          setSelectedActionId(null);
          setSuccessMsg(null);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setSuccessMsg("Failed to approve communication.");
    } finally {
      setLoading(false);
    }
  };

  // Filter actions based on tab
  const getFilteredActions = () => {
    switch (activeTab) {
      case "awaiting":
        return initialActions.filter(a => a.requiresApproval && a.status === "pending");
      case "overdue":
        return initialActions.filter(a => a.status === "overdue");
      case "completed":
        return initialActions.filter(a => a.status === "completed");
      case "all-actions":
        return initialActions;
      case "my-actions":
      default:
        // Coordinator owns pre-admissions comms reviews
        return initialActions.filter(a => a.status === "pending");
    }
  };

  const filteredActions = getFilteredActions();

  // Categorize pending actions by urgency
  const immediateActions = filteredActions.filter(a => a.priority === "high" && a.status === "pending");
  const dueTodayActions = filteredActions.filter(a => a.priority === "medium" && a.status === "pending");
  const upcomingActions = filteredActions.filter(a => a.priority === "low" && a.status === "pending");
  const completedActions = filteredActions.filter(a => a.status === "completed");

  return (
    <main className="flex-1 overflow-y-auto p-container_padding max-w-[1200px] mx-auto w-full relative">
      <div className="pb-stack_md">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-1">Action Centre</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Resolve surgical-readiness blockers before they become cancellations.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-outline-variant flex gap-stack_md overflow-x-auto no-scrollbar">
        {[
          { key: "my-actions", label: "My actions" },
          { key: "all-actions", label: "All actions" },
          { key: "awaiting", label: "Awaiting approval", badge: initialActions.filter(a => a.requiresApproval && a.status === "pending").length },
          { key: "overdue", label: "Overdue", badge: initialActions.filter(a => a.status === "overdue").length },
          { key: "completed", label: "Completed" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`font-label-md text-label-md py-3 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key ? "text-primary border-b-2 border-primary font-bold" : "text-on-surface-variant hover:text-primary"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab.key === "overdue" ? "bg-error text-on-error" : "bg-primary text-on-primary"}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Actions Lists */}
      <div className="py-stack_lg">
        {filteredActions.length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack_lg text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] mb-2 block">task_alt</span>
            <p className="font-body-lg text-body-lg">All caught up! No active tasks found.</p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
            {/* IMMEDIATE Section */}
            {immediateActions.length > 0 && (
              <div className="border-b border-outline-variant">
                <div className="px-stack_md py-2 bg-error-container/30 flex items-center gap-2">
                  <span className="material-symbols-outlined text-error" style={{ fontSize: "16px" }}>priority_high</span>
                  <span className="font-label-md text-label-md text-error uppercase tracking-wider">Immediate</span>
                </div>
                {renderActionRows(immediateActions, handleOpenAction, selectedActionId)}
              </div>
            )}

            {/* DUE TODAY Section */}
            {dueTodayActions.length > 0 && (
              <div className="border-b border-outline-variant">
                <div className="px-stack_md py-2 bg-secondary-container/30 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary" style={{ fontSize: "16px" }}>today</span>
                  <span className="font-label-md text-label-md text-secondary uppercase tracking-wider">Due Today</span>
                </div>
                {renderActionRows(dueTodayActions, handleOpenAction, selectedActionId)}
              </div>
            )}

            {/* UPCOMING Section */}
            {upcomingActions.length > 0 && (
              <div className="border-b border-outline-variant">
                <div className="px-stack_md py-2 bg-surface-container flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "16px" }}>upcoming</span>
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Upcoming</span>
                </div>
                {renderActionRows(upcomingActions, handleOpenAction, selectedActionId)}
              </div>
            )}

            {/* COMPLETED Section */}
            {completedActions.length > 0 && (
              <div>
                <div className="px-stack_md py-2 bg-surface-container-low flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "16px" }}>check_circle</span>
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Completed</span>
                </div>
                {renderActionRows(completedActions, handleOpenAction, selectedActionId)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer Overlay */}
      {selectedAction && (
        <div
          className="fixed inset-0 bg-black/30 z-30 transition-opacity"
          onClick={() => setSelectedActionId(null)}
        />
      )}

      {/* Slide-over review panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[440px] max-w-full bg-surface-container-lowest border-l border-outline-variant shadow-xl z-40 flex flex-col transition-transform duration-300 ${
          selectedAction ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedAction && (
          <>
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-container_padding py-4 border-b border-outline-variant bg-surface shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-inverse-primary" style={{ fontSize: "20px" }}>forward_to_inbox</span>
                </div>
                <div>
                  <h3 className="font-title-md text-title-md text-on-surface font-semibold">Review Communication</h3>
                  <p className="font-caption text-caption text-on-surface-variant">Case #{selectedAction.caseNumber} • {selectedAction.ownerDepartment}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedActionId(null)}
                className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-container_padding py-stack_md border-b border-outline-variant bg-surface-container-low">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant mt-0.5" style={{ fontSize: "18px" }}>info</span>
                  <div>
                    <p className="font-body-md text-body-md text-on-surface"><strong>Intent:</strong> {selectedAction.description}</p>
                    {selectedComms && (
                      <p className="font-caption text-caption text-on-surface-variant mt-1">Recipient: Patient (WhatsApp). Bilingual checklist verification.</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedComms ? (
                <div className="px-container_padding py-stack_lg space-y-stack_lg">
                  <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Communication Drafts</h4>

                  {/* English editor */}
                  <div className="border border-outline-variant rounded-lg p-stack_md bg-surface-container-lowest shadow-sm">
                    <span className="inline-block font-label-md text-label-md text-on-primary bg-primary px-2 py-0.5 rounded mb-2">ENGLISH</span>
                    <textarea
                      value={enDraft}
                      onChange={(e) => setEnDraft(e.target.value)}
                      rows={4}
                      className="w-full p-2 bg-surface border border-outline-variant rounded-md font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Arabic editor */}
                  <div className="border border-outline-variant rounded-lg p-stack_md bg-surface-container-lowest shadow-sm">
                    <div className="flex justify-end mb-2">
                      <span className="inline-block font-label-md text-label-md text-on-surface-variant bg-surface-variant px-2 py-0.5 rounded">ARABIC</span>
                    </div>
                    <textarea
                      value={arDraft}
                      onChange={(e) => setArDraft(e.target.value)}
                      rows={4}
                      dir="rtl"
                      className="w-full p-2 bg-surface border border-outline-variant rounded-md font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-right"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-stack_lg text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] block mb-2">info</span>
                  <p>No associated communication draft found for this action item.</p>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-outline-variant px-container_padding py-stack_md bg-surface shrink-0">
              {successMsg && (
                <div className="mb-stack_md p-2 bg-primary-fixed/20 text-primary font-caption text-caption text-center rounded border border-primary/20">
                  {successMsg}
                </div>
              )}
              <p className="font-caption text-caption text-on-surface-variant mb-stack_md flex items-center gap-1.5">
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>auto_awesome</span>
                AI-drafted bilingual message checklist.
              </p>
              <div className="flex items-center justify-between">
                <button type="button" disabled title="Not included in this demonstration." className="flex items-center gap-1.5 px-3 py-2 text-on-surface-variant/50 cursor-not-allowed font-label-md text-label-md transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>edit</span> Edit
                </button>
                <div className="flex gap-2">
                  <button
                    disabled={loading || !selectedComms}
                    onClick={() => setSelectedActionId(null)}
                    className="px-4 py-2 border border-error text-error rounded-lg font-label-md text-label-md hover:bg-error-container transition-colors disabled:opacity-50"
                  >
                    Return for review
                  </button>
                  <button
                    disabled={loading || !selectedComms}
                    onClick={handleApproveSend}
                    className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>send</span> Approve and send
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function renderActionRows(actionsList: any[], onOpenAction: (id: string) => void, activeId: string | null) {
  return (
    <div className="divide-y divide-outline-variant">
      {actionsList.map((a) => {
        const isSelected = activeId === a.id;
        return (
          <div
            key={a.id}
            onClick={() => onOpenAction(a.id)}
            className={`grid grid-cols-12 gap-2 px-stack_md py-3 hover:bg-surface-container-low transition-colors cursor-pointer group ${
              isSelected ? "bg-primary-fixed/20 hover:bg-primary-fixed/30" : ""
            }`}
          >
            <div className="col-span-2">
              <span className={`font-title-md text-title-md font-semibold ${isSelected ? "text-primary" : "text-on-surface"}`}>
                #{a.caseNumber}
              </span>
            </div>
            <div className="col-span-3">
              <span className="font-body-md text-body-md text-on-surface">{a.procedureName}</span>
            </div>
            <div className="col-span-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "18px" }}>
                {a.actionType === "review_comms" ? "mark_email_unread" : "inventory"}
              </span>
              <span className="font-body-md text-body-md text-on-surface">{a.title}</span>
            </div>
            <div className="col-span-3">
              <span className="font-body-md text-body-md text-on-surface-variant">{a.ownerDepartment}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
