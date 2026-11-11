import { createClient } from "@/lib/supabase/client";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import { READINESS_DOMAINS } from "@/lib/mock-data";
import {
  getStoredReadinessMilestones,
  setStoredReadinessMilestones,
  logActivity,
  dispatchCopilotUpdate,
  BOOTSTRAP_READINESS_MILESTONES,
  getStoredRealResume,
  getStoredResumeWorkspace,
} from "@/lib/storage-sync";
import type { ReadinessMilestone, ReadinessDomain, AiGoalRecommendation } from "@/types";
import type { SkillEvidenceItem } from "@/lib/agent/types";
import { getResumeWorkspace } from "@/lib/services/resume.service";
import type { ReadinessTaskRow } from "./types";

// ─── Shared Date & Readiness Scoring Helpers ─────────────────────────────────

const MONTH_INDEX_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses flexible date strings stored across Demo & Live modes ("2026-11-15",
 * "Nov 15, 2026", "Nov 15", "Today", "Tomorrow", "In 7 days") into a literal
 * local "YYYY-MM-DD" key without UTC off-by-one shifts.
 * Returns null for non-date status strings such as "Completed" or empty values.
 */
export function parseFlexibleDueDate(
  input?: string | null,
  referenceDate: Date = new Date()
): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (
    lower === "completed" ||
    lower === "done" ||
    lower === "none" ||
    lower === "n/a" ||
    lower === "tbd"
  ) {
    return null;
  }

  // 1. Literal YYYY-MM-DD (or ISO timestamp prefix)
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const monthIdx = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const candidate = new Date(year, monthIdx, day);
    if (
      candidate.getFullYear() === year &&
      candidate.getMonth() === monthIdx &&
      candidate.getDate() === day
    ) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
    return null;
  }

  // 2. Relative natural keywords ("Today", "Tomorrow", "In N days")
  const baseDay = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  if (lower === "today") {
    return toLocalDateKey(baseDay);
  }
  if (lower === "tomorrow") {
    baseDay.setDate(baseDay.getDate() + 1);
    return toLocalDateKey(baseDay);
  }
  const inDaysMatch = /^in\s+(\d+)\s+days?$/i.exec(lower);
  if (inDaysMatch) {
    const offset = Number(inDaysMatch[1]);
    if (Number.isFinite(offset) && offset >= 0 && offset <= 3650) {
      baseDay.setDate(baseDay.getDate() + offset);
      return toLocalDateKey(baseDay);
    }
  }

  // 3. Month-name formats ("Nov 15, 2026", "Nov 15", "15 Nov 2026")
  const monFirst = /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?$/.exec(trimmed);
  if (monFirst) {
    const monthIdx = MONTH_INDEX_MAP[monFirst[1].toLowerCase()];
    const day = Number(monFirst[2]);
    const year = monFirst[3] ? Number(monFirst[3]) : referenceDate.getFullYear();
    if (monthIdx !== undefined) {
      const candidate = new Date(year, monthIdx, day);
      if (
        candidate.getFullYear() === year &&
        candidate.getMonth() === monthIdx &&
        candidate.getDate() === day
      ) {
        return toLocalDateKey(candidate);
      }
    }
    return null;
  }

  const dayFirst = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s*,?\s*(\d{4}))?$/.exec(trimmed);
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const monthIdx = MONTH_INDEX_MAP[dayFirst[2].toLowerCase()];
    const year = dayFirst[3] ? Number(dayFirst[3]) : referenceDate.getFullYear();
    if (monthIdx !== undefined) {
      const candidate = new Date(year, monthIdx, day);
      if (
        candidate.getFullYear() === year &&
        candidate.getMonth() === monthIdx &&
        candidate.getDate() === day
      ) {
        return toLocalDateKey(candidate);
      }
    }
    return null;
  }

  // 4. Generic numeric date fallback (e.g., "11/15/2026")
  if (/\d/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return toLocalDateKey(parsed);
    }
  }

  return null;
}

export interface CategoryProgressSummary {
  key: ReadinessMilestone["category"];
  domainLabel: string;
  label: string;
  completed: number;
  total: number;
  remaining: number;
  percentage: number;
}

export interface PreparationProgressSummary {
  completedTasks: number;
  totalTasks: number;
  remainingTasks: number;
  overallTaskPercentage: number;
  digitalTwinConfidenceRatio: number | null;
  overallReadinessPercentage: number;
  categories: CategoryProgressSummary[];
}

export const CANONICAL_READINESS_CATEGORIES: Array<{
  key: ReadinessMilestone["category"];
  domainLabel: string;
  label: string;
  aliases: string[];
}> = [
  {
    key: "resume",
    domainLabel: "Resume",
    label: "Resume preparation",
    aliases: ["resume"],
  },
  {
    key: "skills",
    domainLabel: "Skills",
    label: "Technical skills / DSA",
    aliases: ["skills", "skill", "dsa"],
  },
  {
    key: "interview",
    domainLabel: "Interviews",
    label: "Interview preparation",
    aliases: ["interview", "interviews"],
  },
  {
    key: "network",
    domainLabel: "Networking",
    label: "Networking",
    aliases: ["network", "networking"],
  },
  {
    key: "applications",
    domainLabel: "Applications",
    label: "Applications",
    aliases: ["applications", "application"],
  },
];

export function resolveCanonicalCategoryKey(
  rawCategory?: string | null
): ReadinessMilestone["category"] {
  const normalized = (rawCategory || "").trim().toLowerCase();
  for (const cat of CANONICAL_READINESS_CATEGORIES) {
    if (cat.aliases.includes(normalized)) {
      return cat.key;
    }
  }
  return "skills";
}

/**
 * Single canonical calculation engine shared across Study Plan (/readiness),
 * getReadinessDomains(), and the persistent RHS Preparation Progress panel.
 * Avoids double-counting by assigning every milestone to exactly one category.
 */
export function calculatePreparationProgress(
  milestones: ReadinessMilestone[],
  digitalTwinSkills?: SkillEvidenceItem[] | null
): PreparationProgressSummary {
  const buckets: Record<
    ReadinessMilestone["category"],
    { completed: number; total: number }
  > = {
    resume: { completed: 0, total: 0 },
    skills: { completed: 0, total: 0 },
    interview: { completed: 0, total: 0 },
    network: { completed: 0, total: 0 },
    applications: { completed: 0, total: 0 },
  };

  for (const m of milestones) {
    const key = resolveCanonicalCategoryKey(m.category);
    buckets[key].total += 1;
    if (m.completed) {
      buckets[key].completed += 1;
    }
  }

  const totalTasks = milestones.length;
  const completedTasks = milestones.filter((m) => m.completed).length;
  const remainingTasks = Math.max(0, totalTasks - completedTasks);
  const overallTaskPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const hasTwinSkills = Boolean(digitalTwinSkills && digitalTwinSkills.length > 0);
  let digitalTwinConfidenceRatio: number | null = null;
  if (hasTwinSkills && digitalTwinSkills) {
    const RATIO_MAP: Record<string, number> = {
      HIGH: 1.0,
      MEDIUM: 0.7,
      UNVERIFIED: 0.4,
      LOW: 0.2,
    };
    const totalRatio = digitalTwinSkills.reduce((sum, s) => {
      if (s.bluff_risk) return sum + 0.2;
      return sum + (RATIO_MAP[s.verified_confidence] ?? 0.4);
    }, 0);
    digitalTwinConfidenceRatio = Math.round(
      (totalRatio / digitalTwinSkills.length) * 100
    );
  }

  const completedMilestonesRatio =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const overallReadinessPercentage =
    hasTwinSkills || totalTasks > 0
      ? Math.min(
          100,
          Math.round(
            0.6 * (digitalTwinConfidenceRatio ?? 0) +
              0.4 * completedMilestonesRatio
          )
        )
      : 0;

  const categories: CategoryProgressSummary[] =
    CANONICAL_READINESS_CATEGORIES.map((def) => {
      const b = buckets[def.key];
      const remaining = Math.max(0, b.total - b.completed);
      const percentage =
        b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0;
      return {
        key: def.key,
        domainLabel: def.domainLabel,
        label: def.label,
        completed: b.completed,
        total: b.total,
        remaining,
        percentage,
      };
    });

  return {
    completedTasks,
    totalTasks,
    remainingTasks,
    overallTaskPercentage,
    digitalTwinConfidenceRatio,
    overallReadinessPercentage,
    categories,
  };
}

export async function getReadinessMilestones(): Promise<ReadinessMilestone[]> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    const stored = getStoredReadinessMilestones();
    if (stored && stored.length > 0) return stored;

    const workspace = getStoredResumeWorkspace();
    const realResume = getStoredRealResume();

    if (workspace?.analysis || realResume) {
      const fileName = workspace?.fileName || realResume?.fileName || "Uploaded Resume";
      const rawSkills: any[] =
        workspace?.analysis?.extractedSkills ??
        (workspace?.analysis as any)?.skills ??
        workspace?.analysis?.parsedResume?.skills ??
        realResume?.skills ??
        [];

      const skillsCount = Array.isArray(rawSkills) ? rawSkills.length : 0;
      const projectsCount = workspace?.analysis?.parsedResume?.projects?.length ?? realResume?.projectsCount ?? 0;
      const targetRole = workspace?.analysis?.jobTitle || realResume?.inferredTargetRoles?.[0] || "Target Roles";

      const missingSkills =
        (realResume?.missingRecommendedSkills && realResume.missingRecommendedSkills.length > 0)
          ? realResume.missingRecommendedSkills
          : (workspace?.analysis?.gaps || []).map((g) => ({
              skill: g,
              whyNeeded: "Identified gap from resume diagnostic scan",
              targetRole,
            }));

      const practiceSkills: Array<{ name: string; reason: string }> =
        realResume?.skills && realResume.skills.length > 0
          ? realResume.skills.filter((s) => s.strength === "Needs Practice").map((s) => ({ name: s.name, reason: s.reason }))
          : Array.isArray(rawSkills)
          ? rawSkills
              .filter((s: any) => typeof s === "object" && s?.strength === "Needs Practice")
              .map((s: any) => ({ name: s.name, reason: s.reason || "Targeted practice required" }))
          : [];

      const generated: ReadinessMilestone[] = [
        {
          id: "rm-baseline-1",
          title: `Baseline Ingestion: ${fileName}`,
          category: "resume",
          priority: "low",
          completed: true,
          description: `Extracted ${skillsCount} verified skills & ${projectsCount} projects.`,
          dueDate: "Completed",
        },
        ...missingSkills.map((m, idx) => ({
          id: `rm-rec-${idx + 1}`,
          title: `Master ${m.skill} for ${m.targetRole || targetRole}`,
          category: "skills" as const,
          priority: "high" as const,
          completed: false,
          description: m.whyNeeded,
          dueDate: "In 7 days",
        })),
        ...practiceSkills.map((s, idx) => ({
          id: `rm-practice-${idx + 1}`,
          title: `Strengthen ${s.name} with Practice Drills`,
          category: "skills" as const,
          priority: "medium" as const,
          completed: false,
          description: s.reason,
          dueDate: "In 5 days",
        })),
      ];
      setStoredReadinessMilestones(generated);
      return generated;
    }

    return [];
  }

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(
      authError?.message || "Authentication required: please sign in to view your readiness plan."
    );
  }

  const { data, error } = await supabase
    .from("readiness_tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load readiness tasks from database: ${error.message}`);
  }

  const taskRows = (data as ReadinessTaskRow[]) || [];
  if (taskRows.length === 0) {
    return [];
  }

  return taskRows.map((row: ReadinessTaskRow) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description || "",
    completed: row.completed,
    dueDate: row.due_date
      ? new Date(row.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
      : undefined,
    priority: row.priority,
  }));
}

export async function getReadinessDomains(): Promise<ReadinessDomain[]> {
  const milestones = await getReadinessMilestones();
  const summary = calculatePreparationProgress(milestones);

  return READINESS_DOMAINS.map((domain) => {
    const match = summary.categories.find((c) => c.domainLabel === domain.label);
    return {
      ...domain,
      score: match ? match.percentage : 0,
    };
  });
}

export async function toggleMilestone(
  id: string,
  completed: boolean
): Promise<void> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    const current = getStoredReadinessMilestones();
    const target = current.find((m) => m.id === id);
    const updated = current.map((m) => (m.id === id ? { ...m, completed } : m));
    setStoredReadinessMilestones(updated);

    if (target) {
      logActivity({
        type: "readiness",
        message: `${completed ? "Completed" : "Reopened"} milestone: "${target.title}"`,
      });
    }
    return;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required: please sign in to update milestone progress.");
  }

  const { error } = await supabase
    .from("readiness_tasks")
    .update({ completed })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to update milestone: ${error.message}`);
  }

  dispatchCopilotUpdate("readiness");
}

function formatIsoDayForDisplay(isoDay: string): string {
  return new Date(`${isoDay}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function updateReadinessMilestoneDueDate(
  id: string,
  dueDate?: string | null
): Promise<string | undefined> {
  const mode = getEffectiveDataMode();
  const normalizedIso = dueDate ? parseFlexibleDueDate(dueDate) : null;
  const formattedDisplay = normalizedIso
    ? formatIsoDayForDisplay(normalizedIso)
    : dueDate?.trim() || undefined;

  if (mode === "demo") {
    const current = getStoredReadinessMilestones();
    const target = current.find((m) => m.id === id);
    const updated = current.map((m) =>
      m.id === id ? { ...m, dueDate: formattedDisplay } : m
    );
    setStoredReadinessMilestones(updated);

    if (target) {
      logActivity({
        type: "readiness",
        message: formattedDisplay
          ? `Updated deadline for "${target.title}" to ${formattedDisplay}`
          : `Cleared deadline for "${target.title}"`,
      });
    }
    return formattedDisplay;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required: please sign in to update milestone deadline.");
  }

  const { error } = await supabase
    .from("readiness_tasks")
    .update({ due_date: normalizedIso })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to update milestone deadline: ${error.message}`);
  }

  dispatchCopilotUpdate("readiness");
  return normalizedIso ? formatIsoDayForDisplay(normalizedIso) : undefined;
}

export async function addReadinessMilestone(
  milestone: Omit<ReadinessMilestone, "id">
): Promise<ReadinessMilestone> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    const current = getStoredReadinessMilestones();
    const normalizedIso = milestone.dueDate ? parseFlexibleDueDate(milestone.dueDate) : null;
    const newMilestone: ReadinessMilestone = {
      ...milestone,
      dueDate: normalizedIso ? formatIsoDayForDisplay(normalizedIso) : milestone.dueDate,
      id: `rm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setStoredReadinessMilestones([newMilestone, ...current]);
    logActivity({
      type: "readiness",
      message: `Added new milestone: "${milestone.title}"`,
    });
    return newMilestone;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required: please sign in to add a milestone.");
  }

  const normalizedIso = milestone.dueDate ? parseFlexibleDueDate(milestone.dueDate) : null;

  const { data, error } = await supabase
    .from("readiness_tasks")
    .insert({
      user_id: user.id,
      category: milestone.category,
      title: milestone.title,
      description: milestone.description,
      completed: milestone.completed || false,
      priority: milestone.priority || "medium",
      due_date: normalizedIso,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to add readiness milestone: ${error?.message || "Unknown error"}`);
  }

  dispatchCopilotUpdate("readiness");

  return {
    id: data.id,
    category: data.category,
    title: data.title,
    description: data.description || "",
    completed: data.completed,
    dueDate: data.due_date ? formatIsoDayForDisplay(data.due_date) : undefined,
    priority: data.priority,
  };
}

export async function deleteReadinessMilestone(id: string): Promise<void> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    const current = getStoredReadinessMilestones();
    const updated = current.filter((m) => m.id !== id);
    setStoredReadinessMilestones(updated);
    return;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required: please sign in to delete milestone.");
  }

  const { error } = await supabase
    .from("readiness_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to delete readiness milestone: ${error.message}`);
  }

  dispatchCopilotUpdate("readiness");
}

const REC_CACHE_KEY = "copilot_ai_readiness_recommendations_v1";

export interface AiRecommendationsResult {
  recommendations: AiGoalRecommendation[];
  status: "ready" | "no_resume" | "needs_analysis" | "no_gaps" | "error";
  targetRole?: string;
  source?: string;
  error?: string;
}

export async function fetchAiGoalRecommendations(
  forceRefresh = false
): Promise<AiRecommendationsResult> {
  try {
    const workspace = await getResumeWorkspace();

    // Check if user has uploaded a resume
    const hasRawLocal = typeof window !== "undefined" && Boolean(window.localStorage.getItem("copilot_latest_resume_analysis"));
    const hasAnalysis = Boolean(workspace.analysis && workspace.analysis.matchScore > 0 && workspace.analysis.jobTitle !== "Upload a resume to begin");

    if (!hasRawLocal && !hasAnalysis && !workspace.editableResume) {
      return {
        recommendations: [],
        status: "no_resume",
      };
    }

    if (!hasAnalysis) {
      return {
        recommendations: [],
        status: "needs_analysis",
      };
    }

    const targetRole = workspace.analysis.jobTitle || "Software Engineer";
    const cacheKey = `${targetRole}_${workspace.analysis.matchScore}_${(workspace.analysis.gaps || []).length}`;

    // Check localStorage cache unless forceRefresh
    if (!forceRefresh && typeof window !== "undefined") {
      try {
        const cachedRaw = window.localStorage.getItem(REC_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && cached.cacheKey === cacheKey && Array.isArray(cached.recommendations)) {
            return {
              recommendations: cached.recommendations,
              status: cached.recommendations.length > 0 ? "ready" : "no_gaps",
              targetRole,
              source: cached.source || "cached",
            };
          }
        }
      } catch {}
    }

    // Call recommendations API
    const res = await fetch("/api/readiness/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetRole,
        targetCompany: workspace.analysis.company || "",
        gaps: workspace.analysis.gaps || [],
        missingKeywords: (workspace.analysis.keywords || []).filter((k) => !k.present).map((k) => k.word),
        sectionScores: workspace.analysis.sectionScores,
        suggestions: workspace.analysis.suggestions || [],
        strengths: workspace.analysis.strengths || [],
      }),
    });

    if (!res.ok) {
      throw new Error(`Recommendation API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const recommendations: AiGoalRecommendation[] = data.recommendations || [];
    const status: AiRecommendationsResult["status"] = data.status || (recommendations.length > 0 ? "ready" : "no_gaps");

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          REC_CACHE_KEY,
          JSON.stringify({
            cacheKey,
            recommendations,
            source: data.source || "live",
            timestamp: Date.now(),
          })
        );
      } catch {}
    }

    return {
      recommendations,
      status,
      targetRole,
      source: data.source,
    };
  } catch (err: unknown) {
    return {
      recommendations: [],
      status: "error",
      error: err instanceof Error ? err.message : "Failed to load AI recommendations.",
    };
  }
}
