import { createClient } from "@/lib/supabase/client";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import { INTERVIEW_QUESTIONS, INTERVIEW_SESSIONS } from "@/lib/mock-data";
import type { InterviewQuestion, InterviewSession } from "@/types";
import type { InterviewSessionRow } from "./types";

let demoSessions: InterviewSession[] = [...INTERVIEW_SESSIONS];

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
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load interview sessions from database: ${error.message}`);
  }

  return ((data as InterviewSessionRow[]) || []).map((row: InterviewSessionRow) => ({
    id: row.id,
    date: new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    role: row.role,
    score: row.score,
    questionsAnswered: row.questions_answered,
    duration: `${Math.round(row.duration_seconds / 60)} min`,
    feedback: row.feedback || "Session completed successfully.",
  }));
}

export async function recordInterviewSession(
  session: Omit<InterviewSession, "id">,
  turns?: Array<{ questionText: string; answerText: string; feedback?: string; score?: number }>
): Promise<InterviewSession> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    const newSession: InterviewSession = {
      ...session,
      id: `is-${Date.now()}`,
    };
    demoSessions = [newSession, ...demoSessions];
    return newSession;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required: please sign in to record an interview session.");
  }

  // 1. Insert parent session
  const durationMin = parseInt(session.duration, 10) || 15;
  const { data: sessionData, error: sessionError } = await supabase
    .from("interview_sessions")
    .insert({
      user_id: user.id,
      role: session.role,
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
      question_text: t.questionText,
      user_answer: t.answerText,
      ai_feedback: t.feedback || null,
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
    id: sessionData.id,
    date: new Date(sessionData.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    role: sessionData.role,
    score: sessionData.score,
    questionsAnswered: sessionData.questions_answered,
    duration: `${Math.round(sessionData.duration_seconds / 60)} min`,
    feedback: sessionData.feedback,
  };
}
