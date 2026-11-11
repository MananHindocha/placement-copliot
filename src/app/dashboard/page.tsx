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
  application: "bg-[#121212] text-[#A1A1AA] border border-[#292929]",
  resume: "bg-[#121212] text-[#F5F5F5] border border-[#292929]",
  interview: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  job: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  readiness: "bg-[#121212] text-[#A78BFA] border border-[#292929]",
};

const DOMAIN_READINESS_ITEMS = [
  { label: "Data Structures & Algorithms", score: 78, color: "#F5F5F5" },
  { label: "System Design & Architecture", score: 65, color: "#D4D4D8" },
  { label: "Behavioral & HR Evaluation", score: 84, color: "#10B981" },
  { label: "Full-Stack Project Portfolio", score: 88, color: "#D6C4F2" },
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
      <title>Home</title>
      <h1 className="sr-only">Home</h1>

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
          <div className="relative overflow-hidden rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-400 border border-emerald-500/25">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <h2 className="text-lg font-bold text-[#F5F5F5] tracking-tight">
                    {realResume.candidateName || "Candidate Profile"}
                  </h2>
                </div>
                <p className="text-xs text-[#A1A1AA]">
                  From <span className="font-semibold text-[#F5F5F5]">{realResume.fileName}</span> · Best fit for:{" "}
                  <span className="text-[#F5F5F5] font-semibold">{realResume.inferredTargetRoles?.join(" • ") || "Software Engineer"}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/jobs")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5F5F5] hover:bg-[#E4E4E7] px-4 py-2 text-xs font-semibold text-[#000000] transition-colors cursor-pointer"
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Fetch Matching Jobs →</span>
                </button>
              </div>
            </div>

            {/* Profile Metrics Chips */}
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] p-4">
                <span className="text-xs text-[#A1A1AA] font-medium">Resume Score</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-400 tabular-nums">{realResume.atsScore}%</span>
                </div>
                <div style={{ fontSize: "11px", color: "#71717A", marginTop: "2px" }}>
                  Overall formatting &amp; completeness
                </div>
              </div>

              <div className="rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] p-4">
                <span className="text-xs text-[#A1A1AA] font-medium">Skills Found</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#F5F5F5] tabular-nums">{realResume.skills.length}</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] p-4">
                <span className="text-xs text-[#A1A1AA] font-medium">Projects</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#F5F5F5] tabular-nums">{realResume.projectsCount || realResume.projects?.length || 0}</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] p-4">
                <span className="text-xs text-[#A1A1AA] font-medium">Gaps to Fill</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-400 tabular-nums">{realResume.missingRecommendedSkills?.length || 0}</span>
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
          <div className="rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1D1D1D] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#F5F5F5] uppercase tracking-wider">
                  Real Extracted Skills From {realResume.fileName}
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  Categorized by verified strength from your projects and coursework.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/readiness")}
                className="text-xs text-[#F5F5F5] hover:text-[#A1A1AA] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
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
                    "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium border",
                    skill.strength === "Verified Strong"
                      ? "bg-[#10B981]/10 border-[#10B981]/25 text-[#10B981]"
                      : skill.strength === "Good Foundation"
                      ? "bg-[#121212] border-[#292929] text-[#F5F5F5]"
                      : "bg-[#F59E0B]/10 border-[#F59E0B]/25 text-[#F59E0B]"
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
            <div className="rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#A78BFA]" />
                  <h4 className="text-sm font-bold text-[#F5F5F5]">
                    Suggested High-Impact Bullet Rewrite (Extracted from {realResume.bulletImprovements[0].projectName})
                  </h4>
                </div>

                {bulletApplied ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/25 px-3 py-1 text-xs font-semibold text-[#10B981]">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    Applied to Profile
                  </span>
                ) : (
                  <span className="rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/25 px-3 py-1 text-xs font-semibold text-[#F59E0B] tabular-nums">
                    +{realResume.bulletImprovements[0].atsBoost || 6}% ATS Score Boost
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-[#F43F5E]/25 bg-[#F43F5E]/5 p-4 space-y-1.5">
                  <span className="font-semibold text-[#F43F5E]">❌ Original Bullet from your PDF:</span>
                  <p className="text-[#A1A1AA] leading-relaxed italic">
                    &quot;{realResume.bulletImprovements[0].originalBullet}&quot;
                  </p>
                </div>

                <div className="rounded-xl border border-[#10B981]/25 bg-[#10B981]/5 p-4 space-y-1.5">
                  <span className="font-semibold text-[#10B981]">✅ High-Impact STAR Format Rewrite:</span>
                  <p className="text-[#F5F5F5] font-medium leading-relaxed">
                    &quot;{realResume.bulletImprovements[0].improvedBullet}&quot;
                  </p>
                </div>
              </div>

              {!bulletApplied && (
                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleApplyBullet}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#F5F5F5] hover:bg-[#E4E4E7] px-5 py-2.5 text-xs font-semibold text-[#000000] transition-colors cursor-pointer"
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
            <div className="rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#F5F5F5] uppercase tracking-wider">
                Projects Detected in Your Resume ({realResume.projects.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {realResume.projects.map((proj, idx) => (
                  <div key={idx} className="rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#121212] border border-[#292929] text-[#F5F5F5] font-bold text-xs tabular-nums">
                        #{idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-[#F5F5F5] truncate">{proj.name}</h4>
                    </div>

                    <p className="text-xs text-[#A1A1AA] leading-relaxed">{proj.summary}</p>

                    {proj.techStack && proj.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {proj.techStack.map((tech, tidx) => (
                          <span
                            key={tidx}
                            className="rounded-md bg-[#121212] border border-[#1D1D1D] px-2 py-0.5 text-[10px] text-[#A1A1AA]"
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
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#1D1D1D]">
                  <div className="flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4 text-[#A78BFA]" />
                    <h3 className="text-sm font-semibold text-[#F5F5F5]">Recent Activity Feed</h3>
                  </div>
                  <Link
                    href="/tracker"
                    className="text-xs text-[#A1A1AA] hover:text-[#F5F5F5] flex items-center gap-1 transition-colors"
                  >
                    View tracker <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="divide-y divide-[#171717] max-h-[360px] overflow-y-auto">
                  {activities.length === 0 ? (
                    <p className="px-5 py-6 text-xs text-[#71717A] text-center">
                      No recent activity recorded yet.
                    </p>
                  ) : (
                    activities.slice(0, 8).map((activity) => {
                      const Icon = ACTIVITY_ICONS[activity.type] ?? ActivityIcon;
                      const color = ACTIVITY_COLORS[activity.type] ?? ACTIVITY_COLORS.application;
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 px-5 py-3 hover:bg-[#121212] transition-colors"
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
                            <p className="text-sm text-[#F5F5F5] leading-snug">{activity.message}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3 text-[#71717A]" />
                              <span className="text-xs text-[#71717A]">{activity.timestamp}</span>
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
                    <Target className="w-4 h-4 text-[#A78BFA]" />
                    <h3 className="text-sm font-semibold text-[#F5F5F5]">Domain Readiness</h3>
                  </div>
                  <Link href="/readiness" className="text-xs text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors">
                    Plan →
                  </Link>
                </div>

                <div className="space-y-3.5">
                  {DOMAIN_READINESS_ITEMS.map((domain) => (
                    <div key={domain.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#A1A1AA]">{domain.label}</span>
                        <span className="text-xs font-semibold text-[#F5F5F5] tabular-nums">
                          {domain.score}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#171717] border border-[#1D1D1D] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${domain.score}%`,
                            backgroundColor: domain.score >= 80 ? "#10B981" : "#F5F5F5",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Link href="/readiness">
                  <div className="mt-5 flex items-center justify-center gap-1 text-xs text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors">
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
                <CalendarCheck className="w-4 h-4 text-[#A1A1AA]" />
                <h3 className="text-sm font-semibold text-[#F5F5F5]">Upcoming Interviews &amp; Action Deadlines</h3>
              </div>
              <Link href="/tracker" className="text-xs text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors">
                Manage in Tracker →
              </Link>
            </div>

            {scheduledInterviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scheduledInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] hover:border-[#292929] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#121212] border border-[#292929] flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[#F5F5F5]">{interview.logo || interview.company.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#F5F5F5] truncate">{interview.company}</p>
                      <p className="text-xs text-[#A1A1AA] truncate">{interview.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="indigo" size="sm">
                          {interview.status}
                        </Badge>
                        <span className="text-xs text-[#71717A] truncate">
                          {interview.nextStepDate || interview.nextStep || "Upcoming"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-[#71717A] text-xs border border-dashed border-[#292929] rounded-xl bg-[#0A0A0A]">
                No interviews scheduled yet. Move applications to &quot;Technical Round&quot; or &quot;HR Round&quot; in the Tracker to populate this schedule.
              </div>
            )}
          </Card>

          {/* 8. Quick Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => router.push("/jobs")}
              className="group cursor-pointer rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-5 hover:border-[#292929] hover:bg-[#121212] transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#121212] border border-[#292929] text-[#A1A1AA] mb-3 group-hover:border-[#3A3A3A] transition-colors">
                <Briefcase className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-[#F5F5F5] transition-colors">
                1. Pick Target Role &amp; Find Jobs
              </h4>
              <p className="mt-1 text-xs text-[#A1A1AA]">
                Match your {realResume.skills.length} skills against current tech job openings.
              </p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#F5F5F5]">
                Explore Jobs →
              </span>
            </div>

            <div
              onClick={() => router.push("/readiness")}
              className="group cursor-pointer rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-5 hover:border-[#292929] hover:bg-[#121212] transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#121212] border border-[#292929] text-[#A1A1AA] mb-3 group-hover:border-[#3A3A3A] transition-colors">
                <Target className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-[#F5F5F5] transition-colors">
                2. Readiness Study Plan
              </h4>
              <p className="mt-1 text-xs text-[#A1A1AA]">
                Covers your {realResume.missingRecommendedSkills.length} recommended topics.
              </p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#F5F5F5]">
                View Plan →
              </span>
            </div>

            <div
              onClick={() => router.push("/tracker")}
              className="group cursor-pointer rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-5 hover:border-[#292929] hover:bg-[#121212] transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#121212] border border-[#292929] text-[#A1A1AA] group-hover:text-[#F5F5F5] mb-3 transition-colors">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-[#F5F5F5]">
                3. Application Tracker
              </h4>
              <p className="mt-1 text-xs text-[#71717A]">
                Manage your active pipeline and deadline reminders.
              </p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#F5F5F5] group-hover:translate-x-0.5 transition-transform">
                Open Kanban →
              </span>
            </div>

            <div
              onClick={() => router.push("/interview")}
              className="group cursor-pointer rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-5 hover:border-[#292929] hover:bg-[#121212] transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#121212] border border-[#292929] text-[#A1A1AA] group-hover:text-[#F5F5F5] mb-3 transition-colors">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-[#F5F5F5]">
                4. Practice Interview Coach
              </h4>
              <p className="mt-1 text-xs text-[#71717A]">
                Practice role-specific questions and get instant feedback.
              </p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#F5F5F5] group-hover:translate-x-0.5 transition-transform">
                Start Practice →
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
