"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, LogIn, RefreshCw, X } from "lucide-react";
import { clsx } from "clsx";
import { toLocalDateKey } from "@/lib/services/readiness.service";
import { usePreparationData } from "@/lib/preparation-sync";
import PreparationCalendar from "./PreparationCalendar";
import SelectedDateActivities from "./SelectedDateActivities";
import PreparationProgress from "./PreparationProgress";

interface PreparationSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onProgressSummaryChange?: (summary: {
    pct: number;
    todayCount: number;
  }) => void;
}

export default function PreparationSidebar({
  mobileOpen = false,
  onCloseMobile,
  onProgressSummaryChange,
}: PreparationSidebarProps) {
  const {
    mode,
    isAuthenticated,
    loading,
    error,
    activities,
    activitiesByDate,
    unscheduledMilestonesCount,
    progress,
    dsaSummary,
    refresh,
    toggleReadinessMilestone,
  } = usePreparationData();

  const todayDateKey = useMemo(() => toLocalDateKey(new Date()), []);
  const [viewedMonth, setViewedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayDateKey);

  // Sync Topbar compact mobile trigger badge
  useEffect(() => {
    if (!onProgressSummaryChange) return;
    const todayCount = (activitiesByDate[todayDateKey] || []).filter(
      (a) => a.status !== "completed"
    ).length;
    onProgressSummaryChange({
      pct: progress.overallTaskPercentage,
      todayCount,
    });
  }, [
    activitiesByDate,
    todayDateKey,
    progress.overallTaskPercentage,
    onProgressSummaryChange,
  ]);

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMobile?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mobileOpen, onCloseMobile]);

  const selectedActivities = activitiesByDate[selectedDateKey] || [];

  // Nearest upcoming dated activity (>= selectedDateKey or earliest upcoming after today)
  const nextScheduledDateKey = (() => {
    const upcoming = activities
      .map((a) => a.dateKey)
      .filter((k) => k > selectedDateKey && k >= todayDateKey);
    if (upcoming.length > 0) return upcoming[0];
    const anyDated = activities.find((a) => a.dateKey !== selectedDateKey);
    return anyDated ? anyDated.dateKey : null;
  })();

  const handleJumpToDate = (dateKey: string) => {
    const [y, m] = dateKey.split("-").map(Number);
    setViewedMonth(new Date(y, m - 1, 1));
    setSelectedDateKey(dateKey);
  };

  const renderPanelContent = (isDrawer: boolean) => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-[#1D1D1D] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#0D0D0D] border border-[#1D1D1D] flex items-center justify-center shrink-0">
            <Calendar className="w-3.5 h-3.5 text-[#A1A1AA]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-[#F5F5F5] leading-tight truncate">
              Preparation Schedule
            </h2>
            <p className="text-[10px] text-[#71717A] truncate">
              {mode === "live" ? "Synced workspace" : "Local study workspace"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => refresh()}
            aria-label="Refresh preparation schedule"
            title="Sync latest schedule & progress"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#121212] transition-colors cursor-pointer"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>

          {isDrawer && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close preparation panel"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#121212] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Inner Content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3.5 space-y-4">
        {mode === "live" && !isAuthenticated && !loading ? (
          <div className="rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] p-4 text-center space-y-3">
            <div className="w-9 h-9 rounded-lg bg-[#0D0D0D] border border-[#1D1D1D] flex items-center justify-center mx-auto text-[#A1A1AA]">
              <LogIn className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#F5F5F5]">
                Sign in to view your schedule
              </p>
              <p className="text-[11px] text-[#71717A] leading-relaxed">
                Your milestones, interview dates, and progress are isolated per account.
              </p>
            </div>
            <Link
              href="/auth/login"
              onClick={isDrawer ? onCloseMobile : undefined}
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-[#F5F5F5] hover:bg-[#E4E4E7] text-[#000000] text-xs font-semibold transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-lg border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-2.5 text-[11px] text-[#F43F5E] flex items-center justify-between gap-2">
                <span className="truncate">{error}</span>
                <button
                  type="button"
                  onClick={() => refresh()}
                  className="text-[#F5F5F5] underline shrink-0 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* 1. Interactive Monthly Calendar */}
            <PreparationCalendar
              viewedMonth={viewedMonth}
              onChangeMonth={setViewedMonth}
              selectedDateKey={selectedDateKey}
              todayDateKey={todayDateKey}
              onSelectDate={setSelectedDateKey}
              activitiesByDate={activitiesByDate}
            />

            {/* 2. Selected Date Details */}
            <SelectedDateActivities
              selectedDateKey={selectedDateKey}
              todayDateKey={todayDateKey}
              activities={selectedActivities}
              nextScheduledDateKey={nextScheduledDateKey}
              unscheduledCount={unscheduledMilestonesCount}
              onJumpToDate={handleJumpToDate}
              onToggleMilestone={toggleReadinessMilestone}
              onNavigate={isDrawer ? onCloseMobile : undefined}
            />

            <div className="border-t border-[#171717]" />

            {/* 3. Preparation Progress & Categories */}
            <PreparationProgress
              progress={progress}
              dsaSummary={dsaSummary}
              loading={loading}
              onNavigate={isDrawer ? onCloseMobile : undefined}
            />
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop & Landscape Tablet Fixed RHS Column */}
      <aside
        aria-label="Preparation Calendar and Progress"
        className="hidden lg:flex lg:w-[272px] xl:w-[304px] 2xl:w-[324px] shrink-0 h-full min-h-0 flex-col bg-[#050505] border-l border-[#1D1D1D] print:hidden"
      >
        {renderPanelContent(false)}
      </aside>

      {/* Mobile & Portrait Tablet Accessible Slide-over Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex justify-end print:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Preparation Schedule and Progress"
        >
          <div
            className="fixed inset-0 bg-black/80 animate-fadeIn"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-[min(328px,92vw)] h-full min-h-0 flex flex-col bg-[#050505] border-l border-[#292929]">
            {renderPanelContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}

