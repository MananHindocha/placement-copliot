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
    title: "Home",
    subtitle: "Track your placement progress at a glance",
  },
  "/resume": {
    title: "My Resume",
    subtitle: "Analyse, score, and tailor your resume for any role",
  },
  "/jobs": {
    title: "Find Jobs",
    subtitle: "Find and save roles matched to your profile",
  },
  "/tracker": {
    title: "My Applications",
    subtitle: "Manage every stage of your job search pipeline",
  },
  "/interview": {
    title: "Practice Interviews",
    subtitle: "Practice with AI-powered questions and feedback",
  },
  "/interview/question-bank": {
    title: "Standard Question Bank",
    subtitle: "Select your engineering role to practice curated technical & behavioral questions",
  },
  "/interview/resume-grill": {
    title: "Resume & Project Grill",
    subtitle: "Select your engineering role for in-depth codebase & project defense",
  },
  "/interview/dsa": {
    title: "OA & DSA Problemset",
    subtitle: "Practice coding problems, sharpen your algorithms, and prepare for technical assessments",
  },
  "/interview/customize": {
    title: "Customize by Resume & JD",
    subtitle: "Generate personalized interview questions matching your resume and target role",
  },
  "/readiness": {
    title: "Study Plan",
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

export interface TopbarProps {
  onOpenPrepDrawer?: () => void;
  prepSummary?: {
    pct: number;
    todayCount: number;
  };
}

export default function Topbar({ onOpenPrepDrawer, prepSummary }: TopbarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  let page = PAGE_TITLES[pathname];
  if (!page && pathname.startsWith("/interview/customize/session/")) {
    page = {
      title: "Custom Tailored Practice Interview",
      subtitle: "AI-powered personalized interview session aligned to your resume and target JD",
    };
  }
  if (!page && pathname.startsWith("/interview/resume-grill/")) {
    page = {
      title: "Resume & Project Grill Workspace",
      subtitle: "Deep-dive codebase defense, architectural trade-offs, and failure scenarios",
    };
  }
  if (!page && pathname.startsWith("/interview/question-bank/")) {
    page = {
      title: "Role Interview Workspace",
      subtitle: "AI-powered technical, behavioral, and architectural practice interview",
    };
  }
  if (!page && pathname.startsWith("/interview/dsa/")) {
    page = {
      title: "OA & DSA Problem Workspace",
      subtitle: "Live code execution, Big-O verification, and Bar-Raiser AI review",
    };
  }
  if (!page) {
    page = { title: "Dashboard", subtitle: "" };
  }

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
      <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-[#1D1D1D] bg-[#050505] sticky top-0 z-40">
        {/* Page title */}
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-[#F5F5F5] leading-tight truncate">
            {page.title}
          </h1>
          <p className="text-xs text-[#71717A] truncate">{page.subtitle}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Interactive Mode & System Status Pill */}
          <button
            type="button"
            onClick={handleOpenStatusModal}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer group",
              mode === "demo"
                ? "bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/15 hover:border-amber-500/35"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/15 hover:border-emerald-500/35"
            )}
            title="Click to view System & API Connection Status"
          >
            {mode === "demo" ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Demo Mode</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Live Mode</span>
              </>
            )}
            <span className="text-[10px] text-[#71717A] group-hover:text-[#A1A1AA] ml-0.5 hidden sm:inline">
              • Status
            </span>
          </button>

          {/* Quick Search Button */}
          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            className="hidden md:flex items-center gap-2 pl-3 pr-2.5 py-1.5 text-xs bg-[#0D0D0D] hover:bg-[#121212] border border-[#1D1D1D] hover:border-[#292929] rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-[#A1A1AA]" />
            <span className="text-[11px] text-[#71717A]">Search co-pilot...</span>
            <kbd className="text-[10px] bg-[#121212] border border-[#292929] px-1.5 py-0.5 rounded text-[#A1A1AA] font-mono">⌘K</kbd>
          </button>

          {/* Compact Mobile / Portrait-Tablet Preparation Drawer Trigger */}
          {onOpenPrepDrawer && (
            <button
              type="button"
              onClick={onOpenPrepDrawer}
              aria-label="Open preparation calendar and progress"
              className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0D0D0D] border border-[#1D1D1D] hover:border-[#292929] hover:bg-[#121212] text-xs font-medium text-[#F5F5F5] transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-[#A78BFA]" />
              <span className="hidden sm:inline">Prep</span>
              {prepSummary && (
                <span className="font-mono text-[11px] font-semibold text-[#F5F5F5] tabular-nums">
                  {prepSummary.pct}%
                </span>
              )}
              {prepSummary && prepSummary.todayCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              )}
            </button>
          )}

          {/* Notifications Trigger & Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) setUnreadCount(0);
              }}
              aria-label="Notifications"
              className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-[#0D0D0D] border border-[#1D1D1D] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#121212] transition-colors focus:outline-none cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#F5F5F5] rounded-full" />
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#0D0D0D] border border-[#292929] p-4 z-50 animate-fadeIn space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#1D1D1D]">
                  <h4 className="text-xs font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-[#A1A1AA]" />
                    Notifications &amp; Reminders
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-[#71717A] hover:text-[#F5F5F5] text-xs cursor-pointer"
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
                        className="p-2.5 rounded-lg bg-[#0A0A0A] border border-[#1D1D1D] hover:border-[#292929] hover:bg-[#121212] cursor-pointer transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#F5F5F5]">
                          <span>{app.company}</span>
                          <span className="text-[10px] text-amber-300 font-normal">
                            {app.nextStepDate || "Interview"}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#71717A]">
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
                        className="p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20 hover:bg-amber-500/12 cursor-pointer transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-amber-300">
                          <span>Goal Reminder</span>
                          <span className="text-[10px] text-rose-400">High Priority</span>
                        </div>
                        <p className="text-[10px] text-[#A1A1AA] leading-snug">{m.title}</p>
                      </div>
                    ))}

                  {/* Resume scan reminder */}
                  {latestResume && (
                    <div
                      onClick={() => {
                        setShowNotifications(false);
                        router.push("/resume");
                      }}
                      className="p-2.5 rounded-lg bg-emerald-500/8 border border-emerald-500/20 hover:bg-emerald-500/12 cursor-pointer transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-300">
                        <span>Resume Diagnostic</span>
                        <span className="text-[10px] text-emerald-400">{latestResume.matchScore}% Match</span>
                      </div>
                      <p className="text-[10px] text-[#71717A]">
                        ATS Score: {latestResume.atsScore}%. Ready for application tailoring.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#1D1D1D] text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setUnreadCount(0);
                      setShowNotifications(false);
                    }}
                    className="text-[11px] text-[#71717A] hover:text-[#F5F5F5] cursor-pointer transition-colors"
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-rose-400 hover:bg-[#121212] rounded-lg border border-[#1D1D1D] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#000000] bg-[#F5F5F5] hover:bg-[#E4E4E7] rounded-lg border border-[#F5F5F5] transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}

          {/* User Avatar */}
          <div
            title={profile?.fullName || "User Profile"}
            className="w-8 h-8 rounded-lg bg-[#121212] border border-[#292929] flex items-center justify-center cursor-pointer"
          >
            <span className="text-xs font-bold text-[#F5F5F5]">{initials}</span>
          </div>
        </div>
      </header>

      {/* Interactive System Status & API Key Configuration Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#0D0D0D] border border-[#292929] rounded-2xl overflow-hidden space-y-5 p-6 relative text-left">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#1D1D1D]">
              <div>
                <h3 className="text-base font-bold text-[#F5F5F5] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#A1A1AA]" />
                  System & API Connection Status
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-1">
                  Real-time connection status for database and AI services.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchSystemStatus}
                  className="p-1.5 rounded-lg border border-[#292929] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#121212] transition-colors text-xs flex items-center gap-1 cursor-pointer"
                  title="Refresh status"
                >
                  <RefreshCw
                    className={clsx(
                      "w-3.5 h-3.5",
                      loadingStatus ? "animate-spin text-[#F5F5F5]" : ""
                    )}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="p-1 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#121212] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Service Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {/* 1. Database & Persistence */}
              <div className="p-3.5 rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[#A1A1AA]" />
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
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  {statusData?.database.details || "Local in-memory store active with sample applications and jobs."}
                </p>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#F5F5F5] hover:text-[#A1A1AA] underline font-semibold"
                >
                  Get free Supabase keys <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* 2. Primary AI Engine */}
              <div className="p-3.5 rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#A78BFA]" />
                    Gemini 2.0 Flash
                  </span>
                  {statusData?.aiEngine.geminiActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      ⚡ Offline Mode
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  {statusData?.aiEngine.geminiActive
                    ? "Live AI model reasoning for job matching and bullet rewriting."
                    : "Built-in resume and keyword analysis active."}
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#F5F5F5] hover:text-[#A1A1AA] underline font-semibold"
                >
                  Get free Gemini API key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* 3. Live Job Search Feed */}
              <div className="p-3.5 rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#F5F5F5] flex items-center gap-1.5">
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
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#121212] text-[#F5F5F5] border border-[#292929]">
                      ⚡ Demo Catalog
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  {statusData?.jobFeed.details ||
                    "OpenWeb Ninja (India/Global JSearch) + Himalayas Remote APIs active."}
                </p>
                <div className="flex items-center gap-4 text-[10px] text-[#A1A1AA] font-semibold">
                  <span>Primary: OpenWeb Ninja (JSearch)</span>
                  <span>•</span>
                  <span>Remote: Himalayas App</span>
                </div>
              </div>

              {/* 4. Local Python Resume Parser */}
              <div className="p-3.5 rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    Python PDF/DOCX Parser
                  </span>
                  {statusData?.pythonParser.online ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> PyMuPDF Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#121212] text-[#A1A1AA] border border-[#292929]">
                      ⚡ Internal Buffer Parser
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  {statusData?.pythonParser.details || "Local microservice running on port 8000."}
                </p>
                <div className="flex items-center justify-between text-[10px] bg-[#080808] border border-[#1D1D1D] p-1.5 rounded-lg font-mono text-[#F5F5F5]">
                  <span className="truncate">uvicorn main:app --reload --port 8000</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyCmd(
                        "cd python-parser && uvicorn main:app --reload --port 8000",
                        "py-cmd"
                      )
                    }
                    className="ml-2 text-[#F5F5F5] hover:text-[#A1A1AA] shrink-0 cursor-pointer"
                    title="Copy start command"
                  >
                    {copiedKey === "py-cmd" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-[#1D1D1D] flex items-center justify-between">
              <span className="text-[11px] text-[#71717A]">
                Configure keys anytime in <code className="text-[#F5F5F5]">.env.local</code>
              </span>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-1.5 bg-[#F5F5F5] hover:bg-[#E4E4E7] text-[#000000] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── GLOBAL SEARCH MODAL (Ctrl+K / Cmd+K) ──────────────────────────────── */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 animate-fadeIn">
          <div className="w-full max-w-lg rounded-xl bg-[#0D0D0D] border border-[#292929] overflow-hidden">
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1D1D1D] bg-[#0A0A0A]">
              <Search className="w-4 h-4 text-[#A1A1AA] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs, tracked applications, readiness goals, or pages..."
                className="w-full bg-transparent text-sm text-[#F5F5F5] placeholder-[#52525B] focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                className="text-[10px] bg-[#121212] hover:bg-[#1A1A1A] border border-[#292929] px-1.5 py-0.5 rounded text-[#A1A1AA] hover:text-[#F5F5F5] font-mono cursor-pointer transition-colors"
              >
                ESC
              </button>
            </div>

            {/* Results container */}
            <div className="max-h-80 overflow-y-auto p-3 space-y-3 text-xs">
              {/* Navigation Shortcuts */}
              <div>
                <p className="text-[10px] font-semibold text-[#71717A] uppercase tracking-wider px-2 mb-1">
                  Navigation
                </p>
                <div className="space-y-1">
                  {[
                    { label: "Overview & Dashboard", href: "/dashboard", desc: "KPIs and schedule" },
                    { label: "Resume Studio", href: "/resume", desc: "ATS scanner & diagnostic" },
                    { label: "Job Discovery", href: "/jobs", desc: "Find matched jobs" },
                    { label: "Application Tracker", href: "/tracker", desc: "Kanban pipeline" },
                    { label: "AI Practice Interview Coach", href: "/interview", desc: "Whisper audio & video studio" },
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
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#121212] text-left text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors group cursor-pointer"
                      >
                        <span className="font-medium text-[#F5F5F5]">{item.label}</span>
                        <span className="text-[11px] text-[#71717A] group-hover:text-[#F5F5F5] flex items-center gap-1">
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
                  <p className="text-[10px] font-semibold text-[#71717A] uppercase tracking-wider px-2 mb-1">
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
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#121212] text-left transition-colors cursor-pointer"
                        >
                          <div>
                            <p className="text-[#F5F5F5] font-medium">{app.company}</p>
                            <p className="text-[10px] text-[#71717A]">{app.title}</p>
                          </div>
                          <span className="text-[10px] text-[#F5F5F5] bg-[#121212] border border-[#292929] px-2 py-0.5 rounded-full">
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
                  <p className="text-[10px] font-semibold text-[#71717A] uppercase tracking-wider px-2 mb-1">
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
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#121212] text-left transition-colors cursor-pointer"
                        >
                          <span className="text-[#F5F5F5] truncate max-w-xs">{m.title}</span>
                          <span className="text-[10px] text-[#71717A]">{m.completed ? "✓ Done" : "Pending"}</span>
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
