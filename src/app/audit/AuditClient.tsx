"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatTime } from "@/lib/format";

interface AuditClientProps {
  events: any[];
  totalEntries: number;
  totalPages: number;
  pageNum: number;
  query: string;
  actorFilter: string;
  typeFilter: string;
  fromDate: string;
  toDate: string;
  distinctTypes: string[];
}

function approvalChip(status: string | null) {
  if (!status) return { label: "Logged", cls: "bg-surface-variant text-on-surface-variant" };
  switch (status) {
    case "approved":
      return { label: "Approved", cls: "clinical-teal-bg clinical-teal-text" };
    case "rejected":
      return { label: "Rejected", cls: "clinical-red-bg clinical-red-text" };
    case "pending":
      return { label: "Pending", cls: "clinical-amber-bg clinical-amber-text" };
    case "returned":
      return { label: "Returned", cls: "clinical-amber-bg clinical-amber-text" };
    default:
      return { label: "Recorded", cls: "bg-surface-variant text-on-surface-variant" };
  }
}

export default function AuditClient({
  events, totalEntries, totalPages, pageNum, query, actorFilter, typeFilter, fromDate, toDate, distinctTypes,
}: AuditClientProps) {
  const router = useRouter();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const selectedEvent = events.find((e) => e.id === selectedEventId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedEventId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const updateFilters = (newFilters: Record<string, string>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val === "all" || !val) params.delete(key);
      else params.set(key, val);
    });
    router.replace(`/audit?${params.toString()}`);
  };

  const handlePageChange = (newPageNum: number) => {
    if (newPageNum < 1 || newPageNum > totalPages) return;
    updateFilters({ page: newPageNum.toString() });
  };

  return (
    <div className="p-4 md:p-container_padding max-w-[1600px] mx-auto w-full relative">
      <div className="pb-stack_md">
        <h1 className="font-headline-md text-headline-md text-on-surface mb-1">Audit Trail</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Chronological, read-only record of system checks and human decisions.</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack_md shadow-sm mb-stack_lg">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-stack_md">
          <div className="md:col-span-1">
            <label htmlFor="audit-q" className="font-label-md text-label-md text-on-surface-variant mb-1 block">Search</label>
            <input id="audit-q" type="text" placeholder="Reason, case, actor…" defaultValue={query}
              onChange={(e) => updateFilters({ q: e.target.value, page: "1" })}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label htmlFor="audit-actor" className="font-label-md text-label-md text-on-surface-variant mb-1 block">Actor</label>
            <select id="audit-actor" value={actorFilter} onChange={(e) => updateFilters({ actor: e.target.value, page: "1" })}
              className="w-full py-2 px-3 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md cursor-pointer">
              <option value="all">All actors</option>
              <option value="user">User</option>
              <option value="system_rule">System rule</option>
            </select>
          </div>
          <div>
            <label htmlFor="audit-type" className="font-label-md text-label-md text-on-surface-variant mb-1 block">Event type</label>
            <select id="audit-type" value={typeFilter} onChange={(e) => updateFilters({ type: e.target.value, page: "1" })}
              className="w-full py-2 px-3 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md cursor-pointer">
              <option value="all">All types</option>
              {distinctTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="audit-from" className="font-label-md text-label-md text-on-surface-variant mb-1 block">From date</label>
            <input id="audit-from" type="date" value={fromDate} onChange={(e) => updateFilters({ from: e.target.value, page: "1" })}
              className="w-full py-2 px-3 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md" />
          </div>
          <div>
            <label htmlFor="audit-to" className="font-label-md text-label-md text-on-surface-variant mb-1 block">To date</label>
            <input id="audit-to" type="date" value={toDate} onChange={(e) => updateFilters({ to: e.target.value, page: "1" })}
              className="w-full py-2 px-3 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-primary-container">
              <tr>
                <th scope="col" className="py-3 px-4 font-label-md text-label-md text-inverse-primary w-40">Timestamp</th>
                <th scope="col" className="py-3 px-4 font-label-md text-label-md text-inverse-primary">Actor</th>
                <th scope="col" className="py-3 px-4 font-label-md text-label-md text-inverse-primary w-24">Case</th>
                <th scope="col" className="py-3 px-4 font-label-md text-label-md text-inverse-primary">Action / event</th>
                <th scope="col" className="py-3 px-4 font-label-md text-label-md text-inverse-primary w-32">Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {events.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-on-surface-variant">No audit events match these filters.</td></tr>
              ) : (
                events.map((evt) => {
                  const chip = approvalChip(evt.approvalStatus);
                  return (
                    <tr key={evt.id} onClick={() => setSelectedEventId(evt.id)}
                      className="hover:bg-surface-container-low transition-colors cursor-pointer">
                      <td className="py-4 px-4 align-top">
                        <p className="font-title-md text-title-md text-on-surface tabular-nums">{formatTime(evt.createdAt)}</p>
                        <p className="font-caption text-caption text-on-surface-variant">{formatDate(evt.createdAt)}</p>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold ${evt.actorType === "user" ? "bg-primary-container" : "bg-outline"}`} aria-hidden="true">
                            {evt.actorType === "user" ? (evt.actorName?.[0] ?? "U") : "S"}
                          </div>
                          <div>
                            <p className="font-title-md text-title-md text-on-surface font-semibold">{evt.actorName || "System"}</p>
                            <p className="font-caption text-caption text-on-surface-variant capitalize">{evt.actorType.replace(/_/g, " ")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top font-title-md text-title-md text-primary font-semibold">{evt.caseNumber || "—"}</td>
                      <td className="py-4 px-4 align-top">
                        <p className="font-title-md text-title-md text-on-surface mb-1 capitalize">{evt.eventType.replace(/_/g, " ")}</p>
                        <p className="font-body-md text-body-md text-on-surface-variant mb-1">{evt.reason}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedEventId(evt.id); }}
                          className="font-caption text-caption text-primary hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:underline"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "14px" }} aria-hidden="true">data_object</span> View payload
                        </button>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <span className={`inline-block px-3 py-1 font-label-md text-[10px] rounded-full uppercase font-bold ${chip.cls}`}>{chip.label}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-outline-variant flex items-center justify-between bg-surface-bright flex-wrap gap-2">
            <p className="font-caption text-caption text-on-surface-variant">
              Showing {(pageNum - 1) * 10 + 1}–{Math.min(pageNum * 10, totalEntries)} of {totalEntries}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => handlePageChange(pageNum - 1)} disabled={pageNum === 1} aria-label="Previous page"
                className="w-8 h-8 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50">
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }} aria-hidden="true">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => handlePageChange(p)} aria-label={`Page ${p}`} aria-current={pageNum === p ? "page" : undefined}
                  className={`w-8 h-8 flex items-center justify-center rounded font-label-md text-label-md ${pageNum === p ? "bg-primary text-on-primary font-bold" : "text-on-surface-variant hover:bg-surface-container-high transition-colors"}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => handlePageChange(pageNum + 1)} disabled={pageNum === totalPages} aria-label="Next page"
                className="w-8 h-8 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50">
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }} aria-hidden="true">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payload Drawer */}
      {selectedEvent && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedEventId(null)} aria-hidden="true" />}
      {selectedEvent && (
        <aside role="dialog" aria-modal="true" aria-label="Audit event payload"
          className="fixed top-0 right-0 h-full w-[440px] max-w-full bg-surface-container-lowest border-l border-outline-variant shadow-xl z-50 flex flex-col">
          <div className="flex items-center justify-between px-container_padding py-4 border-b border-outline-variant bg-surface shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="material-symbols-outlined text-primary" aria-hidden="true">history</span>
              <div className="min-w-0">
                <h2 className="font-title-md text-title-md text-on-surface font-semibold capitalize">{selectedEvent.eventType.replace(/_/g, " ")}</h2>
                <p className="font-caption text-caption text-on-surface-variant truncate">{selectedEvent.id}</p>
              </div>
            </div>
            <button onClick={() => setSelectedEventId(null)} aria-label="Close payload" className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-high">
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-container_padding space-y-stack_lg">
            <dl className="grid grid-cols-2 gap-3 font-body-md text-body-md">
              <div><dt className="font-caption text-caption text-on-surface-variant uppercase">Case</dt><dd className="text-on-surface">{selectedEvent.caseNumber || "—"}</dd></div>
              <div><dt className="font-caption text-caption text-on-surface-variant uppercase">Entity</dt><dd className="text-on-surface capitalize">{selectedEvent.entityType.replace(/_/g, " ")}</dd></div>
              <div><dt className="font-caption text-caption text-on-surface-variant uppercase">Actor</dt><dd className="text-on-surface">{selectedEvent.actorName || "System"}</dd></div>
              <div><dt className="font-caption text-caption text-on-surface-variant uppercase">Approval</dt><dd className="text-on-surface capitalize">{selectedEvent.approvalStatus || "—"}</dd></div>
            </dl>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Reason</p>
              <p className="font-body-md text-on-surface leading-relaxed">{selectedEvent.reason}</p>
            </div>
            {selectedEvent.previousStateJson && (
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Previous state</p>
                <pre className="p-3 bg-surface border border-outline-variant rounded-lg font-mono text-xs overflow-x-auto text-on-surface">{JSON.stringify(JSON.parse(selectedEvent.previousStateJson), null, 2)}</pre>
              </div>
            )}
            {selectedEvent.newStateJson && (
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">New state</p>
                <pre className="p-3 bg-surface border border-outline-variant rounded-lg font-mono text-xs overflow-x-auto text-on-surface">{JSON.stringify(JSON.parse(selectedEvent.newStateJson), null, 2)}</pre>
              </div>
            )}
            <p className="font-caption text-caption text-on-surface-variant">Audit records are append-only and cannot be edited or deleted from the interface.</p>
          </div>
        </aside>
      )}
    </div>
  );
}
