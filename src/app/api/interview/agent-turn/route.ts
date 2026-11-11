import fs from "fs";
import os from "os";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { executeLiveTurnTraceGraph } from "@/lib/interview-graph/langgraph-interviewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUEST_PERSISTENT_UUID = "00000000-0000-0000-0000-000000000001";
// Store runtime interview state outside process.cwd() so Next.js dev file watcher never triggers HMR/Compiling reloads
const LOCAL_STORE_PATH = path.join(os.tmpdir(), "placement-copilot-interview-store.json");

type ConfidenceTier = "UNVERIFIED" | "LOW" | "MEDIUM" | "HIGH";
const LADDER: ConfidenceTier[] = ["UNVERIFIED", "LOW", "MEDIUM", "HIGH"];

interface SkillEvidenceLogEntry {
  timestamp: string;
  source: string;
  verdict: "POSITIVE" | "NEGATIVE";
  citation: string;
}

interface SkillEvidenceRow {
  user_id?: string;
  skill_name: string;
  claimed_level?: "LOW" | "MEDIUM" | "HIGH";
  verified_confidence?: ConfidenceTier;
  bluff_risk?: boolean;
  evidence_log?: SkillEvidenceLogEntry[];
  updated_at?: string;
}

interface ResumeProjectContext {
  title?: string;
  name?: string;
  techStack?: string[];
  description?: string;
  highlights?: string[];
}

interface LocalInterviewSession {
  id: string;
  user_id: string;
  role: string;
  company: string | null;
  status: "IN_PROGRESS" | "COMPLETED";
  score: number | null;
  transcript: InterviewMessageTurn[];
  created_at: string;
  updated_at?: string;
}

interface LocalReadinessTask {
  id: string;
  user_id: string;
  title: string;
  category: string;
  priority: string;
  estimated_hours: number;
  description: string;
  completed: boolean;
  created_at: string;
}

interface LocalInterviewStore {
  sessions: Record<string, LocalInterviewSession>;
  skillsByUser: Record<string, SkillEvidenceRow[]>;
  tasksByUser: Record<string, LocalReadinessTask[]>;
}

interface SkillMatrixMutation {
  skillName: string;
  previousTier: ConfidenceTier;
  nextTier: ConfidenceTier;
  bluffRisk: boolean;
  verdict: "POSITIVE" | "NEGATIVE";
  turnScore: number;
  citation: string;
}

interface RemedialTaskInput {
  title: string;
  category?: "CORE_CS" | "SYSTEM_DESIGN" | "DSA" | "PROJECT_DEEP_DIVE";
  priority?: "HIGH" | "MEDIUM";
  evidenceReason: string;
}

interface GapDetectedStudyTask {
  hasGap?: boolean;
  title?: string;
  category?: "CORE_CS" | "SYSTEM_DESIGN" | "DSA" | "PROJECT_DEEP_DIVE";
  priority?: "HIGH" | "MEDIUM";
  estimatedHours?: number;
  evidenceReason?: string;
}

interface TurnDecision {
  interviewerAction:
    | "OPENING_QUESTION"
    | "PROBE_DEEPER"
    | "CHALLENGE_RESUME_PROJECT"
    | "GIVE_HINT"
    | "NEXT_TOPIC_AND_LOG_EVIDENCE"
    | "CONCLUDE_INTERVIEW";
  spokenResponse: string;
  skillEvaluatedOnLastTurn?: {
    evaluated?: boolean;
    skillName?: string;
    turnScore?: number;
    verdict?: "POSITIVE" | "NEGATIVE";
    evidenceCitation?: string;
  };
  gapDetectedStudyTask?: GapDetectedStudyTask;
  finalReport?: {
    isComplete?: boolean;
    overallScore?: number;
    strengths?: string[];
    weaknesses?: string[];
    remedialTasks?: RemedialTaskInput[];
  };
}

export interface InterviewMessageTurn {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: string;
  interviewerAction?: string;
  skillTested?: string;
}

function getOptionalSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim();

  if (!url || !key || url.includes("your-project-id") || key.includes("your-supabase")) {
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function readLocalStore(): LocalInterviewStore {
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_STORE_PATH, "utf-8")) as Partial<LocalInterviewStore>;
      return {
        sessions: parsed.sessions ?? {},
        skillsByUser: parsed.skillsByUser ?? {},
        tasksByUser: parsed.tasksByUser ?? {},
      };
    }
  } catch {
    // Fallback to clean empty store if local file is malformed
  }
  return { sessions: {}, skillsByUser: {}, tasksByUser: {} };
}

function writeLocalStore(store: LocalInterviewStore): void {
  try {
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // Non-fatal in read-only environments
  }
}

function resolveUserId(rawUserId?: string): { userId: string; isGuest: boolean } {
  const isUuid = Boolean(
    rawUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawUserId)
  );
  if (isUuid && rawUserId !== GUEST_PERSISTENT_UUID) {
    return { userId: rawUserId!, isGuest: false };
  }
  return { userId: GUEST_PERSISTENT_UUID, isGuest: true };
}

function normalizeScore0To100(rawScore: unknown, fallback = 65): number {
  if (rawScore === null || rawScore === undefined || rawScore === "") {
    return fallback;
  }
  const num = Number(rawScore);
  if (Number.isNaN(num) || num < 0) return fallback;
  // Normalize decimal 0..1 LLM outputs (e.g. 0.6 -> 60, 0.45 -> 45) onto a 0..100 integer scale
  if (num > 0 && num <= 1) {
    return Math.round(num * 100);
  }
  return Math.min(100, Math.round(num));
}

async function persistNewStudyPlanTasks(params: {
  tasks: LocalReadinessTask[];
  userId: string;
  localStore: LocalInterviewStore;
  supabase: SupabaseClient | null;
}): Promise<LocalReadinessTask[]> {
  const { tasks, userId, localStore, supabase } = params;
  if (tasks.length === 0) return [];

  const prevTasks = localStore.tasksByUser[userId] || [];
  const existingTitles = new Set(prevTasks.map((t) => t.title.trim().toLowerCase()));
  const uniqueTasks: LocalReadinessTask[] = [];

  for (const task of tasks) {
    const normalizedTitle = task.title.trim().toLowerCase();
    if (!normalizedTitle || existingTitles.has(normalizedTitle)) continue;
    existingTitles.add(normalizedTitle);
    uniqueTasks.push(task);
  }

  if (uniqueTasks.length === 0) return [];

  localStore.tasksByUser[userId] = [...uniqueTasks, ...prevTasks].slice(0, 50);

  if (supabase) {
    try {
      await supabase.from("readiness_tasks").insert(
        uniqueTasks.map((r) => ({
          user_id: r.user_id,
          title: r.title,
          category: r.category,
          priority: r.priority,
          estimated_hours: r.estimated_hours,
          description: r.description,
          completed: r.completed,
          created_at: r.created_at,
        }))
      );
    } catch (dbErr) {
      console.warn("[agent-turn] Supabase tasks insert warning:", dbErr);
    }
  }

  return uniqueTasks;
}

function computeNextConfidence(
  currentTier: ConfidenceTier,
  verdict: "POSITIVE" | "NEGATIVE",
  claimedLevel: "LOW" | "MEDIUM" | "HIGH"
) {
  const idx = Math.max(0, LADDER.indexOf(currentTier));
  const nextIdx =
    verdict === "POSITIVE"
      ? Math.min(LADDER.length - 1, idx + 1)
      : currentTier === "UNVERIFIED"
      ? 1
      : Math.max(1, idx - 1);
  const nextTier = LADDER[nextIdx];
  return {
    previousTier: currentTier,
    nextTier,
    bluffRisk: claimedLevel === "HIGH" && nextTier === "LOW",
  };
}

function extractJsonObject(rawText: string): string {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    return cleaned;
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

function isUsableKey(val: string | undefined, placeholderPrefix: string): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  return Boolean(trimmed) && !trimmed.startsWith(placeholderPrefix) && !trimmed.includes("your_");
}

async function callInterviewLLM(
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; provider: "gemini" | "groq" }> {
  const sanitize = (v: string | undefined) => (v ? v.trim().replace(/^["']|["']$/g, "").trim() : "");
  const geminiKey = sanitize(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY);
  const groqKey = sanitize(process.env.GROQ_API_KEY);
  const errors: string[] = [];

  if (isUsableKey(geminiKey, "placeholder-")) {
    const geminiModels = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
    for (const model of geminiModels) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(12000),
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: "user", parts: [{ text: userPrompt }] }],
              generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
            }),
          }
        );

        if (geminiRes.ok) {
          const json = (await geminiRes.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return { text, provider: "gemini" };
        } else {
          errors.push(`gemini/${model}: HTTP ${geminiRes.status}`);
        }
      } catch (err) {
        errors.push(`gemini/${model}: ${err instanceof Error ? err.message : "network error"}`);
      }
    }
  }

  if (isUsableKey(groqKey, "your_")) {
    const groqModels = [
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
      "llama-3.3-70b-versatile",
    ];
    for (const model of groqModels) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            model,
            temperature: 0.3,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });

        if (groqRes.ok) {
          const json = (await groqRes.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const text = json.choices?.[0]?.message?.content;
          if (text) return { text, provider: "groq" };
        } else {
          const errBody = await groqRes.text();
          errors.push(`groq/${model}: HTTP ${groqRes.status} ${errBody.slice(0, 120)}`);
        }
      } catch (err) {
        errors.push(`groq/${model}: ${err instanceof Error ? err.message : "network error"}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`LLM_PROVIDER_ERROR: ${errors.join(" | ").slice(0, 350)}`);
  }

  throw new Error(
    "AI_KEY_MISSING: Configure GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) or GROQ_API_KEY in .env.local."
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      userId?: string;
      targetRole?: string;
      targetCompany?: string;
      history?: InterviewMessageTurn[];
      candidateMessage?: string;
      requestType?: "STANDARD_TURN" | "REQUEST_SMALL_HINT";
      currentQuestionText?: string;
      maxTurns?: number;
      resumeProjects?: ResumeProjectContext[];
      trackedSkills?: SkillEvidenceRow[];
    };

    const {
      sessionId,
      userId: rawUserId,
      targetRole = "Software Engineer",
      targetCompany = "",
      history = [],
      candidateMessage = "",
      requestType = "STANDARD_TURN",
      currentQuestionText = "",
      maxTurns = 6,
      resumeProjects: bodyProjects,
      trackedSkills: bodySkills,
    } = body;

    const { userId, isGuest } = resolveUserId(rawUserId);
    const supabase = getOptionalSupabaseClient();

    // Branch 1: Candidate accepted the 30-second proactive hint offer or clicked Ask for Hint
    if (requestType === "REQUEST_SMALL_HINT") {
      const latestInterviewerMsg =
        currentQuestionText.trim() ||
        [...history].reverse().find((m) => m.role === "interviewer")?.content ||
        `Core technical question for ${targetRole}`;

      const hintSystemPrompt = `You are a supportive Technical Interviewer Agent for "${targetRole}".
The candidate paused on your active question and requested a small hint.
Provide a concise, encouraging 1-to-2 sentence conceptual nudge pointing them in the right architectural direction WITHOUT spoiling the answer, plus 2 to 3 crisp clue keywords.

Return ONLY valid JSON:
{
  "spokenHint": "string (1-2 warm, natural spoken sentences giving a small directional hint)",
  "clueKeywords": ["string (keyword 1)", "string (keyword 2)", "string (keyword 3)"]
}`;

      const { text: hintRawText, provider: hintProvider } = await callInterviewLLM(
        hintSystemPrompt,
        `Active Interview Question:\n"${latestInterviewerMsg}"\n\nGenerate a small directional hint now.`
      );
      const hintDecision = JSON.parse(extractJsonObject(hintRawText)) as {
        spokenHint?: string;
        clueKeywords?: unknown[];
      };

      const activeStorageMode = supabase ? "supabase" : "local_file";
      const hintGraphNodes = await executeLiveTurnTraceGraph({
        sessionId: sessionId || `hint-${Date.now()}`,
        hasCandidateMessage: false,
        interviewerAction: "GIVE_HINT",
        storageMode: activeStorageMode,
      });

      return NextResponse.json({
        success: true,
        isHintResponse: true,
        engine: "LangGraph.js + LangChain.js Stateful Interviewer",
        llmProvider: hintProvider,
        langGraphNodesExecuted: hintGraphNodes,
        interviewerAction: "GIVE_HINT",
        spokenHint:
          hintDecision.spokenHint?.trim() ||
          "Think carefully about state consistency, failure recovery modes, and latency trade-offs under peak load.",
        clueKeywords: Array.isArray(hintDecision.clueKeywords)
          ? hintDecision.clueKeywords.slice(0, 4).map(String)
          : ["Failure Modes", "Latency vs Consistency", "Backpressure"],
      });
    }

    // Branch 2: Standard Multi-Turn Interview Evaluation & Action Routing
    const localStore = readLocalStore();

    let candidateProjects: ResumeProjectContext[] = Array.isArray(bodyProjects) ? bodyProjects : [];
    let trackedSkills: SkillEvidenceRow[] = localStore.skillsByUser[userId] || [];

    if (Array.isArray(bodySkills) && bodySkills.length > 0 && trackedSkills.length === 0) {
      trackedSkills = bodySkills;
    }

    if (supabase) {
      try {
        const [{ data: resumeRow }, { data: skillRows }] = await Promise.all([
          supabase
            .from("resumes")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("skill_evidence_matrix").select("*").eq("user_id", userId),
        ]);

        const parsedResume =
          (resumeRow as { parsed_data?: { projects?: ResumeProjectContext[] } } | null)?.parsed_data || null;
        if (Array.isArray(parsedResume?.projects) && parsedResume.projects.length > 0) {
          candidateProjects = parsedResume.projects;
        }
        if (Array.isArray(skillRows) && skillRows.length > 0) {
          trackedSkills = skillRows as SkillEvidenceRow[];
        }
      } catch (dbErr) {
        console.warn("[agent-turn] Supabase context fetch failed, continuing with local store:", dbErr);
      }
    }

    const bluffOrUnverifiedSkills = trackedSkills
      .filter((s) => s.bluff_risk || s.verified_confidence === "LOW" || s.verified_confidence === "UNVERIFIED")
      .map((s) => s.skill_name);

    const candidateTurnsCount =
      history.filter((m) => m.role === "candidate").length + (candidateMessage ? 1 : 0);
    const shouldForceConclude = candidateTurnsCount >= maxTurns;

    const interviewerSystemPrompt = `You are an elite, realistic Technical Interviewer Agent conducting a live back-and-forth interview for the role of "${targetRole}"${targetCompany ? ` at ${targetCompany}` : ""}.

CANDIDATE REAL CONTEXT:
- Extracted Resume Projects: ${candidateProjects.length > 0 ? JSON.stringify(candidateProjects) : "No resume uploaded yet (ask role-specific fundamental & practical production scenario questions)"}
- Tracked Skills in Matrix: ${trackedSkills.map((s) => `${s.skill_name} (Claimed:${s.claimed_level || "MEDIUM"}, Verified:${s.verified_confidence || "UNVERIFIED"}, BluffRisk:${Boolean(s.bluff_risk)})`).join(", ") || "General Role Fundamentals"}
- Priority Skills Requiring Verification / Bluff-Testing: ${bluffOrUnverifiedSkills.join(", ") || "Core engineering depth"}
- Current Turn: ${candidateTurnsCount} of ${maxTurns}

HOW YOU MUST BEHAVE AS AN AUTONOMOUS INTERVIEWER:
1. If history is empty (Turn 0), greet briefly in 1 short sentence, reference one specific project or core competency for "${targetRole}"${targetCompany ? ` (${targetCompany} style)` : ""}, and ask your first concrete, open-ended technical question. Do NOT give multiple-choice answers.
2. When the candidate answers, examine the depth of what they said and choose ONE action:
   - "PROBE_DEEPER": Answer was textbook, vague, or missed an edge case / failure mode — push back like a senior engineer on that exact point.
   - "CHALLENGE_RESUME_PROJECT": Cross-examine an architectural choice or trade-off in one of their Extracted Resume Projects.
   - "GIVE_HINT": Candidate explicitly stalled or asked for a hint — give a short nudge and let them continue.
   - "NEXT_TOPIC_AND_LOG_EVIDENCE": Record a "POSITIVE" or "NEGATIVE" verdict for the skill just tested and transition smoothly to the next topic.
   - "CONCLUDE_INTERVIEW": ${shouldForceConclude ? "You MUST choose CONCLUDE_INTERVIEW now because maxTurns is reached." : "Select only when at least 4 candidate turns are complete and key skills have been evaluated."}
3. IMPORTANT SCORE RULE: "turnScore" and "overallScore" MUST ALWAYS be integers between 0 and 100 (e.g. 60, 75, 45 — NEVER decimals like 0.6 or 0.45).
4. REAL-TIME STUDY PLAN GAP REMEDIATION: Whenever the candidate's answer reveals a conceptual gap (turnScore < 70 or verdict === "NEGATIVE"), populate "gapDetectedStudyTask" with hasGap: true and a concrete study plan task so it is added to their Study Plan immediately.

Return ONLY valid JSON matching this exact schema:
{
  "interviewerAction": "OPENING_QUESTION" | "PROBE_DEEPER" | "CHALLENGE_RESUME_PROJECT" | "GIVE_HINT" | "NEXT_TOPIC_AND_LOG_EVIDENCE" | "CONCLUDE_INTERVIEW",
  "spokenResponse": "string (2 to 4 natural sentences spoken directly to the candidate, ending with your question unless concluding)",
  "skillEvaluatedOnLastTurn": {
    "evaluated": boolean,
    "skillName": "string",
    "turnScore": number (INTEGER 0 to 100, e.g. 68),
    "verdict": "POSITIVE" | "NEGATIVE",
    "evidenceCitation": "string (1 sentence explaining what they got right or missed)"
  },
  "gapDetectedStudyTask": {
    "hasGap": boolean (true if the candidate missed an important concept or scored < 70 on this turn),
    "title": "string (Concrete study task title, e.g. 'Master Flink Watermarks & Exactly-Once Checkpointing')",
    "category": "CORE_CS" | "SYSTEM_DESIGN" | "DSA" | "PROJECT_DEEP_DIVE",
    "priority": "HIGH" | "MEDIUM",
    "estimatedHours": number,
    "evidenceReason": "string (1 sentence explaining what gap was spotted in this interview turn)"
  },
  "finalReport": {
    "isComplete": boolean,
    "overallScore": number (INTEGER 0 to 100, e.g. 72),
    "strengths": ["string"],
    "weaknesses": ["string"],
    "remedialTasks": [
      {
        "title": "string",
        "category": "CORE_CS" | "SYSTEM_DESIGN" | "DSA" | "PROJECT_DEEP_DIVE",
        "priority": "HIGH" | "MEDIUM",
        "evidenceReason": "string"
      }
    ]
  }
}`;

    const updatedHistory: InterviewMessageTurn[] = [
      ...history,
      ...(candidateMessage
        ? [
            {
              role: "candidate" as const,
              content: candidateMessage,
              timestamp: new Date().toISOString(),
            },
          ]
        : []),
    ];

    const userPrompt =
      updatedHistory.length === 0
        ? `Start the live interview now for ${targetRole}${targetCompany ? ` at ${targetCompany}` : ""}. Return valid JSON.`
        : `Interview Transcript So Far:\n${updatedHistory
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join("\n\n")}\n\nEvaluate the candidate's latest answer and generate your next interviewer turn JSON.`;

    const { text: rawText, provider } = await callInterviewLLM(interviewerSystemPrompt, userPrompt);
    const turnDecision = JSON.parse(extractJsonObject(rawText)) as TurnDecision;

    const now = new Date().toISOString();
    let skillMatrixMutation: SkillMatrixMutation | null = null;
    const newlyAddedStudyPlanTasks: LocalReadinessTask[] = [];

    if (
      turnDecision.skillEvaluatedOnLastTurn?.evaluated &&
      turnDecision.skillEvaluatedOnLastTurn?.skillName &&
      candidateMessage.trim().length > 0
    ) {
      const evalBlock = turnDecision.skillEvaluatedOnLastTurn;
      const evaluatedSkillName = evalBlock.skillName!.trim();
      const existingSkill = trackedSkills.find(
        (s) => String(s.skill_name).toLowerCase() === evaluatedSkillName.toLowerCase()
      );

      const currentTier: ConfidenceTier = existingSkill?.verified_confidence || "UNVERIFIED";
      const claimedLevel: "LOW" | "MEDIUM" | "HIGH" = existingSkill?.claimed_level || "HIGH";
      const turnScore = normalizeScore0To100(evalBlock.turnScore, 60);
      const verdict: "POSITIVE" | "NEGATIVE" =
        evalBlock.verdict === "POSITIVE" && turnScore >= 60 ? "POSITIVE" : "NEGATIVE";
      const { previousTier, nextTier, bluffRisk } = computeNextConfidence(currentTier, verdict, claimedLevel);

      const prevLog = Array.isArray(existingSkill?.evidence_log) ? existingSkill.evidence_log : [];
      const citation = evalBlock.evidenceCitation || `Scored ${turnScore}/100 in live interview turn`;
      const updatedLog: SkillEvidenceLogEntry[] = [
        {
          timestamp: now,
          source: "MOCK_INTERVIEW",
          verdict,
          citation,
        },
        ...prevLog,
      ].slice(0, 15);

      const skillRecord: SkillEvidenceRow = {
        user_id: userId,
        skill_name: existingSkill?.skill_name || evaluatedSkillName,
        claimed_level: claimedLevel,
        verified_confidence: nextTier,
        bluff_risk: bluffRisk,
        evidence_log: updatedLog,
        updated_at: now,
      };

      const userSkills = localStore.skillsByUser[userId] || [];
      const existingIdx = userSkills.findIndex(
        (s) => s.skill_name.toLowerCase() === skillRecord.skill_name.toLowerCase()
      );
      if (existingIdx >= 0) {
        userSkills[existingIdx] = skillRecord;
      } else {
        userSkills.push(skillRecord);
      }
      localStore.skillsByUser[userId] = userSkills;

      if (supabase) {
        try {
          await supabase.from("skill_evidence_matrix").upsert(skillRecord, { onConflict: "user_id,skill_name" });
        } catch (dbErr) {
          console.warn("[agent-turn] Supabase skill upsert warning:", dbErr);
        }
      }

      skillMatrixMutation = {
        skillName: skillRecord.skill_name,
        previousTier,
        nextTier,
        bluffRisk,
        verdict,
        turnScore,
        citation,
      };
    }

    // Real-time Study Plan gap task injection whenever a knowledge gap or low turn score (<70) is spotted
    const hasExplicitGapTask = Boolean(
      turnDecision.gapDetectedStudyTask?.hasGap && turnDecision.gapDetectedStudyTask.title?.trim()
    );
    const hasTurnScoreGap = Boolean(
      skillMatrixMutation && (skillMatrixMutation.verdict === "NEGATIVE" || skillMatrixMutation.turnScore < 70)
    );

    if (candidateMessage.trim().length > 0 && (hasExplicitGapTask || hasTurnScoreGap)) {
      const gapInput = turnDecision.gapDetectedStudyTask;
      const fallbackSkill = skillMatrixMutation?.skillName || `${targetRole} Architecture`;
      const taskTitle =
        gapInput?.title?.trim() || `Strengthen ${fallbackSkill} Depth & Production Edge Cases`;
      const taskReason =
        gapInput?.evidenceReason?.trim() ||
        skillMatrixMutation?.citation ||
        `Gap detected during live ${targetRole} interview probe.`;

      const inserted = await persistNewStudyPlanTasks({
        tasks: [
          {
            id: `study-gap-${Date.now()}`,
            user_id: userId,
            title: taskTitle,
            category: gapInput?.category || "SYSTEM_DESIGN",
            priority: gapInput?.priority || "HIGH",
            estimated_hours:
              typeof gapInput?.estimatedHours === "number" && gapInput.estimatedHours > 0
                ? gapInput.estimatedHours
                : 2,
            description: `[Interview Gap Identified • ${targetRole}] ${taskReason}`,
            completed: false,
            created_at: now,
          },
        ],
        userId,
        localStore,
        supabase,
      });
      newlyAddedStudyPlanTasks.push(...inserted);
    }

    const completeTranscript: InterviewMessageTurn[] = [
      ...updatedHistory,
      {
        role: "interviewer",
        content: turnDecision.spokenResponse,
        timestamp: now,
        interviewerAction: turnDecision.interviewerAction,
        skillTested: turnDecision.skillEvaluatedOnLastTurn?.skillName || undefined,
      },
    ];

    const isComplete = Boolean(
      turnDecision.interviewerAction === "CONCLUDE_INTERVIEW" || turnDecision.finalReport?.isComplete
    );
    const normalizedFinalScore = isComplete
      ? normalizeScore0To100(turnDecision.finalReport?.overallScore, 65)
      : null;

    let persistedSessionId = sessionId || `local-${Date.now()}`;
    const existingLocal = localStore.sessions[persistedSessionId];
    localStore.sessions[persistedSessionId] = {
      id: persistedSessionId,
      user_id: userId,
      role: targetRole,
      company: targetCompany || null,
      status: isComplete ? "COMPLETED" : "IN_PROGRESS",
      score: normalizedFinalScore,
      transcript: completeTranscript,
      created_at: existingLocal?.created_at || now,
      updated_at: now,
    };

    if (supabase) {
      try {
        if (sessionId && !sessionId.startsWith("local-")) {
          await supabase
            .from("interview_sessions")
            .update({
              transcript: completeTranscript,
              score: normalizedFinalScore,
              status: isComplete ? "COMPLETED" : "IN_PROGRESS",
              updated_at: now,
            })
            .eq("id", sessionId);
        } else {
          const { data: newSession } = await supabase
            .from("interview_sessions")
            .insert({
              user_id: userId,
              role: targetRole,
              company: targetCompany || null,
              status: isComplete ? "COMPLETED" : "IN_PROGRESS",
              score: normalizedFinalScore,
              transcript: completeTranscript,
              created_at: now,
            })
            .select("id")
            .single();
          if ((newSession as { id?: string } | null)?.id) {
            persistedSessionId = (newSession as { id: string }).id;
          }
        }
      } catch (dbErr) {
        console.warn("[agent-turn] Supabase session persist warning:", dbErr);
      }
    }

    if (
      isComplete &&
      Array.isArray(turnDecision.finalReport?.remedialTasks) &&
      turnDecision.finalReport.remedialTasks.length > 0
    ) {
      const insertedFinalTasks = await persistNewStudyPlanTasks({
        tasks: turnDecision.finalReport.remedialTasks.map((t, idx) => ({
          id: `study-final-${Date.now()}-${idx}`,
          user_id: userId,
          title: t.title,
          category: t.category || "CORE_CS",
          priority: t.priority || "HIGH",
          estimated_hours: 2,
          description: `[Interview Diagnostic • ${targetRole}] ${t.evidenceReason}`,
          completed: false,
          created_at: now,
        })),
        userId,
        localStore,
        supabase,
      });
      newlyAddedStudyPlanTasks.push(...insertedFinalTasks);
    }

    writeLocalStore(localStore);

    const activeStorageMode = supabase ? "supabase" : "local_file";
    const baseGraphNodes = await executeLiveTurnTraceGraph({
      sessionId: persistedSessionId,
      hasCandidateMessage: Boolean(candidateMessage),
      interviewerAction: turnDecision.interviewerAction,
      storageMode: activeStorageMode,
    });
    const langGraphNodesExecuted =
      newlyAddedStudyPlanTasks.length > 0
        ? [
            ...baseGraphNodes.slice(0, -1),
            "inject_study_plan_remediation",
            ...baseGraphNodes.slice(-1),
          ]
        : baseGraphNodes;

    return NextResponse.json({
      success: true,
      engine: "LangGraph.js + LangChain.js Stateful Interviewer",
      langGraphNodesExecuted,
      isGuest,
      userId,
      storageMode: activeStorageMode,
      llmProvider: provider,
      sessionId: persistedSessionId,
      turnNumber: candidateTurnsCount,
      interviewerAction: turnDecision.interviewerAction,
      spokenResponse: turnDecision.spokenResponse,
      skillMatrixMutation,
      newlyAddedStudyPlanTasks,
      finalReport: isComplete
        ? {
            ...turnDecision.finalReport,
            overallScore: normalizedFinalScore ?? 65,
            isComplete: true,
            injectedReadinessTasksCount: newlyAddedStudyPlanTasks.length,
          }
        : null,
      history: completeTranscript,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json(
      {
        success: false,
        error: `INTERVIEW_AGENT_TURN_EXCEPTION: ${message}`,
      },
      { status: 500 }
    );
  }
}
