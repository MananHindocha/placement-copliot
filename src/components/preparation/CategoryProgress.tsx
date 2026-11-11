"use client";

import { Code2, FileText, MessageSquare, Send, Users } from "lucide-react";
import { clsx } from "clsx";
import type { CategoryProgressSummary } from "@/lib/services/readiness.service";
import type { ReadinessMilestone } from "@/types";

interface CategoryProgressProps {
  categories: CategoryProgressSummary[];
}

const CATEGORY_ICONS: Record<ReadinessMilestone["category"], React.ElementType> = {
  resume: FileText,
  skills: Code2,
  interview: MessageSquare,
  network: Users,
  applications: Send,
};

export default function CategoryProgress({ categories }: CategoryProgressProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#969085] uppercase tracking-wider">
          Category Breakdown
        </span>
      </div>

      <div className="space-y-2.5">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.key] || Code2;
          const hasTasks = cat.total > 0;
          const isComplete = hasTasks && cat.completed === cat.total;

          return (
            <div key={cat.key} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1.5 text-[#F8F8F9] font-medium min-w-0 truncate">
                  <Icon className="w-3.5 h-3.5 text-[#B293E2] shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </span>

                <span className="flex items-center gap-1.5 shrink-0 tabular-nums font-mono text-[10px]">
                  <span className="text-[#969085]">
                    {hasTasks ? `${cat.completed}/${cat.total}` : "0/0"}
                  </span>
                  <span
                    className={clsx(
                      "font-semibold w-8 text-right",
                      !hasTasks
                        ? "text-[#969085]/60"
                        : isComplete
                        ? "text-emerald-400"
                        : "text-[#F8F8F9]"
                    )}
                  >
                    {cat.percentage}%
                  </span>
                </span>
              </div>

              <div className="h-1.5 w-full rounded-full bg-[#171820] border border-[#262733] overflow-hidden">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all duration-500",
                    !hasTasks
                      ? "bg-[#4F414D]/40"
                      : isComplete
                      ? "bg-emerald-400"
                      : "bg-[#B293E2]"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

