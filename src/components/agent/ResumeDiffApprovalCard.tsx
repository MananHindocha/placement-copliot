"use client";

import React, { useState } from "react";
import { useAgent } from "@/context/AgentProvider";
import type { AgentApprovalRecord } from "@/lib/agent/types";
import type { ProposedBulletChange } from "@/lib/agent/tools-write";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  FileText,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Tag,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { clsx } from "clsx";

export function ResumeDiffApprovalCard({
  specificApproval,
  onResolved,
}: {
  specificApproval?: AgentApprovalRecord;
  onResolved?: () => void;
}) {
  const { pendingApprovals, resolveApproval } = useAgent();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // If specific approval provided, use it; otherwise render all pending RESUME_DIFF approvals
  const approvalsToRender = specificApproval
    ? [specificApproval]
    : pendingApprovals.filter((a) => a.action_type === "RESUME_DIFF" && a.status === "PENDING");

  if (approvalsToRender.length === 0) return null;

  const handleDecision = async (
    approvalId: string,
    decision: "APPROVED" | "REJECTED"
  ) => {
    setResolvingId(approvalId);
    try {
      await resolveApproval(approvalId, decision);
      onResolved?.();
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {approvalsToRender.map((approval) => {
        const payload = approval.payload_diff || {};
        const targetRole = payload.targetRole || "Target Engineering Role";
        const jobId = payload.jobId || approval.target_entity_id || "job-listing";
        const bulletChanges: ProposedBulletChange[] = payload.proposedBulletChanges || [];
        const atsLift = payload.estimatedAtsScoreDelta || 8;
        const isResolving = resolvingId === approval.id;

        return (
          <Card
            key={approval.id}
            className="p-5 md:p-6 bg-gradient-to-br from-[#120D24] via-[#0E1026] to-[#0A0D1F] border-purple-500/40 shadow-2xl space-y-5 animate-fadeIn rounded-2xl"
          >
            {/* ─── HEADER: ROLE, STATUS & ATS LIFT ─── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/8 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Suggested Resume Improvements
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Waiting for your review
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Target Role: <strong className="text-white">{targetRole}</strong>{" "}
                  <span className="text-slate-500 font-mono">({jobId})</span> · Based on your real project experience.
                </p>
              </div>

              {/* ATS Lift Metric Pill */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>+{atsLift}% Resume Score Boost</span>
                </div>
              </div>
            </div>

            {/* ─── PROPOSED BULLET DIFFS ─── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">
                  Suggested Bullet Rewrites ({bulletChanges.length})
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Before and After
                </span>
              </div>

              <div className="space-y-3">
                {bulletChanges.map((change, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-white/8 bg-black/40 p-4 space-y-3 overflow-hidden"
                  >
                    {/* Provenance Badge */}
                    <div className="flex items-center justify-between text-[11px] flex-wrap gap-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-[10px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>From your project: <strong>{change.verifiedSourceProject}</strong></span>
                      </div>

                      {change.keywordsAdded && change.keywordsAdded.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-slate-500 font-mono">Added:</span>
                          {change.keywordsAdded.map((kw: string) => (
                            <span
                              key={kw}
                              className="px-2 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono"
                            >
                              +{kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Red Strikethrough Original Bullet */}
                    <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-200 text-xs font-mono leading-relaxed line-through decoration-rose-400/80">
                      <span className="font-bold text-rose-400 mr-2 select-none">-</span>
                      <span>{change.originalBullet}</span>
                    </div>

                    {/* Green Highlighted Proposed Bullet */}
                    <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 text-xs font-mono leading-relaxed shadow-sm">
                      <span className="font-bold text-emerald-400 mr-2 select-none">+</span>
                      <span>{change.proposedBullet}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── ACTION BAR (APPROVE OR REJECT) ─── */}
            <div className="pt-3 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 font-sans">
                Approving applies these rewrites to your resume. Skipping keeps your original text.
              </span>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={isResolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                  onClick={() => handleDecision(approval.id, "REJECTED")}
                  disabled={isResolving}
                  className="w-full sm:w-auto border-rose-500/30 hover:border-rose-500/60 text-rose-300 hover:bg-rose-500/10 text-xs"
                >
                  Skip Changes
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  icon={isResolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />}
                  onClick={() => handleDecision(approval.id, "APPROVED")}
                  disabled={isResolving}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
                >
                  Apply to Resume
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default ResumeDiffApprovalCard;
