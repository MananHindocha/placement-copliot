import { NextRequest, NextResponse } from "next/server";
import type { GitHubGrillAnalysis, GitHubGrillQuestion } from "@/types";
import {
  getOptionalSupabaseClient,
  readLocalInterviewStore,
  writeLocalInterviewStore,
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
  exactFunctionOrStruct?: string;
  codeSnippetFromRepo?: string;
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

function normalizeGrillScore(raw: unknown, fallback = 65): number {
  const n = Number(raw);
  if (Number.isNaN(n) || n < 0) return fallback;
  if (n > 0 && n <= 1) return Math.round(n * 100);
  return Math.min(100, Math.round(n));
}

function resolveVerifiedCodeExcerpt(
  candidateSnippet: string | undefined,
  exactSymbol: string | undefined,
  fullSource: string
): string {
  const source = fullSource || "";
  if (!source) return "";

  const cleanSnippet = (candidateSnippet || "").trim();
  if (cleanSnippet.length >= 16) {
    const firstMeaningfulLine = cleanSnippet
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length >= 8);
    if (firstMeaningfulLine && source.includes(firstMeaningfulLine)) {
      return cleanSnippet.slice(0, 650);
    }
  }

  const lines = source.split(/\r?\n/);
  if (exactSymbol && exactSymbol.trim().length >= 3) {
    const needle = exactSymbol.replace(/\(.*$/, "").trim();
    const matchLineIdx = lines.findIndex((l) => l.includes(needle));
    if (matchLineIdx !== -1) {
      const start = Math.max(0, matchLineIdx - 1);
      const end = Math.min(lines.length, start + 14);
      return lines.slice(start, end).join("\n").slice(0, 650);
    }
  }

  return lines.slice(0, 14).join("\n").slice(0, 650);
}

function verifySymbolInSource(rawSymbol: string | undefined, fullSource: string): string | undefined {
  const trimmed = (rawSymbol || "").trim();
  if (!trimmed) return undefined;
  const identifier = trimmed.replace(/[();{}*&\s].*$/, "").trim();
  if (identifier.length >= 2 && fullSource.includes(identifier)) {
    return trimmed;
  }
  return undefined;
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
      exactFunctionOrStruct: q.exactFunctionOrStruct,
      codeExcerpt: q.codeExcerpt,
      keyConcepts: q.keyConceptsToCover || [],
      whatInterviewerLooksFor: q.whyAskThis || `Deep ${params.targetRole} architectural ownership`,
      hint: q.hint,
    })),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      mode?: "ANALYZE_REPO" | "EVALUATE_AND_PROBE_TURN" | "REQUEST_PROJECT_HINT";
      userId?: string;
      repoUrl?: string;
      selectedProjectName?: string;
      targetRole?: string;
      role?: string;
      focusMode?: string;
      focusNotes?: string;
      currentLevel?: number;
      candidateLevel?: number;
      candidateAnswer?: string;
      conversationHistory?: Array<{ role: string; content: string }>;
      currentQuestion?: {
        id?: string;
        question?: string;
        targetFile?: string;
        referencedFiles?: string[];
        exactFunctionOrStruct?: string;
        codeExcerpt?: string;
        codeSnippetFromRepo?: string;
        hint?: string;
        interviewerHint?: string;
        keyConceptsToCover?: string[];
        keyExpectedConcepts?: string[];
      };
      resumeContext?: { projects?: unknown[]; skills?: string[] };
      useAiBaseline?: boolean;
    };

    const requestMode = body.mode || "ANALYZE_REPO";
    const targetRole = (body.targetRole || body.role || "Full-Stack SDE").trim();
    const repoUrl = (body.repoUrl || "").trim();
    const selectedProjectName = (body.selectedProjectName || "").trim();
    const focusMode = (body.focusMode || "Architecture Defense").trim();
    const focusNotes = (body.focusNotes || "").trim();
    const effectiveLevelRaw = body.candidateLevel ?? body.currentLevel;
    const currentLevel: 1 | 2 | 3 =
      effectiveLevelRaw === 1 || effectiveLevelRaw === 2 || effectiveLevelRaw === 3
        ? effectiveLevelRaw
        : 1;

    const { userId, isGuest } = resolveUserId(body.userId);
    const supabase = getOptionalSupabaseClient();
    const storageMode: "supabase" | "local_file" = supabase ? "supabase" : "local_file";

    // MODE A: 30s Idle / On-Demand Directional Hint for Active Repo File Question
    if (requestMode === "REQUEST_PROJECT_HINT") {
      const cq = body.currentQuestion || {};
      const targetFile = cq.targetFile || cq.referencedFiles?.[0] || "repository module";
      const snippet = cq.codeExcerpt || cq.codeSnippetFromRepo || "";
      const fallbackClues =
        cq.keyConceptsToCover || cq.keyExpectedConcepts || ["Error handling", "State ownership", "Edge cases"];

      const hintPrompt = `You are a supportive Principal Engineer grilling a candidate for ${targetRole} on their real repository.
Active Question: "${cq.question || ""}"
Target File: "${targetFile}"
Symbol: "${cq.exactFunctionOrStruct || ""}"
Verbatim Code Excerpt:
\`\`\`
${snippet || "N/A"}
\`\`\`

Provide a concise, helpful 1-2 sentence directional hint pointing the candidate toward the key invariant, data flow, or failure condition inside ${targetFile} WITHOUT giving away the full answer.
Return ONLY valid JSON:
{
  "spokenHint": "string",
  "clueKeywords": ["string", "string", "string"]
}`;

      const hintRes = await callInterviewLLM({
        userPrompt: hintPrompt,
        temperature: 0.2,
        timeoutMs: 12000,
      });
      const parsedHint = JSON.parse(extractJsonObject(hintRes.text)) as {
        spokenHint?: string;
        clueKeywords?: string[];
      };

      return NextResponse.json({
        success: true,
        llmProvider: hintRes.provider,
        storageMode,
        spokenHint:
          parsedHint.spokenHint ||
          cq.hint ||
          cq.interviewerHint ||
          `Look closely at ${cq.exactFunctionOrStruct || targetFile} and trace error paths, concurrency, and resource ownership.`,
        clueKeywords:
          Array.isArray(parsedHint.clueKeywords) && parsedHint.clueKeywords.length > 0
            ? parsedHint.clueKeywords
            : fallbackClues.slice(0, 3),
      });
    }

    // MODE B: Multi-Turn Agentic Evaluation, Improvement Coaching & Dynamic Follow-Up Probe
    if (requestMode === "EVALUATE_AND_PROBE_TURN") {
      const candidateAnswer = (body.candidateAnswer || "").trim();
      if (!candidateAnswer) {
        return NextResponse.json(
          { success: false, error: "EMPTY_ANSWER: Please speak or type your answer before submitting." },
          { status: 400 }
        );
      }

      const cq = body.currentQuestion || {};
      const targetFile = cq.targetFile || cq.referencedFiles?.[0] || "Repository File";
      const snippet = cq.codeExcerpt || cq.codeSnippetFromRepo || "";
      const expectedConcepts = cq.keyConceptsToCover || cq.keyExpectedConcepts || [];
      const recentHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory.slice(-4) : [];

      const evalPrompt = `You are an Autonomous Bar-Raiser Project Grill Agent evaluating a candidate's defense of their real GitHub repository for ${targetRole}.

QUESTION ASKED (File: ${targetFile}${cq.exactFunctionOrStruct ? ` | Symbol: ${cq.exactFunctionOrStruct}` : ""}):
"${cq.question || ""}"

ACTUAL SOURCE CODE FROM CANDIDATE'S REPOSITORY FILE:
\`\`\`
${snippet || "N/A"}
\`\`\`

EXPECTED TECHNICAL CONCEPTS:
${JSON.stringify(expectedConcepts)}

RECENT CONVERSATION HISTORY ON THIS FILE:
${JSON.stringify(recentHistory)}

CANDIDATE'S LATEST ANSWER:
"${candidateAnswer}"

YOUR TASK:
1. Grade accuracy strictly against the actual source code printed above as an INTEGER 0 to 100 (never decimal). If they claim nonexistent functions or wrong behavior contradicted by the code above, catch it cleanly and score below 55.
2. Provide 2-3 strengths AND exactly 3 concrete, actionable improvement bullets in "howToImproveYourAnswer" explaining what code mechanics, failure modes, or architectural trade-offs to add.
3. Write a 95/100 "idealRewrittenAnswer" showing how a Staff Engineer defends "${targetFile}".
4. Choose your next autonomous action:
   - Score >= 75: "LEVEL_UP_NEXT_FILE" (nextLevel = ${Math.min(3, currentLevel + 1)})
   - Score 50-74: "PROBE_CODE_EDGE_CASE" (nextLevel = ${currentLevel})
   - Score < 50: "CLARIFY_IMPLEMENTATION" (nextLevel = 1)
5. Write a sharp, direct "followUpProbeQuestion" grounded strictly in "${targetFile}"'s real code above.
6. Whenever score < 75, set "studyPlanTask.shouldAdd" to true with a crisp, actionable study task referencing "${targetFile}" or its gap.

Return ONLY valid JSON:
{
  "overallScore": number,
  "agentAction": "LEVEL_UP_NEXT_FILE" | "PROBE_CODE_EDGE_CASE" | "CLARIFY_IMPLEMENTATION",
  "nextLevel": 1 | 2 | 3,
  "spokenInterviewerReaction": "string (2 concise spoken sentences reacting to their defense)",
  "followUpProbeQuestion": "string (Direct follow-up question probing edge cases or trade-offs in ${targetFile})",
  "followUpIntent": "string (Short phrase describing why you are asking this probe)",
  "strengths": ["string", "string"],
  "howToImproveYourAnswer": ["string", "string", "string"],
  "idealRewrittenAnswer": "string",
  "addressedConcepts": ["string"],
  "missedConcepts": ["string"],
  "studyPlanTask": {
    "shouldAdd": boolean,
    "title": "string",
    "category": "PROJECT_DEEP_DIVE" | "SYSTEM_DESIGN" | "CORE_CS",
    "priority": "HIGH" | "MEDIUM",
    "description": "string"
  }
}`;

      const evalLlm = await callInterviewLLM({
        userPrompt: evalPrompt,
        temperature: 0.2,
        timeoutMs: 18000,
      });

      const parsedEval = JSON.parse(extractJsonObject(evalLlm.text)) as {
        overallScore?: number;
        agentAction?: "LEVEL_UP_NEXT_FILE" | "PROBE_CODE_EDGE_CASE" | "CLARIFY_IMPLEMENTATION";
        nextLevel?: number;
        spokenInterviewerReaction?: string;
        followUpProbeQuestion?: string;
        followUpIntent?: string;
        strengths?: string[];
        howToImproveYourAnswer?: string[];
        idealRewrittenAnswer?: string;
        addressedConcepts?: string[];
        missedConcepts?: string[];
        studyPlanTask?: {
          shouldAdd?: boolean;
          title?: string;
          category?: string;
          priority?: string;
          description?: string;
        };
      };

      const score = normalizeGrillScore(parsedEval.overallScore, 62);
      const nextLevel: 1 | 2 | 3 =
        parsedEval.nextLevel === 3 || parsedEval.nextLevel === 2 || parsedEval.nextLevel === 1
          ? parsedEval.nextLevel
          : score >= 75
          ? (Math.min(3, currentLevel + 1) as 1 | 2 | 3)
          : score >= 50
          ? currentLevel
          : 1;

      const agentAction =
        parsedEval.agentAction ||
        (score >= 75
          ? "LEVEL_UP_NEXT_FILE"
          : score >= 50
          ? "PROBE_CODE_EDGE_CASE"
          : "CLARIFY_IMPLEMENTATION");

      const strengths =
        Array.isArray(parsedEval.strengths) && parsedEval.strengths.length > 0
          ? parsedEval.strengths
          : [`Engaged with core responsibilities inside ${targetFile}.`];

      const howToImproveYourAnswer =
        Array.isArray(parsedEval.howToImproveYourAnswer) && parsedEval.howToImproveYourAnswer.length > 0
          ? parsedEval.howToImproveYourAnswer
          : [
              `Trace concrete data structures and edge-case failure paths in ${targetFile}.`,
              "Quantify concurrency limits, memory/latency trade-offs, and recovery guarantees.",
            ];

      const addressedConcepts = Array.isArray(parsedEval.addressedConcepts)
        ? parsedEval.addressedConcepts
        : [];
      const missedConcepts = Array.isArray(parsedEval.missedConcepts) ? parsedEval.missedConcepts : [];

      // Persist study plan task in local store when unconfigured or guest mode
      const shouldAddTask = Boolean(parsedEval.studyPlanTask?.shouldAdd || score < 75);
      const studyPlanTask = shouldAddTask
        ? {
            shouldAdd: true,
            title:
              parsedEval.studyPlanTask?.title?.trim() ||
              `Master ${cq.exactFunctionOrStruct || targetFile} Architecture & Edge Cases`,
            category: parsedEval.studyPlanTask?.category || "PROJECT_DEEP_DIVE",
            priority: parsedEval.studyPlanTask?.priority || (score < 55 ? "HIGH" : "MEDIUM"),
            description:
              parsedEval.studyPlanTask?.description?.trim() ||
              `Review ${targetFile} failure recovery, concurrency safety, and code-level trade-offs identified during Project Deep-Grill.`,
          }
        : {
            shouldAdd: false,
            title: "",
            category: "PROJECT_DEEP_DIVE",
            priority: "MEDIUM",
            description: "",
          };

      if (studyPlanTask.shouldAdd && !supabase) {
        const localStore = readLocalInterviewStore();
        const existingTasks = localStore.tasksByUser[userId] || [];
        const dup = existingTasks.some(
          (t) => t.title.toLowerCase() === studyPlanTask.title.toLowerCase()
        );
        if (!dup) {
          localStore.tasksByUser[userId] = [
            {
              id: `grill-gap-${Date.now()}`,
              user_id: userId,
              title: studyPlanTask.title,
              category: studyPlanTask.category,
              priority: studyPlanTask.priority,
              estimated_hours: 2,
              description: studyPlanTask.description,
              completed: false,
              created_at: new Date().toISOString(),
            },
            ...existingTasks,
          ].slice(0, 30);
          writeLocalInterviewStore(localStore);
        }
      }

      const idealAnswer =
        parsedEval.idealRewrittenAnswer ||
        `In ${targetFile}, I structured ${cq.exactFunctionOrStruct || "the core module"} around explicit ownership boundaries, defensive error propagation, and predictable latency under load.`;
      const followUpPrompt =
        parsedEval.followUpProbeQuestion ||
        `Walk me through what happens in ${targetFile} if an unexpected failure or spike occurs mid-execution.`;

      return NextResponse.json({
        success: true,
        engine: "LangChain.js + Code-Grounded Project Grill Agent",
        llmProvider: evalLlm.provider,
        storageMode,
        langGraphTrace: ["repo_code_grounder", "answer_defense_grader", "probe_decision_node"],
        overallScore: score,
        agentAction,
        nextLevel,
        adaptiveDecision:
          score >= 75
            ? "LEVEL_UP_HARDER_QUESTION"
            : score >= 50
            ? "PROBE_CURRENT_LEVEL"
            : "CALIBRATE_FOUNDATION",
        spokenInterviewerReaction:
          parsedEval.spokenInterviewerReaction ||
          `You touched on key points in ${targetFile}; let's dig deeper into edge-case behavior.`,
        interviewerReaction:
          parsedEval.spokenInterviewerReaction ||
          `You touched on key points in ${targetFile}; let's dig deeper into edge-case behavior.`,
        followUpProbeQuestion: followUpPrompt,
        followUpQuestion: {
          prompt: followUpPrompt,
          intent: parsedEval.followUpIntent || `Verifying implementation depth in ${targetFile}`,
          keyConcepts: expectedConcepts.slice(0, 3),
        },
        strengths,
        howToImproveYourAnswer,
        improvements: howToImproveYourAnswer,
        idealRewrittenAnswer: idealAnswer,
        rewrittenIdealAnswer: idealAnswer,
        addressedConcepts,
        coveredConcepts: addressedConcepts,
        missedConcepts,
        studyPlanTask,
      });
    }

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

    if (!githubContext.inspectedSourceFiles || githubContext.inspectedSourceFiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not find readable source code files in ${githubContext.fullName}. Verify the repository is public and contains source code.`,
          questions: [],
        },
        { status: 400 }
      );
    }

    const formattedSourceBlocks = githubContext.inspectedSourceFiles
      .map((f) => `=== FILE: ${f.path} ===\n${f.codeExcerpt}\n`)
      .join("\n");

    // Deep Repo / Codebase LLM Synthesis (100% grounded in downloaded files)
    const effectiveFocus = focusNotes ? `${focusMode} (${focusNotes})` : focusMode;
    const grillPrompt = `You are a Principal Bar-Raiser Engineer conducting an in-depth "${effectiveFocus}" Codebase Defense Grill on the candidate's actual GitHub repository "${githubContext.fullName}" for the target role "${targetRole}" starting around Level ${currentLevel}/3.

CANDIDATE FOCUS NOTES: ${focusNotes || "Grill core architecture, implementation files, state management, concurrency, and failure recovery."}
CANDIDATE'S RESUME PROJECTS (Optional Context):
${resumeProjects.length > 0 ? JSON.stringify(resumeProjects, null, 2) : "None passed."}
CANDIDATE'S SKILL EVIDENCE MATRIX:
${trackedSkills.map((s) => `${s.skill_name} [Claimed:${s.claimed_level}, Verified:${s.verified_confidence}, BluffRisk:${s.bluff_risk}]`).join(", ") || "None"}

LIVE INSPECTED GITHUB REPOSITORY DATA:
- Repository: ${githubContext.fullName} (${githubContext.htmlUrl})
- Primary Language: ${githubContext.primaryLanguage}
- Description: ${githubContext.description || "N/A"}
- Recent Commits: ${JSON.stringify(githubContext.recentCommits)}
- Dependencies Manifest:
${githubContext.dependenciesManifest || "N/A"}
- README Excerpt:
${githubContext.readmeExcerpt || "N/A"}

ACTUAL DOWNLOADED SOURCE CODE OF FILES IN "${githubContext.fullName}":
${formattedSourceBlocks}

CRITICAL ANTI-HALLUCINATION & QUESTION RULES:
1. STRICT GROUNDING: You may ONLY ask questions about the exact files printed above under "ACTUAL DOWNLOADED SOURCE CODE OF FILES"! NEVER invent or guess threads, functions, structs, queues, or behaviors that do not appear in the downloaded code or README above.
2. CRITICAL COUNT & 1-TO-1 COVERAGE: Generate at least 6 distinct questions covering EVERY inspected file above (${githubContext.inspectedSourceFiles.map((f, i) => `q${i + 1}: ${f.path}`).join(", ")}), progressing across Level 1, Level 2, and Level 3! Do NOT stop after 3 or 4 items.
3. Every single question MUST provide:
   - "targetFile": Exact file path from ACTUAL DOWNLOADED SOURCE CODE above.
   - "exactFunctionOrStruct": Exact function, struct, class, route, or symbol copied from that file's excerpt.
   - "codeSnippetFromRepo": Verbatim 2-4 line code excerpt copied directly from that file's excerpt above.
4. Keep each explanation concise (1-2 sentences for hint/answerImprovementGuide/sampleAnswer, 3 short strings for expectedDeepSignals) so all 6-8 questions fit comfortably.

Return ONLY valid JSON matching this exact schema:
{
  "projectAudited": "${githubContext.fullName}",
  "architectureSummary": "string (2 concise sentences grounded strictly in the README and source code above)",
  "architectureStrengths": ["string", "string"],
  "detectedArchitectureRisks": ["string", "string"],
  "openingInterviewerStatement": "string",
  "questions": [
    {
      "id": "q1..q6+",
      "level": 1 | 2 | 3,
      "targetFile": "string (Exact inspected file path from above)",
      "exactFunctionOrStruct": "string (Exact function/struct/symbol visible in that file)",
      "codeSnippetFromRepo": "string (Verbatim 2-4 line code excerpt from that file)",
      "category": "GitHub Deep-Grill" | "Architecture Defense" | "System Trade-offs" | "Failure Recovery",
      "difficulty": "Easy" | "Medium" | "Hard",
      "question": "string (In-depth question explicitly asking about exactFunctionOrStruct/logic in targetFile)",
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
      temperature: 0.15,
      timeoutMs: 22000,
    });

    const parsedPlan = JSON.parse(extractJsonObject(llmResult.text)) as GrillPlan;
    const rawQuestions = Array.isArray(parsedPlan.questions)
      ? parsedPlan.questions.filter((q) => q && typeof q.question === "string" && q.question.trim())
      : [];

    if (rawQuestions.length > 0 && rawQuestions.length < 6) {
      const needed = 6 - rawQuestions.length;
      const usedFiles = new Set(
        rawQuestions.map((q) => (q.targetFile || "").trim().toLowerCase())
      );
      const uncoveredFiles = githubContext.inspectedSourceFiles.filter(
        (f) => !usedFiles.has(f.path.toLowerCase())
      );
      const sourcePool =
        uncoveredFiles.length >= needed ? uncoveredFiles : githubContext.inspectedSourceFiles;
      try {
        const topUpPrompt = `You generated ${rawQuestions.length} questions for "${githubContext.fullName}" (role: ${targetRole}).
You MUST return EXACTLY ${needed} MORE unique questions strictly grounded in these ACTUAL DOWNLOADED SOURCE FILES (never guess unseen files or functions!):
${sourcePool.map((f) => `=== FILE: ${f.path} ===\n${f.codeExcerpt.slice(0, 1600)}\n`).join("\n")}

Do NOT repeat these questions:
${rawQuestions.map((q, idx) => `${idx + 1}. [${q.targetFile || "repo"}] ${q.question}`).join("\n")}

Return ONLY valid JSON with ${needed} items in "questions": { "questions": [ { "id": "string", "level": 2 | 3, "targetFile": "exact inspected path above", "exactFunctionOrStruct": "exact symbol in code above", "codeSnippetFromRepo": "verbatim 2-4 lines from code above", "category": "System Trade-offs" | "Failure Recovery", "difficulty": "Medium" | "Hard", "question": "string", "bluffTrap": "string", "expectedDeepSignals": ["string","string","string"], "followUpEscalation": "string", "hint": "string", "answerImprovementGuide": "string", "sampleAnswer": "string" } ] }`;

        const topUpRes = await callInterviewLLM({
          userPrompt: topUpPrompt,
          temperature: 0.2,
          timeoutMs: 20000,
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
            (candidateTarget && f.path.toLowerCase().includes(candidateTarget.toLowerCase())) ||
            (candidateTarget && candidateTarget.toLowerCase().includes(f.path.toLowerCase()))
        ) ||
        githubContext.inspectedSourceFiles[idx % githubContext.inspectedSourceFiles.length];

      // Strictly lock referencedFiles to files whose real source was downloaded
      const verifiedFilePath = matchedSource.path;
      const verifiedSymbol = verifySymbolInSource(q.exactFunctionOrStruct, matchedSource.codeExcerpt);
      const verifiedSnippet = resolveVerifiedCodeExcerpt(
        q.codeSnippetFromRepo,
        verifiedSymbol || q.exactFunctionOrStruct,
        matchedSource.codeExcerpt
      );

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
        referencedFiles: [verifiedFilePath],
        exactFunctionOrStruct: verifiedSymbol || q.exactFunctionOrStruct?.trim() || undefined,
        codeExcerpt: verifiedSnippet || undefined,
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
