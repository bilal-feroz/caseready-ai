"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

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

  useEffect(() => {
    setSearchVal(searchParams.get("q") || "");
  }, [searchParams]);

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
          <Link href="#" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-all">Inventory</Link>
        </nav>
      </div>
      <div className="flex items-center gap-stack_md">
        <span className="font-label-md text-label-md text-primary px-3 py-1 bg-primary-fixed rounded-full flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary inline-block pulse-dot"></span>
          System Status: Active
        </span>
        <div className="flex items-center gap-stack_sm">
          <button className="p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-high transition-all">
            <span class="material-symbols-outlined">help</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined">language</span>
          </button>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center font-bold text-white text-[12px] border border-outline-variant">
          {user?.name?.[0] || "CR"}
        </div>
      </div>
    </header>
  );
}
