import fs from "fs";
import path from "path";
import { db } from "@/db/client";
import { users, surgicalCases, systemSettings } from "@/db/schema";
import { getAuthSecret, getDatabasePath, isDemoMode } from "@/lib/env";

export async function validateStartup() {
  const checks: Record<string, string> = {};
  const authSecret = getAuthSecret();
  if (!authSecret) {
    checks.authSecret = "AUTH_SECRET or NEXTAUTH_SECRET is required.";
  }

  // For remote (Turso) or serverless (/tmp on Vercel) databases there is no fixed local
  // path worth checking — the schema query below is the real health signal.
  const usingTurso = Boolean(process.env.TURSO_DATABASE_URL);
  const skipPathCheck = usingTurso || Boolean(process.env.VERCEL);
  const dbPath = usingTurso ? "turso" : process.env.VERCEL ? "/tmp/caseready.db" : getDatabasePath();
  if (skipPathCheck) {
    checks.databasePath = "ok";
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
