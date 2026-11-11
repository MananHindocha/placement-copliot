"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { toLocalDateKey } from "@/lib/services/readiness.service";
import type {
  CalendarActivityCategory,
  CalendarActivityItem,
} from "@/lib/preparation-sync";

interface PreparationCalendarProps {
  viewedMonth: Date;
  onChangeMonth: (nextMonth: Date) => void;
  selectedDateKey: string;
  todayDateKey: string;
  onSelectDate: (dateKey: string) => void;
  activitiesByDate: Record<string, CalendarActivityItem[]>;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const CATEGORY_DOT_ORDER: CalendarActivityCategory[] = [
  "interview",
  "dsa",
  "readiness",
  "application",
];

const CATEGORY_DOT_COLORS: Record<CalendarActivityCategory, string> = {
  readiness: "bg-[#A78BFA]",
  interview: "bg-[#F59E0B]",
  dsa: "bg-[#38BDF8]",
  application: "bg-[#10B981]",
};

interface CalendarCell {
  date: Date;
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
}

function buildMonthGrid(viewedMonth: Date): CalendarCell[] {
  const year = viewedMonth.getFullYear();
  const month = viewedMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Compute minimum whole weeks needed (35 or 42 cells) so vertical height stays compact
  const totalNeeded = startDayOfWeek + daysInMonth;
  const totalCells = totalNeeded > 35 ? 42 : 35;

  const gridStart = new Date(year, month, 1 - startDayOfWeek);
  const cells: CalendarCell[] = [];

  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i
    );
    cells.push({
      date: cellDate,
      dateKey: toLocalDateKey(cellDate),
      dayNumber: cellDate.getDate(),
      inCurrentMonth: cellDate.getMonth() === month,
    });
  }

  return cells;
}

export default function PreparationCalendar({
  viewedMonth,
  onChangeMonth,
  selectedDateKey,
  todayDateKey,
  onSelectDate,
  activitiesByDate,
}: PreparationCalendarProps) {
  const cells = buildMonthGrid(viewedMonth);
  const monthLabel = viewedMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const isViewingTodayMonth =
    viewedMonth.getFullYear() === Number(todayDateKey.slice(0, 4)) &&
    viewedMonth.getMonth() === Number(todayDateKey.slice(5, 7)) - 1;

  const handlePrevMonth = () => {
    onChangeMonth(
      new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    onChangeMonth(
      new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() + 1, 1)
    );
  };

  const handleResetToday = () => {
    const now = new Date();
    onChangeMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDate(todayDateKey);
  };

  const handleCellClick = (cell: CalendarCell) => {
    if (!cell.inCurrentMonth) {
      onChangeMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
    }
    onSelectDate(cell.dateKey);
  };

  return (
    <div className="rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] p-3 space-y-2.5">
      {/* Month / Year Navigation */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#F5F5F5] tracking-tight">
          {monthLabel}
        </span>

        <div className="flex items-center gap-1">
          {(!isViewingTodayMonth || selectedDateKey !== todayDateKey) && (
            <button
              type="button"
              onClick={handleResetToday}
              className="px-2 py-0.5 rounded-md text-[10px] font-medium text-[#A78BFA] bg-[#121212] border border-[#292929] hover:bg-[#1A1A1A] transition-colors cursor-pointer mr-0.5"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="w-6 h-6 rounded-md flex items-center justify-center bg-[#0D0D0D] border border-[#1D1D1D] text-[#A1A1AA] hover:text-[#F5F5F5] hover:border-[#292929] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="w-6 h-6 rounded-md flex items-center justify-center bg-[#0D0D0D] border border-[#1D1D1D] text-[#A1A1AA] hover:text-[#F5F5F5] hover:border-[#292929] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-[10px] font-semibold text-[#71717A] uppercase tracking-wider py-0.5"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const isToday = cell.dateKey === todayDateKey;
          const isSelected = cell.dateKey === selectedDateKey;
          const dayItems = activitiesByDate[cell.dateKey] || [];
          const uniqueCats = CATEGORY_DOT_ORDER.filter((cat) =>
            dayItems.some((item) => item.category === cat)
          );

          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => handleCellClick(cell)}
              aria-label={`${cell.date.toDateString()}${
                dayItems.length > 0
                  ? `, ${dayItems.length} scheduled activit${
                      dayItems.length === 1 ? "y" : "ies"
                    }`
                  : ""
              }`}
              aria-pressed={isSelected}
              className={clsx(
                "relative h-8 rounded-lg flex flex-col items-center justify-center text-[11px] tabular-nums transition-colors cursor-pointer select-none",
                isSelected
                  ? "bg-[#121212] text-[#F5F5F5] font-semibold ring-1 ring-[#A78BFA]"
                  : isToday
                  ? "bg-[#0D0D0D] text-[#F5F5F5] font-semibold border border-[#292929] hover:bg-[#121212]"
                  : cell.inCurrentMonth
                  ? "text-[#F5F5F5] hover:bg-[#121212] font-medium"
                  : "text-[#52525B] hover:bg-[#0D0D0D]"
              )}
            >
              <span className="leading-none">{cell.dayNumber}</span>

              {/* Subtle Activity Dots */}
              {uniqueCats.length > 0 && (
                <span className="flex items-center gap-0.5 mt-0.5 h-1">
                  {uniqueCats.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className={clsx(
                        "w-1 h-1 rounded-full",
                        CATEGORY_DOT_COLORS[cat]
                      )}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Understated Legend */}
      <div className="pt-2 border-t border-[#171717] flex items-center justify-between gap-2 text-[10px] text-[#71717A]">
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" />
          Study
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          Interview
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
          DSA/Tech
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          Apps
        </span>
      </div>
    </div>
  );
}

