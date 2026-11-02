import { createClient } from "@/lib/supabase/client";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import { READINESS_DOMAINS } from "@/lib/mock-data";
import {
  getStoredReadinessMilestones,
  setStoredReadinessMilestones,
  logActivity,
  dispatchCopilotUpdate,
} from "@/lib/storage-sync";
import type { ReadinessMilestone, ReadinessDomain, AiGoalRecommendation } from "@/types";
import { getResumeWorkspace } from "@/lib/services/resume.service";
import type { ReadinessTaskRow } from "./types";

export async function getReadinessMilestones(): Promise<ReadinessMilestone[]> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    return getStoredReadinessMilestones();
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

  return ((data as ReadinessTaskRow[]) || []).map((row: ReadinessTaskRow) => ({
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

  // Compute dynamic domain scores from milestones
  const domainCategories: Record<string, string[]> = {
    Resume: ["resume"],
    Skills: ["skills"],
    Networking: ["network", "networking"],
    Interviews: ["interview", "interviews"],
    Applications: ["applications", "application"],
  };

  return READINESS_DOMAINS.map((domain) => {
    const cats = domainCategories[domain.label] || [domain.label.toLowerCase()];
    const inCat = milestones.filter((m) => cats.includes(m.category.toLowerCase()));
    const completedInCat = inCat.filter((m) => m.completed).length;
    const computedScore = inCat.length > 0 ? Math.round((completedInCat / inCat.length) * 100) : 0;

    return {
      ...domain,
      score: computedScore,
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

export async function addReadinessMilestone(
  milestone: Omit<ReadinessMilestone, "id">
): Promise<ReadinessMilestone> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    const current = getStoredReadinessMilestones();
    const newMilestone: ReadinessMilestone = {
      ...milestone,
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

  const { data, error } = await supabase
    .from("readiness_tasks")
    .insert({
      user_id: user.id,
      category: milestone.category,
      title: milestone.title,
      description: milestone.description,
      completed: milestone.completed || false,
      priority: milestone.priority || "medium",
      due_date: milestone.dueDate ? new Date(milestone.dueDate).toISOString().split("T")[0] : null,
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
    dueDate: data.due_date,
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
