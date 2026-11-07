"use client";

import React, { useState } from "react";
import { useAgent } from "@/context/AgentProvider";
import {
  Layers,
  Sparkles,
  Building2,
  TrendingUp,
  Target,
  ArrowRight,
  Zap,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface OverlapItem {
  skill: string;
  category: string;
  companies: string[];
  leverageScore: number;
  recommendation: string;
}

export default function MultiCompanyOverlapCard() {
  const { digitalTwin, isExecuting, triggerAgent } = useAgent();
  const [isOptimizing, setIsOptimizing] = useState(false);

  const activeApps = digitalTwin?.activeApplications || [
    { id: "app-1", company: "Google", title: "L4 Software Engineer", status: "Interview" },
    { id: "app-2", company: "Stripe", title: "Full Stack Engineer", status: "Interview" },
    { id: "app-3", company: "Uber", title: "Backend Systems", status: "Phone Screen" },
    { id: "app-4", company: "Amazon", title: "SDE II", status: "Applied" },
  ];

  // Derive high-leverage overlapping topics from student twin or intelligent defaults
  const interviewCompanies = activeApps.filter(
    (a) => a.status === "Interview" || a.status === "Phone Screen" || a.status === "Technical OA"
  );
  const totalTargetCount = interviewCompanies.length || activeApps.length;

  const defaultOverlaps: OverlapItem[] = [
    {
      skill: "System Design & Distributed State",
      category: "Architecture",
      companies: ["Google", "Stripe", "Uber"],
      leverageScore: 94,
      recommendation: "Focus on Rate Limiting, Idempotency keys, and Event-Driven CQRS",
    },
    {
      skill: "Redis / Kafka Concurrency & Queues",
      category: "Distributed Systems",
      companies: ["Stripe", "Uber"],
      leverageScore: 88,
      recommendation: "Review Sliding Window log algorithms & Dead-Letter Queue handling",
    },
    {
      skill: "PostgreSQL Query Optimization & Indexes",
      category: "Database",
      companies: ["Google", "Amazon"],
      leverageScore: 81,
      recommendation: "Prepare EXPLAIN ANALYZE index selectivity and ACID isolation levels",
    },
  ];

  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    try {
      await triggerAgent({
        triggerType: "PORTFOLIO_OPTIMIZATION_REQUESTED",
        entityId: "portfolio-apps",
        goalPrompt:
          "Run greedy weighted set-cover optimization across active interviews (" +
          activeApps.map((a) => a.company).join(", ") +
          ") and inject a high-leverage 3-day readiness sprint into my plan.",
        autoOpenDrawer: true,
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-[#0c0d18]/90 via-[#101328]/80 to-[#0e101f]/90 p-5 shadow-2xl backdrop-blur-xl">
      {/* Background ambient mesh */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/15 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-indigo-400 shadow-inner">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Multi-Company Set-Cover Optimizer
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                <Sparkles className="h-3 w-3" />
                Greedy Set-Cover
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifies overlapping high-leverage technical topics to prep for multiple interviews in a single sprint.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleRunOptimization}
          disabled={isOptimizing || isExecuting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-cyan-400 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
        >
          <Zap className={`h-4 w-4 ${isOptimizing || isExecuting ? "animate-spin" : "animate-pulse"}`} />
          {isOptimizing || isExecuting ? "Optimizing Portfolio..." : "⚡ Optimize Across Active Interviews"}
        </button>
      </div>

      {/* Active Pipeline Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-white/5 bg-black/30 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-slate-400" />
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Target Pipeline</div>
              <div className="text-sm font-bold text-white">{activeApps.length} Companies</div>
            </div>
          </div>
          <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
            {interviewCompanies.length} Active Rounds
          </span>
        </div>

        <div className="rounded-xl border border-white/5 bg-black/30 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Target className="h-4 w-4 text-emerald-400" />
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Max Coverage Topic</div>
              <div className="text-sm font-bold text-white">System Design</div>
            </div>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            Covers {Math.min(3, totalTargetCount)} of {totalTargetCount}
          </span>
        </div>

        <div className="rounded-xl border border-white/5 bg-black/30 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Study Leverage</div>
              <div className="text-sm font-bold text-white">3.4x Multiplier</div>
            </div>
          </div>
          <span className="text-[10px] text-amber-300 font-mono bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            -60% Prep Time
          </span>
        </div>
      </div>

      {/* Ranked Overlap Topics Table / Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1">
          <span>Ranked High-Leverage Overlap Topics</span>
          <span>Coverage & Recommended Action</span>
        </div>

        {defaultOverlaps.map((item, idx) => (
          <div
            key={item.skill}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/25 p-3 hover:bg-black/40 hover:border-indigo-500/30 transition-all"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-mono font-bold text-indigo-300">
                  #{idx + 1}
                </span>
                <span className="text-xs font-bold text-white">{item.skill}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 font-mono">
                  {item.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pl-7">
                <CheckCircle2 className="h-3 w-3 text-cyan-400 shrink-0" />
                {item.recommendation}
              </p>
            </div>

            <div className="flex items-center gap-2.5 sm:self-center pl-7 sm:pl-0">
              <div className="flex items-center gap-1">
                {item.companies.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {item.leverageScore}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer bar */}
      <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active applications synced with Kanban board</span>
        </div>
        <Link
          href="/tracker"
          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs font-semibold group"
        >
          View Kanban Pipeline
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
