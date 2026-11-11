import { NextRequest, NextResponse } from "next/server";
import type { GitHubGrillAnalysis, GitHubGrillQuestion } from "@/types";
import {
  getOptionalSupabaseClient,
  readLocalInterviewStore,
  resolveUserId,
  extractJsonObject,
  callInterviewLLM,
} from "@/lib/interview/server-helpers";
import type { RoleInterviewQuestion } from "@/lib/interview/role-baseline-questions";
import {
  inspectGitHubRepoTool,
  type GitHubRepoToolResult,
} from "@/lib/interview-graph/langgraph-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SkillMatrixRow {
  skill_name: string;
  claimed_level?: string;
  verified_confidence?: string;
  bluff_risk?: boolean;
}

interface GeneratedGrillQuestion {
  id?: string;
  level?: number;
  targetFile?: string;
  projectReferenced?: string;
  category?: "GitHub Deep-Grill" | "Architecture Defense" | "System Trade-offs" | "Failure Recovery";
  difficulty?: "Easy" | "Medium" | "Hard";
  question: string;
  bluffTrap?: string;
  expectedDeepSignals?: string[];
  followUpEscalation?: string;
  hint?: string;
  answerImprovementGuide?: string;
  whyAskThis?: string;
  sampleAnswer?: string;
  sampleStarAnswer?: string;
}

interface GrillPlan {
  projectAudited?: string;
  architectureSummary?: string;
  architectureStrengths?: string[];
  detectedArchitectureRisks?: string[];
  openingInterviewerStatement?: string;
  questions?: GeneratedGrillQuestion[];
}

function extractDetectedStack(primaryLanguage: string, manifest: string, role: string): string[] {
  const stack: string[] = [];
  if (primaryLanguage && primaryLanguage !== "Unknown") stack.push(primaryLanguage);
  if (manifest.trim().startsWith("{")) {
    try {
      const pkg = JSON.parse(manifest) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
      for (const d of deps.slice(0, 6)) {
        if (!stack.includes(d)) stack.push(d);
      }
    } catch {
      // ignore truncated JSON manifest
    }
  }
  if (stack.length === 0) stack.push(role);
  return stack.slice(0, 7);
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

    const toolsExecuted: string[] = [];
    const langGraphTrace: string[] = ["context_loader"];

    if (!repoUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "GITHUB_REPO_REQUIRED: Enter a valid public GitHub repository URL (e.g. https://github.com/MananHindocha/placement-copliot) first so the AI interviewer can inspect your real source code.",
          questions: [],
        },
        { status: 400 }
      );
    }

    let githubContext: GitHubRepoToolResult;
    try {
      const rawRepoJson = await inspectGitHubRepoTool.invoke({
        repoInput: repoUrl,
        focusNotes,
      });
      githubContext = JSON.parse(rawRepoJson) as GitHubRepoToolResult;
      toolsExecuted.push(inspectGitHubRepoTool.name);
      langGraphTrace.push(`tool:${inspectGitHubRepoTool.name}`);
    } catch (ghErr) {
      const msg = ghErr instanceof Error ? ghErr.message : "Failed to inspect GitHub repository";
      return NextResponse.json({ success: false, error: msg, questions: [] }, { status: 400 });
    }

    // Deep Repo / Codebase LLM Synthesis (no generic role baseline fallback)
    const effectiveFocus = focusNotes ? `${focusMode} (${focusNotes})` : focusMode;
    const grillPrompt = `You are a Principal Bar-Raiser Engineer conducting an in-depth "${effectiveFocus}" Codebase Defense Grill on the candidate's actual GitHub repository "${githubContext.fullName}" for the target role "${targetRole}" starting around Level ${currentLevel}/3.

CANDIDATE FOCUS NOTES: ${focusNotes || "Grill core architecture, API design, state management, concurrency, and failure recovery."}
CANDIDATE'S RESUME PROJECTS (Optional Context):
${resumeProjects.length > 0 ? JSON.stringify(resumeProjects, null, 2) : "None passed."}
CANDIDATE'S SKILL EVIDENCE MATRIX:
${trackedSkills.map((s) => `${s.skill_name} [Claimed:${s.claimed_level}, Verified:${s.verified_confidence}, BluffRisk:${s.bluff_risk}]`).join(", ") || "None"}

LIVE INSPECTED GITHUB REPOSITORY DATA:
- Repository: ${githubContext.fullName} (${githubContext.htmlUrl})
- Primary Language: ${githubContext.primaryLanguage}
- Description: ${githubContext.description || "N/A"}
- Recent Commits: ${JSON.stringify(githubContext.recentCommits)}
- File Tree (${githubContext.totalFilesScanned} total files, sample): ${JSON.stringify(githubContext.filePaths.slice(0, 75))}
- Dependencies Manifest (package.json / requirements.txt):
${githubContext.dependenciesManifest || "N/A"}
- README Excerpt:
${githubContext.readmeExcerpt || "N/A"}
- ACTUAL SOURCE CODE EXCERPTS FROM REPOSITORY FILES:
${JSON.stringify(githubContext.inspectedSourceFiles, null, 2)}

STRICT INSTRUCTIONS:
1. CRITICAL: Your "questions" array MUST contain AT LEAST 6 and ideally 8 distinct items ("q1" through "q8"), ordered from:
   - Level 1 (Architecture & Code Implementation, 2-3 questions)
   - Level 2 (Production State, API Boundaries & Trade-offs, 3 questions)
   - Level 3 (Concurrency, Failure Recovery & Staff Scaling, 2-3 questions)
   Do NOT stop at 3, 4, or 5 questions — spread questions across all ${Math.max(1, githubContext.inspectedSourceFiles.length)} inspected source files and other key paths in the tree!
2. EVERY SINGLE QUESTION MUST cite an exact file path, dependency, function, or route that actually exists in "${githubContext.fullName}"! Never output generic textbook questions.
3. Keep each field punchy and high-signal (1-2 crisp sentences for hint/answerImprovementGuide, 2-3 sentences for sampleAnswer, 3 expectedDeepSignals) so all 8 items fit cleanly.

Return ONLY valid JSON matching this exact schema:
{
  "projectAudited": "${githubContext.fullName}",
  "architectureSummary": "string (2 concise sentences summarizing this repository's stack and architecture)",
  "architectureStrengths": ["string", "string"],
  "detectedArchitectureRisks": ["string", "string"],
  "openingInterviewerStatement": "string",
  "questions": [
    {
      "id": "q1..q8 (generate all 8)",
      "level": 1 | 2 | 3,
      "targetFile": "string (Exact file path from repo, e.g. src/lib/agent/orchestrator.ts)",
      "category": "GitHub Deep-Grill" | "Architecture Defense" | "System Trade-offs" | "Failure Recovery",
      "difficulty": "Easy" | "Medium" | "Hard",
      "question": "string (In-depth question explicitly naming the file/module and asking WHY and HOW it behaves under edge cases)",
      "bluffTrap": "string",
      "expectedDeepSignals": ["string", "string", "string"],
      "followUpEscalation": "string",
      "hint": "string",
      "answerImprovementGuide": "string (Specific points the candidate should structure cleanly to score 90+)",
      "sampleAnswer": "string"
    }
  ]
}`;

    const llmResult = await callInterviewLLM({
      userPrompt: grillPrompt,
      temperature: 0.25,
      timeoutMs: 20000,
    });

    const parsedPlan = JSON.parse(extractJsonObject(llmResult.text)) as GrillPlan;
    const rawQuestions = Array.isArray(parsedPlan.questions)
      ? parsedPlan.questions.filter((q) => q && typeof q.question === "string" && q.question.trim())
      : [];

    if (rawQuestions.length > 0 && rawQuestions.length < 6) {
      const needed = 8 - rawQuestions.length;
      try {
        const topUpPrompt = `You already generated ${rawQuestions.length} questions for GitHub repository "${githubContext.fullName}" (role: ${targetRole}).
Generate ${needed} MORE unique Level 2 & Level 3 codebase-defense questions covering OTHER files/modules from this repository.
Do NOT repeat these questions:
${rawQuestions.map((q, idx) => `${idx + 1}. [${q.targetFile || "repo"}] ${q.question}`).join("\n")}

Inspected Source Files:
${JSON.stringify(githubContext.inspectedSourceFiles.map((f) => ({ path: f.path, excerpt: f.codeExcerpt.slice(0, 900) })))}
Other Repo Paths: ${JSON.stringify(githubContext.filePaths.slice(0, 50))}

Return ONLY valid JSON: { "questions": [ { "id": "string", "level": 2 | 3, "targetFile": "exact repo path", "category": "System Trade-offs" | "Failure Recovery", "difficulty": "Medium" | "Hard", "question": "string", "bluffTrap": "string", "expectedDeepSignals": ["string","string","string"], "followUpEscalation": "string", "hint": "string", "answerImprovementGuide": "string", "sampleAnswer": "string" } ] }`;

        const topUpRes = await callInterviewLLM({
          userPrompt: topUpPrompt,
          temperature: 0.3,
          timeoutMs: 14000,
        });
        const topUpParsed = JSON.parse(extractJsonObject(topUpRes.text)) as {
          questions?: GeneratedGrillQuestion[];
        };
        if (Array.isArray(topUpParsed.questions)) {
          const seen = new Set(rawQuestions.map((q) => q.question?.trim().toLowerCase()));
          for (const extra of topUpParsed.questions) {
            if (extra?.question && !seen.has(extra.question.trim().toLowerCase())) {
              seen.add(extra.question.trim().toLowerCase());
              rawQuestions.push(extra);
            }
          }
        }
      } catch (topUpErr) {
        console.warn("[github-grill] Top-up question call skipped:", topUpErr);
      }
    }

    if (rawQuestions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "GITHUB_GRILL_EMPTY_RESPONSE: AI model returned zero questions for this repository. Please try again.",
          questions: [],
        },
        { status: 502 }
      );
    }

    const mappedQuestions: RoleInterviewQuestion[] = rawQuestions.slice(0, 10).map((q, idx) => {
      const level = normalizeLevel(q.level, idx);
      const concepts =
        Array.isArray(q.expectedDeepSignals) && q.expectedDeepSignals.length > 0
          ? q.expectedDeepSignals
          : ["Codebase Ownership", "Trade-off Rationale", "Failure Handling"];

      const candidateTarget = (q.targetFile || q.projectReferenced || "").trim();
      const matchedSource =
        githubContext.inspectedSourceFiles.find(
          (f) =>
            f.path === candidateTarget ||
            (candidateTarget && f.path.toLowerCase().includes(candidateTarget.toLowerCase()))
        ) ||
        githubContext.inspectedSourceFiles[idx % Math.max(1, githubContext.inspectedSourceFiles.length)];

      const verifiedFilePath =
        (candidateTarget &&
          githubContext.filePaths.find(
            (p) => p === candidateTarget || p.toLowerCase().endsWith(candidateTarget.toLowerCase())
          )) ||
        matchedSource?.path ||
        githubContext.filePaths[idx % Math.max(1, githubContext.filePaths.length)] ||
        githubContext.fullName;

      const combinedHint = [q.hint, q.answerImprovementGuide ? `How to elevate your answer: ${q.answerImprovementGuide}` : ""]
        .filter(Boolean)
        .join(" • ");

      return {
        id: q.id || `grill-${Date.now()}-${idx + 1}`,
        role: targetRole,
        category: "resume-grill",
        difficulty: normalizeDifficulty(level),
        level,
        isAiEscalated: false,
        question: q.question,
        hint:
          combinedHint ||
          `${q.bluffTrap ? `Watch out for: ${q.bluffTrap} · ` : ""}${q.followUpEscalation || ""}`.trim(),
        whyAskThis:
          q.answerImprovementGuide ||
          q.whyAskThis ||
          q.bluffTrap ||
          `Cross-examining ${mapGrillCategory(q.category)} in ${verifiedFilePath}`,
        sampleAnswer:
          q.sampleAnswer ||
          q.sampleStarAnswer ||
          `Strong defense citing concrete design trade-offs, invariants, and failure recovery inside ${verifiedFilePath}.`,
        keyConceptsToCover: concepts,
        referencedFiles: verifiedFilePath ? [verifiedFilePath] : undefined,
        codeExcerpt: matchedSource ? matchedSource.codeExcerpt.slice(0, 480) : undefined,
        followUps: q.followUpEscalation ? [q.followUpEscalation] : [],
      };
    });

    const projectAudited = githubContext.repo || parsedPlan.projectAudited || selectedProjectName || targetRole;
    const detectedRisks =
      Array.isArray(parsedPlan.detectedArchitectureRisks) && parsedPlan.detectedArchitectureRisks.length > 0
        ? parsedPlan.detectedArchitectureRisks
        : ["State consistency and failure recovery under concurrent load"];
    const openingStatement =
      parsedPlan.architectureSummary ||
      parsedPlan.openingInterviewerStatement ||
      githubContext.description ||
      `Cross-examining ${githubContext.fullName} source implementation for ${targetRole}.`;
    const inspectedFilePaths = githubContext.inspectedSourceFiles.map((f) => f.path);
    const detectedStack = extractDetectedStack(
      githubContext.primaryLanguage,
      githubContext.dependenciesManifest,
      targetRole
    );

    const analysis = buildCompatibilityAnalysis({
      targetRole,
      projectAudited,
      owner: githubContext.owner,
      summary: openingStatement,
      detectedStack,
      keyFilesAnalyzed: inspectedFilePaths.length > 0 ? inspectedFilePaths : githubContext.filePaths.slice(0, 8),
      potentialWeaknessesOrRisks: detectedRisks,
      questions: mappedQuestions,
    });
    if (Array.isArray(parsedPlan.architectureStrengths)) {
      analysis.architectureStrengths = parsedPlan.architectureStrengths;
    }

    return NextResponse.json({
      success: true,
      isGuest,
      userId,
      engine: "LangChain.js DynamicStructuredTool + Deep Codebase Inspector",
      toolsExecuted,
      langGraphTrace: [...langGraphTrace, "deep_codebase_grill_synthesizer"],
      storageMode,
      llmProvider: llmResult.provider,
      targetRole,
      githubInspected: true,
      githubRepoSummary: {
        fullName: githubContext.fullName,
        htmlUrl: githubContext.htmlUrl,
        primaryLanguage: githubContext.primaryLanguage,
        filesCount: githubContext.totalFilesScanned,
        inspectedFiles: inspectedFilePaths,
        recentCommits: githubContext.recentCommits,
        architectureSummary: parsedPlan.architectureSummary || openingStatement,
      },
      resumeProjectsLoadedCount: resumeProjects.length,
      projectAudited,
      detectedArchitectureRisks: detectedRisks,
      openingInterviewerStatement: openingStatement,
      questions: mappedQuestions,
      analysis,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json(
      {
        success: false,
        error: `GITHUB_GRILL_EXCEPTION: ${message}`,
        questions: [],
      },
      { status: 500 }
    );
  }
}
