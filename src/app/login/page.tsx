"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { name: "Coordinator", email: "coordinator@caseready.demo", role: "coordinator" },
    { name: "Clinician", email: "clinician@caseready.demo", role: "clinical_reviewer" },
    { name: "Scheduling", email: "scheduling@caseready.demo", role: "scheduling_officer" },
    { name: "Admin", email: "admin@caseready.demo", role: "administrator" },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const selectDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Demo123!");
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F1] p-container_padding font-body-md text-body-md text-on-surface">
      <div className="w-full max-w-[440px] bg-surface-container-lowest border border-outline-variant rounded-xl p-stack_lg shadow-md">
        <div className="text-center mb-stack_lg">
          <h1 className="font-headline-md text-primary font-black mb-1">CaseReady AI</h1>
          <p className="font-caption text-on-surface-variant">Surgical Readiness Command Centre Login</p>
        </div>

        {error && (
          <div className="mb-stack_md p-3 bg-error-container text-on-error-container border border-error/20 rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-error" style={{ fontSize: "20px" }}>error</span>
            <span className="font-title-md text-[13px]">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-stack_md">
          <div>
            <label className="font-label-md text-on-surface-variant mb-1 block">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-body-md"
              placeholder="name@hospital.com"
            />
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-2.5 bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-body-md"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-on-primary font-title-md rounded-lg hover:bg-primary-container transition-colors font-bold disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-outline-variant"></div>
          <span className="flex-shrink mx-4 text-on-surface-variant font-caption text-caption">Demo Accounts</span>
          <div className="flex-grow border-t border-outline-variant"></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {demoAccounts.map((account) => (
            <button
              key={account.name}
              onClick={() => selectDemo(account.email)}
              className="p-2 border border-outline-variant hover:border-primary hover:text-primary rounded-lg text-left transition-colors bg-surface-container-low"
            >
              <p className="font-title-md text-[13px] text-on-surface font-semibold truncate">{account.name}</p>
              <p className="font-caption text-[11px] text-on-surface-variant truncate">{account.role.replace(/_/g, " ")}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
