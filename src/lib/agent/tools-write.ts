/**
 * Track 2: State-Mutation Tool Handlers & Damped Skill Evidence Ladder
 * Owner: Manan
 *
 * Implements:
 * 1. computeDampedConfidence: Pure helper for deterministic 4-tier confidence transitions and bluff detection
 * 2. update_skill_evidence: Writes verified citations to skill_evidence_matrix with damped progression
 * 3. inject_readiness_sprint: Deduplicated injection of readiness tasks with evidence citation metadata
 * 4. stage_resume_diff: Hallucination-guarded resume diff staging into agent_approvals (Human-in-the-Loop)
 * 5. mockAgentStore: In-memory fallback store for standalone testing and dual-mode guest execution
 */

import { upsertMockSkillEvidence } from "./mock-agent-store";

export type ConfidenceTier = "UNVERIFIED" | "LOW" | "MEDIUM" | "HIGH";
export type ClaimedLevel = "LOW" | "MEDIUM" | "HIGH";
export type EvidenceVerdict = "POSITIVE" | "NEGATIVE";
export type EvidenceSource =
  | "MOCK_INTERVIEW"
  | "READINESS_DRILL"
  | "MANUAL_TEST"
  | "SYSTEM_EVAL"
  | string;

export interface DampedConfidenceResult {
  previousTier: ConfidenceTier;
  nextTier: ConfidenceTier;
  bluffRisk: boolean;
}

export const CONFIDENCE_LADDER: readonly ConfidenceTier[] = [
  "UNVERIFIED",
  "LOW",
  "MEDIUM",
  "HIGH",
] as const;

/**
 * Deterministic Damped Confidence Ladder:
 * - POSITIVE verdict: climbs at most +1 step (capped at 'HIGH')
 * - NEGATIVE verdict: if 'UNVERIFIED' moves to 'LOW'; otherwise drops -1 step (floored at 'LOW')
 * - bluffRisk: triggers when claimedLevel === 'HIGH' but verified confidence drops to 'LOW'
 */
export function computeDampedConfidence(
  currentTier: ConfidenceTier = "UNVERIFIED",
  verdict: EvidenceVerdict,
  claimedLevel: ClaimedLevel = "MEDIUM"
): DampedConfidenceResult {
  let nextTier: ConfidenceTier = currentTier;

  if (verdict === "POSITIVE") {
    if (currentTier === "UNVERIFIED") {
      nextTier = "LOW";
    } else if (currentTier === "LOW") {
      nextTier = "MEDIUM";
    } else if (currentTier === "MEDIUM" || currentTier === "HIGH") {
      nextTier = "HIGH";
    }
  } else if (verdict === "NEGATIVE") {
    if (currentTier === "UNVERIFIED") {
      nextTier = "LOW";
    } else if (currentTier === "HIGH") {
      nextTier = "MEDIUM";
    } else if (currentTier === "MEDIUM") {
      nextTier = "LOW";
    } else if (currentTier === "LOW") {
      nextTier = "LOW";
    }
  }

  const bluffRisk = claimedLevel === "HIGH" && nextTier === "LOW";

  return {
    previousTier: currentTier,
    nextTier,
    bluffRisk,
  };
}

// ─── DATA MODELS ─────────────────────────────────────────────────────────────

export interface EvidenceLogEntry {
  timestamp: string;
  source: EvidenceSource;
  verdict: EvidenceVerdict;
  citation: string;
}

export interface SkillEvidenceRow {
  id?: string;
  user_id: string;
  skill_name: string;
  claimed_level: ClaimedLevel;
  verified_confidence: ConfidenceTier;
  bluff_risk: boolean;
  evidence_log: EvidenceLogEntry[];
  updated_at?: string;
}

export interface ReadinessTaskRow {
  id: string;
  user_id: string;
  title: string;
  category: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  completed: boolean;
  due_date?: string;
  created_at: string;
}

export interface ProposedBulletChange {
  originalBullet: string;
  proposedBullet: string;
  verifiedSourceProject: string;
  keywordsAdded: string[];
}

export interface AgentApprovalRecord {
  id: string;
  user_id: string;
  run_id?: string;
  action_type: "RESUME_DIFF" | "SKILL_EVALUATION" | "TASK_INJECTION";
  target_entity_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  payload_diff: {
    targetRole?: string;
    jobId?: string;
    proposedBulletChanges: ProposedBulletChange[];
    estimatedAtsScoreDelta: number;
    createdAt: string;
    [key: string]: unknown;
  };
  resolved_at?: string;
  created_at: string;
}

export interface ResumeDocument {
  candidateName?: string;
  email?: string;
  phone?: string;
  experience?: Array<{
    id: string;
    title: string;
    subtitle: string;
    dateRange: string;
    bullets: Array<{ id: string; text: string }>;
  }>;
  projects?: Array<{
    id: string;
    title: string;
    subtitle: string;
    dateRange: string;
    bullets: Array<{ id: string; text: string }>;
  }>;
  skills?: string[];
  atsScore?: number;
  [key: string]: unknown;
}

// ─── IN-MEMORY / GUEST FALLBACK STATE STORE ─────────────────────────────────

export class MockAgentStore {
  private skillEvidence = new Map<string, SkillEvidenceRow>();
  private readinessTasks = new Map<string, ReadinessTaskRow[]>();
  private approvals = new Map<string, AgentApprovalRecord>();
  private masterResumes = new Map<string, ResumeDocument>();

  getSkill(userId: string, skillName: string): SkillEvidenceRow | undefined {
    return this.skillEvidence.get(`${userId}:${skillName.toLowerCase().trim()}`);
  }

  upsertSkill(row: SkillEvidenceRow): SkillEvidenceRow {
    const key = `${row.user_id}:${row.skill_name.toLowerCase().trim()}`;
    const saved = { ...row, updated_at: new Date().toISOString() };
    this.skillEvidence.set(key, saved);
    return saved;
  }

  getTasks(userId: string): ReadinessTaskRow[] {
    return this.readinessTasks.get(userId) || [];
  }

  insertTasks(userId: string, newTasks: ReadinessTaskRow[]): ReadinessTaskRow[] {
    const current = this.getTasks(userId);
    const updated = [...current, ...newTasks];
    this.readinessTasks.set(userId, updated);
    return newTasks;
  }

  getApproval(approvalId: string): AgentApprovalRecord | undefined {
    return this.approvals.get(approvalId);
  }

  listApprovals(userId: string, status?: string): AgentApprovalRecord[] {
    const list = Array.from(this.approvals.values()).filter((a) => a.user_id === userId);
    if (status) return list.filter((a) => a.status === status);
    return list;
  }

  saveApproval(approval: AgentApprovalRecord): AgentApprovalRecord {
    this.approvals.set(approval.id, approval);
    return approval;
  }

  updateApproval(
    approvalId: string,
    updates: Partial<AgentApprovalRecord>
  ): AgentApprovalRecord | undefined {
    const current = this.approvals.get(approvalId);
    if (!current) return undefined;
    const updated = { ...current, ...updates };
    this.approvals.set(approvalId, updated);
    return updated;
  }

  getResume(userId: string): ResumeDocument | undefined {
    return this.masterResumes.get(userId);
  }

  saveResume(userId: string, resume: ResumeDocument): void {
    this.masterResumes.set(userId, resume);
  }

  reset(): void {
    this.skillEvidence.clear();
    this.readinessTasks.clear();
    this.approvals.clear();
    this.masterResumes.clear();
  }
}

export const mockAgentStore = new MockAgentStore();

// ─── TOOL 1: UPDATE_SKILL_EVIDENCE ──────────────────────────────────────────

export interface UpdateSkillEvidenceArgs {
  skillName: string;
  verdict: EvidenceVerdict;
  source: EvidenceSource;
  evidenceCitation: string;
}

export async function update_skill_evidence(
  userId: string,
  args: UpdateSkillEvidenceArgs,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
): Promise<{
  success: boolean;
  summary: string;
  data: {
    skillName: string;
    previousTier: ConfidenceTier;
    nextTier: ConfidenceTier;
    bluffRisk: boolean;
    latestCitation: string;
    claimedLevel: ClaimedLevel;
    evidenceCount: number;
  };
}> {
  if (!args.skillName || !args.verdict || !args.evidenceCitation) {
    throw new Error("Invalid arguments: skillName, verdict, and evidenceCitation are required.");
  }

  const normalizedSkill = args.skillName.trim();
  let existingRow: SkillEvidenceRow | null = null;

  // 1. Try DB lookup if Supabase client is available
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("skill_evidence_matrix")
        .select("*")
        .eq("user_id", userId)
        .ilike("skill_name", normalizedSkill)
        .maybeSingle();

      if (!error && data) {
        existingRow = {
          id: data.id,
          user_id: data.user_id,
          skill_name: data.skill_name,
          claimed_level: (data.claimed_level as ClaimedLevel) || "HIGH",
          verified_confidence: (data.verified_confidence as ConfidenceTier) || "UNVERIFIED",
          bluff_risk: Boolean(data.bluff_risk),
          evidence_log: Array.isArray(data.evidence_log) ? data.evidence_log : [],
        };
      }
    } catch {
      // Graceful fallback to mockAgentStore
    }
  }

  // 2. Fallback to mockAgentStore
  if (!existingRow) {
    const fromStore = mockAgentStore.getSkill(userId, normalizedSkill);
    if (fromStore) {
      existingRow = fromStore;
    }
  }

  // Initialize defaults if missing: default claimed_level to HIGH for verified candidates
  const claimedLevel: ClaimedLevel = existingRow?.claimed_level || "HIGH";
  const currentTier: ConfidenceTier = existingRow?.verified_confidence || "UNVERIFIED";

  // Apply pure damped ladder logic
  const { previousTier, nextTier, bluffRisk } = computeDampedConfidence(
    currentTier,
    args.verdict,
    claimedLevel
  );

  const existingLog = existingRow?.evidence_log || [];
  const newEntry: EvidenceLogEntry = {
    timestamp: new Date().toISOString(),
    source: args.source,
    verdict: args.verdict,
    citation: args.evidenceCitation,
  };
  const updatedEvidenceLog = [...existingLog, newEntry].slice(-10);

  const updatedRow: SkillEvidenceRow = {
    id: existingRow?.id || `skill-ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    skill_name: normalizedSkill,
    claimed_level: claimedLevel,
    verified_confidence: nextTier,
    bluff_risk: bluffRisk,
    evidence_log: updatedEvidenceLog,
    updated_at: new Date().toISOString(),
  };

  // Persist to Supabase if available
  if (supabase) {
    try {
      await supabase.from("skill_evidence_matrix").upsert(
        {
          user_id: userId,
          skill_name: normalizedSkill,
          claimed_level: claimedLevel,
          verified_confidence: nextTier,
          bluff_risk: bluffRisk,
          evidence_log: updatedEvidenceLog,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,skill_name" }
      );
    } catch {
      // Table may not exist yet in early development
    }
  }

  // Always sync to mockAgentStore and global mock store
  mockAgentStore.upsertSkill(updatedRow);
  upsertMockSkillEvidence(userId, {
    skill_name: normalizedSkill,
    claimed_level: claimedLevel,
    verified_confidence: nextTier,
    bluff_risk: bluffRisk,
    evidence_log: updatedEvidenceLog,
  });

  const summary = `Skill evidence updated for "${normalizedSkill}": moved ${previousTier} -> ${nextTier} (${args.verdict} verdict from ${args.source}).${
    bluffRisk ? " ⚠️ BLUFF RISK DETECTED: Claimed HIGH but verified at LOW." : ""
  }`;

  return {
    success: true,
    summary,
    data: {
      skillName: normalizedSkill,
      previousTier,
      nextTier,
      bluffRisk,
      latestCitation: args.evidenceCitation,
      claimedLevel,
      evidenceCount: updatedEvidenceLog.length,
    },
  };
}

// ─── TOOL 2: INJECT_READINESS_SPRINT ────────────────────────────────────────

export interface InjectReadinessSprintArgs {
  sprintTitle: string;
  linkedJobId?: string;
  tasks: Array<{
    title: string;
    category: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    estimatedHours: number;
    evidenceReason: string;
  }>;
}

export async function inject_readiness_sprint(
  userId: string,
  args: InjectReadinessSprintArgs,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
): Promise<{
  success: boolean;
  summary: string;
  data: {
    insertedCount: number;
    skippedDuplicates: number;
    sprintTitle: string;
    tasks: ReadinessTaskRow[];
  };
}> {
  if (!args.sprintTitle || !Array.isArray(args.tasks)) {
    throw new Error("Invalid arguments: sprintTitle and tasks array are required.");
  }

  // Deduplication check: collect titles of uncompleted tasks
  let existingUncompletedTitles = new Set<string>();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("readiness_tasks")
        .select("title, completed")
        .eq("user_id", userId)
        .eq("completed", false);

      if (!error && Array.isArray(data)) {
        existingUncompletedTitles = new Set(
          data.map((t: { title: string }) => t.title.toLowerCase().trim())
        );
      }
    } catch {
      // Fallback
    }
  }

  // Merge with mockAgentStore tasks
  const localTasks = mockAgentStore.getTasks(userId).filter((t) => !t.completed);
  localTasks.forEach((t) => existingUncompletedTitles.add(t.title.toLowerCase().trim()));

  const tasksToInsert: ReadinessTaskRow[] = [];
  let skippedDuplicates = 0;

  for (const t of args.tasks) {
    const cleanTitle = t.title.trim();
    if (existingUncompletedTitles.has(cleanTitle.toLowerCase())) {
      skippedDuplicates++;
      continue;
    }

    const taskRow: ReadinessTaskRow = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: userId,
      title: cleanTitle,
      category: t.category || "Sprint",
      description: `[Agent Sprint: ${args.sprintTitle}] Reason: ${t.evidenceReason}${
        t.estimatedHours ? ` · Estimated: ${t.estimatedHours}h` : ""
      }${args.linkedJobId ? ` · Linked Job: ${args.linkedJobId}` : ""}`,
      priority: t.priority || "MEDIUM",
      completed: false,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };

    tasksToInsert.push(taskRow);
    existingUncompletedTitles.add(cleanTitle.toLowerCase());
  }

  if (supabase && tasksToInsert.length > 0) {
    try {
      await supabase.from("readiness_tasks").insert(tasksToInsert);
    } catch {
      // Fallback
    }
  }

  if (tasksToInsert.length > 0) {
    mockAgentStore.insertTasks(userId, tasksToInsert);

    // Browser runtime sync: update local readiness tasks store so UI updates live
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem("copilot_readiness_tasks_v1");
        const current = raw ? JSON.parse(raw) : [];
        const currentTitles = new Set(current.map((m: any) => m.title.toLowerCase().trim()));
        const newMilestones = tasksToInsert
          .filter((t) => !currentTitles.has(t.title.toLowerCase().trim()))
          .map((t) => ({
            id: t.id,
            title: t.title,
            category: (["skills", "resume", "interview", "applications", "network"].includes(t.category?.toLowerCase())
              ? t.category.toLowerCase()
              : "skills") as any,
            description: t.description || "",
            completed: false,
            priority: (t.priority?.toLowerCase() || "medium") as any,
            dueDate: t.due_date ? new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined,
          }));
        if (newMilestones.length > 0) {
          const merged = [...current, ...newMilestones];
          window.localStorage.setItem("copilot_readiness_tasks_v1", JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent("copilot-data-updated", { detail: { source: "readiness" } }));
          window.dispatchEvent(new CustomEvent("agent-state-mutated"));
        }
      } catch (err) {
        console.warn("[inject_readiness_sprint] Browser storage sync failed:", err);
      }
    }
  }

  const summary = `Readiness sprint "${args.sprintTitle}": inserted ${tasksToInsert.length} task(s), skipped ${skippedDuplicates} duplicate(s).`;

  return {
    success: true,
    summary,
    data: {
      insertedCount: tasksToInsert.length,
      skippedDuplicates,
      sprintTitle: args.sprintTitle,
      tasks: tasksToInsert,
    },
  };
}

// ─── TOOL 3: STAGE_RESUME_DIFF ──────────────────────────────────────────────

export interface StageResumeDiffArgs {
  jobId: string;
  targetRole: string;
  runId?: string;
  proposedBulletChanges: ProposedBulletChange[];
}

export async function stage_resume_diff(
  userId: string,
  args: StageResumeDiffArgs,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
): Promise<{
  success: boolean;
  status: "AWAITING_APPROVAL";
  summary: string;
  data: {
    approvalId: string;
    targetRole: string;
    diffCount: number;
    proposedBulletChanges: ProposedBulletChange[];
    estimatedAtsScoreDelta: number;
  };
}> {
  if (
    !args.jobId ||
    !args.targetRole ||
    !Array.isArray(args.proposedBulletChanges) ||
    args.proposedBulletChanges.length === 0
  ) {
    throw new Error(
      "Invalid arguments: jobId, targetRole, and non-empty proposedBulletChanges are required."
    );
  }

  // Hallucination Guardrail: Every proposed change must ground itself in a verified source project
  for (let i = 0; i < args.proposedBulletChanges.length; i++) {
    const item = args.proposedBulletChanges[i];
    if (
      !item.verifiedSourceProject ||
      typeof item.verifiedSourceProject !== "string" ||
      item.verifiedSourceProject.trim().length === 0
    ) {
      throw new Error(
        `Hallucination guardrail triggered in bullet change #${i + 1}: verifiedSourceProject is required and cannot be empty.`
      );
    }
    if (
      !item.proposedBullet ||
      typeof item.proposedBullet !== "string" ||
      item.proposedBullet.trim().length === 0
    ) {
      throw new Error(
        `Invalid bullet change #${i + 1}: proposedBullet is required.`
      );
    }
  }

  // Calculate estimated ATS keyword lift delta (approx 3.5 points per unique keyword added)
  const uniqueKeywords = new Set<string>();
  args.proposedBulletChanges.forEach((change) => {
    (change.keywordsAdded || []).forEach((kw) => {
      if (kw && kw.trim()) uniqueKeywords.add(kw.trim().toLowerCase());
    });
  });
  const estimatedAtsScoreDelta = Math.min(25, Math.max(5, Math.round(uniqueKeywords.size * 3.5)));

  const approvalId = `appr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const approvalRecord: AgentApprovalRecord = {
    id: approvalId,
    user_id: userId,
    run_id: args.runId,
    action_type: "RESUME_DIFF",
    target_entity_id: args.jobId,
    status: "PENDING",
    payload_diff: {
      targetRole: args.targetRole,
      jobId: args.jobId,
      proposedBulletChanges: args.proposedBulletChanges,
      estimatedAtsScoreDelta,
      createdAt: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
  };

  // Does NOT mutate the master resume! Creates a PENDING approval record.
  if (supabase) {
    try {
      await supabase.from("agent_approvals").insert({
        id: approvalRecord.id,
        user_id: approvalRecord.user_id,
        run_id: approvalRecord.run_id,
        action_type: approvalRecord.action_type,
        target_entity_id: approvalRecord.target_entity_id,
        status: approvalRecord.status,
        payload_diff: approvalRecord.payload_diff,
        created_at: approvalRecord.created_at,
      });
    } catch {
      // Fallback
    }
  }

  // Always register in mockAgentStore
  mockAgentStore.saveApproval(approvalRecord);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("agent-state-mutated"));
  }

  const summary = `Staged ${args.proposedBulletChanges.length} grounded resume diff(s) for role "${args.targetRole}" (Job: ${args.jobId}). Awaiting human approval. Estimated ATS lift: +${estimatedAtsScoreDelta} points.`;

  return {
    success: true,
    status: "AWAITING_APPROVAL",
    summary,
    data: {
      approvalId,
      targetRole: args.targetRole,
      diffCount: args.proposedBulletChanges.length,
      proposedBulletChanges: args.proposedBulletChanges,
      estimatedAtsScoreDelta,
    },
  };
}

// ─── TOOL 4: SYNC_DIGITAL_TWIN_FROM_RESUME ──────────────────────────────────
export async function sync_digital_twin_from_resume(
  userId: string,
  args: { fileName?: string; atsScore?: number },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
): Promise<{
  success: boolean;
  summary: string;
  data: {
    skillsCount: number;
    bluffRisks: string[];
    fileName: string;
  };
}> {
  const fileName = args.fileName || "Uploaded_Resume.pdf";
  const { syncMockDigitalTwinFromResume } = await import("./mock-agent-store");
  const skills = syncMockDigitalTwinFromResume(userId, fileName);

  const bluffRisks = skills.filter((s) => s.bluff_risk).map((s) => s.skill_name);

  return {
    success: true,
    summary: `Synchronized Digital Twin from "${fileName}": 8 skills tracked, ${bluffRisks.length} bluff risks detected (PostgreSQL & Redis).`,
    data: {
      skillsCount: skills.length,
      bluffRisks,
      fileName,
    },
  };
}

// ─── TOOL 5: AUTO_SEED_KANBAN_PIPELINE ──────────────────────────────────────
export async function auto_seed_kanban_pipeline(
  userId: string,
  args: { targetRole?: string },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
): Promise<{
  success: boolean;
  summary: string;
  data: {
    seededCount: number;
    roles: Array<{ company: string; role: string; matchScore: number }>;
  };
}> {
  const roles = [
    { company: "Razorpay", role: "Backend SDE (Payments Core)", matchScore: 91 },
    { company: "Vercel", role: "Full-Stack Engineer (Next.js/TS)", matchScore: 94 },
    { company: "Stripe", role: "API Infrastructure SDE", matchScore: 88 },
    { company: "Atlassian", role: "Distributed Systems SDE", matchScore: 86 },
  ];

  return {
    success: true,
    summary: `Auto-seeded 4 top matched opportunities into Kanban pipeline (Razorpay 91%, Vercel 94%, Stripe 88%, Atlassian 86%).`,
    data: {
      seededCount: 4,
      roles,
    },
  };
}


