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

export type SectionScores = {
  impact: number;
  brevity: number;
  style: number;
  skills: number;
};

export type TailorSuggestion = {
  id: string;
  section: "summary" | "experience" | "skills" | "education" | "projects" | "custom";
  targetSection?: "summary" | "experience" | "skills" | "education" | "projects" | "custom";
  targetEntryId?: string;
  targetBulletId?: string;
  sectionLabel?: string;
  original: string;
  suggested: string;
  improved?: string;
  impact: "high" | "medium" | "low";
  reason?: string;
  impactLevel?: "high" | "medium" | "low";
};

export interface ResumeBullet {
  id: string;
  text: string;
}

export interface ResumeEntry {
  id: string;
  title: string;
  subtitle: string;
  dateRange: string;
  location?: string;
  scoreOrMeta?: string;
  bullets: ResumeBullet[];
}

export interface ResumeCustomSection {
  id: string;
  heading: string;
  items: ResumeBullet[];
}

export interface ParsedResumeDocument {
  fileName: string;
  candidateName: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
  summary: string;
  skillCategories: Array<{ category: string; skills: string[] }>;
  skills: string[];
  experience: ResumeEntry[];
  projects: ResumeEntry[];
  education: ResumeEntry[];
  customSections: ResumeCustomSection[];
  rawText: string;
}

export type ResumeAnalysis = {
  matchScore: number;
  atsScore: number;
  jobTitle: string;
  company: string;
  strengths: string[];
  gaps: string[];
  suggestions: TailorSuggestion[];
  keywords: { word: string; present: boolean; importance?: "high" | "medium" }[];
  sectionScores?: SectionScores;
  extractedSkills?: string[];
  meta?: {
    pageCount?: number;
    wordCount?: number;
    bulletCount?: number;
    hasQuantifiedMetrics?: boolean;
    fileName?: string;
    contact?: {
      email?: string | null;
      phone?: string | null;
      links?: string[];
    };
  };
  rawText?: string;
  parsedResume?: ParsedResumeDocument;
};

// ─── Jobs ────────────────────────────────────────────────────────────────────

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "Full-time" | "Internship" | "Contract" | "Part-time" | "Unspecified";
  salary: string;
  matchScore: number;
  posted: string;
  tags: string[];
  logo: string;
  saved: boolean;
  applied: boolean;
  description: string;
  source?: JobProviderSource;
  externalId?: string;
  isDemo?: boolean;
  workArrangement?: WorkArrangement;
  employmentType?: string | null;
  experienceLevel?: JobExperienceLevel;
  skills?: string[];
  salaryRange?: string | null;
  salaryCurrency?: string | null;
  postedAt?: string | null;
  postedDateLabel?: string;
  closingDate?: string | null;
  deadlineProvenance?: DeadlineProvenance;
  applyUrl?: string | null;
  sourceUrl?: string | null;
  attributionLabel?: string;
  retrievedAt?: string;
};

export type JobProviderSource = "jobvetta" | "greenhouse" | "remotive" | "jsearch" | "himalayas" | "demo";
export type WorkArrangement = "remote" | "hybrid" | "onsite" | "unspecified";
export type DeadlineProvenance = "verified_source" | "user_entered" | "unknown";
export type JobExperienceLevel = "internship" | "fresher" | "entry" | "mid" | "senior" | "unspecified";

/** Provider-backed job with explicit source and field provenance, plus legacy UI fields. */
export interface NormalizedJobListing extends Job {
  source: JobProviderSource;
  externalId: string;
  isDemo: boolean;
  companyLogo?: string | null;
  workArrangement: WorkArrangement;
  employmentType: string | null;
  experienceLevel: JobExperienceLevel;
  skills: string[];
  salaryRange: string | null;
  salaryMinLpa?: number | null;
  salaryMaxLpa?: number | null;
  salaryCurrency?: string | null;
  postedAt: string | null;
  postedDateLabel: string;
  closingDate: string | null;
  deadlineProvenance: DeadlineProvenance;
  applyUrl: string | null;
  sourceUrl: string | null;
  attributionLabel: string;
  retrievedAt: string;
}

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
  salary?: string;
  url?: string;
  location?: string;
  source?: JobProviderSource;
  sourceUrl?: string;
  closingDate?: string;
  deadlineProvenance?: DeadlineProvenance;
};

// ─── Interview ───────────────────────────────────────────────────────────────

export type InterviewCategory =
  | "behavioral"
  | "technical"
  | "situational"
  | "culture"
  | "resume-grill";

export type InterviewQuestion = {
  id: string;
  category: InterviewCategory;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  hint: string;
  sampleAnswer: string;
  followUps: string[];
};

export interface StarComponent {
  score: number;
  feedback: string;
  present: boolean;
}

export interface StarBreakdown {
  situation: StarComponent;
  task: StarComponent;
  action: StarComponent;
  result: StarComponent;
}

export interface DeliveryCritique {
  pacingVerdict: "Too Slow (<100 WPM)" | "Optimal (115-155 WPM)" | "Rushed (>160 WPM)";
  pacingAdvice: string;
  fillerAdvice: string;
  bodyLanguageAdvice: string;
}

export interface InterviewEvaluationResponse {
  overallScore: number;
  contentScore: number;
  deliveryScore: number;
  starBreakdown: StarBreakdown;
  deliveryCritique: DeliveryCritique;
  strengths: string[];
  improvements: string[];
  rewrittenIdealAnswer: string;
  followUpQuestion: {
    prompt: string;
    intent: string;
  };
  evaluationSource: "ai" | "heuristic";
}

export interface InterviewTelemetry {
  avgWpm: number;
  wpmTimeSeries: number[];
  fillerWords: Record<string, number>;
  totalFillerCount: number;
  hesitationGapsCount: number;
  eyeContactPct: number;
  postureStabilityPct: number;
}

export interface InterviewEvaluationRequest {
  questionId: string;
  questionText: string;
  category: InterviewCategory;
  role: string;
  userTranscript: string;
  durationSeconds: number;
  telemetry: InterviewTelemetry;
  resumeContext?: string;
}

export interface InterviewTurn {
  id?: string;
  sessionId?: string;
  questionId?: string;
  questionText: string;
  category?: string;
  userAnswer?: string;
  aiFeedback?: string;
  score?: number;
  contentScore?: number;
  deliveryScore?: number;
  avgWpm?: number;
  fillerWordCount?: number;
  eyeContactScore?: number;
  starBreakdown?: StarBreakdown;
  rewrittenAnswer?: string;
  followUpQuestion?: string;
  turnOrder: number;
  createdAt?: string;
}

export type InterviewSession = {
  id: string;
  date: string;
  role: string;
  score: number;
  questionsAnswered: number;
  duration: string;
  feedback: string;
  avgWpm?: number;
  fillerWordCount?: number;
  eyeContactScore?: number;
  deliveryScore?: number;
  contentScore?: number;
  starBreakdown?: StarBreakdown;
  rewrittenAnswer?: string;
  followUpQuestion?: string;
  turns?: InterviewTurn[];
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
