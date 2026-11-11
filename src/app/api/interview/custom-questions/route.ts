import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GUEST_PERSISTENT_UUID = "00000000-0000-0000-0000-000000000001";

interface SkillMatrixRow {
  skill_name: string;
  verified_confidence?: string;
  bluff_risk?: boolean;
}

interface SynthesizedQuestion {
  id: string;
  category: string;
  difficulty: "Medium" | "Hard";
  question: string;
  whyAskedForThisJD: string;
  keyExpectedConcepts: string[];
  interviewerHint: string;
  sampleStarAnswer: string;
  followUpProbe: string;
}

interface SynthesizedBlueprint {
  synthesisSummary: string;
  criticalSkillGapsDetected: string[];
  questions: SynthesizedQuestion[];
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim();
  if (!url || !key || url.includes("your-project-id") || key.includes("your-supabase")) {
    throw new Error(
      "SUPABASE_CONFIG_MISSING: Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY in .env.local."
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function resolveUserId(rawUserId?: string): { userId: string; isGuest: boolean } {
  const isUuid = Boolean(
    rawUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawUserId)
  );
  if (isUuid && rawUserId !== GUEST_PERSISTENT_UUID) {
    return { userId: rawUserId!, isGuest: false };
  }
  return { userId: GUEST_PERSISTENT_UUID, isGuest: true };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey || apiKey === "placeholder-gemini-key" || apiKey.startsWith("your_")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "GEMINI_API_KEY_MISSING: Configure GEMINI_API_KEY in .env.local to synthesize Resume & JD interview questions.",
        },
        { status: 400 }
      );
    }

    const body = (await req.json()) as {
      userId?: string;
      targetRole?: string;
      targetCompany?: string;
      difficulty?: string;
      focusAreas?: string[];
      focusCategories?: string[];
      jobDescription?: string;
      jobRequirement?: string;
      count?: number;
      resumeContext?: {
        projects?: unknown[];
        experience?: unknown[];
      };
    };

    const {
      userId: rawUserId,
      targetRole = "Software Engineer",
      targetCompany = "",
      difficulty = "Hard",
      focusAreas,
      focusCategories,
      jobDescription = "",
      jobRequirement = "",
      count = 8,
    } = body;

    const effectiveJd = (jobDescription || jobRequirement).trim();
    const effectiveFocusAreas =
      focusAreas || focusCategories || ["Core Technical & Architecture", "Resume Project Grill", "Distributed System Design"];

    if (!effectiveJd && !targetRole.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "MISSING_JD_OR_ROLE: Provide a target role and job description requirements to synthesize tailored questions.",
        },
        { status: 400 }
      );
    }

    const { userId, isGuest } = resolveUserId(rawUserId);
    const supabase = getSupabaseClient();

    // 1. Fetch candidate's real uploaded resume and skill evidence matrix from Supabase
    const [{ data: resumeRow }, { data: skillRows }] = await Promise.all([
      supabase
        .from("resumes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("skill_evidence_matrix").select("*").eq("user_id", userId),
    ]);

    const parsedResume =
      (resumeRow as { parsed_data?: { projects?: unknown[]; experience?: unknown[] }; file_name?: string } | null)
        ?.parsed_data ||
      body.resumeContext ||
      null;
    const resumeFileName = (resumeRow as { file_name?: string } | null)?.file_name || null;
    const resumeProjects = Array.isArray(parsedResume?.projects) ? parsedResume.projects : [];
    const resumeExperience = Array.isArray(parsedResume?.experience) ? parsedResume.experience : [];
    const trackedSkills = (skillRows as SkillMatrixRow[] | null) || [];

    const synthesisPrompt = `You are a Dual-Synthesizer Technical Interview Architect Agent.
Synthesize a tailored Bar-Raiser Interview Blueprint that bridges the candidate's REAL uploaded resume with the target company's Job Description.

TARGET INTERVIEW PARAMETERS:
- Target Role: ${targetRole}
- Target Company: ${targetCompany || "High-Growth Tech Company"}
- Difficulty Bar: ${difficulty}
- Focus Areas: ${Array.isArray(effectiveFocusAreas) ? effectiveFocusAreas.join(", ") : "Core Technical"}
- Job Description & Requirements:
${effectiveJd}

CANDIDATE'S REAL SUPABASE RESUME DATA:
- Uploaded Resume File: ${resumeFileName || "None in DB"}
- Extracted Projects: ${resumeProjects.length > 0 ? JSON.stringify(resumeProjects) : "No projects uploaded yet"}
- Work Experience: ${resumeExperience.length > 0 ? JSON.stringify(resumeExperience) : "None"}
- Skill Evidence Matrix: ${trackedSkills.map((s) => `${s.skill_name} (Verified: ${s.verified_confidence}, BluffRisk:${s.bluff_risk})`).join(", ") || "No skills verified yet"}

Generate ${Math.min(Number(count) || 8, 12)} high-signal interview questions. At least half of the questions MUST directly connect a specific project or skill from the candidate's resume to a requirement in the Job Description.

Return ONLY a valid JSON object matching this exact schema:
{
  "synthesisSummary": "string (1-2 sentences explaining the exact gap between the candidate's resume and ${targetCompany || targetRole})",
  "criticalSkillGapsDetected": ["string"],
  "questions": [
    {
      "id": "string",
      "category": "string",
      "difficulty": "Medium" | "Hard",
      "question": "string",
      "whyAskedForThisJD": "string (How this question connects their resume to the JD)",
      "keyExpectedConcepts": ["string (4 concrete concepts to listen for)"],
      "interviewerHint": "string",
      "sampleStarAnswer": "string",
      "followUpProbe": "string"
    }
  ]
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: synthesisPrompt }] }],
          generationConfig: {
            temperature: 0.25,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return NextResponse.json(
        {
          success: false,
          error: `GEMINI_JD_SYNTHESIS_ERROR (HTTP ${geminiRes.status}): ${errText.slice(0, 300)}`,
        },
        { status: 502 }
      );
    }

    const geminiJson = (await geminiRes.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawJson = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) {
      return NextResponse.json(
        { success: false, error: "GEMINI_EMPTY_SYNTHESIS: Model returned empty output." },
        { status: 502 }
      );
    }

    const cleanedJson = rawJson
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const synthesized = JSON.parse(cleanedJson) as SynthesizedBlueprint;

    const normalizedQuestions = (synthesized.questions || []).map((q, idx) => ({
      ...q,
      id: q.id || `custom-${Date.now()}-${idx + 1}`,
      role: targetRole,
      whyAskThis: q.whyAskedForThisJD,
      keyConceptsToCover: q.keyExpectedConcepts || [],
      hint: q.interviewerHint || "",
      sampleAnswer: q.sampleStarAnswer || "",
      followUps: q.followUpProbe ? [q.followUpProbe] : [],
    }));

    // 2. Persist the synthesized blueprint session in Supabase `interview_sessions`
    const { data: sessionRecord } = await supabase
      .from("interview_sessions")
      .insert({
        user_id: userId,
        role: targetRole,
        company: targetCompany || null,
        topic: "Custom Resume + JD Synthesis",
        status: "READY",
        transcript: normalizedQuestions,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    return NextResponse.json({
      success: true,
      isGuest,
      userId,
      sessionId: (sessionRecord as { id?: string } | null)?.id || null,
      resumeLoadedFromSupabase: Boolean(resumeRow),
      resumeFileName,
      projectsCount: resumeProjects.length,
      skillsCount: trackedSkills.length,
      synthesisSummary: synthesized.synthesisSummary,
      criticalSkillGapsDetected: synthesized.criticalSkillGapsDetected || [],
      questions: normalizedQuestions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json(
      {
        success: false,
        error: `CUSTOM_QUESTIONS_EXCEPTION: ${message}`,
      },
      { status: 500 }
    );
  }
}
