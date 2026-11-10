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
          border-radius: 12px;
          background: rgba(13, 18, 36, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.2s ease;
        }
        .activity-item:hover {
          border-color: rgba(99, 102, 241, 0.35);
          background: rgba(21, 26, 53, 0.85);
        }
        .activity-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .activity-time {
          font-size: 11px;
          font-family: monospace;
          color: var(--muted, #94a3b8);
        }
        .activity-text {
          font-size: 13px;
          font-weight: 500;
          color: #f1f5f9;
          line-height: 1.5;
        }
        .activity-status {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
          white-space: nowrap;
        }
        .activity-status.completed {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .activity-status.failed {
          background: rgba(244, 63, 94, 0.15);
          color: #fb7185;
          border: 1px solid rgba(244, 63, 94, 0.3);
        }
        .activity-status.running {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.3);
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

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-[#090D1A] border-l border-indigo-500/30 shadow-2xl flex flex-col h-full text-white">
              {/* ─── DRAWER HEADER ─── */}
              <div className="p-5 border-b border-white/8 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-[#090D1A] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Activity Log
                    </h2>
                    <p style={{ fontSize: "13px", color: "var(--muted, #94a3b8)" }}>
                      What your assistant has done in this session.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close Activity Log"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ─── SCROLLABLE CONTENT BODY ─── */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Natural Language Command Bar */}
                <div className="space-y-2">
                  <form onSubmit={handleCustomGoalSubmit} className="relative">
                    <input
                      type="text"
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      placeholder="Ask your assistant: 'Prepare me for a Software Engineer interview'..."
                      disabled={isExecuting}
                      className="w-full bg-black/50 border border-white/12 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none pr-12 transition-all shadow-inner font-sans"
                    />
                    <button
                      type="submit"
                      disabled={isExecuting || !promptInput.trim()}
                      className="absolute right-2 top-2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                      title="Ask Assistant"
                    >
                      {isExecuting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                  </form>

                  {/* Quick Trigger Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">
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
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-[11px] text-indigo-300 transition-all font-medium flex items-center gap-1 cursor-pointer"
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
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-[11px] text-rose-300 transition-all font-medium flex items-center gap-1 cursor-pointer"
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
                      className="px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-[11px] text-pink-300 transition-all font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3 h-3 text-pink-400" />
                      <span>⚡ Skills Across Jobs</span>
                    </button>
                  </div>
                </div>

                {/* Executing Pulse Indicator */}
                {isExecuting && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-300 text-xs animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                    <span>Assistant is working on your request...</span>
                  </div>
                )}

                {/* Activity Feed */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-white/6">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Recent Activity
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      {runs.length} Event{runs.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {runs.length === 0 ? (
                    <p style={{ color: "var(--muted, #94a3b8)", fontSize: "13px", padding: "20px 0", textAlign: "center" }}>
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
                            <details className="mt-1 text-xs text-slate-400 group">
                              <summary className="cursor-pointer text-indigo-400 hover:text-indigo-300 font-mono text-[11px] select-none py-1">
                                Technical details ({run.reasoning_trace.length} steps)
                              </summary>
                              <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-indigo-500/20">
                                {run.reasoning_trace.map((step, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2 rounded-lg bg-black/40 text-[11px] font-mono text-slate-300"
                                  >
                                    <div className="flex items-center justify-between text-indigo-300 mb-1">
                                      <span>
                                        Step {step.step_number}: {step.tool_name}
                                      </span>
                                      <span>
                                        {step.latency_ms}ms · {step.status}
                                      </span>
                                    </div>
                                    <p className="text-slate-400 font-sans text-xs">
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
