"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useAgent } from "@/context/AgentProvider";
import { createClient } from "@/lib/supabase/client";
import { getEffectiveDataMode, isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/services/auth.service";
import {
  calculatePreparationProgress,
  getReadinessMilestones,
  parseFlexibleDueDate,
  resolveCanonicalCategoryKey,
  toggleMilestone,
  type PreparationProgressSummary,
} from "@/lib/services/readiness.service";
import { getApplications } from "@/lib/services/applications.service";
import { getPastInterviewSessions } from "@/lib/services/interview.service";
import { getDsaStatuses } from "@/lib/dsa-storage";
import { DSA_OA_PROBLEMS } from "@/lib/dsa-oa-questions";
import type { InterviewSession, KanbanCard, ReadinessMilestone } from "@/types";

export type CalendarActivityCategory =
  | "readiness"
  | "interview"
  | "dsa"
  | "application";

export interface CalendarActivityItem {
  id: string;
  dateKey: string; // "YYYY-MM-DD" in local calendar time
  title: string;
  subtitle?: string;
  category: CalendarActivityCategory;
  categoryLabel: string;
  status: "completed" | "pending" | "upcoming";
  statusLabel: string;
  href: string;
  priority?: "high" | "medium" | "low";
  milestoneId?: string;
  milestoneCompleted?: boolean;
}

export interface DsaPracticeSummary {
  solved: number;
  attempted: number;
  total: number;
}

export interface PreparationSyncState {
  mode: "demo" | "live";
  isAuthenticated: boolean;
  currentUserId: string | null;
  loading: boolean;
  error: string | null;
  activities: CalendarActivityItem[];
  activitiesByDate: Record<string, CalendarActivityItem[]>;
  unscheduledMilestonesCount: number;
  progress: PreparationProgressSummary;
  dsaSummary: DsaPracticeSummary | null;
  refresh: () => Promise<void>;
  toggleReadinessMilestone: (
    milestoneId: string,
    nextCompleted: boolean
  ) => Promise<void>;
}

const STATUS_SORT_ORDER: Record<CalendarActivityItem["status"], number> = {
  upcoming: 0,
  pending: 1,
  completed: 2,
};

function buildCalendarActivities(
  milestones: ReadinessMilestone[],
  applications: KanbanCard[],
  sessions: InterviewSession[]
): { activities: CalendarActivityItem[]; unscheduledMilestonesCount: number } {
  const items: CalendarActivityItem[] = [];
  let unscheduledMilestonesCount = 0;

  // 1. Readiness milestones (Study Plan + Skills/DSA milestones + Interview prep milestones)
  for (const m of milestones) {
    const dateKey = parseFlexibleDueDate(m.dueDate);
    if (!dateKey) {
      if (!m.completed) {
        unscheduledMilestonesCount += 1;
      }
      continue;
    }

    const canonical = resolveCanonicalCategoryKey(m.category);
    let category: CalendarActivityCategory = "readiness";
    let categoryLabel = "Readiness Task";

    if (canonical === "skills") {
      category = "dsa";
      categoryLabel = "DSA / Technical";
    } else if (canonical === "interview") {
      category = "interview";
      categoryLabel = "Interview Prep";
    } else if (canonical === "applications") {
      category = "application";
      categoryLabel = "Applications Goal";
    } else if (canonical === "network") {
      category = "readiness";
      categoryLabel = "Networking";
    } else if (canonical === "resume") {
      category = "readiness";
      categoryLabel = "Resume Polish";
    }

    items.push({
      id: `ms-${m.id}`,
      dateKey,
      title: m.title,
      subtitle: m.description || undefined,
      category,
      categoryLabel,
      status: m.completed ? "completed" : "pending",
      statusLabel: m.completed ? "Completed" : "Pending",
      href: "/readiness",
      priority: m.priority,
      milestoneId: m.id,
      milestoneCompleted: m.completed,
    });
  }

  // 2. Applications: scheduled interview rounds/next steps, deadlines, and applied records
  for (const card of applications) {
    const nextStepKey = parseFlexibleDueDate(card.nextStepDate);
    if (nextStepKey) {
      const isInterviewStage =
        card.status === "Phone Screen" || card.status === "Interview";
      items.push({
        id: `app-next-${card.id}`,
        dateKey: nextStepKey,
        title: `${card.company} — ${card.nextStep || card.title}`,
        subtitle: card.title,
        category: "interview",
        categoryLabel: isInterviewStage
          ? card.status === "Phone Screen"
            ? "Phone Screen"
            : "Interview Round"
          : "Next Step",
        status: "upcoming",
        statusLabel: card.status === "Offer" ? "Offer Stage" : "Scheduled",
        href: "/tracker",
        priority: card.priority,
      });
    }

    const closingKey = parseFlexibleDueDate(card.closingDate);
    if (closingKey) {
      const hasApplied = card.status !== "Wishlist";
      items.push({
        id: `app-close-${card.id}`,
        dateKey: closingKey,
        title: `${card.company} — ${card.title}`,
        subtitle:
          card.deadlineProvenance === "verified_source"
            ? "Verified application deadline"
            : "Application closing date",
        category: "application",
        categoryLabel: "App Deadline",
        status: hasApplied ? "completed" : "pending",
        statusLabel: hasApplied ? `Applied (${card.status})` : "Open Deadline",
        href: "/tracker",
        priority: card.priority,
      });
    }

    const appliedKey = parseFlexibleDueDate(card.appliedDate);
    if (appliedKey) {
      items.push({
        id: `app-applied-${card.id}`,
        dateKey: appliedKey,
        title: `Applied: ${card.company}`,
        subtitle: card.title,
        category: "application",
        categoryLabel: "Application Sent",
        status: "completed",
        statusLabel: card.status,
        href: "/tracker",
      });
    }
  }

  // 3. Recorded Mock Interview Sessions
  for (const s of sessions) {
    const sessionKey = parseFlexibleDueDate(s.date);
    if (!sessionKey) continue;

    const reliablyCompleted = s.questionsAnswered > 0 || s.score > 0;
    items.push({
      id: `is-${s.id}`,
      dateKey: sessionKey,
      title: s.role,
      subtitle: `${s.questionsAnswered} question${s.questionsAnswered === 1 ? "" : "s"} · ${s.duration}`,
      category: "interview",
      categoryLabel: "Mock Interview",
      status: reliablyCompleted ? "completed" : "pending",
      statusLabel: reliablyCompleted
        ? `Completed · ${s.score}/100`
        : "Recorded",
      href: "/interview",
    });
  }

  items.sort((a, b) => {
    if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
    return STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
  });

  return { activities: items, unscheduledMilestonesCount };
}

export function usePreparationData(): PreparationSyncState {
  const pathname = usePathname();
  const { digitalTwin } = useAgent();
  const mode = getEffectiveDataMode();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(mode === "demo");
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    mode === "demo" ? "demo-user" : null
  );

  const [milestones, setMilestones] = useState<ReadinessMilestone[]>([]);
  const [applications, setApplications] = useState<KanbanCard[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [dsaSummary, setDsaSummary] = useState<DsaPracticeSummary | null>(null);

  const requestVersionRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestVersionRef.current;
    setError(null);

    try {
      if (mode === "live") {
        const user = await getCurrentUser();
        if (requestId !== requestVersionRef.current) return;

        if (!user) {
          setIsAuthenticated(false);
          setCurrentUserId(null);
          setMilestones([]);
          setApplications([]);
          setSessions([]);
          setDsaSummary(null);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);
        setCurrentUserId(user.id);

        const [mList, appList, sessionList] = await Promise.all([
          getReadinessMilestones(),
          getApplications(),
          getPastInterviewSessions(),
        ]);

        if (requestId !== requestVersionRef.current) return;
        setMilestones(mList);
        setApplications(appList);
        setSessions(sessionList);
        // Do not mix unscoped localStorage DSA status across authenticated Supabase users
        setDsaSummary(null);
        setLoading(false);
        return;
      }

      // Demo mode: read strictly from unified demo service layer
      const [mList, appList, sessionList] = await Promise.all([
        getReadinessMilestones(),
        getApplications(),
        getPastInterviewSessions(),
      ]);

      if (requestId !== requestVersionRef.current) return;

      const dsaStatuses = getDsaStatuses();
      const statusValues = Object.values(dsaStatuses);
      const solved = statusValues.filter((v) => v === "solved").length;
      const attempted = statusValues.filter((v) => v === "attempted").length;

      setIsAuthenticated(true);
      setCurrentUserId("demo-user");
      setMilestones(mList);
      setApplications(appList);
      setSessions(sessionList);
      setDsaSummary(
        solved > 0 || attempted > 0
          ? { solved, attempted, total: DSA_OA_PROBLEMS.length }
          : null
      );
      setLoading(false);
    } catch (err: unknown) {
      if (requestId !== requestVersionRef.current) return;
      setError(
        err instanceof Error ? err.message : "Failed to synchronize preparation data."
      );
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh, pathname]);

  useEffect(() => {
    const handleSync = () => {
      void refresh();
    };

    window.addEventListener("copilot-data-updated", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("agent-state-mutated", handleSync);
    window.addEventListener("copilot-dsa-status-updated", handleSync);

    let unsubscribeAuth: (() => void) | undefined;
    if (mode === "live" && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(
          (event: AuthChangeEvent, session: Session | null) => {
            if (event === "SIGNED_OUT" || !session?.user) {
              setMilestones([]);
              setApplications([]);
              setSessions([]);
              setDsaSummary(null);
              setIsAuthenticated(false);
              setCurrentUserId(null);
            }
            void refresh();
          }
        );
        unsubscribeAuth = () => subscription.unsubscribe();
      } catch {
        // Safe fallback if client init fails
      }
    }

    return () => {
      window.removeEventListener("copilot-data-updated", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("agent-state-mutated", handleSync);
      window.removeEventListener("copilot-dsa-status-updated", handleSync);
      unsubscribeAuth?.();
    };
  }, [mode, refresh]);

  const toggleReadinessMilestone = useCallback(
    async (milestoneId: string, nextCompleted: boolean) => {
      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestoneId ? { ...m, completed: nextCompleted } : m
        )
      );
      try {
        await toggleMilestone(milestoneId, nextCompleted);
        await refresh();
      } catch (err: unknown) {
        setMilestones((prev) =>
          prev.map((m) =>
            m.id === milestoneId ? { ...m, completed: !nextCompleted } : m
          )
        );
        setError(
          err instanceof Error ? err.message : "Failed to update milestone status."
        );
      }
    },
    [refresh]
  );

  const { activities, unscheduledMilestonesCount } = useMemo(
    () => buildCalendarActivities(milestones, applications, sessions),
    [milestones, applications, sessions]
  );

  const activitiesByDate = useMemo(() => {
    const map: Record<string, CalendarActivityItem[]> = {};
    for (const item of activities) {
      if (!map[item.dateKey]) {
        map[item.dateKey] = [];
      }
      map[item.dateKey].push(item);
    }
    return map;
  }, [activities]);

  const progress = useMemo(
    () =>
      calculatePreparationProgress(
        milestones,
        isAuthenticated ? digitalTwin?.skills : undefined
      ),
    [milestones, digitalTwin?.skills, isAuthenticated]
  );

  return {
    mode,
    isAuthenticated,
    currentUserId,
    loading,
    error,
    activities,
    activitiesByDate,
    unscheduledMilestonesCount,
    progress,
    dsaSummary,
    refresh,
    toggleReadinessMilestone,
  };
}

