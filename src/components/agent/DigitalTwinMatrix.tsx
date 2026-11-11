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
    badge: "bg-[#0A0A0A] text-[#A1A1AA] border-[#1D1D1D]",
    color: "text-[#71717A]",
    barWidth: "w-1/12 bg-[#3F3F46]",
  },
  LOW: {
    label: "Beginner",
    badge: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25",
    color: "text-[#F59E0B]",
    barWidth: "w-1/3 bg-[#F59E0B]",
  },
  MEDIUM: {
    label: "Intermediate",
    badge: "bg-[#121212] text-[#F5F5F5] border-[#292929]",
    color: "text-[#D4D4D8]",
    barWidth: "w-2/3 bg-[#D4D4D8]",
  },
  HIGH: {
    label: "Confident",
    badge: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25",
    color: "text-[#10B981]",
    barWidth: "w-full bg-[#10B981]",
  },
};

const CLAIMED_BADGES: Record<ClaimedLevel, { label: string; style: string }> = {
  LOW: { label: "Resume: Beginner", style: "bg-[#0A0A0A] text-[#71717A] border-[#1D1D1D]" },
  MEDIUM: { label: "Resume: Intermediate", style: "bg-[#0D0D0D] text-[#A1A1AA] border-[#292929]" },
  HIGH: { label: "Resume: Advanced", style: "bg-[#121212] text-[#F5F5F5] border-[#292929]" },
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
          ? "bg-[#0A0A0A] border-[#F43F5E]/35"
          : "bg-[#0A0A0A] hover:bg-[#121212] border-[#1D1D1D] hover:border-[#292929]"
      )}
    >
      {/* Top Banner if Needs Verification */}
      {skill.bluff_risk && (
        <div className="px-4 py-1.5 bg-[#F43F5E]/10 border-b border-[#F43F5E]/25 flex items-center justify-between text-xs font-semibold text-[#F43F5E]">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-[#F43F5E] shrink-0" />
            <span>⚠️ Needs Verification</span>
          </div>
          <span className="text-[10px] font-mono text-[#F43F5E]/90">
            Claimed on resume · Not tested yet
          </span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header: Skill Name & Claimed Level */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h4 className="text-base font-bold text-[#F5F5F5] tracking-tight flex items-center gap-2">
              <span>{skill.skill_name}</span>
              {skill.verified_confidence === "HIGH" && (
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
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
          <div className="flex items-center justify-between text-[10px] font-mono text-[#71717A]">
            <span>Skill Level:</span>
            <span className={confConfig.color}>{confConfig.label}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#171717] overflow-hidden border border-[#1D1D1D]">
            <div className={clsx("h-full transition-all duration-500 rounded-full", confConfig.barWidth)} />
          </div>
        </div>

        {/* Action Controls & Evidence Toggle */}
        <div className="pt-2 border-t border-[#171717] flex items-center justify-between flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-1 text-[11px] text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors cursor-pointer select-none"
          >
            <Clock className="w-3.5 h-3.5 text-[#71717A]" />
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
                ? "bg-[#F43F5E]/15 hover:bg-[#F43F5E]/25 text-[#F43F5E] border border-[#F43F5E]/35"
                : skill.verified_confidence === "UNVERIFIED" || skill.verified_confidence === "LOW"
                ? "bg-[#F5F5F5] hover:bg-[#E4E4E7] text-[#000000]"
                : "bg-[#121212] hover:bg-[#1A1A1A] text-[#F5F5F5] border border-[#292929]"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ Quick Skill Check</span>
          </button>
        </div>

        {/* Expandable Evidence Citation Log Timeline */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[#171717] space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between text-[11px] text-[#71717A] font-semibold uppercase tracking-wider">
              <span>Skill History</span>
              <span>Recent Activity</span>
            </div>

            {evidenceCount === 0 ? (
              <p className="text-xs text-[#71717A] italic p-3 bg-[#0D0D0D] border border-[#1D1D1D] rounded-lg text-center">
                No activity recorded yet. Complete practice sessions or drills to level up this skill.
              </p>
            ) : (
              <div className="space-y-2">
                {skill.evidence_log.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#0D0D0D] border border-[#1D1D1D] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] text-[#71717A] font-mono">
                      <span className="px-2 py-0.5 rounded bg-[#121212] border border-[#292929] text-[#A1A1AA]">
                        {ev.source}
                      </span>
                      <span>{new Date(ev.timestamp).toLocaleDateString()}</span>
                    </div>

                    <p className="text-[#F5F5F5]/90 leading-relaxed font-sans font-medium text-[11px]">
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
    <Card className="p-6 bg-[#0D0D0D] border-[#1D1D1D] space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1D1D1D] gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 rounded-lg bg-[#121212] text-[#A78BFA] border border-[#292929]">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#F5F5F5] tracking-tight">
              My Skill Profile
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#121212] text-[#A1A1AA] border border-[#292929]">
              4 Skill Levels
            </span>
          </div>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            See where your skills stand based on your resume and interview practice.
          </p>
        </div>

        {/* Global Alert Pill & Action */}
        <div className="flex items-center gap-2 flex-wrap">
          {bluffRiskCount > 0 && (
            <button
              type="button"
              onClick={handleAuditAllBluffRisks}
              className="px-3 py-1.5 rounded-lg bg-[#F43F5E]/15 hover:bg-[#F43F5E]/25 border border-[#F43F5E]/35 text-[#F43F5E] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-[#F43F5E]" />
              <span>Review {bluffRiskCount} Unverified Skill(s)</span>
            </button>
          )}

          <Link
            href="/interview"
            className="px-3 py-1.5 rounded-lg bg-[#F5F5F5] hover:bg-[#E4E4E7] text-[#000000] text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <span>Practice Interviews</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ─── METRIC COUNTERS & FILTER TABS ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#050505] border border-[#1D1D1D] flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
              filterMode === "all"
                ? "bg-[#121212] text-[#F5F5F5] border border-[#292929] font-semibold"
                : "text-[#71717A] hover:text-[#F5F5F5]"
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
                ? "bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/35 font-semibold"
                : "text-[#F43F5E]/80 hover:text-[#F43F5E]"
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
                ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/35 font-semibold"
                : "text-[#71717A] hover:text-[#F5F5F5]"
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
                ? "bg-[#121212] text-[#F5F5F5] border border-[#292929] font-semibold"
                : "text-[#71717A] hover:text-[#F5F5F5]"
            )}
          >
            Not tested yet ({skills.filter((s) => s.verified_confidence === "UNVERIFIED").length})
          </button>
        </div>

        {/* Explanation Note */}
        <div className="text-[11px] text-[#71717A] font-mono hidden lg:block">
          💡 Take a practice drill or interview to level up your skills.
        </div>
      </div>

      {/* ─── SKILL MATRIX GRID ─── */}
      {filteredSkills.length === 0 ? (
        <div className="p-10 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] text-center space-y-2">
          <p className="text-sm font-semibold text-[#F5F5F5]">
            No skills matching &quot;{filterMode}&quot; filter.
          </p>
          <p className="text-xs text-[#A1A1AA]">
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative w-full max-w-xl bg-[#0D0D0D] border border-[#F43F5E]/35 rounded-xl p-6 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#1D1D1D]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/25">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F5F5F5] flex items-center gap-2">
                    ⚡ Skill Verification Check
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/25 tabular-nums">
                      {bluffRiskCount || 2} SKILLS TO CHECK
                    </span>
                  </h3>
                  <p className="text-xs text-[#F43F5E]/85 mt-0.5">
                    Skills listed on your resume that need more practice or verification.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRemediationModal(false)}
                className="text-[#71717A] hover:text-[#F5F5F5] p-1 rounded-lg hover:bg-[#121212] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#F43F5E]/25 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#F5F5F5]">1. PostgreSQL B-Tree Indexing &amp; MVCC Isolation</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/25">
                    Claimed: Advanced · Tested: Beginner
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  Common interview topic covering transaction isolation and deadlock resolution.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#F43F5E]/25 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#F5F5F5]">2. Distributed Caching &amp; Redis Eviction Under Load</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/25">
                    Claimed: Advanced · Tested: Beginner
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  Focus on eviction policies (LRU/LFU) and cache stampede prevention.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1D1D1D] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-[#71717A]">
                Action log available in side drawer
              </span>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Link
                  href="/interview"
                  onClick={() => setShowRemediationModal(false)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F5F5F5] hover:bg-[#E4E4E7] text-[#000000] font-semibold text-xs transition-colors"
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
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#121212] hover:bg-[#F43F5E]/15 border border-[#F43F5E]/35 text-[#F43F5E] font-semibold text-xs transition-colors cursor-pointer"
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
