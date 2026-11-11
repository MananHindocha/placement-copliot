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

function toSkillLabel(item: any): string {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item.name === "string") return item.name;
  if (typeof item.skill_name === "string") return item.skill_name;
  if (typeof item.skill === "string") return item.skill;
  return JSON.stringify(item);
}

function toSkillLevel(item: any): string {
  if (!item || typeof item === "string") return "";
  return item.claimedLevel || item.verified_confidence || item.strength || item.level || "";
}

const CONFIDENCE_BADGES: Record<
  ConfidenceTier,
  { label: string; badge: string; color: string; barWidth: string }
> = {
  UNVERIFIED: {
    label: "Not tested yet",
    badge: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    color: "text-slate-400",
    barWidth: "w-1/12 bg-slate-600",
  },
  LOW: {
    label: "Beginner",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    color: "text-amber-400",
    barWidth: "w-1/3 bg-amber-500",
  },
  MEDIUM: {
    label: "Intermediate",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    color: "text-sky-400",
    barWidth: "w-2/3 bg-sky-500",
  },
  HIGH: {
    label: "Confident",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    color: "text-emerald-400",
    barWidth: "w-full bg-emerald-500",
  },
};

const CLAIMED_BADGES: Record<ClaimedLevel, { label: string; style: string }> = {
  LOW: { label: "Resume: Beginner", style: "bg-slate-800 text-slate-400 border-slate-700" },
  MEDIUM: { label: "Resume: Intermediate", style: "bg-indigo-950/60 text-indigo-300 border-indigo-500/20" },
  HIGH: { label: "Resume: Advanced", style: "bg-purple-950/60 text-purple-300 border-purple-500/30" },
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
      {/* Top Banner if Needs Verification */}
      {skill.bluff_risk && (
        <div className="px-4 py-1.5 bg-rose-500/20 border-b border-rose-500/30 flex items-center justify-between text-xs font-semibold text-rose-300">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>⚠️ Needs Verification</span>
          </div>
          <span className="text-[10px] font-mono text-rose-400">
            Claimed on resume · Not tested yet
          </span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header: Skill Name & Claimed Level */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>{toSkillLabel(skill.skill_name || skill)}</span>
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
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Skill Level:</span>
            <span className={confConfig.color}>{confConfig.label}</span>
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
              "px-3 py-1.5 rounded-xl font-semibold text-[11px] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer",
              skill.bluff_risk
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30"
                : skill.verified_confidence === "UNVERIFIED" || skill.verified_confidence === "LOW"
                ? "bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white shadow-amber-900/20"
                : "bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30"
            )}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>⚡ Quick Skill Check</span>
          </button>
        </div>

        {/* Expandable Evidence Citation Log Timeline */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/8 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              <span>Skill History</span>
              <span>Recent Activity</span>
            </div>

            {evidenceCount === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-black/30 rounded-lg text-center">
                No activity recorded yet. Complete practice sessions or drills to level up this skill.
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
    <Card className="p-6 bg-gradient-to-br from-[#0B0F1E] via-[#0E152B] to-[#0B0F1E] border-indigo-500/30 shadow-2xl space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/8 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              My Skill Profile
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              4 Skill Levels
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            See where your skills stand based on your resume and interview practice.
          </p>
        </div>

        {/* Global Alert Pill & Action */}
        <div className="flex items-center gap-2 flex-wrap">
          {bluffRiskCount > 0 && (
            <button
              type="button"
              onClick={handleAuditAllBluffRisks}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-rose-950/30 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Review {bluffRiskCount} Unverified Skill(s)</span>
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
            <span>Needs Verification ({bluffRiskCount})</span>
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
            Confident ({skills.filter((s) => s.verified_confidence === "HIGH").length})
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
            Not tested yet ({skills.filter((s) => s.verified_confidence === "UNVERIFIED").length})
          </button>
        </div>

        {/* Explanation Note */}
        <div className="text-[11px] text-slate-400 font-mono hidden lg:block">
          💡 Take a practice drill or interview to level up your skills.
        </div>
      </div>

      {/* ─── SKILL MATRIX GRID ─── */}
      {filteredSkills.length === 0 ? (
        <div className="p-10 rounded-2xl bg-black/30 border border-white/6 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-300">
            No skills matching &quot;{filterMode}&quot; filter.
          </p>
          <p className="text-xs text-slate-500">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative w-full max-w-xl bg-gradient-to-br from-[#120a16] via-[#1a0f22] to-[#0d0914] border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-rose-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    ⚡ Skill Verification Check
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
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
                    Claimed: Advanced · Tested: Beginner
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Common interview topic covering transaction isolation and deadlock resolution.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-rose-500/25 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">2. Distributed Caching &amp; Redis Eviction Under Load</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Claimed: Advanced · Tested: Beginner
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Focus on eviction policies (LRU/LFU) and cache stampede prevention.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                Action log available in side drawer
              </span>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Link
                  href="/interview"
                  onClick={() => setShowRemediationModal(false)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 transition-all"
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
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-950/40 transition-all cursor-pointer"
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
