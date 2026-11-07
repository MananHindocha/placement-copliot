/**
 * Track 2: Standalone Verification & Test Harness API
 * Owner: Manan
 *
 * Route: GET & POST /api/agent/test-track2
 *
 * Runs an isolated 5-part automated test suite verifying Track 2:
 * 1. Damped Ladder Math & Bluff Risk Detection (update_skill_evidence)
 * 2. Readiness Sprint Injection & Deduplication (inject_readiness_sprint)
 * 3. Grounded Resume Diff Staging — HITL Gate (stage_resume_diff)
 * 4. Approval Resolution — Approve & Mutate (resolveAgentApproval)
 * 5. Approval Resolution — Reject Rollback (resolveAgentApproval)
 *
 * Runs completely standalone without requiring Track 1 or Track 3 branches to merge.
 */

import { NextResponse } from "next/server";
import {
  update_skill_evidence,
  inject_readiness_sprint,
  stage_resume_diff,
  mockAgentStore,
  computeDampedConfidence,
  type ProposedBulletChange,
} from "@/lib/agent/tools-write";
import { resolveAgentApproval } from "@/lib/agent/approval-handler";

interface TestResult {
  testNumber: number;
  name: string;
  passed: boolean;
  details: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

export async function GET() {
  return handleRunTrack2Suite();
}

export async function POST() {
  return handleRunTrack2Suite();
}

async function handleRunTrack2Suite() {
  const startTime = Date.now();
  const testUserId = `test-user-manan-${Date.now()}`;
  const results: TestResult[] = [];

  // Reset mockAgentStore state for fresh test execution
  mockAgentStore.reset();

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1: Damped Ladder Math & Bluff Risk Detection
  // ───────────────────────────────────────────────────────────────────────────
  try {
    const skillName = "PostgreSQL Concurrency";

    // Sub-test A: Pure helper transition verification
    const pureNeg = computeDampedConfidence("UNVERIFIED", "NEGATIVE", "HIGH");
    if (pureNeg.nextTier !== "LOW" || !pureNeg.bluffRisk) {
      throw new Error(
        `Pure ladder failed: UNVERIFIED + NEGATIVE (claimed HIGH) expected { nextTier: 'LOW', bluffRisk: true }, got ${JSON.stringify(
          pureNeg
        )}`
      );
    }

    const purePos1 = computeDampedConfidence("LOW", "POSITIVE", "HIGH");
    if (purePos1.nextTier !== "MEDIUM" || purePos1.bluffRisk) {
      throw new Error(
        `Pure ladder failed: LOW + POSITIVE expected { nextTier: 'MEDIUM', bluffRisk: false }, got ${JSON.stringify(
          purePos1
        )}`
      );
    }

    const purePos2 = computeDampedConfidence("MEDIUM", "POSITIVE", "HIGH");
    if (purePos2.nextTier !== "HIGH" || purePos2.bluffRisk) {
      throw new Error(
        `Pure ladder failed: MEDIUM + POSITIVE expected { nextTier: 'HIGH', bluffRisk: false }, got ${JSON.stringify(
          purePos2
        )}`
      );
    }

    // Sub-test B: State mutation via tool handler
    // Step 1: Initial NEGATIVE verdict drops to LOW and triggers bluff_risk
    const step1 = await update_skill_evidence(testUserId, {
      skillName,
      verdict: "NEGATIVE",
      source: "MOCK_INTERVIEW",
      evidenceCitation: "Failed ACID isolation level probe in Q3 (dirty read scenario).",
    });

    if (
      step1.data.previousTier !== "UNVERIFIED" ||
      step1.data.nextTier !== "LOW" ||
      step1.data.bluffRisk !== true
    ) {
      throw new Error(
        `Step 1 failed: expected UNVERIFIED -> LOW with bluffRisk=true. Got: ${JSON.stringify(
          step1.data
        )}`
      );
    }

    // Step 2: First POSITIVE climbs to MEDIUM and clears bluff_risk
    const step2 = await update_skill_evidence(testUserId, {
      skillName,
      verdict: "POSITIVE",
      source: "MOCK_INTERVIEW",
      evidenceCitation: "Correctly explained MVCC and snapshot isolation trade-offs.",
    });

    if (
      step2.data.previousTier !== "LOW" ||
      step2.data.nextTier !== "MEDIUM" ||
      step2.data.bluffRisk !== false
    ) {
      throw new Error(
        `Step 2 failed: expected LOW -> MEDIUM with bluffRisk=false. Got: ${JSON.stringify(
          step2.data
        )}`
      );
    }

    // Step 3: Second POSITIVE climbs to HIGH
    const step3 = await update_skill_evidence(testUserId, {
      skillName,
      verdict: "POSITIVE",
      source: "READINESS_DRILL",
      evidenceCitation: "Optimized serializable transaction locks under high concurrency load.",
    });

    if (
      step3.data.previousTier !== "MEDIUM" ||
      step3.data.nextTier !== "HIGH" ||
      step3.data.bluffRisk !== false
    ) {
      throw new Error(
        `Step 3 failed: expected MEDIUM -> HIGH with bluffRisk=false. Got: ${JSON.stringify(
          step3.data
        )}`
      );
    }

    results.push({
      testNumber: 1,
      name: "Damped Ladder Math & Bluff Risk Detection",
      passed: true,
      details:
        "Verified 3-step damped transitions: UNVERIFIED -> LOW (bluff_risk: true) -> MEDIUM (bluff_risk: false) -> HIGH (bluff_risk: false).",
      data: {
        step1: step1.data,
        step2: step2.data,
        step3: step3.data,
      },
    });
  } catch (err) {
    results.push({
      testNumber: 1,
      name: "Damped Ladder Math & Bluff Risk Detection",
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2: Readiness Sprint Injection & Deduplication
  // ───────────────────────────────────────────────────────────────────────────
  try {
    const sprintTitle = "Razorpay Backend SDE-2 Prep";
    const tasks = [
      {
        title: "Master PostgreSQL MVCC & Isolation Levels",
        category: "Database & Concurrency",
        priority: "HIGH" as const,
        estimatedHours: 4,
        evidenceReason: "Candidate struggled with dirty read isolation probes in mock interview.",
      },
      {
        title: "Design Idempotency Key Middleware",
        category: "System Design",
        priority: "HIGH" as const,
        estimatedHours: 6,
        evidenceReason: "Required for Razorpay payment webhooks and duplicate prevention.",
      },
      {
        title: "Implement Redis Distributed Lock",
        category: "Coding & Low-Level Design",
        priority: "MEDIUM" as const,
        estimatedHours: 3,
        evidenceReason: "Avoid race conditions during concurrent inventory reservations.",
      },
    ];

    // First Injection: Inserts all 3 tasks
    const firstCall = await inject_readiness_sprint(testUserId, {
      sprintTitle,
      linkedJobId: "job-rzp-001",
      tasks,
    });

    if (firstCall.data.insertedCount !== 3 || firstCall.data.skippedDuplicates !== 0) {
      throw new Error(
        `First injection failed: expected insertedCount=3, skippedDuplicates=0. Got ${JSON.stringify(
          firstCall.data
        )}`
      );
    }

    // Second Injection: Exactly identical tasks should be deduplicated
    const secondCall = await inject_readiness_sprint(testUserId, {
      sprintTitle,
      linkedJobId: "job-rzp-001",
      tasks,
    });

    if (secondCall.data.insertedCount !== 0 || secondCall.data.skippedDuplicates !== 3) {
      throw new Error(
        `Second injection failed: expected insertedCount=0, skippedDuplicates=3. Got ${JSON.stringify(
          secondCall.data
        )}`
      );
    }

    results.push({
      testNumber: 2,
      name: "Readiness Sprint Injection & Deduplication",
      passed: true,
      details: `First call inserted ${firstCall.data.insertedCount} tasks; second identical call skipped ${secondCall.data.skippedDuplicates} duplicates.`,
      data: {
        firstCall: firstCall.data,
        secondCall: secondCall.data,
      },
    });
  } catch (err) {
    results.push({
      testNumber: 2,
      name: "Readiness Sprint Injection & Deduplication",
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3: Grounded Resume Diff Staging — HITL Gate
  // ───────────────────────────────────────────────────────────────────────────
  let stagedApprovalId = "";
  const proposedChanges: ProposedBulletChange[] = [
    {
      originalBullet: "Maintained legacy backend APIs with standard SQL queries.",
      proposedBullet:
        "Architected high-throughput payment APIs with PostgreSQL MVCC and connection pooling, reducing p99 latency by 45%.",
      verifiedSourceProject: "Payment Gateway Engine",
      keywordsAdded: ["PostgreSQL", "MVCC", "Connection Pooling", "p99 latency"],
    },
    {
      originalBullet: "Built prototype payment endpoint handling basic webhooks.",
      proposedBullet:
        "Engineered idempotent webhook consumer using Redis locks and Kafka topics, achieving zero double-charge incidents across 1M transactions.",
      verifiedSourceProject: "Payment Gateway Engine",
      keywordsAdded: ["Idempotency", "Redis", "Kafka", "Distributed Systems"],
    },
  ];

  try {
    const stageRes = await stage_resume_diff(testUserId, {
      jobId: "job-rzp-001",
      targetRole: "Backend SDE 2",
      proposedBulletChanges: proposedChanges,
    });

    if (stageRes.status !== "AWAITING_APPROVAL" || !stageRes.data.approvalId) {
      throw new Error(
        `Staging failed: expected status 'AWAITING_APPROVAL' with approvalId. Got ${JSON.stringify(
          stageRes
        )}`
      );
    }

    stagedApprovalId = stageRes.data.approvalId;

    // Verify approval record is PENDING in store
    const storedApproval = mockAgentStore.getApproval(stagedApprovalId);
    if (!storedApproval || storedApproval.status !== "PENDING") {
      throw new Error(
        `Approval record not found or not in PENDING state: ${JSON.stringify(storedApproval)}`
      );
    }

    // Verify master resume was NOT modified prematurely
    const currentResume = mockAgentStore.getResume(testUserId);
    const hasProposedText = currentResume?.experience?.some((e) =>
      e.bullets.some((b) => b.text.includes("Architected high-throughput payment APIs"))
    );

    if (hasProposedText) {
      throw new Error(
        "Human-in-the-Loop violation: Master resume was mutated before candidate approval!"
      );
    }

    results.push({
      testNumber: 3,
      name: "Grounded Resume Diff Staging — HITL Gate",
      passed: true,
      details: `Created PENDING approval record "${stagedApprovalId}" with ${stageRes.data.diffCount} diffs without prematurely mutating master resume.`,
      data: stageRes.data,
    });
  } catch (err) {
    results.push({
      testNumber: 3,
      name: "Grounded Resume Diff Staging — HITL Gate",
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 4: Approval Resolution — Approve & Mutate
  // ───────────────────────────────────────────────────────────────────────────
  try {
    if (!stagedApprovalId) {
      throw new Error("Skipped: Depends on Test 3 approvalId.");
    }

    const resolveRes = await resolveAgentApproval(testUserId, stagedApprovalId, "APPROVED");

    if (resolveRes.decision !== "APPROVED") {
      throw new Error(`Expected decision 'APPROVED', got ${resolveRes.decision}`);
    }

    // Verify approval status is now APPROVED
    const updatedApproval = mockAgentStore.getApproval(stagedApprovalId);
    if (updatedApproval?.status !== "APPROVED") {
      throw new Error(
        `Approval status not updated to APPROVED: ${JSON.stringify(updatedApproval)}`
      );
    }

    // Verify master resume NOW reflects the approved changes
    const updatedResume = mockAgentStore.getResume(testUserId);
    const foundReplacedBullet = updatedResume?.experience?.some((e) =>
      e.bullets.some((b) =>
        b.text.includes("Architected high-throughput payment APIs with PostgreSQL MVCC")
      )
    );

    if (!foundReplacedBullet) {
      throw new Error(
        `Master resume does not contain the approved bullet change! Resume: ${JSON.stringify(
          updatedResume
        )}`
      );
    }

    results.push({
      testNumber: 4,
      name: "Approval Resolution — Approve & Mutate",
      passed: true,
      details: `Approval "${stagedApprovalId}" marked APPROVED; master resume successfully mutated with approved bullets. New ATS Score: ${
        updatedResume?.atsScore || 75
      }.`,
      data: {
        approvalId: stagedApprovalId,
        atsScore: updatedResume?.atsScore,
        summary: resolveRes.appliedChangesSummary,
      },
    });
  } catch (err) {
    results.push({
      testNumber: 4,
      name: "Approval Resolution — Approve & Mutate",
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 5: Approval Resolution — Reject Rollback
  // ───────────────────────────────────────────────────────────────────────────
  try {
    const unapprovedClaim =
      "Spearheaded distributed Paxos consensus cluster from scratch single-handedly.";

    // Stage second diff with an ungrounded claim
    const secondDiff = await stage_resume_diff(testUserId, {
      jobId: "job-rzp-002",
      targetRole: "Principal Architect",
      proposedBulletChanges: [
        {
          originalBullet: "Assisted in production deployments and bug fixes.",
          proposedBullet: unapprovedClaim,
          verifiedSourceProject: "Consensus Engine Repo",
          keywordsAdded: ["Paxos", "Consensus", "Cluster"],
        },
      ],
    });

    const secondApprovalId = secondDiff.data.approvalId;

    // Resolve as REJECTED
    const rejectRes = await resolveAgentApproval(testUserId, secondApprovalId, "REJECTED");

    if (rejectRes.decision !== "REJECTED") {
      throw new Error(`Expected decision 'REJECTED', got ${rejectRes.decision}`);
    }

    const updatedApproval2 = mockAgentStore.getApproval(secondApprovalId);
    if (updatedApproval2?.status !== "REJECTED") {
      throw new Error(
        `Approval status not updated to REJECTED: ${JSON.stringify(updatedApproval2)}`
      );
    }

    // Verify master resume does NOT contain the rejected bullet
    const resumeAfterReject = mockAgentStore.getResume(testUserId);
    const containsUnapproved =
      JSON.stringify(resumeAfterReject).includes(unapprovedClaim);

    if (containsUnapproved) {
      throw new Error(
        "Rollback failure: Rejected bullet was found inside the master resume!"
      );
    }

    results.push({
      testNumber: 5,
      name: "Approval Resolution — Reject Rollback",
      passed: true,
      details: `Approval "${secondApprovalId}" marked REJECTED; master resume remained clean and untainted by rejected proposal.`,
      data: {
        approvalId: secondApprovalId,
        decision: "REJECTED",
        summary: rejectRes.appliedChangesSummary,
      },
    });
  } catch (err) {
    results.push({
      testNumber: 5,
      name: "Approval Resolution — Reject Rollback",
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // AGGREGATION & REPORT
  // ───────────────────────────────────────────────────────────────────────────
  const durationMs = Date.now() - startTime;
  const passedCount = results.filter((r) => r.passed).length;
  const allTestsPassed = passedCount === results.length;

  return NextResponse.json(
    {
      allTestsPassed,
      passedCount,
      totalTests: results.length,
      durationMs,
      timestamp: new Date().toISOString(),
      testUserId,
      results,
    },
    {
      status: allTestsPassed ? 200 : 500,
    }
  );
}

