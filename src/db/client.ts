import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import * as schema from "./schema";
import { SCHEMA_DDL } from "./ddl";

// Database connection.
// - Production (Vercel): set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN to use hosted Turso/libSQL.
// - Local dev / tests: falls back to a local SQLite file via libSQL's `file:` URL.
function resolveUrl(): { url: string; authToken?: string } {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    return { url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN };
  }
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
