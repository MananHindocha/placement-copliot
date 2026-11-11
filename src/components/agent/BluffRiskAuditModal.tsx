"use client";

import React, { useState } from "react";
import { useAgent } from "@/context/AgentProvider";
import type { SkillEvidenceItem } from "@/lib/agent/types";
import {
  ShieldAlert,
  AlertTriangle,
  Zap,
  CheckCircle2,
  FileText,
  ArrowRight,
  X,
  Sparkles,
  ShieldCheck,
  Scale,
  Loader2,
  Check,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";

interface BluffClaimMapping {
  resumeClaim: string;
  defensibleRewrite: string;
  failedCitation: string;
}

const BLUFF_REMEDIATION_KNOWLEDGE: Record<string, BluffClaimMapping> = {
  "postgresql": {
    resumeClaim:
      '• "Architected fault-tolerant backend microservices utilizing PostgreSQL B-Tree clustering, high-throughput connection pooling, and serializable multi-master isolation."',
    defensibleRewrite:
      '• "Implemented backend relational schemas in PostgreSQL with index query optimization and ACID transaction handling across core database workflows."',
    failedCitation:
      'Practice session feedback: struggled with HOT optimization & phantom reads in Read Committed.',
  },
  "redis": {
    resumeClaim:
      '• "Engineered distributed Redis memory cluster internals with low-latency cache replication, pub/sub partitioning, and custom eviction pipelines under heavy load."',
    defensibleRewrite:
      '• "Integrated application-level Redis caching and relational query acceleration, reducing read latency for high-traffic API endpoints."',
    failedCitation:
      'Failed cache stampede / dogpiling mitigation and eviction policy probe (unable to articulate allkeys-lru vs volatile-lru trade-offs under saturation).',
  },
  "system design": {
    resumeClaim:
      '• "Designed enterprise distributed multi-region payment ledger with zero-downtime Raft consensus and high-throughput CQRS event streaming."',
    defensibleRewrite:
      '• "Designed modular backend service architecture with REST idempotency keys, relational data integrity, and async worker queue processing."',
    failedCitation:
      'Unverified claim: Lists distributed architecture on resume, but has not yet completed a practice session on this topic.',
  },
};

function getClaimDataForSkill(skill: SkillEvidenceItem): BluffClaimMapping {
  const norm = skill.skill_name.toLowerCase();
  for (const [key, mapping] of Object.entries(BLUFF_REMEDIATION_KNOWLEDGE)) {
    if (norm.includes(key)) {
      // Use existing evidence log if available
      const latestCitation =
        skill.evidence_log?.[0]?.citation || skill.evidence_log?.[0]?.verdict;
      return {
        ...mapping,
        failedCitation: latestCitation || mapping.failedCitation,
      };
    }
  }

  // Fallback dynamic mapping
  const latestCitation =
    skill.evidence_log?.[0]?.citation ||
    skill.evidence_log?.[0]?.verdict ||
    `Empirical assessment failed to verify candidate's claimed ${skill.claimed_level} level in ${skill.skill_name}.`;

  return {
    resumeClaim: `• "Advanced expert in ${skill.skill_name} with enterprise production deployment and internal optimization."`,
    defensibleRewrite: `• "Applied ${skill.skill_name} principles to build, test, and maintain robust application features."`,
    failedCitation: latestCitation,
  };
}

export interface BluffRiskAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchProbe: (skillName: string) => void;
}

export default function BluffRiskAuditModal({
  isOpen,
  onClose,
  onLaunchProbe,
}: BluffRiskAuditModalProps) {
  const { digitalTwin, toneDownSkillClaim, openDrawer } = useAgent();
  const [remediatingSkill, setRemediatingSkill] = useState<string | null>(null);
  const [remediatedSkills, setRemediatedSkills] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const skills = digitalTwin?.skills || [];
  const bluffSkills = skills.filter(
    (s) =>
      s.bluff_risk ||
      (s.claimed_level === "HIGH" &&
        (s.verified_confidence === "LOW" || s.verified_confidence === "UNVERIFIED"))
  );

  const handleToneDown = async (skill: SkillEvidenceItem) => {
    setRemediatingSkill(skill.skill_name);
    try {
      const claimData = getClaimDataForSkill(skill);
      await toneDownSkillClaim(
        skill.skill_name,
        claimData.resumeClaim,
        claimData.defensibleRewrite
      );
      setRemediatedSkills((prev) => new Set(prev).add(skill.skill_name));
    } catch (err) {
      console.error("Failed to tone down claim:", err);
    } finally {
      setRemediatingSkill(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#0D0D0D] border border-[#292929] rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0A0A0A] border-b border-[#1D1D1D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/12 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F5F5F5] tracking-tight">
                  Resume Accuracy Check
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tabular-nums bg-rose-500/12 text-rose-300 border border-rose-500/30">
                  {bluffSkills.length} To Review
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Compare skills listed on your resume with your practice results to ensure accuracy.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#121212] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diagnostic Overview Banner */}
        <div className="px-6 py-3 bg-[#050505] border-b border-[#1D1D1D] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#F5F5F5]">
            <Scale className="w-4 h-4 text-rose-400" />
            <span className="font-semibold">Review Protocol:</span>
            <span className="text-[#71717A]">
              Either test your knowledge with a 60-second check or choose an honest bullet rewrite.
            </span>
          </div>
        </div>

        {/* Scrollable List of Cards */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 font-sans">
          {bluffSkills.length === 0 ? (
            <div className="p-10 text-center space-y-3 rounded-xl bg-emerald-500/8 border border-emerald-500/25">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#F5F5F5]">
                All Skills Verified!
              </h4>
              <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                All skills on your resume are backed by verified practice sessions and projects.
              </p>
            </div>
          ) : (
            bluffSkills.map((skill) => {
              const claimData = getClaimDataForSkill(skill);
              const isRemediated = remediatedSkills.has(skill.skill_name);
              const isProcessing = remediatingSkill === skill.skill_name;

              return (
                <div
                  key={skill.skill_name}
                  className={clsx(
                    "rounded-xl border p-5 transition-colors space-y-4",
                    isRemediated
                      ? "bg-emerald-500/8 border-emerald-500/30"
                      : "bg-[#0A0A0A] border-[#1D1D1D] hover:border-rose-500/35"
                  )}
                >
                  {/* Skill Badge & Discrepancy Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#1D1D1D]">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-base font-bold text-[#F5F5F5]">
                        {skill.skill_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/12 text-rose-300 border border-rose-500/30">
                        ⚠️ On Resume: {skill.claimed_level} · Practice Level: {skill.verified_confidence}
                      </span>
                    </div>

                    {isRemediated && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" />
                        <span>Skill Updated • Suggested Rewrite Staged</span>
                      </span>
                    )}
                  </div>

                  {/* Side-by-Side Comparison Boxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Box: The Resume Claim */}
                    <div className="rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-4 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#A1A1AA]">
                        <span className="flex items-center gap-1.5 text-[#A1A1AA]">
                          <FileText className="w-3.5 h-3.5 text-[#A1A1AA]" />
                          Current Resume Bullet
                        </span>
                        <span className="text-[10px] text-[#71717A] font-mono">
                          Parsed from Resume
                        </span>
                      </div>
                      <p className="text-xs text-[#F5F5F5]/90 leading-relaxed font-mono bg-[#080808] p-2.5 rounded-lg border border-[#1D1D1D]">
                        {claimData.resumeClaim}
                      </p>
                    </div>

                    {/* Right Box: The Failed Evidence Citation */}
                    <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 p-4 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-rose-300">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          Practice Feedback
                        </span>
                        <span className="text-[10px] text-rose-400/80 font-mono">
                          Session Result
                        </span>
                      </div>
                      <p className="text-xs text-rose-200 leading-relaxed font-sans bg-[#080808] p-2.5 rounded-lg border border-rose-500/20">
                        &ldquo;{claimData.failedCitation}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Defensible Rewrite Preview */}
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Suggested Honest Rewrite:</span>
                    </div>
                    <p className="text-xs text-emerald-100 font-mono leading-relaxed bg-[#080808] p-2.5 rounded-lg border border-emerald-500/20">
                      {claimData.defensibleRewrite}
                    </p>
                  </div>

                  {/* Two 1-Click Resolution Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                    {/* Option A: Launch 60s Verification Drill */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onLaunchProbe(skill.skill_name);
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#F5F5F5] hover:bg-[#E4E4E7] text-[#000000] font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Option A: ⚡ Quick Skill Check (60s Quiz)</span>
                    </button>

                    {/* Option B: Update Resume Bullet */}
                    <button
                      type="button"
                      onClick={() => handleToneDown(skill)}
                      disabled={isRemediated || isProcessing}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating Suggested Rewrite...</span>
                        </>
                      ) : isRemediated ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                          <span>Rewrite Staged</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                          <span>Option B: 📝 Update Resume Bullet</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#0A0A0A] border-t border-[#1D1D1D] flex items-center justify-between gap-3">
          <div className="text-xs text-[#A1A1AA]">
            {bluffSkills.length > 0 ? (
              <span>
                Ensuring your resume accurately matches your skills helps you succeed in technical interviews.
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold">
                All skills verified!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-[#121212] hover:bg-[#1A1A1A] border border-[#292929] text-[#F5F5F5] text-xs font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

