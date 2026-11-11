import { createClient } from "@/lib/supabase/client";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import { logActivity, dispatchCopilotUpdate, getStoredRealResume } from "@/lib/storage-sync";
import type { ParsedResumeDocument, ResumeAnalysis } from "@/types";

const WORKSPACE_KEY = "copilot_latest_resume_analysis";

export interface ResumeWorkspace {
  analysis: ResumeAnalysis;
  editableResume: ParsedResumeDocument | null;
  appliedSuggestionIds: string[];
  userId: string | null;
}

let demoAnalysis: ResumeAnalysis | null = null;

function emptyAnalysis(): ResumeAnalysis {
  return {
    matchScore: 0,
    atsScore: 0,
    jobTitle: "Upload a resume to begin",
    company: "",
    strengths: [],
    gaps: [],
    suggestions: [],
    keywords: [],
    extractedSkills: [],
  };
}

export interface AnalyzeResumeResponse {
  analysis: ResumeAnalysis;
  source: "gemini" | "groq" | "heuristic";
  pythonParserActive: boolean;
  diagnosticTip?: string;
}

export async function getResumeAnalysis(): Promise<ResumeAnalysis> {
  return (await getResumeWorkspace()).analysis;
}

function readStoredWorkspace(): ResumeWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(WORKSPACE_KEY) || "null");
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
    const value = raw as Partial<ResumeWorkspace> & { fileName?: string };
    if (!value.analysis || typeof value.analysis !== "object") return null;

    const rawAnalysis: any = value.analysis;
    const skillsList: string[] = Array.isArray(rawAnalysis.extractedSkills)
      ? rawAnalysis.extractedSkills
      : Array.isArray(rawAnalysis.skills)
      ? rawAnalysis.skills.map((s: any) => (typeof s === "string" ? s : s?.name || ""))
      : [];

    const normalizedAnalysis: ResumeAnalysis = {
      matchScore:
        typeof rawAnalysis.matchScore === "number"
          ? rawAnalysis.matchScore
          : rawAnalysis.atsScore || rawAnalysis.score || 70,
      atsScore:
        typeof rawAnalysis.atsScore === "number"
          ? rawAnalysis.atsScore
          : rawAnalysis.matchScore || rawAnalysis.score || 70,
      jobTitle: rawAnalysis.jobTitle || rawAnalysis.targetRole || "Software Engineer",
      company: rawAnalysis.company || "Target Roles",
      strengths: Array.isArray(rawAnalysis.strengths) ? rawAnalysis.strengths : skillsList.slice(0, 5),
      gaps: Array.isArray(rawAnalysis.gaps) ? rawAnalysis.gaps : [],
      suggestions: Array.isArray(rawAnalysis.suggestions)
        ? rawAnalysis.suggestions
        : Array.isArray(rawAnalysis.improvements)
        ? rawAnalysis.improvements.map((imp: any, i: number) => ({
            id: `sug-${i + 1}`,
            section: "experience" as const,
            original: imp.original || "",
            suggested: imp.improved || imp.suggested || "",
            improved: imp.improved || imp.suggested || "",
            impact: "high" as const,
            reason: imp.section || "Grounded in resume",
            impactLevel: "high" as const,
          }))
        : [],
      keywords: Array.isArray(rawAnalysis.keywords)
        ? rawAnalysis.keywords
        : skillsList.map((sk) => ({ word: sk, present: true, importance: "high" as const })),
      sectionScores:
        rawAnalysis.sectionScores &&
        typeof rawAnalysis.sectionScores === "object" &&
        !Array.isArray(rawAnalysis.sectionScores)
          ? rawAnalysis.sectionScores
          : { format: rawAnalysis.atsScore || 75, impact: 75, style: 80 },
      extractedSkills: skillsList,
      meta: rawAnalysis.meta || { fileName: value.fileName || "Uploaded_Resume.pdf", pageCount: 1 },
      rawText: rawAnalysis.rawText || "",
    };

    let editableResume =
      value.editableResume && typeof value.editableResume === "object" ? value.editableResume : null;
    if (editableResume) {
      editableResume = {
        ...editableResume,
        links: Array.isArray(editableResume.links) ? editableResume.links : [],
        education: Array.isArray(editableResume.education) ? editableResume.education : [],
        experience: Array.isArray(editableResume.experience) ? editableResume.experience : [],
        projects: Array.isArray(editableResume.projects) ? editableResume.projects : [],
        skillCategories: Array.isArray(editableResume.skillCategories) ? editableResume.skillCategories : [],
        skills: Array.isArray(editableResume.skills) ? editableResume.skills : skillsList,
        customSections: Array.isArray(editableResume.customSections) ? editableResume.customSections : [],
      };
    }

    return {
      analysis: normalizedAnalysis,
      editableResume,
      appliedSuggestionIds: Array.isArray(value.appliedSuggestionIds)
        ? value.appliedSuggestionIds.filter((id): id is string => typeof id === "string")
        : [],
      userId: typeof value.userId === "string" ? value.userId : null,
    };
  } catch {
    return null;
  }
}

function writeStoredWorkspace(workspace: ResumeWorkspace): boolean {
  if (typeof window === "undefined") return false;
  const compactWorkspace: ResumeWorkspace = {
    ...workspace,
    analysis: { ...workspace.analysis, parsedResume: undefined },
    editableResume: workspace.editableResume ? { ...workspace.editableResume, rawText: "" } : null,
  };
  try {
    window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(compactWorkspace));
    return true;
  } catch {
    return false;
  }
}

export async function getResumeWorkspace(): Promise<ResumeWorkspace> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    const stored = readStoredWorkspace();
    if (stored && stored.userId === null && stored.analysis && (stored.analysis.matchScore > 0 || (stored.analysis.extractedSkills && stored.analysis.extractedSkills.length > 0))) {
      return stored;
    }

    const realResume = getStoredRealResume();
    if (realResume) {
      return {
        analysis: {
          matchScore: realResume.atsScore,
          atsScore: realResume.atsScore,
          jobTitle: realResume.inferredTargetRoles[0] || "Software Engineer",
          company: "Target Roles",
          strengths: realResume.skills.filter((s) => s.strength === "Verified Strong").map((s) => `${s.name}: ${s.reason}`),
          gaps: realResume.missingRecommendedSkills.map((m) => `${m.skill}: ${m.whyNeeded}`),
          suggestions: realResume.bulletImprovements.map((b, idx) => ({
            id: `sug-${idx + 1}`,
            section: "experience" as const,
            original: b.originalBullet,
            suggested: b.improvedBullet,
            improved: b.improvedBullet,
            impact: "high" as const,
            reason: `Grounded in ${b.projectName}`,
            impactLevel: "high" as const,
          })),
          keywords: realResume.skills.map((s) => ({ word: s.name, present: true, importance: "high" as const })),
          extractedSkills: realResume.skills.map((s) => s.name),
        },
        editableResume: null,
        appliedSuggestionIds: [],
        userId: null,
      };
    }

    return { analysis: emptyAnalysis(), editableResume: null, appliedSuggestionIds: [], userId: null };
  }

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) return { analysis: emptyAnalysis(), editableResume: null, appliedSuggestionIds: [], userId: null };

  const stored = readStoredWorkspace();
  if (stored && stored.userId === user.id) return stored;

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
    return { analysis: emptyAnalysis(), editableResume: null, appliedSuggestionIds: [], userId: user.id };
  }

  const payload = typeof data.analysis_payload === "object" && data.analysis_payload !== null
    ? data.analysis_payload as ResumeAnalysis
    : null;
  const analysis: ResumeAnalysis = payload || {
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
  const parsed = typeof data.parsed_resume === "object" && data.parsed_resume !== null
    ? data.parsed_resume as ParsedResumeDocument
    : analysis.parsedResume || null;
  return { analysis: { ...analysis, parsedResume: parsed || undefined }, editableResume: parsed, appliedSuggestionIds: [], userId: user.id };
}

export async function saveResumeWorkspace(
  analysis: ResumeAnalysis,
  editableResume: ParsedResumeDocument | null,
  appliedSuggestionIds: string[]
): Promise<void> {
  const mode = getEffectiveDataMode();
  let userId: string | null = null;
  if (mode === "live") {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error(error?.message || "Sign in to save this resume workspace.");
    userId = user.id;
  }

  const savedAnalysis = { ...analysis, parsedResume: editableResume || undefined };
  const workspace: ResumeWorkspace = { analysis: savedAnalysis, editableResume, appliedSuggestionIds, userId };
  const storedLocally = writeStoredWorkspace(workspace);
  if (mode === "demo") {
    demoAnalysis = savedAnalysis;
    if (!storedLocally) throw new Error("Browser storage is full; this resume could not be saved for reloads.");
    logActivity({
      type: "resume",
      message: `Analyzed resume${savedAnalysis.jobTitle ? ` for ${savedAnalysis.jobTitle}` : ""} — ${savedAnalysis.matchScore}% Match (${savedAnalysis.atsScore}% ATS)`,
    });
    dispatchCopilotUpdate("resume");
    return;
  }

  const supabase = createClient();
  const { data: existing, error: fetchError } = await supabase.from("resume_analyses")
    .select("id").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (fetchError) throw new Error(`Failed to locate resume analysis: ${fetchError.message}`);
  const payload = {
    target_role: savedAnalysis.jobTitle || "Software Engineer",
    target_company: savedAnalysis.company || null,
    match_score: savedAnalysis.matchScore,
    ats_score: savedAnalysis.atsScore,
    strengths: savedAnalysis.strengths,
    gaps: savedAnalysis.gaps,
    suggestions: savedAnalysis.suggestions,
    keywords: savedAnalysis.keywords,
    parsed_resume: editableResume,
    analysis_payload: savedAnalysis,
  };
  const result = existing
    ? await supabase.from("resume_analyses").update(payload).eq("id", existing.id).eq("user_id", userId)
    : await supabase.from("resume_analyses").insert({ ...payload, user_id: userId });
  if (result.error) throw new Error(`Failed to save resume workspace: ${result.error.message}`);
  dispatchCopilotUpdate("resume");
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
  await saveResumeWorkspace(result.analysis, result.analysis.parsedResume || null, []);
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
  await saveResumeWorkspace(result.analysis, result.analysis.parsedResume || null, []);
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
    const base = demoAnalysis || emptyAnalysis();
    demoAnalysis = {
      ...base,
      suggestions: base.suggestions.map((s) =>
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
