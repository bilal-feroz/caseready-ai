# CaseReady AI - Surgical Readiness Command Centre

A full-stack Next.js App Router application migrating the approved high-fidelity prototype into a dynamic, deployable production hackathon version.

## Technical Stack

- **Framework:** Next.js 14 App Router
- **Language:** TypeScript
- **Database:** SQLite via `better-sqlite3` (Configurable `DATABASE_PATH`)
- **ORM:** Drizzle ORM
- **Auth:** Auth.js (Credentials Provider)
- **Styling:** Tailwind CSS (Custom Color System, spacing, IBM Plex Sans, Material Icons)
- **Validation:** Zod
- **Testing:** Vitest (unit) & Playwright (E2E)

## Setup & Running

Copy configuration parameters:
```bash
cp .env.example .env
```

Install packages:
```bash
npm install
```

Push schemas and seed database:
```bash
npm run db:push
npm run db:seed
```

Start the local development server:
```bash
npm run dev
```

The application will run at [http://localhost:3000](http://localhost:3000).

## Demo Login Credentials

- **Coordinator:** `coordinator@caseready.demo` / `Demo123!` (Role: `coordinator`)
- **Clinician:** `clinician@caseready.demo` / `Demo123!` (Role: `clinical_reviewer`)
- **Scheduling Officer:** `scheduling@caseready.demo` / `Demo123!` (Role: `scheduling_officer`)
- **Administrator:** `admin@caseready.demo` / `Demo123!` (Role: `administrator`)

## Database & Testing Commands

- **Push Schema changes:** `npm run db:push`
- **Re-seed data:** `npm run db:seed`
- **Reset database (schema push + seed):** `npm run db:reset`
- **Run Unit Tests:** `npm run test`
- **Run E2E Tests:** `npm run test:e2e`
