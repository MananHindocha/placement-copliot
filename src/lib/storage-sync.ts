"use client";

import { KANBAN_CARDS, READINESS_MILESTONES, INTERVIEW_SESSIONS, ACTIVITIES } from "@/lib/mock-data";
import type { KanbanCard, ReadinessMilestone, InterviewSession, Activity, ResumeAnalysis, ParsedResumeDocument } from "@/types";

export const STORAGE_KEYS = {
  APPLICATIONS: "copilot_applications_v1",
  RESUME_WORKSPACE: "copilot_latest_resume_analysis",
  INTERVIEWS: "copilot_interview_sessions_v1",
  READINESS: "copilot_readiness_tasks_v1",
  ACTIVITIES: "copilot_activity_feed_v1",
} as const;

export interface StoredResumeWorkspace {
  analysis: ResumeAnalysis;
  editableResume: ParsedResumeDocument | null;
  appliedSuggestionIds: string[];
  userId: string | null;
  fileName?: string;
  updatedAt?: string;
}

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function dispatchCopilotUpdate(source: string): void {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(new CustomEvent("copilot-data-updated", { detail: { source, timestamp: Date.now() } }));
  } catch {
    window.dispatchEvent(new Event("copilot-data-updated"));
  }
}

// ─── Applications (Kanban) Storage ───────────────────────────────────────────

export function getStoredApplications(): KanbanCard[] {
  if (!isBrowser()) return [...KANBAN_CARDS];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(KANBAN_CARDS));
      return [...KANBAN_CARDS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...KANBAN_CARDS];
  } catch {
    return [...KANBAN_CARDS];
  }
}

export function setStoredApplications(cards: KanbanCard[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(cards));
    dispatchCopilotUpdate("applications");
  } catch (err) {
    console.warn("[storage-sync] Failed to save applications:", err);
  }
}

// ─── Readiness Tasks Storage ─────────────────────────────────────────────────

export function getStoredReadinessMilestones(): ReadinessMilestone[] {
  if (!isBrowser()) return [...READINESS_MILESTONES];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.READINESS);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEYS.READINESS, JSON.stringify(READINESS_MILESTONES));
      return [...READINESS_MILESTONES];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...READINESS_MILESTONES];
  } catch {
    return [...READINESS_MILESTONES];
  }
}

export function setStoredReadinessMilestones(milestones: ReadinessMilestone[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.READINESS, JSON.stringify(milestones));
    dispatchCopilotUpdate("readiness");
  } catch (err) {
    console.warn("[storage-sync] Failed to save readiness milestones:", err);
  }
}

// ─── Interview Sessions Storage ──────────────────────────────────────────────

export function getStoredInterviewSessions(): InterviewSession[] {
  if (!isBrowser()) return [...INTERVIEW_SESSIONS];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.INTERVIEWS);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEYS.INTERVIEWS, JSON.stringify(INTERVIEW_SESSIONS));
      return [...INTERVIEW_SESSIONS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...INTERVIEW_SESSIONS];
  } catch {
    return [...INTERVIEW_SESSIONS];
  }
}

export function setStoredInterviewSessions(sessions: InterviewSession[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.INTERVIEWS, JSON.stringify(sessions));
    dispatchCopilotUpdate("interviews");
  } catch (err) {
    console.warn("[storage-sync] Failed to save interview sessions:", err);
  }
}

// ─── Resume Analysis Storage ─────────────────────────────────────────────────

export function getStoredResumeWorkspace(): StoredResumeWorkspace | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.RESUME_WORKSPACE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.analysis) {
      return parsed as StoredResumeWorkspace;
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredResumeWorkspace(workspace: StoredResumeWorkspace): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.RESUME_WORKSPACE, JSON.stringify(workspace));
    dispatchCopilotUpdate("resume");
  } catch (err) {
    console.warn("[storage-sync] Failed to save resume workspace:", err);
  }
}

// ─── Activity Feed Storage & Logger ──────────────────────────────────────────

export function getStoredActivities(): Activity[] {
  if (!isBrowser()) return [...ACTIVITIES];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(ACTIVITIES));
      return [...ACTIVITIES];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...ACTIVITIES];
  } catch {
    return [...ACTIVITIES];
  }
}

export function logActivity(activity: Omit<Activity, "id" | "timestamp">): void {
  if (!isBrowser()) return;
  try {
    const current = getStoredActivities();
    const newEntry: Activity = {
      ...activity,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: "Just now",
    };
    const updated = [newEntry, ...current].slice(0, 30); // Keep latest 30
    window.localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
    dispatchCopilotUpdate("activity");
  } catch (err) {
    console.warn("[storage-sync] Failed to log activity:", err);
  }
}

