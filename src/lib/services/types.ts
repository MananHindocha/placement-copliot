import type { DataMode } from "../supabase/config";
import type { KanbanStatus, Job, ReadinessMilestone } from "@/types";

export interface ServiceResponse<T> {
  data: T;
  mode: DataMode;
  error?: string | null;
}

export interface ApplicationRow {
  id: string;
  user_id: string;
  job_id: string | null;
  company: string;
  title: string;
  logo: string | null;
  status: KanbanStatus;
  priority: "high" | "medium" | "low";
  applied_date: string | null;
  next_step: string | null;
  next_step_date: string | null;
  match_score: number | null;
  notes: string | null;
  application_url?: string | null;
  source_url?: string | null;
  location?: string | null;
  job_source?: string | null;
  closing_date?: string | null;
  deadline_provenance?: "verified_source" | "user_entered" | "unknown" | null;
  created_at: string;
  updated_at: string;
}

export interface JobListingRow {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: Job["type"];
  salary_range: string | null;
  match_score: number | null;
  description: string | null;
  tags: string[] | null;
  logo_url: string | null;
  is_active: boolean;
  posted_at: string;
  created_at: string;
}

export interface InterviewSessionRow {
  id: string;
  user_id: string;
  role: string;
  category: string;
  score: number;
  questions_answered: number;
  duration_seconds: number;
  feedback: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface InterviewTurnRow {
  id: string;
  session_id: string;
  question_id: string | null;
  question_text: string;
  category: string | null;
  user_answer: string | null;
  ai_feedback: string | null;
  score: number | null;
  turn_order: number;
  created_at: string;
}

export interface ReadinessTaskRow {
  id: string;
  user_id: string;
  category: ReadinessMilestone["category"];
  title: string;
  description: string | null;
  completed: boolean;
  due_date: string | null;
  priority: "high" | "medium" | "low";
  created_at: string;
  updated_at: string;
}

export interface ResumeAnalysisRow {
  id: string;
  user_id: string;
  resume_id: string | null;
  target_role: string;
  target_company: string | null;
  match_score: number;
  ats_score: number;
  strengths: string[] | null;
  gaps: string[] | null;
  suggestions: unknown;
  keywords: unknown;
    parsed_resume?: unknown;
    analysis_payload?: unknown;
  created_at: string;
}
