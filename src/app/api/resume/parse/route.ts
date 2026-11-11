import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  GUEST_PERSISTENT_UUID,
  resolveEffectiveUserId,
  runPlacementAgent,
  getPersistentSupabaseClient,
} from "@/lib/agent/orchestrator";

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("your-project-id.supabase.co")) {
    return getPersistentSupabaseClient();
  }
  try {
    return createClient(url, key, { auth: { persistSession: false } });
  } catch {
    return getPersistentSupabaseClient();
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const apiKey = rawKey ? rawKey.trim().replace(/^["']|["']$/g, "") : "";
    if (!apiKey || apiKey === "placeholder-gemini-key") {
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY_MISSING: Add a valid GEMINI_API_KEY in .env.local to parse resume files.",
        },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const uploadedFile = formData.get("file") as File | null;
    const rawTargetRole = (formData.get("targetRole") as string | null) || "";
    const passedUserId = (formData.get("userId") as string | null) || undefined;

    if (!uploadedFile) {
      return NextResponse.json(
        { success: false, error: "NO_FILE_UPLOADED: Please attach a PDF or TXT resume file." },
        { status: 400 }
      );
    }

    if (!rawTargetRole.trim()) {
      return NextResponse.json(
        { success: false, error: "TARGET_ROLE_REQUIRED: Please select or enter your aspiring target role first." },
        { status: 400 }
      );
    }

    const targetRole = rawTargetRole.trim();
    const { effectiveUserId, isGuest } = resolveEffectiveUserId(passedUserId);
    const supabase = getSupabaseServerClient();

    const arrayBuffer = await uploadedFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const mimeType = uploadedFile.type || (uploadedFile.name.endsWith(".pdf") ? "application/pdf" : "text/plain");

    const extractionPrompt = `You are a strict Technical Resume Parser & Role Readiness Auditor.
The candidate is aspiring for the target role: "${targetRole}".

Inspect the attached resume document and return ONLY a valid JSON object (no markdown fences) matching this exact structure:
{
  "candidateName": "string",
  "targetRole": "${targetRole}",
  "atsScore": number (0 to 100 based strictly on how well this resume matches "${targetRole}"),
  "extractedSkills": [
    {
      "name": "string (exact technical skill from the resume)",
      "claimedLevel": "HIGH" | "MEDIUM" | "LOW",
      "citation": "string (exact project or experience line in the resume where this skill appears)"
    }
  ],
  "projects": [
    {
      "name": "string",
      "techStack": ["string"],
      "bullets": ["string (verbatim bullet points from this project)"]
    }
  ],
  "experience": [
    {
      "company": "string",
      "role": "string",
      "duration": "string",
      "bullets": ["string"]
    }
  ],
  "missingSkillsForTargetRole": [
    {
      "skill": "string (critical skill required for ${targetRole} that is missing from this resume)",
      "priority": "HIGH" | "MEDIUM",
      "reason": "string (why ${targetRole} interviews test this skill)"
    }
  ],
  "bulletImprovements": [
    {
      "originalBullet": "string (exact verbatim weak bullet from the resume)",
      "proposedBullet": "string (improved STAR-format version aligned to ${targetRole} without inventing fake metrics)",
      "verifiedSourceProject": "string (exact project/company name from the resume)"
    }
  ]
}

STRICT RULES:
- Extract ONLY skills, projects, and bullets that genuinely exist in the attached file.
- Never invent fake companies, fake projects, or hardcoded skills.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: extractionPrompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
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
          error: `GEMINI_PDF_PARSE_ERROR (HTTP ${geminiRes.status}): ${errText.slice(0, 300)}`,
        },
        { status: 502 }
      );
    }

    const geminiJson = await geminiRes.json();
    const rawJsonText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJsonText) {
      return NextResponse.json(
        { success: false, error: "GEMINI_EMPTY_PARSE: Model returned empty extraction payload." },
        { status: 502 }
      );
    }

    const cleanedJsonText = rawJsonText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const parsedResume = JSON.parse(cleanedJsonText);
    const now = new Date().toISOString();

    // 1. Persist parsed resume to Supabase `resumes` table
    const { data: savedResume, error: resumeErr } = await supabase
      .from("resumes")
      .insert({
        user_id: effectiveUserId,
        file_name: uploadedFile.name,
        target_role: targetRole,
        ats_score: typeof parsedResume.atsScore === "number" ? parsedResume.atsScore : 0,
        parsed_data: parsedResume,
        created_at: now,
      })
      .select("*")
      .single();

    // 2. Replace old skills in `skill_evidence_matrix` for this user with the newly extracted resume skills
    await supabase.from("skill_evidence_matrix").delete().eq("user_id", effectiveUserId);

    const extractedSkills: Array<{ name: string; claimedLevel?: "LOW" | "MEDIUM" | "HIGH"; citation?: string }> =
      Array.isArray(parsedResume.extractedSkills) ? parsedResume.extractedSkills : [];

    if (extractedSkills.length > 0) {
      const matrixRows = extractedSkills.map((s) => ({
        user_id: effectiveUserId,
        skill_name: s.name.trim(),
        claimed_level: s.claimedLevel || "HIGH",
        verified_confidence: "UNVERIFIED",
        bluff_risk: false,
        evidence_log: [
          {
            timestamp: now,
            source: "RESUME",
            verdict: "POSITIVE",
            citation: s.citation || `Extracted from ${uploadedFile.name} for ${targetRole}`,
          },
        ],
        updated_at: now,
      }));

      await supabase.from("skill_evidence_matrix").upsert(matrixRows, { onConflict: "user_id,skill_name" });
    }

    // 3. Trigger the autonomous agent with the real extracted resume context
    const agentRun = await runPlacementAgent(
      {
        userId: effectiveUserId,
        triggerType: "USER_GOAL_SUBMITTED",
        entityId: savedResume?.id || uploadedFile.name,
        goalPrompt: `I uploaded my resume (${uploadedFile.name}) targeting the role "${targetRole}". My missing skills for "${targetRole}" are: ${(
          parsedResume.missingSkillsForTargetRole || []
        )
          .map((m: any) => m.skill)
          .join(", ")}. Inject a readiness study sprint for my missing skills and stage any grounded bullet improvements.`,
        metadata: {
          targetRole,
          resumeContext: parsedResume,
        },
      } as any,
      supabase
    );

    const resumeWorkspace = {
      editableResume: parsedResume, // the full ParsedResumeDocument object
      analysis: {
        skills: parsedResume.skills || [],
        score: parsedResume.atsScore || 0,
        parsedResume: parsedResume,
      },
      savedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      isGuest,
      userId: effectiveUserId,
      fileName: uploadedFile.name,
      targetRole,
      parsedResume,
      resumeWorkspace,
      resumeRecordError: resumeErr ? resumeErr.message : null,
      agentRun,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: `RESUME_PARSE_EXCEPTION: ${err?.message || "Unexpected server error"}`,
      },
      { status: 500 }
    );
  }
}
