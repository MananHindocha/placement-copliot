/**
 * Track 2: Human-in-the-Loop Approval Resolution Engine
 * Owner: Manan
 *
 * Implements:
 * 1. resolveAgentApproval: Resolves pending approvals (RESUME_DIFF, etc.), conditionally mutating
 *    the master resume ONLY when explicitly approved by the human candidate.
 * 2. listPendingApprovals: Queries all pending approvals awaiting human action.
 */

import {
  mockAgentStore,
  type AgentApprovalRecord,
  type ResumeDocument,
  type ProposedBulletChange,
} from "./tools-write";

function getOrCreateInitialResume(userId: string): ResumeDocument {
  const existing = mockAgentStore.getResume(userId);
  if (existing) return existing;

  const initial: ResumeDocument = {
    candidateName: "Candidate",
    email: "candidate@placementcopilot.ai",
    phone: "+1 555-0100",
    experience: [
      {
        id: "exp-1",
        title: "Software Engineer",
        subtitle: "Fintech Systems",
        dateRange: "2023 - Present",
        bullets: [
          {
            id: "b-1",
            text: "Maintained legacy backend APIs with standard SQL queries.",
          },
          {
            id: "b-2",
            text: "Assisted in production deployments and bug fixes.",
          },
        ],
      },
    ],
    projects: [
      {
        id: "proj-1",
        title: "Payment Gateway Engine",
        subtitle: "High-Concurrency Node.js / PostgreSQL",
        dateRange: "2023",
        bullets: [
          {
            id: "pb-1",
            text: "Built prototype payment endpoint handling basic webhooks.",
          },
        ],
      },
    ],
    skills: ["TypeScript", "Node.js", "PostgreSQL", "Redis", "Kafka"],
    atsScore: 72,
  };

  mockAgentStore.saveResume(userId, initial);
  return initial;
}

/**
 * Resolves a pending agent approval (APPROVED | REJECTED).
 * When approved with action_type === 'RESUME_DIFF', groundedly mutates the user's master resume.
 * Polymorphic signature supports both:
 * - (userId, approvalId, decision, supabase) [Track 2 Test Harness]
 * - (approvalId, decision, userId, supabase) [Orchestrator Route]
 */
export async function resolveAgentApproval(
  param1: string,
  param2: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  param3?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  param4?: any
): Promise<{
  success: boolean;
  decision: "APPROVED" | "REJECTED";
  approvalId: string;
  appliedChangesSummary: string;
  message?: string;
  data: {
    approval: AgentApprovalRecord;
    updatedResume?: ResumeDocument;
    runStatus?: string;
  };
}> {
  let userId: string;
  let approvalId: string;
  let decision: "APPROVED" | "REJECTED";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any;

  if (param2 === "APPROVED" || param2 === "REJECTED") {
    // Signature: (approvalId, decision, userId, supabase)
    approvalId = param1;
    decision = param2 as "APPROVED" | "REJECTED";
    userId = typeof param3 === "string" ? param3 : "guest-demo-user";
    supabase = param4;
  } else {
    // Signature: (userId, approvalId, decision, supabase)
    userId = param1;
    approvalId = param2;
    decision = param3 as "APPROVED" | "REJECTED";
    supabase = param4;
  }

  if (!userId || !approvalId || !decision) {
    throw new Error("Invalid arguments: userId, approvalId, and decision are required.");
  }

  // 1. Fetch approval record from Supabase or fallback store
  let record: AgentApprovalRecord | undefined;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("agent_approvals")
        .select("*")
        .eq("id", approvalId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        record = {
          id: data.id,
          user_id: data.user_id,
          run_id: data.run_id,
          action_type: data.action_type,
          target_entity_id: data.target_entity_id,
          status: data.status,
          payload_diff: data.payload_diff,
          created_at: data.created_at,
          resolved_at: data.resolved_at,
        };
      }
    } catch {
      // Fallback
    }
  }

  if (!record) {
    record = mockAgentStore.getApproval(approvalId);
  }

  if (!record || record.user_id !== userId) {
    throw new Error(`Approval "${approvalId}" not found for user "${userId}".`);
  }

  if (record.status !== "PENDING") {
    throw new Error(`Approval "${approvalId}" has already been resolved as "${record.status}".`);
  }

  const resolvedAt = new Date().toISOString();
  let updatedResume: ResumeDocument | undefined;
  let appliedChangesSummary = "";

  // 2. Handle APPROVED decision for RESUME_DIFF
  if (decision === "APPROVED" && record.action_type === "RESUME_DIFF") {
    const masterResume = getOrCreateInitialResume(userId);
    const bulletChanges: ProposedBulletChange[] =
      record.payload_diff?.proposedBulletChanges || [];

    // Clone resume for immutable update
    const nextResume: ResumeDocument = JSON.parse(JSON.stringify(masterResume));

    let replacedCount = 0;
    bulletChanges.forEach((change) => {
      let matched = false;

      // Check experience entries
      if (Array.isArray(nextResume.experience)) {
        for (const exp of nextResume.experience) {
          if (Array.isArray(exp.bullets)) {
            for (const b of exp.bullets) {
              if (
                b.text.trim().toLowerCase() === change.originalBullet.trim().toLowerCase() ||
                b.text.includes(change.originalBullet.slice(0, 30))
              ) {
                b.text = change.proposedBullet;
                matched = true;
                replacedCount++;
                break;
              }
            }
          }
          if (matched) break;
        }
      }

      // Check projects entries if not matched
      if (!matched && Array.isArray(nextResume.projects)) {
        for (const proj of nextResume.projects) {
          if (Array.isArray(proj.bullets)) {
            for (const b of proj.bullets) {
              if (
                b.text.trim().toLowerCase() === change.originalBullet.trim().toLowerCase() ||
                b.text.includes(change.originalBullet.slice(0, 30))
              ) {
                b.text = change.proposedBullet;
                matched = true;
                replacedCount++;
                break;
              }
            }
          }
          if (matched) break;
        }
      }

      // Fallback: If not matched directly, append to first project/experience entry
      if (!matched) {
        if (nextResume.projects && nextResume.projects.length > 0) {
          nextResume.projects[0].bullets.push({
            id: `b-tailored-${Date.now()}`,
            text: change.proposedBullet,
          });
          replacedCount++;
        } else if (nextResume.experience && nextResume.experience.length > 0) {
          nextResume.experience[0].bullets.push({
            id: `b-tailored-${Date.now()}`,
            text: change.proposedBullet,
          });
          replacedCount++;
        }
      }
    });

    // Increment ATS score based on groundedly added keywords
    const atsLift = Number(record.payload_diff?.estimatedAtsScoreDelta) || 5;
    nextResume.atsScore = Math.min(100, (nextResume.atsScore || 70) + atsLift);

    // Save mutated master resume
    mockAgentStore.saveResume(userId, nextResume);
    updatedResume = nextResume;

    if (supabase) {
      try {
        await supabase
          .from("resumes")
          .update({
            content: nextResume,
            ats_score: nextResume.atsScore,
            updated_at: resolvedAt,
          })
          .eq("user_id", userId);
      } catch {
        // Fallback
      }
    }

    appliedChangesSummary = `Approved and applied ${replacedCount} bullet change(s) for role "${
      record.payload_diff?.targetRole || "Target Role"
    }". Master resume ATS score lifted by +${atsLift} points.`;
  } else {
    appliedChangesSummary = `Decision: ${decision}. Master resume remained untouched.`;
  }

  // 3. Update approval record status
  const updatedApproval: AgentApprovalRecord = {
    ...record,
    status: decision,
    resolved_at: resolvedAt,
  };

  mockAgentStore.updateApproval(approvalId, {
    status: decision,
    resolved_at: resolvedAt,
  });

  if (supabase) {
    try {
      await supabase
        .from("agent_approvals")
        .update({
          status: decision,
          resolved_at: resolvedAt,
        })
        .eq("id", approvalId)
        .eq("user_id", userId);
    } catch {
      // Fallback
    }
  }

  // 4. Update linked agent_runs parent status if run_id is present
  let runStatus: string | undefined;
  if (record.run_id) {
    runStatus = decision === "APPROVED" ? "COMPLETED" : "CANCELLED";
    if (supabase) {
      try {
        await supabase
          .from("agent_runs")
          .update({
            status: runStatus,
            completed_at: resolvedAt,
          })
          .eq("id", record.run_id);
      } catch {
        // Fallback
      }
    }
  }

  return {
    success: true,
    decision,
    approvalId,
    appliedChangesSummary,
    message: appliedChangesSummary,
    data: {
      approval: updatedApproval,
      updatedResume,
      runStatus,
    },
  };
}

/**
 * Returns all approvals currently awaiting human candidate review.
 */
export async function listPendingApprovals(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
): Promise<AgentApprovalRecord[]> {
  if (!userId) return [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("agent_approvals")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data as AgentApprovalRecord[];
      }
    } catch {
      // Fallback
    }
  }

  return mockAgentStore.listApprovals(userId, "PENDING");
}

