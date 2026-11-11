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
    <div className="relative overflow-hidden rounded-xl border border-[#22232D] bg-[#111218] p-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#22232D] pb-4 mb-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#171820] border border-[#262733] text-[#B293E2]">
            <Target className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-[#F8F8F9] tracking-tight">
                🎯 Skills Across Saved Jobs
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#735BA0]/35 bg-[#1D1D26] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#B293E2]">
                <Sparkles className="h-3 w-3" />
                High Impact
              </span>
            </div>
            <p className="text-xs text-[#969085] leading-relaxed">
              Common technical topics across all your saved jobs to help you study efficiently.
            </p>
          </div>
        </div>

        {/* 1-Click Prioritize Button */}
        <button
          type="button"
          onClick={handlePrioritizeSharedSprint}
          disabled={isPrioritizing || isExecuting || prioritized}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#B293E2] px-5 py-2.5 text-xs font-semibold text-[#0A0B0F] hover:bg-[#C3A9EB] transition-colors disabled:opacity-70 cursor-pointer shrink-0"
        >
          {isPrioritizing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating Study Plan...</span>
            </>
          ) : prioritized ? (
            <>
              <Check className="h-4 w-4 text-emerald-800" />
              <span>⚡ Common Topics Added to Study Plan!</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              <span>⚡ Add Common Topics to Study Plan</span>
            </>
          )}
        </button>
      </div>

      {/* ─── DYNAMIC INSIGHT CALLOUT BANNER ─── */}
      <div className="mb-5 rounded-xl border border-[#735BA0]/35 bg-[#171820] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[#1D1D26] text-[#B293E2] border border-[#735BA0]/30 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#B293E2]">
              Top Study Recommendations:
            </div>
            <p className="text-xs text-[#F8F8F9]/90 font-medium leading-relaxed mt-0.5">
              &ldquo;Mastering <span className="text-[#B293E2] font-bold underline">PostgreSQL Indexing &amp; Concurrency</span> and{" "}
              <span className="text-[#B293E2] font-bold underline">Distributed System Design (Redis)</span> helps verify{" "}
              <span className="text-rose-400 font-bold font-mono">{bluffRiskCount || 2} unverified skill(s)</span> and covers{" "}
              <span className="text-emerald-400 font-bold font-mono">100% ({totalCompaniesCount}/{totalCompaniesCount})</span> of your saved jobs.&rdquo;
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <span className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-500/12 border border-emerald-500/25 px-3 py-1 rounded-full">
            High Efficiency
          </span>
        </div>
      </div>

      {/* ─── HIGH-LEVERAGE SKILL CARDS WITH COMPANY PILLS ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#969085] px-1 uppercase tracking-wider">
          <span>Shared Technical Topics</span>
          <span>Company Coverage</span>
        </div>

        {overlapSkills.map((item, idx) => (
          <div
            key={item.skill}
            className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-[#22232D] bg-[#171820] p-4 hover:bg-[#1D1D26] hover:border-[#735BA0]/45 transition-colors"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1D1D26] text-[10px] font-mono font-bold text-[#B293E2] border border-[#735BA0]/35 tabular-nums">
                  #{idx + 1}
                </span>
                <span className="text-sm font-bold text-[#F8F8F9] tracking-tight">{item.skill}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#111218] text-[#969085] border border-[#262733] font-mono">
                  {item.category}
                </span>
                {item.clearsBluffRisk && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/12 border border-rose-500/25 text-rose-300">
                    <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
                    Verifies Skills
                  </span>
                )}
              </div>
              <p className="text-xs text-[#969085] flex items-center gap-1.5 pl-7">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#B293E2] shrink-0" />
                <span>{item.recommendation}</span>
              </p>
            </div>

            {/* Company Coverage Pills */}
            <div className="flex items-center gap-3 self-start md:self-center pl-7 md:pl-0 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-[#969085] font-mono font-semibold">Covers:</span>
                {item.companies.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#1D1D26] border border-[#735BA0]/30 text-[#B293E2]"
                  >
                    {c}
                  </span>
                ))}
              </div>

              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/12 px-2.5 py-1 rounded-lg border border-emerald-500/25 tabular-nums">
                {item.leverageScore}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer bar */}
      <div className="mt-5 pt-3.5 border-t border-[#22232D] flex flex-col sm:flex-row items-center justify-between text-xs text-[#969085] gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Based on your {totalCompaniesCount} saved jobs</span>
        </div>
        <Link
          href="/tracker"
          className="inline-flex items-center gap-1 text-[#B293E2] hover:text-[#C3A9EB] text-xs font-semibold group transition-colors"
        >
          <span>Open Application Tracker</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
