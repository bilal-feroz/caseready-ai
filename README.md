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
