import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { systemSettings } from "@/db/schema";
import type { ReadinessThresholds } from "@/lib/readiness";

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const [row] = await db
      .select({ valueJson: systemSettings.valueJson })
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);
    if (row?.valueJson) return JSON.parse(row.valueJson) as T;
  } catch {
    // settings table may be missing before migration/seed
  }
  return fallback;
}

export async function getHospitalName(): Promise<string> {
  return readSetting<string>("hospital_name", "Burjeel Hospital, Abu Dhabi");
}

export async function getDefaultLanguage(): Promise<"en" | "ar"> {
  const lang = await readSetting<string>("default_language", "en");
  return lang === "ar" ? "ar" : "en";
}

export async function getReadinessThresholds(): Promise<ReadinessThresholds> {
  return {
    atRiskThreshold: await readSetting<number>("warning_threshold", 90),
    blockedThreshold: await readSetting<number>("critical_threshold", 60),
  };
}
