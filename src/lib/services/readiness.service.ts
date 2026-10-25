import { createClient } from "@/lib/supabase/client";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import { READINESS_MILESTONES, READINESS_DOMAINS } from "@/lib/mock-data";
import type { ReadinessMilestone, ReadinessDomain } from "@/types";
import type { ReadinessTaskRow } from "./types";

let demoMilestones: ReadinessMilestone[] = [...READINESS_MILESTONES];

export async function getReadinessMilestones(): Promise<ReadinessMilestone[]> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    return [...demoMilestones];
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
    dueDate: row.due_date ? new Date(row.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : undefined,
    priority: row.priority,
  }));
}

export async function getReadinessDomains(): Promise<ReadinessDomain[]> {
  // Domain definitions represent the 5 preparation pillars
  return [...READINESS_DOMAINS];
}

export async function toggleMilestone(
  id: string,
  completed: boolean
): Promise<void> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    demoMilestones = demoMilestones.map((m) =>
      m.id === id ? { ...m, completed } : m
    );
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
}
