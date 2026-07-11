export function isDemoMode() {
  return process.env.DEMO_MODE !== "false";
}

// A baked-in fallback so the demo deploys to Vercel with zero configuration.
// Override it by setting AUTH_SECRET in the environment for anything real.
const DEMO_AUTH_SECRET = "caseready-demo-secret-not-for-production-use-0001";

export function getAuthSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || DEMO_AUTH_SECRET;
}

export function getDatabasePath() {
  return process.env.DATABASE_PATH || "./data/caseready.db";
}
