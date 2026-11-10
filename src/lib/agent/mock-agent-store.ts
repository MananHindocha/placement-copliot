/**
 * Placement Co-pilot: In-Memory Mock Agent Store (Track 1)
 *
 * Provides a rich, realistic Career Digital Twin for Guest Mode and offline development.
 * Pre-seeds realistic student profiles with 2 bluff-risk skills (Redis & System Design),
 * active Kanban company pipelines, and interview telemetry evidence.
 */

import type {
  SkillEvidenceItem,
  StudentDigitalTwinSnapshot,
  AgentRunRecord,
  AgentApprovalRecord,
} from "./types";

// ─── Global State Container (Hot-Reload Safe) ────────────────────────────────
interface MockAgentStoreState {
  skillEvidenceMap: Map<string, SkillEvidenceItem[]>;
  agentRuns: AgentRunRecord[];
  agentApprovals: AgentApprovalRecord[];
  resumeMetadata?: Map<string, { fileName: string; atsScore?: number; candidateName?: string; targetRole?: string }>;
}

const globalForStore = globalThis as unknown as {
  __placementMockAgentStore?: MockAgentStoreState;
};

function getStoreState(): MockAgentStoreState {
  if (!globalForStore.__placementMockAgentStore) {
    globalForStore.__placementMockAgentStore = {
      skillEvidenceMap: new Map(),
      agentRuns: [],
      agentApprovals: [],
      resumeMetadata: new Map(),
    };
  }
  if (!globalForStore.__placementMockAgentStore.resumeMetadata) {
    globalForStore.__placementMockAgentStore.resumeMetadata = new Map();
  }
  return globalForStore.__placementMockAgentStore;
}

// ─── Mock Store Helper Functions ─────────────────────────────────────────────

/**
 * Returns the candidate's skill evidence matrix from the in-memory store.
 * Returns an empty array if uninitialized.
 */
export function getMockSkillEvidence(userId: string): SkillEvidenceItem[] {
  const state = getStoreState();
  if (state.skillEvidenceMap.has(userId)) {
    return state.skillEvidenceMap.get(userId)!;
  }

  // Pure Zero State: Return empty array when no resume has been uploaded
  return [];
}

/**
 * Inserts or updates a skill in the student's evidence matrix.
 */
export function upsertMockSkillEvidence(
  userId: string,
  skillUpdate: Partial<SkillEvidenceItem> & { skill_name: string }
): SkillEvidenceItem {
  const currentSkills = getMockSkillEvidence(userId);
  const existingIndex = currentSkills.findIndex(
    (s) => s.skill_name.trim().toLowerCase() === skillUpdate.skill_name.trim().toLowerCase()
  );

  if (existingIndex >= 0) {
    const existing = currentSkills[existingIndex];
    const updated: SkillEvidenceItem = {
      ...existing,
      ...skillUpdate,
      evidence_log: [
        ...(skillUpdate.evidence_log || []),
        ...existing.evidence_log,
      ].slice(0, 10), // keep latest 10 evidence logs
      updated_at: new Date().toISOString(),
    };
    currentSkills[existingIndex] = updated;
    return updated;
  }

  const newSkill: SkillEvidenceItem = {
    id: `se-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    skill_name: skillUpdate.skill_name,
    claimed_level: skillUpdate.claimed_level || "MEDIUM",
    verified_confidence: skillUpdate.verified_confidence || "UNVERIFIED",
    bluff_risk: skillUpdate.bluff_risk ?? false,
    evidence_log: skillUpdate.evidence_log || [],
    updated_at: new Date().toISOString(),
  };

  currentSkills.push(newSkill);
  return newSkill;
}

/**
 * Retrieves the latest agent execution runs for a user.
 */
export function getMockAgentRuns(userId: string, limit = 10): AgentRunRecord[] {
  const state = getStoreState();
  return state.agentRuns
    .filter((r) => r.user_id === userId || userId === "guest-demo-user")
    .slice(0, limit);
}

/**
 * Inserts a new execution run record.
 */
export function insertMockAgentRun(run: AgentRunRecord): AgentRunRecord {
  const state = getStoreState();
  state.agentRuns.unshift(run);
  return run;
}

/**
 * Updates an existing agent execution run.
 */
export function updateMockAgentRun(
  runId: string,
  updates: Partial<AgentRunRecord>
): AgentRunRecord | null {
  const state = getStoreState();
  const run = state.agentRuns.find((r) => r.id === runId);
  if (!run) return null;

  Object.assign(run, updates, { updated_at: new Date().toISOString() });
  return run;
}

/**
 * Retrieves pending or filtered agent approvals.
 */
export function getMockAgentApprovals(
  userId: string,
  status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING"
): AgentApprovalRecord[] {
  const state = getStoreState();
  return state.agentApprovals.filter(
    (a) => (a.user_id === userId || userId === "guest-demo-user") && a.status === status
  );
}

/**
 * Inserts a new approval request into the store.
 */
export function insertMockAgentApproval(approval: AgentApprovalRecord): AgentApprovalRecord {
  const state = getStoreState();
  state.agentApprovals.unshift(approval);
  return approval;
}

/**
 * Resolves a pending agent approval.
 */
export function resolveMockAgentApproval(
  approvalId: string,
  decision: "APPROVED" | "REJECTED"
): AgentApprovalRecord | null {
  const state = getStoreState();
  const approval = state.agentApprovals.find((a) => a.id === approvalId);
  if (!approval) return null;

  approval.status = decision;
  approval.resolved_at = new Date().toISOString();

  // If this approval was linked to a run, update the run status as well
  if (approval.run_id) {
    const parentRun = state.agentRuns.find((r) => r.id === approval.run_id);
    if (parentRun && parentRun.status === "AWAITING_APPROVAL") {
      parentRun.status = "COMPLETED";
      parentRun.final_summary = `${parentRun.final_summary || ""} [User ${decision} staged action: ${approval.action_type}]`;
      parentRun.updated_at = new Date().toISOString();
    }
  }

  return approval;
}

/**
 * Generates a complete StudentDigitalTwinSnapshot for Guest Mode.
 */
export function getMockStudentDigitalTwin(userId: string): StudentDigitalTwinSnapshot {
  const skills = getMockSkillEvidence(userId);
  const state = getStoreState();
  const meta = state.resumeMetadata?.get(userId);

  if (skills.length === 0) {
    // Pure Zero State!
    return {
      userId,
      profileSummary: {
        fullName: "Candidate",
        targetRole: "Target Role Not Set",
        readinessScore: 0,
        graduationYear: 2026,
        college: "Engineering College",
        branch: "Computer Science",
      },
      skills: [],
      bluffRiskSkills: [],
      activeApplications: [],
      recentInterviewWeaknesses: [],
      pendingReadinessTasksCount: 0,
      currentResumeSummary: undefined,
    };
  }

  const bluffRiskSkills = skills
    .filter((s) => s.bluff_risk || (s.claimed_level === "HIGH" && s.verified_confidence === "LOW"))
    .map((s) => s.skill_name);

  const candidateName = meta?.candidateName || "Candidate";
  const targetRole = meta?.targetRole || "Software Engineer";
  const verifiedCount = skills.filter((s) => s.verified_confidence === "HIGH").length;
  const computedScore = Math.min(Math.round((verifiedCount / Math.max(skills.length, 1)) * 100), 100) || 75;
  const atsScore = meta?.atsScore || computedScore;
  const fileName = meta?.fileName || "Uploaded Resume.pdf";

  return {
    userId,
    profileSummary: {
      fullName: candidateName,
      targetRole,
      readinessScore: atsScore,
      graduationYear: 2026,
      college: "Engineering College",
      branch: "Computer Science",
    },
    skills,
    bluffRiskSkills,
    activeApplications: [],
    recentInterviewWeaknesses: [],
    pendingReadinessTasksCount: bluffRiskSkills.length,
    currentResumeSummary: {
      primaryResumeId: "real-resume-01",
      fileName,
      atsScore,
      parsedHighlights: skills.slice(0, 3).map((s) => `${s.skill_name}: Verified competency`),
    },
  };
}

/**
 * Synchronizes Career Digital Twin from resume upload (Bootstrap Step 1).
 */
export function syncMockDigitalTwinFromResume(
  userId: string,
  fileName?: string,
  rawSkills?: any[],
  metadata?: { atsScore?: number; candidateName?: string; targetRole?: string }
): SkillEvidenceItem[] {
  const state = getStoreState();
  const activeFileName = fileName || "Uploaded Resume.pdf";

  if (state.resumeMetadata) {
    state.resumeMetadata.set(userId, {
      fileName: activeFileName,
      atsScore: metadata?.atsScore || 75,
      candidateName: metadata?.candidateName || "Candidate",
      targetRole: metadata?.targetRole || "Software Engineer",
    });
  }

  if (Array.isArray(rawSkills) && rawSkills.length > 0) {
    const refreshed: SkillEvidenceItem[] = rawSkills.map((s: any, idx: number) => {
      const name = typeof s === "string" ? s : s?.name || `Skill ${idx + 1}`;
      const strength =
        typeof s === "object" && s?.strength
          ? s.strength
          : idx < 4
          ? "Verified Strong"
          : idx < 8
          ? "Good Foundation"
          : "Needs Practice";
      const claimedLevel =
        strength === "Verified Strong" ? "HIGH" : strength === "Good Foundation" ? "MEDIUM" : "LOW";
      const verifiedConfidence =
        strength === "Verified Strong" ? "HIGH" : strength === "Good Foundation" ? "MEDIUM" : "LOW";
      const isBluffRisk = strength === "Needs Practice";

      return {
        id: `se-real-${idx + 1}`,
        user_id: userId,
        skill_name: name,
        claimed_level: claimedLevel,
        verified_confidence: verifiedConfidence,
        bluff_risk: isBluffRisk,
        evidence_log: [
          {
            timestamp: new Date().toISOString(),
            source: `Resume Ingestion (${activeFileName})`,
            verdict: typeof s === "object" && s?.reason ? s.reason : "Verified skill extracted from resume",
            citation: `Extracted from parsed resume projects and skills in ${activeFileName}.`,
            score: strength === "Verified Strong" ? 90 : strength === "Good Foundation" ? 75 : 45,
          },
        ],
        updated_at: new Date().toISOString(),
      };
    });
    state.skillEvidenceMap.set(userId, refreshed);
    return refreshed;
  }

  // If no explicit skills passed, store empty array
  state.skillEvidenceMap.set(userId, []);
  return [];
}

/**
 * Scout and seed pipeline — returns empty array so fake companies are never seeded.
 */
export async function scoutAndSeedPipeline(): Promise<any[]> {
  return [];
}

/**
 * Tones down a bluff risk claim on the resume to defensible 'MEDIUM' working knowledge.
 */
export function toneDownMockSkillClaim(
  userId: string,
  skillName: string,
  defensibleRewrite?: string
): SkillEvidenceItem | null {
  const skills = getMockSkillEvidence(userId);
  const target = skills.find(
    (s) => s.skill_name.trim().toLowerCase() === skillName.trim().toLowerCase()
  );

  if (!target) return null;

  target.claimed_level = "MEDIUM";
  target.bluff_risk = false;
  target.updated_at = new Date().toISOString();

  target.evidence_log = [
    {
      timestamp: new Date().toISOString(),
      source: "Agent Defense Remediation (Recalibration)",
      verdict: "HONEST RECALIBRATION: Claim adjusted from High (Expert) to Medium (Working Knowledge) to eliminate interview bluff risk.",
      citation: defensibleRewrite || "Recalibrated bullet point to defensible production application experience.",
      score: 75,
    },
    ...target.evidence_log,
  ].slice(0, 10);

  return target;
}

/**
 * Resets the in-memory store to initial defaults. Useful for unit testing.
 */
export function resetMockAgentStore(): void {
  const state = getStoreState();
  state.skillEvidenceMap.clear();
  state.agentRuns = [];
  state.agentApprovals = [];
  state.resumeMetadata?.clear();
}

