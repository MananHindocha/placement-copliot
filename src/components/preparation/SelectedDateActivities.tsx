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
  readiness: "text-[#A78BFA] bg-[#121212] border-[#292929]",
  interview: "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/25",
  dsa: "text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/25",
  application: "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/25",
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
        <span className="text-[11px] font-semibold text-[#F5F5F5] truncate">
          {dateHeading}
        </span>
        <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-[#0A0A0A] border border-[#1D1D1D] text-[#A1A1AA] shrink-0">
          {activities.length} {activities.length === 1 ? "item" : "items"}
        </span>
      </div>

      {/* Activities List or Empty State */}
      {activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#292929] bg-[#0A0A0A] p-3.5 text-center space-y-2">
          <div className="w-7 h-7 rounded-lg bg-[#121212] border border-[#1D1D1D] flex items-center justify-center mx-auto text-[#71717A]">
            <CalendarDays className="w-3.5 h-3.5" />
          </div>
          <p className="text-[11px] text-[#71717A] leading-relaxed">
            No scheduled activities on this date.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
            {nextScheduledDateKey && nextScheduledDateKey !== selectedDateKey && (
              <button
                type="button"
                onClick={() => onJumpToDate(nextScheduledDateKey)}
                className="text-[11px] font-medium text-[#A78BFA] hover:text-[#F5F5F5] transition-colors cursor-pointer"
              >
                Next: {formatCompactDateKey(nextScheduledDateKey)} →
              </button>
            )}
            <Link
              href="/readiness"
              onClick={onNavigate}
              className="text-[11px] font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors"
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
                    ? "bg-[#10B981]/5 border-[#10B981]/20"
                    : "bg-[#0D0D0D] border-[#1D1D1D] hover:border-[#292929]"
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
                      className="mt-0.5 shrink-0 text-[#71717A] hover:text-[#F5F5F5] transition-colors cursor-pointer"
                    >
                      {item.milestoneCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#52525B] hover:text-[#F5F5F5]" />
                      )}
                    </button>
                  ) : (
                    <span className="mt-0.5 shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                      ) : isUpcoming ? (
                        <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-[#71717A]" />
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
                            ? "text-[#71717A] line-through"
                            : "text-[#F5F5F5] group-hover/link:text-[#A78BFA]"
                        )}
                      >
                        {item.title}
                      </p>
                      <ArrowRight className="w-3 h-3 text-[#71717A] group-hover/link:text-[#F5F5F5] shrink-0 mt-0.5 transition-colors" />
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
                            ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25"
                            : isUpcoming
                            ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25"
                            : "bg-[#121212] text-[#A1A1AA] border-[#292929]"
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
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0A0A0A] border border-[#1D1D1D] hover:border-[#292929] text-[10px] text-[#71717A] hover:text-[#F5F5F5] transition-colors"
        >
          <span>
            {unscheduledCount} pending milestone{unscheduledCount === 1 ? "" : "s"} without due date
          </span>
          <span className="text-[#F5F5F5] font-medium">Set →</span>
        </Link>
      )}
    </div>
  );
}

