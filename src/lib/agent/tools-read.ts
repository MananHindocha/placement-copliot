import type {
  ConfidenceTier,
  SkillEvidenceItem,
  StudentDigitalTwinSnapshot,
  ToolExecutionResult,
} from "./types";
import { createPersistentFallbackDbClient } from "./orchestrator";

function getDb(passedClient?: any) {
  if (passedClient) return passedClient;
  return createPersistentFallbackDbClient();
}

const CONFIDENCE_WEIGHTS: Record<ConfidenceTier, number> = {
  HIGH: 100,
  MEDIUM: 70,
  UNVERIFIED: 40,
  LOW: 20,
};

function extractSkillsFromText(rawText: string): string[] {
  if (!rawText || typeof rawText !== "string") return [];
  const commonTechTokens = [
    "TypeScript", "JavaScript", "Python", "Java", "C++", "Go", "Rust", "SQL",
    "React", "Next.js", "Node.js", "Express", "FastAPI", "Django", "Spring Boot",
    "PostgreSQL", "MongoDB", "MySQL", "Redis", "Docker", "Kubernetes", "AWS",
    "GCP", "GraphQL", "REST API", "System Design", "Data Structures", "Algorithms",
    "Git", "Linux", "CI/CD", "Kafka", "Microservices", "Tailwind CSS", "PyTorch", "TensorFlow"
  ];
  const lower = rawText.toLowerCase();
  return commonTechTokens.filter((token) => lower.includes(token.toLowerCase()));
}

export async function get_student_twin_context(
  userId: string,
  _args: Record<string, any> = {},
  supabase?: any
): Promise<ToolExecutionResult<StudentDigitalTwinSnapshot>> {
  const db = getDb(supabase);

  const [
    { data: profileRow },
    { data: resumeRow },
    { data: matrixRows },
    { data: appRows },
    { data: taskRows },
    { data: interviewRows },
  ] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).maybeSingle(),
    db.from("resumes").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("skill_evidence_matrix").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    db.from("applications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("readiness_tasks").select("*").eq("user_id", userId),
    db.from("interview_sessions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);

  const skills: SkillEvidenceItem[] = (matrixRows || []).map((r: any) => ({
    skill_name: r.skill_name,
    claimed_level: r.claimed_level,
    verified_confidence: r.verified_confidence,
    bluff_risk: Boolean(r.bluff_risk),
    evidence_log: Array.isArray(r.evidence_log) ? r.evidence_log : [],
  }));

  const bluffRiskSkills = skills.filter((s) => s.bluff_risk).map((s) => s.skill_name);
  const totalTasks = (taskRows || []).length;
  const completedTasks = (taskRows || []).filter((t: any) => t.completed || t.status === "COMPLETED" || t.is_completed).length;

  let readinessScore = 0;
  if (skills.length > 0) {
    const avgSkillScore =
      skills.reduce((acc, s) => acc + (CONFIDENCE_WEIGHTS[s.verified_confidence] ?? 40), 0) / skills.length;
    const milestoneScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : avgSkillScore;
    readinessScore = Math.round(avgSkillScore * 0.65 + milestoneScore * 0.35);
  }

  const targetRole = profileRow?.target_role || resumeRow?.target_role || "";

  const snapshot: StudentDigitalTwinSnapshot = {
    userId,
    profileSummary: {
      fullName: profileRow?.full_name || "Candidate",
      targetRole,
      readinessScore,
      graduationYear: profileRow?.graduation_year,
      college: profileRow?.college,
      branch: profileRow?.branch,
    },
    targetRole,
    readinessScore,
    atsScore: typeof resumeRow?.ats_score === "number" ? resumeRow.ats_score : null,
    skills,
    bluffRiskSkills,
    activeApplications: appRows || [],
    recentInterviewWeaknesses: (interviewRows || [])
      .filter((i: any) => typeof i.score === "number" && i.score < 65)
      .map((i: any) => ({
        topic: i.topic || i.role || "General Technical",
        score: i.score,
        sessionDate: i.created_at,
      })),
    pendingReadinessTasksCount: totalTasks - completedTasks,
    currentResumeSummary: resumeRow
      ? {
          primaryResumeId: resumeRow.id,
          fileName: resumeRow.file_name,
          atsScore: resumeRow.ats_score,
          parsedHighlights: [],
        }
      : undefined,
  } as any;

  return {
    success: true,
    summary:
      skills.length > 0
        ? `Loaded ${skills.length} verified/claimed skills (${bluffRiskSkills.length} bluff risks) and ${(appRows || []).length} applications. Readiness: ${readinessScore}%.`
        : "Student Digital Twin is empty (0 skills extracted). Upload a resume to initialize skills.",
    data: snapshot,
  };
}

export async function analyze_job_gap(
  userId: string,
  args: { jobId: string; jobDescription?: string; requiredSkills?: string[] },
  supabase?: any
): Promise<ToolExecutionResult> {
  const db = getDb(supabase);

  const [{ data: matrixRows }, { data: appRow }, { data: listingRow }] = await Promise.all([
    db.from("skill_evidence_matrix").select("*").eq("user_id", userId),
    db.from("applications").select("*").eq("id", args.jobId).maybeSingle(),
    db.from("job_listings").select("*").eq("id", args.jobId).maybeSingle(),
  ]);

  const targetRecord = listingRow || appRow;
  if (!targetRecord && (!args.requiredSkills || args.requiredSkills.length === 0) && !args.jobDescription) {
    return {
      success: false,
      summary: `Job record "${args.jobId}" not found in applications or job_listings, and no requiredSkills were provided.`,
      data: { found: false, jobId: args.jobId },
    };
  }

  const rawRequiredSkills: string[] =
    Array.isArray(args.requiredSkills) && args.requiredSkills.length > 0
      ? args.requiredSkills
      : Array.isArray(targetRecord?.required_skills)
      ? targetRecord.required_skills
      : Array.isArray(targetRecord?.skills)
      ? targetRecord.skills
      : extractSkillsFromText(
          `${targetRecord?.title || ""} ${targetRecord?.role || ""} ${targetRecord?.description || ""} ${targetRecord?.notes || ""} ${args.jobDescription || ""}`
        );

  if (rawRequiredSkills.length === 0) {
    return {
      success: false,
      summary: `Could not extract explicit technical skill requirements from job "${targetRecord?.company || args.jobId}". Provide a job description with technical requirements.`,
      data: { jobId: args.jobId, requiredSkills: [] },
    };
  }

  const userSkillMap = new Map<string, any>();
  for (const row of matrixRows || []) {
    userSkillMap.set(String(row.skill_name).toLowerCase(), row);
  }

  const verifiedMatches: string[] = [];
  const bluffRiskWarnings: string[] = [];
  const unverifiedClaims: string[] = [];
  const missingSkills: string[] = [];

  for (const reqSkill of rawRequiredSkills) {
    const match =
      userSkillMap.get(reqSkill.toLowerCase()) ||
      Array.from(userSkillMap.entries()).find(
        ([k]) => k.includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(k)
      )?.[1];

    if (!match) {
      missingSkills.push(reqSkill);
    } else if (match.bluff_risk || match.verified_confidence === "LOW") {
      bluffRiskWarnings.push(reqSkill);
    } else if (match.verified_confidence === "UNVERIFIED") {
      unverifiedClaims.push(reqSkill);
    } else {
      verifiedMatches.push(reqSkill);
    }
  }

  const matchPercentage = Math.round((verifiedMatches.length / rawRequiredSkills.length) * 100);

  return {
    success: true,
    summary: `Gap analysis for ${targetRecord?.company || "Target Role"}: ${matchPercentage}% verified match (${verifiedMatches.length}/${rawRequiredSkills.length}). Missing: [${missingSkills.join(", ") || "None"}], Bluff Risks: [${bluffRiskWarnings.join(", ") || "None"}].`,
    data: {
      jobId: args.jobId,
      company: targetRecord?.company || "Target Company",
      role: targetRecord?.title || targetRecord?.role || "Target Role",
      matchPercentage,
      verifiedMatches,
      bluffRiskWarnings,
      unverifiedClaims,
      missingSkills,
    },
  };
}

export async function optimize_multi_company_overlap(
  userId: string,
  args: { activeApplicationIds?: string[] } = {},
  supabase?: any
): Promise<ToolExecutionResult> {
  const db = getDb(supabase);

  let query = db.from("applications").select("*").eq("user_id", userId);
  if (Array.isArray(args.activeApplicationIds) && args.activeApplicationIds.length > 0) {
    query = query.in("id", args.activeApplicationIds);
  }

  const [{ data: apps }, { data: matrixRows }] = await Promise.all([
    query,
    db.from("skill_evidence_matrix").select("*").eq("user_id", userId),
  ]);

  if (!apps || apps.length < 2) {
    return {
      success: false,
      summary: `Portfolio overlap optimization requires at least 2 tracked job applications in Supabase (currently found ${apps?.length ?? 0}). Add or scout jobs first.`,
      data: { activeApplicationsCount: apps?.length ?? 0, overlappingTopics: [] },
    };
  }

  const userSkillMap = new Map<string, any>();
  for (const r of matrixRows || []) {
    userSkillMap.set(String(r.skill_name).toLowerCase(), r);
  }

  const stageUrgencyWeight: Record<string, number> = {
    interview: 4,
    interviewing: 4,
    oa: 3,
    "applied & oa": 3,
    applied: 2,
    saved: 1,
    wishlist: 1,
  };

  const skillCoverageMap = new Map<
    string,
    { skill: string; companies: Set<string>; maxUrgency: number; weaknessMultiplier: number }
  >();

  for (const app of apps) {
    const extracted =
      Array.isArray(app.required_skills) && app.required_skills.length > 0
        ? app.required_skills
        : extractSkillsFromText(`${app.title || ""} ${app.role || ""} ${app.notes || ""} ${app.description || ""}`);

    const stageKey = String(app.status || app.stage || "saved").toLowerCase();
    const urgency = stageUrgencyWeight[stageKey] ?? 2;

    for (const skill of extracted) {
      const existing = skillCoverageMap.get(skill.toLowerCase());
      const matrixEntry = userSkillMap.get(skill.toLowerCase());
      const weaknessMultiplier = !matrixEntry
        ? 3 // Completely missing from user profile
        : matrixEntry.bluff_risk || matrixEntry.verified_confidence === "LOW"
        ? 3 // Active bluff risk
        : matrixEntry.verified_confidence === "UNVERIFIED"
        ? 2
        : 1;

      if (!existing) {
        skillCoverageMap.set(skill.toLowerCase(), {
          skill,
          companies: new Set([app.company || app.title || "Application"]),
          maxUrgency: urgency,
          weaknessMultiplier,
        });
      } else {
        existing.companies.add(app.company || app.title || "Application");
        existing.maxUrgency = Math.max(existing.maxUrgency, urgency);
      }
    }
  }

  const rankedTopics = Array.from(skillCoverageMap.values())
    .map((item) => ({
      skill: item.skill,
      companyCount: item.companies.size,
      companiesCovered: Array.from(item.companies),
      leverageScore: item.companies.size * item.maxUrgency * item.weaknessMultiplier,
    }))
    .sort((a, b) => b.leverageScore - a.leverageScore)
    .slice(0, 6);

  return {
    success: true,
    summary:
      rankedTopics.length > 0
        ? `Computed cross-company skill overlap across ${apps.length} real applications. Top leverage topic: ${rankedTopics[0].skill} (covers ${rankedTopics[0].companiesCovered.join(", ")}).`
        : `Analyzed ${apps.length} applications, but no technical skill keywords were present in their descriptions.`,
    data: {
      activeApplicationsCount: apps.length,
      overlappingTopics: rankedTopics,
    },
  };
}
