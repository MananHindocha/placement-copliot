import { createClient } from "@/lib/supabase/client";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import { RESUME_ANALYSIS } from "@/lib/mock-data";
import type { ResumeAnalysis } from "@/types";

let demoAnalysis: ResumeAnalysis = {
  ...RESUME_ANALYSIS,
  sectionScores: {
    impact: 84,
    brevity: 92,
    style: 78,
    skills: 88,
  },
  extractedSkills: [
    "TypeScript", "React", "Node.js", "PostgreSQL",
    "Docker", "REST APIs", "GraphQL", "Tailwind CSS",
  ],
};

export interface AnalyzeResumeResponse {
  analysis: ResumeAnalysis;
  source: "gemini" | "groq" | "heuristic";
  pythonParserActive: boolean;
  diagnosticTip?: string;
}

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
    suggestions: (data.suggestions as ResumeAnalysis["suggestions"]) || [],
    keywords: (data.keywords as ResumeAnalysis["keywords"]) || [],
    sectionScores: {
      impact: 80,
      brevity: 85,
      style: 80,
      skills: 85,
    },
  };
}

export async function analyzeResumeFile(
  file: File,
  targetRole?: string,
  jobDescription?: string
): Promise<AnalyzeResumeResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (targetRole) formData.append("targetRole", targetRole);
  if (jobDescription) formData.append("jobDescription", jobDescription);

  const res = await fetch("/api/resume/analyze", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to analyze resume.");
  }

  const result: AnalyzeResumeResponse = await res.json();
  demoAnalysis = result.analysis;
  return result;
}

export async function reEvaluateResumeText(
  rawText: string,
  fileName: string,
  targetRole?: string,
  jobDescription?: string
): Promise<AnalyzeResumeResponse> {
  const formData = new FormData();
  formData.append("rawText", rawText);
  formData.append("fileName", fileName);
  if (targetRole) formData.append("targetRole", targetRole);
  if (jobDescription) formData.append("jobDescription", jobDescription);

  const res = await fetch("/api/resume/analyze", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to re-evaluate resume.");
  }

  const result: AnalyzeResumeResponse = await res.json();
  demoAnalysis = result.analysis;
  return result;
}

export function setDemoAnalysis(analysis: ResumeAnalysis): void {
  demoAnalysis = { ...analysis };
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
