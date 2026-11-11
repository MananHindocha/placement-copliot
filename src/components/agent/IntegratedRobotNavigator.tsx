"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Bot, ChevronRight, CheckCircle2, RefreshCw, Briefcase, FileText, Target, Award, Sparkles, X } from "lucide-react";
import { useAgent } from "@/context/AgentProvider";
import {
  getStoredRealResume,
  getStoredApplications,
  getStoredActivities,
} from "@/lib/storage-sync";

const POPULAR_TARGET_ROLES = [
  "Backend Engineer",
  "Full Stack Developer",
  "Frontend Engineer",
  "DevOps / Cloud Engineer",
  "Data Engineer",
  "AI / ML Engineer",
];

interface StepProgress {
  hasTargetRole: boolean;
  hasResume: boolean;
  hasAppliedToAnyJob: boolean;
  hasCompletedAnyMilestone: boolean;
  hasCompletedAnyInterview: boolean;
  hasJobInAdvancedStage: boolean;
}

export default function IntegratedRobotNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    targetRole,
    setTargetRole,
    digitalTwin,
    parsedResume,
    uploadedFileName,
    openDrawer,
    resetWorkspaceToZero,
  } = useAgent();

  const [isChangingRole, setIsChangingRole] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState("");
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const [progress, setProgress] = useState<StepProgress>({
    hasTargetRole: false,
    hasResume: false,
    hasAppliedToAnyJob: false,
    hasCompletedAnyMilestone: false,
    hasCompletedAnyInterview: false,
    hasJobInAdvancedStage: false,
  });

  const syncState = useCallback(() => {
    if (typeof window !== "undefined") {
      const storedResume = getStoredRealResume();
      const hasStoredResume = Boolean(
        storedResume && Array.isArray(storedResume.skills) && storedResume.skills.length > 0
      );

      const hasTwinSkills = Boolean(
        digitalTwin && Array.isArray(digitalTwin.skills) && digitalTwin.skills.length > 0
      );

      const hasParsedResume = Boolean(parsedResume !== null || uploadedFileName !== null);

      const hasResume = hasStoredResume || hasTwinSkills || hasParsedResume;

      let hasAppliedToAnyJob = false;
      let hasJobInAdvancedStage = false;
      try {
        const apps = getStoredApplications();
        hasAppliedToAnyJob = Array.isArray(apps) && apps.length > 0;
        hasJobInAdvancedStage =
          Array.isArray(apps) &&
          apps.some((a: any) =>
            [
              "Technical Interview",
              "Technical Round",
              "HR Interview",
              "HR Round",
              "Interview",
              "Offer Received",
              "Offer",
            ].includes(a.status || a.stage)
          );
      } catch {
        // Safe fallback
      }

      let hasCompletedAnyMilestone = false;
      try {
        const tasks = JSON.parse(window.localStorage.getItem("copilot_readiness_tasks_v1") || "[]");
        hasCompletedAnyMilestone = Array.isArray(tasks) && tasks.some((t: any) => t.completed === true);
      } catch {
        // Safe fallback
      }

      let hasCompletedAnyInterview = false;
      try {
        const sessions = JSON.parse(window.localStorage.getItem("copilot_interview_sessions_v1") || "[]");
        hasCompletedAnyInterview = Array.isArray(sessions) && sessions.length > 0;
      } catch {
        // Safe fallback
      }

      setProgress({
        hasTargetRole: Boolean(targetRole && targetRole.trim().length > 0),
        hasResume,
        hasAppliedToAnyJob,
        hasCompletedAnyMilestone,
        hasCompletedAnyInterview,
        hasJobInAdvancedStage,
      });
    }
  }, [targetRole, digitalTwin, parsedResume, uploadedFileName]);

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

  // Don't render on auth pages
  if (pathname.startsWith("/auth/")) {
    return null;
  }

  const handleSelectRole = (role: string) => {
    setTargetRole(role);
    setIsChangingRole(false);
    setCustomRoleInput("");
  };

  const handleCustomRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customRoleInput.trim()) {
      handleSelectRole(customRoleInput.trim());
    }
  };

  const handleResetConfirm = () => {
    resetWorkspaceToZero();
    setShowConfirmReset(false);
    syncState();
    router.push("/dashboard");
  };

  // 5 Placement Journey Steps
  const PLACEMENT_STEPS = [
    {
      step: 1,
      id: "role",
      label: progress.hasTargetRole ? `Target: ${targetRole}` : "Select Target Role",
      done: progress.hasTargetRole,
      action: { text: "🎯 Choose Role", href: "/dashboard" },
    },
    {
      step: 2,
      id: "upload",
      label: progress.hasResume ? "Resume Analyzed" : "Upload Your Real Resume",
      done: progress.hasResume,
      action: { text: "📄 Upload Resume", href: "/dashboard" },
    },
    {
      step: 3,
      id: "jobs",
      label: "Find Matching Jobs",
      done: progress.hasAppliedToAnyJob,
      action: { text: "💼 Scout Jobs", href: "/jobs" },
    },
    {
      step: 4,
      id: "study",
      label: "Prepare Missing Skills",
      done: progress.hasCompletedAnyMilestone,
      action: { text: "📋 Study Plan", href: "/readiness" },
    },
    {
      step: 5,
      id: "practice",
      label: "Practice Mock Interview",
      done: progress.hasCompletedAnyInterview,
      action: { text: "🎯 Mock Interview", href: "/interview" },
    },
  ];

  const currentStep = PLACEMENT_STEPS.find((s) => !s.done) || null;
  const atsScore = parsedResume?.atsScore || (digitalTwin as any)?.atsScore || null;
  const readinessScore =
    (digitalTwin as any)?.readinessScore || digitalTwin?.profileSummary?.readinessScore || 0;

  return (
    <div className="w-full space-y-2">
      {/* ─── MODAL: ROLE CHANGER POPOVER ─────────────────────────────── */}
      {isChangingRole && (
        <div className="relative z-50 rounded-2xl border border-sky-500/30 bg-[#0f1422] p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-semibold text-white">Select Your Aspiring Target Role</span>
            </div>
            <button
              type="button"
              onClick={() => setIsChangingRole(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {POPULAR_TARGET_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => handleSelectRole(role)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  targetRole === role
                    ? "bg-sky-500 text-black font-semibold shadow-md shadow-sky-500/20"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <form onSubmit={handleCustomRoleSubmit} className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Or enter custom role (e.g. SRE, Security Engineer)..."
              value={customRoleInput}
              onChange={(e) => setCustomRoleInput(e.target.value)}
              className="flex-1 bg-black/60 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              disabled={!customRoleInput.trim()}
              className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black text-xs font-semibold"
            >
              Set Role
            </button>
          </form>
        </div>
      )}

      {/* ─── MODAL: RESET CONFIRMATION ───────────────────────────────── */}
      {showConfirmReset && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 flex items-center justify-between text-xs text-red-200">
          <span>Are you sure you want to clear your current parsed resume & start fresh?</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResetConfirm}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium"
            >
              Yes, Reset
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmReset(false)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── MAIN ROBOT CONCIERGE BAR ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#121624] border border-[#232b42] rounded-2xl flex-wrap min-h-[52px] shadow-lg">
        {/* Robot Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-inner">
            <Bot className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 hidden sm:inline">
            Placement Concierge
          </span>
        </div>

        {/* Target Role Pill */}
        {progress.hasTargetRole ? (
          <button
            type="button"
            onClick={() => setIsChangingRole(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/25 transition-all cursor-pointer"
            title="Click to change aspiring target role"
          >
            <span>🎯 {targetRole}</span>
            <span className="text-[10px] text-indigo-400 underline">edit</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsChangingRole(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold animate-pulse"
          >
            <span>⚠️ Step 1: Select Target Role</span>
          </button>
        )}

        {/* Real Dynamic Metrics (Only after resume upload) */}
        {progress.hasResume && (
          <div className="hidden md:flex items-center gap-2">
            {atsScore !== null && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                📄 ATS {atsScore}%
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
              📈 Readiness {readinessScore}%
            </span>
          </div>
        )}

        {/* Center Guide: Next Best Step or On-Track Message */}
        <div className="flex-1 min-w-[200px] flex items-center justify-between gap-3">
          {currentStep ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium">
                {currentStep.label}
              </span>
              <Link
                href={currentStep.action.href}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-black shadow-sm transition-all"
              >
                <span>{currentStep.action.text}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>🎉 All milestones active! Keep practising and tracking applications.</span>
            </span>
          )}
        </div>

        {/* Progress Step Dots (5 steps) */}
        <div className="flex items-center gap-1.5 shrink-0" aria-label="5 Step Placement Journey">
          {PLACEMENT_STEPS.map((s) => (
            <div
              key={s.id}
              className={`w-2 h-2 rounded-full transition-all ${
                s.done
                  ? "bg-sky-400 shadow-sm shadow-sky-400/50"
                  : s.id === currentStep?.id
                  ? "bg-amber-400 ring-2 ring-amber-400/30 scale-125"
                  : "bg-slate-700"
              }`}
              title={`Step ${s.step}: ${s.label} (${s.done ? "Done" : "Pending"})`}
            />
          ))}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {openDrawer && (
            <button
              type="button"
              onClick={openDrawer}
              className="text-xs px-2.5 py-1 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all"
              title="View autonomous agent reasoning & tool execution log"
            >
              Activity Log
            </button>
          )}

          {progress.hasResume && (
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="text-xs px-2.5 py-1 rounded-xl border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-all"
              title="Clear resume and reset workspace to zero"
            >
              ↺ New Resume
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
