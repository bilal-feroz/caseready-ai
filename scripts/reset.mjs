import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const dbPath = process.env.DATABASE_PATH || "./data/caseready.db";

console.log("Resetting database...");

try {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log("Deleted existing database file at", dbPath);
  }
  const journalPath = `${dbPath}-journal`;
  if (fs.existsSync(journalPath)) {
    fs.unlinkSync(journalPath);
  }
  const walPath = `${dbPath}-wal`;
  if (fs.existsSync(walPath)) {
    fs.unlinkSync(walPath);
  }
  const shmPath = `${dbPath}-shm`;
  if (fs.existsSync(shmPath)) {
    fs.unlinkSync(shmPath);
  }

  // Ensure directories exist
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log("Syncing database schema...");
  execSync("npm run db:push", { stdio: "inherit" });

  console.log("Running seed script...");
  execSync("npm run db:seed", { stdio: "inherit" });

  console.log("Database reset complete.");
} catch (err) {
  console.error("Database reset failed:", err);
  process.exit(1);
}
