# CaseReady AI

CaseReady AI is a hackathon demo of a surgical readiness command centre. It tracks synthetic surgical cases, readiness blockers, evidence review, communication approval, slot rescue proposals, and audit history using the approved prototype UI.

This prototype is not approved for real hospital operations or real patient data. All bundled records are synthetic.

## Stack

- Next.js 14 App Router
- TypeScript
- Auth.js credentials authentication
- SQLite with `better-sqlite3`
- Drizzle ORM
- Tailwind CSS
- Vitest and Playwright

## Demo Accounts

Available only when `DEMO_MODE=true`.

- Coordinator: `coordinator@caseready.demo` / `Demo123!`
- Clinical reviewer: `clinician@caseready.demo` / `Demo123!`
- Scheduling officer: `scheduling@caseready.demo` / `Demo123!`
- Administrator: `admin@caseready.demo` / `Demo123!`

## Environment

Copy `.env.example` to `.env` for local development.

```bash
cp .env.example .env
```

Variables:

- `DATABASE_PATH`: SQLite file path. Default: `./data/caseready.db`.
- `DEMO_MODE`: `true` enables demo account shortcuts and demo-data reset. `false` hides demo shortcuts, disables reset, and blocks demo seeding.
- `AUTH_SECRET`: Auth.js secret. Preferred for deployment.
- `NEXTAUTH_SECRET`: Legacy-compatible Auth.js secret fallback.
- `NEXTAUTH_URL`: Local Auth.js URL.
- `GEMINI_API_KEY`: Optional. Empty uses deterministic templates.

## Local Setup

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

Database commands:

```bash
npm run db:migrate
npm run db:seed
npm run db:reset
```

`db:migrate` is idempotent. `db:seed` and `db:reset` require `DEMO_MODE` not to be `false`.

## Production

```bash
npm run build
npm run start
```

Run schema initialization before the first production start:

```bash
npm run db:migrate
```

Do not run `db:seed` in production unless this is an explicit demo deployment.

## SQLite Persistence

The application uses local SQLite and must run in a Node.js environment with persistent writable storage. The database directory is created automatically and checked for write access. SQLite runs with foreign keys, WAL mode, and a busy timeout.

Do not commit database files. Local DB files under `data/*.db` and `data/*.db-*` are ignored.

For container deployments, mount `/app/data` as persistent storage and set:

```bash
DATABASE_PATH=/app/data/caseready.db
```

## Docker

Build:

```bash
docker build -t caseready-ai .
```

Run:

```bash
docker run --rm -p 3000:3000 \
  -e AUTH_SECRET=test-development-secret \
  -e DATABASE_PATH=/app/data/caseready.db \
  -e DEMO_MODE=true \
  -v caseready-data:/app/data \
  caseready-ai
```

The container runs `db:migrate` on start, but it does not seed demo data automatically. Seed the mounted volume explicitly for a demo environment.

Health check:

```bash
curl http://localhost:3000/api/health
```

## Tests

```bash
npx tsc --noEmit
npm run lint
npm run test
npm run test:e2e
npm run build
```

E2E coverage includes all four demo logins, the coordinator evidence and communication workflow, and the human-approved Slot Rescue workflow.

## Secondary Controls

- Notifications opens a live dropdown from overdue actions, clinical review cases, pending proposals, and recent audit events.
- Help opens a drawer explaining statuses, human approval, and synthetic-data scope.
- Support opens a demo modal with version and health status.
- Language stores an English/Arabic session preference and Arabic communication content remains RTL.
- Inventory and New Case Request are explicitly disabled as outside demo scope.

## Dependency Vulnerability Notes

`npm audit` currently reports unresolved findings requiring major upgrades:

- `next`: runtime framework advisories. Audit fix requires a major upgrade to Next 16, not applied during this hardening pass.
- `drizzle-orm`: identifier escaping advisory. The app uses static schema/query builders and does not accept user-provided SQL identifiers, but a major Drizzle upgrade should be planned.
- `drizzle-kit` / `esbuild`: migration/dev tooling path. Used for explicit migration commands, not request-time runtime logic.
- `eslint-config-next` / `glob`: lint tooling path. Not part of production request handling.
- `vitest` / `vite`: test tooling path. Vitest UI/server is not used by the production app.

`next-auth` was upgraded to `5.0.0-beta.31`, resolving the available non-major Auth.js audit fix.

## Known Limitations

- This is a synthetic hackathon demo, not a clinical device or hospital production system.
- It must not process real patient data.
- Inventory and new case creation are intentionally out of demo scope.
- The optional Gemini integration is template-backed unless a key is supplied and never controls clinical clearance or booking.
