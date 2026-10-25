import { createClient } from "@/lib/supabase/client";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import { KANBAN_CARDS } from "@/lib/mock-data";
import type { KanbanCard, KanbanStatus } from "@/types";
import type { ApplicationRow } from "./types";

// In-memory demo store to keep UI reactive during guest demo sessions
let demoCards: KanbanCard[] = [...KANBAN_CARDS];

export async function getApplications(): Promise<KanbanCard[]> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    return [...demoCards];
  }

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(
      authError?.message || "Authentication required: please sign in to view your applications."
    );
  }

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load applications from database: ${error.message}`);
  }

  return ((data as ApplicationRow[]) || []).map((row: ApplicationRow) => ({
    id: row.id,
    title: row.title,
    company: row.company,
    logo: row.logo || row.company.slice(0, 2).toUpperCase(),
    status: row.status,
    appliedDate: row.applied_date ? new Date(row.applied_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : undefined,
    nextStep: row.next_step || undefined,
    nextStepDate: row.next_step_date ? new Date(row.next_step_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : undefined,
    matchScore: row.match_score ?? 0,
    priority: row.priority || "medium",
    notes: row.notes || undefined,
  }));
}

export async function updateApplicationStatus(
  id: string,
  newStatus: KanbanStatus
): Promise<void> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    demoCards = demoCards.map((c) => (c.id === id ? { ...c, status: newStatus } : c));
    return;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required: please sign in to update application status.");
  }

  const { error } = await supabase
    .from("applications")
    .update({ status: newStatus })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to update application status: ${error.message}`);
  }
}

export async function addApplication(
  card: Omit<KanbanCard, "id">
): Promise<KanbanCard> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    const newCard: KanbanCard = {
      ...card,
      id: `k-${Date.now()}`,
    };
    demoCards = [newCard, ...demoCards];
    return newCard;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required: please sign in to add an application.");
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      company: card.company,
      title: card.title,
      logo: card.logo,
      status: card.status,
      priority: card.priority,
      applied_date: card.appliedDate ? new Date(card.appliedDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      next_step: card.nextStep,
      next_step_date: card.nextStepDate ? new Date(card.nextStepDate).toISOString().split("T")[0] : null,
      match_score: card.matchScore,
      notes: card.notes,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to add application: ${error?.message || "Unknown error"}`);
  }

  return {
    id: data.id,
    title: data.title,
    company: data.company,
    logo: data.logo,
    status: data.status as KanbanStatus,
    appliedDate: data.applied_date,
    nextStep: data.next_step,
    nextStepDate: data.next_step_date,
    matchScore: data.match_score,
    priority: data.priority,
    notes: data.notes,
  };
}

export async function deleteApplication(id: string): Promise<void> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    demoCards = demoCards.filter((c) => c.id !== id);
    return;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required: please sign in to delete an application.");
  }

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to delete application: ${error.message}`);
  }
}
