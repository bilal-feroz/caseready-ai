"use client";

import { useState } from "react";
import SideNav from "@/components/SideNav";
import Header from "@/components/Header";

interface ShellUser {
  name?: string | null;
  email?: string | null;
  role?: string;
  department?: string | null;
}

interface AppShellProps {
  user: ShellUser | null;
  hospitalName: string;
  defaultLanguage: "en" | "ar";
  children: React.ReactNode;
}

export default function AppShell({ user, hospitalName, defaultLanguage, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeNav = () => setMobileNavOpen(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          aria-hidden="true"
          onClick={closeNav}
        />
      )}

      <SideNav
        user={user}
        hospitalName={hospitalName}
        mobileOpen={mobileNavOpen}
        onNavigate={closeNav}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} defaultLanguage={defaultLanguage} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
