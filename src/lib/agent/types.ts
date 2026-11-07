/**
 * Placement Co-pilot: Autonomous AI Agent Core Shared Contracts (Track 1)
 *
 * Defines team-wide shared TypeScript contracts, schemas, and types
 * used across Track 1 (Pratham), Track 2 (Manan), and Track 3 (Sanchit).
 */

// ─── Trigger & State Types ───────────────────────────────────────────────────
export type AgentTriggerType =
  | "KANBAN_MOVED_TO_INTERVIEW"
  | "MOCK_INTERVIEW_COMPLETED"
  | "USER_GOAL_SUBMITTED"
  | "PORTFOLIO_OPTIMIZATION_REQUESTED"
  | "RESUME_UPLOADED_BOOTSTRAP";

export type ConfidenceTier = "UNVERIFIED" | "LOW" | "MEDIUM" | "HIGH";
export type ClaimedLevel = "LOW" | "MEDIUM" | "HIGH";

export type AgentRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "AWAITING_APPROVAL"
  | "COMPLETED"
  | "COMPLETED_WITH_FALLBACK"
  | "FAILED";

export type AgentApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AgentApprovalActionType = "RESUME_DIFF" | "APPLICATION_UPDATE";

// ─── Evidence & Skill Matrix Contracts ───────────────────────────────────────
export interface EvidenceLogEntry {
  timestamp: string;
  source: string; // e.g. "Mock Interview: SDE Technical Round", "Resume Screener"
  verdict: string; // e.g. "Demonstrated strong STAR articulation with 88% overall score"
  citation?: string; // verbatim quote, question ID, or assessment metric
  score?: number; // 0-100 score
}

export interface SkillEvidenceItem {
  id?: string;
  user_id?: string;
  skill_name: string;
  claimed_level: ClaimedLevel;
  verified_confidence: ConfidenceTier;
  bluff_risk: boolean;
  evidence_log: EvidenceLogEntry[];
  updated_at?: string;
}

// ─── Career Digital Twin Snapshot ───────────────────────────────────────────
export interface StudentDigitalTwinSnapshot {
  userId: string;
  profileSummary: {
    fullName?: string;
    targetRole?: string;
    readinessScore?: number;
    graduationYear?: number;
    college?: string;
    branch?: string;
  };
  skills: SkillEvidenceItem[];
  bluffRiskSkills: string[];
  activeApplications: Array<{
    id: string;
    company: string;
    title: string;
    status: string;
    matchScore: number;
    nextStep?: string;
    priority?: string;
  }>;
  recentInterviewWeaknesses: Array<{
    topic: string;
    domain?: string;
    score?: number;
    sessionDate?: string;
  }>;
  pendingReadinessTasksCount: number;
  currentResumeSummary?: {
    primaryResumeId?: string;
    fileName?: string;
    atsScore?: number;
    parsedHighlights?: string[];
  };
}

// ─── Execution Traces & Agent Run Payload ────────────────────────────────────
export interface AgentTraceStep {
  step_number: number;
  timestamp: string;
  tool_name: string;
  input_summary: string;
  output_summary: string;
  status: "SUCCESS" | "FALLBACK" | "ERROR" | "SKIPPED";
  latency_ms: number;
  data?: any;
}

export interface AgentRunPayload {
  userId: string;
  triggerType: AgentTriggerType;
  entityId?: string;
  goalPrompt?: string;
  metadata?: Record<string, any>;
}

export interface ToolExecutionResult<T = any> {
  success: boolean;
  summary: string;
  data: T;
  error?: string;
}

export type AgentToolHandler<TArgs = any, TResult = any> = (
  userId: string,
  args: TArgs,
  supabase?: any
) => Promise<ToolExecutionResult<TResult>>;

// ─── Domain Diagnostic & Optimization Models ────────────────────────────────
export type SkillGapClassification =
  | "VERIFIED_MATCH"
  | "BLUFF_RISK_WARNING"
  | "UNVERIFIED_CLAIM"
  | "MISSING_SKILL";

export interface JobGapReport {
  company: string;
  role: string;
  matchScore: number;
  gapClassifications: Array<{
    skill: string;
    classification: SkillGapClassification;
    claimedLevel?: ClaimedLevel;
    verifiedConfidence?: ConfidenceTier;
    reason: string;
  }>;
  verifiedSkills: string[];
  bluffRiskWarnings: string[];
  unverifiedClaims: string[];
  missingSkills: string[];
  recommendedFocus: string[];
}

export interface OverlappingSkillRecommendation {
  skill: string;
  weightScore: number;
  companyCount: number;
  targetCompanies: string[];
  urgencyLevel: "CRITICAL" | "HIGH" | "MEDIUM";
  weaknessReason: string;
  rationale: string;
}

export interface MultiCompanyOverlapResult {
  evaluatedApplicationsCount: number;
  topOverlappingSkills: OverlappingSkillRecommendation[];
  recommendedSprintFocus: string[];
  coverageExplanation: string;
}

// ─── Database Entity Models (for agent_runs and agent_approvals) ─────────────
export interface AgentRunRecord {
  id: string;
  user_id: string;
  idempotency_key: string;
  trigger_type: AgentTriggerType;
  entity_id: string;
  goal: string;
  status: AgentRunStatus;
  reasoning_trace: AgentTraceStep[];
  final_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentApprovalRecord {
  id: string;
  run_id?: string;
  user_id: string;
  action_type: AgentApprovalActionType;
  target_entity_id: string;
  payload_diff: Record<string, any>;
  status: AgentApprovalStatus;
  created_at: string;
  resolved_at?: string;
}

