import { db, ensureSchema } from "@/db/client";
import { users } from "@/db/schema";
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
  if (existing.length === 0) {
    await seedDatabase();
  }
}
