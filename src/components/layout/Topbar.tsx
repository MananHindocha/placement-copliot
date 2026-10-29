"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Search,
  Sparkles,
  LogIn,
  LogOut,
  Cpu,
  Database,
  Briefcase,
  FileText,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import {
  getCurrentUser,
  getUserProfile,
  signOutUser,
  type UserProfile,
} from "@/lib/services/auth.service";
import { clsx } from "clsx";

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

interface SystemStatusData {
  database: {
    configured: boolean;
    mode: "live" | "demo";
    provider: string;
    details: string;
  };
  aiEngine: {
    configured: boolean;
    geminiActive: boolean;
    groqActive: boolean;
    provider: string;
    details: string;
  };
  jobFeed: {
    configured: boolean;
    adzunaActive: boolean;
    remotiveActive: boolean;
    details: string;
  };
  pythonParser: {
    online: boolean;
    url: string;
    details: string;
  };
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const page = PAGE_TITLES[pathname] ?? { title: "Dashboard", subtitle: "" };

  const [mode] = useState<"demo" | "live">(getEffectiveDataMode);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // System Status Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusData, setStatusData] = useState<SystemStatusData | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const fetchSystemStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/system/status");
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleOpenStatusModal = () => {
    setShowStatusModal(true);
    fetchSystemStatus();
  };

  const handleCopyCmd = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

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
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-sm sticky top-0 z-40">
        {/* Page title */}
        <div>
          <h1 className="text-lg font-semibold text-white leading-tight">
            {page.title}
          </h1>
          <p className="text-xs text-slate-400">{page.subtitle}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Interactive Mode & System Status Pill */}
          <button
            type="button"
            onClick={handleOpenStatusModal}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer group shadow-sm",
              mode === "demo"
                ? "bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/40"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40"
            )}
            title="Click to view System & API Connection Status"
          >
            {mode === "demo" ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Demo Mode</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Mode</span>
              </>
            )}
            <span className="text-[10px] text-slate-500 group-hover:text-slate-300 ml-0.5">
              • Status
            </span>
          </button>

          {/* Quick Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white/5 border border-white/8 rounded-xl text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all w-36"
            />
          </div>

          {/* Notifications */}
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white hover:bg-white/10 transition-all focus:outline-none"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />
          </button>

          {/* Sign In link or Sign Out button */}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-xl border border-white/5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl border border-indigo-500/20 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}

          {/* User Avatar */}
          <div
            title={profile?.fullName || "User Profile"}
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-inner cursor-pointer"
          >
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
        </div>
      </header>

      {/* Interactive System Status & API Key Configuration Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#0B1120] border border-white/12 rounded-2xl shadow-2xl overflow-hidden space-y-5 p-6 relative text-left">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/8">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  System & API Connection Status
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Fail-Honest Architecture: All free APIs fallback to built-in deterministic heuristic engines.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchSystemStatus}
                  className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs flex items-center gap-1"
                  title="Refresh status"
                >
                  <RefreshCw
                    className={clsx(
                      "w-3.5 h-3.5",
                      loadingStatus ? "animate-spin text-indigo-400" : ""
                    )}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Service Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {/* 1. Database & Persistence */}
              <div className="p-3.5 rounded-xl border border-white/8 bg-[#050811] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-400" />
                    Supabase PostgreSQL
                  </span>
                  {statusData?.database.configured ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Live Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      ⚡ Demo Mode
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {statusData?.database.details || "Local in-memory store active with sample applications and jobs."}
                </p>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Get free Supabase keys <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* 2. Primary AI Engine */}
              <div className="p-3.5 rounded-xl border border-white/8 bg-[#050811] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    Gemini 2.0 Flash
                  </span>
                  {statusData?.aiEngine.geminiActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      ⚡ Heuristic
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {statusData?.aiEngine.geminiActive
                    ? "Live LLM reasoning for job matching and XYZ bullet rewriting."
                    : "Deterministic XYZ formula and keyword scoring active (Zero API key mode)."}
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Get free Gemini API key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* 3. Live Job Search Feed */}
              <div className="p-3.5 rounded-xl border border-white/8 bg-[#050811] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                    Adzuna Jobs API
                  </span>
                  {statusData?.jobFeed.adzunaActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      ⚡ Remotive + Mock
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {statusData?.jobFeed.adzunaActive
                    ? "Live query support for Indian tech hubs (Bangalore, Hyderabad, etc.)."
                    : "Free Remotive remote jobs + 20 curated Indian tech postings active."}
                </p>
                <a
                  href="https://developer.adzuna.com/signup"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Get free Adzuna developer account <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* 4. Local Python Resume Parser */}
              <div className="p-3.5 rounded-xl border border-white/8 bg-[#050811] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    Python PDF/DOCX Parser
                  </span>
                  {statusData?.pythonParser.online ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> PyMuPDF Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/25">
                      ⚡ Internal Buffer Parser
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {statusData?.pythonParser.details || "Local microservice running on port 8000."}
                </p>
                <div className="flex items-center justify-between text-[10px] bg-white/5 p-1.5 rounded-lg font-mono text-slate-300">
                  <span className="truncate">uvicorn main:app --reload --port 8000</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyCmd(
                        "cd python-parser && uvicorn main:app --reload --port 8000",
                        "py-cmd"
                      )
                    }
                    className="ml-2 text-indigo-400 hover:text-white shrink-0"
                    title="Copy start command"
                  >
                    {copiedKey === "py-cmd" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/8 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Configure keys anytime in <code className="text-white">.env.local</code>
              </span>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
