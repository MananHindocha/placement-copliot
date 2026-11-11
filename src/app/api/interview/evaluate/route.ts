import { NextRequest, NextResponse } from "next/server";
import { triggerAgentEventAsync } from "@/lib/agent/orchestrator";
import { resolveUserId } from "@/lib/interview/server-helpers";
import { runEvaluationLangGraph } from "@/lib/interview-graph/langgraph-interviewer";
import type {
  InterviewCategory,
  InterviewEvaluationRequest,
  InterviewEvaluationResponse,
  InterviewTelemetry,
} from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EvaluateRequestBody = Partial<InterviewEvaluationRequest> & {
  userId?: string;
  sessionId?: string;
  targetRole?: string;
  topic?: string;
  question?: string;
  answer?: string;
  transcript?: string;
  currentDifficulty?: string;
  expectedConcepts?: string[];
  wpm?: number;
  fillerCount?: number;
};

function normalizeLevel(raw: unknown): 1 | 2 | 3 {
  return raw === 2 || raw === 3 ? raw : 1;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EvaluateRequestBody;
    const questionText = (body?.questionText || body?.question || "").trim();
    const candidateAnswer = (body?.userTranscript || body?.answer || body?.transcript || "").trim();
    const codeSnippet = (body?.codeSnippet || "").trim();

    if (!questionText) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload: questionText (or question) is required." },
        { status: 400 }
      );
    }

    if (!candidateAnswer && !codeSnippet) {
      return NextResponse.json(
        { success: false, error: "EMPTY_ANSWER: Please speak or type your answer before submitting." },
        { status: 400 }
      );
    }

    const effectiveRole = (body.targetRole || body.role || "Full-Stack SDE").trim();
    const effectiveCategory = (body.category || "core-technical") as InterviewCategory;
    const effectiveLevel = normalizeLevel(body.currentLevel);
    const { userId } = resolveUserId(body.userId);

    const expectedConcepts = Array.isArray(body.keyConceptsToCover)
      ? body.keyConceptsToCover
      : Array.isArray(body.expectedConcepts)
      ? body.expectedConcepts
      : [];

    const telemetry: InterviewTelemetry = body.telemetry || {
      avgWpm: typeof body.wpm === "number" ? body.wpm : 130,
      wpmTimeSeries: [typeof body.wpm === "number" ? body.wpm : 130],
      fillerWords: {},
      totalFillerCount: typeof body.fillerCount === "number" ? body.fillerCount : 0,
      hesitationGapsCount: 0,
      eyeContactPct: -1,
      postureStabilityPct: 85,
    };

    const finalState = await runEvaluationLangGraph({
      userId,
      sessionId: body.sessionId,
      questionId: body.questionId || `q-${Date.now()}`,
      targetRole: effectiveRole,
      category: effectiveCategory,
      topic: body.topic,
      question: questionText,
      candidateAnswer,
      codeSnippet,
      currentDifficulty:
        body.currentDifficulty ||
        (effectiveLevel === 3 ? "Hard" : effectiveLevel === 2 ? "Medium" : "Easy"),
      currentLevel: effectiveLevel,
      expectedConcepts,
      durationSeconds: typeof body.durationSeconds === "number" ? body.durationSeconds : 30,
      telemetry,
      resumeContext: body.resumeContext,
      githubRepoContext: body.githubRepoContext,
      customJdContext: body.customJdContext,
    });

    try {
      triggerAgentEventAsync({
        userId: "guest-demo-user",
        triggerType: "MOCK_INTERVIEW_COMPLETED",
        entityId: body.questionId || "interview-eval",
        goalPrompt: `Candidate completed LangGraph interview turn for ${effectiveRole} with score ${finalState.overallScore}% (Next Level -> ${finalState.nextLevel}/3).`,
        metadata: {
          score: finalState.overallScore,
          topic: effectiveRole,
          questionText: questionText.slice(0, 100),
          adaptiveDecision: finalState.adaptiveDecision,
          nextLevel: finalState.nextLevel,
          langGraphTrace: finalState.langGraphTrace,
        },
      });
    } catch {
      // Non-blocking Track 3 trigger
    }

    const uiResponse: InterviewEvaluationResponse & {
      success: true;
      engine: string;
      storageMode: string;
      llmProvider: string;
      langGraphTrace: string[];
      technicalDepthScore: number;
      clarityAndStructureScore: number;
      addressedConcepts: string[];
      idealStarAnswer: string;
    } = {
      success: true,
      engine: "LangGraph.js + LangChain.js StateGraph",
      storageMode: finalState.storageMode,
      llmProvider: finalState.llmProvider,
      langGraphTrace: finalState.langGraphTrace,
      overallScore: finalState.overallScore,
      contentScore: finalState.contentScore,
      deliveryScore: finalState.deliveryScore,
      technicalDepthScore: finalState.technicalDepthScore,
      clarityAndStructureScore: finalState.clarityAndStructureScore,
      starBreakdown: finalState.starBreakdown,
      deliveryCritique: finalState.deliveryCritique,
      coveredConcepts: finalState.coveredConcepts,
      addressedConcepts: finalState.coveredConcepts,
      missedConcepts: finalState.missedConcepts,
      codeReviewCritique: finalState.codeReviewCritique,
      strengths: finalState.strengths,
      improvements: finalState.improvements,
      rewrittenIdealAnswer: finalState.rewrittenIdealAnswer,
      idealStarAnswer: finalState.rewrittenIdealAnswer,
      interviewerReaction: finalState.interviewerReaction,
      followUpQuestion: {
        prompt: finalState.followUpQuestionPrompt || finalState.adaptiveNextQuestion?.question || "",
        intent: finalState.followUpQuestionIntent || "Probing architectural depth and edge cases.",
      },
      evaluationSource: finalState.evaluationSource,
      adaptiveDecision: finalState.adaptiveDecision,
      nextLevel: finalState.nextLevel,
      adaptiveNextQuestion: finalState.adaptiveNextQuestion
        ? {
            id: finalState.adaptiveNextQuestion.id,
            role: finalState.adaptiveNextQuestion.role,
            category: finalState.adaptiveNextQuestion.category,
            difficulty: finalState.adaptiveNextQuestion.difficulty,
            level: finalState.adaptiveNextQuestion.level,
            question: finalState.adaptiveNextQuestion.question,
            hint: finalState.adaptiveNextQuestion.hint,
            keyConceptsToCover: finalState.adaptiveNextQuestion.keyConceptsToCover,
            isAiEscalated: finalState.adaptiveNextQuestion.isAiEscalated,
          }
        : undefined,
    };

    return NextResponse.json(uiResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "LangGraph.js interview evaluation failed.";
    console.error("[Evaluation Route Error]:", message);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: message.includes("LLM_PROVIDER_ERROR") ? 503 : 500 }
    );
  }
}
