# CaseReady AI — Complete Project Brief

> Evidence basis: repository state reviewed on 30 July 2026. “Seed baseline” means the reproducible records defined in `src/lib/seed.ts`, not the mutable local database, which preserves changes between runs. Business impact and roadmap statements that are not measured in the repository are explicitly labelled as inferences or recommendations.

## 1. One-Sentence Explanation

CaseReady AI is a human-supervised operations workspace that shows whether upcoming surgical cases are ready, directs staff to unresolved prerequisites, and recommends safe standby candidates when an operating-room slot is at risk.

## 2. Elevator Pitch

CaseReady AI helps perioperative teams prevent avoidable surgical delays and recover endangered operating-room capacity. It combines a deterministic readiness checklist, evidence review, accountable action queues, bilingual communication drafts, and constraint-based standby matching in one auditable workspace. Staff—not software—clear requirements, approve communications, and authorize slot replacements. The current hackathon prototype uses synthetic data and demonstrates the workflow without connecting to live hospital systems or making clinical decisions.

## 3. Problem Being Solved

The implemented product addresses the coordination problem before surgery: consent, anaesthesia review, laboratory results, insurance authorization, patient availability, and operational resources can be distributed across departments and remain unresolved near the operating date. Surgical coordinators and operating-room teams need a shared view of what is complete, what is missing, who owns the next action, and how much OR time is exposed.

The repository supports these specific consequences:

- An incomplete requirement lowers a case’s readiness score and can classify it as At Risk or Blocked.
- A blocked or cancelled case can endanger a scheduled OR slot.
- Action items represent follow-up work owned by Finance, Anaesthesia, Laboratory, Cardiology, Pre-Admissions, or Clinical Review.
- A cancelled case can be paired with eligible standby cases, but a scheduling officer must approve a proposal.

Reasonable business implications, not measured results:

- **Inference:** unresolved prerequisites can cause day-of-surgery delays or cancellations.
- **Inference:** unused OR time affects staff productivity, patient experience, throughput, and hospital revenue.
- **Inference:** a common, auditable queue can reduce calls, spreadsheets, duplicate follow-up, and ambiguity about ownership.
- **Inference:** earlier detection gives teams more time to resolve blockers or fill a released slot.

The repository contains no measured cancellation reduction, revenue result, patient outcome, or hospital pilot data.

## 4. Target Users

| User | Repository-supported activity | Important qualification |
|---|---|---|
| Perioperative coordinator | Reviews the Command Centre, opens cases, checks evidence, changes requirement states, works actions, edits/approves the seeded communication, requests patient confirmation, and proposes a standby replacement. | These mutations are technically available to any authenticated user; they are not coordinator-only. |
| Clinical reviewer | Uses the clinical-review account and can inspect evidence and requirements, acknowledge/flag evidence, and update requirement status. | There is no distinct clinical-review queue or server-side permission unique to this role. |
| Scheduling officer | Reviews pending replacement proposals and can approve or reject a swap. | Proposal approval is one of the few role-enforced operations. |
| Administrator | Changes hospital name, readiness thresholds, and default language; can reset demo data; can also approve/reject slot proposals. | Settings and reset are enforced server-side as administrator-only. |
| Finance/insurance, anaesthesia, laboratory, cardiology, and pre-admissions teams | Appear as owner departments on actions and requirements. | They do not have dedicated accounts, department-filtered queues, or department-specific permissions in the prototype. |
| OR manager / hospital operations leader | Can use the dashboard, Slot Rescue, audit trail, and analytics as an operational overview. | This is an intended use inferred from the screens; no separate OR-manager role exists. |
| Clinician | Can use the clinical reviewer role for human review. | The system does not provide diagnosis, fitness-for-surgery decisions, or clinical clearance. |

## 5. Competition Track Fit

| Track | Assessment | Why and repository evidence |
|---|---|---|
| 1. Clinical Intelligence | **Partially supported** | `src/lib/readiness.ts` evaluates clinical prerequisites, and the case detail screen exposes evidence and clinical-review states. However, the rules are operational and deterministic; there is no diagnosis, outcome prediction, validated clinical model, or autonomous clearance. |
| 2. Patient Engagement | **Partially supported** | `communications`, `ActionsClient.tsx`, and seed data provide editable English/Arabic patient messages and a preferred-language field. Sending and standby confirmation are simulated; there is no patient portal, inbound response, real WhatsApp/SMS/email integration, or engagement analytics. |
| 3. Healthcare Operations | **Supported** | The Command Centre, case readiness, action ownership, endangered-slot workflow, standby ranking, human approval, audit trail, and operational KPIs form a coherent perioperative operations workflow. See `src/app/page.tsx`, `src/app/actions.ts`, `src/lib/slot-rescue.ts`, and `src/app/analytics/page.tsx`. |
| 4. Healthcare Analytics | **Partially supported** | The Analytics page computes current scheduled-case counts, OR minutes at risk, action counts, average completed-action resolution time, proposals, approved swaps, recovered minutes, and work by department. It has no historical trends, benchmarking, exports, forecasting, or measured outcomes. |
| 5. AI Agents in Healthcare | **Partially supported, weak fit** | `src/lib/ai.ts` contains an optional Gemini drafting function, but no page or server action calls it. Readiness and matching are deterministic. The product does not autonomously plan, execute multi-step work, use tools, or act as an agent. |

**Recommendation:** enter **Healthcare Operations** as the primary track. **Healthcare Analytics** is the most credible secondary track because its metrics are computed from live application data. Patient Engagement is a narrower secondary story. Do not lead with AI Agents.

## 6. Complete User Workflow

1. **Case intake:** not implemented. The “New Case Request” button is disabled and explains that intake remains in the hospital scheduling system.
2. **Seeded/import-equivalent case record:** the demo starts with synthetic patients, surgeons, rooms, scheduled cases, requirements, actions, evidence, and standby cases from `src/lib/seed.ts`.
3. **Readiness calculation:** `calculateReadiness` weights each requirement and maps its state to a numeric value.
4. **Missing-item detection:** pending, missing, overdue, blocked, and clinical-review requirements become warnings or hard blockers and produce recommended-action text in the rules result.
5. **Risk classification:** the engine assigns Ready, At Risk, or Blocked using the score, configured thresholds, hard-blocker conditions, and warning states.
6. **Operational overview:** the Command Centre shows the scheduled list, status counts, OR minutes at risk, room/search filters, and pending attention items.
7. **Case investigation:** staff open a case to view its checklist, evidence, actions, communications, timeline, and case-specific audit records.
8. **Human evidence review:** an authenticated user acknowledges evidence, flags it as incorrect, or requests clinical review. The linked requirement and case score are recalculated in a transaction.
9. **Action assignment/work:** seeded action items carry department, priority, due time, approval requirement, and status. Requesting clinical review can create a new follow-up action.
10. **Communication review:** the user opens CR-1002’s seeded bilingual draft, edits or saves it, returns it for review, or approves a simulated send. Approval completes its linked action and records an audit event.
11. **Cancellation/slot risk:** seed case CR-1057 is cancelled because the patient is unavailable, creating a 75-minute endangered OR 03 slot.
12. **Standby matching:** five seeded standby cases are evaluated at seed time against consent, duration, team, equipment, availability, bed, and hard-blocker constraints.
13. **Candidate recommendation:** eligible candidates are sorted by stored overall score; CR-2003 is the seed-baseline best match at 100%.
14. **Replacement proposal:** an authenticated user proposes an eligible case. This creates a pending proposal only; it does not book or reschedule anything.
15. **Human scheduling approval:** a scheduling officer or administrator approves or rejects the proposal. Approval marks the demo slot “rescued.”
16. **Audit and analytics:** mutations generate audit events for evidence, clinical review, requirement changes, communication handling, confirmation requests, and proposal decisions. Analytics recomputes current operational totals from the database.

## 7. Implemented Features

| Feature | What it does / who uses it | Implementation status | Evidence |
|---|---|---|---|
| Command Centre | Scheduled-case KPIs, OR minutes at risk, room tabs, searchable operating list, and pending attention queue for coordinators/operations. | **Fully implemented for demo data** | `src/app/page.tsx` |
| Surgical Cases | Search, readiness/room/surgeon filters, time/readiness/risk sorting, and links to detail pages. | **Fully implemented for scheduled demo cases** | `src/app/cases/page.tsx` |
| Case detail | Checklist, timeline, documents, communications, audit, patient/room/surgeon summary. | **Fully implemented for stored records** | `src/app/cases/[caseNumber]/page.tsx`, `CaseDetailClient.tsx` |
| Case intake / new case | Disabled control explaining intake is external. | **Not implemented** | `src/components/SideNav.tsx` |
| Readiness scoring | Weighted deterministic score plus Ready/At Risk/Blocked classification. | **Fully implemented rules; not clinically validated** | `src/lib/readiness.ts` |
| Configurable thresholds | Administrator changes warning and blocked thresholds used on later recalculations. | **Implemented with limitation** | `src/lib/settings.ts`, `src/app/actions.ts`, Settings pages |
| Blockers and warnings | Identifies hard blockers, warnings, and recommended-action strings. | **Implemented** | `calculateReadiness` |
| Evidence/document tracking | Displays seeded extracted text, confidence, synthetic flag, and review status; supports acknowledge/flag/review. | **Demo-only records; no upload/OCR pipeline** | `evidenceDocuments`, `updateEvidenceStatus`, case detail |
| Action Centre | Pending/all/approval/overdue/completed tabs, owners, priorities, dates, communication drawer. | **Implemented for stored actions** | `src/app/actions/page.tsx`, `ActionsClient.tsx` |
| Clinical-review follow-up | Moves a requirement to clinical review and creates a follow-up action if absent. | **Implemented** | `requestClinicalReview` |
| Bilingual communication | Editable English/Arabic draft with RTL Arabic rendering. | **Implemented for one seeded draft** | `communications`, `ActionsClient.tsx`, `src/lib/seed.ts` |
| Communication delivery | Marks the record sent and action completed after approval. | **Simulated only; no external message** | `approveCommunication` |
| Slot Rescue | Shows endangered/rescued slot, ranked candidates, criteria, proposals, and approval state. | **Implemented demo workflow** | Slot Rescue pages and actions |
| Standby eligibility | Rejects failures in consent, fit, team, equipment, availability, bed, or blockers. | **Deterministic, seed-time evaluation** | `src/lib/slot-rescue.ts`, `src/lib/seed.ts` |
| Candidate ranking | Weighted score and deterministic explanation for eligible candidates. | **Implemented; inputs are synthetic booleans/scores** | `evaluateSlotCandidates` |
| Replacement proposals | Creates a pending recommendation for an eligible stored candidate. | **Implemented; does not alter a real schedule** | `proposeReplacement` |
| Human slot approval | Scheduling officer/admin approves or rejects; approved slot becomes rescued. | **Implemented in demo database** | `approveProposal` |
| Patient confirmation | Records that confirmation was requested. | **Simulated and audited only** | `requestPatientConfirmation` |
| Notifications | Loads up to eight overdue, review, pending-proposal, and recent-audit items. | **Implemented, pull-on-open** | `/api/notifications`, `Header.tsx` |
| Audit Trail | Search, actor/type/date filters, pagination, payload drawer, actor/case/reason/status. | **Implemented but not immutable** | Audit pages, `auditEvents` |
| Analytics | Current readiness, action, proposal, resolution, recovered-minute, and department metrics. | **Implemented snapshot; demo data** | `src/app/analytics/page.tsx` |
| Global search | Header search filters Dashboard/Cases or redirects to Cases; case and audit pages have additional search. | **Implemented, server-rendered URL filtering** | `Header.tsx`, page components |
| Settings | Hospital name, thresholds, default language, AI/template indicator, demo reset. | **Implemented; writes admin-only** | Settings pages and actions |
| Help and support | Help drawer, synthetic-data/safety guidance, demo contact/version, live health status. | **Implemented** | `Header.tsx`, `SideNav.tsx` |
| Authentication | Four bcrypt-backed credentials accounts with Auth.js JWT/session claims. | **Implemented for demo** | `src/auth.ts`, seed users |
| Role-based access | Admin-only settings/reset and scheduler/admin proposal decision. | **Partially implemented** | `updateSettings`, `resetDemoData`, `approveProposal` |
| Hospital configuration | Configurable display name and two readiness thresholds. | **Partially implemented** | `systemSettings`, Settings |
| Responsive/accessibility polish | Mobile nav, semantic headings/tables, labels, focus rings, Escape-close, RTL draft. | **Implemented substantially; not independently audited** | App shell and client components |

## 8. Readiness Scoring Logic

The engine is deterministic, not AI-based.

### Inputs

Each requirement supplies `requirementType`, `category`, `status`, and `severity`. Category is stored but does not change the formula.

**Weights**

| Requirement type | Weight |
|---|---:|
| Identity confirmed | 10 |
| Surgical consent | 20 |
| Anaesthesia review | 30 |
| Pre-op labs | 20 |
| Insurance authorization | 20 |
| Any unrecognized type | 20 |

**Status values**

| Status | Multiplier |
|---|---:|
| Completed / Not applicable | 1.00 |
| Clinical review | 0.95 |
| Pending | 0.50 |
| Missing | 0.20 |
| Overdue | 0.10 |
| Blocked | 0.00 |

`score = round(sum(weight × status value) ÷ sum(weights) × 100)`. A case with no requirements returns 100/Ready.

### Hard blockers and warnings

- Any `blocked`, `overdue`, or `missing` status is called a hard blocker, regardless of severity.
- Any critical requirement not `completed` or `not_applicable` is also a hard blocker; this includes critical `pending` and `clinical_review`.
- Non-hard-blocker `clinical_review` and `pending` items are warnings.
- The result also returns plain-language recommended actions, although the current UI does not consume that result field directly.

### Classification

Defaults are an at-risk threshold of 90 and blocked threshold of 60; administrator settings replace these on mutation-time recalculation.

1. If hard blockers exist:
   - status is **Blocked** if any item is explicitly `blocked` or `overdue`, or if score is below the blocked threshold;
   - otherwise status is **At Risk**.
2. With no hard blockers, status is **At Risk** if warnings exist or score is below the at-risk threshold.
3. Otherwise status is **Ready**.

Important nuance: a `missing` item is labelled a hard blocker internally, but if there is no `blocked`/`overdue` item and the score is at least the blocked threshold, the final status can still be At Risk.

### Seed-baseline examples

- **CR-1051:** completed identity (10), completed consent (20), pending critical anaesthesia (15), labs in clinical review (19), blocked insurance (0) = **64% and Blocked**.
- **CR-1002:** four completed requirements plus pending medium labs = **90% and At Risk** because a warning remains.
- **CR-1003:** blocked anaesthesia and missing insurance produce **54% and Blocked**.
- Fully complete cases such as CR-1001 score **100% and Ready**.

Standby cases are an exception: their readiness scores (96, 92, 100, 90, 88) are seeded directly and they have no readiness-requirement rows. They are not calculated by this engine at seed time.

## 9. Slot Rescue Logic

### Trigger

The demo trigger is synthetic and pre-seeded: CR-1057, “Endoscopic sinus surgery,” is cancelled because the patient is unavailable. This frees OR 03 from 11:45–13:00 (75 minutes) and creates `slot-1` with status `endangered`. The application does not automatically listen to a hospital schedule or create slots from live cancellations.

### Candidate identification and constraints

Five cases with `caseStatus="standby"` are passed to `evaluateSlotCandidates` during seeding. A candidate is excluded if any of these fail:

1. standby consent;
2. procedure duration no longer than the slot;
3. team compatibility;
4. equipment availability;
5. patient is not marked unavailable (pending remains eligible);
6. postoperative bed availability;
7. no unresolved hard blockers.

The team/equipment/bed/blocker inputs are seed booleans, not live integrations or dynamically derived hospital resources.

### Scoring

Only eligible candidates receive a nonzero overall score:

- readiness: 30%;
- duration fit: 25%;
- team: 15%;
- equipment: 15%;
- availability: 15%.

Duration fit is `max(0, round((1 - abs(slotDuration - caseDuration) / slotDuration) × 100))`. Team/equipment are 100 or 0. Availability is 100 confirmed, 50 pending, 0 unavailable. The final weighted score is rounded.

### Seed-baseline result

| Candidate | Result |
|---|---|
| CR-2003, Septoplasty, 75 min, readiness 100 | Eligible, perfect duration, **100%**, best match |
| CR-2001, Endoscopic Sinus Revision, 60 min, readiness 96 | Eligible, **94%** |
| CR-2002, Tonsillectomy, 45 min, readiness 92 | Eligible, **88%** |
| CR-2004, Functional Rhinoplasty, 120 min | Ineligible: duration exceeds 75-minute slot |
| CR-2005, Grommet Insertion, 30 min | Ineligible: no standby consent and equipment unavailable |

### Recommendation versus booking

The UI only proposes. `proposeReplacement` verifies that a stored candidate exists and is marked eligible, then creates a pending proposal. A scheduling officer or administrator must call `approveProposal`; approval changes only the demo proposal and slot status. No real case is booked, no patient is rescheduled, and no external schedule is updated.

Important limitations:

- matching is calculated at seed time, not live on each page load;
- proposal-time validation trusts the stored `eligible` flag rather than recomputing constraints;
- the code does not block duplicate proposals or require the slot to still be endangered;
- an administrator or scheduling officer can technically propose and approve the same replacement;
- “clinically cleared” in the ranking text is not supported by a clinical validation workflow for standby records.

## 10. AI Usage

### Optional Gemini communication drafting module

- **Provider/model:** Google Gemini REST endpoint, model string `gemini-1.5-flash`.
- **File:** `src/lib/ai.ts`.
- **Input:** patient name, procedure name, and blocker strings. The actual prompt includes procedure and blockers, but not the patient name.
- **Output:** JSON with English and Arabic strings, validated by Zod.
- **Prompt logic:** asks for a short bilingual notification and exact JSON, with no Markdown fence.
- **No-key fallback:** fixed generic bilingual templates.
- **Provider/error fallback:** a deterministic personalized English/Arabic string using the supplied name, procedure, and blockers.
- **API key:** `GEMINI_API_KEY`.
- **Current environment:** the key is empty, so template mode is reported.
- **Current demo activation:** **not active in the demonstrated workflow.** Repository search shows no caller of `draftCommunication`. The displayed CR-1002 draft is inserted directly by `src/lib/seed.ts`.

### AI-adjacent but non-AI capabilities

- Readiness scoring is a deterministic weighted rule engine.
- Standby eligibility and ranking are deterministic arithmetic and hard constraints.
- Ranking explanations are fixed conditional strings.
- Evidence “extracted text” and confidence values are synthetic seed fields; no OCR or extraction model is implemented.
- Notifications and analytics are database queries, not AI.

The README’s broader references to AI summaries, prioritization explanations, and candidate-ranking explanations are not backed by active model calls in the current application code.

### Development tools

The repository contains no verifiable evidence that Codex, Claude, Cursor, ChatGPT, OpenAI models, Copilot, or local models were used to build it. Git history shows implementation commits but does not identify an AI development tool. Do not claim one from repository evidence alone.

## 11. Human Oversight and Safety

### Implemented protections

- Readiness and matching are deterministic and inspectable.
- Evidence requires a user to acknowledge, flag, or escalate it.
- Communication content remains editable and requires a user action before its simulated send.
- Slot proposals do not auto-book; scheduling officer/admin approval is required to mark the slot rescued.
- Ineligible stored candidates cannot be proposed.
- Every displayed evidence record is marked synthetic; case detail labels synthetic data.
- Many mutations use database transactions, Zod validation, and before/after audit payloads.
- Settings/reset and proposal approval have server-side role checks.
- Provider failure in the unused Gemini function falls back to templates.
- Health checks validate database path/schema availability.
- Demo seed/reset refuses to run when `DEMO_MODE=false`.

### Gaps / future protections

- Most clinical/evidence/communication mutations require authentication but not a specific role.
- Communications are marked `sent` although no external send occurs; the reason text clarifies simulation.
- Audit rows are normal mutable database records, not tamper-evident or immutable.
- Settings changes are not written to `auditEvents`.
- Stored Slot Rescue eligibility is not revalidated at proposal or approval time.
- There is no conflict-resolution policy, dual approval, separation-of-duties enforcement, versioning, digital signature, timeout, escalation engine, or real source provenance.
- There is no clinical validation of thresholds, weights, or standby suitability.

## 12. Data and Privacy

The repository includes synthetic masked patient names, synthetic MRNs, language preference, standby consent, availability, procedure/schedule details, requirements, action ownership, seeded evidence text, communications, users, proposals, and audit records. The README and UI explicitly prohibit real patient data.

### Storage and persistence

- Current application access uses Drizzle ORM’s libSQL adapter and `@libsql/client`.
- Local development defaults to `file:./data/caseready.db`.
- Vercel can use `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`; without Turso, Vercel falls back to `/tmp/caseready.db`, which is ephemeral.
- Docker config uses `/app/data/caseready.db` and declares a volume.
- Database files and `.env` files are gitignored.
- `better-sqlite3` is still used by bootstrap/migration/reset scripts, not the main request-path client.

### Security implemented

- Passwords are bcrypt hashes.
- Auth.js credentials sessions carry role and department claims.
- Protected pages also call `auth()`; notifications require a session.
- Mutation inputs receive basic Zod validation.
- Secrets and database locations are environment-configurable.

### Production privacy/security limitations

- Synthetic data does not demonstrate PHI governance.
- A hard-coded demo auth-secret fallback exists when environment secrets are absent.
- There is no encryption-at-rest configuration, key management, MFA, SSO, rate limiting, account lifecycle, consent governance, data retention/deletion workflow, field-level access, tenant isolation, security logging pipeline, DLP, backup/restore policy, or breach response.
- Runtime DDL is basic and does not show the foreign-key clauses expressed in the TypeScript schema.
- There is no documented threat model, penetration test, privacy impact assessment, data-processing agreement, or regulatory certification.

Do not claim HIPAA, GDPR, UAE health-data compliance, medical-device approval, or any certification.

## 13. Technical Architecture

In plain language, authenticated staff use a Next.js web application. Server-rendered pages query the database directly, and interactive client components call Next.js server actions for mutations. A deterministic rules module recalculates readiness; another deterministic module scores seeded standby candidates. Auth.js validates demo credentials. Data is stored through Drizzle/libSQL in a local SQLite file or remote Turso database. An optional but currently disconnected Gemini function can draft bilingual text.

```text
Authenticated staff browser
  ↓
Next.js 14 App Router
  ├─ React Server Components → direct Drizzle queries
  ├─ React Client Components → local UI state / URL filters
  ├─ Server Actions → Zod validation + role checks + transactions
  └─ API routes → Auth.js, notifications, health
        ↓
Domain layer
  ├─ Deterministic readiness engine
  ├─ Deterministic Slot Rescue engine
  └─ Optional Gemini drafting module (present, not wired to UI)
        ↓
Drizzle ORM / @libsql/client
  ├─ Local libSQL/SQLite file
  └─ Optional hosted Turso/libSQL
        ↓
Cases, requirements, actions, communications, proposals, audit events
```

There is no separate backend service, message broker, job queue, warehouse, or client state-management library. State is held in the database, URL query parameters, React local state, and a small session-storage language preference.

## 14. Technology Stack

| Layer | Technology | Purpose | Evidence file |
|---|---|---|---|
| Web framework | Next.js 14 App Router | Pages, server rendering, API routes, server actions, middleware | `package.json`, `src/app/**` |
| UI | React 18 + TypeScript | Components and typed application code | `package.json`, `tsconfig.json` |
| Styling | Tailwind CSS, forms/container-query plugins | Responsive design system and controls | `tailwind.config.ts`, `globals.css` |
| Icons | Google Material Symbols web font | UI iconography | `src/app/layout.tsx` |
| Authentication | Auth.js / next-auth v5 beta, Credentials provider | Login, JWT/session, role claims | `src/auth.ts`, `auth.config.ts` |
| Password hashing | bcryptjs | Demo credential verification | `src/auth.ts`, `src/lib/seed.ts` |
| ORM | Drizzle ORM | Typed database queries/transactions/schema | `src/db/schema.ts`, application queries |
| Database client | `@libsql/client`, `drizzle-orm/libsql` | Local file-backed libSQL or remote Turso | `src/db/client.ts` |
| CLI database helper | better-sqlite3 | Local bootstrap/migrate/reset inspection | `scripts/*.mjs` |
| Validation | Zod | Mutation and model-output validation | `src/app/actions.ts`, `src/lib/ai.ts` |
| Optional AI | Gemini 1.5 Flash REST API | Bilingual drafting function | `src/lib/ai.ts` |
| Unit testing | Vitest | Readiness and Slot Rescue rules | `vitest.config.ts`, unit test |
| Browser testing | Playwright | Auth, workflows, roles, UI, health | `playwright.config.ts`, `tests/*.spec.ts` |
| Container deployment | Docker / Node 20 | Build, run, volume, health check | `Dockerfile` |
| Serverless/remote DB support | Vercel-oriented config + Turso | Externalized libSQL bindings and remote URL | `next.config.mjs`, `.env.example`, recent commit |

## 15. Data Model

- **Users:** credentials, name, role, department. Referenced as approvers/proposers/audit actors.
- **Patients:** synthetic MRN, masked name, preferred language, standby consent, availability.
- **Surgeons:** name and specialty.
- **Operating rooms:** code, name, JSON capabilities, active flag.
- **Surgical cases:** patient, surgeon, OR, procedure/category, schedule/duration, readiness score/status, case status, cancellation reason.
- **Readiness requirements:** many per case; category, type, status, severity, owner, source, due date, notes.
- **Evidence documents:** belong to a case and requirement; title/type, extracted text, confidence, synthetic and review flags.
- **Action items:** belong to a case and requirement; description/type, priority/status, owner, due date, approval/completion fields.
- **Communications:** belong to an action and case; language/recipient, draft/final JSON content, status and approval/send timestamps.
- **Operating-room slots:** room and original case, time/duration, endangered/rescued/cancelled status.
- **Standby candidates:** slot-case pairing with component scores, eligibility, failed constraints, explanation.
- **Replacement proposals:** slot, original/proposed cases, proposer, decision maker, status/rejection.
- **Audit events:** optional case and user, actor/event/entity types, previous/new JSON, reason, approval state, timestamp.
- **System settings:** key/value JSON plus updater/time.

There are no separate blocker, procedure, inventory, bed, payer, clinical-observation, message-delivery, or hospital-tenant entities. “Blockers” are requirement states; procedures are strings on cases.

## 16. API and Backend Capabilities

| Method/action | Path/name | Purpose | Authorization |
|---|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | Auth.js login/session endpoints | Auth.js rules |
| GET | `/api/notifications` | Returns up to eight current operational notifications | Any authenticated session |
| GET | `/api/health` | Ensures schema, checks database path/schema, reports demo mode | Public by middleware exclusion |
| Server action | `logout` | Auth.js sign-out | Active session flow |
| Server action | `updateEvidenceStatus` | Acknowledge/flag evidence, change requirement, recalculate, audit | Any authenticated user |
| Server action | `requestClinicalReview` | Set review state, open follow-up action, recalculate, audit | Any authenticated user |
| Server action | `updateRequirementStatus` | Manual requirement state, recalculation, audit | Any authenticated user |
| Server action | `saveCommunicationDraft` | Save edited bilingual draft and audit | Any authenticated user |
| Server action | `returnCommunicationForReview` | Record returned draft and audit | Any authenticated user |
| Server action | `approveCommunication` | Mark simulated send, complete action, audit | Any authenticated user |
| Server action | `requestPatientConfirmation` | Record simulated confirmation request | Any authenticated user |
| Server action | `proposeReplacement` | Validate stored eligibility and create pending proposal | Any authenticated user |
| Server action | `approveProposal` | Approve/reject proposal; mark slot rescued on approval | Scheduling officer or administrator |
| Server action | `updateSettings` | Change hospital, thresholds, language | Administrator |
| Server action | `resetDemoData` | Reseed all demo tables and add reset audit event | Administrator and demo mode |
| Service | `ensureDbReady` / `ensureSchema` | Idempotent schema creation and seed empty DB | Internal startup |
| Service | `calculateReadiness` | Score/classify requirements | Internal |
| Service | `evaluateSlotCandidates` | Constraint-check and score candidates | Called during seeding |
| Service | `draftCommunication` | Optional Gemini/template bilingual drafting | Internal but currently unused |

## 17. Testing and Reliability

- **Type safety:** strict TypeScript is configured. `npx tsc --noEmit` passed on 30 July 2026.
- **Lint:** `npm run lint` passed with no warnings/errors.
- **Unit tests:** Vitest contains 6 tests in one file; all 6 passed. They cover complete readiness, missing critical blockers, exact CR-1051 score, missing consent, excessive duration, and an eligible high-scoring candidate.
- **Browser tests:** 12 Playwright test cases are defined across five files: four demo-account logins; coordinator evidence/communication/audit flow; two-role Slot Rescue approval; UI polish/search/settings/notifications; protected routes, invalid login, secondary controls, health, logout; admin reset.
- **Build:** a clean sequential `npm run build` passed and generated all application routes. An earlier deliberately parallel verification run produced a transient local SQLite recovery-lock message after compilation; rerunning the build alone passed cleanly. This demonstrates a local single-file database contention risk, not a failing build.
- **Validation:** Zod checks IDs, status enums, message lengths, settings bounds, and AI JSON shape. Threshold ordering is validated.
- **Transactions:** evidence changes, clinical-review requests, communications, proposals, approvals, settings, and requirement updates use transactions.
- **Fallbacks:** Gemini drafting falls back to templates; settings reads fall back to defaults; health reports unhealthy on schema failure.

Known gaps:

- Browser tests intentionally mutate and ultimately reset demo data, so they were inspected but not run during this non-destructive review.
- No tests cover AI calls/fallbacks, notifications query details, analytics arithmetic, audit immutability, authorization denial for most mutations, concurrency, duplicate proposals, Turso, Docker, migration parity, accessibility automation, load, or security.
- Several application types still use `any`.
- Playwright uses one Chromium desktop project; there are no mobile-browser or cross-browser projects.

## 18. Current Limitations

- Hackathon prototype with synthetic data and no clinical validation.
- No case intake, CSV/FHIR import, live scheduling feed, EMR/HIS/ERP/payer/inventory/bed integration.
- No real WhatsApp, SMS, email, phone, or patient-response handling.
- Optional Gemini function is disconnected from the actual UI/server-action workflow.
- Seeded evidence text/confidence is not produced by OCR or document AI.
- Standby readiness and resource compatibility inputs are synthetic/manual.
- Matching runs at seed time and is not recomputed before proposal/approval.
- No automatic detection of cancellation or slot risk from external events.
- Analytics is a current snapshot over demo rows, not longitudinal evidence of impact.
- Local SQLite/libSQL is vulnerable to contention and is not a multi-instance production architecture; `/tmp` on Vercel is ephemeral unless Turso is configured.
- Partial RBAC: only settings/reset and proposal approval have meaningful role checks.
- No department scoping, tenant isolation, least-privilege data views, or separation of duties.
- Audit records are not immutable; settings edits are not audited.
- Demo secret fallback is inappropriate for production.
- No regulatory, privacy, security, clinical-safety, or medical-device assurance.
- No real patient consent workflow beyond a boolean.
- Default-language toggle does not translate the interface; drafts are already bilingual.
- Room `capabilitiesJson` is not used by matching.
- UI copy can overstate “clinically cleared” for manually seeded standby scores.
- New Case Request is intentionally disabled; inventory is absent.
- The README’s primary database description is partly stale after the libSQL migration.
- External Google font/icon loading may degrade visual polish offline.

## 19. Future Roadmap

The repository does not contain a committed product roadmap; the following are recommendations based on verified gaps.

### Near Term

- Wire `draftCommunication` into an explicit draft-generation server action, label model/template provenance, and test both paths.
- Recompute standby eligibility at proposal and approval time; prevent duplicates and stale-slot decisions.
- Add role checks for evidence, requirement, communication, and proposal creation.
- Audit settings changes and add clearer before/after records.
- Make candidate inputs derive from stored requirements, room capabilities, team schedules, and bed state—or label them explicitly as scenario inputs.
- Add unit tests for threshold edges, authorization, analytics, AI fallback, and proposal state transitions.
- Prepare a repeatable demo reset/rehearsal script without changing production defaults.

### Pilot Stage

- Integrate read-only feeds from one hospital scheduling/ADT/EHR environment using approved APIs and mappings.
- Add SSO, department scoping, MFA policy, encrypted secrets, secure audit export, monitoring, backup, and controlled retention.
- Co-design and validate readiness requirements/weights with perioperative, anaesthesia, clinical safety, finance, and scheduling teams.
- Connect a sandbox messaging provider with explicit consent, delivery state, and inbound response handling.
- Run matching in real time with source timestamps and require constraint revalidation.
- Establish human-factors testing, incident handling, override reasons, and pilot outcome metrics.

### Production Stage

- Move to a highly available managed database and resilient integration/event architecture.
- Implement tenant isolation, fine-grained authorization, tamper-evident audit, disaster recovery, observability, and security operations.
- Complete legal, privacy, regulatory, cybersecurity, clinical-safety, and vendor risk reviews for the target jurisdiction.
- Validate algorithms prospectively, monitor drift/data quality, govern model changes, and define accountable owners.
- Add production-grade Epic/Cerner/Oracle Health/SAP/payer integrations only through site-approved interfaces; do not promise universal plug-and-play support.

## 20. Measurable Value

The repository contains target signals, not measured outcomes. A pilot could measure:

- percentage of cases Ready at 24/48/72 hours;
- day-of-surgery cancellation and delay rate;
- OR minutes initially at risk versus recovered;
- percentage and time-to-resolution of blockers;
- average action resolution time;
- number of calls/messages/manual handoffs per case;
- insurance/clinical/lab requirement turnaround time;
- slot-release-to-replacement decision time;
- proposal eligibility, acceptance, rejection, and stale-recommendation rates;
- staff coordination time and queue workload;
- patient confirmation response time;
- scheduled capacity, utilization, and avoidable idle time;
- safety exceptions, overrides, and incorrect evidence/recommendation rate.

The current Analytics page already calculates scheduled cases, readiness mix, OR minutes at risk, actions, average completed-action resolution time, proposals, approved swaps, recovered slot minutes, and work by department. Seed values must not be presented as achieved business impact.

## 21. Best Live Demo Scenario

### Pre-demo preparation

Reset to the seed baseline **before** the presentation using the admin Settings reset or, in a disposable demo environment only, `npm run db:reset`. This is necessary because normal startup preserves prior changes. Confirm `/api/health` is healthy and sign in as `coordinator@caseready.demo`.

### 2–3 minute story

1. **Start: Command Centre (`/`) — 20 seconds**
   - Point to 12 scheduled cases, the readiness mix, 570 OR minutes at risk, and the attention queue.
   - Say: “This is tomorrow’s list. CaseReady turns distributed prerequisites into one actionable readiness view.”
2. **Open a blocked case — 35 seconds**
   - Click the **Blocked** KPI, then **CR-1051**.
   - Point to **64% · Blocked**, the blocked insurance authorization, pending anaesthesia sign-off, and labs under clinical review.
   - Say: “The score is deterministic and explainable; the software is not making a clinical decision.”
3. **Review evidence — 30 seconds**
   - Click **Pre-op Labs**, show synthetic extracted text and 92% stored confidence, then click **Acknowledge**.
   - Point out that readiness recalculates but the insurance blocker remains.
   - Say: “A human reviews the evidence; one cleared item cannot hide another blocker, and the action is audited.”
4. **Recover a slot — 45 seconds**
   - Open **Slot Rescue**.
   - Show cancelled CR-1057’s 75-minute OR 03 slot, then CR-2003 as the 100% match. Expand an ineligible row to show the failed constraint.
   - Click **Propose replacement**.
   - Say: “This records a recommendation only. No booking has happened.”
5. **Approve with the authorized role — 35 seconds**
   - Log out, use the **Scheduling** demo shortcut, sign in, return to Slot Rescue, and click **Approve Swap**.
   - Show **Status: Rescued**.
6. **Close on accountability — 15 seconds**
   - Open **Audit Trail** and point to `proposal approved` (and the evidence event).
   - Say: “Every important demo decision has an actor, reason, state, approval status, and timestamp.”

### What the audience should notice

- one coherent chain from risk visibility to evidence review to capacity recovery;
- deterministic reasons and failed constraints;
- separate proposal and approval stages;
- no auto-booking or real messaging;
- live auditability.

### Backup path

- If mutable state is already changed, show CR-1003 as a stable blocked example and use existing approved/pending proposal records in Slot Rescue.
- If a mutation fails, stay read-only: expand candidate details, show failed constraints, then open seeded audit events.
- If the network is unavailable, the application logic still works locally; Material Symbols may render less cleanly because their font is remotely loaded.

## 22. Presentation Content

### Slide 1 — CaseReady AI: From Surgical Risk to Ready OR

**One-line message:** A human-supervised operations layer for safer readiness coordination and OR capacity recovery.

- Tomorrow’s cases in one readiness view
- Explainable blockers and accountable owners
- Human-approved action, communication, and slot recovery

**Suggested visual:** a simple “Blocked → Actioned → Ready / Slot Recovered” arc.

**Speaker notes (30–45 sec):** “CaseReady AI helps perioperative teams answer two questions before tomorrow’s list: which cases are genuinely ready, and what should we do when one cannot proceed? It brings readiness evidence, operational actions, and safe standby matching into one auditable workflow. This is a synthetic-data prototype: it recommends and coordinates; authorized hospital staff decide.”

### Slide 2 — The Hidden Cost of Fragmented Readiness

**One-line message:** A case can look scheduled while critical prerequisites remain scattered across teams.

- Consent, anaesthesia, labs, insurance, and logistics have different owners
- Late discovery creates delays, cancellations, and idle OR capacity
- Manual calls/spreadsheets obscure urgency and accountability
- Impact statement is a target hypothesis, not a measured result

**Suggested visual:** five department cards converging on one surgical slot with a risk indicator.

**Speaker notes:** “The repository models the real coordination pattern: Finance owns authorization, Anaesthesia owns sign-off, labs hold results, and Pre-Admissions handles patient preparation. When that state is fragmented, teams discover risk late. The operational consequence we aim to reduce is avoidable delay and unused OR time; the prototype does not yet claim measured savings.”

### Slide 3 — How CaseReady Works

**One-line message:** Detect, explain, act, approve, and learn from an auditable event trail.

- Deterministic readiness score and hard-blocker rules
- Evidence and action queue for human resolution
- Constraint-based standby matching when a slot is endangered
- Approval and audit at consequential steps

**Suggested visual:** five-stage horizontal flow with score gauges and approval gates.

**Speaker notes:** “CaseReady first calculates an explainable readiness state. Staff inspect the exact requirement and supporting evidence, then work the assigned action. If a case is cancelled, Slot Rescue checks consent, time fit, team, equipment, availability, bed capacity, and blockers. It creates a proposal—not a booking—and the audit trail records what happened.”

### Slide 4 — Core Capabilities

**One-line message:** One operational workspace covers the list, the case, the action, the slot, and the record.

- Command Centre and searchable surgical-case list
- Case checklist, evidence review, and clinical escalation
- Action Centre with editable bilingual drafts
- Slot Rescue, notifications, audit, and live database analytics

**Suggested visual:** five connected product capability cards, not screenshots.

**Speaker notes:** “The built product is more than a dashboard. The Command Centre links into case-level evidence and actions. The Action Centre supports English and Arabic draft review. Slot Rescue makes constraints visible. Notifications surface urgent work, Analytics calculates current operating metrics, and the Audit Trail gives every demo decision context.”

### Slide 5 — Intelligence With Human Control

**One-line message:** Rules protect safety; optional AI assists text; humans retain authority.

- Readiness and eligibility are deterministic and inspectable
- Candidate score: readiness, duration, team, equipment, availability
- Optional Gemini drafting module with template fallback
- Current demo uses seeded templates; AI is not wired into the UI
- No auto-clearance, auto-send, or auto-booking

**Suggested visual:** rules engine and optional AI branch feeding a human approval gate.

**Speaker notes:** “We should be precise about AI. The safety-critical logic is deterministic. There is a genuine Gemini bilingual-drafting module, but today’s demo does not call it; it uses a seeded template. That is intentional honesty for the finalist stage. The product’s defensible intelligence today is explainable operational rules, with a future assistive AI layer behind human approval.”

### Slide 6 — Architecture and Safety

**One-line message:** A typed full-stack prototype with explicit controls and a clear path to integration.

- Next.js/TypeScript, Auth.js, Drizzle, local libSQL or Turso
- Server actions with Zod validation and transactions
- Role-gated settings and scheduling approval
- Synthetic data, simulated communications, auditable mutations
- Not production-ready or compliance-certified

**Suggested visual:** browser → Next.js → rules/optional AI → database, with approval shields.

**Speaker notes:** “The application is a Next.js full stack with Auth.js, typed Drizzle queries, Zod validation, and transactional mutations. It runs locally on libSQL/SQLite and can point to Turso. Safety controls are visible, but so are the gaps: RBAC is partial, audit is not immutable, and there are no live hospital integrations or compliance claims.”

### Slide 7 — Value, Roadmap, and Demo

**One-line message:** Prove value by preventing late surprises and recovering otherwise lost capacity.

- Target metrics: readiness lead time, cancellations, resolution time, recovered OR minutes
- Near term: live revalidation, stronger roles, wired drafting, broader tests
- Pilot: one-site read-only integration and clinical/operational validation
- Production: resilient architecture, security, governance, and certified interfaces

**Suggested visual:** three-step roadmap above a small target-metrics dashboard.

**Speaker notes:** “The next proof is measurable: how early do we surface blockers, how quickly are they resolved, and how many endangered minutes are safely recovered? Near term we close prototype gaps. A pilot would start read-only at one site with validated rules. Production requires the full security, integration, governance, and clinical-safety program. Now let’s show the working flow.”

## 23. Likely Judge Questions and Strong Answers

1. **Where is the AI?**  
   There is a Gemini 1.5 Flash bilingual-drafting function in `src/lib/ai.ts`, with Zod validation and template fallback. It is not currently called by the UI; today’s demo draft is seeded. Readiness and matching are deterministic rules, and we will not mislabel them as generative AI.

2. **Is this only a rule engine?**  
   The current operational intelligence is primarily a rule engine plus workflow, authorization, evidence, and audit. That is appropriate for explainable, safety-sensitive gates. The repository also contains an optional assistive drafting integration, but it is not yet wired into the demo.

3. **Why is this better than a hospital dashboard?**  
   It does not just display counts. It links a risk to its exact requirements and evidence, supports audited mutations and action handling, ranks standby candidates, and enforces a proposal/approval workflow. A real hospital pilot would still need integration with source systems.

4. **How is readiness scored?**  
   Five common requirements have weights of 10/20/30/20/20. Status multipliers range from 1.0 completed to 0 blocked. The weighted percentage is combined with hard-blocker and warning rules and configurable 90/60 thresholds.

5. **Can the score be clinically trusted?**  
   Not yet. The formula is transparent and tested in code but has not been clinically validated. A pilot must co-design and validate requirements, thresholds, and governance with the hospital.

6. **Can the system make a wrong recommendation?**  
   Yes. Inputs can be stale, incomplete, or incorrectly mapped. That is why it exposes constraints, blocks ineligible stored candidates, requires human approval, and should revalidate against live sources before any pilot decision.

7. **Does it replace clinical judgment?**  
   No. It must not diagnose, clear a patient, or determine fitness for surgery. Clinical-review states explicitly route work to a human.

8. **How is patient data protected?**  
   The prototype uses only synthetic masked records and bcrypt-backed demo login. It is not approved for PHI. Production would require SSO/MFA, least privilege, encryption, retention, monitoring, tenant isolation, and jurisdiction-specific review.

9. **Is it HIPAA/GDPR/UAE compliant?**  
   No compliance claim is supported. The repository explicitly describes a hackathon prototype and lacks the controls and assurance evidence required for certification.

10. **Can it integrate with Epic, Cerner/Oracle Health, SAP, insurance portals, or EMRs?**  
    Not currently. There are no connectors. The architecture could consume approved APIs or interface feeds, but each integration would require site-specific identity, mapping, consent, error handling, and vendor governance.

11. **How does Slot Rescue avoid unsafe replacements?**  
    It checks consent, duration, team, equipment, patient availability, postoperative bed, and hard blockers, then requires scheduling approval. In the prototype these inputs are synthetic and evaluated at seed time, so live revalidation is required before a real pilot.

12. **Why is CR-2003 recommended?**  
    It has a 75-minute duration for a 75-minute slot, 100 readiness, confirmed availability, consent, compatible team, available equipment/bed, and no flagged hard blockers, producing 100%.

13. **What happens if records conflict?**  
    The current product lets a user flag evidence incorrect or request clinical review, and records that action. It does not implement source reconciliation, precedence, or conflict-resolution policy; that is a pilot requirement.

14. **Is the system explainable?**  
    Yes for the deterministic parts: weights, states, thresholds, component scores, and failed constraints are visible in code and partly in UI. The optional model output would need provenance and review if wired in.

15. **What happens when the AI provider is unavailable?**  
    The drafting function catches errors and returns a deterministic bilingual fallback. More importantly, AI output never controls readiness or slot eligibility.

16. **Does it automatically message patients?**  
    No. The UI records a simulated send after approval, and the audit reason says no external message was dispatched.

17. **Does it automatically reschedule a patient?**  
    No. It creates a proposal. A scheduling officer/admin may mark the demo slot rescued, but no external schedule changes.

18. **How would this scale?**  
    The current local file database is not the scaling design. The client already supports remote Turso, but production would need a managed HA database, queues/events, integration resilience, observability, concurrency testing, and tenant isolation.

19. **What was actually built?**  
    A functioning Next.js application with authentication, seeded synthetic data, readiness rules, case/evidence/actions, bilingual draft review, Slot Rescue, role-gated approvals/settings, audit, notifications, analytics, tests, health checks, Docker, and optional Turso/Gemini code.

20. **What is mocked or demo-only?**  
    All patient/case data, evidence extraction/confidence, action scenarios, resource compatibility, patient messaging, confirmation requests, slot changes, and outcomes. Gemini is disconnected from the UI.

21. **What would be needed for a real pilot?**  
    One-site read-only integrations, validated rules, stronger RBAC/SSO, real-time revalidation, secure messaging sandbox, source provenance, monitoring, clinical-safety governance, privacy/security review, and prospective metrics.

22. **Which department should use it first?**  
    A perioperative coordination or pre-admissions team working with OR scheduling is the strongest starting owner, with anaesthesia, finance, and clinical reviewers participating.

23. **What is the business value?**  
    The target value is fewer late readiness surprises, faster blocker resolution, lower coordination workload, and recovery of otherwise idle OR minutes. The repository has demo KPIs but no measured financial result.

24. **Why call it CaseReady AI if the demo AI is not active?**  
    The honest answer is that the current finalist prototype proves the operations and safety workflow first. An assistive AI drafting module exists, but the name should not be used to imply autonomous clinical intelligence. The strongest competition claim is Healthcare Operations.

25. **Can one user approve their own work?**  
    For slot decisions, any authenticated user can propose and a scheduler/admin can approve; the code does not prevent the same scheduler/admin from doing both. Stronger separation of duties is a recommended improvement.

26. **Are audit logs immutable?**  
    No. They are detailed application records with actor, state, reason, and time, but stored in the same database without tamper-evident controls.

## 24. Repository Evidence

| Claim | Supporting file | Function/component/section | Confidence |
|---|---|---|---|
| Product monitors surgical readiness and OR recovery | `README.md`, `src/app/page.tsx` | Overview; `DashboardPage` | High |
| Readiness is deterministic weighted logic | `src/lib/readiness.ts` | `calculateReadiness` | High |
| CR-1051 seed baseline is 64% Blocked | Unit test, `src/lib/seed.ts` | exact-state test; case definition | High |
| Thresholds default to 90/60 and are configurable | `readiness.ts`, `settings.ts`, Settings pages | threshold parameters/readers | High |
| Evidence review recalculates and audits | `src/app/actions.ts` | `updateEvidenceStatus` | High |
| Clinical review opens an action | `src/app/actions.ts` | `requestClinicalReview` | High |
| Communication is bilingual/editable and simulated | `ActionsClient.tsx`, `actions.ts` | draft drawer; `approveCommunication` | High |
| No real message is sent | `actions.ts` | communication/confirmation reason strings | High |
| Slot Rescue uses seven hard constraints | `src/lib/slot-rescue.ts` | `evaluateSlotCandidates` | High |
| Candidate overall score uses 30/25/15/15/15 weights | `src/lib/slot-rescue.ts` | weighted score | High |
| CR-2003 is seed best match at 100 | `src/lib/seed.ts`, slot engine | standby data/evaluation | High |
| Matching is run during seeding, not page load | `src/lib/seed.ts`, Slot Rescue page | seed evaluation; stored-candidate query | High |
| Slot proposal requires human approval to mark rescued | `actions.ts`, `SlotRescueClient.tsx` | `proposeReplacement`, `approveProposal` | High |
| Approval is scheduler/admin-only | `src/app/actions.ts` | `approveProposal` role guard | High |
| Settings/reset are admin-only | `src/app/actions.ts` | `updateSettings`, `resetDemoData` | High |
| Most other mutations are any-authenticated-user | `src/app/actions.ts` | `requireAuth` without role guard | High |
| Four demo roles/accounts exist | `src/lib/seed.ts`, Login client | seeded users/demo shortcuts | High |
| Audit includes actor/state/reason/approval/time | `src/db/schema.ts`, audit pages | `auditEvents` | High |
| Analytics is computed from DB rows | `src/app/analytics/page.tsx` | `AnalyticsPage` | High |
| Search and notifications are implemented | `Header.tsx`, notifications route | URL search; `GET` | High |
| Gemini function exists | `src/lib/ai.ts` | `draftCommunication`, `callGeminiAPI` | High |
| Gemini function is not wired into UI | repository-wide caller search | no caller outside its definition | High |
| Current configured demo mode has no Gemini key | local `.env` presence check (value not exposed) | `DEMO_MODE=true`, empty key | High for reviewed environment |
| Data is synthetic | `README.md`, seed, case UI | disclaimer and flags | High |
| Main DB client is libSQL/local file or Turso | `src/db/client.ts` | `resolveUrl` | High |
| Docker and health checks exist | `Dockerfile`, health route | `HEALTHCHECK`, `GET` | High |
| Unit/type/lint/build checks pass | commands run 30 Jul 2026 | Vitest/tsc/Next lint/build | High |
| 12 browser tests are defined | `tests/*.spec.ts` | Playwright test declarations | High |
| No live hospital integrations exist | complete source inventory | no connector/service implementation | High |
| No compliance certification exists | README and complete source inventory | disclaimer/absence of controls | High |

## 25. Final Accuracy Check

### Confirmed Implemented

- Authenticated Next.js application with four synthetic demo accounts
- Command Centre and filtered Surgical Cases list
- Case checklist with deterministic readiness score/status
- Configurable at-risk and blocked thresholds
- Evidence display, acknowledge, incorrect flag, and clinical-review request
- Action queues with priorities, owners, deadlines, approval and completion states
- Editable seeded English/Arabic communication
- Simulated communication approval/send and simulated confirmation request
- Deterministic standby constraints, component scores, and ranking explanations
- Pending replacement proposal plus scheduling officer/admin decision
- Slot status change to rescued after approval
- Search, notifications, help/support, health endpoint
- Audit search/filter/pagination and state payload display
- Database-derived current analytics
- Admin-only settings/reset and partial role enforcement
- Local libSQL/SQLite and optional remote Turso configuration
- Unit, browser-test definitions, lint/type/build tooling, Docker
- Optional Gemini bilingual-drafting function with fallback

### Partially Implemented or Demo-Only

- All clinical/operational records and outcomes are synthetic
- Evidence extraction/confidence is seeded, not generated
- Communication and patient confirmation are simulated
- Slot cancellation, compatibility, equipment, bed, and blocker inputs are seeded
- Matching occurs at seed time, not live
- Standby readiness scores are manually seeded
- Analytics shows demo/current snapshot values, not measured impact
- RBAC covers only settings/reset and proposal approval meaningfully
- Audit is detailed but not immutable and does not cover settings edits
- Default-language preference has limited UI effect
- Gemini integration exists but is not invoked by the product workflow
- Turso/Vercel/Docker paths are configured but not demonstrated as production assurance

### Not Implemented

- Real patient data use or production hospital deployment
- Clinical diagnosis, clearance, treatment advice, or validated clinical prediction
- Automatic booking, real rescheduling, or automatic clinical decisions
- Live Epic, Cerner/Oracle Health, SAP, payer, FHIR, ADT, inventory, bed, or scheduling integration
- Real SMS, WhatsApp, email, patient portal, or inbound patient response
- Document upload, OCR, document AI, or source-system reconciliation
- New-case intake/create workflow
- Inventory management
- Autonomous AI agent behavior
- Active AI summaries or AI-generated candidate ranking in the UI
- Immutable audit ledger, full least-privilege RBAC, SSO/MFA, tenant isolation
- Regulatory compliance, medical-device approval, clinical validation, or security certification
- Proven cancellation reduction, revenue gain, clinical outcome, or recovered-capacity result
