"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSettings, resetDemoData } from "@/app/actions";

interface SettingsClientProps {
  hospitalName: string;
  warningThreshold: number;
  criticalThreshold: number;
  userRole: string;
}

export default function SettingsClient({
  hospitalName: initialHospitalName,
  warningThreshold: initialWarning,
  criticalThreshold: initialCritical,
  userRole,
}: SettingsClientProps) {
  const router = useRouter();
  const [hospitalName, setHospitalName] = useState(initialHospitalName);
  const [warningThreshold, setWarningThreshold] = useState(initialWarning);
  const [criticalThreshold, setCriticalThreshold] = useState(initialCritical);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await updateSettings(
        hospitalName,
        Number(warningThreshold),
        Number(criticalThreshold)
      );
      if (res.success) {
        setMsg("System settings saved successfully.");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setMsg("Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const ok = confirm("Are you sure you want to reset the database? This will revert all modified records to their pre-seeded state.");
    if (!ok) return;

    setLoading(true);
    setMsg(null);

    try {
      const res = await resetDemoData();
      if (res.success) {
        setMsg("Database re-seeded successfully.");
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setMsg("Reset database failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-container_padding max-w-[800px] mx-auto w-full">
      <div className="pb-stack_md">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-1">System Settings</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Global configurations and administrator database management.</p>
      </div>

      {msg && (
        <div className="mb-stack_lg p-3 bg-primary-fixed/20 text-primary border border-primary/20 rounded-lg font-title-md text-[13px]">
          {msg}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-container_padding shadow-sm space-y-stack_lg">
        {/* Hospital Name */}
        <div>
          <label className="font-label-md text-label-md text-on-surface-variant mb-1 block">Hospital Name</label>
          <input
            type="text"
            value={hospitalName}
            onChange={(e) => setHospitalName(e.target.value)}
            required
            className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md"
          />
        </div>

        {/* Warning Threshold */}
        <div>
          <label className="font-label-md text-label-md text-on-surface-variant mb-1 block">Readiness Warning Threshold (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={warningThreshold}
            onChange={(e) => setWarningThreshold(Number(e.target.value))}
            required
            className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md"
          />
        </div>

        {/* Critical Threshold */}
        <div>
          <label className="font-label-md text-label-md text-on-surface-variant mb-1 block">Readiness Critical Threshold (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={criticalThreshold}
            onChange={(e) => setCriticalThreshold(Number(e.target.value))}
            required
            className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-body-md"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-50 font-bold"
          >
            Save Settings
          </button>
        </div>
      </form>

      {/* Admin Danger Zone */}
      {userRole === "administrator" && (
        <div className="mt-stack_lg bg-red-50/50 border border-error/20 rounded-xl p-container_padding shadow-sm">
          <h3 className="font-title-md text-title-md text-error font-bold mb-1">Danger Zone</h3>
          <p className="font-body-md text-on-surface-variant mb-4">Reset and re-seed the SQLite database. All modifications made during this demo session will be permanently deleted.</p>
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="px-4 py-2 bg-error text-on-error rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 font-bold"
          >
            Reset Database Demo Data
          </button>
        </div>
      )}
    </main>
  );
}
