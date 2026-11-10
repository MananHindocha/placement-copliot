"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import {
  FileText,
  Briefcase,
  Target,
  CalendarCheck,
  MessageSquare,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Zap,
  Check,
  ChevronDown,
  Layers,
  Award,
  Flame,
  Activity as ActivityIcon,
  Clock,
  Send,
  Code2,
  TrendingUp,
} from "lucide-react";
import { clsx } from "clsx";
import {
  getStoredRealResume,
  setStoredRealResume,
  getStoredApplications,
  getStoredActivities,
  type RealParsedResume,
} from "@/lib/storage-sync";
import type { KanbanCard, Activity } from "@/types";
import RealResumeUploader from "@/components/resume/RealResumeUploader";

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

const DOMAIN_READINESS_ITEMS = [
  { label: "Data Structures & Algorithms", score: 78, color: "#777CFF" },
  { label: "System Design & Architecture", score: 65, color: "#F59E0B" },
  { label: "Behavioral & HR Evaluation", score: 84, color: "#10B981" },
  { label: "Full-Stack Project Portfolio", score: 88, color: "#8B5CF6" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [realResume, setRealResume] = useState<RealParsedResume | null>(null);
  const [applications, setApplications] = useState<KanbanCard[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [bulletApplied, setBulletApplied] = useState(false);
  const [showAppliedSuccess, setShowAppliedSuccess] = useState(false);

  // Sync real resume, applications, and activities from storage
  const syncState = useCallback(() => {
    const stored = getStoredRealResume();
    setRealResume(stored);
    if (stored?.bulletImprovements?.[0]?.applied) {
      setBulletApplied(true);
    }
    setApplications(getStoredApplications());
    setActivities(getStoredActivities());
  }, []);

  useEffect(() => {
    syncState();

    const handleUpdate = () => syncState();
    window.addEventListener("copilot-data-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("copilot-data-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [syncState]);

  const hasResume = realResume !== null && Array.isArray(realResume.skills) && realResume.skills.length > 0;

  // Apply bullet improvement
  const handleApplyBullet = () => {
    if (!realResume || !realResume.bulletImprovements?.[0]) return;
    const updated = {
      ...realResume,
      atsScore: Math.min((realResume.atsScore || 78) + (realResume.bulletImprovements[0].atsBoost || 6), 98),
      bulletImprovements: realResume.bulletImprovements.map((b, idx) =>
        idx === 0 ? { ...b, applied: true } : b
      ),
    };
    setStoredRealResume(updated);
    setRealResume(updated);
    setBulletApplied(true);
    setShowAppliedSuccess(true);
    setTimeout(() => setShowAppliedSuccess(false), 4000);
  };

  // Derived metrics from real state
  const totalApps = applications.length;
  const scheduledInterviews = applications.filter((c) =>
    ["Technical Round", "HR Round", "Phone Screen", "Interview"].includes(c.status)
  );
  const avgMatchScore =
    applications.length > 0
      ? Math.round(applications.reduce((acc, c) => acc + (c.matchScore || 0), 0) / applications.length)
      : realResume?.atsScore || 0;
  const placementReadiness = realResume
    ? Math.min(100, Math.max(10, Math.round(((realResume.atsScore || 60) * 0.6) + (totalApps > 0 ? 30 : 15))))
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── STATE A: ZERO STATE (BEFORE RESUME UPLOAD) ────────────────── */}
      {!hasResume ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <RealResumeUploader
            headline="Upload Your Real Resume (PDF, DOCX, or TXT)"
            description="Drag & drop your resume file or click below. The AI Robot will extract your real skills, detect genuine projects, and calculate an authentic ATS score."
          />
        </div>
      ) : (
        /* ─── STATE B: REAL RESUME ACTIVE (AFTER REAL UPLOAD) ──────────── */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* 1. Top Profile & File Info Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-[#0c102a] via-[#0d1434] to-[#070914] p-6 shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {realResume.candidateName || "Candidate Profile"}
                  </h2>
                </div>
                <p className="text-xs text-slate-300">
                  From <span className="font-semibold text-cyan-300">{realResume.fileName}</span> · Best fit for:{" "}
                  <span className="text-indigo-300 font-semibold">{realResume.inferredTargetRoles?.join(" • ") || "Software Engineer"}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/jobs")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-bold text-black shadow-lg hover:from-amber-400 hover:to-orange-400 transition-all cursor-pointer"
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Fetch Matching Jobs →</span>
                </button>
              </div>
            </div>

            {/* Profile Metrics Chips */}
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-indigo-500/20 bg-black/40 p-4">
                <span className="text-xs text-slate-400 font-medium">Resume Score</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-400">{realResume.atsScore}%</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted, #94a3b8)", marginTop: "2px" }}>
                  Overall formatting &amp; completeness
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-500/20 bg-black/40 p-4">
                <span className="text-xs text-slate-400 font-medium">Skills Found</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{realResume.skills.length}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-500/20 bg-black/40 p-4">
                <span className="text-xs text-slate-400 font-medium">Projects</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-cyan-300">{realResume.projectsCount || realResume.projects?.length || 0}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-500/20 bg-black/40 p-4">
                <span className="text-xs text-slate-400 font-medium">Gaps to Fill</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-400">{realResume.missingRecommendedSkills?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Original StatCards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Applications"
              value={totalApps}
              delta={totalApps > 0 ? `${totalApps} tracked` : "No applications tracked"}
              deltaPositive={totalApps > 0}
              icon="Send"
              color="indigo"
            />
            <StatCard
              label="Scheduled Interviews"
              value={scheduledInterviews.length}
              delta={scheduledInterviews.length > 0 ? "Upcoming rounds" : "None scheduled"}
              deltaPositive={scheduledInterviews.length > 0}
              icon="CalendarCheck"
              color="emerald"
            />
            <StatCard
              label="Average Match Score"
              value={`${avgMatchScore}%`}
              delta={avgMatchScore >= 80 ? "High role fit" : "Moderate fit"}
              deltaPositive={avgMatchScore >= 80}
              icon="TrendingUp"
              color="amber"
            />
            <StatCard
              label="Placement Readiness"
              value={`${placementReadiness}%`}
              delta={placementReadiness >= 75 ? "Interview ready" : "Prep ongoing"}
              deltaPositive={placementReadiness >= 75}
              icon="Target"
              color="violet"
            />
          </div>

          {/* 3. Real Extracted Skills Matrix */}
          <div className="rounded-3xl border border-white/10 bg-[#0a0d1c] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Real Extracted Skills From {realResume.fileName}
                </h3>
                <p className="text-xs text-slate-400">
                  Categorized by verified strength from your projects and coursework.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/readiness")}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Readiness Plan</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {realResume.skills.map((skill, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold border",
                    skill.strength === "Verified Strong"
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                      : skill.strength === "Good Foundation"
                      ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                      : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                  )}
                  title={skill.reason}
                >
                  <span>{skill.name}</span>
                  <span className="text-[10px] opacity-70">• {skill.strength}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Real Before / After Suggestion Card */}
          {realResume.bulletImprovements?.[0] && (
            <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-[#121736] via-[#0d122b] to-[#070914] p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  <h4 className="text-sm font-bold text-white">
                    Suggested High-Impact Bullet Rewrite (Extracted from {realResume.bulletImprovements[0].projectName})
                  </h4>
                </div>

                {bulletApplied ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-300">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    Applied to Profile
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-300">
                    +{realResume.bulletImprovements[0].atsBoost || 6}% ATS Score Boost
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-rose-500/25 bg-rose-950/15 p-4 space-y-1.5">
                  <span className="font-bold text-rose-300">❌ Original Bullet from your PDF:</span>
                  <p className="text-slate-300 leading-relaxed italic">
                    &quot;{realResume.bulletImprovements[0].originalBullet}&quot;
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1.5">
                  <span className="font-bold text-emerald-300">✅ High-Impact STAR Format Rewrite:</span>
                  <p className="text-slate-100 font-medium leading-relaxed">
                    &quot;{realResume.bulletImprovements[0].improvedBullet}&quot;
                  </p>
                </div>
              </div>

              {!bulletApplied && (
                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleApplyBullet}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>✓ Apply Rewrite &amp; Boost ATS Score</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 5. Real Detected Projects */}
          {realResume.projects && realResume.projects.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-[#090d1c] p-6 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Projects Detected in Your Resume ({realResume.projects.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {realResume.projects.map((proj, idx) => (
                  <div key={idx} className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-white truncate">{proj.name}</h4>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{proj.summary}</p>

                    {proj.techStack && proj.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {proj.techStack.map((tech, tidx) => (
                          <span
                            key={tidx}
                            className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-cyan-300"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Activity Feed & Domain Readiness Gauges Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Activity Feed */}
            <div className="lg:col-span-2">
              <Card padding="none">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(100,110,255,0.12)]">
                  <div className="flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4 text-[#777CFF]" />
                    <h3 className="text-sm font-semibold text-[#F5F6FF]">Recent Activity Feed</h3>
                  </div>
                  <Link
                    href="/tracker"
                    className="text-xs text-[#777CFF] hover:text-[#A5A9FF] flex items-center gap-1 transition-colors"
                  >
                    View tracker <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="divide-y divide-[rgba(255,255,255,0.06)] max-h-[360px] overflow-y-auto">
                  {activities.length === 0 ? (
                    <p className="px-5 py-6 text-xs text-[#737A99] text-center">
                      No recent activity recorded yet.
                    </p>
                  ) : (
                    activities.slice(0, 8).map((activity) => {
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

            {/* Domain Readiness Breakdown */}
            <div className="space-y-4">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#777CFF]" />
                    <h3 className="text-sm font-semibold text-[#F5F6FF]">Domain Readiness</h3>
                  </div>
                  <Link href="/readiness" className="text-xs text-[#777CFF] hover:text-[#A5A9FF] transition-colors">
                    Plan →
                  </Link>
                </div>

                <div className="space-y-3.5">
                  {DOMAIN_READINESS_ITEMS.map((domain) => (
                    <div key={domain.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#A2A7C0]">{domain.label}</span>
                        <span className="text-xs font-semibold text-[#F5F6FF]">
                          {domain.score}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#080A14] border border-[rgba(100,110,255,0.10)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
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
                  <div className="mt-5 flex items-center justify-center gap-1 text-xs text-[#777CFF] hover:text-[#A5A9FF] transition-colors">
                    View roadmap &amp; sprint milestones <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              </Card>
            </div>
          </div>

          {/* 7. Upcoming Interviews Widget */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-[#F5F6FF]">Upcoming Interviews &amp; Action Deadlines</h3>
              </div>
              <Link href="/tracker" className="text-xs text-[#777CFF] hover:text-[#A5A9FF] transition-colors">
                Manage in Tracker →
              </Link>
            </div>

            {scheduledInterviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scheduledInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-[#080A14] border border-[rgba(100,110,255,0.14)] hover:border-[rgba(100,110,255,0.28)] hover:bg-[#151A35]/40 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[rgba(27,31,184,0.20)] border border-[rgba(100,110,255,0.25)] flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[#A5A9FF]">{interview.logo || interview.company.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#F5F6FF] truncate">{interview.company}</p>
                      <p className="text-xs text-[#A2A7C0] truncate">{interview.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="indigo" size="sm">
                          {interview.status}
                        </Badge>
                        <span className="text-xs text-[#737A99] truncate">
                          {interview.nextStepDate || interview.nextStep || "Upcoming"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-[#737A99] text-xs border border-dashed border-[rgba(100,110,255,0.16)] rounded-xl bg-[#080A14]/40">
                No interviews scheduled yet. Move applications to &quot;Technical Round&quot; or &quot;HR Round&quot; in the Tracker to populate this schedule.
              </div>
            )}
          </Card>

          {/* 8. Quick Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => router.push("/jobs")}
              className="group cursor-pointer rounded-2xl border border-amber-500/20 bg-gradient-to-b from-[#141209] to-[#070914] p-5 shadow-lg hover:border-amber-400/50 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                <Briefcase className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-amber-300">
                1. Pick Target Role &amp; Find Jobs
              </h4>
              <p className="mt-1 text-xs text-slate-400">
                Match your {realResume.skills.length} skills against current tech job openings.
              </p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-amber-400">
                Explore Jobs →
              </span>
            </div>

            <div
              onClick={() => router.push("/readiness")}
              className="group cursor-pointer rounded-2xl border border-sky-500/20 bg-gradient-to-b from-[#09131d] to-[#070914] p-5 shadow-lg hover:border-sky-400/50 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 mb-3 group-hover:scale-110 transition-transform">
                <Target className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-sky-300">
                2. Readiness Study Plan
              </h4>
              <p className="mt-1 text-xs text-slate-400">
                Covers your {realResume.missingRecommendedSkills.length} recommended topics.
              </p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-sky-400">
                View Plan →
              </span>
            </div>

            <div
              onClick={() => router.push("/tracker")}
              className="group cursor-pointer rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#091712] to-[#070914] p-5 shadow-lg hover:border-emerald-400/50 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-emerald-300">
                3. Application Tracker
              </h4>
              <p className="mt-1 text-xs text-slate-400">
                Manage your active pipeline and deadline reminders.
              </p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-400">
                Open Kanban →
              </span>
            </div>

            <div
              onClick={() => router.push("/interview")}
              className="group cursor-pointer rounded-2xl border border-purple-500/20 bg-gradient-to-b from-[#150a1d] to-[#070914] p-5 shadow-lg hover:border-purple-400/50 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-purple-300">
                4. Practice Interview Coach
              </h4>
              <p className="mt-1 text-xs text-slate-400">
                Practice role-specific questions and get instant feedback.
              </p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-purple-400">
                Start Practice →
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
