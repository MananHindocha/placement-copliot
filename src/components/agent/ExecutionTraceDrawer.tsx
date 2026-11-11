"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAgent } from "@/context/AgentProvider";
import type { AgentRunRecord } from "@/lib/agent/types";
import {
  Brain,
  X,
  Play,
  Loader2,
  ShieldAlert,
  Layers,
  ArrowRight,
  Target,
  FileText,
} from "lucide-react";
import { clsx } from "clsx";

function formatRelativeTime(dateInput?: string | number): string {
  if (!dateInput) return "Recently";
  try {
    const timestamp = typeof dateInput === "number" ? dateInput : new Date(dateInput).getTime();
    if (isNaN(timestamp)) return "Recently";
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "Recently";
  }
}

function getRunSummary(run: AgentRunRecord): string {
  const triggerType = run.trigger_type || (run as any).triggerType;
  const metadata = (run as any).metadata || {};
  const company =
    metadata.company ||
    (run.goal && run.goal.includes("for ")
      ? run.goal.split("for ")[1]?.split(" ")[0]?.replace(/[().,]/g, "")
      : "");

  switch (triggerType as string) {
    case "RESUME_UPLOADED_BOOTSTRAP":
      return "Analysed your resume and built your skill profile";
    case "JOB_SAVED":
      return `Checked your skills against ${company || "a saved job"}`;
    case "KANBAN_MOVED_TO_INTERVIEW":
      return `Prepared interview tips for ${company || "your interview"}`;
    case "MOCK_INTERVIEW_COMPLETED":
      return "Updated your skill levels after your practice session";
    case "USER_GOAL_SUBMITTED":
      return run.goal || "Answered your request and updated recommendations";
    default:
      return run.final_summary || run.goal || "Completed a background task";
  }
}

export function ExecutionTraceDrawer() {
  const {
    isDrawerOpen,
    isExecuting,
    runs,
    closeDrawer,
    triggerAgent,
  } = useAgent();

  const [promptInput, setPromptInput] = useState("");

  const handleCustomGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isExecuting) return;

    const goal = promptInput.trim();
    setPromptInput("");
    await triggerAgent({
      triggerType: "USER_GOAL_SUBMITTED",
      goalPrompt: goal,
      autoOpenDrawer: true,
    });
  };

  const handlePresetTrigger = (presetPrompt: string) => {
    triggerAgent({
      triggerType: "USER_GOAL_SUBMITTED",
      goalPrompt: presetPrompt,
      autoOpenDrawer: true,
    });
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .activity-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 14px 16px;
          border-radius: 10px;
          background: #171820;
          border: 1px solid #22232d;
          transition: border-color 0.15s ease, background-color 0.15s ease;
        }
        .activity-item:hover {
          border-color: #343646;
          background: #1d1d26;
        }
        .activity-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .activity-time {
          font-size: 11px;
          font-family: var(--font-mono), monospace;
          color: #969085;
        }
        .activity-text {
          font-size: 13px;
          font-weight: 500;
          color: #f8f8f9;
          line-height: 1.5;
        }
        .activity-status {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 9999px;
          white-space: nowrap;
        }
        .activity-status.completed {
          background: rgba(52, 211, 153, 0.12);
          color: #34d399;
          border: 1px solid rgba(52, 211, 153, 0.25);
        }
        .activity-status.failed {
          background: rgba(226, 114, 133, 0.12);
          color: #e27285;
          border: 1px solid rgba(226, 114, 133, 0.25);
        }
        .activity-status.running {
          background: rgba(178, 147, 226, 0.14);
          color: #b293e2;
          border: 1px solid rgba(178, 147, 226, 0.28);
        }
      `,
        }}
      />

      {/* ─── SLIDE-OVER EXECUTION TRACE DRAWER ─────────────────────── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
          {/* Backdrop */}
          <div
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-8 sm:pl-10">
            <div className="w-screen max-w-2xl bg-[#111218] border-l border-[#22232D] shadow-2xl flex flex-col h-full text-[#F8F8F9]">
              {/* ─── DRAWER HEADER ─── */}
              <div className="p-5 border-b border-[#22232D] bg-[#171820] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#1D1D26] border border-[#2B2C3A] flex items-center justify-center text-[#B293E2]">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[#F8F8F9] tracking-tight">
                      Activity Log
                    </h2>
                    <p style={{ fontSize: "12px", color: "#969085" }}>
                      What your assistant has done in this session.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-2 rounded-lg text-[#969085] hover:text-[#F8F8F9] hover:bg-[#1D1D26] transition-colors cursor-pointer"
                  title="Close Activity Log"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ─── SCROLLABLE CONTENT BODY ─── */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Natural Language Command Bar */}
                <div className="space-y-2.5">
                  <form onSubmit={handleCustomGoalSubmit} className="relative">
                    <input
                      type="text"
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      placeholder="Ask your assistant: 'Prepare me for a Software Engineer interview'..."
                      disabled={isExecuting}
                      className="w-full bg-[#0A0B0F] border border-[#262733] focus:border-[#735BA0] rounded-lg px-3.5 py-2.5 text-xs text-[#F8F8F9] placeholder-[#969085]/70 focus:outline-none pr-11 transition-colors font-sans"
                    />
                    <button
                      type="submit"
                      disabled={isExecuting || !promptInput.trim()}
                      className="absolute right-1.5 top-1.5 p-1.5 rounded-md bg-[#B293E2] hover:bg-[#C3A9EB] text-[#0A0B0F] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Ask Assistant"
                    >
                      {isExecuting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </form>

                  {/* Quick Trigger Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-[#969085] font-medium uppercase tracking-wider">
                      Quick Actions:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handlePresetTrigger(
                          "Prepare me for a Software Engineer interview. Focus on database design, APIs, and clean code."
                        )
                      }
                      disabled={isExecuting}
                      className="px-2.5 py-1 rounded-md bg-[#171820] hover:bg-[#1D1D26] border border-[#282936] text-[11px] text-[#F8F8F9] transition-colors font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span>🏢 Software Engineer Prep</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handlePresetTrigger(
                          "Check my skill profile and find skills that need more practice or verification."
                        )
                      }
                      disabled={isExecuting}
                      className="px-2.5 py-1 rounded-md bg-[#171820] hover:bg-[#1D1D26] border border-[#282936] text-[11px] text-rose-300 transition-colors font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      <span>🔍 Check Skill Accuracy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handlePresetTrigger(
                          "Find common skills across all my saved jobs and suggest a study plan."
                        )
                      }
                      disabled={isExecuting}
                      className="px-2.5 py-1 rounded-md bg-[#171820] hover:bg-[#1D1D26] border border-[#282936] text-[11px] text-[#B293E2] transition-colors font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3 h-3 text-[#B293E2]" />
                      <span>⚡ Skills Across Jobs</span>
                    </button>
                  </div>
                </div>

                {/* Executing Pulse Indicator */}
                {isExecuting && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[#171820] border border-[#735BA0]/40 text-[#B293E2] text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-[#B293E2] shrink-0" />
                    <span>Assistant is working on your request...</span>
                  </div>
                )}

                {/* Activity Feed */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#22232D]">
                    <h3 className="text-xs font-semibold text-[#F8F8F9] uppercase tracking-wider">
                      Recent Activity
                    </h3>
                    <span className="text-[11px] font-mono text-[#969085]">
                      {runs.length} Event{runs.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {runs.length === 0 ? (
                    <p style={{ color: "#969085", fontSize: "13px", padding: "20px 0", textAlign: "center" }}>
                      No activity yet. Upload your resume to get started.
                    </p>
                  ) : (
                    runs.map((run) => {
                      const isCompleted =
                        run.status === "COMPLETED" || run.status === "COMPLETED_WITH_FALLBACK";
                      const isFailed = run.status === "FAILED";
                      const isReview = run.status === "AWAITING_APPROVAL";

                      const statusClass = isCompleted
                        ? "completed"
                        : isFailed
                        ? "failed"
                        : "running";
                      const statusIcon = isCompleted ? "✓" : isFailed ? "✗" : isReview ? "Review" : "...";

                      return (
                        <div key={run.id} className="activity-item">
                          <div className="activity-header">
                            <span className="activity-time">
                              {formatRelativeTime(run.created_at)}
                            </span>
                            <span className={clsx("activity-status", statusClass)}>
                              {statusIcon}
                            </span>
                          </div>

                          <span className="activity-text">
                            {getRunSummary(run)}
                          </span>

                          {/* Technical details collapsed inside <details> */}
                          {run.reasoning_trace && run.reasoning_trace.length > 0 && (
                            <details className="mt-1 text-xs text-[#969085] group">
                              <summary className="cursor-pointer text-[#B293E2] hover:text-[#C3A9EB] font-mono text-[11px] select-none py-1">
                                Technical details ({run.reasoning_trace.length} steps)
                              </summary>
                              <div className="mt-2 space-y-1.5 pl-3 border-l border-[#4F414D]">
                                {run.reasoning_trace.map((step, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2.5 rounded-lg bg-[#111218] border border-[#22232D] text-[11px] font-mono text-[#969085]"
                                  >
                                    <div className="flex items-center justify-between text-[#B293E2] mb-1">
                                      <span>
                                        Step {step.step_number}: {step.tool_name}
                                      </span>
                                      <span>
                                        {step.latency_ms}ms · {step.status}
                                      </span>
                                    </div>
                                    <p className="text-[#F8F8F9]/85 font-sans text-xs">
                                      {step.output_summary}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
