"use client";

import Link from "next/link";
import { Code2, Target } from "lucide-react";
import { clsx } from "clsx";
import type { PreparationProgressSummary } from "@/lib/services/readiness.service";
import type { DsaPracticeSummary } from "@/lib/preparation-sync";
import CategoryProgress from "./CategoryProgress";

interface PreparationProgressProps {
  progress: PreparationProgressSummary;
  dsaSummary: DsaPracticeSummary | null;
  loading: boolean;
  onNavigate?: () => void;
}

export default function PreparationProgress({
  progress,
  dsaSummary,
  loading,
  onNavigate,
}: PreparationProgressProps) {
  const {
    completedTasks,
    totalTasks,
    remainingTasks,
    overallTaskPercentage,
    digitalTwinConfidenceRatio,
    overallReadinessPercentage,
    categories,
  } = progress;

  const hasTasks = totalTasks > 0;

  return (
    <div className="space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Target className="w-3.5 h-3.5 text-[#B293E2] shrink-0" />
          <h3 className="text-xs font-semibold text-[#F8F8F9] tracking-tight truncate">
            Preparation Progress
          </h3>
        </div>
        <Link
          href="/readiness"
          onClick={onNavigate}
          className="text-[11px] font-medium text-[#B293E2] hover:text-[#C3A9EB] transition-colors shrink-0"
        >
          Study Plan →
        </Link>
      </div>

      {/* Overall Progress Card */}
      <div className="rounded-xl border border-[#22232D] bg-[#171820]/70 p-3.5 space-y-3">
        {loading && !hasTasks ? (
          <div className="space-y-2.5 animate-pulse">
            <div className="flex justify-between">
              <div className="h-3.5 w-24 rounded bg-[#22232D]" />
              <div className="h-4 w-10 rounded bg-[#22232D]" />
            </div>
            <div className="h-2 w-full rounded-full bg-[#22232D]" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-8 rounded bg-[#22232D]" />
              <div className="h-8 rounded bg-[#22232D]" />
              <div className="h-8 rounded bg-[#22232D]" />
            </div>
          </div>
        ) : !hasTasks ? (
          <div className="text-center space-y-2 py-1">
            <p className="text-xs font-medium text-[#F8F8F9]">
              No preparation milestones yet
            </p>
            <p className="text-[11px] text-[#969085] leading-relaxed">
              Upload your resume or add milestones in Study Plan to track your preparation progress.
            </p>
            <div className="flex items-center justify-center gap-3 pt-0.5">
              <Link
                href="/resume"
                onClick={onNavigate}
                className="text-[11px] font-semibold text-[#B293E2] hover:text-[#C3A9EB]"
              >
                Upload Resume →
              </Link>
              <Link
                href="/readiness"
                onClick={onNavigate}
                className="text-[11px] font-medium text-[#969085] hover:text-[#F8F8F9]"
              >
                Add Goal →
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Headline % */}
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-medium text-[#969085]">
                Overall Progress
              </span>
              <span className="text-lg font-bold text-[#F8F8F9] tabular-nums leading-none">
                {overallTaskPercentage}%
              </span>
            </div>

            {/* Prominent Horizontal Bar */}
            <div className="h-2 w-full rounded-full bg-[#0A0B0F] border border-[#262733] overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500",
                  overallTaskPercentage === 100
                    ? "bg-emerald-400"
                    : "bg-[#B293E2]"
                )}
                style={{ width: `${overallTaskPercentage}%` }}
              />
            </div>

            {/* Completed / Total / Remaining Stats */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              <div className="rounded-lg bg-[#111218] border border-[#22232D] px-2 py-1.5 text-center">
                <p className="text-xs font-bold text-emerald-400 tabular-nums">
                  {completedTasks}
                </p>
                <p className="text-[9px] text-[#969085]">Completed</p>
              </div>
              <div className="rounded-lg bg-[#111218] border border-[#22232D] px-2 py-1.5 text-center">
                <p className="text-xs font-bold text-[#F8F8F9] tabular-nums">
                  {totalTasks}
                </p>
                <p className="text-[9px] text-[#969085]">Total</p>
              </div>
              <div className="rounded-lg bg-[#111218] border border-[#22232D] px-2 py-1.5 text-center">
                <p className="text-xs font-bold text-[#B293E2] tabular-nums">
                  {remainingTasks}
                </p>
                <p className="text-[9px] text-[#969085]">Remaining</p>
              </div>
            </div>

            {/* Combined Readiness Index (matches /readiness ring when Digital Twin loaded) */}
            {digitalTwinConfidenceRatio !== null && (
              <div className="pt-2 border-t border-[#22232D] flex items-center justify-between text-[11px]">
                <span className="text-[#969085]">Readiness Index</span>
                <span className="font-mono font-semibold text-[#B293E2] tabular-nums">
                  {overallReadinessPercentage}%
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Category Breakdown */}
      <CategoryProgress categories={categories} />

      {/* Factual Demo-only DSA Bank Counter (strictly separate from readiness counts) */}
      {dsaSummary && (
        <Link
          href="/interview/dsa"
          onClick={onNavigate}
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#171820]/60 border border-[#22232D] hover:border-[#735BA0]/45 transition-colors text-[11px]"
        >
          <span className="flex items-center gap-1.5 text-[#969085]">
            <Code2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>OA &amp; DSA Bank</span>
          </span>
          <span className="font-mono font-semibold text-[#F8F8F9] tabular-nums">
            {dsaSummary.solved}/{dsaSummary.total} solved
          </span>
        </Link>
      )}
    </div>
  );
}

