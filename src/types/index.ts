// ─── Shared TypeScript types for Placement Co-pilot ─────────────────────────

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: number;
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export type StatCard = {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon: string;
  color: "indigo" | "emerald" | "amber" | "rose" | "violet";
};

export type Activity = {
  id: string;
  type: "application" | "resume" | "interview" | "job" | "readiness";
  message: string;
  timestamp: string;
  avatar?: string;
};

// ─── Resume ──────────────────────────────────────────────────────────────────

export type ResumeAnalysis = {
  matchScore: number;
  atsScore: number;
  jobTitle: string;
  company: string;
  strengths: string[];
  gaps: string[];
  suggestions: TailorSuggestion[];
  keywords: { word: string; present: boolean }[];
};

export type TailorSuggestion = {
  id: string;
  section: "summary" | "experience" | "skills" | "education";
  original: string;
  suggested: string;
  impact: "high" | "medium" | "low";
};

// ─── Jobs ────────────────────────────────────────────────────────────────────

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "Full-time" | "Internship" | "Contract" | "Part-time";
  salary: string;
  matchScore: number;
  posted: string;
  tags: string[];
  logo: string;
  saved: boolean;
  applied: boolean;
  description: string;
};

// ─── Kanban / Tracker ────────────────────────────────────────────────────────

export type KanbanStatus =
  | "Wishlist"
  | "Applied"
  | "Phone Screen"
  | "Interview"
  | "Offer"
  | "Rejected";

export type KanbanCard = {
  id: string;
  title: string;
  company: string;
  logo: string;
  status: KanbanStatus;
  appliedDate?: string;
  nextStep?: string;
  nextStepDate?: string;
  matchScore: number;
  priority: "high" | "medium" | "low";
  notes?: string;
};

// ─── Interview ───────────────────────────────────────────────────────────────

export type InterviewQuestion = {
  id: string;
  category: "behavioral" | "technical" | "situational" | "culture";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  hint: string;
  sampleAnswer: string;
  followUps: string[];
};

export type InterviewSession = {
  id: string;
  date: string;
  role: string;
  score: number;
  questionsAnswered: number;
  duration: string;
  feedback: string;
};

// ─── Readiness ───────────────────────────────────────────────────────────────

export type ReadinessMilestone = {
  id: string;
  category: "resume" | "skills" | "network" | "interview" | "applications";
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  priority: "high" | "medium" | "low";
};

export type ReadinessDomain = {
  label: string;
  score: number;
  color: string;
  icon: string;
};
