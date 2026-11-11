import type { ConfidenceTier, ToolExecutionResult } from "./types";
import { createPersistentFallbackDbClient } from "./orchestrator";

export type { ConfidenceTier };
export type ClaimedLevel = "LOW" | "MEDIUM" | "HIGH";
export type EvidenceVerdict = "POSITIVE" | "NEGATIVE";

export interface ProposedBulletChange {
  originalBullet: string;
  proposedBullet: string;
  verifiedSourceProject: string;
  keywordsAdded: string[];
}

export interface UpdateSkillEvidenceArgs {
  skillName: string;
  verdict: "POSITIVE" | "NEGATIVE";
  source: "MOCK_INTERVIEW" | "READINESS_DRILL" | string;
  evidenceCitation: string;
}

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

export interface StageResumeDiffArgs {
  jobId: string;
  targetRole: string;
  runId?: string;
  proposedBulletChanges: ProposedBulletChange[];
}

export interface AgentApprovalRecord {
  id: string;
  user_id: string;
  run_id?: string;
  action_type: "RESUME_DIFF" | "SKILL_EVALUATION" | "TASK_INJECTION" | string;
  target_entity_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  payload_diff: {
    targetRole?: string;
    jobId?: string;
    proposedBulletChanges: ProposedBulletChange[];
    estimatedAtsScoreDelta?: number;
    createdAt?: string;
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

export class MockAgentStore {
  private skillEvidence = new Map<string, any>();
  private readinessTasks = new Map<string, any[]>();
  private approvals = new Map<string, AgentApprovalRecord>();
  private masterResumes = new Map<string, ResumeDocument>();

  getSkill(userId: string, skillName: string): any {
    return this.skillEvidence.get(`${userId}:${skillName.toLowerCase().trim()}`);
  }

  upsertSkill(row: any): any {
    const key = `${row.user_id}:${row.skill_name.toLowerCase().trim()}`;
    const saved = { ...row, updated_at: new Date().toISOString() };
    this.skillEvidence.set(key, saved);
    return saved;
  }

  getTasks(userId: string): any[] {
    return this.readinessTasks.get(userId) || [];
  }

  insertTasks(userId: string, newTasks: any[]): any[] {
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

function getDb(passedClient?: any) {
  if (passedClient) return passedClient;
  return createPersistentFallbackDbClient();
}

const CONFIDENCE_LADDER: ConfidenceTier[] = ["UNVERIFIED", "LOW", "MEDIUM", "HIGH"];

export function computeDampedConfidence(
  currentTier: ConfidenceTier,
  verdict: "POSITIVE" | "NEGATIVE",
  claimedLevel: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM"
): { previousTier: ConfidenceTier; nextTier: ConfidenceTier; bluffRisk: boolean } {
  const idx = CONFIDENCE_LADDER.indexOf(currentTier);
  const safeIdx = idx === -1 ? 0 : idx;

  let nextIdx = safeIdx;
  if (verdict === "POSITIVE") {
    nextIdx = Math.min(CONFIDENCE_LADDER.length - 1, safeIdx + 1);
  } else {
    nextIdx = currentTier === "UNVERIFIED" ? 1 : Math.max(1, safeIdx - 1);
  }

  const nextTier = CONFIDENCE_LADDER[nextIdx];
  const bluffRisk = claimedLevel === "HIGH" && nextTier === "LOW";
  return { previousTier: currentTier, nextTier, bluffRisk };
}

export async function sync_digital_twin_from_resume(
  userId: string,
  args: {
    targetRole?: string;
    skills: Array<{ name: string; claimedLevel?: "LOW" | "MEDIUM" | "HIGH"; citation?: string }>;
  },
  supabase?: any
): Promise<ToolExecutionResult> {
  const db = getDb(supabase);

  if (!Array.isArray(args.skills) || args.skills.length === 0) {
    return {
      success: false,
      summary: "No skills provided to sync_digital_twin_from_resume. Upload a valid resume first.",
      data: { syncedCount: 0 },
    };
  }

  const now = new Date().toISOString();
  const rowsToUpsert = args.skills.map((s) => ({
    user_id: userId,
    skill_name: s.name.trim(),
    claimed_level: s.claimedLevel || "HIGH",
    verified_confidence: "UNVERIFIED" as ConfidenceTier,
    bluff_risk: false,
    evidence_log: [
      {
        timestamp: now,
        source: "RESUME",
        verdict: "POSITIVE",
        citation: s.citation || `Extracted from uploaded resume for ${args.targetRole || "target role"}`,
      },
    ],
    updated_at: now,
  }));

  const { data: upserted, error } = await db
    .from("skill_evidence_matrix")
    .upsert(rowsToUpsert, { onConflict: "user_id,skill_name" })
    .select("*");

  if (error) {
    throw new Error(`SUPABASE_SKILL_SYNC_ERROR: ${error.message}`);
  }

  return {
    success: true,
    summary: `Synced ${upserted?.length ?? rowsToUpsert.length} real extracted resume skills into Supabase skill_evidence_matrix.`,
    data: { syncedCount: upserted?.length ?? rowsToUpsert.length, skills: upserted },
  };
}

export async function update_skill_evidence(
  userId: string,
  args: {
    skillName: string;
    verdict: "POSITIVE" | "NEGATIVE";
    source: "MOCK_INTERVIEW" | "READINESS_DRILL" | string;
    evidenceCitation: string;
  },
  supabase?: any
): Promise<ToolExecutionResult & { status?: string }> {
  const db = getDb(supabase);

  const { data: existing } = await db
    .from("skill_evidence_matrix")
    .select("*")
    .eq("user_id", userId)
    .ilike("skill_name", args.skillName.trim())
    .maybeSingle();

  const currentTier: ConfidenceTier = existing?.verified_confidence || "UNVERIFIED";
  const claimedLevel: "LOW" | "MEDIUM" | "HIGH" = existing?.claimed_level || "HIGH";
  const { previousTier, nextTier, bluffRisk } = computeDampedConfidence(currentTier, args.verdict, claimedLevel);

  const prevLog = Array.isArray(existing?.evidence_log) ? existing.evidence_log : [];
  const updatedLog = [
    {
      timestamp: new Date().toISOString(),
      source: args.source,
      verdict: args.verdict,
      citation: args.evidenceCitation,
    },
    ...prevLog,
  ].slice(0, 15);

  const { data: savedRow, error } = await db
    .from("skill_evidence_matrix")
    .upsert(
      {
        user_id: userId,
        skill_name: existing?.skill_name || args.skillName.trim(),
        claimed_level: claimedLevel,
        verified_confidence: nextTier,
        bluff_risk: bluffRisk,
        evidence_log: updatedLog,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,skill_name" }
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(`SUPABASE_UPDATE_SKILL_EVIDENCE_ERROR: ${error.message}`);
  }

  // Also sync to in-memory store
  mockAgentStore.upsertSkill(savedRow);

  return {
    success: true,
    summary: `Updated "${savedRow.skill_name}" confidence: ${previousTier} -> ${nextTier} (Bluff Risk: ${bluffRisk}).`,
    data: {
      skillName: savedRow.skill_name,
      previousTier,
      nextTier,
      bluffRisk,
      latestCitation: args.evidenceCitation,
    },
  };
}

export async function inject_readiness_sprint(
  userId: string,
  args: {
    sprintTitle: string;
    linkedJobId?: string;
    tasks: Array<{
      title: string;
      category: string;
      priority: "HIGH" | "MEDIUM" | "LOW";
      estimatedHours: number;
      evidenceReason: string;
    }>;
  },
  supabase?: any
): Promise<ToolExecutionResult & { status?: string }> {
  const db = getDb(supabase);

  if (!Array.isArray(args.tasks) || args.tasks.length === 0) {
    return {
      success: false,
      summary: "No tasks provided to inject_readiness_sprint.",
      data: { insertedCount: 0, skippedDuplicates: 0 },
    };
  }

  const { data: existingTasks } = await db
    .from("readiness_tasks")
    .select("title")
    .eq("user_id", userId);

  const existingTitles = new Set(
    (existingTasks || []).map((t: any) => String(t.title || "").trim().toLowerCase())
  );

  const newTasksToInsert = args.tasks
    .filter((t) => !existingTitles.has(t.title.trim().toLowerCase()))
    .map((t) => ({
      user_id: userId,
      title: t.title.trim(),
      category: t.category || "CORE_CS",
      priority: t.priority || "HIGH",
      estimated_hours: t.estimatedHours || 2,
      description: `[${args.sprintTitle}] ${t.evidenceReason}`,
      completed: false,
      created_at: new Date().toISOString(),
    }));

  if (newTasksToInsert.length === 0) {
    return {
      success: true,
      summary: `All ${args.tasks.length} sprint tasks already exist in readiness_tasks; skipped duplicates.`,
      data: { insertedCount: 0, skippedDuplicates: args.tasks.length, sprintTitle: args.sprintTitle },
    };
  }

  const { data: insertedRows, error } = await db
    .from("readiness_tasks")
    .insert(newTasksToInsert)
    .select("*");

  if (error) {
    throw new Error(`SUPABASE_READINESS_INSERT_ERROR: ${error.message}`);
  }

  mockAgentStore.insertTasks(userId, newTasksToInsert);

  return {
    success: true,
    summary: `Injected ${insertedRows?.length ?? newTasksToInsert.length} tasks for "${args.sprintTitle}" into Supabase readiness_tasks.`,
    data: {
      insertedCount: insertedRows?.length ?? newTasksToInsert.length,
      skippedDuplicates: args.tasks.length - newTasksToInsert.length,
      sprintTitle: args.sprintTitle,
      tasks: insertedRows,
    },
  };
}

export async function stage_resume_diff(
  userId: string,
  args: {
    jobId: string;
    targetRole: string;
    runId?: string;
    proposedBulletChanges: Array<{
      originalBullet: string;
      proposedBullet: string;
      verifiedSourceProject: string;
      keywordsAdded: string[];
    }>;
  },
  supabase?: any
): Promise<ToolExecutionResult & { status: "AWAITING_APPROVAL" }> {
  const db = getDb(supabase);

  if (!Array.isArray(args.proposedBulletChanges) || args.proposedBulletChanges.length === 0) {
    throw new Error("UNGROUNDED_RESUME_DIFF_REJECTED: No bullet changes provided to stage_resume_diff.");
  }

  for (const item of args.proposedBulletChanges) {
    if (!item.verifiedSourceProject || !item.originalBullet || !item.proposedBullet) {
      throw new Error("UNGROUNDED_RESUME_DIFF_REJECTED: Every bullet diff must include originalBullet, proposedBullet, and verifiedSourceProject.");
    }
  }

  const approvalId = `appr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const approvalRecord: AgentApprovalRecord = {
    id: approvalId,
    user_id: userId,
    run_id: args.runId,
    action_type: "RESUME_DIFF",
    target_entity_id: args.jobId || "general",
    status: "PENDING",
    payload_diff: {
      targetRole: args.targetRole,
      jobId: args.jobId,
      proposedBulletChanges: args.proposedBulletChanges,
      estimatedAtsScoreDelta: Math.min(25, Math.max(5, Math.round(args.proposedBulletChanges.length * 4))),
      createdAt: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
  };

  const { data: approvalRow, error } = await db
    .from("agent_approvals")
    .insert(approvalRecord)
    .select("*")
    .single();

  if (error) {
    throw new Error(`SUPABASE_STAGE_DIFF_ERROR: ${error.message}`);
  }

  mockAgentStore.saveApproval(approvalRow || approvalRecord);

  return {
    success: true,
    status: "AWAITING_APPROVAL",
    summary: `Staged ${args.proposedBulletChanges.length} grounded resume bullet diff(s) in Supabase agent_approvals (ID: ${approvalRow?.id || approvalId}) awaiting user approval.`,
    data: {
      approvalId: approvalRow?.id || approvalId,
      targetRole: args.targetRole,
      diffCount: args.proposedBulletChanges.length,
      proposedBulletChanges: args.proposedBulletChanges,
    },
  };
}

export async function auto_seed_kanban_pipeline(
  userId: string,
  args: { targetRole?: string; skills?: string[]; limit?: number } = {},
  supabase?: any
): Promise<ToolExecutionResult & { status?: string }> {
  const db = getDb(supabase);

  const searchRole = (args.targetRole || "software engineer").trim();
  const maxJobs = Math.min(args.limit || 4, 8);

  // Real Live Job Search Call to Remotive Public API
  const encodedQuery = encodeURIComponent(searchRole);
  let liveJobs: any[] = [];
  try {
    const remotiveRes = await fetch(
      `https://remotive.com/api/remote-jobs?search=${encodedQuery}&limit=15`,
      { headers: { Accept: "application/json" } }
    );
    if (remotiveRes.ok) {
      const remotiveJson = await remotiveRes.json();
      if (Array.isArray(remotiveJson?.jobs)) {
        liveJobs = remotiveJson.jobs.slice(0, maxJobs);
      }
    }
  } catch (err: any) {
    console.warn("[auto_seed_kanban_pipeline] Remotive API network notice:", err?.message);
  }

  // Fallback to Himalayas Public API if Remotive returns 0 jobs
  if (liveJobs.length === 0) {
    try {
      const himalayasRes = await fetch(
        `https://himalayas.app/jobs/api?q=${encodedQuery}&limit=10`,
        { headers: { Accept: "application/json" } }
      );
      if (himalayasRes.ok) {
        const himalayasJson = await himalayasRes.json();
        const items = himalayasJson?.jobs || himalayasJson?.data || [];
        if (Array.isArray(items) && items.length > 0) {
          liveJobs = items.slice(0, maxJobs).map((j: any) => ({
            company_name: j.companyName || j.company || "Himalayas Employer",
            title: j.title || searchRole,
            url: j.applicationUrl || j.url || "https://himalayas.app/jobs",
            candidate_required_location: j.location || "Remote",
            salary: j.salary || "Competitive",
            tags: j.skills || j.categories || [],
          }));
        }
      }
    } catch (err: any) {
      console.warn("[auto_seed_kanban_pipeline] Himalayas API network notice:", err?.message);
    }
  }

  if (liveJobs.length === 0) {
    return {
      success: false,
      summary: `Live job search completed, but 0 remote openings matched "${searchRole}" on Remotive/Himalayas right now.`,
      data: { seededCount: 0, roles: [] },
    };
  }

  const { data: existingApps } = await db
    .from("applications")
    .select("company, title")
    .eq("user_id", userId);

  const existingKeys = new Set(
    (existingApps || []).map((a: any) => `${String(a.company).toLowerCase()}::${String(a.title || a.role).toLowerCase()}`)
  );

  const now = Date.now();
  const rowsToInsert = liveJobs
    .filter((job) => {
      const key = `${String(job.company_name).toLowerCase()}::${String(job.title).toLowerCase()}`;
      return !existingKeys.has(key);
    })
    .map((job, idx) => ({
      user_id: userId,
      company: job.company_name,
      title: job.title,
      status: "Saved",
      url: job.url,
      location: job.candidate_required_location || "Remote",
      salary: job.salary || "Competitive",
      notes: `Live scouted via Agent for target role "${searchRole}". Tags: ${(job.tags || []).slice(0, 6).join(", ")}. Recommended apply deadline: ${new Date(now + (idx + 2) * 86400000).toISOString().split("T")[0]}`,
      created_at: new Date().toISOString(),
    }));

  if (rowsToInsert.length === 0) {
    return {
      success: true,
      summary: `Found ${liveJobs.length} live jobs for "${searchRole}", all of which are already tracked in your Kanban pipeline.`,
      data: { seededCount: 0, roles: [] },
    };
  }

  const { data: insertedApps, error } = await db
    .from("applications")
    .insert(rowsToInsert)
    .select("*");

  if (error) {
    throw new Error(`SUPABASE_KANBAN_SEED_ERROR: ${error.message}`);
  }

  return {
    success: true,
    summary: `Scouted and inserted ${insertedApps?.length ?? rowsToInsert.length} real live job openings for "${searchRole}" into Supabase applications.`,
    data: {
      seededCount: insertedApps?.length ?? rowsToInsert.length,
      roles: insertedApps || rowsToInsert,
    },
  };
}
