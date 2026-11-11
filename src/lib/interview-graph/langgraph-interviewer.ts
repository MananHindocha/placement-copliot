import { Annotation, MemorySaver, StateGraph, START, END } from "@langchain/langgraph";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  getOptionalSupabaseClient,
  readLocalInterviewStore,
  writeLocalInterviewStore,
  extractJsonObject,
  callInterviewLLM,
} from "@/lib/interview/server-helpers";
import type {
  DeliveryCritique,
  InterviewCategory,
  InterviewTelemetry,
  StarBreakdown,
} from "@/types";

export interface AdaptiveQuestionItem {
  id: string;
  role: string;
  category: InterviewCategory;
  difficulty: "easy" | "medium" | "hard";
  level: 1 | 2 | 3;
  question: string;
  hint: string;
  interviewerHint: string;
  sampleStarAnswer: string;
  keyConceptsToCover: string[];
  keyExpectedConcepts: string[];
  isAiEscalated: boolean;
}

export interface EvaluatedGraphPayload {
  userId: string;
  sessionId?: string;
  questionId: string;
  targetRole: string;
  category: InterviewCategory;
  topic?: string;
  question: string;
  candidateAnswer: string;
  codeSnippet?: string;
  currentDifficulty: string;
  currentLevel: 1 | 2 | 3;
  expectedConcepts: string[];
  durationSeconds: number;
  telemetry: InterviewTelemetry;
  resumeContext?: string;
  githubRepoContext?: string;
  customJdContext?: string;
}

const sharedCheckpointer = new MemorySaver();

function clampScore(val: unknown, min = 0, max = 100): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeLevel(raw: unknown): 1 | 2 | 3 {
  return raw === 2 || raw === 3 ? raw : 1;
}

function computeStarHeuristic(
  transcript: string,
  expectedConcepts: string[],
  codeSnippet: string | undefined,
  telemetry: InterviewTelemetry
) {
  const lower = transcript.toLowerCase();
  const words = transcript.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const situationHits = [
    /\b(when i was|during my|at my|working on|in a project|in my previous|at the time|while building)\b/i,
    /\b(semester|internship|hackathon|freelance|client|team|company|production|app router)\b/i,
  ].filter((re) => re.test(lower)).length;

  const taskHits = [
    /\b(the challenge|goal|needed to|had to|responsible|bottleneck|problem|prevent|optimize|scale)\b/i,
    /\b(deadline|objective|target|latency|waterfall|overhead|bundle)\b/i,
  ].filter((re) => re.test(lower)).length;

  const actionHits = [
    /\b(implemented|architected|built|developed|optimized|refactored|designed|created|engineered|co-locate|stream|wrap)\b/i,
    /\b(using|utilizing|configured|analyzed|benchmarked|automated|tested|profiled|promise\.all)\b/i,
    /\b(react|node|typescript|python|docker|redis|sql|postgres|aws|api|cache|query|suspense|rsc|index|b-tree)\b/i,
  ].filter((re) => re.test(lower)).length;

  const resultHits = [
    /\b\d+(\.\d+)?(%|x|ms|s|users|queries|lpa|k|m)\b/i,
    /\b(reduced|improved|increased|accelerated|decreased|saved|boosted|achieved|zero|immediately|incrementally)\b/i,
    /\b(production|latency|throughput|performance|scalability|shell)\b/i,
  ].filter((re) => re.test(lower)).length;

  const situationScore =
    situationHits >= 2 ? 88 : situationHits === 1 ? 76 : wordCount > 30 ? 64 : 46;
  const taskScore =
    taskHits >= 2 ? 90 : taskHits === 1 ? 78 : wordCount > 40 ? 66 : 44;
  const actionScore =
    actionHits >= 3 ? 92 : actionHits === 2 ? 82 : actionHits === 1 ? 72 : 48;
  const resultScore =
    resultHits >= 2 ? 92 : resultHits === 1 ? 80 : 54;

  const contentScore = clampScore(
    situationScore * 0.15 + taskScore * 0.2 + actionScore * 0.4 + resultScore * 0.25
  );

  const avgWpm = telemetry.avgWpm ?? 130;
  const fillers = telemetry.totalFillerCount ?? 0;
  const gaps = telemetry.hesitationGapsCount ?? 0;
  const eye = telemetry.eyeContactPct ?? -1;

  const pacingVerdict: DeliveryCritique["pacingVerdict"] =
    avgWpm > 0 && avgWpm < 100
      ? "Too Slow (<100 WPM)"
      : avgWpm > 160
      ? "Rushed (>160 WPM)"
      : "Optimal (115-155 WPM)";

  const deliveryScore = clampScore(
    90 -
      Math.min(18, fillers * 3) -
      Math.min(15, gaps * 4) -
      (pacingVerdict === "Optimal (115-155 WPM)" ? 0 : 10)
  );
  const overallScore = clampScore(contentScore * 0.72 + deliveryScore * 0.28);

  const combinedText = `${transcript} ${codeSnippet || ""}`.toLowerCase();
  const coveredConcepts: string[] = [];
  const missedConcepts: string[] = [];

  if (expectedConcepts.length > 0) {
    for (const c of expectedConcepts) {
      const tokens = c
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2);
      if (tokens.some((t) => combinedText.includes(t))) {
        coveredConcepts.push(c);
      } else {
        missedConcepts.push(c);
      }
    }
  } else {
    const defaults = ["Core Mechanics", "Production Trade-offs", "Edge Cases", "Scaling Limits"];
    for (const d of defaults) {
      if (combinedText.length > 70) coveredConcepts.push(d);
      else missedConcepts.push(d);
    }
  }

  const starBreakdown: StarBreakdown = {
    situation: {
      score: situationScore,
      feedback: situationHits > 0 ? "Clear architectural context framed." : "Open by specifying the system context.",
      present: situationHits > 0 || wordCount > 35,
    },
    task: {
      score: taskScore,
      feedback: taskHits > 0 ? "Target constraint or bottleneck identified cleanly." : "Clarify the core constraint or SLA target.",
      present: taskHits > 0,
    },
    action: {
      score: actionScore,
      feedback: actionHits >= 2 ? "Concrete engineering mechanisms and trade-offs articulated." : "Detail exact mechanisms rather than high-level claims.",
      present: actionHits > 0,
    },
    result: {
      score: resultScore,
      feedback: resultHits > 0 ? "Measurable outcome or system behavior impact explained." : "Quantify impact (ms, % throughput, or bundle bytes).",
      present: resultHits > 0,
    },
  };

  const deliveryCritique: DeliveryCritique = {
    pacingVerdict,
    pacingAdvice:
      pacingVerdict === "Optimal (115-155 WPM)"
        ? `Steady delivery cadence (~${avgWpm} WPM) balanced clarity and technical density.`
        : pacingVerdict === "Too Slow (<100 WPM)"
        ? `Pace hovered around ${avgWpm} WPM; tighten transitions between setup and technical action.`
        : `Delivery peaked above ${avgWpm} WPM; pause briefly between trade-offs.`,
    fillerAdvice:
      fillers === 0
        ? "Clean delivery with minimal verbal fillers."
        : `Detected ${fillers} filler phrases; swap pauses for silence when thinking through edge cases.`,
    bodyLanguageAdvice:
      eye >= 0
        ? `Maintained ~${eye}% camera gaze engagement.`
        : "Audio/written mode active; camera telemetry disabled.",
  };

  return {
    overallScore,
    contentScore,
    deliveryScore,
    starBreakdown,
    deliveryCritique,
    coveredConcepts,
    missedConcepts,
  };
}

/**
 * LangChain.js DynamicStructuredTool 1: Hydrates candidate resume projects and
 * skill evidence matrix from Supabase (when configured) or Local Disk store.
 */
export const retrieveCandidateContextTool = new DynamicStructuredTool({
  name: "retrieve_candidate_context",
  description:
    "Loads the candidate's latest parsed resume projects and verified skill matrix from local store or Supabase cloud.",
  schema: z.object({
    userId: z.string(),
    targetRole: z.string(),
  }),
  func: async ({ userId, targetRole }) => {
    const supabase = getOptionalSupabaseClient();
    const localStore = readLocalInterviewStore();

    let projectSummaries: string[] = [];
    let trackedSkills = (localStore.skillsByUser[userId] || []).map(
      (s) => `${s.skill_name}:${s.verified_confidence || "UNVERIFIED"}${s.bluff_risk ? "(BLUFF_RISK)" : ""}`
    );

    if (supabase) {
      try {
        const [{ data: resumeRow }, { data: skillRows }] = await Promise.all([
          supabase
            .from("resumes")
            .select("parsed_data")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("skill_evidence_matrix").select("*").eq("user_id", userId),
        ]);

        const projects = (resumeRow as { parsed_data?: { projects?: Array<{ title?: string; name?: string }> } } | null)
          ?.parsed_data?.projects;
        if (Array.isArray(projects)) {
          projectSummaries = projects
            .map((p) => p.title || p.name || "")
            .filter(Boolean)
            .slice(0, 5);
        }
        if (Array.isArray(skillRows) && skillRows.length > 0) {
          trackedSkills = skillRows.map((row) => {
            const r = row as { skill_name?: string; verified_confidence?: string; bluff_risk?: boolean };
            return `${r.skill_name || "skill"}:${r.verified_confidence || "UNVERIFIED"}${r.bluff_risk ? "(BLUFF_RISK)" : ""}`;
          });
        }
      } catch {
        // Non-fatal fallback to local disk store
      }
    }

    return JSON.stringify({
      userId,
      targetRole,
      projectSummaries,
      projectsCount: projectSummaries.length,
      trackedSkills: trackedSkills.slice(0, 12),
      bluffRiskDetected: trackedSkills.some((t) => t.includes("BLUFF_RISK")),
      hasCloudSupabase: Boolean(supabase),
    });
  },
});

/**
 * LangChain.js DynamicStructuredTool 2: Persists evaluated interview turns &
 * evidence to `.interview-persistent-store.json` and Supabase cloud when configured.
 */
export const persistSkillEvidenceTool = new DynamicStructuredTool({
  name: "persist_interview_skill_evidence",
  description:
    "Persists candidate interview evaluation score, adaptive level progression, and transcript to local disk store and Supabase cloud if configured.",
  schema: z.object({
    userId: z.string(),
    role: z.string(),
    category: z.string(),
    question: z.string(),
    candidateAnswer: z.string(),
    interviewerReaction: z.string(),
    overallScore: z.number(),
    adaptiveDecision: z.string(),
    nextLevel: z.number(),
  }),
  func: async ({
    userId,
    role,
    category,
    question,
    candidateAnswer,
    interviewerReaction,
    overallScore,
    adaptiveDecision,
    nextLevel,
  }) => {
    const supabase = getOptionalSupabaseClient();
    const store = readLocalInterviewStore();
    const now = new Date().toISOString();
    const sessionId = `langgraph-eval-${Date.now()}`;

    const transcript = [
      { role: "interviewer", content: question },
      { role: "candidate", content: candidateAnswer },
      {
        role: "interviewer",
        content: `[${adaptiveDecision} -> Level ${nextLevel}] ${interviewerReaction}`,
      },
    ];

    let syncedToCloud = false;
    if (supabase) {
      try {
        const { error } = await supabase.from("interview_sessions").insert({
          user_id: userId,
          role,
          topic: category,
          score: overallScore,
          status: "COMPLETED",
          transcript,
          created_at: now,
        });
        if (!error) syncedToCloud = true;
      } catch {
        // Fall back to local disk persistence cleanly
      }
    }

    store.sessions[sessionId] = {
      id: sessionId,
      user_id: userId,
      role,
      company: null,
      topic: category,
      status: "COMPLETED",
      score: overallScore,
      transcript,
      created_at: now,
      updated_at: now,
    };
    writeLocalInterviewStore(store);

    return JSON.stringify({
      persisted: true,
      sessionId,
      storageMode: syncedToCloud ? "SUPABASE_CLOUD_ACTIVE" : "LOCAL_DISK_PERSISTENT",
    });
  },
});

const DEFAULT_TELEMETRY: InterviewTelemetry = {
  avgWpm: 130,
  wpmTimeSeries: [130],
  fillerWords: {},
  totalFillerCount: 0,
  hesitationGapsCount: 0,
  eyeContactPct: -1,
  postureStabilityPct: 85,
};

const DEFAULT_STAR: StarBreakdown = {
  situation: { score: 70, feedback: "", present: true },
  task: { score: 70, feedback: "", present: true },
  action: { score: 70, feedback: "", present: true },
  result: { score: 70, feedback: "", present: true },
};

const DEFAULT_DELIVERY: DeliveryCritique = {
  pacingVerdict: "Optimal (115-155 WPM)",
  pacingAdvice: "",
  fillerAdvice: "",
  bodyLanguageAdvice: "",
};

/**
 * LangGraph.js State Annotation Schema for the Stateful Interview Agent
 */
export const InterviewGraphState = Annotation.Root({
  userId: Annotation<string>({ reducer: (_a, b) => b, default: () => "00000000-0000-0000-0000-000000000001" }),
  sessionId: Annotation<string>({ reducer: (_a, b) => b, default: () => "default-thread" }),
  questionId: Annotation<string>({ reducer: (_a, b) => b, default: () => "q-1" }),
  targetRole: Annotation<string>({ reducer: (_a, b) => b, default: () => "Full-Stack SDE" }),
  category: Annotation<InterviewCategory>({ reducer: (_a, b) => b, default: () => "core-technical" }),
  question: Annotation<string>({ reducer: (_a, b) => b, default: () => "" }),
  candidateAnswer: Annotation<string>({ reducer: (_a, b) => b, default: () => "" }),
  codeSnippet: Annotation<string>({ reducer: (_a, b) => b, default: () => "" }),
  currentDifficulty: Annotation<string>({ reducer: (_a, b) => b, default: () => "Medium" }),
  currentLevel: Annotation<1 | 2 | 3>({ reducer: (_a, b) => b, default: () => 1 }),
  expectedConcepts: Annotation<string[]>({ reducer: (_a, b) => b, default: () => [] }),
  telemetry: Annotation<InterviewTelemetry>({ reducer: (_a, b) => b, default: () => DEFAULT_TELEMETRY }),
  resumeContext: Annotation<string>({ reducer: (_a, b) => b, default: () => "" }),
  githubRepoContext: Annotation<string>({ reducer: (_a, b) => b, default: () => "" }),
  customJdContext: Annotation<string>({ reducer: (_a, b) => b, default: () => "" }),

  // Hydrated context & cross-turn memory
  resumeProjectsCount: Annotation<number>({ reducer: (_a, b) => b, default: () => 0 }),
  hydratedContextSummary: Annotation<string>({ reducer: (_a, b) => b, default: () => "" }),
  bluffRiskDetected: Annotation<boolean>({ reducer: (_a, b) => b, default: () => false }),
  priorTurnCount: Annotation<number>({ reducer: (prev, next) => (next === 0 ? prev : prev + next), default: () => 0 }),

  // Evaluation outputs
  overallScore: Annotation<number>({ reducer: (_a, b) => b, default: () => 0 }),
  contentScore: Annotation<number>({ reducer: (_a, b) => b, default: () => 0 }),
  deliveryScore: Annotation<number>({ reducer: (_a, b) => b, default: () => 0 }),
  technicalDepthScore: Annotation<number>({ reducer: (_a, b) => b, default: () => 0 }),
  clarityAndStructureScore: Annotation<number>({ reducer: (_a, b) => b, default: () => 0 }),
  starBreakdown: Annotation<StarBreakdown>({ reducer: (_a, b) => b, default: () => DEFAULT_STAR }),
  deliveryCritique: Annotation<DeliveryCritique>({ reducer: (_a, b) => b, default: () => DEFAULT_DELIVERY }),
  coveredConcepts: Annotation<string[]>({ reducer: (_a, b) => b, default: () => [] }),
  missedConcepts: Annotation<string[]>({ reducer: (_a, b) => b, default: () => [] }),
  codeReviewCritique: Annotation<string | undefined>({ reducer: (_a, b) => b, default: () => undefined }),
  strengths: Annotation<string[]>({ reducer: (_a, b) => b, default: () => [] }),
  improvements: Annotation<string[]>({ reducer: (_a, b) => b, default: () => [] }),
  rewrittenIdealAnswer: Annotation<string>({ reducer: (_a, b) => b, default: () => "" }),
  interviewerReaction: Annotation<string>({ reducer: (_a, b) => b, default: () => "" }),
  followUpQuestionPrompt: Annotation<string>({ reducer: (_a, b) => b, default: () => "" }),
  followUpQuestionIntent: Annotation<string>({ reducer: (_a, b) => b, default: () => "" }),
  evaluationSource: Annotation<"ai" | "heuristic">({ reducer: (_a, b) => b, default: () => "ai" }),
  llmProvider: Annotation<string>({ reducer: (_a, b) => b, default: () => "none" }),

  // Adaptive routing & escalation outputs
  adaptiveDecision: Annotation<"LEVEL_UP_HARDER_QUESTION" | "PROBE_CURRENT_LEVEL" | "CALIBRATE_FOUNDATION">({
    reducer: (_a, b) => b,
    default: () => "PROBE_CURRENT_LEVEL",
  }),
  nextLevel: Annotation<1 | 2 | 3>({ reducer: (_a, b) => b, default: () => 1 }),
  adaptiveNextQuestion: Annotation<AdaptiveQuestionItem | null>({ reducer: (_a, b) => b, default: () => null }),
  storageMode: Annotation<string>({ reducer: (_a, b) => b, default: () => "LOCAL_DISK_PERSISTENT" }),
  langGraphTrace: Annotation<string[]>({
    reducer: (prev, next) => {
      if (next.includes("__RESET__")) {
        return next.filter((item) => item !== "__RESET__");
      }
      return [...prev, ...next];
    },
    default: () => [],
  }),
});

/**
 * NODE 1: Hydrate Candidate Context via LangChain.js DynamicStructuredTool
 */
async function retrieveContextNode(state: typeof InterviewGraphState.State) {
  const rawToolOut = await retrieveCandidateContextTool.invoke({
    userId: state.userId,
    targetRole: state.targetRole,
  });
  const parsed = JSON.parse(rawToolOut) as {
    projectsCount?: number;
    projectSummaries?: string[];
    trackedSkills?: string[];
    bluffRiskDetected?: boolean;
  };
  const projectsCount = parsed.projectsCount ?? 0;
  const summaryParts = [
    parsed.projectSummaries?.length ? `Projects: ${parsed.projectSummaries.join(", ")}` : "",
    parsed.trackedSkills?.length ? `Skills: ${parsed.trackedSkills.join(", ")}` : "",
  ].filter(Boolean);

  return {
    resumeProjectsCount: projectsCount,
    hydratedContextSummary: summaryParts.join(" | "),
    bluffRiskDetected: Boolean(parsed.bluffRiskDetected),
    priorTurnCount: 1,
    langGraphTrace: [
      `retrieve_context_node (role=${state.targetRole}, level=${state.currentLevel}, projects=${projectsCount}, turn=${state.priorTurnCount + 1})`,
    ],
  };
}

/**
 * NODE 2: Evaluate Answer Depth, STAR Structure & Rubric Concepts
 */
async function evaluateAnswerNode(state: typeof InterviewGraphState.State) {
  const baseline = computeStarHeuristic(
    state.candidateAnswer,
    state.expectedConcepts,
    state.codeSnippet || undefined,
    state.telemetry
  );

  const systemPrompt = `You are the Evaluator Node inside a LangGraph.js Technical Interview State Machine for "${state.targetRole}" (Candidate Level ${state.currentLevel}/3).
Grade the candidate's answer accurately on technical depth, STAR clarity, concept coverage, and spoken telemetry.
PHONETIC RULE: Normalize likely speech-to-text homophones ('post gres' -> PostgreSQL, 'next j s' -> Next.js, 'r s c' -> RSC, 'type script' -> TypeScript) without penalizing transcription casing or punctuation.

Return ONLY a valid JSON object matching this schema:
{
  "overallScore": number (0-100),
  "contentScore": number (0-100),
  "deliveryScore": number (0-100),
  "technicalDepthScore": number (0-100),
  "clarityAndStructureScore": number (0-100),
  "starBreakdown": {
    "situation": { "score": number, "feedback": "string", "present": boolean },
    "task": { "score": number, "feedback": "string", "present": boolean },
    "action": { "score": number, "feedback": "string", "present": boolean },
    "result": { "score": number, "feedback": "string", "present": boolean }
  },
  "coveredConcepts": ["string"],
  "missedConcepts": ["string"],
  "codeReviewCritique": "string (optional)",
  "strengths": ["string", "string"],
  "improvements": ["string", "string"],
  "rewrittenIdealAnswer": "string (concise 95/100 model answer)"
}`;

  const userPrompt = `QUESTION (${state.currentDifficulty}, Level ${state.currentLevel}/3):
"${state.question}"

EXPECTED CONCEPTS:
${state.expectedConcepts.length > 0 ? state.expectedConcepts.join(", ") : "Technical depth, production trade-offs, clarity"}

CANDIDATE ANSWER:
"""
${state.candidateAnswer}
"""
${state.codeSnippet?.trim() ? `\nATTACHED CODE SCRATCHPAD:\n\`\`\`\n${state.codeSnippet.slice(0, 1800)}\n\`\`\`` : ""}
${state.hydratedContextSummary ? `\nHYDRATED MEMORY: ${state.hydratedContextSummary}` : ""}
${state.resumeContext ? `\nRESUME CONTEXT: ${state.resumeContext}` : ""}
${state.githubRepoContext ? `\nGITHUB CONTEXT: ${state.githubRepoContext}` : ""}
${state.customJdContext ? `\nJD CONTEXT: ${state.customJdContext}` : ""}
TELEMETRY: WPM=${state.telemetry.avgWpm}, Fillers=${state.telemetry.totalFillerCount}, Gaps=${state.telemetry.hesitationGapsCount}`;

  try {
    const llmRes = await callInterviewLLM({
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      timeoutMs: 12000,
    });

    const parsed = JSON.parse(extractJsonObject(llmRes.text)) as Record<string, unknown>;
    const overall = typeof parsed.overallScore === "number" ? clampScore(parsed.overallScore) : baseline.overallScore;
    const content = typeof parsed.contentScore === "number" ? clampScore(parsed.contentScore) : overall;
    const delivery = typeof parsed.deliveryScore === "number" ? clampScore(parsed.deliveryScore) : baseline.deliveryScore;
    const techDepth = typeof parsed.technicalDepthScore === "number" ? clampScore(parsed.technicalDepthScore) : content;
    const clarity = typeof parsed.clarityAndStructureScore === "number" ? clampScore(parsed.clarityAndStructureScore) : delivery;

    const starObj = (parsed.starBreakdown as Record<string, Record<string, unknown>>) || {};
    const starBreakdown: StarBreakdown = {
      situation: {
        score: clampScore(starObj.situation?.score ?? baseline.starBreakdown.situation.score),
        feedback: String(starObj.situation?.feedback || baseline.starBreakdown.situation.feedback),
        present: typeof starObj.situation?.present === "boolean" ? starObj.situation.present : baseline.starBreakdown.situation.present,
      },
      task: {
        score: clampScore(starObj.task?.score ?? baseline.starBreakdown.task.score),
        feedback: String(starObj.task?.feedback || baseline.starBreakdown.task.feedback),
        present: typeof starObj.task?.present === "boolean" ? starObj.task.present : baseline.starBreakdown.task.present,
      },
      action: {
        score: clampScore(starObj.action?.score ?? baseline.starBreakdown.action.score),
        feedback: String(starObj.action?.feedback || baseline.starBreakdown.action.feedback),
        present: typeof starObj.action?.present === "boolean" ? starObj.action.present : baseline.starBreakdown.action.present,
      },
      result: {
        score: clampScore(starObj.result?.score ?? baseline.starBreakdown.result.score),
        feedback: String(starObj.result?.feedback || baseline.starBreakdown.result.feedback),
        present: typeof starObj.result?.present === "boolean" ? starObj.result.present : baseline.starBreakdown.result.present,
      },
    };

    const coveredConcepts =
      Array.isArray(parsed.coveredConcepts) && parsed.coveredConcepts.length > 0
        ? parsed.coveredConcepts.map(String)
        : baseline.coveredConcepts;
    const missedConcepts = Array.isArray(parsed.missedConcepts)
      ? parsed.missedConcepts.map(String)
      : baseline.missedConcepts;
    const strengths =
      Array.isArray(parsed.strengths) && parsed.strengths.length > 0
        ? parsed.strengths.slice(0, 4).map(String)
        : ["Addressed core question framing directly."];
    const improvements =
      Array.isArray(parsed.improvements) && parsed.improvements.length > 0
        ? parsed.improvements.slice(0, 4).map(String)
        : ["Cite concrete throughput/latency benchmarks under peak load."];

    return {
      overallScore: overall,
      contentScore: content,
      deliveryScore: delivery,
      technicalDepthScore: techDepth,
      clarityAndStructureScore: clarity,
      starBreakdown,
      deliveryCritique: baseline.deliveryCritique,
      coveredConcepts,
      missedConcepts,
      codeReviewCritique:
        typeof parsed.codeReviewCritique === "string" && parsed.codeReviewCritique.trim()
          ? parsed.codeReviewCritique.trim()
          : undefined,
      strengths,
      improvements,
      rewrittenIdealAnswer:
        String(parsed.rewrittenIdealAnswer || "").trim() ||
        `For ${state.targetRole}, structure your explanation with the system bottleneck first, exact engineering trade-offs applied, and quantified latency or reliability impact.`,
      evaluationSource: "ai" as const,
      llmProvider: llmRes.provider,
      langGraphTrace: [`evaluate_answer_node (score=${overall}/100, provider=${llmRes.provider})`],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.startsWith("AI_KEY_MISSING")) {
      throw err;
    }

    return {
      overallScore: baseline.overallScore,
      contentScore: baseline.contentScore,
      deliveryScore: baseline.deliveryScore,
      technicalDepthScore: baseline.contentScore,
      clarityAndStructureScore: baseline.deliveryScore,
      starBreakdown: baseline.starBreakdown,
      deliveryCritique: baseline.deliveryCritique,
      coveredConcepts: baseline.coveredConcepts,
      missedConcepts: baseline.missedConcepts,
      strengths: ["Provided structured context matching baseline rubric."],
      improvements: ["Add deeper distributed trade-offs and quantified SLA numbers."],
      rewrittenIdealAnswer: `Calibrated ${state.targetRole} STAR answer addressing core architectural bottlenecks, edge-case isolation, and measurable latency gains.`,
      evaluationSource: "heuristic" as const,
      llmProvider: "heuristic",
      langGraphTrace: [`evaluate_answer_node (score=${baseline.overallScore}/100, mode=heuristic)`],
    };
  }
}

/**
 * CONDITIONAL EDGE ROUTER: Decides which graph branch executes from score + bluff risk
 */
function routeByCandidatePerformance(
  state: typeof InterviewGraphState.State
): "level_up_escalator_node" | "probe_deeper_node" | "calibrate_foundation_node" {
  if (state.overallScore >= 75) {
    return "level_up_escalator_node";
  }
  if (state.overallScore >= 50) {
    return "probe_deeper_node";
  }
  return "calibrate_foundation_node";
}

function buildAdaptiveBranchQuestion(params: {
  idPrefix: string;
  role: string;
  category: InterviewCategory;
  difficulty: "easy" | "medium" | "hard";
  level: 1 | 2 | 3;
  question: string;
  hint: string;
  sampleStarAnswer: string;
  concepts: string[];
}): AdaptiveQuestionItem {
  return {
    id: `${params.idPrefix}-${Date.now()}`,
    role: params.role,
    category: params.category,
    difficulty: params.difficulty,
    level: params.level,
    question: params.question,
    hint: params.hint,
    interviewerHint: params.hint,
    sampleStarAnswer: params.sampleStarAnswer,
    keyConceptsToCover: params.concepts,
    keyExpectedConcepts: params.concepts,
    isAiEscalated: true,
  };
}

/**
 * Shared branch synthesizer for 3A / 3B / 3C to avoid duplicating prompt+LLM scaffolding
 */
async function executeAdaptiveBranchNode(params: {
  state: typeof InterviewGraphState.State;
  decision: "LEVEL_UP_HARDER_QUESTION" | "PROBE_CURRENT_LEVEL" | "CALIBRATE_FOUNDATION";
  targetLevel: 1 | 2 | 3;
  difficultyLabel: "easy" | "medium" | "hard";
  nodeName: string;
  directive: string;
  fallbackReaction: string;
  fallbackQuestion: string;
  fallbackHint: string;
  intentLabel: string;
}) {
  const { state, decision, targetLevel, difficultyLabel, nodeName } = params;
  const branchPrompt = `You are the ${nodeName} inside a LangGraph.js Interview Agent for "${state.targetRole}".
Original Question: "${state.question}"
Candidate Scored: ${state.overallScore}/100
Covered Concepts: ${state.coveredConcepts.join(", ") || "None"}
Missed Concepts: ${state.missedConcepts.join(", ") || "None"}
Candidate Answer:
"""
${state.candidateAnswer}
"""

DIRECTIVE: ${params.directive}

Return ONLY valid JSON:
{
  "interviewerReaction": "string (1-2 natural sentences directly reacting to their spoken answer before pivoting)",
  "followUpQuestion": "string (sharp technical follow-on question)",
  "adaptiveNextQuestion": {
    "question": "string (the calibrated next interview question directly building on their answer)",
    "interviewerHint": "string (concise solving hint)",
    "sampleStarAnswer": "string (concise model answer)",
    "keyExpectedConcepts": ["string", "string", "string"]
  }
}`;

  try {
    const llmRes = await callInterviewLLM({
      userPrompt: branchPrompt,
      temperature: 0.25,
      timeoutMs: 12000,
    });
    const parsed = JSON.parse(extractJsonObject(llmRes.text)) as {
      interviewerReaction?: string;
      followUpQuestion?: string;
      adaptiveNextQuestion?: {
        question?: string;
        interviewerHint?: string;
        sampleStarAnswer?: string;
        keyExpectedConcepts?: string[];
      };
    };

    const nextPrompt =
      parsed.adaptiveNextQuestion?.question?.trim() ||
      parsed.followUpQuestion?.trim() ||
      params.fallbackQuestion;
    const hint = parsed.adaptiveNextQuestion?.interviewerHint?.trim() || params.fallbackHint;
    const sample =
      parsed.adaptiveNextQuestion?.sampleStarAnswer?.trim() ||
      "Explain root constraints, exact concurrency/state guarantees, and quantitative impact.";
    const concepts =
      Array.isArray(parsed.adaptiveNextQuestion?.keyExpectedConcepts) &&
      parsed.adaptiveNextQuestion.keyExpectedConcepts.length > 0
        ? parsed.adaptiveNextQuestion.keyExpectedConcepts.slice(0, 4).map(String)
        : state.missedConcepts.length > 0
        ? state.missedConcepts.slice(0, 3)
        : ["Failure Recovery", "Latency Bounds", "Trade-offs"];

    return {
      adaptiveDecision: decision,
      nextLevel: targetLevel,
      interviewerReaction: parsed.interviewerReaction?.trim() || params.fallbackReaction,
      followUpQuestionPrompt: parsed.followUpQuestion?.trim() || nextPrompt,
      followUpQuestionIntent: params.intentLabel,
      adaptiveNextQuestion: buildAdaptiveBranchQuestion({
        idPrefix: `langgraph-lvl${targetLevel}`,
        role: state.targetRole,
        category: state.category,
        difficulty: difficultyLabel,
        level: targetLevel,
        question: nextPrompt,
        hint,
        sampleStarAnswer: sample,
        concepts,
      }),
      langGraphTrace: [`${nodeName} (decision=${decision}, nextLevel=${targetLevel})`],
    };
  } catch {
    return {
      adaptiveDecision: decision,
      nextLevel: targetLevel,
      interviewerReaction: params.fallbackReaction,
      followUpQuestionPrompt: params.fallbackQuestion,
      followUpQuestionIntent: params.intentLabel,
      adaptiveNextQuestion: buildAdaptiveBranchQuestion({
        idPrefix: `langgraph-lvl${targetLevel}`,
        role: state.targetRole,
        category: state.category,
        difficulty: difficultyLabel,
        level: targetLevel,
        question: params.fallbackQuestion,
        hint: params.fallbackHint,
        sampleStarAnswer: "Quantify tail-latency behavior, concurrency hazards, and safe degradation.",
        concepts:
          state.missedConcepts.length > 0
            ? state.missedConcepts.slice(0, 3)
            : ["Failure Modes", "Bounded Latency", "State Safety"],
      }),
      langGraphTrace: [`${nodeName} (decision=${decision}, nextLevel=${targetLevel}, fallback=structured)`],
    };
  }
}

/**
 * NODE 3A: Level-Up Escalator Node (Score >= 75)
 */
async function levelUpEscalatorNode(state: typeof InterviewGraphState.State) {
  const nextLvl = Math.min(3, normalizeLevel(state.currentLevel) + 1) as 1 | 2 | 3;
  return executeAdaptiveBranchNode({
    state,
    decision: "LEVEL_UP_HARDER_QUESTION",
    targetLevel: nextLvl,
    difficultyLabel: "hard",
    nodeName: "level_up_escalator_node",
    directive: `Candidate excelled (>=75). Escalate to Level ${nextLvl}/3 (Hard / Staff Bar-Raiser). Ask a significantly deeper next question testing distributed edge cases, failure recovery, backpressure, or low-level internals directly extending what they just explained.`,
    fallbackReaction: `Strong answer (${state.overallScore}/100). Escalating you to a Level ${nextLvl}/3 Staff Bar-Raiser scenario.`,
    fallbackQuestion: `Building directly on your architecture above: under 10x burst traffic paired with partial dependency timeouts and hot-key contention, where does this fail first and how do you contain blast radius?`,
    fallbackHint: "Discuss circuit breakers, bounded timeouts, backpressure, and state isolation.",
    intentLabel: `Staff Bar-Raiser escalation at Level ${nextLvl}/3`,
  });
}

/**
 * NODE 3B: Probe Deeper Node (50 <= Score < 75)
 */
async function probeDeeperNode(state: typeof InterviewGraphState.State) {
  const currLvl = normalizeLevel(state.currentLevel);
  return executeAdaptiveBranchNode({
    state,
    decision: "PROBE_CURRENT_LEVEL",
    targetLevel: currLvl,
    difficultyLabel: currLvl === 3 ? "hard" : "medium",
    nodeName: "probe_deeper_node",
    directive: `Candidate scored 50-74 at Level ${currLvl}/3. Probe the exact missing concept (${state.missedConcepts.join(", ") || "edge cases"}) without changing tier yet.`,
    fallbackReaction: `Solid foundation (${state.overallScore}/100), though key production edge cases remain underexplored.`,
    fallbackQuestion: `You outlined the baseline path—what concrete failure mode or scaling bottleneck arises in ${state.missedConcepts[0] || "your approach"} under real concurrency?`,
    fallbackHint: `Focus specifically on ${state.missedConcepts[0] || "production edge cases & trade-offs"}.`,
    intentLabel: `Targeted edge-case probing at Level ${currLvl}/3`,
  });
}

/**
 * NODE 3C: Foundational Calibration Node (Score < 50)
 */
async function calibrateFoundationNode(state: typeof InterviewGraphState.State) {
  const prevLvl = Math.max(1, normalizeLevel(state.currentLevel) - 1) as 1 | 2 | 3;
  return executeAdaptiveBranchNode({
    state,
    decision: "CALIBRATE_FOUNDATION",
    targetLevel: prevLvl,
    difficultyLabel: prevLvl === 1 ? "easy" : "medium",
    nodeName: "calibrate_foundation_node",
    directive: `Candidate scored <50. Step cleanly to a Level ${prevLvl}/3 foundational calibration question with an encouraging mental-model nudge.`,
    fallbackReaction: `Let's slow down and anchor the foundational mechanics before scaling up.`,
    fallbackQuestion: `At a fundamental Level ${prevLvl}/3 layer, walk step-by-step through the primary request/data lifecycle here using one concrete example.`,
    fallbackHint: "Trace one input from start to finish before discussing optimizations.",
    intentLabel: `Foundational calibration at Level ${prevLvl}/3`,
  });
}

/**
 * NODE 4: Persist Skill Evidence via LangChain.js DynamicStructuredTool
 */
async function persistEvidenceNode(state: typeof InterviewGraphState.State) {
  const rawOut = await persistSkillEvidenceTool.invoke({
    userId: state.userId,
    role: state.targetRole,
    category: state.category,
    question: state.question,
    candidateAnswer: state.candidateAnswer,
    interviewerReaction: state.interviewerReaction,
    overallScore: state.overallScore,
    adaptiveDecision: state.adaptiveDecision,
    nextLevel: state.nextLevel,
  });

  const parsed = JSON.parse(rawOut) as { storageMode?: string };
  const mode = parsed.storageMode || "LOCAL_DISK_PERSISTENT";

  return {
    storageMode: mode,
    langGraphTrace: [
      `persist_evidence_node (tool=${persistSkillEvidenceTool.name}, mode=${mode})`,
    ],
  };
}

let compiledEvalGraph: ReturnType<typeof createCompiledEvalGraph> | null = null;

function createCompiledEvalGraph() {
  const workflow = new StateGraph(InterviewGraphState)
    .addNode("retrieve_context_node", retrieveContextNode)
    .addNode("evaluate_answer_node", evaluateAnswerNode)
    .addNode("level_up_escalator_node", levelUpEscalatorNode)
    .addNode("probe_deeper_node", probeDeeperNode)
    .addNode("calibrate_foundation_node", calibrateFoundationNode)
    .addNode("persist_evidence_node", persistEvidenceNode)
    .addEdge(START, "retrieve_context_node")
    .addEdge("retrieve_context_node", "evaluate_answer_node")
    .addConditionalEdges("evaluate_answer_node", routeByCandidatePerformance, {
      level_up_escalator_node: "level_up_escalator_node",
      probe_deeper_node: "probe_deeper_node",
      calibrate_foundation_node: "calibrate_foundation_node",
    })
    .addEdge("level_up_escalator_node", "persist_evidence_node")
    .addEdge("probe_deeper_node", "persist_evidence_node")
    .addEdge("calibrate_foundation_node", "persist_evidence_node")
    .addEdge("persist_evidence_node", END);

  return workflow.compile({ checkpointer: sharedCheckpointer });
}

export function buildInterviewLangGraph() {
  if (!compiledEvalGraph) {
    compiledEvalGraph = createCompiledEvalGraph();
  }
  return compiledEvalGraph;
}

export async function runEvaluationLangGraph(payload: EvaluatedGraphPayload) {
  const appGraph = buildInterviewLangGraph();
  const threadId = payload.sessionId || `${payload.userId}:${payload.targetRole}`;

  return appGraph.invoke(
    {
      userId: payload.userId,
      sessionId: threadId,
      questionId: payload.questionId,
      targetRole: payload.targetRole,
      category: payload.category,
      question: payload.question,
      candidateAnswer: payload.candidateAnswer,
      codeSnippet: payload.codeSnippet || "",
      currentDifficulty: payload.currentDifficulty,
      currentLevel: payload.currentLevel,
      expectedConcepts: payload.expectedConcepts,
      telemetry: payload.telemetry,
      resumeContext: payload.resumeContext || "",
      githubRepoContext: payload.githubRepoContext || "",
      customJdContext: payload.customJdContext || "",
      langGraphTrace: ["__RESET__"],
    },
    { configurable: { thread_id: threadId } }
  );
}

/**
 * Live Conversational Turn Graph (used by /api/interview/agent-turn)
 * Records verified execution path across context retrieval, turn routing, and dual-mode persistence.
 */
const LiveTurnTraceState = Annotation.Root({
  hasCandidateMessage: Annotation<boolean>({ reducer: (_a, b) => b, default: () => false }),
  interviewerAction: Annotation<string>({ reducer: (_a, b) => b, default: () => "OPENING_QUESTION" }),
  storageMode: Annotation<string>({ reducer: (_a, b) => b, default: () => "local_file" }),
  nodesExecuted: Annotation<string[]>({
    reducer: (prev, next) => {
      if (next.includes("__RESET__")) return next.filter((n) => n !== "__RESET__");
      return [...prev, ...next];
    },
    default: () => [],
  }),
});

let compiledLiveTurnGraph: ReturnType<typeof createCompiledLiveTurnGraph> | null = null;

function createCompiledLiveTurnGraph() {
  const graph = new StateGraph(LiveTurnTraceState)
    .addNode("retrieve_candidate_state", async () => ({
      nodesExecuted: ["retrieve_candidate_state"],
    }))
    .addNode("evaluate_candidate_turn", async () => ({
      nodesExecuted: ["evaluate_candidate_turn"],
    }))
    .addNode("initialize_opening_turn", async () => ({
      nodesExecuted: ["initialize_opening_turn"],
    }))
    .addNode("route_interviewer_action", async (s) => ({
      nodesExecuted: [`route_action:${s.interviewerAction}`],
    }))
    .addNode("persist_dual_mode_memory", async () => ({
      nodesExecuted: ["persist_dual_mode_memory"],
    }))
    .addEdge(START, "retrieve_candidate_state")
    .addConditionalEdges(
      "retrieve_candidate_state",
      (s) => (s.hasCandidateMessage ? "evaluate_candidate_turn" : "initialize_opening_turn"),
      {
        evaluate_candidate_turn: "evaluate_candidate_turn",
        initialize_opening_turn: "initialize_opening_turn",
      }
    )
    .addEdge("evaluate_candidate_turn", "route_interviewer_action")
    .addEdge("initialize_opening_turn", "route_interviewer_action")
    .addEdge("route_interviewer_action", "persist_dual_mode_memory")
    .addEdge("persist_dual_mode_memory", END);

  return graph.compile({ checkpointer: sharedCheckpointer });
}

export async function executeLiveTurnTraceGraph(params: {
  sessionId: string;
  hasCandidateMessage: boolean;
  interviewerAction: string;
  storageMode: string;
}): Promise<string[]> {
  if (!compiledLiveTurnGraph) {
    compiledLiveTurnGraph = createCompiledLiveTurnGraph();
  }
  const finalState = await compiledLiveTurnGraph.invoke(
    {
      hasCandidateMessage: params.hasCandidateMessage,
      interviewerAction: params.interviewerAction,
      storageMode: params.storageMode,
      nodesExecuted: ["__RESET__"],
    },
    { configurable: { thread_id: `live-turn:${params.sessionId}` } }
  );
  return finalState.nodesExecuted;
}

