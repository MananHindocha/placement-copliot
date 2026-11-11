import { NextRequest, NextResponse } from "next/server";
import zlib from "zlib";
import { createClient } from "@supabase/supabase-js";
import { resolveEffectiveUserId } from "@/lib/agent/orchestrator";

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-001",
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

function buildExtractionPrompt(targetRole: string, fileName: string): string {
  return `You are an expert Technical Resume Parser and Placement Readiness Auditor.
The candidate uploaded the resume file "${fileName}" targeting the role: "${targetRole}".

Carefully inspect the resume content and return ONLY a valid JSON object (no markdown fences) with this exact schema:
{
  "candidateName": "Full name of candidate from the resume (never return Unknown if a name is present)",
  "targetRole": "${targetRole}",
  "atsScore": number (realistic 1-100 score evaluating this resume for ${targetRole}),
  "extractedSkills": [
    {
      "name": "string (exact technical skill, language, framework, database, or tool in the resume)",
      "claimedLevel": "HIGH" | "MEDIUM" | "LOW",
      "citation": "string (which project, internship, or skills section mentioned it)"
    }
  ],
  "projects": [
    {
      "name": "string (exact project title from the resume)",
      "techStack": ["string"],
      "bullets": ["string (key accomplishments/bullets from this project)"]
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
      "skill": "string (important skill for ${targetRole} not found in this resume)",
      "priority": "HIGH" | "MEDIUM",
      "reason": "string (why ${targetRole} interviews require this)"
    }
  ],
  "bulletImprovements": [
    {
      "originalBullet": "string (a real bullet point from the candidate's resume)",
      "proposedBullet": "string (stronger STAR-format rewrite for ${targetRole})",
      "verifiedSourceProject": "string (the project or company name from the resume)"
    }
  ]
}`;
}

/**
 * Decompresses PDF FlateDecode streams using Node's native zlib so fallback text parsers
 * read the actual text inside compressed PDFs instead of binary garbage.
 */
function extractDecompressedPdfText(buffer: Buffer): string {
  const chunks: string[] = [];
  const rawLatin1 = buffer.toString("latin1");

  // 1. Decompress FlateDecode binary streams inside the PDF
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(rawLatin1)) !== null) {
    const streamBytes = Buffer.from(match[1], "latin1");
    try {
      const inflated = zlib.inflateSync(streamBytes).toString("latin1");
      // Extract PDF text operators: (text) Tj and [(text)] TJ
      const textTokens = inflated.match(/\(([^()\\]{1,250})\)/g) || [];
      for (const token of textTokens) {
        const cleaned = token
          .slice(1, -1)
          .replace(/\\([nrt()])/g, " ")
          .replace(/[^\x20-\x7E]/g, " ")
          .trim();
        if (cleaned.length > 1) chunks.push(cleaned);
      }
    } catch {
      // Not a standard zlib stream; skip
    }
  }

  // 2. Also capture any uncompressed text literals in the PDF
  const uncompressedTokens = rawLatin1.match(/\(([^()\\]{3,200})\)/g) || [];
  for (const token of uncompressedTokens) {
    const cleaned = token.slice(1, -1).replace(/[^\x20-\x7E]/g, " ").trim();
    if (/[a-zA-Z]{3,}/.test(cleaned) && !/^(Type|Font|Page|Catalog|FlateDecode|Obj|Producer|Creator)/i.test(cleaned)) {
      chunks.push(cleaned);
    }
  }

  // 3. Fallback for plain .txt / .docx readable strings
  if (chunks.join(" ").length < 100) {
    const utf8Clean = buffer
      .toString("utf8")
      .replace(/[^\x20-\x7E\n\r\t]/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    chunks.push(utf8Clean);
  }

  return chunks.join(" ").replace(/\s{2,}/g, " ").trim().slice(0, 20000);
}

function normalizeParsedResume(rawObj: any, targetRole: string, fileName: string): any {
  const candidateName =
    typeof rawObj?.candidateName === "string" &&
    rawObj.candidateName.trim() !== "" &&
    rawObj.candidateName.toLowerCase() !== "unknown"
      ? rawObj.candidateName.trim()
      : fileName.replace(/\.(pdf|docx|doc|txt)$/i, "").replace(/[_-]+/g, " ");

  const rawSkills = Array.isArray(rawObj?.extractedSkills)
    ? rawObj.extractedSkills
    : Array.isArray(rawObj?.skills)
    ? rawObj.skills
    : [];

  const extractedSkills = rawSkills
    .map((s: any) => {
      if (typeof s === "string") {
        return { name: s, claimedLevel: "HIGH" as const, citation: `Extracted from ${fileName}` };
      }
      return {
        name: String(s?.name || s?.skill_name || s?.skill || "").trim(),
        claimedLevel: (s?.claimedLevel === "LOW" || s?.claimedLevel === "MEDIUM" ? s.claimedLevel : "HIGH") as
          | "HIGH"
          | "MEDIUM"
          | "LOW",
        citation: String(s?.citation || s?.reason || `Verified in ${fileName}`),
      };
    })
    .filter((s: any) => s.name.length > 0);

  const projects = Array.isArray(rawObj?.projects)
    ? rawObj.projects.map((p: any) => ({
        name: String(p?.name || p?.title || "Resume Project"),
        techStack: Array.isArray(p?.techStack) ? p.techStack.map(String) : [],
        bullets: Array.isArray(p?.bullets)
          ? p.bullets.map(String)
          : typeof p?.summary === "string"
          ? [p.summary]
          : ["Implemented core architecture and features."],
      }))
    : [];

  const experience = Array.isArray(rawObj?.experience)
    ? rawObj.experience.map((e: any) => ({
        company: String(e?.company || ""),
        role: String(e?.role || ""),
        duration: String(e?.duration || ""),
        bullets: Array.isArray(e?.bullets) ? e.bullets.map(String) : [],
      }))
    : [];

  const missingSkillsForTargetRole = Array.isArray(rawObj?.missingSkillsForTargetRole)
    ? rawObj.missingSkillsForTargetRole.map((m: any) => ({
        skill: String(m?.skill || m?.name || "System Design"),
        priority: m?.priority === "MEDIUM" ? "MEDIUM" : "HIGH",
        reason: String(m?.reason || m?.whyNeeded || `Core requirement for ${targetRole}`),
      }))
    : [];

  const bulletImprovements = Array.isArray(rawObj?.bulletImprovements)
    ? rawObj.bulletImprovements.map((b: any) => ({
        originalBullet: String(b?.originalBullet || ""),
        proposedBullet: String(b?.proposedBullet || b?.improvedBullet || ""),
        verifiedSourceProject: String(b?.verifiedSourceProject || b?.projectName || projects[0]?.name || "Resume"),
      }))
    : [];

  const computedAts =
    typeof rawObj?.atsScore === "number" && rawObj.atsScore > 0
      ? Math.min(98, Math.max(35, Math.round(rawObj.atsScore)))
      : extractedSkills.length > 0
      ? Math.min(92, 50 + extractedSkills.length * 4)
      : 45;

  return {
    candidateName,
    targetRole,
    atsScore: computedAts,
    extractedSkills,
    skills: extractedSkills,
    projects,
    experience,
    missingSkillsForTargetRole,
    bulletImprovements,
  };
}

function cleanAndParseJson(raw: string): any {
  const stripped = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const firstBrace = stripped.indexOf("{");
  const lastBrace = stripped.lastIndexOf("}");
  const jsonSlice = firstBrace !== -1 && lastBrace !== -1 ? stripped.slice(firstBrace, lastBrace + 1) : stripped;
  return JSON.parse(jsonSlice);
}

async function parseResumeWithGemini(
  pdfBase64: string,
  mimeType: string,
  targetRole: string,
  fileName: string,
  decompressedText: string,
  apiKey: string
): Promise<any> {
  const prompt = buildExtractionPrompt(targetRole, fileName);
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
                  {
                    text:
                      decompressedText.length > 80
                        ? `${prompt}\n\nDECOMPRESSED RESUME TEXT BACKUP:\n${decompressedText}`
                        : prompt,
                  },
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
        const err: any = new Error(`Gemini ${modelName} HTTP ${response.status}: ${errText.slice(0, 220)}`);
        err.status = response.status;
        lastError = err;
        console.warn(`[resume/parse] ${modelName} failed (${response.status}), trying next model...`);
        continue;
      }

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        lastError = new Error(`Gemini ${modelName} returned empty text.`);
        continue;
      }

      const parsed = cleanAndParseJson(rawText);
      return normalizeParsedResume(parsed, targetRole, fileName);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError;
}

async function parseResumeWithGrokOrGroq(
  pdfBase64: string,
  mimeType: string,
  targetRole: string,
  fileName: string,
  decompressedText: string
): Promise<any> {
  const grokKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const prompt = buildExtractionPrompt(targetRole, fileName);

  if (grokKey && grokKey !== "placeholder-grok-key") {
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${grokKey}`,
        },
        body: JSON.stringify({
          model: decompressedText.length > 80 ? GROK_TEXT_MODEL : GROK_VISION_MODEL,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content:
                decompressedText.length > 80
                  ? `${prompt}\n\nRESUME TEXT:\n${decompressedText}`
                  : [
                      { type: "image_url", image_url: { url: `data:${mimeType};base64,${pdfBase64}` } },
                      { type: "text", text: prompt },
                    ],
            },
          ],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          return normalizeParsedResume(cleanAndParseJson(content), targetRole, fileName);
        }
      }
    } catch {
      // Continue to Groq fallback
    }
  }

  if (groqKey && groqKey !== "placeholder-groq-key") {
    const groqModels = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"];
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
                content: `${prompt}\n\nEXTRACTED RESUME TEXT:\n${decompressedText}`,
              },
            ],
          }),
        });

        if (!groqRes.ok) continue;

        const groqJson = await groqRes.json();
        const content = groqJson.choices?.[0]?.message?.content;
        if (content) {
          return normalizeParsedResume(cleanAndParseJson(content), targetRole, fileName);
        }
      } catch {
        continue;
      }
    }
  }

  throw new Error("Both Gemini and Grok/Groq fallbacks failed to parse the resume.");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const uploadedFile = formData.get("file") as File | null;
    const rawTargetRole = (formData.get("targetRole") as string | null) || "Full-Stack Engineer";
    const passedUserId = (formData.get("userId") as string | null) || undefined;

    if (!uploadedFile) {
      return NextResponse.json(
        { success: false, error: "NO_FILE_UPLOADED: Please attach a PDF or TXT resume file." },
        { status: 400 }
      );
    }

    const targetRole = rawTargetRole.trim() || "Software Engineer";
    const { effectiveUserId, isGuest } = resolveEffectiveUserId(passedUserId);
    const supabase = getSupabaseServerClient();

    const arrayBuffer = await uploadedFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfBase64 = buffer.toString("base64");
    const mimeType =
      uploadedFile.type || (uploadedFile.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain");
    const decompressedText = extractDecompressedPdfText(buffer);

    let parsedResume: any = null;
    let parserUsed: "gemini" | "grok" = "gemini";

    const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

    try {
      if (!geminiApiKey || geminiApiKey === "placeholder-gemini-key") {
        throw new Error("GEMINI_API_KEY_MISSING");
      }
      parsedResume = await parseResumeWithGemini(
        pdfBase64,
        mimeType,
        targetRole,
        uploadedFile.name,
        decompressedText,
        geminiApiKey
      );
      parserUsed = "gemini";
    } catch (error: any) {
      console.warn(`[resume/parse] Gemini failed (${error?.message}) — falling back to Grok/Groq`);
      try {
        parsedResume = await parseResumeWithGrokOrGroq(
          pdfBase64,
          mimeType,
          targetRole,
          uploadedFile.name,
          decompressedText
        );
        parserUsed = "grok";
      } catch (fallbackErr: any) {
        return NextResponse.json(
          {
            success: false,
            error: `Resume parse failed: ${error?.message || "Gemini error"} | Fallback: ${
              fallbackErr?.message || "Grok error"
            }`,
          },
          { status: 502 }
        );
      }
    }

    const now = new Date().toISOString();
    if (supabase) {
      try {
        await supabase.from("resumes").insert({
          user_id: effectiveUserId,
          file_name: uploadedFile.name,
          target_role: targetRole,
          ats_score: parsedResume.atsScore,
          parsed_data: parsedResume,
          created_at: now,
        });

        if (parsedResume.extractedSkills.length > 0) {
          await supabase.from("skill_evidence_matrix").delete().eq("user_id", effectiveUserId);
          const matrixRows = parsedResume.extractedSkills.map((s: any) => ({
            user_id: effectiveUserId,
            skill_name: s.name,
            claimed_level: s.claimedLevel || "HIGH",
            verified_confidence: "UNVERIFIED",
            bluff_risk: false,
            evidence_log: [
              {
                timestamp: now,
                source: "RESUME",
                verdict: "POSITIVE",
                citation: s.citation,
              },
            ],
            updated_at: now,
          }));
          await supabase.from("skill_evidence_matrix").upsert(matrixRows, { onConflict: "user_id,skill_name" });
        }
      } catch (dbErr: any) {
        console.warn("[resume/parse] Non-fatal Supabase sync warning:", dbErr?.message);
      }
    }

    const resumeWorkspace = {
      editableResume: parsedResume,
      analysis: {
        skills: parsedResume.skills || parsedResume.extractedSkills || [],
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
