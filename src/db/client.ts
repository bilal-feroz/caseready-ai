import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import os from "os";

const defaultDatabasePath = process.env.VERCEL
  ? path.join(os.tmpdir(), "data", "caseready.db")
  : "./data/caseready.db";
const dbPath = process.env.DATABASE_PATH || defaultDatabasePath;

const dir = path.dirname(dbPath);
try {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.accessSync(dir, fs.constants.W_OK);
} catch (err) {
  throw new Error(`Database directory is not writable or cannot be created: ${path.resolve(dir)}`);
}

let sqlite: Database.Database;
try {
  sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
} catch (err) {
  const message = err instanceof Error ? err.message : "Unknown SQLite error";
  throw new Error(`Unable to open SQLite database at ${path.resolve(dbPath)}: ${message}`);
}

export const db = drizzle(sqlite, { schema });
