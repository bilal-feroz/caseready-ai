"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface SideNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
    department?: string | null;
  } | null;
}

export default function SideNav({ user }: SideNavProps) {
  const pathname = usePathname();

  const links = [
    { name: "Command Centre", href: "/", icon: "dashboard" },
    { name: "Surgical Cases", href: "/cases", icon: "clinical_notes" },
    { name: "Action Centre", href: "/actions", icon: "pending_actions" },
    { name: "Slot Rescue", href: "/slot-rescue", icon: "published_with_changes" },
    { name: "Audit Trail", href: "/audit", icon: "history" },
    { name: "Analytics", href: "/analytics", icon: "analytics" },
    { name: "Settings", href: "/settings", icon: "settings" },
  ];

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const openHelp = () => window.dispatchEvent(new Event("caseready:help"));
  const openSupport = () => window.dispatchEvent(new Event("caseready:support"));

  return (
    <nav className="w-[232px] h-screen fixed left-0 top-0 bg-surface border-r border-outline-variant flex flex-col py-stack_lg z-20">
      <div className="px-container_padding mb-stack_lg">
        <div className="flex items-center gap-stack_sm">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center font-bold text-white shrink-0 shadow-sm">
            {user?.name?.[0] || "CR"}
          </div>
          <div>
            <h1 className="font-headline-sm text-[16px] leading-tight font-black text-primary truncate">CaseReady AI</h1>
            <p className="font-caption text-caption text-on-surface-variant truncate">Burjeel Hospital, Abu Dhabi</p>
          </div>
        </div>
      </div>
      <button
        type="button"
        disabled
        title="Not included in this demonstration."
        className="mx-container_padding mb-stack_lg bg-primary/40 text-on-primary font-label-md text-label-md py-2 px-4 rounded-full cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
        New Case Request
      </button>
      <ul className="flex-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <li key={link.name}>
              <Link
                href={link.href}
                className={`flex items-center gap-3 px-container_padding py-3 transition-colors ${
                  isActive
                    ? "text-primary font-bold border-r-2 border-primary bg-surface-container-high"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className={`material-symbols-outlined ${isActive ? "icon-fill" : ""}`}>
                  {link.icon}
                </span>
                <span className="font-body-md text-body-md">{link.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto px-container_padding border-t border-outline-variant pt-stack_sm">
        <button
          type="button"
          onClick={openHelp}
          className="w-full flex items-center gap-3 py-2 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg px-2 -mx-2 text-left"
        >
          <span className="material-symbols-outlined">help</span>
          <span className="font-body-md text-body-md">Help</span>
        </button>
        <button
          type="button"
          onClick={openSupport}
          className="w-full flex items-center gap-3 py-2 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg px-2 -mx-2 text-left"
        >
          <span className="material-symbols-outlined">contact_support</span>
          <span className="font-body-md text-body-md">Support</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 py-2 mt-2 text-error hover:bg-red-50 transition-colors rounded-lg px-2 -mx-2 text-left"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-body-md text-body-md">Log Out</span>
        </button>
      </div>
      {user && (
        <div className="flex items-center gap-3 px-container_padding py-3 border-t border-outline-variant mt-2 shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center font-bold text-white text-[12px] shrink-0">
            {user.name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-title-md text-[13px] leading-normal text-on-surface truncate">{user.name}</p>
            <p className="font-caption text-[11px] text-on-surface-variant uppercase tracking-wider truncate">{user.role?.replace(/_/g, " ")}</p>
          </div>
        </div>
      )}
    </nav>
  );
}
