import { createClient } from "@/lib/supabase/client";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import { INTERVIEW_QUESTIONS, INTERVIEW_SESSIONS } from "@/lib/mock-data";
import type {
  InterviewQuestion,
  InterviewSession,
  InterviewTurn,
  InterviewEvaluationRequest,
  InterviewEvaluationResponse,
} from "@/types";
import type { InterviewSessionRow } from "./types";

let demoSessions: InterviewSession[] = [...INTERVIEW_SESSIONS];

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

export async function getInterviewQuestions(): Promise<InterviewQuestion[]> {
  // Questions bank provides standard practice questions across behavioral, technical, situational
  return [...INTERVIEW_QUESTIONS];
}

export async function getPastInterviewSessions(): Promise<InterviewSession[]> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    return [...demoSessions];
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
    demoSessions = [newSession, ...demoSessions];
    return newSession;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required: please sign in to record an interview session.");
  }

  // 1. Insert parent session adhering strictly to existing Supabase schema
  const durationMin = parseInt(session.duration, 10) || 15;
  const firstTurnCategory = turns && turns[0] ? turns[0].category : "behavioral";
  const { data: sessionData, error: sessionError } = await supabase
    .from("interview_sessions")
    .insert({
      user_id: user.id,
      role: session.role,
      category: firstTurnCategory || "behavioral",
      score: session.score,
      questions_answered: session.questionsAnswered,
      duration_seconds: durationMin * 60,
      feedback: session.feedback,
      completed: true,
    })
    .select()
    .single();

  if (sessionError || !sessionData) {
    throw new Error(`Failed to save interview session: ${sessionError?.message || "Unknown error"}`);
  }

  // 2. Insert child turns if provided (enforcing parent-ownership RLS)
  if (turns && turns.length > 0) {
    const turnsToInsert = turns.map((t, index) => ({
      session_id: sessionData.id,
      question_id: "questionId" in t ? t.questionId || null : null,
      question_text: t.questionText,
      category: t.category || null,
      user_answer: ("userAnswer" in t ? t.userAnswer : (t as { answerText?: string }).answerText) || null,
      ai_feedback: ("aiFeedback" in t ? t.aiFeedback : (t as { feedback?: string }).feedback) || null,
      score: t.score ?? null,
      turn_order: index + 1,
    }));

    const { error: turnsError } = await supabase
      .from("interview_turns")
      .insert(turnsToInsert);

    if (turnsError) {
      await supabase.from("interview_sessions").delete().eq("id", sessionData.id);
      throw new Error(`Failed to save interview turns: ${turnsError.message}`);
    }
  }

  return {
    ...session,
    id: sessionData.id,
    date: new Date(sessionData.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  };
}
