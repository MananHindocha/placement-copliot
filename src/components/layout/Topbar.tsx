"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Overview",
    subtitle: "Track your placement progress at a glance",
  },
  "/resume": {
    title: "Resume Screener & Tailor",
    subtitle: "Analyse, score, and tailor your resume for any role",
  },
  "/jobs": {
    title: "Job Discovery",
    subtitle: "Find and save roles matched to your profile",
  },
  "/tracker": {
    title: "Application Tracker",
    subtitle: "Manage every stage of your job search pipeline",
  },
  "/interview": {
    title: "Mock Interview Coach",
    subtitle: "Practice with AI-powered questions and feedback",
  },
  "/readiness": {
    title: "Placement Readiness Plan",
    subtitle: "Your personalised roadmap to landing the offer",
  },
};

export default function Topbar() {
  const pathname = usePathname();
  const page = PAGE_TITLES[pathname] ?? { title: "Dashboard", subtitle: "" };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-sm">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-white leading-tight">{page.title}</h1>
        <p className="text-sm text-slate-400">{page.subtitle}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/8 rounded-xl text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all w-48"
          />
        </div>

        {/* Notifications */}
        <button className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <span className="text-xs font-bold text-white">AK</span>
        </div>
      </div>
    </header>
  );
}
