"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSettings, resetDemoData } from "@/app/actions";

interface SettingsClientProps {
  hospitalName: string;
  warningThreshold: number;
  criticalThreshold: number;
  defaultLanguage: "en" | "ar";
  userRole: string;
  demoMode: boolean;
  aiConfigured: boolean;
}

export default function SettingsClient({
  hospitalName: initialHospitalName,
  warningThreshold: initialWarning,
  criticalThreshold: initialCritical,
  defaultLanguage: initialLanguage,
  userRole,
  demoMode,
  aiConfigured,
}: SettingsClientProps) {
  const router = useRouter();
  const isAdmin = userRole === "administrator";
  const [hospitalName, setHospitalName] = useState(initialHospitalName);
  const [warningThreshold, setWarningThreshold] = useState(initialWarning);
  const [criticalThreshold, setCriticalThreshold] = useState(initialCritical);
  const [defaultLanguage, setDefaultLanguage] = useState<"en" | "ar">(initialLanguage);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "info" | "error" } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    setMsg(null);
    try {
      await updateSettings({
        hospitalName,
        warningThreshold: Number(warningThreshold),
        criticalThreshold: Number(criticalThreshold),
        defaultLanguage,
      });
      setMsg({ text: "Settings saved.", tone: "info" });
      router.refresh();
    } catch (err: any) {
      setMsg({ text: err?.message?.includes("threshold") ? "Critical threshold cannot exceed the warning threshold." : "Failed to save settings.", tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const ok = confirm("Reset all demo data to the seeded baseline? Every change made during this session will be permanently discarded.");
    if (!ok) return;
    setLoading(true);
    setMsg(null);
    try {
      await resetDemoData();
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error(err);
      setMsg({ text: "Demo reset failed.", tone: "error" });
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-container_padding max-w-[800px] mx-auto w-full">
      <div className="pb-stack_md">
        <h1 className="font-headline-md text-headline-md text-on-surface mb-1">Settings</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Site configuration and administrator controls.</p>
      </div>

      {msg && (
        <div className={`mb-stack_lg p-3 rounded-lg font-title-md text-[13px] border ${msg.tone === "error" ? "bg-error-container text-on-error-container border-error/20" : "bg-primary-fixed/20 text-primary border-primary/20"}`} role="status">
          {msg.text}
        </div>
      )}

      {!isAdmin && (
        <div className="mb-stack_lg p-3 rounded-lg bg-surface-container border border-outline-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">lock</span>
          <p className="font-body-md text-body-md text-on-surface-variant">Configuration is read-only for your role. Only administrators can change these settings.</p>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-container_padding shadow-sm space-y-stack_lg">
        <fieldset disabled={!isAdmin || loading} className="space-y-stack_lg">
          <div>
            <label htmlFor="hospital" className="font-label-md text-label-md text-on-surface-variant mb-1 block">Hospital / site name</label>
            <input id="hospital" type="text" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} required
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md disabled:opacity-60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            <p className="font-caption text-caption text-on-surface-variant mt-1">Shown in the sidebar across the app.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack_lg">
            <div>
              <label htmlFor="warn" className="font-label-md text-label-md text-on-surface-variant mb-1 block">At-risk threshold (%)</label>
              <input id="warn" type="number" min={0} max={100} value={warningThreshold} onChange={(e) => setWarningThreshold(Number(e.target.value))} required
                className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md disabled:opacity-60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              <p className="font-caption text-caption text-on-surface-variant mt-1">A case scoring below this is flagged at risk.</p>
            </div>
            <div>
              <label htmlFor="crit" className="font-label-md text-label-md text-on-surface-variant mb-1 block">Blocked threshold (%)</label>
              <input id="crit" type="number" min={0} max={100} value={criticalThreshold} onChange={(e) => setCriticalThreshold(Number(e.target.value))} required
                className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md disabled:opacity-60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              <p className="font-caption text-caption text-on-surface-variant mt-1">With a hard blocker, a case below this is marked blocked.</p>
            </div>
          </div>

          <div>
            <label htmlFor="lang" className="font-label-md text-label-md text-on-surface-variant mb-1 block">Default language</label>
            <select id="lang" value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value as "en" | "ar")}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md disabled:opacity-60 cursor-pointer">
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
            <p className="font-caption text-caption text-on-surface-variant mt-1">Initial language for the header preference. Patient drafts remain bilingual.</p>
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={loading}
                className="px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-50 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                Save Settings
              </button>
            </div>
          )}
        </fieldset>
      </form>

      {/* Read-only environment status */}
      <div className="mt-stack_lg bg-surface-container-lowest border border-outline-variant rounded-xl p-container_padding shadow-sm">
        <h2 className="font-title-md text-title-md text-on-surface font-bold mb-3">Environment</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-body-md text-body-md">
          <div className="flex justify-between"><dt className="text-on-surface-variant">Message drafting</dt><dd className="text-on-surface font-semibold">{aiConfigured ? "AI model (Gemini)" : "Template mode"}</dd></div>
          <div className="flex justify-between"><dt className="text-on-surface-variant">Demo data</dt><dd className="text-on-surface font-semibold">{demoMode ? "Enabled" : "Disabled"}</dd></div>
        </dl>
        <p className="font-caption text-caption text-on-surface-variant mt-3">
          {aiConfigured
            ? "Patient drafts are generated by an AI model with a template fallback."
            : "No AI key is configured, so patient drafts use fixed bilingual templates. Every draft still requires human approval."}
        </p>
      </div>

      {/* Admin danger zone */}
      {isAdmin && demoMode && (
        <div className="mt-stack_lg bg-red-50/50 border border-error/20 rounded-xl p-container_padding shadow-sm">
          <h2 className="font-title-md text-title-md text-error font-bold mb-1">Reset demo data</h2>
          <p className="font-body-md text-on-surface-variant mb-4">Restore every table to the seeded baseline. All changes made during this session are permanently discarded. A confirmation is required and the reset is recorded in the audit trail.</p>
          <button type="button" onClick={handleReset} disabled={loading}
            className="px-4 py-2 bg-error text-on-error rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2">
            Reset Database Demo Data
          </button>
        </div>
      )}
      {isAdmin && !demoMode && (
        <div className="mt-stack_lg bg-surface-container-lowest border border-outline-variant rounded-xl p-container_padding shadow-sm">
          <h2 className="font-title-md text-title-md text-on-surface font-bold mb-1">Demo reset disabled</h2>
          <p className="font-body-md text-on-surface-variant">DEMO_MODE is false, so seeded demo-data reset is unavailable in this environment.</p>
        </div>
      )}
    </div>
  );
}
