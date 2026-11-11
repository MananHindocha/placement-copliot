"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAgent } from "@/context/AgentProvider";
import type { SkillEvidenceItem, ConfidenceTier, ClaimedLevel } from "@/lib/agent/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
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
    label: "Not tested yet",
    badge: "bg-[#171820] text-[#969085] border-[#262733]",
    color: "text-[#969085]",
    barWidth: "w-1/12 bg-[#4F414D]",
  },
  LOW: {
    label: "Beginner",
    badge: "bg-amber-500/12 text-amber-300 border-amber-500/25",
    color: "text-amber-400",
    barWidth: "w-1/3 bg-amber-500",
  },
  MEDIUM: {
    label: "Intermediate",
    badge: "bg-[#1D1D26] text-[#B293E2] border-[#735BA0]/35",
    color: "text-[#B293E2]",
    barWidth: "w-2/3 bg-[#B293E2]",
  },
  HIGH: {
    label: "Confident",
    badge: "bg-emerald-500/12 text-emerald-300 border-emerald-500/25",
    color: "text-emerald-400",
    barWidth: "w-full bg-emerald-500",
  },
};

const CLAIMED_BADGES: Record<ClaimedLevel, { label: string; style: string }> = {
  LOW: { label: "Resume: Beginner", style: "bg-[#111218] text-[#969085] border-[#262733]" },
  MEDIUM: { label: "Resume: Intermediate", style: "bg-[#1D1D26] text-[#B293E2] border-[#735BA0]/30" },
  HIGH: { label: "Resume: Advanced", style: "bg-[#1D1D26] text-[#C3A9EB] border-[#735BA0]/45" },
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
        "rounded-xl border transition-colors overflow-hidden",
        skill.bluff_risk
          ? "bg-[#171820] border-rose-500/35"
          : "bg-[#171820] hover:bg-[#1D1D26] border-[#22232D] hover:border-[#735BA0]/45"
      )}
    >
      {/* Top Banner if Needs Verification */}
      {skill.bluff_risk && (
        <div className="px-4 py-1.5 bg-rose-500/15 border-b border-rose-500/25 flex items-center justify-between text-xs font-semibold text-rose-300">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>⚠️ Needs Verification</span>
          </div>
          <span className="text-[10px] font-mono text-rose-300">
            Claimed on resume · Not tested yet
          </span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header: Skill Name & Claimed Level */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h4 className="text-base font-bold text-[#F8F8F9] tracking-tight flex items-center gap-2">
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

        {/* 4-Step Skill Level Meter */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#969085]">
            <span>Skill Level:</span>
            <span className={confConfig.color}>{confConfig.label}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#0A0B0F] overflow-hidden border border-[#262733]">
            <div className={clsx("h-full transition-all duration-500 rounded-full", confConfig.barWidth)} />
          </div>
        </div>

        {/* Action Controls & Evidence Toggle */}
        <div className="pt-2 border-t border-[#22232D] flex items-center justify-between flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-1 text-[11px] text-[#969085] hover:text-[#F8F8F9] transition-colors cursor-pointer select-none"
          >
            <Clock className="w-3.5 h-3.5 text-[#B293E2]" />
            <span>
              {evidenceCount} Practice Step{evidenceCount !== 1 ? "s" : ""}
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
              "px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer",
              skill.bluff_risk
                ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40"
                : skill.verified_confidence === "UNVERIFIED" || skill.verified_confidence === "LOW"
                ? "bg-[#B293E2] hover:bg-[#C3A9EB] text-[#0A0B0F]"
                : "bg-[#1D1D26] hover:bg-[#262633] text-[#B293E2] border border-[#735BA0]/45"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ Quick Skill Check</span>
          </button>
        </div>

        {/* Expandable Evidence Citation Log Timeline */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[#22232D] space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between text-[11px] text-[#969085] font-semibold uppercase tracking-wider">
              <span>Skill History</span>
              <span>Recent Activity</span>
            </div>

            {evidenceCount === 0 ? (
              <p className="text-xs text-[#969085] italic p-3 bg-[#111218] border border-[#22232D] rounded-lg text-center">
                No activity recorded yet. Complete practice sessions or drills to level up this skill.
              </p>
            ) : (
              <div className="space-y-2">
                {skill.evidence_log.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#111218] border border-[#22232D] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] text-[#969085] font-mono">
                      <span className="px-2 py-0.5 rounded bg-[#1D1D26] border border-[#735BA0]/30 text-[#B293E2]">
                        {ev.source}
                      </span>
                      <span>{new Date(ev.timestamp).toLocaleDateString()}</span>
                    </div>

                    <p className="text-[#F8F8F9]/90 leading-relaxed font-sans font-medium text-[11px]">
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
  const { digitalTwin, triggerAgent, bluffRiskCount, openProbeModal, openBluffAuditModal } = useAgent();
  const [filterMode, setFilterMode] = useState<"all" | "bluff" | "high" | "unverified">("all");
  const [showRemediationModal, setShowRemediationModal] = useState(false);

  const skills = digitalTwin?.skills || [];

  const filteredSkills = skills.filter((s) => {
    if (filterMode === "bluff") return s.bluff_risk;
    if (filterMode === "high") return s.verified_confidence === "HIGH";
    if (filterMode === "unverified") return s.verified_confidence === "UNVERIFIED";
    return true;
  });

  const handleVerifyDrill = (skillName: string) => {
    openProbeModal(skillName);
  };

  const handleAuditAllBluffRisks = () => {
    openBluffAuditModal();
  };

  return (
    <Card className="p-6 bg-[#111218] border-[#22232D] space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#22232D] gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 rounded-lg bg-[#171820] text-[#B293E2] border border-[#262733]">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#F8F8F9] tracking-tight">
              My Skill Profile
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#1D1D26] text-[#B293E2] border border-[#735BA0]/35">
              4 Skill Levels
            </span>
          </div>
          <p className="text-xs text-[#969085] leading-relaxed">
            See where your skills stand based on your resume and interview practice.
          </p>
        </div>

        {/* Global Alert Pill & Action */}
        <div className="flex items-center gap-2 flex-wrap">
          {bluffRiskCount > 0 && (
            <button
              type="button"
              onClick={handleAuditAllBluffRisks}
              className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Review {bluffRiskCount} Unverified Skill(s)</span>
            </button>
          )}

          <Link
            href="/interview"
            className="px-3 py-1.5 rounded-lg bg-[#B293E2] hover:bg-[#C3A9EB] text-[#0A0B0F] text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <span>Practice Interviews</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ─── METRIC COUNTERS & FILTER TABS ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0A0B0F] border border-[#22232D] flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
              filterMode === "all"
                ? "bg-[#1D1D26] text-[#F8F8F9] border border-[#735BA0]/50 font-semibold"
                : "text-[#969085] hover:text-[#F8F8F9]"
            )}
          >
            All Tracked Skills ({skills.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("bluff")}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer",
              filterMode === "bluff"
                ? "bg-rose-500/20 text-rose-200 border border-rose-500/40 font-semibold"
                : "text-rose-400 hover:text-rose-300"
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Needs Verification ({bluffRiskCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("high")}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
              filterMode === "high"
                ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-semibold"
                : "text-[#969085] hover:text-[#F8F8F9]"
            )}
          >
            Confident ({skills.filter((s) => s.verified_confidence === "HIGH").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("unverified")}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
              filterMode === "unverified"
                ? "bg-[#1D1D26] text-[#F8F8F9] border border-[#2E303E] font-semibold"
                : "text-[#969085] hover:text-[#F8F8F9]"
            )}
          >
            Not tested yet ({skills.filter((s) => s.verified_confidence === "UNVERIFIED").length})
          </button>
        </div>

        {/* Explanation Note */}
        <div className="text-[11px] text-[#969085] font-mono hidden lg:block">
          💡 Take a practice drill or interview to level up your skills.
        </div>
      </div>

      {/* ─── SKILL MATRIX GRID ─── */}
      {filteredSkills.length === 0 ? (
        <div className="p-10 rounded-xl bg-[#171820] border border-[#22232D] text-center space-y-2">
          <p className="text-sm font-semibold text-[#F8F8F9]">
            No skills matching &quot;{filterMode}&quot; filter.
          </p>
          <p className="text-xs text-[#969085]">
            All tracked skills in your skill profile are verified.
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

      {/* ─── QUICK REMEDIATION MODAL ─── */}
      {showRemediationModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative w-full max-w-xl bg-[#111218] border border-rose-500/35 rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#22232D]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/12 text-rose-400 border border-rose-500/25">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F8F8F9] flex items-center gap-2">
                    ⚡ Skill Verification Check
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/12 text-rose-300 border border-rose-500/25 tabular-nums">
                      {bluffRiskCount || 2} SKILLS TO CHECK
                    </span>
                  </h3>
                  <p className="text-xs text-rose-300/80 mt-0.5">
                    Skills listed on your resume that need more practice or verification.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRemediationModal(false)}
                className="text-[#969085] hover:text-[#F8F8F9] p-1 rounded-lg hover:bg-[#171820] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#171820] border border-rose-500/25 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#F8F8F9]">1. PostgreSQL B-Tree Indexing &amp; MVCC Isolation</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/25">
                    Claimed: Advanced · Tested: Beginner
                  </span>
                </div>
                <p className="text-[11px] text-[#969085] leading-relaxed">
                  Common interview topic covering transaction isolation and deadlock resolution.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#171820] border border-rose-500/25 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#F8F8F9]">2. Distributed Caching &amp; Redis Eviction Under Load</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/25">
                    Claimed: Advanced · Tested: Beginner
                  </span>
                </div>
                <p className="text-[11px] text-[#969085] leading-relaxed">
                  Focus on eviction policies (LRU/LFU) and cache stampede prevention.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#22232D] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-[#969085]">
                Action log available in side drawer
              </span>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Link
                  href="/interview"
                  onClick={() => setShowRemediationModal(false)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#B293E2] hover:bg-[#C3A9EB] text-[#0A0B0F] font-semibold text-xs transition-colors"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>🎙️ Take Quick Skill Check</span>
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
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#171820] hover:bg-rose-500/15 border border-rose-500/35 text-rose-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>📚 Add to Study Plan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default DigitalTwinMatrix;
