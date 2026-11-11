"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Upload,
  Loader2,
  X,
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
import IntegratedRobotNavigator from "@/components/agent/IntegratedRobotNavigator";
import { useAgent } from "@/context/AgentProvider";

const POPULAR_TARGET_ROLES = [
  "Backend Engineer",
  "Full Stack Developer",
  "Frontend Engineer",
  "DevOps / Cloud Engineer",
  "Data Engineer",
  "AI / ML Engineer",
];

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

function toSkillLabel(item: any): string {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item.name === "string") return item.name;
  if (typeof item.skill_name === "string") return item.skill_name;
  if (typeof item.skill === "string") return item.skill;
  return JSON.stringify(item);
}

function toSkillLevel(item: any): string {
  if (!item || typeof item === "string") return "";
  return item.claimedLevel || item.verified_confidence || item.strength || item.level || "";
}

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    targetRole,
    setTargetRole,
    uploadResumeForRole,
    isUploadingResume,
    agentError,
    clearAgentError,
    digitalTwin,
    parsedResume,
    uploadedFileName,
  } = useAgent();

  const [realResume, setRealResume] = useState<RealParsedResume | null>(null);
  const [applications, setApplications] = useState<KanbanCard[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [bulletApplied, setBulletApplied] = useState(false);
  const [showAppliedSuccess, setShowAppliedSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState("");

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
    window.addEventListener("agent-state-mutated", handleUpdate);

    return () => {
      window.removeEventListener("copilot-data-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("agent-state-mutated", handleUpdate);
    };
  }, [syncState]);

  const hasResume = Boolean(
    (realResume !== null && Array.isArray(realResume.skills) && realResume.skills.length > 0) ||
    parsedResume !== null ||
    (digitalTwin !== null && Array.isArray(digitalTwin.skills) && digitalTwin.skills.length > 0)
  );

  // File drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploadingResume) setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (isUploadingResume) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    const roleToUse = targetRole.trim();
    if (!roleToUse) {
      return;
    }
    await uploadResumeForRole(file, roleToUse);
  };

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
  const atsScore =
    parsedResume?.atsScore ||
    realResume?.atsScore ||
    (digitalTwin as any)?.atsScore ||
    0;
  const placementReadiness =
    (digitalTwin as any)?.readinessScore ||
    (digitalTwin as any)?.profileSummary?.readinessScore ||
    (hasResume ? Math.min(100, Math.max(10, Math.round((atsScore * 0.6) + (totalApps > 0 ? 30 : 15)))) : 0);

  const candidateName =
    parsedResume?.candidateName ||
    realResume?.candidateName ||
    (digitalTwin as any)?.profileSummary?.fullName ||
    "Candidate";

  const effectiveFileName =
    uploadedFileName ||
    realResume?.fileName ||
    (digitalTwin as any)?.currentResumeSummary?.fileName ||
    "resume.pdf";

  const rawSkills: any[] =
    parsedResume?.extractedSkills ||
    realResume?.skills ||
    digitalTwin?.skills ||
    [];

  const skillsList = rawSkills.map((s) => ({
    label: toSkillLabel(s),
    level: toSkillLevel(s) || "UNVERIFIED",
  })).filter((s) => s.label.length > 0);

  const projectsList =
    parsedResume?.projects ||
    realResume?.projects ||
    [];

  const missingSkillsList =
    parsedResume?.missingSkillsForTargetRole?.map((m) => m.skill) ||
    realResume?.missingRecommendedSkills ||
    [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <title>Home | Placement Co-pilot</title>
      <h1 className="sr-only">Home</h1>

      {/* ─── ROBOT CONCIERGE NAVIGATOR MOUNTED AT THE TOP ───────────────── */}
      <IntegratedRobotNavigator />

      {/* ─── ERROR BANNER ──────────────────────────────────────────────── */}
      {agentError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-4 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{agentError}</span>
          </div>
          <button
            type="button"
            onClick={clearAgentError}
            className="text-red-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── STATE A: ZERO STATE (BEFORE RESUME UPLOAD) ────────────────── */}
      {!hasResume ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Step 1: Target Role Selector */}
          <div className="rounded-3xl border border-sky-500/30 bg-gradient-to-br from-[#0c102a] via-[#0d1434] to-[#070914] p-6 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 font-bold text-xs border border-sky-500/30">
                1
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                Select Your Aspiring Target Role
              </h2>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Your resume analysis, skill gap detection, and ATS score will be calibrated specifically against this role.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {POPULAR_TARGET_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setTargetRole(role)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    targetRole === role
                      ? "bg-sky-500 text-black shadow-lg shadow-sky-500/25 ring-2 ring-sky-400"
                      : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customRoleInput.trim()) {
                  setTargetRole(customRoleInput.trim());
                  setCustomRoleInput("");
                }
              }}
              className="flex gap-2 max-w-md"
            >
              <input
                type="text"
                placeholder="Or type a custom role (e.g. SRE, Solutions Architect)..."
                value={customRoleInput}
                onChange={(e) => setCustomRoleInput(e.target.value)}
                className="flex-1 bg-black/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={!customRoleInput.trim()}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black text-xs font-bold transition-all"
              >
                Set Role
              </button>
            </form>
          </div>

          {/* Step 2: Real Resume Upload Zone */}
          <div className="rounded-3xl border border-white/10 bg-[#0a0d1e] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 font-bold text-xs border border-indigo-500/30">
                2
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                Upload Your Real Resume (PDF or TXT)
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              {targetRole
                ? `Ready to evaluate against target role: "${targetRole}". Attach your file below.`
                : "Please select or type your target role above before uploading your resume."}
            </p>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (!isUploadingResume && targetRole) {
                  fileInputRef.current?.click();
                }
              }}
              className={clsx(
                "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer",
                !targetRole
                  ? "border-slate-800 bg-black/20 opacity-60 cursor-not-allowed"
                  : dragActive
                  ? "border-sky-400 bg-sky-950/20 scale-[0.99]"
                  : "border-slate-700 hover:border-sky-500/60 bg-black/40 hover:bg-slate-900/40"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={handleFileChange}
                className="hidden"
                disabled={!targetRole || isUploadingResume}
              />

              {isUploadingResume ? (
                <div className="flex flex-col items-center space-y-3 py-4">
                  <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
                  <p className="text-sm font-semibold text-white">Analyzing Resume with Gemini 3.8 Flash...</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Extracting real skills, detecting genuine projects, calculating ATS alignment for &quot;{targetRole}&quot;, and seeding your autonomous preparation plan.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3 py-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {targetRole ? "Click to upload or drag & drop" : "Select a target role first"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Supports PDF &amp; TXT documents (Max 10MB)</p>
                  </div>
                </div>
              )}
            </div>
          </div>
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
                    {candidateName}
                  </h2>
                </div>
                <p className="text-xs text-slate-300">
                  From <span className="font-semibold text-cyan-300">{effectiveFileName}</span> · Target Role:{" "}
                  <span className="text-indigo-300 font-semibold">{targetRole || "Software Engineer"}</span>
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
                <span className="text-xs text-slate-400 font-medium">ATS Match Score</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-400">{atsScore}%</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted, #94a3b8)", marginTop: "2px" }}>
                  Role fit for {targetRole || "Software Engineer"}
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-500/20 bg-black/40 p-4">
                <span className="text-xs text-slate-400 font-medium">Extracted Skills</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{skillsList.length}</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted, #94a3b8)", marginTop: "2px" }}>
                  Verified from your PDF
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-500/20 bg-black/40 p-4">
                <span className="text-xs text-slate-400 font-medium">Real Projects</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-cyan-300">{projectsList.length}</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted, #94a3b8)", marginTop: "2px" }}>
                  Extracted from experience
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-500/20 bg-black/40 p-4">
                <span className="text-xs text-slate-400 font-medium">Missing Skills</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-400">{missingSkillsList.length}</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted, #94a3b8)", marginTop: "2px" }}>
                  Target role skill gaps
                </div>
              </div>
            </div>
          </div>

          {/* 2. StatCards Row */}
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
              label="Target Role Fit"
              value={`${atsScore}%`}
              delta={atsScore >= 75 ? "High match" : "Gaps identified"}
              deltaPositive={atsScore >= 75}
              icon="TrendingUp"
              color="amber"
            />
            <StatCard
              label="Placement Readiness"
              value={`${placementReadiness}%`}
              delta={placementReadiness >= 70 ? "Interview ready" : "Preparation ongoing"}
              deltaPositive={placementReadiness >= 70}
              icon="Target"
              color="violet"
            />
          </div>

          {/* 3. Real Extracted Skills Matrix */}
          <div className="rounded-3xl border border-white/10 bg-[#0a0d1c] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Real Extracted Skills From {effectiveFileName}
                </h3>
                <p className="text-xs text-slate-400">
                  Extracted and cited directly from your projects and coursework by Gemini.
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
              {skillsList.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 flex items-center gap-2 hover:border-white/20 transition-all"
                >
                  <span className="text-xs font-semibold text-white">{item.label}</span>
                  <span className="rounded bg-sky-500/20 text-sky-300 text-[10px] px-1.5 py-0.2 font-mono">
                    {item.level}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Missing Skills for Target Role */}
          {missingSkillsList.length > 0 && (
            <div className="rounded-3xl border border-amber-500/20 bg-amber-950/10 p-6 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Recommended Skills for &quot;{targetRole}&quot;
                  </h3>
                </div>
                <Link
                  href="/readiness"
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                >
                  <span>Build Study Plan →</span>
                </Link>
              </div>
              <p className="text-xs text-slate-400">
                These critical competencies are tested in technical interviews for {targetRole}.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {missingSkillsList.map((skill, idx) => (
                  <span
                    key={idx}
                    className="rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-medium text-amber-300"
                  >
                    + {typeof skill === "object" && skill !== null ? (skill as any).skill : String(skill)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 5. Real Detected Projects */}
          {projectsList.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-[#090d1c] p-6 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Projects Detected in Your Resume ({projectsList.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectsList.map((proj: any, idx: number) => (
                  <div key={idx} className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-white truncate">{proj.name}</h4>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {Array.isArray(proj.bullets) ? proj.bullets[0] : proj.summary || ""}
                    </p>

                    {proj.techStack && proj.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {proj.techStack.map((tech: string, tidx: number) => (
                          <span
                            key={tidx}
                            className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-cyan-300"
                          >
                            {toSkillLabel(tech)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Activity Feed */}
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
                      <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", color)}>
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
      )}
    </div>
  );
}
