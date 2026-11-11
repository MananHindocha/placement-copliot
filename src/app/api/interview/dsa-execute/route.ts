import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getOptionalSupabaseClient,
  readLocalInterviewStore,
  writeLocalInterviewStore,
  resolveUserId,
  computeNextConfidence,
  extractJsonObject,
  callInterviewLLM,
  type ConfidenceTier,
  type SkillEvidenceLogEntry,
  type SkillEvidenceRow,
  type LocalDsaSession,
  type LocalInterviewStore,
} from "@/lib/interview/server-helpers";
import {
  executeSandboxCodeTool,
  type SandboxExecutionToolResult,
} from "@/lib/interview-graph/langgraph-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const localStore = readLocalInterviewStore();
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

      const { text: rawEval, provider } = await callInterviewLLM({
        userPrompt: followUpPrompt,
        temperature: 0.2,
        timeoutMs: 12000,
      });
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

      writeLocalInterviewStore(localStore);

      return NextResponse.json({
        success: true,
        isGuest,
        userId,
        mode: "EVALUATE_FOLLOWUP",
        engine: "LangChain.js Bar-Raiser Follow-up Agent",
        toolsExecuted: ["skill_evidence_matrix_updater"],
        langGraphTrace: ["followup_evaluator", "skill_evidence_matrix_updater"],
        storageMode: supabase ? "supabase" : "local_file",
        llmProvider: provider,
        evaluation: followUpEval,
        skillMatrixMutation,
      });
    }

    // ------------------------------------------------------------------------
    // MODE B: Execute Code (LangChain execute_sandbox_code_tool) + AI Review
    // ------------------------------------------------------------------------
    if (!code || !code.trim()) {
      return NextResponse.json(
        { success: false, error: "EMPTY_CODE: Write code in the editor before executing tests." },
        { status: 400 }
      );
    }

    const rawSandboxJson = await executeSandboxCodeTool.invoke({
      language: String(language || "python"),
      code,
      testRunnerSnippet: testRunnerSnippet || undefined,
    });
    const sandboxResult = JSON.parse(rawSandboxJson) as SandboxExecutionToolResult;
    const { sandboxAvailable, sandboxNote, sandboxExecution } = sandboxResult;
    const {
      language: resolvedLanguage,
      version: resolvedVersion,
      stdout,
      stderr,
      exitCode,
      executionLatencyMs,
    } = sandboxExecution;

    if (mode === "RUN_ONLY") {
      return NextResponse.json({
        success: true,
        engine: "LangChain.js DynamicStructuredTool + Piston Sandbox",
        toolsExecuted: [executeSandboxCodeTool.name],
        langGraphTrace: [`tool:${executeSandboxCodeTool.name}`],
        sandboxAvailable,
        sandboxNote,
        sandboxExecution: {
          language: resolvedLanguage,
          version: resolvedVersion,
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
- Language: ${resolvedLanguage}
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

    const { text: rawReviewText, provider } = await callInterviewLLM({
      userPrompt: dsaAgentPrompt,
      temperature: 0.2,
      timeoutMs: 12000,
    });
    const parsedReview = JSON.parse(extractJsonObject(rawReviewText)) as Partial<DsaAgentReview>;
    const agentReview: DsaAgentReview = {
      agentAction: parsedReview.agentAction || "PROBE_SCALING_EDGE_CASE",
      spokenBarRaiserResponse:
        parsedReview.spokenBarRaiserResponse ||
        `I reviewed your ${resolvedLanguage} implementation for ${problemTitle}. Let's test your understanding of its edge cases and complexity.`,
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
        `Evaluated ${problemTitle} (${resolvedLanguage}) with ${parsedReview.actualTimeComplexity || claimedTimeComplexity}.`,
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
    writeLocalInterviewStore(localStore);

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
      engine: "LangChain.js DynamicStructuredTool + Bar-Raiser Reviewer",
      toolsExecuted: [executeSandboxCodeTool.name, "skill_evidence_matrix_updater"],
      langGraphTrace: [
        `tool:${executeSandboxCodeTool.name}`,
        "bar_raiser_code_reviewer",
        "skill_evidence_matrix_updater",
        "session_persister",
      ],
      storageMode: supabase ? "supabase" : "local_file",
      llmProvider: provider,
      sandboxAvailable,
      sandboxNote,
      sandboxExecution: {
        language: resolvedLanguage,
        version: resolvedVersion,
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
