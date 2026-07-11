# CaseReady AI — Product Polish Checklist

Audit performed against the running app (login → every route, desktop 1440px + mobile 390px) and the full source tree. The app already had one polish pass (real routes, disabled buttons carry titles). This pass takes it to demo quality: fixes a global layout bug, makes it responsive, removes fake/dead interactions, replaces AI marketing copy with operational microcopy, and makes seed data coherent and credible.

Legend: `[ ]` todo · `[x]` done

## P0 — Global shell / layout (affects every page)
- [x] **Fixed-header content clipping** — page content slides under the 68px fixed header on every route (greeting/breadcrumbs hidden). Rework shell so content clears the header.
- [x] **No mobile/tablet responsiveness** — 232px sidebar is always present and pushes content off-screen < 900px. Add collapsible mobile drawer + hamburger; condense header.
- [x] Hospital name is hardcoded in the sidebar; wire it from `system_settings.hospital_name`.
- [x] Notification dropdown positioned with fragile `right-[168px]`; anchor properly.
- [x] Drawers/modals: add `role`, `aria-modal`, Escape-to-close, focus management, `prefers-reduced-motion`.

## P1 — Remove fake / dead interactions (hard rule)
- [x] Command Centre: KPI tiles look clickable (cursor/hover) but do nothing → link Ready/At-Risk/Blocked to filtered Cases; make display-only tiles non-interactive.
- [x] Command Centre: attention-queue action buttons are `opacity-0` until hover (invisible on touch) → always visible + focusable.
- [x] Command Centre: remove no-op `filter_list` / `more_vert` header buttons (filtering already via OR tabs).
- [x] Slot Rescue: "Matching Constraints" chips are fake toggles that don't filter → convert to honest read-only criteria applied by the engine.
- [x] Slot Rescue: "Request patient confirmation" shows fake "SMS dispatched" success but persists nothing → make it a real, audited, clearly-simulated action.
- [x] Slot Rescue: candidate rows have `cursor-pointer` but don't open anything → expandable detail with score breakdown + failed constraints.
- [x] Action Centre: "Return for review" only closes the drawer → make it a real audited action (or honest label).
- [x] Action Centre: reword "approved and dispatched via WhatsApp gateway" → truthful simulated-send copy (no external send).

## P2 — Remove decorative AI content & filler copy
- [x] Command Centre: remove "AI Insight Generated" sparkle panel → concrete operational summary.
- [x] Action Centre: remove "AI-drafted" + `auto_awesome`; seed action "Verify AI Patient Comms" → plain wording.
- [x] Analytics: remove hardcoded "Average Resolution SLA: 4.2 hours" (fabricated) → compute from data or show "no data".
- [x] Remove "AI-powered insights" from metadata/descriptions.
- [x] Seed: replace 10 generic "Action Item 5–14 / Routine Procedure" filler rows with realistic, varied cases/actions; add completed + overdue examples.
- [x] Seed: replace 22 identical "Routine readiness baseline check" audit rows with varied, realistic, time-spread events.

## P3 — Data correctness
- [x] Double "Dr." prefix everywhere (`Dr. {surgeonName}` where names already include "Dr.").
- [x] Case Detail: hardcoded "LH" surgeon initials → derive from name.
- [x] Case Detail: hardcoded "Mon, 13 July" → real date + time from `scheduledStart`; show patient + MRN + case status.
- [x] Cancelled case (CR-1057) shown as a scheduled surgery in list/counts → exclude cancelled from operating list & KPIs.
- [x] Slot Rescue: hardcoded seed candidate scores are incoherent (120-min "best match" for a 75-min slot). Recompute candidates with the real deterministic engine over fitting cases.
- [x] Slot Rescue: derive slot time/duration from data, not hardcoded "11:45–13:00 / 75m".

## P4 — Per-page polish
- [x] Command Centre answers the 6 questions in 5s; readiness bars higher-contrast.
- [x] Surgical Cases: empty-state message; keep useful filters only.
- [x] Case Detail: tab label "Comms" → "Communications"; evidence panel reachable on tablet/mobile (drawer); add "Request clinical review" evidence action; pluralize "1 Unresolved Blocker".
- [x] Action Centre: rows show owner, due, approval-required, priority; tabs load real filtered data.
- [x] Audit: add Case column + approval status; drop redundant always-"Logged"/"STATUS SHIFTED" noise; optional date filter; keep payload in drawer.
- [x] Analytics: relative bar scaling; add recovered OR capacity + proposal counts; restrained.
- [x] Settings: enforce administrator-only server-side + disable for others; make thresholds actually affect status mapping; add default-language + template/AI-mode indicator; demo reset generates audit event and runs programmatically (no `execSync`).

## P5 — Accessibility & quality
- [x] Icon-only buttons have aria-labels; visible focus rings; semantic headings; status = icon + text.
- [x] `dir="rtl"` for Arabic content; WCAG AA contrast on status chips.
- [x] Zod validation on mutations; preserve server-side role checks, audit events, transactions.
- [x] Reduce `any`; remove dead code/imports.

## Validation gates
- [x] `npx tsc --noEmit` · `npm run lint` · `npm run test` · `npm run test:e2e` · `npm run build` · `/api/health`
