"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  href: string;
}

interface HeaderProps {
  user: {
    name?: string | null;
    role?: string;
  } | null;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [searchVal, setSearchVal] = useState(searchParams.get("q") || "");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState("checking");
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    setSearchVal(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    const storedLanguage = sessionStorage.getItem("caseready-language") || "en";
    setLanguage(storedLanguage);

    const openHelp = () => setHelpOpen(true);
    const openSupport = () => setSupportOpen(true);
    window.addEventListener("caseready:help", openHelp);
    window.addEventListener("caseready:support", openSupport);
    return () => {
      window.removeEventListener("caseready:help", openHelp);
      window.removeEventListener("caseready:support", openSupport);
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => setNotifications(data.notifications || []))
      .catch(() => setNotifications([]));
  }, [notificationsOpen]);

  useEffect(() => {
    if (!supportOpen) return;
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setHealthStatus(data.status || "unknown"))
      .catch(() => setHealthStatus("unreachable"));
  }, [supportOpen]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchVal(value);

    // Propagate search query parameter to URL for list pages
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }

    // Replace URL path keeping parameters
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleLanguageChange = (nextLanguage: string) => {
    sessionStorage.setItem("caseready-language", nextLanguage);
    setLanguage(nextLanguage);
  };

  return (
    <header className="h-[68px] fixed top-0 right-0 left-[232px] bg-surface-container-low border-b border-outline-variant flex justify-between items-center px-container_padding z-10">
      <div className="flex items-center gap-stack_lg">
        <h2 className="font-headline-sm text-headline-sm font-black text-primary hidden lg:block">CaseReady AI</h2>
        <div className="relative w-64 hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
          <input
            id="global-search"
            value={searchVal}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-outline-variant rounded-full font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant"
            placeholder="Search patients, cases, or ORs"
            type="text"
          />
        </div>
        <nav className="hidden lg:flex gap-stack_md">
          <Link href="/cases" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-all">Cases</Link>
          <Link href="/analytics" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-all">Metrics</Link>
          <span
            title="Not included in this demonstration."
            aria-disabled="true"
            className="font-label-md text-label-md text-on-surface-variant/50 cursor-not-allowed"
          >
            Inventory
          </span>
        </nav>
      </div>
      <div className="flex items-center gap-stack_md">
        <span className="font-label-md text-label-md text-primary px-3 py-1 bg-primary-fixed rounded-full flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary inline-block pulse-dot"></span>
          System Status: Active
        </span>
        <div className="flex items-center gap-stack_sm">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setNotificationsOpen((open) => !open)}
            className="p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-high transition-all relative"
          >
            <span className="material-symbols-outlined">notifications</span>
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error" />
            )}
          </button>
          <button
            type="button"
            aria-label="Help"
            onClick={() => setHelpOpen(true)}
            className="p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined">help</span>
          </button>
          <button
            type="button"
            aria-label="Language"
            onClick={() => handleLanguageChange(language === "en" ? "ar" : "en")}
            className="p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-high transition-all flex items-center gap-1"
            title={`Language preference: ${language === "en" ? "English" : "Arabic"}`}
          >
            <span className="material-symbols-outlined">language</span>
            <span className="font-caption text-[10px] uppercase">{language}</span>
          </button>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center font-bold text-white text-[12px] border border-outline-variant">
          {user?.name?.[0] || "CR"}
        </div>
      </div>

      {notificationsOpen && (
        <div className="absolute right-[168px] top-[60px] w-[360px] bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
            <p className="font-title-md text-title-md text-on-surface font-semibold">Notifications</p>
            <button type="button" onClick={() => setNotificationsOpen(false)} className="text-on-surface-variant hover:text-primary">
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
            </button>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center font-body-md text-on-surface-variant">No urgent notifications.</p>
            ) : (
              notifications.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setNotificationsOpen(false)}
                  className="block px-4 py-3 border-b border-outline-variant hover:bg-surface-container-low transition-colors"
                >
                  <p className="font-title-md text-[13px] text-on-surface capitalize">{item.title}</p>
                  <p className="font-caption text-caption text-on-surface-variant mt-0.5">{item.detail}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {helpOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setHelpOpen(false)} />
          <aside className="fixed top-0 right-0 h-full w-[420px] max-w-full bg-surface-container-lowest border-l border-outline-variant shadow-xl z-50 flex flex-col">
            <div className="px-container_padding py-4 border-b border-outline-variant flex items-center justify-between">
              <div>
                <h3 className="font-title-md text-title-md text-on-surface font-semibold">CaseReady AI Help</h3>
                <p className="font-caption text-caption text-on-surface-variant">Synthetic surgical readiness demonstration</p>
              </div>
              <button type="button" onClick={() => setHelpOpen(false)} className="text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-container_padding space-y-stack_lg overflow-y-auto">
              <section>
                <h4 className="font-title-md text-on-surface font-semibold mb-1">Current page</h4>
                <p className="font-body-md text-on-surface-variant">This command interface tracks synthetic surgical cases, readiness blockers, action approvals, slot rescue proposals, audit history, and demo settings.</p>
              </section>
              <section>
                <h4 className="font-title-md text-on-surface font-semibold mb-1">Statuses</h4>
                <p className="font-body-md text-on-surface-variant">Ready means no hard blockers. At risk means open warnings or incomplete items. Blocked means a critical blocker prevents readiness.</p>
              </section>
              <section>
                <h4 className="font-title-md text-on-surface font-semibold mb-1">Human approval</h4>
                <p className="font-body-md text-on-surface-variant">Communications and slot replacement proposals require human review. The app does not auto-send or auto-book real care activity.</p>
              </section>
              <section>
                <h4 className="font-title-md text-on-surface font-semibold mb-1">Data policy</h4>
                <p className="font-body-md text-on-surface-variant">All included records are synthetic and are not approved for real patient data.</p>
              </section>
            </div>
          </aside>
        </>
      )}

      {supportOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSupportOpen(false)} />
          <div className="fixed top-1/2 left-1/2 w-[420px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl z-50">
            <div className="px-container_padding py-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="font-title-md text-title-md text-on-surface font-semibold">Demo Support</h3>
              <button type="button" onClick={() => setSupportOpen(false)} className="text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-container_padding space-y-3">
              <p className="font-body-md text-on-surface"><strong>Contact:</strong> demo-support@caseready.local</p>
              <p className="font-body-md text-on-surface"><strong>Version:</strong> 0.1.0 hackathon demo</p>
              <p className="font-body-md text-on-surface"><strong>Health:</strong> <span className={healthStatus === "healthy" ? "clinical-teal-text" : "text-error"}>{healthStatus}</span></p>
              <Link href="/settings" onClick={() => setSupportOpen(false)} className="inline-flex items-center gap-1 text-primary font-label-md text-label-md hover:underline">
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>settings</span>
                Open documentation and settings
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
