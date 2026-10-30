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
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  application: Send,
  resume: FileText,
  interview: MessageSquare,
  job: Briefcase,
  readiness: Target,
};

const ACTIVITY_COLORS: Record<string, string> = {
  application: "bg-indigo-500/15 text-indigo-400",
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

      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600/20 via-violet-600/10 to-transparent border border-indigo-500/20 p-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">
              AI Insights &amp; Cross-Module Sync Active
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">
            Good afternoon, {firstName} 👋
          </h2>
          <p className="text-slate-400 text-sm max-w-xl">
            You have{" "}
            <span className="text-white font-semibold">
              {scheduledInterviewsCount} interview{scheduledInterviewsCount !== 1 ? "s" : ""}
            </span>{" "}
            scheduled and your overall placement readiness is currently{" "}
            <span className="text-emerald-400 font-semibold">{overallReadiness}%</span>.
          </p>
        </div>
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none" />
        <div className="absolute -right-4 -bottom-8 w-32 h-32 rounded-full bg-violet-500/5 blur-xl pointer-events-none" />
      </div>

      {loading && !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-[#0B1120] border border-white/5 space-y-3">
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
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
                  </div>
                  <Link
                    href="/tracker"
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    View tracker <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="divide-y divide-white/4 max-h-[380px] overflow-y-auto">
                  {data.activities.length === 0 ? (
                    <p className="px-5 py-6 text-xs text-slate-500 text-center">
                      No recent activity recorded yet.
                    </p>
                  ) : (
                    data.activities.slice(0, 8).map((activity) => {
                      const Icon = ACTIVITY_ICONS[activity.type] ?? ActivityIcon;
                      const color = ACTIVITY_COLORS[activity.type] ?? ACTIVITY_COLORS.application;
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 px-5 py-3 hover:bg-white/2 transition-colors"
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
                            <p className="text-sm text-slate-200 leading-snug">{activity.message}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span className="text-xs text-slate-500">{activity.timestamp}</span>
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
                  <Target className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Placement Readiness</h3>
                </div>
                {/* Ring */}
                <div className="flex items-center justify-center mb-5">
                  <div className="relative flex items-center justify-center w-24 h-24">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - overallReadiness / 100)}`}
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-2xl font-bold text-white">{overallReadiness}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {data.readinessDomains.map((domain) => (
                    <div key={domain.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">{domain.label}</span>
                        <span className="text-xs font-semibold text-slate-300">
                          {domain.score}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/8">
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
                  <div className="mt-4 flex items-center justify-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    View full plan <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              </Card>

              {/* Quick Actions */}
              <Card>
                <h3 className="text-sm font-semibold text-white mb-3">Quick Navigation</h3>
                <div className="space-y-1.5">
                  {[
                    { label: "Tailor resume for target role", href: "/resume", icon: FileText, color: "text-violet-400" },
                    { label: "Browse matched tech jobs", href: "/jobs", icon: Briefcase, color: "text-amber-400" },
                    { label: "Practice AI mock interview", href: "/interview", icon: MessageSquare, color: "text-emerald-400" },
                    { label: "Manage Kanban pipeline", href: "/tracker", icon: CalendarCheck, color: "text-indigo-400" },
                  ].map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors group"
                      >
                        <Icon className={clsx("w-4 h-4 shrink-0", action.color)} />
                        <span className="text-xs text-slate-300 group-hover:text-white transition-colors">
                          {action.label}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-600 group-hover:text-slate-400 transition-colors" />
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
                <h3 className="text-sm font-semibold text-white">Upcoming Interviews &amp; Action Dates</h3>
              </div>
              <Link href="/tracker" className="text-xs text-indigo-400 hover:underline">
                Manage in Tracker →
              </Link>
            </div>

            {data.upcomingInterviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.upcomingInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/3 border border-white/5 hover:border-indigo-500/30 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-indigo-300">{interview.logo}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{interview.company}</p>
                      <p className="text-xs text-slate-400 truncate">{interview.role}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="indigo" size="sm">
                          {interview.type}
                        </Badge>
                        <span className="text-xs text-slate-500 truncate">{interview.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-white/10 rounded-xl">
                No interviews scheduled yet. Move applications to &quot;Phone Screen&quot; or &quot;Interview&quot; in the Tracker to populate this schedule.
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
