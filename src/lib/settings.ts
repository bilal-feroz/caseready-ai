import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { systemSettings } from "@/db/schema";
import type { ReadinessThresholds } from "@/lib/readiness";

function readSetting<T>(key: string, fallback: T): T {
  try {
    const [row] = db
      .select({ valueJson: systemSettings.valueJson })
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1)
      .all();
    if (row?.valueJson) return JSON.parse(row.valueJson) as T;
  } catch {
    // settings table may be missing before migration/seed
  }
  return fallback;
}

export function getHospitalName(): string {
  return readSetting<string>("hospital_name", "Burjeel Hospital, Abu Dhabi");
}

export function getDefaultLanguage(): "en" | "ar" {
  const lang = readSetting<string>("default_language", "en");
  return lang === "ar" ? "ar" : "en";
}

export function getReadinessThresholds(): ReadinessThresholds {
  return {
    atRiskThreshold: readSetting<number>("warning_threshold", 90),
    blockedThreshold: readSetting<number>("critical_threshold", 60),
  };
}
