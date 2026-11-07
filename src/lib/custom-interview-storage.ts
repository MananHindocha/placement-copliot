"use client";

import type { StudioQuestion } from "@/components/interview/interview-common";

export interface CustomInterviewSession {
  sessionId: string;
  targetRole: string;
  targetCompany?: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  selectedFocusAreas: string[];
  jobDescription: string;
  resumeContext?: {
    candidateName?: string;
    skills: string[];
    projects: Array<{ title: string; subtitle?: string; bullets: string[] }>;
    experience: Array<{ title: string; subtitle?: string; bullets: string[] }>;
  };
  generatedQuestions: StudioQuestion[];
  createdAt: number;
}

const CUSTOM_SESSIONS_KEY = "copilot_custom_interview_sessions_v1";
const DRAFT_CONFIG_KEY = "copilot_custom_draft_config_v1";

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function saveCustomInterviewSession(session: CustomInterviewSession): void {
  if (!isBrowser()) return;
  try {
    const raw = window.localStorage.getItem(CUSTOM_SESSIONS_KEY);
    const existing: Record<string, CustomInterviewSession> = raw ? JSON.parse(raw) : {};
    existing[session.sessionId] = session;
    window.localStorage.setItem(CUSTOM_SESSIONS_KEY, JSON.stringify(existing));
  } catch {
    // Safe fallback
  }
}

export function getCustomInterviewSession(sessionId: string): CustomInterviewSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CUSTOM_SESSIONS_KEY);
    if (!raw) return null;
    const existing: Record<string, CustomInterviewSession> = JSON.parse(raw);
    return existing[sessionId] || null;
  } catch {
    return null;
  }
}

export function getAllCustomInterviewSessions(): CustomInterviewSession[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_SESSIONS_KEY);
    if (!raw) return [];
    const existing: Record<string, CustomInterviewSession> = JSON.parse(raw);
    return Object.values(existing).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function saveDraftCustomConfig(config: Partial<CustomInterviewSession>): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(DRAFT_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Safe fallback
  }
}

export function getDraftCustomConfig(): Partial<CustomInterviewSession> | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

