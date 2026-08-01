"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { usePathname, useRouter } from "next/navigation";

type TourStep = {
  route: string;
  selector: string;
  title: string;
  instruction: string;
  say: string;
  clickToAdvance?: boolean;
};

const TOUR_STORAGE_KEY = "caseready-demo-tour";

const tourSteps: TourStep[] = [
  {
    route: "/",
    selector: '[data-tour="dashboard-kpis"]',
    title: "Start with tomorrow's readiness",
    instruction: "Point to the five live KPIs, then select Next.",
    say: "CaseReady turns tomorrow's surgical list into one readiness command centre, showing what is ready, at risk, blocked, and how many OR minutes are exposed.",
  },
  {
    route: "/",
    selector: '[data-tour="attention-queue-button"]',
    title: "Open the attention queue",
    instruction: "Click the highlighted Review attention queue button.",
    say: "The system converts readiness gaps into prioritized, owned actions instead of leaving teams to chase updates manually.",
    clickToAdvance: true,
  },
  {
    route: "/actions",
    selector: '[data-tour="first-action-row"]',
    title: "Open a high-priority action",
    instruction: "Click the highlighted action row.",
    say: "Each blocker carries its urgency, owner, patient context, and due time so coordinators know exactly what needs attention first.",
    clickToAdvance: true,
  },
  {
    route: "/actions",
    selector: '[data-tour="action-drawer"]',
    title: "Show human-in-the-loop AI",
    instruction: "Explain the bilingual draft and approval controls, then select Next. Do not send it during the tour.",
    say: "AI prepares the communication, but a human reviews the English and Arabic drafts before anything can be sent.",
  },
  {
    route: "/actions",
    selector: '[data-tour="close-action-drawer"]',
    title: "Close the review panel",
    instruction: "Click the highlighted close button.",
    say: "This keeps the workflow fast while preserving human oversight.",
    clickToAdvance: true,
  },
  {
    route: "/actions",
    selector: '[data-tour="nav-cases"]',
    title: "Open Surgical Cases",
    instruction: "Click Surgical Cases in the sidebar.",
    say: "Now I will drill into one synthetic case to show where the readiness score comes from.",
    clickToAdvance: true,
  },
  {
    route: "/cases",
    selector: '[data-tour="case-example"]',
    title: "Open the prepared example",
    instruction: "Click the highlighted CR-1051 case.",
    say: "CR-1051 is our prepared example: it has enough evidence to demonstrate both automated extraction and unresolved clinical blockers.",
    clickToAdvance: true,
  },
  {
    route: "/cases/CR-1051",
    selector: '[data-tour="documents-tab"]',
    title: "Inspect supporting documents",
    instruction: "Click the Documents tab.",
    say: "Every readiness decision is traceable back to supporting evidence rather than being a black-box score.",
    clickToAdvance: true,
  },
  {
    route: "/cases/CR-1051",
    selector: '[data-tour="first-document"]',
    title: "Open extracted evidence",
    instruction: "Click the highlighted Open button.",
    say: "The application links each document to the requirement it supports and records extraction confidence.",
    clickToAdvance: true,
  },
  {
    route: "/cases/CR-1051",
    selector: '[data-tour="evidence-panel"]',
    title: "Explain evidence intelligence",
    instruction: "Point out the source, extracted value, confidence, and review status, then select Next.",
    say: "Here the reviewer can see what the system extracted, its confidence, and the audit-ready human review status.",
  },
  {
    route: "/cases/CR-1051",
    selector: '[data-tour="close-evidence"]',
    title: "Close the evidence panel",
    instruction: "Click the highlighted close button.",
    say: "That evidence remains attached to the case for future review and audit.",
    clickToAdvance: true,
  },
  {
    route: "/cases/CR-1051",
    selector: '[data-tour="nav-slot-rescue"]',
    title: "Open Slot Rescue",
    instruction: "Click Slot Rescue in the sidebar.",
    say: "Finally, I will show how CaseReady helps recover OR capacity when a scheduled case is likely to cancel.",
    clickToAdvance: true,
  },
  {
    route: "/slot-rescue",
    selector: '[data-tour="slot-recommendation"]',
    title: "Finish with the AI recommendation",
    instruction: "Explain the ranked recommendation, readiness, matched constraints, and approval control. Do not propose the replacement unless the judges ask.",
    say: "CaseReady recommends a clinically ready standby case, explains why it fits, and still requires scheduling-officer approval before the slot is changed.",
  },
];

export default function DemoTour() {
  const router = useRouter();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
    startRect: DOMRect;
  } | null>(null);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetReady, setTargetReady] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [panelOffset, setPanelOffset] = useState({ x: 0, y: 0 });

  const stopTour = useCallback(() => {
    setActive(false);
    setStepIndex(0);
    setMinimized(false);
    setPanelOffset({ x: 0, y: 0 });
    sessionStorage.removeItem(TOUR_STORAGE_KEY);
  }, []);

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !panelRef.current) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: panelOffset.x,
      startOffsetY: panelOffset.y,
      startRect: panelRef.current.getBoundingClientRect(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const movePanel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const rawDeltaX = event.clientX - drag.startX;
    const rawDeltaY = event.clientY - drag.startY;
    const deltaX = Math.min(
      window.innerWidth - 8 - drag.startRect.right,
      Math.max(8 - drag.startRect.left, rawDeltaX),
    );
    const deltaY = Math.min(
      window.innerHeight - 8 - drag.startRect.bottom,
      Math.max(8 - drag.startRect.top, rawDeltaY),
    );

    setPanelOffset({
      x: drag.startOffsetX + deltaX,
      y: drag.startOffsetY + deltaY,
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const toggleMinimized = () => {
    if (minimized && panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      const expandedWidth = Math.min(390, window.innerWidth - 32);
      const expandedLeft = rect.right - expandedWidth;
      const shiftX = expandedLeft < 8
        ? 8 - expandedLeft
        : Math.min(0, window.innerWidth - 8 - rect.right);

      if (shiftX !== 0) {
        setPanelOffset((current) => ({ ...current, x: current.x + shiftX }));
      }
    }

    setMinimized((current) => !current);
  };

  const advance = useCallback(() => {
    if (stepIndex >= tourSteps.length - 1) {
      stopTour();
      return;
    }

    setTargetReady(false);
    setStepIndex((current) => current + 1);
  }, [stepIndex, stopTour]);

  useEffect(() => {
    const saved = sessionStorage.getItem(TOUR_STORAGE_KEY);
    if (saved) {
      const parsed = Number(saved);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed < tourSteps.length) {
        setStepIndex(parsed);
        setActive(true);
      }
    }

    const startTour = () => {
      setStepIndex(0);
      setActive(true);
      setTargetReady(false);
      setMinimized(false);
      setPanelOffset({ x: 0, y: 0 });
      sessionStorage.setItem(TOUR_STORAGE_KEY, "0");
    };

    window.addEventListener("caseready:demo-tour", startTour);
    return () => window.removeEventListener("caseready:demo-tour", startTour);
  }, []);

  useEffect(() => {
    if (!active) return;
    sessionStorage.setItem(TOUR_STORAGE_KEY, String(stepIndex));
  }, [active, stepIndex]);

  useEffect(() => {
    if (!active) return;

    const step = tourSteps[stepIndex];
    if (pathname !== step.route) {
      setTargetReady(false);
      router.push(step.route);
      return;
    }

    let target: HTMLElement | null = null;
    let retryTimer: number | undefined;
    let attempts = 0;

    const handleTargetClick = () => {
      if (step.clickToAdvance) {
        window.setTimeout(advance, 120);
      }
    };

    const attachTarget = () => {
      target = document.querySelector<HTMLElement>(step.selector);
      if (!target) {
        attempts += 1;
        if (attempts < 30) retryTimer = window.setTimeout(attachTarget, 150);
        return;
      }

      target.classList.add("demo-tour-target");
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      if (step.clickToAdvance) target.addEventListener("click", handleTargetClick);
      setTargetReady(true);
    };

    attachTarget();
    return () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      if (target) {
        target.classList.remove("demo-tour-target");
        target.removeEventListener("click", handleTargetClick);
      }
    };
  }, [active, advance, pathname, router, stepIndex]);

  if (!active) return null;

  const step = tourSteps[stepIndex];
  const isLastStep = stepIndex === tourSteps.length - 1;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Guided demo tour"
      className={`${minimized ? "w-[250px]" : "w-[390px]"} fixed bottom-5 right-5 z-[150] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-white/85 bg-white/80 shadow-[0_24px_70px_rgba(63,0,55,0.28)] backdrop-blur-2xl transition-[width] duration-200`}
      style={{ transform: `translate3d(${panelOffset.x}px, ${panelOffset.y}px, 0)` }}
    >
      <div className="h-1 bg-primary-fixed/60">
        <div
          className="h-full bg-gradient-to-r from-[#3F0037] to-[#D380BE] transition-all duration-300"
          style={{ width: `${((stepIndex + 1) / tourSteps.length) * 100}%` }}
        />
      </div>

      <div
        className={`flex touch-none select-none items-center justify-between gap-3 px-4 py-3 ${minimized ? "" : "border-b border-primary/10"} cursor-move`}
        onPointerDown={beginDrag}
        onPointerMove={movePanel}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        title="Drag to move"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="material-symbols-outlined shrink-0 text-primary/55" style={{ fontSize: "18px" }}>drag_indicator</span>
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-primary-fixed/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>smart_display</span>
            <span className="truncate">Live demo guide</span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="font-caption text-[11px] text-on-surface-variant">{stepIndex + 1} / {tourSteps.length}</span>
          <button
            type="button"
            aria-label={minimized ? "Restore demo guide" : "Minimize demo guide"}
            aria-expanded={!minimized}
            aria-controls="demo-tour-content"
            title={minimized ? "Restore guide" : "Minimize guide"}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={toggleMinimized}
            className="grid size-7 place-items-center rounded-full text-primary transition-colors hover:bg-primary-fixed/60"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>{minimized ? "open_in_full" : "remove"}</span>
          </button>
        </div>
      </div>

      {!minimized && (
      <div id="demo-tour-content" className="p-5">

        <h3 className="font-headline-sm text-[18px] font-semibold text-on-surface">{step.title}</h3>
        <p className="mt-1 font-body-md text-[13px] leading-5 text-on-surface-variant">{step.instruction}</p>

        <div className="mt-3 rounded-xl border border-primary/15 bg-primary-fixed/25 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Suggested line</p>
          <p className="font-body-md text-[12px] leading-[1.55] text-on-surface">“{step.say}”</p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={stopTour} className="font-label-md text-[12px] text-on-surface-variant hover:text-error">
            Exit tour
          </button>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => {
                  setTargetReady(false);
                  setStepIndex((current) => Math.max(0, current - 1));
                }}
                className="rounded-full border border-outline-variant bg-white/55 px-3 py-2 font-label-md text-[12px] text-on-surface hover:border-primary hover:text-primary"
              >
                Back
              </button>
            )}

            {step.clickToAdvance ? (
              <button
                type="button"
                onClick={advance}
                className="rounded-full px-3 py-2 font-label-md text-[12px] text-primary hover:bg-primary-fixed/40"
              >
                {targetReady ? "Skip step" : "Continue"}
              </button>
            ) : (
              <button
                type="button"
                onClick={advance}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 font-label-md text-[12px] text-on-primary"
              >
                {isLastStep ? "Finish tour" : "Next"}
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>{isLastStep ? "check" : "arrow_forward"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}