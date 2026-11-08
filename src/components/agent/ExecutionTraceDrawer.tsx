"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAgent } from "@/context/AgentProvider";
import type { AgentTraceStep, AgentRunRecord } from "@/lib/agent/types";
import {
  Brain,
  Sparkles,
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Code2,
  ShieldAlert,
  Loader2,
  Layers,
  Activity,
  Check,
  Zap,
  Target,
} from "lucide-react";
import { clsx } from "clsx";

// ─── TOOL DISPLAY MAPPING ─────────────────────────────────────────────────────

const TOOL_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; badgeBg: string }
> = {
  get_student_twin_context: {
    label: "Hydrate Career Digital Twin",
    icon: Brain,
    color: "text-indigo-400",
    badgeBg: "bg-indigo-500/10 border-indigo-500/30 text-indigo-300",
  },
  analyze_job_gap: {
    label: "Analyze Job Skill Gap",
    icon: Activity,
    color: "text-amber-400",
    badgeBg: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  },
  inject_readiness_sprint: {
    label: "Inject Readiness Sprint",
    icon: Zap,
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  },
  update_skill_evidence: {
    label: "Update Skill Evidence Ladder",
    icon: Code2,
    color: "text-sky-400",
    badgeBg: "bg-sky-500/10 border-sky-500/30 text-sky-300",
  },
  stage_resume_diff: {
    label: "Stage Grounded Resume Diff",
    icon: FileText,
    color: "text-purple-400",
    badgeBg: "bg-purple-500/10 border-purple-500/30 text-purple-300",
  },
  optimize_multi_company_overlap: {
    label: "Optimize Multi-Company Overlap",
    icon: Layers,
    color: "text-pink-400",
    badgeBg: "bg-pink-500/10 border-pink-500/30 text-pink-300",
  },
  sync_digital_twin_from_resume: {
    label: "Sync Career Digital Twin from Resume",
    icon: Brain,
    color: "text-sky-400",
    badgeBg: "bg-sky-500/10 border-sky-500/30 text-sky-300",
  },
  auto_seed_kanban_pipeline: {
    label: "Auto-Seed Matched Kanban Pipeline",
    icon: Target,
    color: "text-cyan-400",
    badgeBg: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
  },
  scout_and_seed_pipeline: {
    label: "Auto-Scout & Seed Matched Roles",
    icon: Target,
    color: "text-cyan-400",
    badgeBg: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
  },
};

function getToolMeta(toolName: string) {
  return (
    TOOL_CONFIG[toolName] || {
      label: toolName,
      icon: Activity,
      color: "text-slate-400",
      badgeBg: "bg-slate-500/10 border-slate-500/30 text-slate-300",
    }
  );
}

// ─── STEP ACCORDION ROW ───────────────────────────────────────────────────────

function TraceStepRow({
  step,
  isLatest,
}: {
  step: AgentTraceStep;
  isLatest: boolean;
}) {
  const [expanded, setExpanded] = useState(isLatest);
  const meta = getToolMeta(step.tool_name);
  const Icon = meta.icon;

  const isSuccess = step.status === "SUCCESS";
  const isFallback = step.status === "FALLBACK";
  const isError = step.status === "ERROR";

  return (
    <div className="relative pl-7 pb-6 last:pb-2 group">
      {/* Animated Vertical Connector Line */}
      <div className="absolute left-[11px] top-4 bottom-0 w-[2px] bg-gradient-to-b from-indigo-500/40 via-white/10 to-transparent group-last:hidden" />

      {/* Node Dot / Status Icon */}
      <div
        className={clsx(
          "absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono border transition-all shadow-sm",
          isSuccess
            ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-400 shadow-emerald-500/20"
            : isFallback
            ? "bg-amber-950/80 border-amber-500/50 text-amber-400 shadow-amber-500/20"
            : isError
            ? "bg-rose-950/80 border-rose-500/50 text-rose-400 shadow-rose-500/20"
            : "bg-indigo-950/80 border-indigo-500/50 text-indigo-400"
        )}
      >
        {isSuccess ? (
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        ) : isFallback ? (
          <AlertTriangle className="w-3 h-3" />
        ) : isError ? (
          <X className="w-3.5 h-3.5" />
        ) : (
          <span>{step.step_number}</span>
        )}
      </div>

      {/* Step Content Card */}
      <div className="bg-[#0D1224]/80 border border-white/8 hover:border-indigo-500/30 rounded-xl p-3.5 transition-all shadow-md backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/8">
              Step {step.step_number}
            </span>
            <span
              className={clsx(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border",
                meta.badgeBg
              )}
            >
              <Icon className={clsx("w-3 h-3", meta.color)} />
              <span>{meta.label}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{step.latency_ms}ms</span>
            <span
              className={clsx(
                "px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase",
                isSuccess
                  ? "bg-emerald-500/20 text-emerald-300"
                  : isFallback
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-rose-500/20 text-rose-300"
              )}
            >
              {step.status}
            </span>
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="p-1 hover:text-white transition-colors"
              title={expanded ? "Collapse step details" : "Expand step details"}
            >
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Input & Output Summaries */}
        <p className="text-xs text-slate-200 leading-relaxed font-sans mb-1 font-medium">
          {step.output_summary}
        </p>

        {expanded && (
          <div className="mt-2.5 pt-2.5 border-t border-white/6 space-y-2 text-xs">
            <div className="bg-black/40 rounded-lg p-2.5 border border-white/5 font-mono text-[11px] text-slate-300">
              <span className="text-indigo-400 font-bold block mb-1">▶ Input Prompt / Intent:</span>
              <p className="text-slate-300 whitespace-pre-wrap">{step.input_summary}</p>
            </div>

            {step.data && (
              <details className="bg-black/30 rounded-lg p-2 border border-white/5 text-[11px] font-mono text-slate-400">
                <summary className="cursor-pointer text-indigo-300 hover:text-indigo-200 select-none">
                  Inspect Tool Payload Data
                </summary>
                <pre className="mt-2 text-[10px] text-emerald-300/90 overflow-x-auto p-2 bg-black/60 rounded max-h-48">
                  {JSON.stringify(step.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EXECUTION TRACE DRAWER & PERSISTENT PILL ────────────────────────────────

export function ExecutionTraceDrawer() {
  const {
    isDrawerOpen,
    isExecuting,
    activeRun,
    runs,
    bluffRiskCount,
    pendingApprovalsCount,
    closeDrawer,
    openDrawer,
    openBluffAuditModal,
    setActiveRun,
    triggerAgent,
  } = useAgent();

  const [promptInput, setPromptInput] = useState("");
  const [selectedRunTab, setSelectedRunTab] = useState<"active" | "history">("active");

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
      {/* ─── PERSISTENT FLOATING AGENT STATUS PILL ───────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-40 animate-fadeIn">
        <button
          type="button"
          onClick={openDrawer}
          className={clsx(
            "group flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all duration-300 shadow-2xl backdrop-blur-xl cursor-pointer hover:scale-[1.03]",
            isExecuting
              ? "bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-indigo-900/90 border-indigo-400/60 shadow-indigo-500/30 text-white animate-pulse"
              : pendingApprovalsCount > 0
              ? "bg-gradient-to-r from-[#171306]/95 to-[#241a05]/95 border-amber-500/50 shadow-amber-500/20 text-amber-200"
              : bluffRiskCount > 0
              ? "bg-gradient-to-r from-[#1a0a10]/95 to-[#200c14]/95 border-rose-500/50 shadow-rose-500/20 text-rose-200"
              : "bg-[#0b0f1d]/95 hover:bg-[#12182e]/95 border-indigo-500/30 hover:border-indigo-500/60 shadow-indigo-950/40 text-slate-200"
          )}
        >
          <div className="relative">
            <div
              className={clsx(
                "w-8 h-8 rounded-xl flex items-center justify-center border transition-all",
                isExecuting
                  ? "bg-indigo-600/30 border-indigo-400 text-indigo-300"
                  : "bg-white/5 border-white/10 text-indigo-400 group-hover:text-indigo-300"
              )}
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
            </div>
            {isExecuting && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>

          <div className="text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold leading-tight">
              <span>{isExecuting ? "Agent Executing..." : "Autonomous Agent"}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {isExecuting
                ? "Streaming trace steps"
                : pendingApprovalsCount > 0
                ? `${pendingApprovalsCount} Approval${pendingApprovalsCount > 1 ? "s" : ""} Waiting`
                : bluffRiskCount > 0
                ? `${bluffRiskCount} Bluff Risk${bluffRiskCount > 1 ? "s" : ""} Flagged`
                : "Glass-Box Brain Ready"}
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1 pl-1">
            {pendingApprovalsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold animate-pulse">
                {pendingApprovalsCount} Pause
              </span>
            )}
            {bluffRiskCount > 0 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  openBluffAuditModal();
                }}
                className="px-1.5 py-0.5 rounded-md bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer"
                title="Click to Audit Bluff Risks"
              >
                {bluffRiskCount} Bluff
              </span>
            )}
          </div>
        </button>
      </div>

      {/* ─── SLIDE-OVER GLASS-BOX EXECUTION TRACE DRAWER ─────────────────────── */}
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
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white tracking-tight">
                        Autonomous Career Copilot
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold">
                        Glass-Box Trace
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Closed-loop observable execution across Resume, Tracker &amp; Interviews.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ─── RUN SELECTOR & VIEW TABS ─── */}
              <div className="px-5 py-2.5 bg-black/40 border-b border-white/6 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/8">
                  <button
                    type="button"
                    onClick={() => setSelectedRunTab("active")}
                    className={clsx(
                      "px-3 py-1 rounded-lg font-medium transition-all",
                      selectedRunTab === "active"
                        ? "bg-indigo-600 text-white shadow-sm font-semibold"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    Active Run
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRunTab("history")}
                    className={clsx(
                      "px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5",
                      selectedRunTab === "history"
                        ? "bg-indigo-600 text-white shadow-sm font-semibold"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <span>Run History</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
                      {runs.length}
                    </span>
                  </button>
                </div>

                {activeRun && (
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-slate-500">Status:</span>
                    <span
                      className={clsx(
                        "px-2 py-0.5 rounded-md font-bold text-[10px] border uppercase",
                        activeRun.status === "RUNNING"
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 animate-pulse"
                          : activeRun.status === "COMPLETED" ||
                            activeRun.status === "COMPLETED_WITH_FALLBACK"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : activeRun.status === "AWAITING_APPROVAL"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      )}
                    >
                      {activeRun.status}
                    </span>
                  </div>
                )}
              </div>

              {/* ─── SCROLLABLE CONTENT BODY ─── */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {selectedRunTab === "history" ? (
                  /* RUN HISTORY LIST VIEW */
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Recent Autonomous Executions
                    </h3>
                    {runs.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        No agent runs recorded yet. Submit a goal below to trigger execution.
                      </div>
                    ) : (
                      runs.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => {
                            setActiveRun(r);
                            setSelectedRunTab("active");
                          }}
                          className={clsx(
                            "p-3.5 rounded-xl border text-xs cursor-pointer transition-all hover:border-indigo-500/40",
                            activeRun?.id === r.id
                              ? "bg-indigo-950/40 border-indigo-500/50"
                              : "bg-black/30 border-white/6 hover:bg-white/5"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded">
                              {r.trigger_type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(r.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="font-semibold text-white line-clamp-2 leading-relaxed">
                            {r.goal}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                            <span>{r.reasoning_trace?.length || 0} trace step(s)</span>
                            <span
                              className={clsx(
                                "font-bold font-mono text-[10px]",
                                r.status === "COMPLETED" || r.status === "COMPLETED_WITH_FALLBACK"
                                  ? "text-emerald-400"
                                  : r.status === "AWAITING_APPROVAL"
                                  ? "text-amber-400"
                                  : "text-slate-400"
                              )}
                            >
                              {r.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* ACTIVE RUN VIEW */
                  <>
                    {/* Natural Language Command Bar */}
                    <div className="space-y-2">
                      <form onSubmit={handleCustomGoalSubmit} className="relative">
                        <input
                          type="text"
                          value={promptInput}
                          onChange={(e) => setPromptInput(e.target.value)}
                          placeholder="Command agent: 'Prepare me for Razorpay SDE-2 in 3 days'..."
                          disabled={isExecuting}
                          className="w-full bg-black/50 border border-white/12 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none pr-12 transition-all shadow-inner font-sans"
                        />
                        <button
                          type="submit"
                          disabled={isExecuting || !promptInput.trim()}
                          className="absolute right-2 top-2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                          title="Execute Goal"
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
                          Quick Presets:
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handlePresetTrigger(
                              "Prepare me for a Backend SDE interview at Razorpay in 3 days. Focus on PostgreSQL MVCC, Kafka, and idempotency."
                            )
                          }
                          disabled={isExecuting}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-[11px] text-indigo-300 transition-all font-medium flex items-center gap-1"
                        >
                          <span>🏢 Razorpay Backend Prep</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handlePresetTrigger(
                              "Audit my Career Digital Twin for high-claimed skills with low verification confidence and flag resume bluff risks."
                            )
                          }
                          disabled={isExecuting}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-[11px] text-rose-300 transition-all font-medium flex items-center gap-1"
                        >
                          <ShieldAlert className="w-3 h-3 text-rose-400" />
                          <span>🚨 Audit Bluff Risks</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handlePresetTrigger(
                              "Find high-leverage overlapping topics across all my active job applications and inject a unified sprint."
                            )
                          }
                          disabled={isExecuting}
                          className="px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-[11px] text-pink-300 transition-all font-medium flex items-center gap-1"
                        >
                          <Layers className="w-3 h-3 text-pink-400" />
                          <span>⚡ Multi-Company Overlap</span>
                        </button>
                      </div>
                    </div>

                    {/* Active Run Goal Summary Header */}
                    {activeRun && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 to-black/40 border border-indigo-500/25 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            Active Autonomous Goal
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {activeRun.id.slice(0, 16)}...
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
                          &ldquo;{activeRun.goal}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Live Reasoning Trace Timeline */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-indigo-400" />
                          Glass-Box Execution Trace
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400">
                          {activeRun?.reasoning_trace?.length || 0} Step(s) Recorded
                        </span>
                      </div>

                      {/* If no steps */}
                      {(!activeRun?.reasoning_trace ||
                        activeRun.reasoning_trace.length === 0) && (
                        <div className="p-6 rounded-xl bg-black/20 border border-white/5 text-center text-xs text-slate-500">
                          No trace recorded for this run. Submit a goal to watch the agent think and execute.
                        </div>
                      )}

                      {/* Render Each Step */}
                      <div className="pt-2">
                        {activeRun?.reasoning_trace?.map((step, idx) => (
                          <TraceStepRow
                            key={`${step.step_number}-${idx}`}
                            step={step}
                            isLatest={idx === activeRun.reasoning_trace.length - 1}
                          />
                        ))}
                      </div>

                      {/* Executing Pulse Indicator */}
                      {isExecuting && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-300 text-xs animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                          <span>Autonomous agent synthesizing next action step...</span>
                        </div>
                      )}
                    </div>

                    {/* Final Executive Summary & Action Gate */}
                    {activeRun?.final_summary && (
                      <div className="p-4 rounded-xl bg-[#0d1428] border border-emerald-500/30 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Platform Mutation Executive Summary</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans">
                          {activeRun.final_summary}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/8">
                          <Link
                            href="/readiness"
                            onClick={closeDrawer}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs text-emerald-300 font-semibold transition-all flex items-center gap-1.5"
                          >
                            <Target className="w-3.5 h-3.5" />
                            <span>View Readiness Milestones</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href="/tracker"
                            onClick={closeDrawer}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs text-cyan-300 font-semibold transition-all flex items-center gap-1.5"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Open Seeded Kanban (4 Jobs)</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href="/resume"
                            onClick={closeDrawer}
                            className="px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-xs text-purple-300 font-semibold transition-all flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Review Staged Resume Diff</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
