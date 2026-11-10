"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Bot } from "lucide-react";
import { useAgent } from "@/context/AgentProvider";
import {
  getStoredRealResume,
  getStoredResumeWorkspace,
  clearAllCopilotState,
} from "@/lib/storage-sync";

interface StepProgress {
  hasResume: boolean;
  hasAppliedToAnyJob: boolean;
  hasCompletedAnyMilestone: boolean;
  hasCompletedAnyInterview: boolean;
  hasJobInAdvancedStage: boolean;
}

export default function IntegratedRobotNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const { openDrawer } = useAgent();

  const [progress, setProgress] = useState<StepProgress>({
    hasResume: false,
    hasAppliedToAnyJob: false,
    hasCompletedAnyMilestone: false,
    hasCompletedAnyInterview: false,
    hasJobInAdvancedStage: false,
  });

  // Derive each step's done status safely from localStorage
  const syncState = useCallback(() => {
    if (typeof window === "undefined") return;

    // 1. hasResume
    let hasResume = false;
    try {
      const stored = getStoredRealResume();
      const ws = getStoredResumeWorkspace();
      const isRealValid = Boolean(stored !== null && Array.isArray(stored.skills) && stored.skills.length > 0);
      const isWsValid = Boolean(
        ws?.analysis &&
          ((ws.analysis.matchScore && ws.analysis.matchScore > 0) ||
            (ws.analysis.extractedSkills && ws.analysis.extractedSkills.length > 0) ||
            (ws.analysis.parsedResume?.skills && ws.analysis.parsedResume.skills.length > 0))
      );
      hasResume = isRealValid || isWsValid;
    } catch {
      hasResume = false;
    }

    // 2. hasAppliedToAnyJob (copilot_applications_v1 length > 0)
    let hasAppliedToAnyJob = false;
    try {
      const apps = JSON.parse(localStorage.getItem("copilot_applications_v1") || "[]");
      hasAppliedToAnyJob = Array.isArray(apps) && apps.length > 0;
    } catch {
      hasAppliedToAnyJob = false;
    }

    // 3. hasCompletedAnyMilestone (any milestone with completed: true)
    let hasCompletedAnyMilestone = false;
    try {
      const tasks = JSON.parse(localStorage.getItem("copilot_readiness_tasks_v1") || "[]");
      hasCompletedAnyMilestone = Array.isArray(tasks) && tasks.some((t: any) => t.completed === true);
    } catch {
      hasCompletedAnyMilestone = false;
    }

    // 4. hasCompletedAnyInterview (copilot_interview_sessions_v1 length > 0)
    let hasCompletedAnyInterview = false;
    try {
      const sessions = JSON.parse(localStorage.getItem("copilot_interview_sessions_v1") || "[]");
      const custom = JSON.parse(localStorage.getItem("copilot_custom_interview_sessions_v1") || "{}");
      hasCompletedAnyInterview =
        (Array.isArray(sessions) && sessions.length > 0) || Object.keys(custom).length > 0;
    } catch {
      hasCompletedAnyInterview = false;
    }

    // 5. hasJobInAdvancedStage (any card in Technical Interview, HR Interview, or Offer stage)
    let hasJobInAdvancedStage = false;
    try {
      const apps = JSON.parse(localStorage.getItem("copilot_applications_v1") || "[]");
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
      hasJobInAdvancedStage = false;
    }

    setProgress({
      hasResume,
      hasAppliedToAnyJob,
      hasCompletedAnyMilestone,
      hasCompletedAnyInterview,
      hasJobInAdvancedStage,
    });
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

  // Define 5-step placement journey
  const PLACEMENT_STEPS = [
    {
      step: 1,
      id: "upload",
      label: "Upload Your Resume",
      done: progress.hasResume,
      action: { text: "📄 Upload Resume", href: "/dashboard" },
    },
    {
      step: 2,
      id: "jobs",
      label: "Find Matching Jobs",
      done: progress.hasAppliedToAnyJob,
      action: { text: "💼 Find Jobs", href: "/jobs" },
    },
    {
      step: 3,
      id: "study",
      label: "Build Your Study Plan",
      done: progress.hasCompletedAnyMilestone,
      action: { text: "📋 View Study Plan", href: "/readiness" },
    },
    {
      step: 4,
      id: "practice",
      label: "Practice Interviews",
      done: progress.hasCompletedAnyInterview,
      action: { text: "🎯 Start Practising", href: "/interview" },
    },
    {
      step: 5,
      id: "track",
      label: "Track Your Applications",
      done: progress.hasJobInAdvancedStage,
      action: { text: "📊 My Applications", href: "/tracker" },
    },
  ];

  const currentStep = PLACEMENT_STEPS.find((s) => !s.done) || null;

  // Handle wiping state back to pure Zero State
  const handleReset = () => {
    clearAllCopilotState();
    syncState();
    router.push("/dashboard");
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .nav-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 20px;
          background: var(--bg2, #161b27);
          border: 1px solid var(--border, #2a3148);
          border-radius: 12px;
          flex-wrap: wrap;
          min-height: 52px;
        }

        .step-indicator {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--accent, #38bdf8);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .step-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--fg, #e2e8f0);
          flex: 1;
          min-width: 0;
        }

        .step-cta {
          font-size: 12px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 6px;
          background: var(--accent, #38bdf8);
          color: #000;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .step-cta:hover {
          opacity: 0.9;
        }

        .step-dots {
          display: flex;
          gap: 5px;
          align-items: center;
          flex-shrink: 0;
        }

        .step-dots .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--border, #2a3148);
          transition: background 0.2s;
        }

        .step-dots .dot.done {
          background: var(--accent, #38bdf8);
        }

        .step-dots .dot.active {
          background: var(--fg2, #94a3b8);
          outline: 2px solid var(--accent, #38bdf8);
          outline-offset: 1px;
        }

        .nav-right {
          display: flex;
          gap: 8px;
          margin-left: auto;
          flex-shrink: 0;
          align-items: center;
        }

        .nav-btn {
          font-size: 12px;
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid var(--border, #2a3148);
          background: transparent;
          color: var(--fg2, #94a3b8);
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .nav-btn:hover {
          color: var(--fg, #e2e8f0);
          border-color: var(--fg3, #64748b);
        }

        @media (max-width: 600px) {
          .step-label { display: none; }
          .nav-bar { gap: 8px; padding: 10px 12px; }
        }
      `,
        }}
      />

      <div className="nav-bar">
        {/* Robot Icon */}
        <div className="flex items-center gap-1.5 shrink-0" title="Placement Co-pilot Assistant">
          <Bot className="w-4 h-4 text-sky-400" />
        </div>

        {/* Current Step or Celebration */}
        {currentStep ? (
          <>
            <span className="step-indicator">
              Step {currentStep.step} of 5
            </span>
            <span className="step-label">
              {currentStep.label}
            </span>
            <Link href={currentStep.action.href} className="step-cta">
              {currentStep.action.text}
            </Link>
          </>
        ) : (
          <span className="step-label">
            🎉 You&apos;re on track! Keep applying and practising.
          </span>
        )}

        {/* Progress dots (5 dots, filled = done) */}
        <div className="step-dots" aria-label="Placement Progress">
          {PLACEMENT_STEPS.map((s) => (
            <div
              key={s.id}
              className={`dot ${s.done ? "done" : s.id === currentStep?.id ? "active" : ""}`}
              title={`Step ${s.step}: ${s.label} (${s.done ? "Completed" : "Pending"})`}
            />
          ))}
        </div>

        {/* Right side — always visible */}
        <div className="nav-right">
          <button type="button" onClick={openDrawer} className="nav-btn">
            Activity Log
          </button>
          <button type="button" onClick={handleReset} className="nav-btn" title="Clear state and start fresh">
            ↺ New Resume
          </button>
        </div>
      </div>
    </>
  );
}
