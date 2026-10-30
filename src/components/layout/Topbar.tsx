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
  Calendar,
  Clock,
  ArrowRight,
} from "lucide-react";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import {
  getStoredApplications,
  getStoredReadinessMilestones,
  getStoredResumeWorkspace,
} from "@/lib/storage-sync";
import {
  getCurrentUser,
  getUserProfile,
  signOutUser,
  type UserProfile,
} from "@/lib/services/auth.service";
import { clsx } from "clsx";
import type { KanbanCard, ReadinessMilestone, ResumeAnalysis } from "@/types";

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
    openwebninjaActive: boolean;
    himalayasActive: boolean;
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

  // Search & Notifications Popover State
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);

  // Cross-Module Data for Global Search & Alerts
  const [apps, setApps] = useState<KanbanCard[]>([]);
  const [milestones, setMilestones] = useState<ReadinessMilestone[]>([]);
  const [latestResume, setLatestResume] = useState<ResumeAnalysis | null>(null);

  const loadSearchAndAlertData = () => {
    try {
      const storedApps = getStoredApplications();
      setApps(storedApps);
      const storedMilestones = getStoredReadinessMilestones();
      setMilestones(storedMilestones);
      const resumeAnalysis = getStoredResumeWorkspace()?.analysis;
      setLatestResume(resumeAnalysis || null);
    } catch {
      // safe fallback
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSearchAndAlertData();
    }, 0);
    const handleUpdate = () => loadSearchAndAlertData();
    window.addEventListener("copilot-data-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("copilot-data-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
      if (e.key === "Escape") {
        setShowSearchModal(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

          {/* Quick Search Button */}
          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            className="hidden md:flex items-center gap-2 pl-3 pr-2.5 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl text-slate-400 hover:text-white transition-all shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-400">Search co-pilot...</span>
            <kbd className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300 font-mono">⌘K</kbd>
          </button>

          {/* Notifications Trigger & Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) setUnreadCount(0);
              }}
              aria-label="Notifications"
              className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white hover:bg-white/10 transition-all focus:outline-none"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#0e1424] border border-white/10 shadow-2xl p-4 z-50 animate-fadeIn space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/8">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-indigo-400" />
                    Notifications &amp; Reminders
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {/* Real Scheduled Interview notification */}
                  {apps
                    .filter((a) => a.status === "Interview" || a.status === "Phone Screen" || a.nextStepDate)
                    .slice(0, 2)
                    .map((app) => (
                      <div
                        key={app.id}
                        onClick={() => {
                          setShowNotifications(false);
                          router.push("/tracker");
                        }}
                        className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 cursor-pointer transition-all space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-300">
                          <span>{app.company}</span>
                          <span className="text-[10px] text-amber-300 font-normal">
                            {app.nextStepDate || "Interview"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300">
                          {app.nextStep || `${app.title} - Round scheduled.`}
                        </p>
                      </div>
                    ))}

                  {/* High priority task reminder */}
                  {milestones
                    .filter((m) => !m.completed && m.priority === "high")
                    .slice(0, 2)
                    .map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          setShowNotifications(false);
                          router.push("/readiness");
                        }}
                        className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 cursor-pointer transition-all space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-amber-300">
                          <span>Goal Reminder</span>
                          <span className="text-[10px] text-rose-400">High Priority</span>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-snug">{m.title}</p>
                      </div>
                    ))}

                  {/* Resume scan reminder */}
                  {latestResume && (
                    <div
                      onClick={() => {
                        setShowNotifications(false);
                        router.push("/resume");
                      }}
                      className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 cursor-pointer transition-all space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-300">
                        <span>Resume Diagnostic</span>
                        <span className="text-[10px] text-emerald-400">{latestResume.matchScore}% Match</span>
                      </div>
                      <p className="text-[10px] text-slate-300">
                        ATS Score: {latestResume.atsScore}%. Ready for application tailoring.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setUnreadCount(0);
                      setShowNotifications(false);
                    }}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Clear reminders
                  </button>
                </div>
              </div>
            )}
          </div>

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
                    OpenWeb Ninja + Himalayas APIs
                  </span>
                  {statusData?.jobFeed.openwebninjaActive && statusData?.jobFeed.himalayasActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Both Active
                    </span>
                  ) : statusData?.jobFeed.openwebninjaActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> OpenWeb Ninja
                    </span>
                  ) : statusData?.jobFeed.himalayasActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Himalayas
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      ⚡ Demo Catalog
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {statusData?.jobFeed.details ||
                    "OpenWeb Ninja (India/Global JSearch) + Himalayas Remote APIs active."}
                </p>
                <div className="flex items-center gap-4 text-[10px] text-indigo-400 font-semibold">
                  <span>Primary: OpenWeb Ninja (JSearch)</span>
                  <span>•</span>
                  <span>Remote: Himalayas App</span>
                </div>
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

      {/* ─── GLOBAL SEARCH MODAL (Ctrl+K / Cmd+K) ──────────────────────────────── */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-[#0B1120] border border-white/12 shadow-2xl overflow-hidden">
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/2">
              <Search className="w-4 h-4 text-indigo-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs, tracked applications, readiness goals, or pages..."
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                className="text-[10px] bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded text-slate-400 font-mono"
              >
                ESC
              </button>
            </div>

            {/* Results container */}
            <div className="max-h-80 overflow-y-auto p-3 space-y-3 text-xs">
              {/* Navigation Shortcuts */}
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1">
                  Navigation
                </p>
                <div className="space-y-1">
                  {[
                    { label: "Overview & Dashboard", href: "/dashboard", desc: "KPIs and schedule" },
                    { label: "Resume Studio", href: "/resume", desc: "ATS scanner & diagnostic" },
                    { label: "Job Discovery", href: "/jobs", desc: "Find matched jobs" },
                    { label: "Application Tracker", href: "/tracker", desc: "Kanban pipeline" },
                    { label: "AI Mock Interview Coach", href: "/interview", desc: "Whisper audio & video studio" },
                    { label: "Placement Readiness Plan", href: "/readiness", desc: "Milestones roadmap" },
                  ]
                    .filter(
                      (p) =>
                        !searchQuery.trim() ||
                        p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.desc.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item) => (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => {
                          setShowSearchModal(false);
                          router.push(item.href);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 text-left text-slate-300 hover:text-white transition-all group"
                      >
                        <span className="font-medium">{item.label}</span>
                        <span className="text-[11px] text-slate-500 group-hover:text-indigo-400 flex items-center gap-1">
                          {item.desc} <ArrowRight className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Tracked Applications matching query */}
              {apps.filter(
                (a) =>
                  searchQuery.trim() &&
                  ((a.company && a.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (a.title && a.title.toLowerCase().includes(searchQuery.toLowerCase())))
              ).length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1">
                    Tracked Applications
                  </p>
                  <div className="space-y-1">
                    {apps
                      .filter(
                        (a) =>
                          searchQuery.trim() &&
                          ((a.company && a.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (a.title && a.title.toLowerCase().includes(searchQuery.toLowerCase())))
                      )
                      .slice(0, 4)
                      .map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => {
                            setShowSearchModal(false);
                            router.push("/tracker");
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-indigo-500/10 text-left transition-all"
                        >
                          <div>
                            <p className="text-white font-medium">{app.company}</p>
                            <p className="text-[10px] text-slate-400">{app.title}</p>
                          </div>
                          <span className="text-[10px] text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                            {app.status}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Readiness Milestones matching query */}
              {milestones.filter(
                (m) =>
                  searchQuery.trim() &&
                  m.title &&
                  m.title.toLowerCase().includes(searchQuery.toLowerCase())
              ).length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1">
                    Readiness Goals
                  </p>
                  <div className="space-y-1">
                    {milestones
                      .filter(
                        (m) =>
                          searchQuery.trim() &&
                          m.title &&
                          m.title.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .slice(0, 3)
                      .map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setShowSearchModal(false);
                            router.push("/readiness");
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-emerald-500/10 text-left transition-all"
                        >
                          <span className="text-slate-300 truncate max-w-xs">{m.title}</span>
                          <span className="text-[10px] text-slate-400">{m.completed ? "✓ Done" : "Pending"}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
