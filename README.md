# CaseReady AI

**CaseReady AI is a human-supervised surgical readiness and operating-room recovery platform.**

It helps perioperative teams identify surgical cases at risk of cancellation, resolve missing prerequisites, coordinate follow-up actions, review supporting evidence, and recover operating-room capacity when a scheduled procedure cannot proceed.

> **Important:** CaseReady AI is a hackathon prototype built entirely with synthetic data. It is not approved for real hospital operations, clinical decision-making, or real patient information.

---

## What It Does

CaseReady AI provides hospital teams with a single operational workspace for:

- Monitoring upcoming surgical cases
- Identifying readiness blockers
- Reviewing supporting evidence
- Assigning and approving follow-up actions
- Drafting English and Arabic communications
- Escalating items requiring clinical review
- Ranking eligible standby cases
- Creating human-approved slot replacement proposals
- Maintaining a complete audit history

The system does not autonomously provide clinical clearance or reschedule patients.

**CaseReady recommends. Authorized hospital staff decide.**

---

## Core Workflows

### Surgical Readiness

Each surgical case is evaluated against operational and preoperative requirements such as:

- Patient consent
- Anaesthesia assessment
- Required laboratory results
- Clinical review
- Insurance authorization
- Fasting confirmation
- Medication instructions
- Patient availability
- Equipment and implant availability
- Postoperative bed capacity
- Transport arrangements

Cases are classified as:

- Ready
- At Risk
- Blocked
- Clinical Review Required

### Action Centre

Hospital staff can:

- Review unresolved blockers
- Assign tasks to responsible departments
- Review supporting evidence
- Edit bilingual communication drafts
- Approve or return actions for review
- Track completion and deadlines

### Slot Rescue

When a scheduled case cannot proceed, CaseReady ranks eligible standby cases using deterministic constraints such as:

- Procedure duration
- Surgical-team compatibility
- Equipment availability
- Patient readiness
- Standby consent
- Patient availability
- Postoperative capacity
- Outstanding safety blockers

No replacement is booked automatically. A scheduling officer or administrator must approve every proposal.

### Audit Trail

Important actions generate audit events recording:

- Actor
- Action type
- Previous state
- New state
- Supporting evidence
- Approval status
- Timestamp
- Reason

---

## Technology Stack

- **Framework:** Next.js 14 App Router
- **Language:** TypeScript
- **Authentication:** Auth.js
- **Database:** SQLite with `better-sqlite3`
- **ORM:** Drizzle ORM
- **Styling:** Tailwind CSS
- **Validation:** Zod
- **Testing:** Vitest and Playwright
- **Optional AI provider:** Gemini API

---

## Demo Accounts

Demo accounts are available only when:

```env
DEMO_MODE=true
````

| Role                      | Email                        | Password   |
| ------------------------- | ---------------------------- | ---------- |
| Perioperative Coordinator | `coordinator@caseready.demo` | `Demo123!` |
| Clinical Reviewer         | `clinician@caseready.demo`   | `Demo123!` |
| Scheduling Officer        | `scheduling@caseready.demo`  | `Demo123!` |
| Administrator             | `admin@caseready.demo`       | `Demo123!` |

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the environment

Copy the example environment file:

```bash
cp .env.example .env
```

For Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. Initialize and seed the database

```bash
npm run db:migrate
npm run db:seed
```

### 4. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Environment Variables

```env
DATABASE_PATH=./data/caseready.db
DEMO_MODE=true
AUTH_SECRET=replace-with-a-secure-secret
NEXTAUTH_URL=http://localhost:3000
GEMINI_API_KEY=
```

| Variable          | Purpose                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `DATABASE_PATH`   | Path to the SQLite database file                                 |
| `DEMO_MODE`       | Enables demo accounts, synthetic seed data, and database reset   |
| `AUTH_SECRET`     | Secret used by Auth.js                                           |
| `NEXTAUTH_SECRET` | Legacy-compatible Auth.js secret fallback                        |
| `NEXTAUTH_URL`    | Base URL used by Auth.js                                         |
| `GEMINI_API_KEY`  | Optional Gemini API key for summaries and communication drafting |

When `GEMINI_API_KEY` is empty, the application uses deterministic fallback templates.

AI-generated content never controls clinical clearance, eligibility rules, or booking decisions.

---

## Database Commands

Run migrations:

```bash
npm run db:migrate
```

Seed synthetic demo data:

```bash
npm run db:seed
```

Reset and reseed the database:

```bash
npm run db:reset
```

`db:seed` and `db:reset` are intended for demo environments and are disabled when:

```env
DEMO_MODE=false
```

---

## Application Routes

| Route                 | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| `/login`              | Authentication                                 |
| `/`                   | Surgical Readiness Command Centre              |
| `/cases`              | Surgical case list                             |
| `/cases/[caseNumber]` | Case readiness details                         |
| `/actions`            | Action Centre                                  |
| `/slot-rescue`        | Standby case ranking and replacement proposals |
| `/audit`              | Audit history                                  |
| `/analytics`          | Operational metrics                            |
| `/settings`           | System and demo settings                       |
| `/api/health`         | Application health check                       |

---

## Testing

Run TypeScript validation:

```bash
npx tsc --noEmit
```

Run ESLint:

```bash
npm run lint
```

Run unit tests:

```bash
npm run test
```

Run browser tests:

```bash
npm run test:e2e
```

Run the production build:

```bash
npm run build
```

The E2E test suite covers:

* All four demo-account login flows
* Protected-route access
* Evidence review
* Communication approval
* Audit-event creation
* Human-approved Slot Rescue workflow

---

## Production Build

```bash
npm run build
npm run start
```

Initialize the schema before the first production start:

```bash
npm run db:migrate
```

Do not seed demo accounts or synthetic cases in a non-demo deployment.

---

## SQLite Persistence

CaseReady AI uses SQLite and must run in a Node.js environment with persistent writable storage.

The application configures SQLite with:

* Foreign-key enforcement
* Write-ahead logging
* Busy timeout
* Configurable database path

Local database files are ignored by Git:

```text
data/*.db
data/*.db-*
```

For container deployment, mount a persistent directory and configure:

```env
DATABASE_PATH=/app/data/caseready.db
```

A serverless platform without persistent filesystem storage is not suitable for this SQLite configuration.

---

## Docker

Build the image:

```bash
docker build -t caseready-ai .
```

Run the container:

```bash
docker run --rm \
  -p 3000:3000 \
  -e AUTH_SECRET=test-development-secret \
  -e DATABASE_PATH=/app/data/caseready.db \
  -e DEMO_MODE=true \
  -v caseready-data:/app/data \
  caseready-ai
```

For Windows PowerShell:

```powershell
docker run --rm `
  -p 3000:3000 `
  -e AUTH_SECRET=test-development-secret `
  -e DATABASE_PATH=/app/data/caseready.db `
  -e DEMO_MODE=true `
  -v caseready-data:/app/data `
  caseready-ai
```

Check application health:

```bash
curl http://localhost:3000/api/health
```

The container runs database migrations when it starts. Demo data must be seeded explicitly.

---

## Human Supervision and Safety

CaseReady AI uses deterministic rules for readiness and standby eligibility.

The AI layer may assist with:

* Blocker summaries
* Prioritization explanations
* English communication drafts
* Arabic communication drafts
* Candidate-ranking explanations

The AI layer cannot:

* Provide clinical clearance
* Diagnose patients
* Recommend medication changes
* Override hard eligibility rules
* Automatically reschedule cases
* Send communications without approval
* Book a replacement case without authorization

---

## Secondary Controls

The current prototype includes:

* Live notifications based on urgent actions and audit events
* Contextual help drawer
* Support and health-status modal
* English and Arabic communication preference
* RTL rendering for Arabic content

Inventory management and new-case creation are intentionally outside the current demo scope.

---

## Dependency Audit Notes

Some `npm audit` findings require major dependency upgrades and were not force-applied because doing so could introduce breaking changes.

Known findings include:

* `next`: framework advisories requiring a major upgrade path
* `drizzle-orm`: identifier-escaping advisory
* `drizzle-kit` and `esbuild`: migration and development tooling findings
* `eslint-config-next` and `glob`: lint-tooling findings
* `vitest` and `vite`: test-tooling findings

The application does not accept user-provided SQL identifiers, and development or test tooling is not used in the production request path.

`next-auth` was upgraded to `5.0.0-beta.31` to apply the available compatible Auth.js security update.

A dependency upgrade and regression-testing cycle should be completed before any serious deployment.

---

## Known Limitations

* Built for a hackathon demonstration
* Uses synthetic data only
* Not a certified medical device
* Not approved for clinical use
* Not approved for real patient data
* Not integrated with a live hospital information system
* Uses local SQLite rather than a distributed production database
* Does not send real SMS or email messages
* Inventory management is outside the current scope
* New-case creation is outside the current scope

---

## Disclaimer

CaseReady AI is an experimental software prototype.

It must not be used to make clinical decisions, determine patient fitness for surgery, process real patient information, or modify live hospital schedules without appropriate technical, legal, security, clinical, and regulatory review.

```
```
