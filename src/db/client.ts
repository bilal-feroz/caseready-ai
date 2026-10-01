import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import * as schema from "./schema";
import { SCHEMA_DDL } from "./ddl";

// Find a hosted Turso/libSQL database. TURSO_DATABASE_URL + TURSO_AUTH_TOKEN is the standard
// pair; the Vercel Marketplace integration may instead add them under a custom prefix
// (e.g. STORAGE_DATABASE_URL + STORAGE_AUTH_TOKEN), so any *_DATABASE_URL holding a libsql://
// URL is accepted with its matching *_AUTH_TOKEN.
function findRemoteDatabase(): { url: string; authToken?: string } | null {
  if (process.env.TURSO_DATABASE_URL) {
    return { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN };
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("_DATABASE_URL") && value?.startsWith("libsql://")) {
      const prefix = key.slice(0, -"_DATABASE_URL".length);
      return { url: value, authToken: process.env[`${prefix}_AUTH_TOKEN`] };
    }
  }
  return null;
}

const remote = findRemoteDatabase();

/** True when connected to a hosted database rather than a local SQLite file. */
export const usingRemoteDatabase = remote !== null;

// Database connection.
// - Production (Vercel): a hosted Turso/libSQL database (see findRemoteDatabase).
// - Local dev / tests: a local SQLite file via libSQL's `file:` URL.
function resolveUrl(): { url: string; authToken?: string } {
  if (remote) return remote;
  const filePath =
    process.env.DATABASE_PATH || (process.env.VERCEL ? path.join("/tmp", "caseready.db") : "./data/caseready.db");
  // Ensure the directory exists for local file-based databases.
  try {
    fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  } catch {
    // best-effort; libSQL will surface a clear error if the path is unusable
  }
  return { url: `file:${filePath}` };
}

const { url, authToken } = resolveUrl();

export const client = createClient({ url, authToken });
export const db = drizzle(client, { schema });

// Apply the schema if it is missing (idempotent). Safe to call on every cold start.
export async function ensureSchema() {
  await client.executeMultiple(SCHEMA_DDL);
}
