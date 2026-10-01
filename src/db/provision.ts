import { asc, eq } from "drizzle-orm";
import { db, ensureSchema } from "@/db/client";
import { surgicalCases, users } from "@/db/schema";
import { isDemoMode } from "@/lib/env";
import { seedDatabase } from "@/lib/seed";

// Ensures the database schema exists and — on a brand-new/empty database — seeds demo data.
// Memoised per server instance so it runs at most once (schema check + optional seed), which
// makes a fresh Turso database self-provision on first request without any CLI step.
let readyPromise: Promise<void> | null = null;

export function ensureDbReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = provision().catch((err) => {
      // Allow a retry on the next request if provisioning failed.
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

async function provision() {
  await ensureSchema();
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length === 0 || (isDemoMode() && (await demoListIsStale()))) {
    await seedDatabase();
  }
}

// The demo presents "tomorrow's operating list". Once that date is today or earlier (e.g. the
// data was seeded days before the demo), re-seed so the story is current again.
async function demoListIsStale() {
  const [first] = await db
    .select({ start: surgicalCases.scheduledStart })
    .from(surgicalCases)
    .where(eq(surgicalCases.caseStatus, "scheduled"))
    .orderBy(asc(surgicalCases.scheduledStart))
    .limit(1);
  if (!first) return false;
  const todayInUae = new Date(Date.now() + 4 * 3_600_000).toISOString().slice(0, 10);
  return first.start.slice(0, 10) <= todayInUae;
}
