"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAgent } from "@/context/AgentProvider";
import type { SkillEvidenceItem, ConfidenceTier, ClaimedLevel } from "@/lib/agent/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import SkillMicroProbeModal from "@/components/agent/SkillMicroProbeModal";
import BluffRiskAuditModal from "@/components/agent/BluffRiskAuditModal";
import {
  Brain,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Target,
  FileCheck,
  Zap,
  TrendingUp,
  X,
  Mic,
  BookOpen,
} from "lucide-react";
import { clsx } from "clsx";

const CONFIDENCE_BADGES: Record<
  ConfidenceTier,
  { label: string; badge: string; color: string; barWidth: string }
> = {
  UNVERIFIED: {
    label: "Unverified",
    badge: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    color: "text-slate-400",
    barWidth: "w-1/12 bg-slate-600",
  },
  LOW: {
    label: "Low (Needs Drill)",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    color: "text-amber-400",
    barWidth: "w-1/3 bg-amber-500",
  },
  MEDIUM: {
    label: "Medium Verified",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    color: "text-sky-400",
    barWidth: "w-2/3 bg-sky-500",
  },
  HIGH: {
    label: "High Bar-Raiser",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    color: "text-emerald-400",
    barWidth: "w-full bg-emerald-500",
  },
};

const CLAIMED_BADGES: Record<ClaimedLevel, { label: string; style: string }> = {
  LOW: { label: "Resume Claim: Novice", style: "bg-slate-800 text-slate-400 border-slate-700" },
  MEDIUM: { label: "Resume Claim: Working", style: "bg-indigo-950/60 text-indigo-300 border-indigo-500/20" },
  HIGH: { label: "Resume Claim: Expert", style: "bg-purple-950/60 text-purple-300 border-purple-500/30" },
};

function SkillEvidenceCard({
  skill,
  onVerifyDrill,
}: {
  skill: SkillEvidenceItem;
  onVerifyDrill: (skillName: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const confConfig = CONFIDENCE_BADGES[skill.verified_confidence] || CONFIDENCE_BADGES.UNVERIFIED;
  const claimedConfig = CLAIMED_BADGES[skill.claimed_level] || CLAIMED_BADGES.MEDIUM;
  const evidenceCount = skill.evidence_log?.length || 0;

  return (
    <div
      className={clsx(
        "rounded-2xl border transition-all duration-200 overflow-hidden",
        skill.bluff_risk
          ? "bg-gradient-to-br from-[#1c0c14]/90 via-[#140810]/90 to-[#0b0609]/90 border-rose-500/40 shadow-lg shadow-rose-950/30"
          : "bg-[#0b1020]/90 hover:bg-[#10172e]/90 border-white/8 hover:border-indigo-500/30"
      )}
    >
      {/* Top Banner if Bluff Risk */}
      {skill.bluff_risk && (
        <div className="px-4 py-1.5 bg-rose-500/20 border-b border-rose-500/30 flex items-center justify-between text-xs font-semibold text-rose-300 animate-pulse">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>⚠️ Resume Bluff Risk Detected</span>
          </div>
          <span className="text-[10px] font-mono text-rose-400">
            Claimed {skill.claimed_level} vs Verified {skill.verified_confidence}
          </span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header: Skill Name & Claimed Level */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>{skill.skill_name}</span>
              {skill.verified_confidence === "HIGH" && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </h4>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={clsx(
                  "px-2 py-0.5 rounded-full text-[10px] font-medium border",
                  claimedConfig.style
                )}
              >
                {claimedConfig.label}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span
              className={clsx(
                "px-2.5 py-1 rounded-full text-xs font-mono font-bold border inline-block",
                confConfig.badge
              )}
            >
              {confConfig.label}
            </span>
          </div>
        </div>

        {/* 4-Step Damped Ladder Meter */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Damped Confidence Ladder:</span>
            <span className={confConfig.color}>{skill.verified_confidence}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden border border-white/5">
            <div className={clsx("h-full transition-all duration-500 rounded-full", confConfig.barWidth)} />
          </div>
        </div>

        {/* Action Controls & Evidence Toggle */}
        <div className="pt-2 border-t border-white/6 flex items-center justify-between flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer select-none"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {evidenceCount} Evidence Citation{evidenceCount !== 1 ? "s" : ""}
            </span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onVerifyDrill(skill.skill_name)}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-semibold text-[11px] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer",
              skill.bluff_risk
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30 animate-pulse"
                : skill.verified_confidence === "UNVERIFIED" || skill.verified_confidence === "LOW"
                ? "bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white shadow-amber-900/20"
                : "bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30"
            )}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>⚡ Challenge / Verify Skill (60s Probe)</span>
          </button>
        </div>

        {/* Expandable Evidence Citation Log Timeline */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/8 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              <span>Transparent Evidence Audit Log</span>
              <span>Latest 10 Citations</span>
            </div>

            {evidenceCount === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-black/30 rounded-lg text-center">
                No verified citations recorded yet. Complete mock interviews or drills to prove competency.
              </p>
            ) : (
              <div className="space-y-2">
                {skill.evidence_log.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-indigo-300">
                        {ev.source}
                      </span>
                      <span>{new Date(ev.timestamp).toLocaleDateString()}</span>
                    </div>

                    <p className="text-slate-200 leading-relaxed font-sans font-medium text-[11px]">
                      &ldquo;{ev.citation || ev.verdict}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function DigitalTwinMatrix() {
  const { digitalTwin, triggerAgent, bluffRiskCount } = useAgent();
  const [filterMode, setFilterMode] = useState<"all" | "bluff" | "high" | "unverified">("all");
  const [showRemediationModal, setShowRemediationModal] = useState(false);
  const [probeSkill, setProbeSkill] = useState<string | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const skills = digitalTwin?.skills || [];

  const filteredSkills = skills.filter((s) => {
    if (filterMode === "bluff") return s.bluff_risk;
    if (filterMode === "high") return s.verified_confidence === "HIGH";
    if (filterMode === "unverified") return s.verified_confidence === "UNVERIFIED";
    return true;
  });

  const handleVerifyDrill = (skillName: string) => {
    setProbeSkill(skillName);
  };

  const handleAuditAllBluffRisks = () => {
    setIsAuditModalOpen(true);
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-[#0B0F1E] via-[#0E152B] to-[#0B0F1E] border-indigo-500/30 shadow-2xl space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/8 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Evidence-Backed Career Digital Twin
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Deterministic 4-Tier Ladder
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every claimed skill is stress-tested against mock interview transcripts and project reviews.
          </p>
        </div>

        {/* Global Bluff Alert Pill & Audit Action */}
        <div className="flex items-center gap-2 flex-wrap">
          {bluffRiskCount > 0 && (
            <button
              type="button"
              onClick={handleAuditAllBluffRisks}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-rose-950/30 cursor-pointer animate-pulse"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Audit {bluffRiskCount} Bluff Risk(s)</span>
            </button>
          )}

          <Link
            href="/interview"
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center gap-1 shadow-md shadow-indigo-600/30"
          >
            <span>Practice Interviews</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ─── METRIC COUNTERS & FILTER TABS ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/8 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
              filterMode === "all"
                ? "bg-indigo-600 text-white font-bold shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            All Tracked Skills ({skills.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("bluff")}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer",
              filterMode === "bluff"
                ? "bg-rose-600 text-white font-bold shadow-sm"
                : "text-rose-400 hover:text-rose-300"
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Bluff Risks ({bluffRiskCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("high")}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
              filterMode === "high"
                ? "bg-emerald-600 text-white font-bold shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            Bar-Raiser High ({skills.filter((s) => s.verified_confidence === "HIGH").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("unverified")}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
              filterMode === "unverified"
                ? "bg-slate-700 text-white font-bold shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
          >
            Unverified ({skills.filter((s) => s.verified_confidence === "UNVERIFIED").length})
          </button>
        </div>

        {/* Explanation Note */}
        <div className="text-[11px] text-slate-400 font-mono hidden lg:block">
          🪜 <strong>Damped Ladder:</strong> Moves at most +1 tier per mock interview positive verdict.
        </div>
      </div>

      {/* ─── SKILL MATRIX GRID ─── */}
      {filteredSkills.length === 0 ? (
        <div className="p-10 rounded-2xl bg-black/30 border border-white/6 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-300">
            No skills matching &quot;{filterMode}&quot; filter.
          </p>
          <p className="text-xs text-slate-500">
            All tracked skills in your Career Digital Twin are verified or meet baseline confidence.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSkills.map((skill) => (
            <SkillEvidenceCard
              key={skill.skill_name}
              skill={skill}
              onVerifyDrill={handleVerifyDrill}
            />
          ))}
        </div>
      )}

      {/* ─── QUICK BLUFF REMEDIATION MODAL ─── */}
      {showRemediationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative w-full max-w-xl bg-gradient-to-br from-[#120a16] via-[#1a0f22] to-[#0d0914] border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-rose-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    ⚡ Quick Bluff Risk Remediation Audit
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {bluffRiskCount || 2} RISKS ACTIVE
                    </span>
                  </h3>
                  <p className="text-xs text-rose-300/80 mt-0.5">
                    Skills claimed as HIGH on your resume but lacking verified mock interview citations.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRemediationModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-black/40 border border-rose-500/25 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">1. PostgreSQL B-Tree Indexing &amp; MVCC Isolation</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Claimed: HIGH · Verified: LOW
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Razorpay &amp; Stripe interviewers heavily test transaction isolation levels and deadlock resolution. Current confidence is damped (20%).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-rose-500/25 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">2. Distributed Caching &amp; Redis Eviction Under Load</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Claimed: HIGH · Verified: LOW
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Recent interview evaluation scored 42% on eviction policies (LRU/LFU) and cache stampede prevention.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                Agent trace running in slide-over drawer
              </span>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Link
                  href="/interview"
                  onClick={() => setShowRemediationModal(false)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 transition-all"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>🎙️ Take 3-Min Verbal Probe</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setShowRemediationModal(false);
                    triggerAgent({
                      triggerType: "USER_GOAL_SUBMITTED",
                      goalPrompt: "Inject a 2-day recovery sprint into my Readiness Plan to clear PostgreSQL and Redis bluff risks before upcoming interviews.",
                      autoOpenDrawer: true,
                    });
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-950/40 transition-all cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>📚 Inject Remedial Tasks</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 60-Sec Adversarial Micro-Probe Modal */}
      {probeSkill && (
        <SkillMicroProbeModal
          skillName={probeSkill}
          isOpen={Boolean(probeSkill)}
          onClose={() => setProbeSkill(null)}
        />
      )}

      {/* Bluff Risk Diagnostic Remediation Modal */}
      <BluffRiskAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        onLaunchProbe={(skillName) => {
          setIsAuditModalOpen(false);
          setProbeSkill(skillName);
        }}
      />
    </Card>
  );
}

export default DigitalTwinMatrix;
