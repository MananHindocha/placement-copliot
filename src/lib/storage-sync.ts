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

const KNOWN_DEMO_CARD_IDS = new Set(["k1", "k2", "k3", "k4", "k5", "k6", "k7", "k8"]);

function isDemoFixture(card: KanbanCard): boolean {
  if (!card) return false;
  if (KNOWN_DEMO_CARD_IDS.has(card.id)) return true;
  const match = card.id.match(/^k(d+)$/);
  if (match && Number(match[1]) <= 8) return true;
  return false;
}

export function getStoredApplications(): KanbanCard[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      window.localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify([]));
      return [];
    }
    // Clean up known legacy demo fixtures without deleting genuine user-created applications
    const cleaned = parsed.filter((c) => !isDemoFixture(c));
    if (cleaned.length !== parsed.length) {
      window.localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
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

const KNOWN_DEMO_MILESTONE_IDS = new Set(["rm1", "rm2", "rm3", "rm4", "rm5", "rm6", "rm7", "rm8"]);

function isDemoMilestone(milestone: ReadinessMilestone): boolean {
  if (!milestone) return false;
  if (KNOWN_DEMO_MILESTONE_IDS.has(milestone.id)) return true;
  const match = milestone.id.match(/^rm(\d+)$/);
  if (match && Number(match[1]) <= 8) return true;
  return false;
}

export function getStoredReadinessMilestones(): ReadinessMilestone[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.READINESS);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEYS.READINESS, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      window.localStorage.setItem(STORAGE_KEYS.READINESS, JSON.stringify([]));
      return [];
    }
    // Clean up known legacy demo fixtures without deleting genuine user-created milestones
    const cleaned = parsed.filter((m) => !isDemoMilestone(m));
    if (cleaned.length !== parsed.length) {
      window.localStorage.setItem(STORAGE_KEYS.READINESS, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
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

