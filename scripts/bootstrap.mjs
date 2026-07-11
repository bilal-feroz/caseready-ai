// One-command bootstrap: ensures .env, database schema, and demo data exist before
// the dev/prod server starts. Runs automatically via the `predev` / `prestart` npm hooks.
// Idempotent: it only creates what is missing, so existing data is preserved on restarts.
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import Database from "better-sqlite3";

function log(msg) {
  console.log(`\x1b[35m[bootstrap]\x1b[0m ${msg}`);
}

// 1. Ensure a .env exists (fresh clones have none) so AUTH_SECRET etc. are present.
const envPath = path.resolve(".env");
if (!fs.existsSync(envPath) && fs.existsSync(".env.example")) {
  fs.copyFileSync(".env.example", envPath);
  log("Created .env from .env.example");
}

// Load .env into process.env for this script (tsx does not auto-load it).
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const dbPath = process.env.DATABASE_PATH || "./data/caseready.db";
fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

function hasTable(name) {
  if (!fs.existsSync(dbPath)) return false;
  const db = new Database(dbPath, { readonly: true });
  try {
    return Boolean(db.prepare("select name from sqlite_master where type='table' and name=?").get(name));
  } catch {
    return false;
  } finally {
    db.close();
  }
}

function rowCount(table) {
  const db = new Database(dbPath, { readonly: true });
  try {
    return db.prepare(`select count(*) as c from ${table}`).get().c;
  } catch {
    return 0;
  } finally {
    db.close();
  }
}

// 2. Apply the schema if the database has not been created yet.
if (!hasTable("users")) {
  log("Applying database schema (drizzle-kit push)...");
  execSync("npx drizzle-kit push", { stdio: "inherit" });
}

// 3. Seed demo data only when the database is empty (preserves your changes across restarts).
if (rowCount("users") === 0) {
  log("Seeding demo data...");
  execSync("npm run db:seed", { stdio: "inherit" });
  log("Ready. Sign in with coordinator@caseready.demo / Demo123!");
} else {
  log("Database ready (existing data preserved). Run `npm run db:reset` for a clean slate.");
}
