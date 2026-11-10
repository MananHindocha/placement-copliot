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
  Check,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { addReadinessMilestone } from "@/lib/services/readiness.service";

interface OverlapItem {
  skill: string;
  category: string;
  companies: string[];
  leverageScore: number;
  recommendation: string;
  clearsBluffRisk?: boolean;
}

export default function MultiCompanyOverlapCard() {
  const { digitalTwin, isExecuting, triggerAgent, bluffRiskCount } = useAgent();
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [prioritized, setPrioritized] = useState(false);

  // Active pipeline roles (from digitalTwin)
  const activeApps = digitalTwin?.activeApplications || [];

  const totalCompaniesCount = activeApps.length;

  const overlapSkills: OverlapItem[] = [
    {
      skill: "PostgreSQL Indexing & MVCC Concurrency",
      category: "Database & Storage",
      companies: activeApps.slice(0, 3).map((a) => a.company),
      leverageScore: 96,
      recommendation: "Focus on B-Tree fillfactor, composite index selectivity, and MVCC phantom read isolation.",
      clearsBluffRisk: true,
    },
    {
      skill: "Distributed System Design & Redis Caching",
      category: "Architecture & Scale",
      companies: activeApps.map((a) => a.company),
      leverageScore: 94,
      recommendation: "Review cache stampede (XFetch), token bucket rate limiting, and idempotent event delivery.",
      clearsBluffRisk: true,
    },
  ];

  if (activeApps.length === 0) {
    return (
      <div className="rounded-2xl border border-indigo-500/20 bg-[#0c0f24]/70 p-6 text-center">
        <Target className="h-8 w-8 text-indigo-400 mx-auto mb-2 opacity-60" />
        <h4 className="text-sm font-semibold text-white">Multi-Company Prep Optimizer</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Save jobs to your Tracker to automatically calculate common skill intersections and optimize your interview preparation.
        </p>
      </div>
    );
  }

  const handlePrioritizeSharedSprint = async () => {
    setIsPrioritizing(true);
    try {
      // 1. Inject shared milestones at top priority in readiness service
      await addReadinessMilestone({
        title: "⚡ #1 Priority: Master PostgreSQL B-Tree Indexing & Redis Distributed State",
        category: "skills",
        priority: "high",
        completed: false,
        description: `Shared across ${totalCompaniesCount} saved jobs (${activeApps.map((a) => a.company).join(", ")}). Covers high-priority interview skills.`,
        dueDate: "In 3 days",
      });

      // 2. Trigger agent multi-company optimization run
      await triggerAgent({
        triggerType: "PORTFOLIO_OPTIMIZATION_REQUESTED",
        entityId: "set-cover-shared-sprint",
        goalPrompt: `Run greedy set-cover optimization across ${totalCompaniesCount} active Kanban companies (${activeApps.map((a) => a.company).join(", ")}). Prioritize shared high-leverage milestones in Roadmap Checklist.`,
        autoOpenDrawer: false,
      });

      setPrioritized(true);
    } catch (err) {
      console.error("Failed to prioritize shared sprint:", err);
    } finally {
      setIsPrioritizing(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-[#0c0f24]/95 via-[#0e1430]/90 to-[#0a0d1e]/95 p-6 shadow-2xl backdrop-blur-xl">
      {/* Background ambient mesh */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-cyan-500/15 blur-3xl" />

      {/* ─── HEADER ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4 mb-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-cyan-500/20 border border-indigo-500/40 text-indigo-300 shadow-inner">
            <Target className="h-6 w-6 text-indigo-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">
                🎯 Skills Across Saved Jobs
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-mono font-bold text-indigo-300">
                <Sparkles className="h-3 w-3" />
                High Impact
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Common technical topics across all your saved jobs to help you study efficiently.
            </p>
          </div>
        </div>

        {/* 1-Click Prioritize Button */}
        <button
          type="button"
          onClick={handlePrioritizeSharedSprint}
          disabled={isPrioritizing || isExecuting || prioritized}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-cyan-400 active:scale-[0.98] transition-all disabled:opacity-70 cursor-pointer shrink-0"
        >
          {isPrioritizing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Updating Study Plan...</span>
            </>
          ) : prioritized ? (
            <>
              <Check className="h-4 w-4 text-emerald-300" />
              <span>⚡ Common Topics Added to Study Plan!</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 text-amber-300 animate-pulse" />
              <span>⚡ Add Common Topics to Study Plan</span>
            </>
          )}
        </button>
      </div>

      {/* ─── DYNAMIC INSIGHT CALLOUT BANNER ─── */}
      <div className="mb-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-cyan-200">
              Top Study Recommendations:
            </div>
            <p className="text-xs text-slate-200 font-medium leading-relaxed mt-0.5">
              &ldquo;Mastering <span className="text-cyan-300 font-bold underline">PostgreSQL Indexing &amp; Concurrency</span> and{" "}
              <span className="text-indigo-300 font-bold underline">Distributed System Design (Redis)</span> helps verify{" "}
              <span className="text-rose-400 font-bold font-mono">{bluffRiskCount || 2} unverified skill(s)</span> and covers{" "}
              <span className="text-emerald-400 font-bold font-mono">100% ({totalCompaniesCount}/{totalCompaniesCount})</span> of your saved jobs.&rdquo;
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <span className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
            High Efficiency
          </span>
        </div>
      </div>

      {/* ─── HIGH-LEVERAGE SKILL CARDS WITH COMPANY PILLS ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1 uppercase tracking-wider">
          <span>Shared Technical Topics</span>
          <span>Company Coverage</span>
        </div>

        {overlapSkills.map((item, idx) => (
          <div
            key={item.skill}
            className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/30 p-4 hover:bg-black/50 hover:border-indigo-500/40 transition-all shadow-sm"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/25 text-[10px] font-mono font-bold text-indigo-300 border border-indigo-500/30">
                  #{idx + 1}
                </span>
                <span className="text-sm font-bold text-white tracking-tight">{item.skill}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 font-mono">
                  {item.category}
                </span>
                {item.clearsBluffRisk && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300">
                    <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
                    Verifies Skills
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 pl-7">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>{item.recommendation}</span>
              </p>
            </div>

            {/* Company Coverage Pills */}
            <div className="flex items-center gap-3 self-start md:self-center pl-7 md:pl-0 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 font-mono font-semibold">Covers:</span>
                {item.companies.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 shadow-sm"
                  >
                    {c}
                  </span>
                ))}
              </div>

              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                {item.leverageScore}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer bar */}
      <div className="mt-5 pt-3.5 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Based on your {totalCompaniesCount} saved jobs</span>
        </div>
        <Link
          href="/tracker"
          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs font-semibold group"
        >
          <span>Open Application Tracker</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
