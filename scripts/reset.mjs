import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const dbPath = process.env.DATABASE_PATH || "./data/caseready.db";

if (process.env.DEMO_MODE === "false") {
  console.error("Refusing to reset demo data because DEMO_MODE=false.");
  process.exit(1);
}

console.log("Resetting database...");

try {
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
      console.log("Deleted existing database file at", dbPath);
    } catch (err) {
      if (err?.code === "EBUSY") {
        console.warn("Database file is currently open; falling back to in-place re-seed.");
      } else {
        throw err;
      }
    }
  }
  const journalPath = `${dbPath}-journal`;
  if (fs.existsSync(journalPath)) {
    try {
      fs.unlinkSync(journalPath);
    } catch (err) {
      if (err?.code !== "EBUSY") throw err;
    }
  }
  const walPath = `${dbPath}-wal`;
  if (fs.existsSync(walPath)) {
    try {
      fs.unlinkSync(walPath);
    } catch (err) {
      if (err?.code !== "EBUSY") throw err;
    }
  }
  const shmPath = `${dbPath}-shm`;
  if (fs.existsSync(shmPath)) {
    try {
      fs.unlinkSync(shmPath);
    } catch (err) {
      if (err?.code !== "EBUSY") throw err;
    }
  }

  // Ensure directories exist
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log("Syncing database schema...");
  execSync("npm run db:migrate", { stdio: "inherit" });

  console.log("Running seed script...");
  execSync("npm run db:seed", { stdio: "inherit" });

  console.log("Database reset complete.");
} catch (err) {
  console.error("Database reset failed:", err);
  process.exit(1);
}
