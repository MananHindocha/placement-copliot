"use client";

import React, { useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAgent } from "@/context/AgentProvider";
import type { AgentTraceStep } from "@/lib/agent/types";

const ROLE_PRESETS = [
  "Backend Software Engineer",
  "Full-Stack Engineer",
  "AI / ML Engineer",
  "Frontend Engineer",
  "Data & Analytics Engineer",
  "DevOps / Cloud Engineer",
];

export function IntegratedRobotNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    digitalTwin,
    parsedResume,
    uploadedFileName,
    targetRole,
    setTargetRole,
    activeRun,
    pendingApprovals,
    isUploadingResume,
    isExecutingAgent,
    agentError,
    clearAgentError,
    uploadResumeForRole,
    triggerAgent,
    resolveApproval,
    resetWorkspaceToZero,
  } = useAgent();

  const [customRoleInput, setCustomRoleInput] = useState(targetRole || "");
  const [customGoalInput, setCustomGoalInput] = useState("");
  const [showTraceLog, setShowTraceLog] = useState(false);

  const hasExtractedResume = Boolean(
    parsedResume || (digitalTwin && Array.isArray(digitalTwin.skills) && digitalTwin.skills.length > 0)
  );
  const isBusy = isUploadingResume || isExecutingAgent;

  const handleSelectRole = (role: string) => {
    setCustomRoleInput(role);
    setTargetRole(role);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const roleToUse = customRoleInput.trim() || targetRole.trim();
    await uploadResumeForRole(file, roleToUse);
    e.target.value = "";
  };

  const handleDropFile = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const roleToUse = customRoleInput.trim() || targetRole.trim();
    await uploadResumeForRole(file, roleToUse);
  };

  const handleScoutLiveJobs = async () => {
    const role = targetRole || customRoleInput || "Software Engineer";
    await triggerAgent({
      triggerType: "USER_GOAL_SUBMITTED",
      entityId: "live-job-scout",
      goalPrompt: `Use auto_seed_kanban_pipeline to scout 4 real live job openings for "${role}" and save them to my Kanban applications tracker.`,
    });
    router.push("/applications");
  };

  const handleBuildReadinessSprint = async () => {
    const role = targetRole || customRoleInput || "Software Engineer";
    const missingList =
      parsedResume?.missingSkillsForTargetRole?.map((m) => m.skill).join(", ") ||
      digitalTwin?.bluffRiskSkills?.join(", ") ||
      "core role competencies";
    await triggerAgent({
      triggerType: "USER_GOAL_SUBMITTED",
      entityId: "readiness-sprint-gen",
      goalPrompt: `Use inject_readiness_sprint to create a focused preparation checklist for "${role}" covering my missing/weak skills: ${missingList}.`,
    });
    router.push("/readiness");
  };

  const handleCustomCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoalInput.trim()) return;
    await triggerAgent({
      triggerType: "USER_GOAL_SUBMITTED",
      entityId: "custom-user-command",
      goalPrompt: customGoalInput.trim(),
    });
    setCustomGoalInput("");
    setShowTraceLog(true);
  };

  const traceSteps: AgentTraceStep[] = Array.isArray((activeRun as any)?.trace)
    ? (activeRun as any).trace
    : Array.isArray(activeRun?.reasoning_trace)
    ? activeRun.reasoning_trace
    : [];

  return (
    <section className="w-full mb-6 rounded-2xl border border-cyan-500/30 bg-slate-950/90 backdrop-blur-xl p-5 shadow-2xl text-slate-100">
      {/* Honest Error Alert Banner (Rule 6: Never hide errors behind fake fallbacks) */}
      {agentError && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-500/50 bg-red-950/60 px-4 py-3 text-sm text-red-200">
          <div>
            <span className="font-bold text-red-400">Agent Error: </span>
            <span>{agentError}</span>
          </div>
          <button
            onClick={clearAgentError}
            className="ml-4 rounded-lg bg-red-900/60 px-3 py-1 text-xs font-medium text-red-100 hover:bg-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Robot Header + Conversational Guidance */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Expressive Animated Robot Avatar */}
          <div
            className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${
              isBusy
                ? "border-amber-400 bg-amber-500/10 animate-pulse"
                : hasExtractedResume
                ? "border-emerald-400/60 bg-emerald-500/10"
                : "border-cyan-400/60 bg-cyan-500/10"
            }`}
          >
            <svg className="h-9 w-9 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="7" width="18" height="13" rx="4" />
              <circle cx="9" cy="13" r="1.5" fill="currentColor" />
              <circle cx="15" cy="13" r="1.5" fill="currentColor" />
              <path d="M9 17h6" strokeLinecap="round" />
              <path d="M12 3v4" strokeLinecap="round" />
              <circle cx="12" cy="3" r="1" fill="currentColor" />
            </svg>
            <span
              className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-slate-950 ${
                isBusy ? "bg-amber-400 animate-ping" : hasExtractedResume ? "bg-emerald-400" : "bg-cyan-400"
              }`}
            />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Autonomous Placement Agent
              </span>
              {targetRole && (
                <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium text-cyan-300">
                  Target Role: {targetRole}
                </span>
              )}
              {uploadedFileName && (
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                  Resume: {uploadedFileName}
                </span>
              )}
            </div>

            {/* Dynamic Robot Speech Prompt Based on Current Stage */}
            <p className="text-base font-medium text-slate-100">
              {isUploadingResume
                ? `Scanning your PDF resume with Gemini for "${targetRole || customRoleInput}"...`
                : isExecutingAgent
                ? "Executing autonomous agent tools on your Supabase workspace..."
                : !targetRole
                ? "Step 1: Which role are you aspiring for? Pick or type your target role below so I know how to evaluate your resume."
                : !hasExtractedResume
                ? `Step 2: Great! You're aiming for "${targetRole}". Upload your real PDF resume below so I can extract your skills and find gaps for this role.`
                : `Your resume is analyzed for "${targetRole}" (${digitalTwin?.skills?.length || parsedResume?.extractedSkills?.length || 0} skills tracked, Readiness: ${(digitalTwin as any)?.readinessScore ?? digitalTwin?.profileSummary?.readinessScore ?? 0}%). What would you like me to do next?`}
            </p>
          </div>
        </div>

        {/* Right Controls: Trace Toggle & Reset */}
        <div className="flex items-center gap-2 self-end lg:self-center">
          {traceSteps.length > 0 && (
            <button
              type="button"
              onClick={() => setShowTraceLog((prev) => !prev)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300"
            >
              {showTraceLog ? "Hide Agent Trace" : `View Agent Trace (${traceSteps.length} steps)`}
            </button>
          )}
          {(targetRole || hasExtractedResume) && (
            <button
              type="button"
              onClick={resetWorkspaceToZero}
              className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-400 hover:border-red-500/40 hover:text-red-300"
            >
              Change Role / New Resume
            </button>
          )}
        </div>
      </div>

      {/* STAGE 1: TARGET ROLE SELECTION FIRST */}
      {!targetRole && (
        <div className="mt-5 space-y-3 border-t border-slate-800/80 pt-4">
          <div className="flex flex-wrap gap-2">
            {ROLE_PRESETS.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => handleSelectRole(role)}
                className="rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-200"
              >
                {role}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customRoleInput}
              onChange={(e) => setCustomRoleInput(e.target.value)}
              placeholder="Or type any custom role (e.g., Golang Backend Intern, Computer Vision Engineer)..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="button"
              disabled={!customRoleInput.trim()}
              onClick={() => handleSelectRole(customRoleInput.trim())}
              className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-40"
            >
              Lock Target Role →
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: REAL PDF RESUME UPLOAD FOR SELECTED TARGET ROLE */}
      {targetRole && !hasExtractedResume && (
        <div className="mt-5 border-t border-slate-800/80 pt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            onChange={handleFileSelected}
            className="hidden"
          />
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropFile}
            onClick={() => !isUploadingResume && fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
              isUploadingResume
                ? "border-amber-400/60 bg-amber-500/5"
                : "border-cyan-500/40 bg-slate-900/50 hover:border-cyan-400 hover:bg-cyan-500/5"
            }`}
          >
            <p className="text-sm font-semibold text-slate-100">
              {isUploadingResume
                ? "Uploading & Running Gemini Multimodal PDF Extraction..."
                : `Click to Upload Your Real PDF Resume (or Drag & Drop Here)`}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Your resume will be evaluated specifically against <span className="text-cyan-300 font-medium">{targetRole}</span> requirements. No fake sample resumes or hardcoded stats.
            </p>
          </div>
        </div>
      )}

      {/* STAGE 3: CHOICE-DRIVEN NAVIGATION & AUTOMATION OPTIONS (AFTER REAL UPLOAD) */}
      {hasExtractedResume && (
        <div className="mt-5 space-y-4 border-t border-slate-800/80 pt-4">
          {/* Clickable Choice Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleScoutLiveJobs}
              className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                pathname?.includes("/applications") || pathname?.includes("/jobs")
                  ? "border-cyan-400 bg-cyan-500/15"
                  : "border-slate-800 bg-slate-900/80 hover:border-cyan-500/50"
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Option 1 • Live Jobs</span>
              <span className="mt-1 text-sm font-semibold text-slate-100">Scout & Track Real Jobs</span>
              <span className="mt-1 text-xs text-slate-400">
                Fetches live remote openings for {targetRole || "your role"} & adds deadlines to Kanban.
              </span>
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={handleBuildReadinessSprint}
              className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                pathname?.includes("/readiness")
                  ? "border-cyan-400 bg-cyan-500/15"
                  : "border-slate-800 bg-slate-900/80 hover:border-cyan-500/50"
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Option 2 • Study Plan</span>
              <span className="mt-1 text-sm font-semibold text-slate-100">Cover Missing Skills</span>
              <span className="mt-1 text-xs text-slate-400">
                Builds your Readiness checklist from your resume gaps & tracks completion %.
              </span>
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => router.push("/interview")}
              className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                pathname?.includes("/interview")
                  ? "border-cyan-400 bg-cyan-500/15"
                  : "border-slate-800 bg-slate-900/80 hover:border-cyan-500/50"
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Option 3 • Mock Interview</span>
              <span className="mt-1 text-sm font-semibold text-slate-100">Practice with AI Interviewer</span>
              <span className="mt-1 text-xs text-slate-400">
                Back-and-forth technical interview probing your resume projects & weak spots.
              </span>
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => router.push("/applications")}
              className="flex flex-col items-start rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 text-left transition hover:border-cyan-500/50"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Option 4 • Deadlines</span>
              <span className="mt-1 text-sm font-semibold text-slate-100">Open Kanban Pipeline</span>
              <span className="mt-1 text-xs text-slate-400">
                Track {digitalTwin?.activeApplications?.length ?? 0} active applications and upcoming OA/interview dates.
              </span>
            </button>
          </div>

          {/* Staged Resume Diff Approval Gate (If Pending in Supabase) */}
          {pendingApprovals.length > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Human-in-the-Loop Approval Required ({pendingApprovals.length} Staged Resume Diff)
                </span>
              </div>
              {pendingApprovals.slice(0, 1).map((item: any) => {
                const changes = item.payload_diff?.proposedBulletChanges || [];
                return (
                  <div key={item.id} className="mt-2 space-y-2">
                    {changes.map((c: any, idx: number) => (
                      <div key={idx} className="rounded-lg bg-slate-900/90 p-3 text-xs space-y-1">
                        <p className="text-red-300 line-through">- {c.originalBullet}</p>
                        <p className="text-emerald-300 font-medium">+ {c.proposedBullet}</p>
                        <p className="text-slate-400">Source Project: {c.verifiedSourceProject}</p>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => resolveApproval(item.id, "APPROVED")}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                      >
                        Approve & Apply to Resume
                      </button>
                      <button
                        type="button"
                        onClick={() => resolveApproval(item.id, "REJECTED")}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Free-form Natural Language Command Bar */}
          <form onSubmit={handleCustomCommandSubmit} className="flex gap-2">
            <input
              type="text"
              value={customGoalInput}
              onChange={(e) => setCustomGoalInput(e.target.value)}
              placeholder="Or tell the agent what to do (e.g. 'Find overlapping topics across my active job applications')..."
              className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isBusy || !customGoalInput.trim()}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-40"
            >
              Run Agent
            </button>
          </form>
        </div>
      )}

      {/* Collapsible Live Backend Tool Execution Trace */}
      {showTraceLog && traceSteps.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/95 p-4 text-xs font-mono space-y-2">
          <div className="text-slate-400 font-sans font-semibold">
            Live Supabase Agent Run Trace (Status: <span className="text-cyan-300">{activeRun?.status}</span>):
          </div>
          {traceSteps.map((step: AgentTraceStep, idx: number) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/70 pb-1.5 gap-1">
              <div>
                <span className="text-cyan-400">[{step.tool_name}]</span>{" "}
                <span className="text-slate-200">{step.output_summary}</span>
              </div>
              <span className="text-slate-500 shrink-0">{step.latency_ms}ms • {step.status}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default IntegratedRobotNavigator;
