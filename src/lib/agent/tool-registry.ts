/**
 * Track 2: Unified Agent Tool Barrel & Registry
 * Owner: Manan
 *
 * Provides a single unified dictionary of all 6 AI Agent tools:
 * - 3 Write Tools (Manan): update_skill_evidence, inject_readiness_sprint, stage_resume_diff
 * - 3 Read Tools (Pratham): get_skill_evidence, get_readiness_status, get_job_context
 *
 * Implements fallback stubs for Pratham's read tools so Sanchit's orchestrator
 * can call all tools from one unified registry without waiting for Track 1.
 */

import {
  update_skill_evidence,
  inject_readiness_sprint,
  stage_resume_diff,
  mockAgentStore,
  type UpdateSkillEvidenceArgs,
  type InjectReadinessSprintArgs,
  type StageResumeDiffArgs,
} from "./tools-write";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AgentToolHandler<TArgs = any, TResult = any> = (
  userId: string,
  args: TArgs,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
) => Promise<{
  success: boolean;
  summary: string;
  data?: TResult;
}>;

export interface AgentToolRegistry {
  update_skill_evidence: AgentToolHandler<UpdateSkillEvidenceArgs>;
  inject_readiness_sprint: AgentToolHandler<InjectReadinessSprintArgs>;
  stage_resume_diff: AgentToolHandler<StageResumeDiffArgs>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get_skill_evidence: AgentToolHandler<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get_readiness_status: AgentToolHandler<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get_job_context: AgentToolHandler<any>;
  [toolName: string]: AgentToolHandler;
}

// ─── READ TOOLS FALLBACK STUBS (Track 1 Pratham Bridge) ──────────────────────

/**
 * Fallback implementation of get_skill_evidence
 */
const fallbackGetSkillEvidence: AgentToolHandler = async (
  userId: string,
  args: { skillName?: string },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
) => {
  if (args?.skillName) {
    const skill = mockAgentStore.getSkill(userId, args.skillName);
    if (skill) {
      return {
        success: true,
        summary: `Skill evidence for "${args.skillName}": ${skill.verified_confidence} confidence, bluff risk: ${skill.bluff_risk}.`,
        data: skill,
      };
    }
  }

  if (supabase) {
    try {
      const query = supabase.from("skill_evidence_matrix").select("*").eq("user_id", userId);
      if (args?.skillName) {
        query.ilike("skill_name", args.skillName);
      }
      const { data, error } = await query;
      if (!error && data) {
        return {
          success: true,
          summary: `Fetched ${data.length} skill record(s) from database.`,
          data,
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    success: true,
    summary: `Fetched skill evidence for user ${userId}.`,
    data: {
      userId,
      skills: [
        {
          skill_name: args?.skillName || "PostgreSQL Concurrency",
          verified_confidence: "LOW",
          claimed_level: "HIGH",
          bluff_risk: true,
        },
      ],
    },
  };
};

/**
 * Fallback implementation of get_readiness_status
 */
const fallbackGetReadinessStatus: AgentToolHandler = async (
  userId: string,
  _args: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
) => {
  const storeTasks = mockAgentStore.getTasks(userId);
  if (storeTasks.length > 0) {
    const completed = storeTasks.filter((t) => t.completed).length;
    return {
      success: true,
      summary: `Readiness status: ${completed}/${storeTasks.length} tasks completed.`,
      data: {
        totalTasks: storeTasks.length,
        completedTasks: completed,
        pendingTasks: storeTasks.length - completed,
        tasks: storeTasks,
      },
    };
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("readiness_tasks")
        .select("*")
        .eq("user_id", userId);

      if (!error && Array.isArray(data)) {
        const completed = data.filter((t: { completed: boolean }) => t.completed).length;
        return {
          success: true,
          summary: `Readiness status: ${completed}/${data.length} tasks completed.`,
          data: {
            totalTasks: data.length,
            completedTasks: completed,
            pendingTasks: data.length - completed,
            tasks: data,
          },
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    success: true,
    summary: "Readiness status retrieved.",
    data: {
      overallScore: 78,
      readinessCategory: "Ready for Mock Interviews",
      tasks: [],
    },
  };
};

/**
 * Fallback implementation of get_job_context
 */
const fallbackGetJobContext: AgentToolHandler = async (
  userId: string,
  args: { jobId?: string; role?: string },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
) => {
  if (supabase && args?.jobId) {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", args.jobId)
        .maybeSingle();

      if (!error && data) {
        return {
          success: true,
          summary: `Job context for ${data.title} at ${data.company}.`,
          data,
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    success: true,
    summary: `Job context for ${args?.role || "Backend SDE"} (ID: ${args?.jobId || "job-default"}).`,
    data: {
      jobId: args?.jobId || "job-default",
      role: args?.role || "Backend SDE 2",
      company: "Razorpay",
      requiredSkills: [
        "PostgreSQL",
        "Distributed Systems",
        "Kafka",
        "Redis",
        "Idempotency",
        "MVCC",
      ],
      description:
        "Architecting payment processing microservices with zero-loss idempotency and low-latency MySQL/PostgreSQL transaction isolation.",
    },
  };
};

// ─── UNIFIED REGISTRY EXPORT ────────────────────────────────────────────────

const customToolOverrides: Record<string, AgentToolHandler> = {};

/**
 * Allows Track 1 (Pratham) or testing harnesses to inject live read tools at runtime
 */
export function registerAgentTool(name: string, handler: AgentToolHandler): void {
  customToolOverrides[name] = handler;
}

/**
 * Returns the unified dictionary of all 6 tools ready for Sanchit's orchestrator.
 */
export function getAgentToolRegistry(): AgentToolRegistry {
  return {
    // Manan's Core Mutation Tools (Track 2)
    update_skill_evidence,
    inject_readiness_sprint,
    stage_resume_diff,

    // Pratham's Read Tools (Track 1 — using custom overrides or fallback stubs)
    get_skill_evidence: customToolOverrides.get_skill_evidence || fallbackGetSkillEvidence,
    get_readiness_status: customToolOverrides.get_readiness_status || fallbackGetReadinessStatus,
    get_job_context: customToolOverrides.get_job_context || fallbackGetJobContext,

    ...customToolOverrides,
  };
}

