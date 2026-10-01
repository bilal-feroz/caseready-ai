import { db } from "@/db/client";
import { systemSettings } from "@/db/schema";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isDemoMode } from "@/lib/env";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const settings = await db.select().from(systemSettings);
  const get = (key: string, fallback: string) => settings.find((s) => s.key === key)?.valueJson ?? fallback;
  const hospitalName = JSON.parse(get("hospital_name", '"Burjeel Hospital"'));
  const warningThreshold = JSON.parse(get("warning_threshold", "90"));
  const criticalThreshold = JSON.parse(get("critical_threshold", "60"));
  const defaultLanguage = JSON.parse(get("default_language", '"en"'));

  return (
    <SettingsClient
      hospitalName={hospitalName}
      warningThreshold={warningThreshold}
      criticalThreshold={criticalThreshold}
      defaultLanguage={defaultLanguage}
      userRole={session.user?.role || "coordinator"}
      demoMode={isDemoMode()}
      // Drafting is template-only: lib/ai.ts is not wired into any workflow yet, so a key alone
      // must not make this page claim an AI model is in use.
      aiConfigured={false}
    />
  );
}
