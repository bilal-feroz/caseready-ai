export function isDemoMode() {
  return process.env.DEMO_MODE !== "false";
}

export function getAuthSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
}

export function getDatabasePath() {
  return process.env.DATABASE_PATH || "./data/caseready.db";
}
