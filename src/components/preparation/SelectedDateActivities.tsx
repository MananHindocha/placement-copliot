"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
} from "lucide-react";
import { clsx } from "clsx";
import type {
  CalendarActivityCategory,
  CalendarActivityItem,
} from "@/lib/preparation-sync";

interface SelectedDateActivitiesProps {
  selectedDateKey: string;
  todayDateKey: string;
  activities: CalendarActivityItem[];
  nextScheduledDateKey?: string | null;
  unscheduledCount: number;
  onJumpToDate: (dateKey: string) => void;
  onToggleMilestone?: (
    milestoneId: string,
    nextCompleted: boolean
  ) => Promise<void>;
  onNavigate?: () => void;
}

const CATEGORY_BADGE_STYLE: Record<CalendarActivityCategory, string> = {
  readiness: "text-[#B293E2] bg-[#1D1D26] border-[#735BA0]/35",
  interview: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  dsa: "text-sky-300 bg-sky-500/10 border-sky-500/25",
  application: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
};

function formatDateKeyLabel(dateKey: string, todayDateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const short = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return dateKey === todayDateKey ? `Today · ${short}` : short;
}

function formatCompactDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function SelectedDateActivities({
  selectedDateKey,
  todayDateKey,
  activities,
  nextScheduledDateKey,
  unscheduledCount,
  onJumpToDate,
  onToggleMilestone,
  onNavigate,
}: SelectedDateActivitiesProps) {
  const dateHeading = formatDateKeyLabel(selectedDateKey, todayDateKey);

  return (
    <div className="space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-[#F8F8F9] truncate">
          {dateHeading}
        </span>
        <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-[#171820] border border-[#22232D] text-[#969085] shrink-0">
          {activities.length} {activities.length === 1 ? "item" : "items"}
        </span>
      </div>

      {/* Activities List or Empty State */}
      {activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#262733] bg-[#171820]/40 p-3.5 text-center space-y-2">
          <div className="w-7 h-7 rounded-lg bg-[#171820] border border-[#22232D] flex items-center justify-center mx-auto text-[#969085]">
            <CalendarDays className="w-3.5 h-3.5" />
          </div>
          <p className="text-[11px] text-[#969085] leading-relaxed">
            No scheduled activities on this date.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
            {nextScheduledDateKey && nextScheduledDateKey !== selectedDateKey && (
              <button
                type="button"
                onClick={() => onJumpToDate(nextScheduledDateKey)}
                className="text-[11px] font-medium text-[#B293E2] hover:text-[#C3A9EB] transition-colors cursor-pointer"
              >
                Next: {formatCompactDateKey(nextScheduledDateKey)} →
              </button>
            )}
            <Link
              href="/readiness"
              onClick={onNavigate}
              className="text-[11px] font-medium text-[#969085] hover:text-[#F8F8F9] transition-colors"
            >
              Open Study Plan →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[210px] overflow-y-auto pr-0.5 scrollbar-thin">
          {activities.map((item) => {
            const isCompleted = item.status === "completed";
            const isUpcoming = item.status === "upcoming";

            return (
              <div
                key={item.id}
                className={clsx(
                  "rounded-xl border p-2.5 transition-colors space-y-1.5",
                  isCompleted
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-[#171820]/80 border-[#22232D] hover:border-[#735BA0]/45"
                )}
              >
                <div className="flex items-start gap-2">
                  {/* Interactive Readiness Toggle OR Status Icon */}
                  {item.milestoneId && onToggleMilestone ? (
                    <button
                      type="button"
                      onClick={() =>
                        onToggleMilestone(
                          item.milestoneId!,
                          !item.milestoneCompleted
                        )
                      }
                      aria-label={
                        item.milestoneCompleted
                          ? `Mark ${item.title} pending`
                          : `Mark ${item.title} completed`
                      }
                      className="mt-0.5 shrink-0 text-[#969085] hover:text-[#F8F8F9] transition-colors cursor-pointer"
                    >
                      {item.milestoneCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#4F414D] hover:text-[#B293E2]" />
                      )}
                    </button>
                  ) : (
                    <span className="mt-0.5 shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : isUpcoming ? (
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-[#969085]" />
                      )}
                    </span>
                  )}

                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className="group/link flex items-start justify-between gap-1.5"
                    >
                      <p
                        className={clsx(
                          "text-xs font-medium leading-snug line-clamp-2 transition-colors",
                          isCompleted
                            ? "text-[#969085] line-through"
                            : "text-[#F8F8F9] group-hover/link:text-[#B293E2]"
                        )}
                      >
                        {item.title}
                      </p>
                      <ArrowRight className="w-3 h-3 text-[#969085] group-hover/link:text-[#B293E2] shrink-0 mt-0.5 transition-colors" />
                    </Link>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span
                        className={clsx(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border",
                          CATEGORY_BADGE_STYLE[item.category]
                        )}
                      >
                        {item.categoryLabel}
                      </span>

                      <span
                        className={clsx(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border tabular-nums",
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                            : isUpcoming
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                            : "bg-[#111218] text-[#969085] border-[#262733]"
                        )}
                      >
                        {item.statusLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subtle Unscheduled Reminder */}
      {unscheduledCount > 0 && (
        <Link
          href="/readiness"
          onClick={onNavigate}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#171820]/50 border border-[#22232D] hover:border-[#735BA0]/40 text-[10px] text-[#969085] hover:text-[#F8F8F9] transition-colors"
        >
          <span>
            {unscheduledCount} pending milestone{unscheduledCount === 1 ? "" : "s"} without due date
          </span>
          <span className="text-[#B293E2] font-medium">Set →</span>
        </Link>
      )}
    </div>
  );
}

