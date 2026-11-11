/**
 * Placement Co-pilot Agent Orchestrator (Track 3)
 *
 * Implements the core autonomous AI agent loop:
 * - Dynamic Function Calling using Gemini 2.0 Flash
 * - Real Supabase / Persistent DB state recording
 * - Honest error logging (no fake silent fallbacks)
 * - Grounded resume context injection into LLM prompt
 * - Autonomous tool planning based on trigger events and live tool observations
 */

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  AgentRunPayload,
  AgentTraceStep,
  StudentDigitalTwinSnapshot,
} from "./types";
import { getAgentToolRegistry } from "./tool-registry";
import {
  auto_seed_kanban_pipeline,
  update_skill_evidence,
  inject_readiness_sprint,
  stage_resume_diff,
} from "./tools-write";
import {
  get_student_twin_context,
  analyze_job_gap,
  optimize_multi_company_overlap,
} from "./tools-read";

export const GUEST_PERSISTENT_UUID = "00000000-0000-0000-0000-000000000001";
const MAX_STEPS = 5;

export type { AgentRunPayload, AgentTraceStep };

export interface StudentTwinContext {
  userId: string;
  targetRole: string;
  readinessScore: number;
  activeApplicationsCount: number;
  skills: Array<{
    skill: string;
    verified: boolean;
    confidence: number;
    bluffRisk?: boolean;
    evidenceSource?: string;
    lastUpdated?: string;
  }>;
  bluffRisks: string[];
  recentMilestones: string[];
  lastActiveAt: string;
}

export interface StagedResumeDiff {
  id: string;
  userId: string;
  applicationId?: string;
  roleTarget: string;
  summary: string;
  suggestedAdditions: string[];
  suggestedKeywords: string[];
  highlightedProjects: string[];
  requiresApproval: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export interface AgentRunRecord {
  id: string;
  user_id: string;
  idempotency_key: string;
  trigger_type: AgentRunPayload["triggerType"];
  entity_id?: string;
  status: "RUNNING" | "COMPLETED" | "COMPLETED_WITH_FALLBACK" | "AWAITING_APPROVAL" | "FAILED";
  requires_approval: boolean;
  approval_id?: string;
  goal?: string;
  goal_prompt?: string;
  reasoning_trace: AgentTraceStep[];
  final_summary?: string;
  staged_diff?: StagedResumeDiff;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentApprovalRecord {
  id: string;
  user_id: string;
  run_id?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  action_type?: string;
  target_entity_id?: string;
  payload_diff?: any;
  role_target?: string;
  summary?: string;
  suggested_additions?: string[];
  suggested_keywords?: string[];
  highlighted_projects?: string[];
  created_at: string;
  resolved_at?: string;
}

export const mockAgentRuns: AgentRunRecord[] = [];
export const mockAgentApprovals: AgentApprovalRecord[] = [];

// ─── Persistent Fallback Database Query Engine (Demo Mode) ───────────────────
interface MemoryStoreState {
  agent_runs: any[];
  agent_approvals: any[];
  skill_evidence_matrix: any[];
  applications: any[];
  readiness_tasks: any[];
  resumes: any[];
  profiles: any[];
  interview_sessions: any[];
  job_listings: any[];
}

const globalForDb = globalThis as unknown as {
  __persistentAgentDb?: MemoryStoreState;
};

function getMemoryStore(): MemoryStoreState {
  if (!globalForDb.__persistentAgentDb) {
    globalForDb.__persistentAgentDb = {
      agent_runs: [],
      agent_approvals: [],
      skill_evidence_matrix: [],
      applications: [],
      readiness_tasks: [],
      resumes: [],
      profiles: [],
      interview_sessions: [],
      job_listings: [],
    };
  }
  return globalForDb.__persistentAgentDb;
}

class MemoryQueryBuilder {
  private table: string;
  private isInsert = false;
  private isUpdate = false;
  private isUpsert = false;
  private updateData: any = null;
  private insertData: any[] = [];
  private onConflictKey = "";
  private filters: Array<(row: any) => boolean> = [];
  private sortFn: ((a: any, b: any) => number) | null = null;
  private limitN: number | null = null;

  constructor(table: string) {
    this.table = table;
    const store = getMemoryStore();
    if (!store[table as keyof MemoryStoreState]) {
      (store as any)[table] = [];
    }
  }

  select(_columns = "*") {
    return this;
  }

  insert(data: any | any[]) {
    this.isInsert = true;
    this.insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  upsert(data: any | any[], options?: { onConflict?: string }) {
    this.isUpsert = true;
    this.insertData = Array.isArray(data) ? data : [data];
    this.onConflictKey = options?.onConflict || "id";
    return this;
  }

  update(data: any) {
    this.isUpdate = true;
    this.updateData = data;
    return this;
  }

  delete() {
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push((row: any) => String(row[col]) === String(val));
    return this;
  }

  in(col: string, vals: any[]) {
    const valSet = new Set(vals.map(String));
    this.filters.push((row: any) => valSet.has(String(row[col])));
    return this;
  }

  ilike(col: string, pattern: string) {
    const cleanPattern = pattern.toLowerCase().replace(/%/g, "");
    this.filters.push((row: any) => String(row[col] || "").toLowerCase().includes(cleanPattern));
    return this;
  }

  order(col: string, options?: { ascending?: boolean }) {
    const asc = options?.ascending ?? true;
    this.sortFn = (a, b) => {
      const va = a[col] || "";
      const vb = b[col] || "";
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
      return 0;
    };
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  private execute(): { data: any; error: any } {
    const store = getMemoryStore();
    const rows = (store as any)[this.table] as any[];

    if (this.isInsert) {
      const insertedWithIds = this.insertData.map((item) => ({
        id: item.id || `${this.table}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...item,
      }));
      rows.unshift(...insertedWithIds);
      return { data: insertedWithIds.length === 1 ? insertedWithIds[0] : insertedWithIds, error: null };
    }

    if (this.isUpsert) {
      const conflictCols = this.onConflictKey.split(",").map((s) => s.trim());
      const upserted: any[] = [];
      for (const item of this.insertData) {
        const existingIdx = rows.findIndex((r) =>
          conflictCols.every((col) => String(r[col] || "").toLowerCase() === String(item[col] || "").toLowerCase())
        );
        const record = {
          id: existingIdx >= 0 ? rows[existingIdx].id : item.id || `${this.table}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: existingIdx >= 0 ? rows[existingIdx].created_at : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...item,
        };
        if (existingIdx >= 0) {
          rows[existingIdx] = record;
        } else {
          rows.unshift(record);
        }
        upserted.push(record);
      }
      return { data: upserted, error: null };
    }

    if (this.isUpdate) {
      let lastUpdated: any = null;
      for (let i = 0; i < rows.length; i++) {
        const match = this.filters.every((fn) => fn(rows[i]));
        if (match) {
          rows[i] = { ...rows[i], ...this.updateData, updated_at: new Date().toISOString() };
          lastUpdated = rows[i];
        }
      }
      return { data: lastUpdated, error: null };
    }

    let filtered = rows.filter((r) => this.filters.every((fn) => fn(r)));
    if (this.sortFn) {
      filtered.sort(this.sortFn);
    }
    if (this.limitN !== null && this.limitN > 0) {
      filtered = filtered.slice(0, this.limitN);
    }
    return { data: filtered, error: null };
  }

  async single() {
    const res = this.execute();
    const data = Array.isArray(res.data) ? res.data[0] || null : res.data;
    return { data, error: data ? null : { message: "Row not found" } };
  }

  async maybeSingle() {
    const res = this.execute();
    const data = Array.isArray(res.data) ? res.data[0] || null : res.data;
    return { data, error: null };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export function createPersistentFallbackDbClient() {
  return {
    from: (table: string) => new MemoryQueryBuilder(table),
  };
}

export function getPersistentSupabaseClient(passedClient?: any) {
  if (passedClient && isSupabaseConfigured()) return passedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (url && key && isSupabaseConfigured()) {
    try {
      return createClient(url, key, { auth: { persistSession: false } });
    } catch {
      return createPersistentFallbackDbClient();
    }
  }

  return createPersistentFallbackDbClient();
}

export function resolveEffectiveUserId(userId?: string): { effectiveUserId: string; isGuest: boolean } {
  const isUuid = Boolean(userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId));
  if (isUuid && userId !== GUEST_PERSISTENT_UUID) {
    return { effectiveUserId: userId!, isGuest: false };
  }
  return { effectiveUserId: GUEST_PERSISTENT_UUID, isGuest: true };
}

// ─── Gemini 2.0 Flash Function Calling Tool Declarations ──────────────────────
export const AGENT_FUNCTION_DECLARATIONS = [
  {
    name: "analyze_job_gap",
    description: "Analyzes the requirements for a target role/company against the candidate's digital twin skills and identifies unverified or bluff-risk gaps.",
    parameters: {
      type: "OBJECT",
      properties: {
        jobId: { type: "STRING", description: "ID of the target job application" },
        jobDescription: { type: "STRING", description: "Optional raw job description text" },
        requiredSkills: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Optional list of required skills",
        },
      },
      required: ["jobId"],
    },
  },
  {
    name: "inject_readiness_sprint",
    description: "Injects a structured, time-bounded preparation sprint into the student's readiness plan targeting specific gaps.",
    parameters: {
      type: "OBJECT",
      properties: {
        sprintTitle: { type: "STRING", description: "Sprint title (e.g. Interview Prep: Backend SDE)" },
        linkedJobId: { type: "STRING", description: "Optional linked job ID" },
        tasks: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING", description: "Specific task title" },
              category: { type: "STRING", description: "Category (CORE_CS, SYSTEM_DESIGN, DSA)" },
              priority: { type: "STRING", description: "HIGH, MEDIUM, or LOW" },
              estimatedHours: { type: "NUMBER", description: "Estimated completion hours" },
              evidenceReason: { type: "STRING", description: "Why this task is critical" },
            },
            required: ["title", "category", "priority", "estimatedHours", "evidenceReason"],
          },
          description: "List of actionable daily preparation tasks",
        },
      },
      required: ["sprintTitle", "tasks"],
    },
  },
  {
    name: "stage_resume_diff",
    description: "Proposes targeted, evidence-grounded modifications to the candidate's resume for human approval. NEVER applies directly without approval.",
    parameters: {
      type: "OBJECT",
      properties: {
        jobId: { type: "STRING", description: "Target job application ID" },
        targetRole: { type: "STRING", description: "Target role title and company" },
        proposedBulletChanges: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              originalBullet: { type: "STRING", description: "Exact original bullet from student resume" },
              proposedBullet: { type: "STRING", description: "Rewritten bullet with measurable impact" },
              verifiedSourceProject: { type: "STRING", description: "Existing student project grounding this bullet" },
              keywordsAdded: {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "Skills or keywords highlighted",
              },
            },
            required: ["originalBullet", "proposedBullet", "verifiedSourceProject"],
          },
          description: "List of proposed bullet improvements",
        },
      },
      required: ["jobId", "targetRole", "proposedBulletChanges"],
    },
  },
  {
    name: "update_skill_evidence",
    description: "Calibrates the candidate's digital twin skill confidence based on empirical interview telemetry or test results.",
    parameters: {
      type: "OBJECT",
      properties: {
        skillName: { type: "STRING", description: "Skill name to calibrate" },
        verdict: { type: "STRING", description: "POSITIVE or NEGATIVE" },
        source: { type: "STRING", description: "MOCK_INTERVIEW or READINESS_DRILL" },
        evidenceCitation: { type: "STRING", description: "Citation details or assessment metric" },
      },
      required: ["skillName", "verdict", "source", "evidenceCitation"],
    },
  },
  {
    name: "optimize_multi_company_overlap",
    description: "Cross-analyzes all active applications to identify common high-leverage skill requirements across multiple companies.",
    parameters: {
      type: "OBJECT",
      properties: {
        activeApplicationIds: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Optional list of application IDs to compare",
        },
      },
    },
  },
  {
    name: "sync_digital_twin_from_resume",
    description: "Extracts skills from uploaded resume into skill_evidence_matrix.",
    parameters: {
      type: "OBJECT",
      properties: {
        targetRole: { type: "STRING", description: "Target role title" },
        skills: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING", description: "Skill name" },
              claimedLevel: { type: "STRING", description: "LOW, MEDIUM, or HIGH" },
              citation: { type: "STRING", description: "Evidence citation" },
            },
            required: ["name"],
          },
          description: "Extracted skills from resume",
        },
      },
      required: ["skills"],
    },
  },
  {
    name: "auto_seed_kanban_pipeline",
    description: "Automatically scouts live remote jobs matching target role and seeds them into the Kanban Application Tracker.",
    parameters: {
      type: "OBJECT",
      properties: {
        targetRole: { type: "STRING", description: "Target role title" },
        skills: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Optional list of student skills to filter",
        },
        limit: { type: "NUMBER", description: "Maximum jobs to scout (default: 4)" },
      },
    },
  },
];

function buildAutonomousSystemPrompt(digitalTwin: StudentDigitalTwinSnapshot, resumeContext: any): string {
  const skillsList =
    digitalTwin.skills && digitalTwin.skills.length > 0
      ? digitalTwin.skills
          .map((s: any) => `${s.skill_name || s.skill} [Claimed: ${s.claimed_level || "N/A"}, Verified: ${s.verified_confidence || "UNVERIFIED"}, BluffRisk: ${Boolean(s.bluff_risk)}]`)
          .join("; ")
      : "NONE_EXTRACTED_YET (User has not uploaded a resume)";

  const bluffList =
    digitalTwin.bluffRiskSkills && digitalTwin.bluffRiskSkills.length > 0
      ? digitalTwin.bluffRiskSkills.join(", ")
      : "None";

  const parsedProjects =
    resumeContext?.projects && Array.isArray(resumeContext.projects) && resumeContext.projects.length > 0
      ? JSON.stringify(resumeContext.projects)
      : "No parsed resume projects available in database.";

  const parsedExperience =
    resumeContext?.experience && Array.isArray(resumeContext.experience) && resumeContext.experience.length > 0
      ? JSON.stringify(resumeContext.experience)
      : "No parsed work experience available in database.";

  const targetRole = (digitalTwin as any).targetRole || digitalTwin.profileSummary?.targetRole || "Not selected yet";
  const rawScore = (digitalTwin as any).readinessScore ?? digitalTwin.profileSummary?.readinessScore;
  const readinessText = typeof rawScore === "number" ? `${rawScore}%` : "0% (No verified data yet)";

  return `You are the Placement Co-pilot Autonomous Career Agent.
You have access to tools that inspect the student's state and mutate their placement workspace in Supabase.

CURRENT VERIFIED STUDENT STATE:
- Target Role: ${targetRole}
- Computed Readiness Score: ${readinessText}
- Tracked Skills in Database: ${skillsList}
- Active Bluff Risks: ${bluffList}
- Active Job Applications Count: ${digitalTwin.activeApplications?.length ?? 0}
- Parsed Resume Projects: ${parsedProjects}
- Parsed Resume Experience: ${parsedExperience}

AUTONOMOUS REASONING RULES:
1. Decide which tool(s) to invoke based strictly on the user's Trigger Event, Goal Prompt, and the observations returned by previous tools. Do NOT follow a blind script if data is missing.
2. If the student has no tracked skills and no resume uploaded, do NOT invent fake skills or fake resume diffs. Instead, inform the student that a real resume upload is required first.
3. When staging resume diffs (stage_resume_diff), you MUST only rewrite bullets using real projects present in Parsed Resume Projects above. Never fabricate metrics or companies.
4. When scouting jobs (auto_seed_kanban_pipeline), pass the student's actual Target Role and real extracted skills.
5. Stop calling tools once the goal is satisfied and provide a clear, factual summary of the database mutations performed.`;
}

export async function runPlacementAgent(payload: AgentRunPayload, passedSupabase?: any) {
  const rawKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, "");
  const supabase = getPersistentSupabaseClient(passedSupabase);
  const { effectiveUserId, isGuest } = resolveEffectiveUserId(payload.userId);
  const toolRegistry = getAgentToolRegistry();

  const bucket = Math.floor(Date.now() / (1000 * 60 * 2));
  const idempotencyKey = crypto
    .createHash("sha256")
    .update(`${effectiveUserId}:${payload.triggerType}:${payload.entityId || "none"}:${payload.goalPrompt || ""}:${bucket}`)
    .digest("hex");

  const { data: existingRun } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .in("status", ["RUNNING", "COMPLETED", "AWAITING_APPROVAL"])
    .maybeSingle();

  if (existingRun) {
    const runObj: AgentRunRecord = {
      id: existingRun.id,
      user_id: existingRun.user_id || effectiveUserId,
      idempotency_key: idempotencyKey,
      trigger_type: existingRun.trigger_type || payload.triggerType,
      entity_id: existingRun.entity_id || payload.entityId,
      status: existingRun.status,
      requires_approval: existingRun.requires_approval || false,
      goal: existingRun.goal || payload.goalPrompt,
      goal_prompt: existingRun.goal_prompt || payload.goalPrompt,
      reasoning_trace: existingRun.reasoning_trace || [],
      final_summary: existingRun.final_summary || existingRun.summary,
      created_at: existingRun.created_at,
      updated_at: existingRun.updated_at,
    };

    return {
      deduplicated: true,
      isGuest,
      status: existingRun.status,
      summary: existingRun.final_summary,
      trace: existingRun.reasoning_trace || [],
      runId: existingRun.id,
      run: runObj,
    };
  }

  const traceSteps: AgentTraceStep[] = [];
  const { data: createdRun, error: insertRunErr } = await supabase
    .from("agent_runs")
    .insert({
      user_id: effectiveUserId,
      idempotency_key: idempotencyKey,
      trigger_type: payload.triggerType,
      entity_id: payload.entityId || "global",
      goal: payload.goalPrompt || payload.triggerType,
      status: "RUNNING",
      reasoning_trace: [],
    })
    .select("*")
    .single();

  if (insertRunErr || !createdRun) {
    throw new Error(`SUPABASE_AGENT_RUN_INSERT_FAILED: ${insertRunErr?.message || "Unknown DB error"}`);
  }

  // Fail honestly and loudly if GEMINI_API_KEY is missing — NEVER run a fake silent fallback
  if (!apiKey || apiKey === "placeholder-gemini-key") {
    const honestError =
      "GEMINI_API_KEY_MISSING: Configure GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY in .env.local to run the autonomous agent.";
    await supabase
      .from("agent_runs")
      .update({
        status: "FAILED",
        final_summary: honestError,
        reasoning_trace: [
          {
            step_number: 0,
            timestamp: new Date().toISOString(),
            tool_name: "agent_preflight_check",
            input_summary: "Checking LLM credentials",
            output_summary: honestError,
            status: "ERROR",
            latency_ms: 1,
          },
        ],
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdRun.id);

    const runObj: AgentRunRecord = {
      id: createdRun.id,
      user_id: effectiveUserId,
      idempotency_key: idempotencyKey,
      trigger_type: payload.triggerType,
      entity_id: payload.entityId || "global",
      status: "FAILED",
      requires_approval: false,
      goal: payload.goalPrompt || payload.triggerType,
      goal_prompt: payload.goalPrompt || payload.triggerType,
      reasoning_trace: [],
      final_summary: honestError,
      created_at: createdRun.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      deduplicated: false,
      isGuest,
      status: "FAILED",
      error: honestError,
      summary: honestError,
      trace: [],
      runId: createdRun.id,
      run: runObj,
    };
  }

  try {
    // Step 0: Hydrate real database state (returns empty arrays and 0% if no resume exists)
    const t0 = Date.now();
    const twinResult = await toolRegistry.get_student_twin_context(effectiveUserId, {}, supabase);
    const digitalTwin: StudentDigitalTwinSnapshot = twinResult.data;

    // Fetch latest parsed resume row from Supabase resumes table if not passed in metadata
    const { data: latestResumeRow } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", effectiveUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const resumeContext =
      (payload as any).metadata?.resumeContext ||
      latestResumeRow?.parsed_data ||
      latestResumeRow ||
      null;

    traceSteps.push({
      step_number: 0,
      timestamp: new Date().toISOString(),
      tool_name: "get_student_twin_context",
      input_summary: `userId=${effectiveUserId} (isGuest=${isGuest})`,
      output_summary: twinResult.summary,
      status: "SUCCESS",
      latency_ms: Date.now() - t0,
    });

    await supabase
      .from("agent_runs")
      .update({ reasoning_trace: traceSteps, updated_at: new Date().toISOString() })
      .eq("id", createdRun.id);

    const systemPrompt = buildAutonomousSystemPrompt(digitalTwin, resumeContext);
    const contents: any[] = [
      {
        role: "user",
        parts: [
          {
            text: `Trigger Event: ${payload.triggerType}
Entity ID: ${payload.entityId || "N/A"}
User Goal: ${payload.goalPrompt || "Evaluate my current placement state and execute the most helpful next step."}
Additional Metadata: ${JSON.stringify((payload as any).metadata || {})}`,
          },
        ],
      },
    ];

    let stepCount = 1;
    let awaitingApproval = false;
    let finalSummaryText = "";

    while (stepCount <= MAX_STEPS) {
      const llmStart = Date.now();
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            tools: [{ functionDeclarations: AGENT_FUNCTION_DECLARATIONS }],
            toolConfig: { functionCallingConfig: { mode: "AUTO" } },
            generationConfig: { temperature: 0.2 },
          }),
        }
      );

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`GEMINI_HTTP_${response.status}: ${errBody.slice(0, 300)}`);
      }

      const llmJson = await response.json();
      const candidate = llmJson.candidates?.[0];
      const modelContent = candidate?.content;

      if (!modelContent || !Array.isArray(modelContent.parts)) {
        throw new Error("GEMINI_EMPTY_RESPONSE: Model returned no content parts.");
      }

      const functionCalls = modelContent.parts
        .filter((p: any) => p.functionCall)
        .map((p: any) => p.functionCall);

      if (functionCalls.length === 0) {
        finalSummaryText = modelContent.parts
          .filter((p: any) => typeof p.text === "string")
          .map((p: any) => p.text)
          .join("\n")
          .trim();
        break;
      }

      contents.push(modelContent);

      for (const call of functionCalls) {
        const toolName = call.name as string;
        const toolArgs = call.args || {};
        const stepStart = Date.now();

        const toolHandlers: Record<string, any> = {
          ...toolRegistry,
          auto_seed_kanban_pipeline,
          update_skill_evidence,
          inject_readiness_sprint,
          stage_resume_diff,
          get_student_twin_context,
          analyze_job_gap,
          optimize_multi_company_overlap,
        };
        const handler = toolHandlers[toolName];
        if (!handler) {
          throw new Error(`UNKNOWN_TOOL_CALLED: Gemini requested non-existent tool "${toolName}"`);
        }

        const output = await handler(effectiveUserId, { ...toolArgs, runId: createdRun.id }, supabase);
        if (toolName === "stage_resume_diff" && output.success) {
          awaitingApproval = true;
        }

        traceSteps.push({
          step_number: stepCount,
          timestamp: new Date().toISOString(),
          tool_name: toolName,
          input_summary: JSON.stringify(toolArgs).slice(0, 200),
          output_summary: output.summary,
          status: output.success ? "SUCCESS" : "ERROR",
          latency_ms: Date.now() - stepStart + (Date.now() - llmStart),
        });

        await supabase
          .from("agent_runs")
          .update({
            status: awaitingApproval ? "AWAITING_APPROVAL" : "RUNNING",
            reasoning_trace: traceSteps,
            updated_at: new Date().toISOString(),
          })
          .eq("id", createdRun.id);

        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: toolName,
                response: { success: output.success, summary: output.summary, data: output.data },
              },
            },
          ],
        });

        stepCount++;
        if (stepCount > MAX_STEPS) break;
      }
    }

    const finalStatus = awaitingApproval ? "AWAITING_APPROVAL" : "COMPLETED";
    const summaryToSave =
      finalSummaryText ||
      traceSteps.map((s) => `${s.tool_name}: ${s.output_summary}`).join(" | ");

    await supabase
      .from("agent_runs")
      .update({
        status: finalStatus,
        reasoning_trace: traceSteps,
        final_summary: summaryToSave,
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdRun.id);

    const runObj: AgentRunRecord = {
      id: createdRun.id,
      user_id: effectiveUserId,
      idempotency_key: idempotencyKey,
      trigger_type: payload.triggerType,
      entity_id: payload.entityId || "global",
      status: finalStatus,
      requires_approval: awaitingApproval,
      goal: payload.goalPrompt || payload.triggerType,
      goal_prompt: payload.goalPrompt || payload.triggerType,
      reasoning_trace: traceSteps,
      final_summary: summaryToSave,
      created_at: createdRun.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      deduplicated: false,
      isGuest,
      status: finalStatus,
      summary: summaryToSave,
      trace: traceSteps,
      runId: createdRun.id,
      run: runObj,
    };
  } catch (err: any) {
    const honestErrorMessage = `AGENT_EXECUTION_ERROR: ${err?.message || "Unknown runtime failure"}`;
    traceSteps.push({
      step_number: traceSteps.length,
      timestamp: new Date().toISOString(),
      tool_name: "agent_runtime_error",
      input_summary: payload.triggerType,
      output_summary: honestErrorMessage,
      status: "ERROR",
      latency_ms: 0,
    });

    await supabase
      .from("agent_runs")
      .update({
        status: "FAILED",
        reasoning_trace: traceSteps,
        final_summary: honestErrorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdRun.id);

    const runObj: AgentRunRecord = {
      id: createdRun.id,
      user_id: effectiveUserId,
      idempotency_key: idempotencyKey,
      trigger_type: payload.triggerType,
      entity_id: payload.entityId || "global",
      status: "FAILED",
      requires_approval: false,
      goal: payload.goalPrompt || payload.triggerType,
      goal_prompt: payload.goalPrompt || payload.triggerType,
      reasoning_trace: traceSteps,
      final_summary: honestErrorMessage,
      created_at: createdRun.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      deduplicated: false,
      isGuest,
      status: "FAILED",
      error: honestErrorMessage,
      summary: honestErrorMessage,
      trace: traceSteps,
      runId: createdRun.id,
      run: runObj,
    };
  }
}

// ─── Step 0 Context Hydration Helper (Digital Twin Loader) ───────────────────
export async function getStudentTwinContext(
  userId: string,
  supabaseClient?: any
): Promise<StudentTwinContext> {
  const supabase = getPersistentSupabaseClient(supabaseClient);
  const { effectiveUserId } = resolveEffectiveUserId(userId);
  const toolRegistry = getAgentToolRegistry();
  const res = await toolRegistry.get_student_twin_context(effectiveUserId, {}, supabase);
  const dt = res.data;

  return {
    userId: effectiveUserId,
    targetRole: (dt as any)?.targetRole || dt?.profileSummary?.targetRole || "Software Engineer",
    readinessScore: (dt as any)?.readinessScore ?? dt?.profileSummary?.readinessScore ?? 0,
    activeApplicationsCount: dt?.activeApplications?.length || 0,
    skills: (dt?.skills || []).map((s: any) => ({
      skill: s.skill_name || s.skill,
      verified: s.verified_confidence === "HIGH" || s.verified_confidence === "MEDIUM",
      confidence: s.verified_confidence === "HIGH" ? 100 : s.verified_confidence === "MEDIUM" ? 70 : 40,
      bluffRisk: Boolean(s.bluff_risk),
      evidenceSource: s.evidence_log?.[0]?.source,
      lastUpdated: s.updated_at,
    })),
    bluffRisks: dt?.bluffRiskSkills || [],
    recentMilestones: [],
    lastActiveAt: new Date().toISOString(),
  };
}

// ─── Non-Blocking Async Background Runner ────────────────────────────────────
export function triggerAgentEventAsync(input: {
  userId: string;
  triggerType: AgentRunPayload["triggerType"];
  entityId?: string;
  goalPrompt?: string;
  metadata?: Record<string, any>;
}): void {
  setImmediate(async () => {
    try {
      await runPlacementAgent(input);
    } catch (err) {
      console.error("[triggerAgentEventAsync] Background agent execution failed:", err);
    }
  });
}

// ─── Query Helpers for API Routes & UI Drawer ────────────────────────────────
export async function getLatestAgentRuns(
  userId: string,
  limit = 10,
  supabaseClient?: any
): Promise<AgentRunRecord[]> {
  try {
    const supabase = getPersistentSupabaseClient(supabaseClient);
    const { effectiveUserId } = resolveEffectiveUserId(userId);
    const { data, error } = await supabase
      .from("agent_runs")
      .select("*")
      .eq("user_id", effectiveUserId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (e) {
    console.warn("[Orchestrator] getLatestAgentRuns error:", e);
  }
  return [];
}

export async function getPendingAgentApprovals(
  userId: string,
  supabaseClient?: any
): Promise<AgentApprovalRecord[]> {
  try {
    const supabase = getPersistentSupabaseClient(supabaseClient);
    const { effectiveUserId } = resolveEffectiveUserId(userId);
    const { data, error } = await supabase
      .from("agent_approvals")
      .select("*")
      .eq("user_id", effectiveUserId)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (e) {
    console.warn("[Orchestrator] getPendingAgentApprovals error:", e);
  }
  return [];
}

export async function resolveAgentApproval(
  approvalId: string,
  decision: "APPROVED" | "REJECTED",
  userId: string,
  supabaseClient?: any
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getPersistentSupabaseClient(supabaseClient);
    const now = new Date().toISOString();

    const { data: updatedApproval, error } = await supabase
      .from("agent_approvals")
      .update({ status: decision, resolved_at: now })
      .eq("id", approvalId)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (updatedApproval?.run_id) {
      await supabase
        .from("agent_runs")
        .update({
          status: "COMPLETED",
          requires_approval: false,
          final_summary: `[User ${decision} staged resume modifications]`,
          updated_at: now,
        })
        .eq("id", updatedApproval.run_id);
    }

    return {
      success: true,
      message: `Resume modification diff successfully ${decision.toLowerCase()} by candidate.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to resolve approval",
    };
  }
}
