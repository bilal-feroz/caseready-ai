import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import Database from "better-sqlite3";

const dbPath = process.env.DATABASE_PATH || "./data/caseready.db";
const resolvedDbPath = path.resolve(dbPath);
const dbDir = path.dirname(resolvedDbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

if (fs.existsSync(resolvedDbPath)) {
  const sqlite = new Database(resolvedDbPath, { readonly: true });
  try {
    const existing = sqlite
      .prepare("select name from sqlite_master where type = 'table' and name = 'users'")
      .get();

    if (existing) {
      console.log(`Database schema already exists at ${resolvedDbPath}.`);
      console.log("Use npm run db:reset when you need to rebuild the demo database from scratch.");
      process.exit(0);
    }
  } finally {
    sqlite.close();
  }
}

execSync("npx drizzle-kit push", { stdio: "inherit" });
