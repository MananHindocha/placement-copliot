import { NextRequest, NextResponse } from "next/server";
import { DEMO_USER_SKILLS } from "@/lib/mock-data";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MatchInput {
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  jobTags: string[];
}

interface MatchResult {
  jobId: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchReason: string;
  fitLabel: "Strong Fit" | "Good Fit" | "Partial Fit" | "Low Fit";
}

// ─── In-memory cache (resets on redeploy) ────────────────────────────────────

const matchCache = new Map<string, MatchResult>();

// ─── Gemini-based scoring (optional, graceful fallback) ──────────────────────

async function scoreWithGemini(
  job: MatchInput,
  userSkills: string[],
  userTargetRole: string
): Promise<MatchResult | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `You are a job-match scoring engine. Given the student's skills and the job details, provide a match assessment.

Student Profile:
- Skills: ${userSkills.join(", ")}
- Target Role: ${userTargetRole}

Job Details:
- Title: ${job.jobTitle}
- Description (first 800 chars): ${job.jobDescription.slice(0, 800)}
- Tags/Skills: ${job.jobTags.join(", ")}

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "matchScore": <number 0-100>,
  "matchedSkills": [<array of skills from the student that match this job>],
  "missingSkills": [<array of skills the job requires that the student lacks, max 5>],
  "matchReason": "<one-line summary, max 120 chars>",
  "fitLabel": "<one of: Strong Fit, Good Fit, Partial Fit, Low Fit>"
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 300,
          },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      jobId: job.jobId,
      matchScore: Math.min(100, Math.max(0, parsed.matchScore ?? 50)),
      matchedSkills: parsed.matchedSkills || [],
      missingSkills: (parsed.missingSkills || []).slice(0, 5),
      matchReason: (parsed.matchReason || "").slice(0, 120),
      fitLabel: parsed.fitLabel || "Partial Fit",
    };
  } catch {
    return null;
  }
}

// ─── Heuristic-based scoring fallback ────────────────────────────────────────

function scoreHeuristic(
  job: MatchInput,
  userSkills: string[]
): MatchResult {
  const jdLower = `${job.jobTitle} ${job.jobDescription} ${job.jobTags.join(" ")}`.toLowerCase();
  const userSkillsLower = userSkills.map((s) => s.toLowerCase());

  const matchedSkills: string[] = [];
  const missingFromJob: string[] = [];

  // Check which user skills appear in the JD
  for (const skill of userSkills) {
    if (jdLower.includes(skill.toLowerCase())) {
      matchedSkills.push(skill);
    }
  }

  // Extract common tech keywords from JD that user doesn't have
  const techKeywords = [
    "React", "Angular", "Vue", "TypeScript", "JavaScript", "Python", "Java",
    "Go", "Rust", "C++", "Node.js", "Next.js", "GraphQL", "REST APIs",
    "SQL", "PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes",
    "AWS", "GCP", "Azure", "Machine Learning", "DevOps", "CI/CD",
    "Spring Boot", "Django", "Swift", "Kotlin", "Terraform", "Kafka",
  ];

  for (const kw of techKeywords) {
    if (
      jdLower.includes(kw.toLowerCase()) &&
      !userSkillsLower.includes(kw.toLowerCase())
    ) {
      missingFromJob.push(kw);
    }
  }

  // Calculate score
  const totalRelevant = matchedSkills.length + missingFromJob.length;
  let score: number;
  if (totalRelevant === 0) {
    score = 50; // neutral when we can't assess
  } else {
    score = Math.round((matchedSkills.length / totalRelevant) * 100);
  }

  // Bonus for title relevance
  const targetTitles = ["frontend", "full stack", "software engineer", "react", "developer"];
  const titleLower = job.jobTitle.toLowerCase();
  if (targetTitles.some((t) => titleLower.includes(t))) {
    score = Math.min(100, score + 8);
  }

  // Clamp
  score = Math.min(100, Math.max(10, score));

  const fitLabel: MatchResult["fitLabel"] =
    score >= 85 ? "Strong Fit" :
    score >= 70 ? "Good Fit" :
    score >= 50 ? "Partial Fit" :
    "Low Fit";

  const matchReason =
    matchedSkills.length > 0
      ? `${matchedSkills.length} of your skills match. ${missingFromJob.length > 0 ? `Missing: ${missingFromJob.slice(0, 2).join(", ")}.` : "Strong alignment."}`
      : "Limited skill overlap detected. Consider this as a stretch role.";

  return {
    jobId: job.jobId,
    matchScore: score,
    matchedSkills,
    missingSkills: missingFromJob.slice(0, 5),
    matchReason: matchReason.slice(0, 120),
    fitLabel,
  };
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const jobs: MatchInput[] = body.jobs || [];
    const userSkills: string[] = body.userSkills || DEMO_USER_SKILLS;
    const userTargetRole: string = body.userTargetRole || "Frontend Developer";

    if (jobs.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Check cache first, score only uncached jobs
    const uncachedJobs: MatchInput[] = [];
    const cachedResults: MatchResult[] = [];

    for (const job of jobs) {
      const cached = matchCache.get(job.jobId);
      if (cached) {
        cachedResults.push(cached);
      } else {
        uncachedJobs.push(job);
      }
    }

    // Score uncached jobs in parallel
    const scoringPromises = uncachedJobs.map(async (job) => {
      // Try Gemini first, fallback to heuristic
      const geminiResult = await scoreWithGemini(job, userSkills, userTargetRole);
      const result = geminiResult || scoreHeuristic(job, userSkills);

      // Cache the result
      matchCache.set(job.jobId, result);
      return result;
    });

    const newResults = await Promise.allSettled(scoringPromises);

    const allResults: MatchResult[] = [
      ...cachedResults,
      ...newResults
        .filter((r): r is PromiseFulfilledResult<MatchResult> => r.status === "fulfilled")
        .map((r) => r.value),
    ];

    return NextResponse.json({
      results: allResults,
      cached: cachedResults.length,
      scored: newResults.filter((r) => r.status === "fulfilled").length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Match scoring failed" },
      { status: 500 }
    );
  }
}
