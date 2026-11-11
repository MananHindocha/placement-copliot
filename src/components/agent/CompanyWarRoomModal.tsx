"use client";

import React, { useState } from "react";
import { useAgent } from "@/context/AgentProvider";
import type { KanbanCard } from "@/types";
import {
  Brain,
  ShieldAlert,
  Zap,
  CheckCircle2,
  FileText,
  ArrowRight,
  X,
  Target,
  Clock,
  Briefcase,
  Sparkles,
  Layers,
  AlertTriangle,
  FileCheck,
  Check,
  Loader2,
  Calendar,
} from "lucide-react";
import { clsx } from "clsx";

interface CompanyInterviewDna {
  company: string;
  roundDistribution: { name: string; pct: number; focus: string; color: string }[];
  keyTopics: string[];
  interviewerPersona: string;
  typicalBarRaiserRound: string;
}

const COMPANY_DNA_REGISTRY: Record<string, CompanyInterviewDna> = {
  razorpay: {
    company: "Razorpay",
    roundDistribution: [
      { name: "API Concurrency & DB Indexing", pct: 45, focus: "PostgreSQL MVCC, Row Locks, FillFactor 80, Idempotency", color: "bg-[#38BDF8] text-[#38BDF8]" },
      { name: "DSA (Graphs & Queues)", pct: 35, focus: "Topological Sort, LRU Cache, Sliding Window", color: "bg-[#F5F5F5] text-[#F5F5F5]" },
      { name: "Production Debugging", pct: 20, focus: "Memory leaks, Event Loop blocking, Deadlock analysis", color: "bg-[#10B981] text-[#10B981]" },
    ],
    keyTopics: ["PostgreSQL B-Tree & Concurrency", "Redis Distributed Locking", "Idempotent Webhooks", "Zero-Data-Loss Queues"],
    interviewerPersona: "Fintech Systems Architect focusing on zero-data-loss, transactional guarantees, and graceful degradation.",
    typicalBarRaiserRound: "Engineering Manager round with live architectural failure-mode injection.",
  },
  vercel: {
    company: "Vercel",
    roundDistribution: [
      { name: "Next.js & React 19 Performance", pct: 50, focus: "Server Components, Streaming SSR, Suspense, Cache Boundaries", color: "bg-[#F5F5F5] text-[#F5F5F5]" },
      { name: "Architecture & TypeScript", pct: 30, focus: "Discriminated unions, edge runtime limits, bundle budget", color: "bg-[#38BDF8] text-[#38BDF8]" },
      { name: "System Design (Edge & CDN)", pct: 20, focus: "Stale-While-Revalidate, edge routing, global replication", color: "bg-[#A78BFA] text-[#A78BFA]" },
    ],
    keyTopics: ["React Server Components", "Next.js App Router", "TypeScript Generics", "Web Performance Metrics (LCP/INP)"],
    interviewerPersona: "DX & Frontend Infrastructure Principal focusing on rendering efficiency and DX ergonomics.",
    typicalBarRaiserRound: "Live paired coding session building a high-performance streaming component.",
  },
  stripe: {
    company: "Stripe",
    roundDistribution: [
      { name: "API Design & Idempotency", pct: 45, focus: "Strict HTTP semantics, idempotency keys, backward compatibility", color: "bg-[#10B981] text-[#10B981]" },
      { name: "Concurrency & Caching (Redis)", pct: 35, focus: "Cache stampede mitigation, rate limiting, connection pooling", color: "bg-[#F5F5F5] text-[#F5F5F5]" },
      { name: "Production Debugging", pct: 20, focus: "Distributed tracing, timeout budgets, p99 latency optimization", color: "bg-[#38BDF8] text-[#38BDF8]" },
    ],
    keyTopics: ["API Idempotency", "Redis Caching", "Rate Limiting", "Distributed Transactions"],
    interviewerPersona: "API Infrastructure Specialist demanding rigorous edge-case handling and zero silent failures.",
    typicalBarRaiserRound: "Integration test challenge: building a resilient payment retry mechanism with exponential jitter.",
  },
  atlassian: {
    company: "Atlassian",
    roundDistribution: [
      { name: "Distributed Systems & Kafka", pct: 40, focus: "Consumer groups, partition skew, event-driven CQRS", color: "bg-[#38BDF8] text-[#38BDF8]" },
      { name: "Concurrency & Core Java / TS", pct: 35, focus: "Thread pools, non-blocking I/O, async pipeline processing", color: "bg-[#F5F5F5] text-[#F5F5F5]" },
      { name: "System Design Trade-offs", pct: 25, focus: "High availability, disaster recovery, sharding strategies", color: "bg-[#A78BFA] text-[#A78BFA]" },
    ],
    keyTopics: ["Kafka Event Streaming", "Distributed Caching", "System Design", "Microservices Resiliency"],
    interviewerPersona: "Enterprise Cloud Reliability Engineer emphasizing team collaboration, code readability, and fault isolation.",
    typicalBarRaiserRound: "Architectural trade-off review: defending SQL vs NoSQL vs Event-Sourced data stores.",
  },
};

function getCompanyDna(companyName: string): CompanyInterviewDna {
  const norm = companyName.toLowerCase();
  for (const [key, dna] of Object.entries(COMPANY_DNA_REGISTRY)) {
    if (norm.includes(key)) return dna;
  }

  // Fallback intelligent DNA
  return {
    company: companyName,
    roundDistribution: [
      { name: "Core Architecture & Data Layer", pct: 40, focus: "Database indexing, concurrency, and API contracts", color: "bg-[#F5F5F5] text-[#F5F5F5]" },
      { name: "DSA & Problem Solving", pct: 35, focus: "Optimal time/space complexity, data structure selection", color: "bg-[#38BDF8] text-[#38BDF8]" },
      { name: "System Design & Culture", pct: 25, focus: "System scalability, STAR behavioral responses", color: "bg-[#10B981] text-[#10B981]" },
    ],
    keyTopics: ["Database Optimization", "System Design", "Algorithms", "Clean Architecture"],
    interviewerPersona: "Senior Technical Lead evaluating engineering rigor, trade-off clarity, and production readiness.",
    typicalBarRaiserRound: "Technical deep-dive on past projects with adversarial edge-case probing.",
  };
}

export interface CompanyWarRoomModalProps {
  card: KanbanCard | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunchProbe: (skillName: string) => void;
}

export default function CompanyWarRoomModal({
  card,
  isOpen,
  onClose,
  onLaunchProbe,
}: CompanyWarRoomModalProps) {
  const { digitalTwin, triggerAgent, pendingApprovals, resolveApproval } = useAgent();
  const [sprintInjected, setSprintInjected] = useState(false);
  const [diffStaged, setDiffStaged] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);

  if (!isOpen || !card) return null;

  const dna = getCompanyDna(card.company);
  const candidateSkills = digitalTwin?.skills || [];

  // Cross-check company requirements against candidate's digital twin
  const bluffOverlaps = candidateSkills.filter((s) => {
    if (!s.bluff_risk && s.verified_confidence !== "LOW" && s.verified_confidence !== "UNVERIFIED") {
      return false;
    }
    const skillNorm = s.skill_name.toLowerCase();
    return dna.keyTopics.some((topic) => {
      const topicNorm = topic.toLowerCase();
      return (
        topicNorm.includes(skillNorm) ||
        skillNorm.includes(topicNorm) ||
        (skillNorm.includes("postgresql") && topicNorm.includes("postgresql")) ||
        (skillNorm.includes("redis") && topicNorm.includes("redis")) ||
        (skillNorm.includes("system design") && topicNorm.includes("system design"))
      );
    });
  });

  const matchingApproval = pendingApprovals.find(
    (a) =>
      a.target_entity_id === card.id ||
      a.payload_diff?.targetRole?.toLowerCase().includes(card.company.toLowerCase()) ||
      a.payload_diff?.roleTarget?.toLowerCase().includes(card.company.toLowerCase())
  );

  const handleInjectSprint = async () => {
    setIsInjecting(true);
    try {
      await triggerAgent({
        triggerType: "KANBAN_MOVED_TO_INTERVIEW",
        entityId: card.id,
        goalPrompt: `Inject tailored 3-Day Company War-Room Sprint for ${card.company} (${card.title}) targeting critical technical DNA: ${dna.keyTopics.join(", ")}.`,
        metadata: {
          company: card.company,
          role: card.title,
          applicationId: card.id,
        },
        autoOpenDrawer: false,
      });
      setSprintInjected(true);
    } catch (err) {
      console.error("Failed to inject sprint:", err);
    } finally {
      setIsInjecting(false);
    }
  };

  const handleStageResumeFork = async () => {
    try {
      await triggerAgent({
        triggerType: "KANBAN_MOVED_TO_INTERVIEW",
        entityId: card.id,
        goalPrompt: `Stage tailored resume fork for ${card.company} (${card.title}) highlighting verified projects and defensible skills.`,
        metadata: {
          company: card.company,
          role: card.title,
          applicationId: card.id,
        },
        autoOpenDrawer: true,
      });
      setDiffStaged(true);
    } catch (err) {
      console.error("Failed to stage resume fork:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#0D0D0D] border border-[#292929] rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0A0A0A] border-b border-[#1D1D1D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#121212] border border-[#292929] flex items-center justify-center text-[#A78BFA]">
              <Brain className="w-5 h-5 text-[#A78BFA]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-[#F5F5F5] tracking-tight">
                  Interview Prep Kit: {card.company}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#121212] text-[#F5F5F5] border border-[#292929]">
                  {card.title}
                </span>
                {card.matchScore > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {card.matchScore}% Match
                  </span>
                )}
              </div>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Company interview rounds, key focus areas, and a tailored study roadmap.
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

        {/* Modal Scrollable Body: 3 Panels */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 font-sans">
          {/* ─── PANEL 1: COMPANY INTERVIEW DNA ─── */}
          <div className="rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1D1D1D]">
              <Target className="w-4 h-4 text-[#A1A1AA]" />
              <h4 className="text-sm font-bold text-[#F5F5F5] tracking-tight">
                Interview Rounds &amp; Weightage
              </h4>
            </div>

            {/* Visual Round Weight Breakdown Bars */}
            <div className="space-y-3">
              <div className="w-full h-3 rounded-full bg-[#080808] overflow-hidden flex border border-[#1D1D1D]">
                {dna.roundDistribution.map((r, i) => (
                  <div
                    key={i}
                    style={{ width: `${r.pct}%` }}
                    className={clsx(
                      "h-full transition-all flex items-center justify-center text-[9px] font-mono font-bold text-[#000000]",
                      i === 0 ? "bg-[#F5F5F5]" : i === 1 ? "bg-[#A1A1AA]" : "bg-[#71717A]"
                    )}
                    title={`${r.name}: ${r.pct}%`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {dna.roundDistribution.map((r, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[#0D0D0D] border border-[#1D1D1D] space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#F5F5F5]">{r.name}</span>
                      <span className="font-mono tabular-nums text-[#F5F5F5]">{r.pct}%</span>
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                      {r.focus}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Persona & Key Topics Pills */}
            <div className="pt-2 border-t border-[#1D1D1D] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="text-[#F5F5F5]/90">
                <span className="text-[#A1A1AA] font-semibold">Interviewer Persona: </span>
                <span>{dna.interviewerPersona}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {dna.keyTopics.map((k) => (
                  <span
                    key={k}
                    className="px-2 py-0.5 rounded-md bg-[#121212] border border-[#292929] text-[10px] font-mono text-[#A1A1AA]"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ─── PANEL 2: SKILLS TO STRENGTHEN ─── */}
          <div className="rounded-xl border border-rose-500/30 bg-[#0A0A0A] p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1D1D1D]">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h4 className="text-sm font-bold text-[#F5F5F5] tracking-tight">
                Skills to Strengthen for {card.company}
              </h4>
            </div>

            {bluffOverlaps.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-200">
                  <span className="font-bold">Strong Match: </span>
                  Your verified skills provide strong coverage for {card.company}&apos;s core interview rounds!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {bluffOverlaps.map((skill) => (
                  <div
                    key={skill.skill_name}
                    className="p-4 rounded-xl bg-rose-500/8 border border-rose-500/25 space-y-2.5 animate-fadeIn"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span className="text-xs font-bold text-rose-200">
                          ⚠️ High Priority: {card.company} frequently tests &ldquo;{skill.skill_name}&rdquo;
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onLaunchProbe(skill.skill_name);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>Take Quick Skill Check</span>
                      </button>
                    </div>

                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      This skill is listed on your resume but hasn&apos;t been tested yet in practice sessions. Practice this topic to be confident during technical rounds.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── PANEL 3: TAILORED RESUME & 3-DAY STUDY PLAN ─── */}
          <div className="rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1D1D1D]">
              <Layers className="w-4 h-4 text-[#A1A1AA]" />
              <h4 className="text-sm font-bold text-[#F5F5F5] tracking-tight">
                Tailored Resume &amp; 3-Day Study Plan
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sprint Status Box */}
              <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#1D1D1D] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F5F5F5] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#A1A1AA]" />
                    3-Day Study Plan
                  </span>
                  <span
                    className={clsx(
                      "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border",
                      sprintInjected
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-[#121212] text-[#A1A1AA] border-[#292929]"
                    )}
                  >
                    {sprintInjected ? "Plan Active" : "Not Added"}
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Adds 3 daily practice tasks to your study plan tailored to {card.company}&apos;s interview rounds.
                </p>
                <button
                  type="button"
                  onClick={handleInjectSprint}
                  disabled={sprintInjected || isInjecting}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#F5F5F5] hover:bg-[#E4E4E7] text-[#000000] font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isInjecting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Adding Study Plan...</span>
                    </>
                  ) : sprintInjected ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>3-Day Plan Added to Study Plan</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Add 3-Day Study Plan</span>
                    </>
                  )}
                </button>
              </div>

              {/* Resume Fork Status Box */}
              <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#1D1D1D] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F5F5F5] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#A1A1AA]" />
                    Tailored Resume Version
                  </span>
                  <span
                    className={clsx(
                      "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border",
                      matchingApproval
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : diffStaged
                        ? "bg-[#121212] text-[#F5F5F5] border-[#292929]"
                        : "bg-[#121212] text-[#A1A1AA] border-[#292929]"
                    )}
                  >
                    {matchingApproval ? "Waiting for your review" : diffStaged ? "Review in Progress" : "Current Resume"}
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Suggests bullet rewrites highlighting skills {card.company} looks for.
                </p>
                <button
                  type="button"
                  onClick={handleStageResumeFork}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#121212] hover:bg-[#1A1A1A] text-[#F5F5F5] border border-[#292929] font-semibold text-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
                  <span>Review Tailored Resume Suggestions</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#0A0A0A] border-t border-[#1D1D1D] flex items-center justify-between gap-3">
          <div className="text-xs text-[#A1A1AA]">
            Your preparation data is saved automatically.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#121212] hover:bg-[#1A1A1A] border border-[#292929] text-[#F5F5F5] text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Prep Kit
          </button>
        </div>
      </div>
    </div>
  );
}

