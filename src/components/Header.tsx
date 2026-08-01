"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
  defaultLanguage: "en" | "ar";
  onMenuClick: () => void;
}

export default function Header({ user, defaultLanguage, onMenuClick }: HeaderProps) {
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
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchVal(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    const storedLanguage = sessionStorage.getItem("caseready-language") || defaultLanguage;
    setLanguage(storedLanguage);

    const openHelp = () => {
      setHelpOpen(true);
      setSupportOpen(false);
      setNotificationsOpen(false);
    };
    const openSupport = () => {
      setSupportOpen(true);
      setHelpOpen(false);
      setNotificationsOpen(false);
    };
    window.addEventListener("caseready:help", openHelp);
    window.addEventListener("caseready:support", openSupport);
    return () => {
      window.removeEventListener("caseready:help", openHelp);
      window.removeEventListener("caseready:support", openSupport);
    };
  }, [defaultLanguage]);

  // Close overlays on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setNotificationsOpen(false);
      setHelpOpen(false);
      setSupportOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    const searchable = pathname === "/" || pathname === "/cases";
    const target = searchable ? pathname : "/cases";
    const params = new URLSearchParams(searchable ? window.location.search : "");
    if (value) params.set("q", value);
    else params.delete("q");
    router.replace(`${target}?${params.toString()}`);
  };

  const handleLanguageChange = (nextLanguage: string) => {
    sessionStorage.setItem("caseready-language", nextLanguage);
    setLanguage(nextLanguage);
  };

  return (
    <header className="glass-header h-[72px] sticky top-0 border-b border-outline-variant flex justify-between items-center px-4 md:px-container_padding z-30 gap-3">
      <div className="flex items-center gap-3 md:gap-stack_lg min-w-0">
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="material-symbols-outlined" aria-hidden="true">menu</span>
        </button>
        <h2 className="font-headline-sm text-headline-sm font-black text-primary hidden sm:block shrink-0">CaseReady AI</h2>
        <div className="relative w-full max-w-64 hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none" aria-hidden="true">search</span>
          <input
            id="global-search"
            value={searchVal}
            onChange={handleSearchChange}
            aria-label="Search patients, cases, or operating rooms"
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-outline-variant rounded-full font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant"
            placeholder="Search patients, cases, or ORs"
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-stack_md shrink-0">
        <span className="font-label-md text-label-md text-primary px-3 py-1 bg-primary-fixed rounded-full hidden md:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary inline-block pulse-dot" aria-hidden="true"></span>
          System Status: Active
        </span>
        <div className="flex items-center gap-0.5 sm:gap-stack_sm">
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((open) => !open);
                setHelpOpen(false);
                setSupportOpen(false);
              }}
              className="p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-high transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error" aria-hidden="true" />
              )}
            </button>
            {notificationsOpen && (
              <div
                role="dialog"
                aria-label="Notifications"
                className="absolute right-0 top-full mt-1 w-[min(360px,calc(100vw-24px))] glass-panel border border-outline-variant rounded-lg shadow-xl overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
                  <p className="font-title-md text-title-md text-on-surface font-semibold">Notifications</p>
                  <button type="button" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)} className="text-on-surface-variant hover:text-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }} aria-hidden="true">close</span>
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
          </div>
          <button
            type="button"
            aria-label="Help"
            onClick={() => {
              setHelpOpen(true);
              setSupportOpen(false);
              setNotificationsOpen(false);
            }}
            className="p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-high transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="material-symbols-outlined" aria-hidden="true">help</span>
          </button>
          <button
            type="button"
            aria-label="Language"
            onClick={() => handleLanguageChange(language === "en" ? "ar" : "en")}
            className="p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-high transition-all flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title={`Interface language preference: ${language === "en" ? "English" : "Arabic"}. Applies to patient communication drafts.`}
          >
            <span className="material-symbols-outlined" aria-hidden="true">language</span>
            <span className="font-caption text-[10px] uppercase">{language}</span>
          </button>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8D447D] to-[#3F0037] flex items-center justify-center font-bold text-white text-[12px] border border-outline-variant" aria-hidden="true">
          {user?.name?.[0] || "CR"}
        </div>
      </div>

      {helpOpen && (
        <>
          <div className="fixed inset-0 bg-[#2A1025]/35 backdrop-blur-[2px] z-[90]" onClick={() => setHelpOpen(false)} aria-hidden="true" />
          <aside role="dialog" aria-modal="true" aria-label="CaseReady AI Help" className="fixed top-0 right-0 h-full w-[420px] max-w-full bg-surface-container-lowest border-l border-outline-variant shadow-xl z-[100] flex flex-col">
            <div className="px-container_padding py-4 border-b border-outline-variant flex items-center justify-between">
              <div>
                <h3 className="font-title-md text-title-md text-on-surface font-semibold">CaseReady AI Help</h3>
                <p className="font-caption text-caption text-on-surface-variant">Synthetic surgical readiness demonstration</p>
              </div>
              <button type="button" aria-label="Close help" onClick={() => setHelpOpen(false)} className="text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            <div className="p-container_padding space-y-stack_lg overflow-y-auto">
              <section>
                <h4 className="font-title-md text-on-surface font-semibold mb-1">Working the list</h4>
                <p className="font-body-md text-on-surface-variant">The Command Centre shows tomorrow&apos;s cases by readiness. Open a case to review blockers and evidence; resolve tasks in the Action Centre.</p>
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
          <div className="fixed inset-0 bg-[#2A1025]/35 backdrop-blur-[2px] z-[90]" onClick={() => setSupportOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label="Demo Support" className="fixed top-1/2 left-1/2 w-[440px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 glass-panel border border-outline-variant rounded-2xl shadow-xl z-[100] overflow-hidden">
            <div className="px-container_padding py-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="font-title-md text-title-md text-on-surface font-semibold">Demo Support</h3>
              <button type="button" aria-label="Close support" onClick={() => setSupportOpen(false)} className="text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            <div className="p-container_padding space-y-3">
              <p className="font-body-md text-on-surface"><strong>Contact:</strong> demo-support@caseready.local</p>
              <p className="font-body-md text-on-surface"><strong>Version:</strong> 0.1.0 hackathon demo</p>
              <p className="font-body-md text-on-surface"><strong>Health:</strong> <span className={healthStatus === "healthy" ? "clinical-teal-text" : "text-error"}>{healthStatus}</span></p>
              <Link href="/settings" onClick={() => setSupportOpen(false)} className="inline-flex items-center gap-1 text-primary font-label-md text-label-md hover:underline">
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">settings</span>
                Open documentation and settings
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
