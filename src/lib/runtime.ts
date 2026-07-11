import fs from "fs";
import path from "path";
import { db } from "@/db/client";
import { users, surgicalCases, systemSettings } from "@/db/schema";
import { getAuthSecret, getDatabasePath, isDemoMode } from "@/lib/env";

export function validateStartup() {
  const checks: Record<string, string> = {};
  const authSecret = getAuthSecret();
  if (!authSecret) {
    checks.authSecret = "AUTH_SECRET or NEXTAUTH_SECRET is required.";
  }

  const dbPath = getDatabasePath();
  const dbDir = path.dirname(path.resolve(dbPath));
  try {
    fs.mkdirSync(dbDir, { recursive: true });
    fs.accessSync(dbDir, fs.constants.W_OK);
    checks.databasePath = "ok";
  } catch (err) {
    checks.databasePath = `Database directory is not writable: ${dbDir}`;
  }

  try {
    db.select({ id: users.id }).from(users).limit(1).all();
    db.select({ id: surgicalCases.id }).from(surgicalCases).limit(1).all();
    db.select({ id: systemSettings.id }).from(systemSettings).limit(1).all();
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
