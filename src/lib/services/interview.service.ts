import { createClient } from "@/lib/supabase/client";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import {
  getStoredInterviewSessions,
  setStoredInterviewSessions,
  logActivity,
  dispatchCopilotUpdate,
} from "@/lib/storage-sync";
import { CURATED_INTERVIEW_QUESTIONS, getRoleInterviewQuestions } from "@/lib/interview-questions";
import type {
  InterviewQuestion,
  InterviewSession,
  InterviewTurn,
  InterviewCategory,
  InterviewEvaluationRequest,
  InterviewEvaluationResponse,
} from "@/types";
import type { InterviewSessionRow } from "./types";

export async function evaluateInterviewAnswer(
  payload: InterviewEvaluationRequest
): Promise<InterviewEvaluationResponse> {
  const response = await fetch("/api/interview/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Evaluation request failed with status ${response.status}`
    );
  }

  return response.json();
}

export async function getInterviewQuestions(
  role?: string,
  category: "all" | InterviewCategory = "all"
): Promise<InterviewQuestion[]> {
  if (role) {
    return getRoleInterviewQuestions(role, category);
  }
  return [...CURATED_INTERVIEW_QUESTIONS];
}

export async function getPastInterviewSessions(): Promise<InterviewSession[]> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    return getStoredInterviewSessions();
  }

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(
      authError?.message || "Authentication required: please sign in to view your interview history."
    );
  }

  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*, interview_turns(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load interview sessions from database: ${error.message}`);
  }

  interface RawTurnRow {
    id: string;
    session_id: string;
    question_id?: string | null;
    question_text: string;
    category?: string | null;
    user_answer?: string | null;
    ai_feedback?: string | null;
    score?: number | null;
    turn_order: number;
    created_at: string;
  }

  return ((data as (InterviewSessionRow & { interview_turns?: RawTurnRow[] })[]) || []).map((row) => ({
    id: row.id,
    date: new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    role: row.role,
    score: row.score,
    questionsAnswered: row.questions_answered,
    duration: `${Math.round(row.duration_seconds / 60)} min`,
    feedback: row.feedback || "Session completed successfully.",
    turns: (row.interview_turns || []).map((t) => ({
      id: t.id,
      sessionId: t.session_id,
      questionId: t.question_id || undefined,
      questionText: t.question_text,
      category: t.category || undefined,
      userAnswer: t.user_answer || undefined,
      aiFeedback: t.ai_feedback || undefined,
      score: t.score ?? undefined,
      turnOrder: t.turn_order,
      createdAt: t.created_at,
    })),
  }));
}

export async function recordInterviewSession(
  session: Omit<InterviewSession, "id">,
  turns?: Array<InterviewTurn | { questionText: string; answerText?: string; userAnswer?: string; feedback?: string; aiFeedback?: string; score?: number; category?: string }>
): Promise<InterviewSession> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    const current = getStoredInterviewSessions();
    const newSession: InterviewSession = {
      ...session,
      id: `is-${Date.now()}`,
      turns: (turns || []).map((t, idx) => ({
        id: `turn-${Date.now()}-${idx}`,
        questionText: t.questionText,
        userAnswer: "userAnswer" in t ? t.userAnswer : (t as { answerText?: string }).answerText,
        aiFeedback: "aiFeedback" in t ? t.aiFeedback : (t as { feedback?: string }).feedback,
        score: t.score,
        category: t.category,
        turnOrder: idx + 1,
      })),
    };
    setStoredInterviewSessions([newSession, ...current]);
    logActivity({
      type: "interview",
      message: `Completed ${session.role} mock interview — Scored ${session.score}/100`,
    });
    return newSession;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required: please sign in to record an interview session.");
  }

  // 1. Insert parent session adhering strictly to existing Supabase schema
  const durationMin = parseInt(session.duration, 10) || 15;
  const { data: insertedSession, error: sessionError } = await supabase
    .from("interview_sessions")
    .insert({
      user_id: user.id,
      role: session.role,
      score: session.score,
      questions_answered: session.questionsAnswered,
      duration_seconds: durationMin * 60,
      feedback: session.feedback,
    })
    .select()
    .single();

  if (sessionError || !insertedSession) {
    throw new Error(`Failed to record interview session: ${sessionError?.message || "Unknown database error"}`);
  }

  // 2. Insert child turns if provided
  if (turns && turns.length > 0) {
    const turnPayloads = turns.map((t, idx) => ({
      session_id: insertedSession.id,
      question_text: t.questionText,
      category: t.category || null,
      user_answer: "userAnswer" in t ? t.userAnswer : (t as { answerText?: string }).answerText || null,
      ai_feedback: "aiFeedback" in t ? t.aiFeedback : (t as { feedback?: string }).feedback || null,
      score: t.score ?? null,
      turn_order: idx + 1,
    }));

    const { error: turnError } = await supabase
      .from("interview_turns")
      .insert(turnPayloads);

    if (turnError) {
      console.warn("Child turns could not be persisted:", turnError.message);
    }
  }

  dispatchCopilotUpdate("interviews");

  return {
    ...session,
    id: insertedSession.id,
  };
}
