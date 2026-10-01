import fs from "fs";
import path from "path";
import { db, usingRemoteDatabase } from "@/db/client";
import { users, surgicalCases, systemSettings } from "@/db/schema";
import { getAuthSecret, getDatabasePath, isDemoMode } from "@/lib/env";

export async function validateStartup() {
  const checks: Record<string, string> = {};
  const authSecret = getAuthSecret();
  if (!authSecret) {
    checks.authSecret = "AUTH_SECRET or NEXTAUTH_SECRET is required.";
  }

  // For remote (Turso) databases there is no local path worth checking — the schema query
  // below is the real health signal.
  const onVercel = Boolean(process.env.VERCEL);
  const dbPath = usingRemoteDatabase ? "turso" : onVercel ? "/tmp/caseready.db" : getDatabasePath();
  if (usingRemoteDatabase) {
    checks.databasePath = "ok";
  } else if (onVercel) {
    // /tmp is private to each serverless instance and wiped on cold start, so changes made on
    // one page silently vanish on another. Fail loudly instead of demoing on it.
    checks.databasePath =
      "No persistent database: set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the Vercel project settings.";
  } else {
    const dbDir = path.dirname(path.resolve(dbPath));
    try {
      fs.mkdirSync(dbDir, { recursive: true });
      fs.accessSync(dbDir, fs.constants.W_OK);
      checks.databasePath = "ok";
    } catch {
      checks.databasePath = `Database directory is not writable: ${dbDir}`;
    }
  }

  try {
    await db.select({ id: users.id }).from(users).limit(1);
    await db.select({ id: surgicalCases.id }).from(surgicalCases).limit(1);
    await db.select({ id: systemSettings.id }).from(systemSettings).limit(1);
    checks.databaseSchema = "ok";
  } catch (err) {
    checks.databaseSchema = err instanceof Error ? err.message : "Database schema check failed.";
  }

  const healthy = Object.values(checks).every((value) => value === "ok");
  return {
    healthy,
    demoMode: isDemoMode(),
    databasePath: dbPath,
    checks,
  };
}
