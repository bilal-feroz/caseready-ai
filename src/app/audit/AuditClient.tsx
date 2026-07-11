"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AuditClientProps {
  events: any[];
  totalEntries: number;
  totalPages: number;
  pageNum: number;
  query: string;
  actorFilter: string;
  typeFilter: string;
  distinctTypes: string[];
}

export default function AuditClient({
  events,
  totalEntries,
  totalPages,
  pageNum,
  query,
  actorFilter,
  typeFilter,
  distinctTypes,
}: AuditClientProps) {
  const router = useRouter();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const handlePageChange = (newPageNum: number) => {
    if (newPageNum < 1 || newPageNum > totalPages) return;
    updateFilters({ page: newPageNum.toString() });
  };

  const updateFilters = (newFilters: Record<string, string>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val === "all" || !val) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    router.replace(`/audit?${params.toString()}`);
  };

  return (
    <main className="flex-1 overflow-y-auto p-container_padding max-w-[1600px] mx-auto w-full relative">
      <div className="pb-stack_md">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-1">Audit Trail</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Full chronological log of system recommendations and coordinator decisions.</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack_md shadow-sm mb-stack_lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-stack_md mb-stack_md">
          {/* Search */}
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant mb-1 block">Search Events</label>
            <input
              type="text"
              placeholder="Filter audit logs..."
              defaultValue={query}
              onChange={(e) => updateFilters({ q: e.target.value, page: "1" })}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md"
            />
          </div>

          {/* Actor Filter */}
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant mb-1 block">Actor Type</label>
            <select
              value={actorFilter}
              onChange={(e) => updateFilters({ actor: e.target.value, page: "1" })}
              className="w-full py-2 px-3 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md cursor-pointer"
            >
              <option value="all">All Actors</option>
              <option value="user">User Coordinator</option>
              <option value="system_rule">System Rule</option>
            </select>
          </div>

          {/* Event Type Filter */}
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant mb-1 block">Event Type</label>
            <select
              value={typeFilter}
              onChange={(e) => updateFilters({ type: e.target.value, page: "1" })}
              className="w-full py-2 px-3 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md cursor-pointer"
            >
              <option value="all">All Types</option>
              {distinctTypes.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, " ").toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-primary-container">
              <tr>
                <th className="py-3 px-4 font-label-md text-label-md text-inverse-primary w-36">Timestamp</th>
                <th className="py-3 px-4 font-label-md text-label-md text-inverse-primary">Actor</th>
                <th className="py-3 px-4 font-label-md text-label-md text-inverse-primary">Action / Event</th>
                <th className="py-3 px-4 font-label-md text-label-md text-inverse-primary">State Change</th>
                <th className="py-3 px-4 font-label-md text-label-md text-inverse-primary w-32">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {events.map((evt) => {
                const prev = evt.previousStateJson ? JSON.parse(evt.previousStateJson) : null;
                const next = evt.newStateJson ? JSON.parse(evt.newStateJson) : null;

                let stateBadge = "Status Shifted";
                if (evt.eventType === "evidence_acknowledged") {
                  stateBadge = "Verified";
                } else if (evt.eventType === "communication_sent") {
                  stateBadge = "Sent to Payer";
                }

                return (
                  <tr
                    key={evt.id}
                    onClick={() => setSelectedEventId(evt.id)}
                    className="hover:bg-surface-container-low transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-4 align-top">
                      <p className="font-title-md text-title-md text-on-surface">
                        {formatTime(evt.createdAt)}
                      </p>
                      <p className="font-caption text-caption text-on-surface-variant">
                        {formatDate(evt.createdAt)}
                      </p>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0 text-white font-bold">
                          {evt.actorName?.[0] || "S"}
                        </div>
                        <div>
                          <p className="font-title-md text-title-md text-on-surface font-semibold">{evt.actorName || "System Event"}</p>
                          <p className="font-caption text-caption text-on-surface-variant capitalize">{evt.actorType.replace(/_/g, " ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <p className="font-title-md text-title-md text-on-surface mb-1 capitalize">{evt.eventType.replace(/_/g, " ")}</p>
                      <p className="font-body-md text-body-md text-on-surface-variant mb-1">{evt.reason}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEventId(evt.id);
                        }}
                        className="font-caption text-caption text-primary hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>attachment</span> View Payload
                      </button>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <span className="px-2.5 py-0.5 bg-surface-variant text-on-surface-variant font-label-md text-[10px] rounded uppercase font-bold">
                        {stateBadge}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <span className="inline-block px-3 py-1 clinical-teal-bg clinical-teal-text font-label-md text-[10px] rounded-full">
                        Logged
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-outline-variant flex items-center justify-between bg-surface bg-surface-bright">
            <p className="font-caption text-caption text-on-surface-variant">
              Showing {(pageNum - 1) * 10 + 1} to {Math.min(pageNum * 10, totalEntries)} of {totalEntries} entries
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(pageNum - 1)}
                disabled={pageNum === 1}
                className="w-8 h-8 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded font-label-md text-label-md ${
                    pageNum === p ? "bg-primary text-on-primary font-bold" : "text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(pageNum + 1)}
                disabled={pageNum === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer Overlay */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/30 z-30 transition-opacity"
          onClick={() => setSelectedEventId(null)}
        />
      )}

      {/* Details Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[440px] max-w-full bg-surface-container-lowest border-l border-outline-variant shadow-xl z-40 flex flex-col transition-transform duration-300 ${
          selectedEvent ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedEvent && (
          <>
            <div className="flex items-center justify-between px-container_padding py-4 border-b border-outline-variant bg-surface shrink-0">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">history</span>
                <div>
                  <h3 className="font-title-md text-title-md text-on-surface font-semibold">Audit Event Payload</h3>
                  <p className="font-caption text-caption text-on-surface-variant">ID: {selectedEvent.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEventId(null)}
                className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-container_padding space-y-stack_lg">
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Reason / Action</p>
                <p className="font-body-md text-on-surface leading-relaxed">{selectedEvent.reason}</p>
              </div>

              {selectedEvent.previousStateJson && (
                <div>
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Previous State</p>
                  <pre className="p-3 bg-surface border border-outline-variant rounded-lg font-mono text-xs overflow-x-auto text-on-surface">
                    {JSON.stringify(JSON.parse(selectedEvent.previousStateJson), null, 2)}
                  </pre>
                </div>
              )}

              {selectedEvent.newStateJson && (
                <div>
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">New State</p>
                  <pre className="p-3 bg-surface border border-outline-variant rounded-lg font-mono text-xs overflow-x-auto text-on-surface">
                    {JSON.stringify(JSON.parse(selectedEvent.newStateJson), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function formatTime(value: string) {
  return new Date(value).toISOString().slice(11, 16);
}

function formatDate(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}
