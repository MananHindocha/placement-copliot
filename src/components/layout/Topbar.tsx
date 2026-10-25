"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Search, Sparkles, LogIn, LogOut } from "lucide-react";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import { getCurrentUser, getUserProfile, signOutUser, type UserProfile } from "@/lib/services/auth.service";

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
  "/auth/login": {
    title: "Authentication",
    subtitle: "Sign in or register for persistent data synchronization",
  },
};

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const page = PAGE_TITLES[pathname] ?? { title: "Dashboard", subtitle: "" };
  
  const [mode] = useState<"demo" | "live">(getEffectiveDataMode);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((user) => {
        if (!isMounted) return;
        setIsAuthenticated(!!user);
        return getUserProfile();
      })
      .then((userProf) => {
        if (!isMounted || !userProf) return;
        setProfile(userProf);
      })
      .catch(() => {
        // Fallback to demo profile
      });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const handleSignOut = async () => {
    await signOutUser();
    setIsAuthenticated(false);
    router.push("/auth/login");
    router.refresh();
  };

  const initials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AK";

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-sm">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-white leading-tight">{page.title}</h1>
        <p className="text-sm text-slate-400">{page.subtitle}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Mode Indicator Pill */}
        {mode === "demo" ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Demo Mode</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Persistent</span>
          </div>
        )}

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/8 rounded-xl text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all w-44"
          />
        </div>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
        </button>

        {/* Sign In link or Sign Out button */}
        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign Out"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-xl border border-white/5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        ) : (
          <Link
            href="/auth/login"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl border border-indigo-500/20 transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign In</span>
          </Link>
        )}

        {/* User Avatar */}
        <div
          title={profile?.fullName || "User Profile"}
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-inner cursor-pointer"
        >
          <span className="text-xs font-bold text-white">{initials}</span>
        </div>
      </div>
    </header>
  );
}
