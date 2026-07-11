import { db } from "@/db/client";
import { systemSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isDemoMode } from "@/lib/env";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  // Fetch settings
  const settings = db.select().from(systemSettings).all();
  const hospitalName = JSON.parse(settings.find(s => s.key === "hospital_name")?.valueJson || '"Burjeel Hospital"');
  const warningThreshold = JSON.parse(settings.find(s => s.key === "warning_threshold")?.valueJson || "75");
  const criticalThreshold = JSON.parse(settings.find(s => s.key === "critical_threshold")?.valueJson || "60");

  return (
    <SettingsClient
      hospitalName={hospitalName}
      warningThreshold={warningThreshold}
      criticalThreshold={criticalThreshold}
      userRole={session.user?.role || "coordinator"}
      demoMode={isDemoMode()}
    />
  );
}
