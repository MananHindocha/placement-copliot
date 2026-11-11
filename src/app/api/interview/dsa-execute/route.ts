import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUEST_PERSISTENT_UUID = "00000000-0000-0000-0000-000000000001";
const LOCAL_STORE_PATH = path.join(process.cwd(), ".interview-persistent-store.json");

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

interface LocalDsaSession {
  id: string;
  user_id: string;
  role: string;
  topic: string;
  score: number;
  status: string;
  transcript: Array<{ role: string; content: string }>;
  created_at: string;
}

interface LocalInterviewStore {
  sessions: Record<string, unknown>;
  skillsByUser: Record<string, SkillEvidenceRow[]>;
  tasksByUser: Record<string, unknown[]>;
  dsaSessions?: LocalDsaSession[];
}

export interface DsaAgentReview {
  agentAction:
    | "SYNTAX_OR_RUNTIME_NUDGE"
    | "CHALLENGE_COMPLEXITY_BLUFF"
    | "PROBE_SCALING_EDGE_CASE"
    | "APPROVE_OPTIMAL_SOLUTION";
  spokenBarRaiserResponse: string;
  followUpQuestion: string;
  actualTimeComplexity: string;
  actualSpaceComplexity: string;
  complexityMatch: boolean;
  intuitionMatchesCode: boolean;
  addressedRubricConcepts: string[];
  overallScore: number;
  verdict: "POSITIVE" | "NEGATIVE";
  evidenceCitation: string;
}

export interface FollowUpEvaluation {
  followUpScore: number;
  verdict: "POSITIVE" | "NEGATIVE";
  spokenInterviewerReaction: string;
  nextFollowUpQuestion: string | null;
  keyTakeaway: string;
}

const PISTON_LANGUAGE_MAP: Record<string, { language: string; version: string; fileName: string }> = {
  python: { language: "python", version: "3.10.0", fileName: "main.py" },
  "python 3.11": { language: "python", version: "3.10.0", fileName: "main.py" },
  javascript: { language: "javascript", version: "18.15.0", fileName: "index.js" },
  typescript: { language: "typescript", version: "5.0.3", fileName: "index.ts" },
  cpp: { language: "c++", version: "10.2.0", fileName: "main.cpp" },
  "c++": { language: "c++", version: "10.2.0", fileName: "main.cpp" },
  java: { language: "java", version: "15.0.2", fileName: "Main.java" },
};

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
        dsaSessions: parsed.dsaSessions ?? [],
      };
    }
  } catch {
    // Fallback cleanly if malformed
  }
  return { sessions: {}, skillsByUser: {}, tasksByUser: {}, dsaSessions: [] };
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

async function callDsaLLM(prompt: string): Promise<{ text: string; provider: "gemini" | "groq" }> {
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
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
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
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }],
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

async function persistSkillEvidenceMutation(params: {
  supabase: SupabaseClient | null;
  localStore: LocalInterviewStore;
  userId: string;
  targetSkillName: string;
  source: string;
  verdict: "POSITIVE" | "NEGATIVE";
  citation: string;
  score: number;
  now: string;
}) {
  const { supabase, localStore, userId, targetSkillName, source, verdict, citation, score, now } = params;
  const localSkills = localStore.skillsByUser[userId] || [];
  let existingSkill: SkillEvidenceRow | undefined = localSkills.find(
    (s) => s.skill_name.toLowerCase() === targetSkillName.toLowerCase()
  );

  if (supabase) {
    try {
      const { data } = await supabase
        .from("skill_evidence_matrix")
        .select("*")
        .eq("user_id", userId)
        .ilike("skill_name", targetSkillName)
        .maybeSingle();
      if (data) {
        existingSkill = data as SkillEvidenceRow;
      }
    } catch (dbErr) {
      console.warn("[dsa-execute] Supabase skill fetch warning:", dbErr);
    }
  }

  const currentTier: ConfidenceTier = existingSkill?.verified_confidence || "UNVERIFIED";
  const claimedLevel: "LOW" | "MEDIUM" | "HIGH" = existingSkill?.claimed_level || "HIGH";
  const { previousTier, nextTier, bluffRisk } = computeNextConfidence(currentTier, verdict, claimedLevel);

  const prevLog = Array.isArray(existingSkill?.evidence_log) ? existingSkill.evidence_log : [];
  const updatedLog: SkillEvidenceLogEntry[] = [
    {
      timestamp: now,
      source,
      verdict,
      citation,
    },
    ...prevLog,
  ].slice(0, 15);

  const resolvedSkillName = existingSkill?.skill_name || targetSkillName;
  const skillRecord: SkillEvidenceRow = {
    user_id: userId,
    skill_name: resolvedSkillName,
    claimed_level: claimedLevel,
    verified_confidence: nextTier,
    bluff_risk: bluffRisk,
    evidence_log: updatedLog,
    updated_at: now,
  };

  const idx = localSkills.findIndex((s) => s.skill_name.toLowerCase() === resolvedSkillName.toLowerCase());
  if (idx >= 0) {
    localSkills[idx] = skillRecord;
  } else {
    localSkills.push(skillRecord);
  }
  localStore.skillsByUser[userId] = localSkills;

  if (supabase) {
    try {
      await supabase.from("skill_evidence_matrix").upsert(skillRecord, { onConflict: "user_id,skill_name" });
    } catch (dbErr) {
      console.warn("[dsa-execute] Supabase skill upsert warning:", dbErr);
    }
  }

  return {
    skillName: resolvedSkillName,
    previousTier,
    nextTier,
    bluffRisk,
    verdict,
    score,
    citation,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      userId?: string;
      problemTitle?: string;
      problemTopic?: string;
      problemDescription?: string;
      language?: string;
      code?: string;
      testRunnerSnippet?: string;
      spokenIntuition?: string;
      claimedTimeComplexity?: string;
      claimedSpaceComplexity?: string;
      mode?: "RUN_ONLY" | "RUN_AND_REVIEW" | "SUBMIT_OA" | "EVALUATE_FOLLOWUP";
      originalFollowUpQuestion?: string;
      candidateFollowUpAnswer?: string;
      localTestSummary?: {
        passedCount?: number;
        totalCount?: number;
        failedDetail?: string;
      };
    };

    const {
      userId: rawUserId,
      problemTitle = "Algorithm Problem",
      problemTopic = "Data Structures & Algorithms",
      problemDescription = "",
      language = "python",
      code = "",
      testRunnerSnippet = "",
      spokenIntuition = "",
      claimedTimeComplexity = "O(N)",
      claimedSpaceComplexity = "O(1)",
      mode = "RUN_AND_REVIEW",
      originalFollowUpQuestion = "",
      candidateFollowUpAnswer = "",
      localTestSummary,
    } = body;

    const { userId, isGuest } = resolveUserId(rawUserId);
    const supabase = getOptionalSupabaseClient();
    const localStore = readLocalStore();
    const now = new Date().toISOString();

    // ------------------------------------------------------------------------
    // MODE A: Evaluate the candidate's defense to the Interviewer Follow-up Probe
    // ------------------------------------------------------------------------
    if (mode === "EVALUATE_FOLLOWUP") {
      if (!candidateFollowUpAnswer || !candidateFollowUpAnswer.trim()) {
        return NextResponse.json(
          { success: false, error: "EMPTY_FOLLOWUP_ANSWER: Speak or type your follow-up answer first." },
          { status: 400 }
        );
      }

      const followUpPrompt = `You are a Principal Bar-Raiser Interviewer evaluating a candidate's verbal/written answer to your follow-up probe during a live DSA coding interview.

PROBLEM: ${problemTitle} (${problemTopic})
INTERVIEWER FOLLOW-UP QUESTION ASKED: "${originalFollowUpQuestion || "How does your solution handle extreme scale or edge cases?"}"
CANDIDATE'S SUBMITTED CODE:
\`\`\`
${code || "(No code provided)"}
\`\`\`
CANDIDATE'S LIVE FOLLOW-UP ANSWER:
"${candidateFollowUpAnswer}"

Evaluate how rigorously and accurately the candidate defended their code on time/space complexity, memory limits, or edge cases.
Return ONLY valid JSON:
{
  "followUpScore": number (0 to 100),
  "verdict": "POSITIVE" | "NEGATIVE",
  "spokenInterviewerReaction": "string (2 crisp sentences reacting directly to what they explained — suitable for text-to-speech)",
  "nextFollowUpQuestion": "string or null (1 sharper edge-case follow-up if they missed a subtle flaw, otherwise null)",
  "keyTakeaway": "string (1-sentence diagnostic note for their Skill Evidence Matrix)"
}`;

      const { text: rawEval, provider } = await callDsaLLM(followUpPrompt);
      const followUpEval = JSON.parse(extractJsonObject(rawEval)) as FollowUpEvaluation;
      const verdict: "POSITIVE" | "NEGATIVE" = followUpEval.verdict === "POSITIVE" ? "POSITIVE" : "NEGATIVE";
      const score = typeof followUpEval.followUpScore === "number" ? followUpEval.followUpScore : 0;

      const skillMatrixMutation = await persistSkillEvidenceMutation({
        supabase,
        localStore,
        userId,
        targetSkillName: problemTopic || "Data Structures & Algorithms",
        source: "DSA_FOLLOWUP_DEFENSE",
        verdict,
        citation: `[${problemTitle} Follow-up Defense] ${followUpEval.keyTakeaway}`,
        score,
        now,
      });

      writeLocalStore(localStore);

      return NextResponse.json({
        success: true,
        isGuest,
        userId,
        mode: "EVALUATE_FOLLOWUP",
        storageMode: supabase ? "supabase" : "local_file",
        llmProvider: provider,
        evaluation: followUpEval,
        skillMatrixMutation,
      });
    }

    // ------------------------------------------------------------------------
    // MODE B: Execute Code (Piston with graceful fallback) + AI Bar-Raiser Review
    // ------------------------------------------------------------------------
    if (!code || !code.trim()) {
      return NextResponse.json(
        { success: false, error: "EMPTY_CODE: Write code in the editor before executing tests." },
        { status: 400 }
      );
    }

    const langKey = String(language).toLowerCase().trim();
    const pistonSpec = PISTON_LANGUAGE_MAP[langKey] || PISTON_LANGUAGE_MAP.python;
    const executableSource = testRunnerSnippet ? `${code}\n\n${testRunnerSnippet}` : code;

    const pistonStart = Date.now();
    let stdout = "";
    let stderr = "";
    let exitCode = -1;
    let sandboxAvailable = false;
    let sandboxNote: string | null = null;

    try {
      const pistonEndpoint = process.env.PISTON_API_URL?.trim() || "https://emkc.org/api/v2/piston/execute";
      const pistonRes = await fetch(pistonEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          language: pistonSpec.language,
          version: pistonSpec.version,
          files: [{ name: pistonSpec.fileName, content: executableSource }],
          run_timeout: 3000,
        }),
      });

      if (pistonRes.ok) {
        const pistonJson = (await pistonRes.json()) as {
          run?: { stdout?: string; stderr?: string; code?: number };
          compile?: { stderr?: string };
        };
        stdout = pistonJson.run?.stdout || "";
        stderr = pistonJson.run?.stderr || pistonJson.compile?.stderr || "";
        exitCode = typeof pistonJson.run?.code === "number" ? pistonJson.run.code : -1;
        sandboxAvailable = true;
      } else {
        sandboxNote =
          pistonRes.status === 401
            ? "Remote Piston public sandbox is whitelist-only (HTTP 401); static trace & test telemetry active."
            : `Remote Piston sandbox returned HTTP ${pistonRes.status}; static trace & test telemetry active.`;
      }
    } catch {
      sandboxNote = "Remote Piston sandbox unreachable; static trace & test telemetry active.";
    }

    const executionLatencyMs = Date.now() - pistonStart;

    if (mode === "RUN_ONLY") {
      return NextResponse.json({
        success: true,
        sandboxAvailable,
        sandboxNote,
        sandboxExecution: {
          language: pistonSpec.language,
          version: pistonSpec.version,
          stdout,
          stderr,
          exitCode,
          executionLatencyMs,
        },
      });
    }

    const localSummaryLine =
      localTestSummary && typeof localTestSummary.totalCount === "number"
        ? `- Local Test Runner Telemetry: ${localTestSummary.passedCount ?? 0}/${localTestSummary.totalCount} test cases passed.${
            localTestSummary.failedDetail ? ` Failure note: ${localTestSummary.failedDetail}` : ""
          }`
        : "- Local Test Runner Telemetry: Not supplied";

    const dsaAgentPrompt = `You are a Principal Bar-Raiser Coding Interviewer Agent evaluating a live OA / DSA session.

PROBLEM CONTEXT:
- Title: ${problemTitle}
- Topic: ${problemTopic}
- Description: ${problemDescription}

CANDIDATE SUBMISSION & TELEMETRY:
- Spoken Intuition Out Loud: "${spokenIntuition || "Candidate did not explain intuition aloud before coding."}"
- Claimed Time Complexity: ${claimedTimeComplexity}
- Claimed Space Complexity: ${claimedSpaceComplexity}
- Language: ${pistonSpec.language}
- Submitted Code:
\`\`\`
${code}
\`\`\`

EXECUTION OUTPUT:
- Remote Sandbox Status: ${sandboxAvailable ? `Executed (Exit Code: ${exitCode})` : sandboxNote}
- STDOUT: ${stdout || "(empty)"}
- STDERR: ${stderr || "(none)"}
${localSummaryLine}

YOUR TASK AS AN AUTONOMOUS BAR-RAISER AGENT:
1. Analyze correctness, edge cases, actual Time/Space Complexity, and whether their Spoken Intuition matches the actual implementation.
2. Choose one interviewer action:
   - "SYNTAX_OR_RUNTIME_NUDGE": If code has a bug, syntax issue, failed test, or missing logic — pinpoint the defect without giving away the complete answer.
   - "CHALLENGE_COMPLEXITY_BLUFF": If code is brute-force / suboptimal or contradicts claimed ${claimedTimeComplexity} / ${claimedSpaceComplexity} or spoken intuition.
   - "PROBE_SCALING_EDGE_CASE": If code looks solid — challenge them on extreme scale, streaming data, integer overflow, duplicates, or memory bounds.
   - "APPROVE_OPTIMAL_SOLUTION": Optimal implementation + sound complexity + aligned intuition (still ask one crisp Bar-Raiser follow-up).
3. You MUST produce a specific, tailored "followUpQuestion" directly testing THEIR submitted code (spoken aloud by our UI voice immediately!).

Return ONLY valid JSON:
{
  "agentAction": "SYNTAX_OR_RUNTIME_NUDGE" | "CHALLENGE_COMPLEXITY_BLUFF" | "PROBE_SCALING_EDGE_CASE" | "APPROVE_OPTIMAL_SOLUTION",
  "spokenBarRaiserResponse": "string (2 concise sentences reacting directly to their code and intuition)",
  "followUpQuestion": "string (1 crisp technical follow-up question referencing their specific algorithm/implementation — never generic)",
  "actualTimeComplexity": "string",
  "actualSpaceComplexity": "string",
  "complexityMatch": boolean,
  "intuitionMatchesCode": boolean,
  "addressedRubricConcepts": ["string"],
  "overallScore": number (0 to 100),
  "verdict": "POSITIVE" | "NEGATIVE",
  "evidenceCitation": "string (1-sentence diagnostic evidence)"
}`;

    const { text: rawReviewText, provider } = await callDsaLLM(dsaAgentPrompt);
    const parsedReview = JSON.parse(extractJsonObject(rawReviewText)) as Partial<DsaAgentReview>;
    const agentReview: DsaAgentReview = {
      agentAction: parsedReview.agentAction || "PROBE_SCALING_EDGE_CASE",
      spokenBarRaiserResponse:
        parsedReview.spokenBarRaiserResponse ||
        `I reviewed your ${pistonSpec.language} implementation for ${problemTitle}. Let's test your understanding of its edge cases and complexity.`,
      followUpQuestion:
        parsedReview.followUpQuestion ||
        `How would your ${problemTitle} implementation adapt if input volume increased 100x and could not fit cleanly in memory?`,
      actualTimeComplexity: parsedReview.actualTimeComplexity || claimedTimeComplexity,
      actualSpaceComplexity: parsedReview.actualSpaceComplexity || claimedSpaceComplexity,
      complexityMatch: Boolean(parsedReview.complexityMatch),
      intuitionMatchesCode: Boolean(parsedReview.intuitionMatchesCode),
      addressedRubricConcepts: Array.isArray(parsedReview.addressedRubricConcepts)
        ? parsedReview.addressedRubricConcepts
        : [],
      overallScore: typeof parsedReview.overallScore === "number" ? parsedReview.overallScore : 60,
      verdict: parsedReview.verdict === "POSITIVE" ? "POSITIVE" : "NEGATIVE",
      evidenceCitation:
        parsedReview.evidenceCitation ||
        `Evaluated ${problemTitle} (${pistonSpec.language}) with ${parsedReview.actualTimeComplexity || claimedTimeComplexity}.`,
    };

    const targetSkillName = problemTopic || "Data Structures & Algorithms";
    const skillMatrixMutation = await persistSkillEvidenceMutation({
      supabase,
      localStore,
      userId,
      targetSkillName,
      source: "DSA_SANDBOX_INTERVIEW",
      verdict: agentReview.verdict,
      citation: `[${problemTitle}] ${agentReview.evidenceCitation}`,
      score: agentReview.overallScore,
      now,
    });

    const dsaSessionRecord: LocalDsaSession = {
      id: `dsa-${Date.now()}`,
      user_id: userId,
      role: "DSA & OA Coding",
      topic: `${problemTitle} (${problemTopic})`,
      score: agentReview.overallScore,
      status: mode === "SUBMIT_OA" ? "COMPLETED" : "IN_PROGRESS",
      transcript: [
        { role: "candidate_intuition", content: spokenIntuition },
        { role: "candidate_code", content: code },
        {
          role: "sandbox_output",
          content: `available=${sandboxAvailable}\nexit=${exitCode}\nstdout=${stdout}\nstderr=${stderr}`,
        },
        { role: "interviewer", content: `${agentReview.spokenBarRaiserResponse} ${agentReview.followUpQuestion}` },
      ],
      created_at: now,
    };

    localStore.dsaSessions = [dsaSessionRecord, ...(localStore.dsaSessions || [])].slice(0, 30);
    writeLocalStore(localStore);

    if (supabase) {
      try {
        await supabase.from("interview_sessions").insert({
          user_id: dsaSessionRecord.user_id,
          role: dsaSessionRecord.role,
          topic: dsaSessionRecord.topic,
          score: dsaSessionRecord.score,
          status: dsaSessionRecord.status,
          transcript: dsaSessionRecord.transcript,
          created_at: dsaSessionRecord.created_at,
        });
      } catch (dbErr) {
        console.warn("[dsa-execute] Supabase session insert warning:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      isGuest,
      userId,
      storageMode: supabase ? "supabase" : "local_file",
      llmProvider: provider,
      sandboxAvailable,
      sandboxNote,
      sandboxExecution: {
        language: pistonSpec.language,
        version: pistonSpec.version,
        stdout,
        stderr,
        exitCode,
        executionLatencyMs,
      },
      agentReview,
      skillMatrixMutation,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json(
      {
        success: false,
        error: `DSA_EXECUTE_EXCEPTION: ${message}`,
      },
      { status: 500 }
    );
  }
}
