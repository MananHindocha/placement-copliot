import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveEffectiveUserId, runPlacementAgent } from "@/lib/agent/orchestrator";

const GEMINI_MODELS = [
  "gemini-2.0-flash-001",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
];

const GROK_VISION_MODEL = "grok-2-vision-1212";
const GROK_TEXT_MODEL = "grok-2-1212";

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function buildExtractionPrompt(targetRole: string): string {
  return `You are a strict Technical Resume Parser & Role Readiness Auditor.
The candidate is aspiring for the target role: "${targetRole}".

Inspect the resume document and return ONLY a valid JSON object (no markdown fences) matching this exact structure:
{
  "candidateName": "string",
  "targetRole": "${targetRole}",
  "atsScore": number,
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
- Extract ONLY skills, projects, and bullets that genuinely exist in the resume.
- Never invent fake companies, fake projects, or hardcoded skills.`;
}

function extractReadableTextFromBuffer(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const parentheticalMatches = raw.match(/\(([^()\\]{2,200})\)/g) || [];
  const pdfTextStreams = parentheticalMatches
    .map((m) => m.slice(1, -1))
    .filter((s) => /[a-zA-Z]{3,}/.test(s) && !/^(Type|Font|Page|Catalog|FlateDecode|Obj)/i.test(s))
    .join(" ");

  const utf8Printable = buffer
    .toString("utf8")
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return `${pdfTextStreams}\n${utf8Printable}`.trim().slice(0, 18000);
}

function cleanAndParseJson(raw: string): any {
  const stripped = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const parsed = JSON.parse(stripped);
  if (Array.isArray(parsed.extractedSkills) && !Array.isArray(parsed.skills)) {
    parsed.skills = parsed.extractedSkills;
  }
  if (!Array.isArray(parsed.extractedSkills) && Array.isArray(parsed.skills)) {
    parsed.extractedSkills = parsed.skills.map((s: any) => ({
      name: typeof s === "string" ? s : s?.name || "",
      claimedLevel: "HIGH" as const,
      citation: "Extracted from resume",
    }));
  }
  if (!parsed.candidateName && parsed.name) {
    parsed.candidateName = parsed.name;
  }
  if (!parsed.projects) parsed.projects = [];
  parsed.projects = parsed.projects.map((p: any) => ({
    ...p,
    techStack: p.techStack || p.tech || [],
    bullets: p.bullets || (p.description ? [p.description] : []),
  }));
  if (!Array.isArray(parsed.missingSkillsForTargetRole)) {
    parsed.missingSkillsForTargetRole = [];
  }
  if (!Array.isArray(parsed.bulletImprovements)) {
    parsed.bulletImprovements = [];
  }
  if (typeof parsed.atsScore !== "number") {
    parsed.atsScore = 70;
  }
  return parsed;
}

async function parseResumeWithGemini(
  pdfBase64: string,
  mimeType: string,
  targetRole: string,
  apiKey: string
): Promise<any> {
  const prompt = buildExtractionPrompt(targetRole);
  let lastError: any = new Error("No Gemini models attempted");

  for (const modelName of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { data: pdfBase64, mimeType } },
                  { text: prompt },
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

      if (!response.ok) {
        const errText = await response.text();
        const err: any = new Error(
          `GEMINI_PDF_PARSE_ERROR (${modelName} HTTP ${response.status}): ${errText.slice(0, 300)}`
        );
        err.status = response.status;
        lastError = err;
        console.warn(`[resume/parse] Gemini model ${modelName} returned HTTP ${response.status}, trying next...`);
        continue;
      }

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        lastError = new Error(`GEMINI_EMPTY_RESPONSE (${modelName})`);
        continue;
      }

      return cleanAndParseJson(rawText);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError;
}

async function parseResumeWithGrok(
  pdfBase64: string,
  mimeType: string,
  targetRole: string,
  rawBuffer: Buffer
): Promise<any> {
  const grokKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const prompt = buildExtractionPrompt(targetRole);

  // Path A: xAI Grok (grok-2-vision-1212) when XAI_API_KEY or GROK_API_KEY is configured
  if (grokKey && grokKey !== "placeholder-grok-key") {
    const visionRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${grokKey}`,
      },
      body: JSON.stringify({
        model: GROK_VISION_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${pdfBase64}` },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (visionRes.ok) {
      const visionJson = await visionRes.json();
      const content = visionJson.choices?.[0]?.message?.content;
      if (content) return cleanAndParseJson(content);
    }

    // If xAI vision rejected application/pdf MIME, send extracted text to grok-2-vision-1212 / grok-2-1212
    const extractedText = extractReadableTextFromBuffer(rawBuffer);
    const textRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${grokKey}`,
      },
      body: JSON.stringify({
        model: GROK_TEXT_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: `${prompt}\n\nEXTRACTED RESUME TEXT:\n${extractedText}`,
          },
        ],
      }),
    });

    if (!textRes.ok) {
      const errBody = await textRes.text();
      throw new Error(`GROK_API_ERROR (HTTP ${textRes.status}): ${errBody.slice(0, 300)}`);
    }

    const textJson = await textRes.json();
    const textContent = textJson.choices?.[0]?.message?.content;
    if (!textContent) throw new Error("GROK_EMPTY_RESPONSE");
    return cleanAndParseJson(textContent);
  }

  // Path B: If GROQ_API_KEY is configured in .env.local
  if (groqKey && groqKey !== "placeholder-groq-key") {
    const extractedText = extractReadableTextFromBuffer(rawBuffer);
    const groqModels = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"];
    let lastGroqErr: any = null;

    for (const model of groqModels) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.1,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "user",
                content: `${prompt}\n\nEXTRACTED RESUME TEXT:\n${extractedText}`,
              },
            ],
          }),
        });

        if (!groqRes.ok) {
          const errBody = await groqRes.text();
          lastGroqErr = new Error(`GROQ_FALLBACK_ERROR (${model} HTTP ${groqRes.status}): ${errBody.slice(0, 300)}`);
          continue;
        }

        const groqJson = await groqRes.json();
        const content = groqJson.choices?.[0]?.message?.content;
        if (!content) {
          lastGroqErr = new Error(`GROQ_EMPTY_RESPONSE (${model})`);
          continue;
        }
        return cleanAndParseJson(content);
      } catch (err: any) {
        lastGroqErr = err;
      }
    }

    if (lastGroqErr) throw lastGroqErr;
  }

  throw new Error(
    "GROK_API_KEY_MISSING: Neither XAI_API_KEY / GROK_API_KEY nor GROQ_API_KEY is configured in .env.local."
  );
}

export async function POST(req: NextRequest) {
  try {
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
    const pdfBase64 = buffer.toString("base64");
    const mimeType =
      uploadedFile.type || (uploadedFile.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain");

    let parsedResume: any = null;
    let parserUsed: "gemini" | "grok" = "gemini";

    const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

    try {
      if (!geminiApiKey || geminiApiKey === "placeholder-gemini-key") {
        throw new Error("GEMINI_API_KEY_MISSING");
      }
      parsedResume = await parseResumeWithGemini(pdfBase64, mimeType, targetRole, geminiApiKey);
      parserUsed = "gemini";
    } catch (error: any) {
      // Always fall back to Grok if Gemini fails for ANY reason (404, 503, 429, network error)
      console.warn(`[resume/parse] Gemini failed (${error?.status || "unknown"}) — falling back to Grok`);
      try {
        parsedResume = await parseResumeWithGrok(pdfBase64, mimeType, targetRole, buffer);
        parserUsed = "grok";
      } catch (grokError: any) {
        return NextResponse.json(
          {
            success: false,
            error: `Resume parse failed on both Gemini and Grok. Gemini error: ${
              error?.message || "Unknown"
            } | Grok error: ${grokError?.message || "Unknown"}`,
          },
          { status: 502 }
        );
      }
    }

    const now = new Date().toISOString();
    let savedResumeId: string | null = null;
    let resumeRecordError: string | null = null;

    if (supabase) {
      try {
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
          .select("id")
          .maybeSingle();

        if (resumeErr) {
          resumeRecordError = resumeErr.message;
        } else {
          savedResumeId = savedResume?.id || null;
        }

        const extractedSkills: Array<{ name: string; claimedLevel?: "LOW" | "MEDIUM" | "HIGH"; citation?: string }> =
          Array.isArray(parsedResume.extractedSkills) ? parsedResume.extractedSkills : [];

        if (extractedSkills.length > 0) {
          await supabase.from("skill_evidence_matrix").delete().eq("user_id", effectiveUserId);
          const matrixRows = extractedSkills.map((s) => ({
            user_id: effectiveUserId,
            skill_name: String(s.name || "").trim(),
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
      } catch (dbErr: any) {
        resumeRecordError = dbErr?.message || "Database persistence warning";
      }
    }

    let agentRun: any = null;
    if (supabase) {
      try {
        agentRun = await runPlacementAgent(
          {
            userId: effectiveUserId,
            triggerType: "USER_GOAL_SUBMITTED",
            entityId: savedResumeId || uploadedFile.name,
            goalPrompt: `I uploaded my resume (${uploadedFile.name}) targeting "${targetRole}". Missing skills: ${(
              parsedResume.missingSkillsForTargetRole || []
            )
              .map((m: any) => m.skill)
              .join(", ")}. Inject a readiness study sprint and stage grounded bullet improvements.`,
            metadata: {
              targetRole,
              resumeContext: parsedResume,
            },
          } as any,
          supabase
        );
      } catch (agentErr: any) {
        console.warn("[resume/parse] Post-parse agent trigger warning:", agentErr?.message);
      }
    }

    const resumeWorkspace = {
      editableResume: parsedResume,
      analysis: {
        skills: parsedResume.skills || [],
        score: parsedResume.atsScore || 0,
        parsedResume: parsedResume,
      },
      savedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      parserUsed,
      isGuest,
      userId: effectiveUserId,
      fileName: uploadedFile.name,
      targetRole,
      parsedResume,
      resumeWorkspace,
      resumeRecordError,
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
