"use client";

import { KANBAN_CARDS, READINESS_MILESTONES, INTERVIEW_SESSIONS, ACTIVITIES } from "@/lib/mock-data";
import type { KanbanCard, ReadinessMilestone, InterviewSession, Activity, ResumeAnalysis, ParsedResumeDocument } from "@/types";

export const STORAGE_KEYS = {
  REAL_RESUME: "copilot_real_resume_v1",
  APPLICATIONS: "copilot_applications_v1",
  RESUME_WORKSPACE: "copilot_latest_resume_analysis",
  INTERVIEWS: "copilot_interview_sessions_v1",
  READINESS: "copilot_readiness_tasks_v1",
  ACTIVITIES: "copilot_activity_feed_v1",
} as const;

export interface RealParsedResume {
  fileName: string;
  candidateName: string;
  inferredTargetRoles: string[];
  atsScore: number;
  projectsCount: number;
  projects: Array<{ name: string; techStack: string[]; summary: string }>;
  skills: Array<{ name: string; strength: "Verified Strong" | "Good Foundation" | "Needs Practice"; reason: string }>;
  missingRecommendedSkills: Array<{ skill: string; whyNeeded: string; targetRole: string }>;
  bulletImprovements: Array<{
    originalBullet: string;
    improvedBullet: string;
    projectName: string;
    atsBoost: number;
    applied?: boolean;
  }>;
  parsedAt: string;
  rawText?: string;
}

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

// ─── Real Resume Storage (Step 1 & 2) ────────────────────────────────────────

export function getStoredRealResume(): RealParsedResume | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.REAL_RESUME);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.skills) {
      return parsed as RealParsedResume;
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredRealResume(resume: RealParsedResume | null): void {
  if (!isBrowser()) return;
  try {
    if (!resume) {
      window.localStorage.removeItem(STORAGE_KEYS.REAL_RESUME);
    } else {
      window.localStorage.setItem(STORAGE_KEYS.REAL_RESUME, JSON.stringify(resume));
    }
    dispatchCopilotUpdate("real_resume");
  } catch (err) {
    console.warn("[storage-sync] Failed to save real resume:", err);
  }
}

export function clearAllCopilotState(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.REAL_RESUME);
    window.localStorage.removeItem(STORAGE_KEYS.APPLICATIONS);
    window.localStorage.removeItem(STORAGE_KEYS.READINESS);
    window.localStorage.removeItem(STORAGE_KEYS.RESUME_WORKSPACE);
    window.localStorage.removeItem(STORAGE_KEYS.INTERVIEWS);
    window.sessionStorage.removeItem("copilot_target_jd_handoff");
    dispatchCopilotUpdate("reset");
  } catch (err) {
    console.warn("[storage-sync] Failed to clear copilot state:", err);
  }
}

// ─── Applications (Kanban) Storage ───────────────────────────────────────────

export const BOOTSTRAP_KANBAN_APPLICATIONS: KanbanCard[] = [
  {
    id: "app-razorpay-01",
    company: "Razorpay",
    logo: "RZ",
    title: "Backend SDE (Payments Core)",
    status: "Applied",
    matchScore: 91,
    priority: "high",
    salary: "₹24–32 LPA",
    nextStep: "Technical OA (PostgreSQL & Concurrency)",
    skills: ["PostgreSQL", "Go / Node.js", "Redis", "Distributed Transactions"],
    source: "demo",
    jobSource: "Campus Placement / Direct Scout",
    notes: "Core payments gateway processing high-concurrency transactions. ⚠️ 1 Bluff Risk Overlap (PostgreSQL).",
    appliedDate: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
  },
  {
    id: "app-vercel-02",
    company: "Vercel",
    logo: "VC",
    title: "Full-Stack Product Engineer (Next.js/TS)",
    status: "Wishlist",
    matchScore: 94,
    priority: "high",
    salary: "$130k–$160k",
    nextStep: "Portfolio & App Architecture Review",
    skills: ["Next.js", "TypeScript", "React Server Components", "Tailwind CSS"],
    source: "demo",
    jobSource: "Vercel Talent Network",
    notes: "Flagship frontend engineering role. ✅ High Bar-Raiser Fit with candidate project portfolio.",
    appliedDate: new Date(Date.now() - 4 * 86400000).toISOString().split("T")[0],
  },
  {
    id: "app-atlassian-03",
    company: "Atlassian",
    logo: "AT",
    title: "Software Engineer (Distributed Systems)",
    status: "Wishlist",
    matchScore: 86,
    priority: "medium",
    salary: "₹28–36 LPA",
    nextStep: "System Design Screening",
    skills: ["Java / TypeScript", "Kafka", "Distributed Systems", "AWS"],
    source: "demo",
    jobSource: "In-House Referral Scout",
    notes: "Distributed systems team. ⚡ OA Prep Ready for microservices scale.",
    appliedDate: new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0],
  },
  {
    id: "app-stripe-04",
    company: "Stripe",
    logo: "ST",
    title: "API Infrastructure Intern/SDE-1",
    status: "Applied",
    matchScore: 88,
    priority: "high",
    salary: "$55/hr or ₹30 LPA",
    nextStep: "Phone Screen & API Design",
    skills: ["API Design", "Idempotency", "Redis", "Data Pipelines"],
    source: "demo",
    jobSource: "University Talent Scout",
    notes: "Global payments infrastructure API team. ⚠️ Needs Redis Verification.",
    appliedDate: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
  },
];

export function getStoredApplications(): KanbanCard[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
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

export const BOOTSTRAP_READINESS_MILESTONES: ReadinessMilestone[] = [
  {
    id: "rm-boot-1",
    title: "Baseline Resume & Skill Graph Ingestion",
    category: "resume",
    priority: "low",
    completed: true,
    description: "[🤖 Agent Verified] Initial career baseline ingested from resume graph.",
    dueDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  },
  {
    id: "rm-boot-2",
    title: "Clear Bluff Risk: Master PostgreSQL B-Tree Indexing & MVCC Isolation",
    category: "skills",
    priority: "high",
    completed: false,
    description: "[🤖 Agent Injected] Reason: Flagged as Resume Bluff Risk in Digital Twin · Estimated: 4h",
    dueDate: new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  },
  {
    id: "rm-boot-3",
    title: "Clear Bluff Risk: Distributed Caching & Redis Eviction Under Load",
    category: "skills",
    priority: "high",
    completed: false,
    description: "[🤖 Agent Injected] Reason: Flagged as Resume Bluff Risk in Digital Twin · Estimated: 5h",
    dueDate: new Date(Date.now() + 5 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  },
  {
    id: "rm-boot-4",
    title: "Verify System Design & Rate Limiter Architecture via Mock Probe",
    category: "interview",
    priority: "medium",
    completed: false,
    description: "[🤖 Agent Injected] Reason: Claimed on resume but currently Unverified · Estimated: 3h",
    dueDate: new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  },
];

export function getStoredReadinessMilestones(): ReadinessMilestone[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.READINESS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
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

