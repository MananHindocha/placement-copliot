import { createClient } from "@/lib/supabase/client";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import { RESUME_ANALYSIS } from "@/lib/mock-data";
import type { ResumeAnalysis } from "@/types";

let demoAnalysis: ResumeAnalysis = { ...RESUME_ANALYSIS };

export async function getResumeAnalysis(): Promise<ResumeAnalysis> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    return { ...demoAnalysis };
  }

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(
      authError?.message || "Authentication required: please sign in to view your resume analysis."
    );
  }

  const { data, error } = await supabase
    .from("resume_analyses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load resume analysis from database: ${error.message}`);
  }

  if (!data) {
    // If user has not analyzed a resume yet in live mode, provide an empty state structure
    return {
      matchScore: 0,
      atsScore: 0,
      jobTitle: "Upload a resume to begin",
      company: "",
      strengths: [],
      gaps: [],
      suggestions: [],
      keywords: [],
    };
  }

  return {
    matchScore: data.match_score,
    atsScore: data.ats_score,
    jobTitle: data.target_role,
    company: data.target_company || "",
    strengths: data.strengths || [],
    gaps: data.gaps || [],
    suggestions: data.suggestions || [],
    keywords: data.keywords || [],
  };
}

export async function updateTailorSuggestion(
  suggestionId: string,
  suggestedText: string
): Promise<void> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    demoAnalysis = {
      ...demoAnalysis,
      suggestions: demoAnalysis.suggestions.map((s) =>
        s.id === suggestionId ? { ...s, suggested: suggestedText } : s
      ),
    };
    return;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required: please sign in to save resume modifications.");
  }

  // Retrieve current active analysis and update suggestion array
  const { data: current, error: fetchErr } = await supabase
    .from("resume_analyses")
    .select("id, suggestions")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (fetchErr || !current) {
    throw new Error(`Failed to locate analysis record: ${fetchErr?.message || "Not found"}`);
  }

  const existingSuggestions = Array.isArray(current.suggestions)
    ? (current.suggestions as ResumeAnalysis["suggestions"])
    : [];

  if (!existingSuggestions.some((s) => s.id === suggestionId)) {
    throw new Error(`Suggestion not found: ${suggestionId}`);
  }

  const updatedSuggestions = existingSuggestions.map((s) =>
    s.id === suggestionId ? { ...s, suggested: suggestedText } : s
  );

  const { error: updateErr } = await supabase
    .from("resume_analyses")
    .update({ suggestions: updatedSuggestions })
    .eq("id", current.id)
    .eq("user_id", user.id);

  if (updateErr) {
    throw new Error(`Failed to update suggestion: ${updateErr.message}`);
  }
}
