"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  RotateCcw,
  CheckCircle2,
  FileText,
  Briefcase,
  Target,
  CalendarCheck,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import { useAgent } from "@/context/AgentProvider";
import {
  getStoredRealResume,
  setStoredRealResume,
  getStoredResumeWorkspace,
  getStoredApplications,
  clearAllCopilotState,
  type RealParsedResume,
  type StoredResumeWorkspace,
} from "@/lib/storage-sync";

export default function IntegratedRobotNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const { openDrawer, isExecuting, pendingApprovals } = useAgent();
  const approvals = pendingApprovals || [];

  const [realResume, setRealResume] = useState<RealParsedResume | null>(null);
  const [workspace, setWorkspace] = useState<StoredResumeWorkspace | null>(null);
  const [hasJobs, setHasJobs] = useState(false);
  const [robotMode, setRobotMode] = useState<"idle" | "working" | "success">("idle");
  const [bulletApplied, setBulletApplied] = useState(false);
  const [showAppliedToast, setShowAppliedToast] = useState(false);

  // Sync with stored real resume, workspace, jobs & cross-tab events
  const syncState = useCallback(() => {
    try {
      const stored = getStoredRealResume();
      setRealResume(stored);
      if (stored?.bulletImprovements?.[0]?.applied) {
        setBulletApplied(true);
      }
    } catch {
      setRealResume(null);
    }

    try {
      const ws = getStoredResumeWorkspace();
      setWorkspace(ws);
    } catch {
      setWorkspace(null);
    }

    try {
      const apps = getStoredApplications();
      setHasJobs(Array.isArray(apps) && apps.length > 0);
    } catch {
      setHasJobs(false);
    }
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

  // If on login/auth, do not render
  if (pathname.startsWith("/auth/")) {
    return null;
  }

  const isWorkspaceValid =
    !!workspace?.analysis &&
    ((workspace.analysis.matchScore && workspace.analysis.matchScore > 0) ||
      (workspace.analysis.extractedSkills && workspace.analysis.extractedSkills.length > 0) ||
      (workspace.analysis.parsedResume?.skills && workspace.analysis.parsedResume.skills.length > 0));

  const isRealResumeValid = realResume !== null && Array.isArray(realResume.skills) && realResume.skills.length > 0;
  const hasResume = isWorkspaceValid || isRealResumeValid;
  const hasPendingApprovals = approvals.length > 0;
  const isUploadPage = pathname === "/dashboard" || pathname === "/resume";

  const fileName = realResume?.fileName || workspace?.fileName || "Uploaded Resume.pdf";
  const skillsCount = realResume?.skills?.length || workspace?.analysis?.extractedSkills?.length || 0;
  const projectsCount = realResume?.projectsCount || realResume?.projects?.length || workspace?.analysis?.parsedResume?.projects?.length || 0;
  const atsScore = realResume?.atsScore || workspace?.analysis?.atsScore || workspace?.analysis?.matchScore || 75;

  // Handle wiping state back to pure Zero State
  const handleReset = () => {
    clearAllCopilotState();
    setRealResume(null);
    setWorkspace(null);
    setHasJobs(false);
    setBulletApplied(false);
    setRobotMode("idle");
    router.push("/dashboard");
  };

  // Apply bullet rewrite
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
    setRobotMode("success");
    setShowAppliedToast(true);
    setTimeout(() => setShowAppliedToast(false), 4000);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-[#0b0e24] via-[#0e1330] to-[#070914] p-4 sm:p-5 shadow-xl backdrop-blur-xl">
      {/* Floating Robot Animation Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-mini {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .animate-float-mini {
          animation: float-mini 3.5s ease-in-out infinite;
        }
      `}} />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Animated Robot Avatar & Dialogue */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          {/* Animated SVG Robot */}
          <div className="relative shrink-0">
            <div
              className={clsx(
                "absolute -inset-1 rounded-2xl blur-sm transition-all duration-500",
                robotMode === "working"
                  ? "bg-amber-400/40 animate-pulse"
                  : robotMode === "success"
                  ? "bg-emerald-400/40 animate-pulse"
                  : "bg-cyan-500/20"
              )}
            />

            <div className="relative flex h-13 w-13 items-center justify-center rounded-2xl border border-indigo-400/30 bg-gradient-to-b from-[#141b40] to-[#090c20] shadow-md animate-float-mini">
              <svg className="h-8 w-8" viewBox="0 0 72 72" fill="none">
                {/* Antennas */}
                <line x1="36" y1="12" x2="36" y2="4" stroke="#777CFF" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="36" cy="4" r="3.5" fill={hasResume ? "#10B981" : "#00F0FF"} />
                {/* Head */}
                <rect x="12" y="14" width="48" height="42" rx="14" fill="#151A38" stroke="#454BFF" strokeWidth="2.5" />
                {/* Ears */}
                <rect x="6" y="27" width="6" height="16" rx="3" fill="#292EDB" />
                <rect x="60" y="27" width="6" height="16" rx="3" fill="#292EDB" />
                {/* Visor */}
                <rect x="18" y="22" width="36" height="24" rx="8" fill="#080A18" stroke={hasResume ? "#10B981" : "#00F0FF"} strokeWidth="1.5" />
                {/* Eyes */}
                {hasResume ? (
                  <g stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 35 L27 30 L31 35" />
                    <path d="M41 35 L45 30 L49 35" />
                  </g>
                ) : (
                  <g>
                    <circle cx="27" cy="33" r="4" fill="#00F0FF" />
                    <circle cx="29" cy="31" r="1.5" fill="#FFFFFF" />
                    <circle cx="45" cy="33" r="4" fill="#00F0FF" />
                    <circle cx="47" cy="31" r="1.5" fill="#FFFFFF" />
                  </g>
                )}
                {/* Mouth */}
                <path d="M31 41 Q36 44 41 41" stroke={hasResume ? "#10B981" : "#454BFF"} strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Dialogue text */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                <Sparkles className="h-3 w-3" />
                Your Assistant
              </span>

              {hasResume ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Resume: {fileName}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                  Upload your resume to begin
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm font-medium text-slate-100 leading-snug">
              {isExecuting ? (
                "Working on it..."
              ) : hasPendingApprovals ? (
                "I suggested some improvements to your resume. Want to review them?"
              ) : !hasResume ? (
                "Upload your resume to get started. I'll find matching jobs and build your study plan automatically."
              ) : (
                <>
                  Got it! Found <span className="text-emerald-400 font-bold">{skillsCount} skills</span> and{" "}
                  <span className="text-indigo-300 font-bold">{projectsCount} projects</span> in your resume. Here's what I'd do next:
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Reset Button & Smart Next Actions */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-center shrink-0">
          {hasResume ? (
            <>
              <button
                type="button"
                onClick={openDrawer}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition-all cursor-pointer",
                  isExecuting && "animate-pulse border-indigo-400 bg-indigo-500/25"
                )}
                title="Open Activity Log"
              >
                <Zap className={clsx("h-3.5 w-3.5 text-indigo-400", isExecuting && "animate-spin")} />
                <span>⚡ Activity Log</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-all cursor-pointer"
                title="Wipe state and upload a new resume"
              >
                <RotateCcw className="h-3 w-3" />
                <span>🔄 Reset / Upload New Resume</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg transition-all cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>📄 Upload Resume to Start</span>
            </button>
          )}
        </div>
      </div>

      {/* Smart Next-Step Navigation Pills (Only shown when a resume is uploaded) */}
      {hasResume && (
        <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-400 font-medium">Quick Navigation:</span>

          {!hasJobs ? (
            <>
              <button
                type="button"
                onClick={() => router.push("/jobs")}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold transition-all cursor-pointer",
                  pathname === "/jobs"
                    ? "bg-amber-500/25 border-amber-400 text-amber-200"
                    : "bg-black/30 border-amber-500/30 text-amber-300 hover:bg-amber-500/15"
                )}
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>💼 Find Matching Jobs</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/readiness")}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold transition-all cursor-pointer",
                  pathname === "/readiness"
                    ? "bg-sky-500/25 border-sky-400 text-sky-200"
                    : "bg-black/30 border-sky-500/30 text-sky-300 hover:bg-sky-500/15"
                )}
              >
                <Target className="h-3.5 w-3.5" />
                <span>📋 Start Readiness Plan</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => router.push("/interview")}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold transition-all cursor-pointer",
                  pathname.startsWith("/interview")
                    ? "bg-purple-500/25 border-purple-400 text-purple-200"
                    : "bg-black/30 border-purple-500/30 text-purple-300 hover:bg-purple-500/15"
                )}
              >
                <Target className="h-3.5 w-3.5" />
                <span>🎯 Prep for Interview</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/readiness")}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold transition-all cursor-pointer",
                  pathname === "/readiness"
                    ? "bg-sky-500/25 border-sky-400 text-sky-200"
                    : "bg-black/30 border-sky-500/30 text-sky-300 hover:bg-sky-500/15"
                )}
              >
                <CalendarCheck className="h-3.5 w-3.5" />
                <span>📊 View Progress</span>
              </button>
            </>
          )}

          {hasPendingApprovals && (
            <button
              type="button"
              onClick={() => router.push("/resume")}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold transition-all cursor-pointer",
                pathname === "/resume"
                  ? "bg-emerald-500/25 border-emerald-400 text-emerald-200"
                  : "bg-black/30 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>✅ Review Resume Changes ({approvals.length})</span>
            </button>
          )}

          {realResume?.bulletImprovements?.[0] && !bulletApplied && (
            <button
              type="button"
              onClick={handleApplyBullet}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/30 border border-emerald-400/40 hover:bg-emerald-600/50 px-3 py-1.5 font-semibold text-emerald-200 transition-all cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              <span>✨ Apply Suggested Bullet Rewrite</span>
            </button>
          )}
        </div>
      )}

      {/* Toast Notification when bullet is applied */}
      {showAppliedToast && (
        <div className="mt-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-2.5 flex items-center justify-between text-xs text-emerald-300 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              Applied high-impact rewrite! Resume Score upgraded to <strong>{atsScore}%</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/resume")}
            className="text-xs text-cyan-300 underline font-semibold cursor-pointer"
          >
            View in Resume Screener →
          </button>
        </div>
      )}
    </div>
  );
}
