import { NextRequest, NextResponse } from "next/server";
import type { GitHubGrillAnalysis, GitHubGrillQuestion } from "@/types";
import {
  getOptionalSupabaseClient,
  readLocalInterviewStore,
  resolveUserId,
  extractJsonObject,
  callInterviewLLM,
} from "@/lib/interview/server-helpers";
import {
  getRoleBaselineQuestions,
  type RoleInterviewQuestion,
} from "@/lib/interview/role-baseline-questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SkillMatrixRow {
  skill_name: string;
  claimed_level?: string;
  verified_confidence?: string;
  bluff_risk?: boolean;
}

interface GitTreeItem {
  type?: string;
  path?: string;
}

interface GeneratedGrillQuestion {
  id?: string;
  level?: number;
  projectReferenced?: string;
  category?: "GitHub Deep-Grill" | "Architecture Defense" | "System Trade-offs" | "Failure Recovery";
  difficulty?: "Easy" | "Medium" | "Hard";
  question: string;
  bluffTrap?: string;
  expectedDeepSignals?: string[];
  followUpEscalation?: string;
  hint?: string;
  whyAskThis?: string;
  sampleAnswer?: string;
}

interface GrillPlan {
  projectAudited?: string;
  detectedArchitectureRisks?: string[];
  openingInterviewerStatement?: string;
  questions?: GeneratedGrillQuestion[];
}

function parseGitHubRepo(input?: string): { owner: string; repo: string } | null {
  if (!input || typeof input !== "string") return null;
  const cleaned = input.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const matchUrl = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (matchUrl) return { owner: matchUrl[1], repo: matchUrl[2] };
  const parts = cleaned.split("/");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { owner: parts[0], repo: parts[1] };
  }
  return null;
}

async function fetchLiveGitHubRepoContext(repoInput?: string) {
  const parsed = parseGitHubRepo(repoInput);
  if (!parsed) return null;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Placement-Copilot-Agent",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const repoRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
    headers,
    signal: AbortSignal.timeout(10000),
  });
  if (!repoRes.ok) {
    throw new Error(
      `GITHUB_API_ERROR: Could not fetch repo ${parsed.owner}/${parsed.repo} (HTTP ${repoRes.status}). Make sure the repository is public.`
    );
  }
  const repoMeta = (await repoRes.json()) as {
    default_branch?: string;
    description?: string;
    language?: string;
    stargazers_count?: number;
  };
  const defaultBranch = repoMeta.default_branch || "main";

  const [treeRes, readmeRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${defaultBranch}?recursive=1`, {
      headers,
      signal: AbortSignal.timeout(10000),
    }),
    fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/readme`, {
      headers,
      signal: AbortSignal.timeout(10000),
    }),
  ]);

  let filePaths: string[] = [];
  if (treeRes.ok) {
    const treeJson = (await treeRes.json()) as { tree?: GitTreeItem[] };
    filePaths = (treeJson.tree || [])
      .filter((item) => item.type === "blob" && typeof item.path === "string")
      .map((item) => item.path!)
      .slice(0, 80);
  }

  let readmeExcerpt = "";
  if (readmeRes.ok) {
    const readmeJson = (await readmeRes.json()) as { content?: string };
    if (readmeJson.content) {
      readmeExcerpt = Buffer.from(readmeJson.content, "base64").toString("utf-8").slice(0, 2500);
    }
  }

  return {
    owner: parsed.owner,
    repo: parsed.repo,
    fullName: `${parsed.owner}/${parsed.repo}`,
    description: repoMeta.description || "",
    primaryLanguage: repoMeta.language || "Unknown",
    stars: repoMeta.stargazers_count || 0,
    filePaths,
    readmeExcerpt,
  };
}

function mapGrillCategory(category?: string): GitHubGrillQuestion["category"] {
  switch (category) {
    case "GitHub Deep-Grill":
      return "Code Implementation";
    case "System Trade-offs":
      return "Trade-offs & Debugging";
    case "Failure Recovery":
      return "Scalability & Edge Cases";
    case "Architecture Defense":
    default:
      return "Architecture";
  }
}

function normalizeLevel(rawLevel: unknown, idx: number): 1 | 2 | 3 {
  if (rawLevel === 1 || rawLevel === 2 || rawLevel === 3) return rawLevel;
  if (idx < 3) return 1;
  if (idx < 7) return 2;
  return 3;
}

function normalizeDifficulty(level: 1 | 2 | 3): "easy" | "medium" | "hard" {
  return level === 1 ? "easy" : level === 2 ? "medium" : "hard";
}

function buildCompatibilityAnalysis(params: {
  targetRole: string;
  projectAudited: string;
  owner: string;
  summary: string;
  detectedStack: string[];
  keyFilesAnalyzed: string[];
  potentialWeaknessesOrRisks: string[];
  questions: RoleInterviewQuestion[];
}): GitHubGrillAnalysis {
  return {
    repoName: params.projectAudited,
    owner: params.owner,
    summary: params.summary,
    detectedStack: params.detectedStack,
    keyFilesAnalyzed: params.keyFilesAnalyzed,
    architectureStrengths: [],
    potentialWeaknessesOrRisks: params.potentialWeaknessesOrRisks,
    grillQuestions: params.questions.map((q) => ({
      id: q.id,
      category:
        q.level === 3
          ? "Scalability & Edge Cases"
          : q.level === 2
          ? "Trade-offs & Debugging"
          : "Architecture",
      difficulty: q.difficulty === "hard" ? "Hard" : "Medium",
      question: q.question,
      referencedFiles: q.referencedFiles || [params.projectAudited],
      keyConcepts: q.keyConceptsToCover || [],
      whatInterviewerLooksFor: q.whyAskThis || `Deep ${params.targetRole} architectural ownership`,
      hint: q.hint,
    })),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      repoUrl?: string;
      selectedProjectName?: string;
      targetRole?: string;
      role?: string;
      focusMode?: string;
      focusNotes?: string;
      currentLevel?: number;
      resumeContext?: { projects?: unknown[]; skills?: string[] };
      useAiBaseline?: boolean;
    };

    const targetRole = (body.targetRole || body.role || "Full-Stack SDE").trim();
    const repoUrl = (body.repoUrl || "").trim();
    const selectedProjectName = (body.selectedProjectName || "").trim();
    const focusMode = (body.focusMode || "Architecture Defense").trim();
    const focusNotes = (body.focusNotes || "").trim();
    const currentLevel: 1 | 2 | 3 =
      body.currentLevel === 1 || body.currentLevel === 2 || body.currentLevel === 3
        ? body.currentLevel
        : 1;

    const { userId, isGuest } = resolveUserId(body.userId);
    const supabase = getOptionalSupabaseClient();
    const storageMode: "supabase" | "local_file" = supabase ? "supabase" : "local_file";

    let resumeProjects: unknown[] = Array.isArray(body.resumeContext?.projects)
      ? body.resumeContext.projects
      : [];
    let trackedSkills: SkillMatrixRow[] = [];

    if (supabase) {
      try {
        const [{ data: resumeRow }, { data: matrixRows }] = await Promise.all([
          supabase
            .from("resumes")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("skill_evidence_matrix").select("*").eq("user_id", userId),
        ]);

        const dbProjects = (resumeRow as { parsed_data?: { projects?: unknown[] } } | null)?.parsed_data?.projects;
        if (Array.isArray(dbProjects) && dbProjects.length > 0) {
          resumeProjects = dbProjects;
        }
        if (Array.isArray(matrixRows)) {
          trackedSkills = matrixRows as SkillMatrixRow[];
        }
      } catch (dbErr) {
        console.warn("[github-grill] Supabase query failed cleanly, falling back:", dbErr);
      }
    } else {
      const store = readLocalInterviewStore();
      trackedSkills = (store.skillsByUser[userId] || []) as SkillMatrixRow[];
    }

    let githubContext: Awaited<ReturnType<typeof fetchLiveGitHubRepoContext>> = null;
    if (repoUrl) {
      try {
        githubContext = await fetchLiveGitHubRepoContext(repoUrl);
      } catch (ghErr) {
        const msg = ghErr instanceof Error ? ghErr.message : "Failed to inspect GitHub repository";
        return NextResponse.json({ success: false, error: msg }, { status: 400 });
      }
    }

    const baselineQuestions = getRoleBaselineQuestions(targetRole, { mode: "grill" });
    const hasCustomContext =
      Boolean(githubContext) || resumeProjects.length > 0 || Boolean(body.useAiBaseline);

    // Zero-crash baseline path when running Demo Mode without GitHub repo or Supabase resume
    if (!hasCustomContext) {
      const projectAudited = selectedProjectName || `${targetRole} Baseline Defense`;
      const detectedRisks = [
        `Calibrating ${targetRole} architecture fundamentals before live repository cross-examination`,
        "Validating production trade-offs, state boundaries, and failure recovery under load",
      ];
      const openingStatement = `Starting Level ${currentLevel} Deep-Grill calibration for ${targetRole}. Defend your architectural choices concisely with concrete failure modes and complexity bounds.`;

      const analysis = buildCompatibilityAnalysis({
        targetRole,
        projectAudited,
        owner: "candidate",
        summary: openingStatement,
        detectedStack: [targetRole],
        keyFilesAnalyzed: [],
        potentialWeaknessesOrRisks: detectedRisks,
        questions: baselineQuestions,
      });

      return NextResponse.json({
        success: true,
        isGuest,
        userId,
        storageMode,
        llmProvider: "baseline",
        targetRole,
        githubInspected: false,
        githubRepoSummary: null,
        resumeProjectsLoadedCount: 0,
        projectAudited,
        detectedArchitectureRisks: detectedRisks,
        openingInterviewerStatement: openingStatement,
        questions: baselineQuestions,
        analysis,
      });
    }

    // Custom Repo / Resume Deep-Grill LLM Synthesis (with active Gemini + Groq fallback + baseline padding)
    const effectiveFocus = focusNotes ? `${focusMode} (${focusNotes})` : focusMode;
    const grillPrompt = `You are a Principal Staff Engineer conducting a "${effectiveFocus}" Resume & Codebase Deep-Grill for a candidate targeting "${targetRole}" starting around Level ${currentLevel}/3.

CANDIDATE'S RESUME PROJECTS:
${resumeProjects.length > 0 ? JSON.stringify(resumeProjects, null, 2) : "No explicit resume JSON passed; use the live GitHub repository and role context."}

CANDIDATE'S SKILL EVIDENCE MATRIX:
${trackedSkills.map((s) => `${s.skill_name} [Claimed:${s.claimed_level}, Verified:${s.verified_confidence}, BluffRisk:${s.bluff_risk}]`).join(", ") || "None"}

LIVE GITHUB REPOSITORY INSPECTION:
${githubContext ? JSON.stringify(githubContext, null, 2) : "No GitHub repository attached."}

SELECTED PROJECT FOCUS: ${selectedProjectName || githubContext?.fullName || `${targetRole} Architecture`}

Generate a progressive 10-question Deep-Grill Interview Plan ordered from:
- Level 1 (Foundational / Code Implementation, 3 questions)
- Level 2 (Production Systems & Trade-offs, 4 questions)
- Level 3 (Staff Bar-Raiser Failure Recovery & Scaling, 3 questions)

Cite exact repository file paths or resume project bullets wherever available. Return ONLY valid JSON matching:
{
  "projectAudited": "string",
  "detectedArchitectureRisks": ["string", "string"],
  "openingInterviewerStatement": "string",
  "questions": [
    {
      "id": "string",
      "level": 1 | 2 | 3,
      "projectReferenced": "string",
      "category": "GitHub Deep-Grill" | "Architecture Defense" | "System Trade-offs" | "Failure Recovery",
      "difficulty": "Easy" | "Medium" | "Hard",
      "question": "string",
      "bluffTrap": "string",
      "expectedDeepSignals": ["string", "string", "string"],
      "followUpEscalation": "string",
      "hint": "string",
      "sampleAnswer": "string"
    }
  ]
}`;

    try {
      const llmResult = await callInterviewLLM({
        userPrompt: grillPrompt,
        temperature: 0.25,
        timeoutMs: 14000,
      });

      const parsed = JSON.parse(extractJsonObject(llmResult.text)) as GrillPlan;
      const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions.filter((q) => q && q.question) : [];

      const mappedQuestions: RoleInterviewQuestion[] = rawQuestions.slice(0, 10).map((q, idx) => {
        const level = normalizeLevel(q.level, idx);
        const concepts = Array.isArray(q.expectedDeepSignals) && q.expectedDeepSignals.length > 0
          ? q.expectedDeepSignals
          : ["Architecture Ownership", "Trade-off Rationale", "Failure Handling"];

        return {
          id: q.id || `grill-${Date.now()}-${idx + 1}`,
          role: targetRole,
          category: "resume-grill",
          difficulty: normalizeDifficulty(level),
          level,
          isAiEscalated: false,
          question: q.question,
          hint: q.hint || `${q.bluffTrap ? `Watch out for: ${q.bluffTrap} · ` : ""}${q.followUpEscalation || ""}`.trim(),
          whyAskThis: q.whyAskThis || q.bluffTrap || `Cross-examining ${mapGrillCategory(q.category)}`,
          sampleAnswer:
            q.sampleAnswer ||
            `Strong defense citing concrete architecture trade-offs, observability, and scaling limits for ${parsed.projectAudited || targetRole}.`,
          keyConceptsToCover: concepts,
          referencedFiles:
            githubContext?.filePaths.slice(0, 3) || (q.projectReferenced ? [q.projectReferenced] : undefined),
          followUps: q.followUpEscalation ? [q.followUpEscalation] : [],
        };
      });

      // Guarantee at least 10 progressive questions by filling remaining slots from baseline if needed
      const finalQuestions: RoleInterviewQuestion[] = [...mappedQuestions];
      if (finalQuestions.length < 10) {
        const needed = 10 - finalQuestions.length;
        const tailPad = baselineQuestions.slice(baselineQuestions.length - needed);
        finalQuestions.push(...tailPad);
      }

      const projectAudited =
        githubContext?.repo || parsed.projectAudited || selectedProjectName || `${targetRole} Project`;
      const detectedRisks = parsed.detectedArchitectureRisks || [
        "Distributed state consistency and concurrency bottlenecks under 10x traffic",
      ];
      const openingStatement =
        parsed.openingInterviewerStatement ||
        githubContext?.description ||
        `Cross-examining your ${projectAudited} implementation for ${targetRole}.`;

      const analysis = buildCompatibilityAnalysis({
        targetRole,
        projectAudited,
        owner: githubContext?.owner || "candidate",
        summary: openingStatement,
        detectedStack: githubContext?.primaryLanguage ? [githubContext.primaryLanguage] : [targetRole],
        keyFilesAnalyzed: githubContext?.filePaths.slice(0, 10) || [],
        potentialWeaknessesOrRisks: detectedRisks,
        questions: finalQuestions,
      });

      return NextResponse.json({
        success: true,
        isGuest,
        userId,
        storageMode,
        llmProvider: llmResult.provider,
        targetRole,
        githubInspected: Boolean(githubContext),
        githubRepoSummary: githubContext
          ? {
              fullName: githubContext.fullName,
              primaryLanguage: githubContext.primaryLanguage,
              filesCount: githubContext.filePaths.length,
            }
          : null,
        resumeProjectsLoadedCount: resumeProjects.length,
        projectAudited,
        detectedArchitectureRisks: detectedRisks,
        openingInterviewerStatement: openingStatement,
        questions: finalQuestions,
        analysis,
      });
    } catch (llmErr) {
      console.warn("[github-grill] LLM call failed, falling back to role baseline:", llmErr);

      const projectAudited =
        githubContext?.repo || selectedProjectName || `${targetRole} Baseline Defense`;
      const detectedRisks = [
        "AI deep-grill generator was rate-limited; loaded verified progressive role calibration pack.",
        githubContext
          ? `Inspecting repository ${githubContext.fullName} (${githubContext.primaryLanguage})`
          : `Calibrating ${targetRole} architecture & scaling readiness`,
      ];
      const openingStatement = `Loaded 10 progressive ${targetRole} Deep-Grill questions while fallback calibration is active.`;

      const analysis = buildCompatibilityAnalysis({
        targetRole,
        projectAudited,
        owner: githubContext?.owner || "candidate",
        summary: openingStatement,
        detectedStack: githubContext?.primaryLanguage ? [githubContext.primaryLanguage] : [targetRole],
        keyFilesAnalyzed: githubContext?.filePaths.slice(0, 10) || [],
        potentialWeaknessesOrRisks: detectedRisks,
        questions: baselineQuestions,
      });

      return NextResponse.json({
        success: true,
        isGuest,
        userId,
        storageMode,
        llmProvider: "baseline_fallback",
        targetRole,
        githubInspected: Boolean(githubContext),
        githubRepoSummary: githubContext
          ? {
              fullName: githubContext.fullName,
              primaryLanguage: githubContext.primaryLanguage,
              filesCount: githubContext.filePaths.length,
            }
          : null,
        resumeProjectsLoadedCount: resumeProjects.length,
        projectAudited,
        detectedArchitectureRisks: detectedRisks,
        openingInterviewerStatement: openingStatement,
        questions: baselineQuestions,
        analysis,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json(
      {
        success: false,
        error: `GITHUB_GRILL_EXCEPTION: ${message}`,
      },
      { status: 500 }
    );
  }
}
