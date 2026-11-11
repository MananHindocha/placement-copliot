import { NextRequest, NextResponse } from "next/server";
import {
  callInterviewLLM,
  extractJsonObject,
  getOptionalSupabaseClient,
  readLocalInterviewStore,
  resolveUserId,
  writeLocalInterviewStore,
} from "@/lib/interview/server-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ResumeRecordRow {
  parsed_data?: { projects?: unknown[]; experience?: unknown[]; skills?: unknown[] };
  file_name?: string;
}

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

export async function POST(req: NextRequest) {
  try {
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
        candidateName?: string;
        skills?: unknown[];
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
    const supabase = getOptionalSupabaseClient();
    const localStore = readLocalInterviewStore();

    let resumeRow: ResumeRecordRow | null = null;
    let trackedSkills: SkillMatrixRow[] = (localStore.skillsByUser[userId] || []) as SkillMatrixRow[];

    if (supabase) {
      try {
        const [{ data: fetchedResume }, { data: skillRows }] = await Promise.all([
          supabase
            .from("resumes")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("skill_evidence_matrix").select("*").eq("user_id", userId),
        ]);
        if (fetchedResume) {
          resumeRow = fetchedResume as ResumeRecordRow;
        }
        if (Array.isArray(skillRows) && skillRows.length > 0) {
          trackedSkills = skillRows as SkillMatrixRow[];
        }
      } catch (dbErr) {
        console.warn("[custom-questions] Supabase context fetch skipped, using local/body context:", dbErr);
      }
    }

    const parsedResume =
      (resumeRow as ResumeRecordRow | null)?.parsed_data || body.resumeContext || null;
    const resumeFileName = (resumeRow as ResumeRecordRow | null)?.file_name || null;
    const resumeProjects = Array.isArray(parsedResume?.projects) ? parsedResume.projects : [];
    const resumeExperience = Array.isArray(parsedResume?.experience) ? parsedResume.experience : [];
    const resumeSkills = Array.isArray(body.resumeContext?.skills)
      ? body.resumeContext.skills
      : Array.isArray(parsedResume?.skills)
      ? parsedResume.skills
      : [];

    const synthesisPrompt = `You are a Dual-Synthesizer Technical Interview Architect Agent.
Synthesize a tailored Bar-Raiser Interview Blueprint that bridges the candidate's REAL uploaded resume with the target company's Job Description.

TARGET INTERVIEW PARAMETERS:
- Target Role: ${targetRole}
- Target Company: ${targetCompany || "High-Growth Tech Company"}
- Difficulty Bar: ${difficulty}
- Focus Areas: ${Array.isArray(effectiveFocusAreas) ? effectiveFocusAreas.join(", ") : "Core Technical"}
- Job Description & Requirements:
${effectiveJd || `Standard ${targetRole} engineering bar`}

CANDIDATE'S RESUME & SKILL EVIDENCE DATA:
- Uploaded Resume File: ${resumeFileName || (body.resumeContext ? "Client Local Resume Context" : "None yet")}
- Extracted Projects: ${resumeProjects.length > 0 ? JSON.stringify(resumeProjects) : "No projects provided yet"}
- Work Experience: ${resumeExperience.length > 0 ? JSON.stringify(resumeExperience) : "None"}
- Resume Skills: ${resumeSkills.length > 0 ? JSON.stringify(resumeSkills) : "None"}
- Skill Evidence Matrix: ${trackedSkills.map((s) => `${s.skill_name} (Verified: ${s.verified_confidence || "UNVERIFIED"}, BluffRisk:${Boolean(s.bluff_risk)})`).join(", ") || "No skills verified yet"}

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

    let rawJson: string;
    let llmProvider: "gemini" | "groq";
    try {
      const llmResult = await callInterviewLLM({
        userPrompt: synthesisPrompt,
        temperature: 0.25,
        timeoutMs: 18000,
      });
      rawJson = llmResult.text;
      llmProvider = llmResult.provider;
    } catch (llmErr) {
      const msg = llmErr instanceof Error ? llmErr.message : "LLM synthesis failed";
      const status = msg.startsWith("AI_KEY_MISSING") ? 400 : 502;
      return NextResponse.json({ success: false, error: msg }, { status });
    }

    const synthesized = JSON.parse(extractJsonObject(rawJson)) as SynthesizedBlueprint;
    const now = new Date().toISOString();

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

    let sessionId = `local-custom-${Date.now()}`;
    localStore.sessions[sessionId] = {
      id: sessionId,
      user_id: userId,
      role: targetRole,
      company: targetCompany || null,
      topic: "Custom Resume + JD Synthesis",
      status: "READY",
      score: null,
      transcript: normalizedQuestions,
      created_at: now,
      updated_at: now,
    };
    writeLocalInterviewStore(localStore);

    if (supabase) {
      try {
        const { data: sessionRecord } = await supabase
          .from("interview_sessions")
          .insert({
            user_id: userId,
            role: targetRole,
            company: targetCompany || null,
            topic: "Custom Resume + JD Synthesis",
            status: "READY",
            transcript: normalizedQuestions,
            created_at: now,
          })
          .select("id")
          .single();
        if ((sessionRecord as { id?: string } | null)?.id) {
          sessionId = (sessionRecord as { id: string }).id;
        }
      } catch (dbErr) {
        console.warn("[custom-questions] Supabase insert warning:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      isGuest,
      userId,
      storageMode: supabase ? "supabase" : "local_file",
      llmProvider,
      sessionId,
      resumeLoadedFromSupabase: Boolean(resumeRow),
      resumeFileName,
      projectsCount: resumeProjects.length,
      skillsCount: Math.max(trackedSkills.length, resumeSkills.length),
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
