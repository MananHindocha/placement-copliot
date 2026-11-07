"use client";

import { useEffect, useState, useCallback } from "react";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { getDashboardOverview, type DashboardOverview } from "@/lib/services/dashboard.service";
import { getUserProfile, DEMO_USER_PROFILE, type UserProfile } from "@/lib/services/auth.service";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import {
  ArrowRight,
  Activity as ActivityIcon,
  Send,
  FileText,
  MessageSquare,
  Briefcase,
  Target,
  Sparkles,
  CalendarCheck,
  Clock,
  Bot,
  Zap,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { useAgent } from "@/context/AgentProvider";

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  application: Send,
  resume: FileText,
  interview: MessageSquare,
  job: Briefcase,
  readiness: Target,
};

const ACTIVITY_COLORS: Record<string, string> = {
  application: "bg-[rgba(27,31,184,0.20)] text-[#777CFF]",
  resume: "bg-violet-500/15 text-violet-400",
  interview: "bg-emerald-500/15 text-emerald-400",
  job: "bg-amber-500/15 text-amber-400",
  readiness: "bg-sky-500/15 text-sky-400",
};

export default function DashboardPage() {
  const isDemo = getEffectiveDataMode() === "demo";
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(isDemo ? DEMO_USER_PROFILE : null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    Promise.all([getDashboardOverview(), getUserProfile()])
      .then(([overview, userProf]) => {
        setData(overview);
        setProfile(userProf);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load dashboard overview.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();

    // Listen for cross-module updates
    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener("copilot-data-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("copilot-data-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [loadData]);

  // Overall readiness composite from the 4th stat card or domain average
  const readinessStat = data?.stats.find((s) => s.label === "Placement Readiness");
  const overallReadiness = readinessStat
    ? parseInt(String(readinessStat.value).replace(/[^0-9]/g, ""), 10) || 74
    : 74;

  const firstName = profile?.fullName
    ? profile.fullName.split(" ")[0]
    : isDemo
    ? "Arjun"
    : "Student";

  const scheduledInterviewsCount = data?.upcomingInterviews.length || 0;
  const { runs, activeRun, pendingApprovalsCount, bluffRiskCount, isExecuting, openDrawer, triggerAgent } = useAgent();

  const latestRunSummary = activeRun?.final_summary || runs[0]?.goal || "Continuous digital-twin alignment active.";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Error Banner */}
      {error && (
        <ErrorBanner
          title="Unable to sync live dashboard data"
          message={error}
          onRetry={loadData}
        />
      )}

      {/* Autonomous Placement Command Center */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-[#0c0d18] via-[#121633] to-[#0a0c16] p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                <Bot className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                Autonomous Placement Command Center
              </h3>
              <span
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border",
                  isExecuting
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                    : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                )}
              >
                <span
                  className={clsx(
                    "h-1.5 w-1.5 rounded-full",
                    isExecuting ? "bg-amber-400 animate-ping" : "bg-emerald-400"
                  )}
                />
                {isExecuting ? "Agent Executing..." : "Agent Brain Standby"}
              </span>

              {bluffRiskCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                  <ShieldAlert className="h-3 w-3" />
                  {bluffRiskCount} Bluff Risks Detected
                </span>
              )}

              {pendingApprovalsCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300 animate-pulse">
                  <Clock className="h-3 w-3" />
                  {pendingApprovalsCount} Action Requires Approval
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300/90 max-w-2xl">
              <span className="text-indigo-400 font-semibold">Latest Reasoning: </span>
              {latestRunSummary}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() =>
                triggerAgent({
                  triggerType: "USER_GOAL_SUBMITTED",
                  entityId: "dashboard-quick-diag",
                  goalPrompt: "Run rapid multi-module placement readiness diagnosis and align sprint tasks.",
                  autoOpenDrawer: true,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 text-indigo-400" />
              <span>⚡ Rapid Diagnostic</span>
            </button>

            <button
              type="button"
              onClick={openDrawer}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-cyan-400 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Inspect Agent Brain</span>
            </button>
          </div>
        </div>
      </div>

      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[rgba(27,31,184,0.25)] via-[rgba(27,31,184,0.10)] to-transparent border border-[rgba(100,110,255,0.22)] p-6 shadow-xl">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#777CFF]" />
            <span className="text-xs text-[#777CFF] font-medium uppercase tracking-wider">
              AI Insights &amp; Cross-Module Sync Active
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#F5F6FF] mb-1">
            Good afternoon, {firstName} 👋
          </h2>
          <p className="text-[#A2A7C0] text-sm max-w-xl">
            You have{" "}
            <span className="text-[#F5F6FF] font-semibold">
              {scheduledInterviewsCount} interview{scheduledInterviewsCount !== 1 ? "s" : ""}
            </span>{" "}
            scheduled and your overall placement readiness is currently{" "}
            <span className="text-emerald-400 font-semibold">{overallReadiness}%</span>.
          </p>
        </div>
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-[#1B1FB8]/15 blur-2xl pointer-events-none" />
        <div className="absolute -right-4 -bottom-8 w-32 h-32 rounded-full bg-[#454BFF]/10 blur-xl pointer-events-none" />
      </div>

      {loading && !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-[#0B0D18] border border-[rgba(100,110,255,0.12)] space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-3 w-20 skeleton" />
                  <div className="h-8 w-8 rounded-xl skeleton" />
                </div>
                <div className="h-7 w-28 skeleton" />
                <div className="h-3 w-16 skeleton" />
              </div>
            ))}
          </div>
        </div>
      ) : data ? (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {data.stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Activity feed */}
            <div className="lg:col-span-2">
              <Card padding="none">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(100,110,255,0.12)]">
                  <div className="flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4 text-[#777CFF]" />
                    <h3 className="text-sm font-semibold text-[#F5F6FF]">Recent Activity</h3>
                  </div>
                  <Link
                    href="/tracker"
                    className="text-xs text-[#777CFF] hover:text-[#A5A9FF] flex items-center gap-1 transition-colors"
                  >
                    View tracker <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="divide-y divide-[rgba(255,255,255,0.06)] max-h-[380px] overflow-y-auto">
                  {data.activities.length === 0 ? (
                    <p className="px-5 py-6 text-xs text-[#737A99] text-center">
                      No recent activity recorded yet.
                    </p>
                  ) : (
                    data.activities.slice(0, 8).map((activity) => {
                      const Icon = ACTIVITY_ICONS[activity.type] ?? ActivityIcon;
                      const color = ACTIVITY_COLORS[activity.type] ?? ACTIVITY_COLORS.application;
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 px-5 py-3 hover:bg-[#151A35]/40 transition-colors"
                        >
                          <div
                            className={clsx(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                              color
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#F5F6FF] leading-snug">{activity.message}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3 text-[#737A99]" />
                              <span className="text-xs text-[#737A99]">{activity.timestamp}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            {/* Readiness meter + quick actions */}
            <div className="space-y-4">
              {/* Readiness Card */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-[#777CFF]" />
                  <h3 className="text-sm font-semibold text-[#F5F6FF]">Placement Readiness</h3>
                </div>
                {/* Ring */}
                <div className="flex items-center justify-center mb-5">
                  <div className="relative flex items-center justify-center w-24 h-24">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(100,110,255,0.12)" strokeWidth="8" />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke="#1B1FB8"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - overallReadiness / 100)}`}
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-2xl font-bold text-[#F5F6FF]">{overallReadiness}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {data.readinessDomains.map((domain) => (
                    <div key={domain.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#A2A7C0]">{domain.label}</span>
                        <span className="text-xs font-semibold text-[#F5F6FF]">
                          {domain.score}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#080A14] border border-[rgba(100,110,255,0.10)] overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{
                            width: `${domain.score}%`,
                            backgroundColor: domain.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/readiness">
                  <div className="mt-4 flex items-center justify-center gap-1 text-xs text-[#777CFF] hover:text-[#A5A9FF] transition-colors">
                    View full plan <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              </Card>

              {/* Quick Actions */}
              <Card>
                <h3 className="text-sm font-semibold text-[#F5F6FF] mb-3">Quick Navigation</h3>
                <div className="space-y-1.5">
                  {[
                    { label: "Tailor resume for target role", href: "/resume", icon: FileText, color: "text-violet-400" },
                    { label: "Browse matched tech jobs", href: "/jobs", icon: Briefcase, color: "text-amber-400" },
                    { label: "Practice AI mock interview", href: "/interview", icon: MessageSquare, color: "text-emerald-400" },
                    { label: "Manage Kanban pipeline", href: "/tracker", icon: CalendarCheck, color: "text-[#777CFF]" },
                  ].map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#151A35]/50 border border-transparent hover:border-[rgba(100,110,255,0.14)] transition-all group"
                      >
                        <Icon className={clsx("w-4 h-4 shrink-0", action.color)} />
                        <span className="text-xs text-[#A2A7C0] group-hover:text-[#F5F6FF] transition-colors">
                          {action.label}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 ml-auto text-[#737A99] group-hover:text-[#A2A7C0] transition-colors" />
                      </Link>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>

          {/* Dynamic Upcoming Schedule Widget */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-[#F5F6FF]">Upcoming Interviews &amp; Action Dates</h3>
              </div>
              <Link href="/tracker" className="text-xs text-[#777CFF] hover:text-[#A5A9FF] transition-colors">
                Manage in Tracker →
              </Link>
            </div>

            {data.upcomingInterviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.upcomingInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-[#080A14] border border-[rgba(100,110,255,0.14)] hover:border-[rgba(100,110,255,0.28)] hover:bg-[#151A35]/40 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[rgba(27,31,184,0.20)] border border-[rgba(100,110,255,0.25)] flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[#A5A9FF]">{interview.logo}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#F5F6FF] truncate">{interview.company}</p>
                      <p className="text-xs text-[#A2A7C0] truncate">{interview.role}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="indigo" size="sm">
                          {interview.type}
                        </Badge>
                        <span className="text-xs text-[#737A99] truncate">{interview.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-[#737A99] text-xs border border-dashed border-[rgba(100,110,255,0.16)] rounded-xl bg-[#080A14]/40">
                No interviews scheduled yet. Move applications to &quot;Phone Screen&quot; or &quot;Interview&quot; in the Tracker to populate this schedule.
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
