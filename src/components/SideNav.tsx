"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";

interface SideNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
    department?: string | null;
  } | null;
  hospitalName: string;
  mobileOpen: boolean;
  onNavigate: () => void;
}

const links = [
  { name: "Command Centre", href: "/", icon: "dashboard" },
  { name: "Surgical Cases", href: "/cases", icon: "clinical_notes" },
  { name: "Action Centre", href: "/actions", icon: "pending_actions" },
  { name: "Slot Rescue", href: "/slot-rescue", icon: "published_with_changes" },
  { name: "Audit Trail", href: "/audit", icon: "history" },
  { name: "Analytics", href: "/analytics", icon: "analytics" },
  { name: "Settings", href: "/settings", icon: "settings" },
];

export default function SideNav({ user, hospitalName, mobileOpen, onNavigate }: SideNavProps) {
  const pathname = usePathname();

  const openHelp = () => window.dispatchEvent(new Event("caseready:help"));
  const openSupport = () => window.dispatchEvent(new Event("caseready:support"));

  return (
    <nav
      aria-label="Primary"
      className={`w-[264px] sm:w-[232px] h-screen fixed lg:sticky top-0 left-0 bg-surface border-r border-outline-variant flex flex-col py-stack_lg z-50 transition-transform duration-300 motion-reduce:transition-none lg:translate-x-0 ${
        mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      }`}
    >
      <div className="px-container_padding mb-stack_lg flex items-center gap-stack_sm">
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center font-bold text-white shrink-0 shadow-sm">
          {user?.name?.[0] || "CR"}
        </div>
        <div className="min-w-0">
          <h1 className="font-headline-sm text-[16px] leading-tight font-black text-primary truncate">CaseReady AI</h1>
          <p className="font-caption text-caption text-on-surface-variant truncate">{hospitalName}</p>
        </div>
      </div>
      <button
        type="button"
        disabled
        title="Case intake is handled in the hospital scheduling system and is not part of this demonstration."
        className="mx-container_padding mb-stack_lg bg-primary/40 text-on-primary font-label-md text-label-md py-2 px-4 rounded-full cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }} aria-hidden="true">add</span>
        New Case Request
      </button>
      <ul className="flex-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <li key={link.name}>
              <Link
                href={link.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 px-container_padding py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                  isActive
                    ? "text-primary font-bold border-r-2 border-primary bg-surface-container-high"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className={`material-symbols-outlined ${isActive ? "icon-fill" : ""}`} aria-hidden="true">
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
          className="w-full flex items-center gap-3 py-2 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg px-2 -mx-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="material-symbols-outlined" aria-hidden="true">help</span>
          <span className="font-body-md text-body-md">Help</span>
        </button>
        <button
          type="button"
          onClick={openSupport}
          className="w-full flex items-center gap-3 py-2 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg px-2 -mx-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="material-symbols-outlined" aria-hidden="true">contact_support</span>
          <span className="font-body-md text-body-md">Support</span>
        </button>
        <form action={logout} className="mt-2">
          <button
            type="submit"
            className="w-full flex items-center gap-3 py-2 text-error hover:bg-red-50 transition-colors rounded-lg px-2 -mx-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
          >
            <span className="material-symbols-outlined" aria-hidden="true">logout</span>
            <span className="font-body-md text-body-md">Log Out</span>
          </button>
        </form>
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
