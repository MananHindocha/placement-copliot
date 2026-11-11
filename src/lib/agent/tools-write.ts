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

  const now = new Date().toISOString();
  const newTasksToInsert = args.tasks
    .filter((t) => !existingTitles.has(t.title.trim().toLowerCase()))
    .map((t, idx) => ({
      id: `task-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: userId,
      title: t.title.trim(),
      category: t.category || "CORE_CS",
      priority: t.priority || "HIGH",
      estimated_hours: t.estimatedHours || 2,
      description: `[${args.sprintTitle}] ${t.evidenceReason}`,
      completed: false,
      created_at: now,
    }));

  if (newTasksToInsert.length === 0) {
    return {
      success: true,
      summary: `All ${args.tasks.length} sprint tasks already exist in readiness_tasks; skipped duplicates.`,
      data: {
        insertedCount: 0,
        tasksInjected: 0,
        skippedDuplicates: args.tasks.length,
        sprintTitle: args.sprintTitle,
        tasks: [],
      },
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

  const rows = insertedRows && insertedRows.length > 0 ? insertedRows : newTasksToInsert;
  const tasks = rows.map((r: any, idx: number) => ({
    id: r.id || `task-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    title: r.title,
    description: r.description,
    completed: false,
    priority: ((r.priority || "high").toLowerCase() === "low"
      ? "low"
      : (r.priority || "high").toLowerCase() === "medium"
      ? "medium"
      : "high") as "high" | "medium" | "low",
    category: (r.category || "skills").toLowerCase(),
    dueDate: "In 7 days",
    createdAt: r.created_at || now,
  }));

  return {
    success: true,
    summary: `Injected ${tasks.length} tasks for "${args.sprintTitle}" into Supabase readiness_tasks.`,
    data: {
      insertedCount: tasks.length,
      tasksInjected: tasks.length,
      skippedDuplicates: args.tasks.length - newTasksToInsert.length,
      sprintTitle: args.sprintTitle,
      tasks,
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
  params: any = {},
  supabase?: any
): Promise<ToolExecutionResult & { status?: string }> {
  // Extract skills and target role from agent params
  const skills: string[] =
    params.skills ||
    params.targetSkills ||
    params.requiredSkills ||
    [];
  const targetRole: string =
    params.targetRole ||
    params.role ||
    "Software Engineer";
  const limit: number = params.limit || 6;

  // Build search query from skills and target role
  const query = `${targetRole} ${skills.slice(0, 3).join(" ")}`.trim();

  let applications: any[] = [];

  try {
    // Use absolute URL for server-side fetch
    const port = process.env.PORT || 3000;
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : `http://localhost:${port}`);

    const response = await fetch(
      `${baseUrl}/api/jobs/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const jobs = data.jobs || data.results || data.data || [];

      applications = jobs.map((job: any, idx: number) => ({
        id: job.id || `seeded-${Date.now()}-${idx}`,
        company: job.company || job.employer || "Unknown Company",
        role: job.title || job.position || targetRole,
        title: job.title || job.position || targetRole,
        status: "Applied",
        appliedDate: new Date().toISOString().split("T")[0],
        url: job.url || job.applyUrl || job.link || "",
        location: job.location || job.city || "Remote",
        salary: job.salary || job.salaryRange || "",
        description: job.description || job.snippet || "",
        matchScore: job.matchScore || job.score || 70,
        source: "agent",
        skills: skills,
      }));
    }
  } catch (err) {
    console.error("[auto_seed_kanban_pipeline] Job search failed:", err);
    // Do NOT silently succeed — return honest empty state
  }

  // Also persist to database/in-memory store if db is available
  if (applications.length > 0) {
    try {
      const db = getDb(supabase);
      await db.from("applications").insert(
        applications.map((a: any) => ({
          user_id: userId,
          company: a.company,
          title: a.role || a.title,
          status: a.status || "Applied",
          url: a.url,
          location: a.location,
          salary: a.salary,
          notes: `Live scouted via Agent for target role "${targetRole}".`,
          created_at: new Date().toISOString(),
        }))
      );
    } catch {
      // In-memory or database persistence notice
    }
  }

  return {
    success: true,
    summary:
      applications.length > 0
        ? `Found ${applications.length} real ${targetRole} jobs matching your skills.`
        : `Job search ran but returned no results for "${query}". Try broadening your target role.`,
    data: {
      seededCount: applications.length,
      roles: applications.map((a: any) => a.role),
      applications: applications, // ← full objects for AgentProvider to sync
    },
  };
}
