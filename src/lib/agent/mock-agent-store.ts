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

// ─── Default Seed Data ───────────────────────────────────────────────────────
const DEFAULT_SKILL_MATRIX: SkillEvidenceItem[] = [
  {
    id: "se-1",
    skill_name: "TypeScript",
    claimed_level: "HIGH",
    verified_confidence: "HIGH",
    bluff_risk: false,
    evidence_log: [
      {
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        source: "Mock Interview: Frontend & Architecture",
        verdict: "Flawless demonstration of advanced generics, mapped types, and utility types",
        citation: "Implemented discriminated union state management with zero type assertions",
        score: 92,
      },
    ],
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "se-2",
    skill_name: "React & Next.js",
    claimed_level: "HIGH",
    verified_confidence: "HIGH",
    bluff_risk: false,
    evidence_log: [
      {
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
        source: "Mock Interview: React 19 & Next.js Server Components",
        verdict: "Accurate explanation of streaming, suspense boundaries, and server actions",
        citation: "Question: Explain cache boundaries in Next.js App Router",
        score: 88,
      },
    ],
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "se-3",
    skill_name: "Data Structures & Algorithms",
    claimed_level: "HIGH",
    verified_confidence: "HIGH",
    bluff_risk: false,
    evidence_log: [
      {
        timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
        source: "DSA Code Sandbox Evaluation",
        verdict: "Solved LRU Cache and Graph BFS within optimal time and space complexity",
        citation: "LeetCode Mediums: 48 solved; Optimal space/time proof submitted",
        score: 85,
      },
    ],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: "se-4",
    skill_name: "Node.js & Express",
    claimed_level: "HIGH",
    verified_confidence: "MEDIUM",
    bluff_risk: false,
    evidence_log: [
      {
        timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
        source: "Mock Interview: Backend Fundamentals",
        verdict: "Understands event loop phases and streams, but hesitated on cluster worker IPC",
        citation: "Question: How do worker threads communicate with main thread?",
        score: 78,
      },
    ],
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "se-5",
    skill_name: "PostgreSQL & Database Design",
    claimed_level: "HIGH",
    verified_confidence: "MEDIUM",
    bluff_risk: false,
    evidence_log: [
      {
        timestamp: new Date(Date.now() - 86400000 * 6).toISOString(),
        source: "Mock Interview: Relational Databases",
        verdict: "Good query indexing knowledge, minor confusion regarding isolation levels (Serializable vs Repeatable Read)",
        citation: "Explain phantom reads vs non-repeatable reads",
        score: 74,
      },
    ],
    updated_at: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: "se-6",
    skill_name: "REST API Design",
    claimed_level: "HIGH",
    verified_confidence: "HIGH",
    bluff_risk: false,
    evidence_log: [
      {
        timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
        source: "Resume Project Verification",
        verdict: "Demonstrated idempotency keys, pagination, and OpenAPI specification",
        citation: "Built E-Commerce API with standard HTTP response semantics",
        score: 90,
      },
    ],
    updated_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: "se-7",
    skill_name: "Redis & Distributed Caching",
    claimed_level: "HIGH",
    verified_confidence: "LOW",
    bluff_risk: true,
    evidence_log: [
      {
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: "Mock Interview: Scalability & Caching",
        verdict: "FAILED TO VERIFY CLAIM: Claimed High expertise on resume, but could not articulate cache stampede mitigation or eviction policies (LRU vs LFU)",
        citation: "Interviewer Question: How do you prevent dogpiling/thundering herd in Redis?",
        score: 42,
      },
    ],
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "se-8",
    skill_name: "System Design Trade-offs",
    claimed_level: "HIGH",
    verified_confidence: "UNVERIFIED",
    bluff_risk: true,
    evidence_log: [
      {
        timestamp: new Date(Date.now() - 86400000 * 8).toISOString(),
        source: "Resume Screener Heuristic",
        verdict: "UNVERIFIED HIGH CLAIM: Resume asserts distributed high-throughput architecture, but candidate has never completed a System Design mock interview",
        citation: "Resume Bullet: 'Architected distributed event-driven payment ledger'",
        score: 0,
      },
    ],
    updated_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
];

// Active Kanban applications in student pipeline
const DEFAULT_ACTIVE_APPLICATIONS = [
  {
    id: "app-stripe-01",
    company: "Stripe",
    title: "Software Engineer II (Backend)",
    status: "Interview",
    matchScore: 82,
    nextStep: "Technical Architecture & System Design Round",
    priority: "high",
  },
  {
    id: "app-notion-02",
    company: "Notion",
    title: "Full Stack Engineer",
    status: "Phone Screen",
    matchScore: 85,
    nextStep: "Engineering Manager Technical Screen",
    priority: "high",
  },
  {
    id: "app-linear-03",
    company: "Linear",
    title: "Product Engineer",
    status: "Applied",
    matchScore: 78,
    nextStep: "Take-Home Assessment Review",
    priority: "medium",
  },
];

// ─── Global State Container (Hot-Reload Safe) ────────────────────────────────
interface MockAgentStoreState {
  skillEvidenceMap: Map<string, SkillEvidenceItem[]>;
  agentRuns: AgentRunRecord[];
  agentApprovals: AgentApprovalRecord[];
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
    };
  }
  return globalForStore.__placementMockAgentStore;
}

// ─── Mock Store Helper Functions ─────────────────────────────────────────────

/**
 * Returns the candidate's skill evidence matrix, seeding default records if uninitialized.
 */
export function getMockSkillEvidence(userId: string): SkillEvidenceItem[] {
  const state = getStoreState();
  if (!state.skillEvidenceMap.has(userId)) {
    // Clone default seed for this user
    state.skillEvidenceMap.set(
      userId,
      DEFAULT_SKILL_MATRIX.map((s) => ({ ...s, user_id: userId }))
    );
  }
  return state.skillEvidenceMap.get(userId)!;
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
  const bluffRiskSkills = skills
    .filter((s) => s.bluff_risk || (s.claimed_level === "HIGH" && s.verified_confidence === "LOW"))
    .map((s) => s.skill_name);

  return {
    userId,
    profileSummary: {
      fullName: "Alex Rivera",
      targetRole: "Full Stack / Software Development Engineer",
      readinessScore: 74,
      graduationYear: 2026,
      college: "National Institute of Technology",
      branch: "Computer Science & Engineering",
    },
    skills,
    bluffRiskSkills,
    activeApplications: DEFAULT_ACTIVE_APPLICATIONS,
    recentInterviewWeaknesses: [
      {
        topic: "Redis & Distributed Caching",
        domain: "Scalability & Performance",
        score: 42,
        sessionDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        topic: "System Design Trade-offs",
        domain: "Architecture",
        score: 0,
        sessionDate: new Date(Date.now() - 86400000 * 8).toISOString(),
      },
    ],
    pendingReadinessTasksCount: 3,
    currentResumeSummary: {
      primaryResumeId: "res-primary-demo-01",
      fileName: "Alex_Rivera_Resume_2026.pdf",
      atsScore: 78,
      parsedHighlights: [
        "Full-Stack E-Commerce Platform with Next.js, Stripe, and PostgreSQL",
        "Open-source contributor to Developer CLI Tooling",
        "Coursework: Algorithms, Operating Systems, Database Management Systems",
      ],
    },
  };
}

/**
 * Resets the in-memory store to initial defaults. Useful for unit testing.
 */
export function resetMockAgentStore(): void {
  const state = getStoreState();
  state.skillEvidenceMap.clear();
  state.agentRuns = [];
  state.agentApprovals = [];
}

