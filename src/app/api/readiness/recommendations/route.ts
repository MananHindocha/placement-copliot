import { NextRequest, NextResponse } from "next/server";
import type { AiGoalRecommendation, ReadinessMilestone } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getGeminiApiKey(): string | null {
  const raw = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
  const cleaned = raw.trim().replace(/^["']|["']$/g, "");
  if (!cleaned || cleaned.includes("your_gemini") || cleaned.length < 10) return null;
  return cleaned;
}

function getGroqApiKey(): string | null {
  const raw = process.env.GROQ_API_KEY || "";
  const cleaned = raw.trim().replace(/^["']|["']$/g, "");
  if (!cleaned || cleaned.includes("your_groq") || cleaned.length < 10) return null;
  return cleaned;
}

function cleanJson(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const firstBrace = text.indexOf("[");
  const lastBrace = text.lastIndexOf("]");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      targetRole = "Software Engineer",
      targetCompany = "",
      gaps = [],
      missingKeywords = [],
      sectionScores,
      suggestions = [],
      strengths = [],
    } = body;

    // Check if any gaps or missing keywords exist
    if ((!gaps || gaps.length === 0) && (!missingKeywords || missingKeywords.length === 0) && (!suggestions || suggestions.length === 0)) {
      return NextResponse.json({
        recommendations: [],
        status: "no_gaps",
      });
    }

    const geminiKey = getGeminiApiKey();
    const groqKey = getGroqApiKey();

    if (geminiKey) {
      try {
        const prompt = `You are an expert technical career coach. Generate 3 to 5 highly specific, evidence-based preparation milestones for a candidate based on their verified resume screener analysis.
Target Role: ${targetRole}
Target Company: ${targetCompany || "Not specified"}
Resume Gaps: ${JSON.stringify(gaps)}
Missing Keywords: ${JSON.stringify(missingKeywords)}
Section Scores: ${JSON.stringify(sectionScores || {})}
Resume Suggestions: ${JSON.stringify(suggestions.map((s: any) => s.suggested || s.original || s).slice(0, 3))}

Rules:
1. Every recommendation MUST trace back to a specific gap or missing keyword.
2. Do NOT say the candidate "does not know" a skill. Use phrasing such as "This skill is not sufficiently demonstrated in your resume".
3. Category must be strictly one of: "skills", "resume", "interview", "network", "applications".
4. Priority must be strictly one of: "high", "medium", "low".
5. Return ONLY a valid JSON array of objects.

Schema:
[
  {
    "id": "rec-1",
    "title": "Concise goal title (e.g. Strengthen System Design & Scalability)",
    "category": "skills",
    "priority": "high",
    "reason": "Clear explanation of why this is recommended based on the resume gap",
    "suggestedAction": "Concrete action to take to fulfill this goal",
    "finding": "The specific resume gap or missing keyword it addresses",
    "targetRole": "${targetRole}"
  }
]`;

        const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash-001", "gemini-1.5-flash"];
        let res: Response | null = null;
        for (const model of candidateModels) {
          try {
            const candidateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
              }),
              signal: AbortSignal.timeout(12000),
            });
            if (candidateRes.ok) {
              res = candidateRes;
              break;
            }
          } catch {
            // try next model
          }
        }

        if (res && res.ok) {
          const data = await res.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(cleanJson(rawText));
            if (Array.isArray(parsed) && parsed.length > 0) {
              return NextResponse.json({
                recommendations: parsed,
                status: "ready",
                source: "gemini",
              });
            }
          }
        }
      } catch (err) {
        console.warn("[readiness/recommendations] Gemini call failed, falling back to Groq/Deterministic:", err);
      }
    }

    if (groqKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: "You are an expert technical career coach. Return ONLY a JSON array of recommendation objects.",
              },
              {
                role: "user",
                content: `Target Role: ${targetRole}. Gaps: ${JSON.stringify(gaps)}. Missing keywords: ${JSON.stringify(missingKeywords)}. Return JSON array of objects with id, title, category, priority, reason, suggestedAction, finding, targetRole.`,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const raw = data.choices?.[0]?.message?.content;
          if (raw) {
            const parsedObj = JSON.parse(raw);
            const list = Array.isArray(parsedObj) ? parsedObj : parsedObj.recommendations || [];
            if (list.length > 0) {
              return NextResponse.json({
                recommendations: list,
                status: "ready",
                source: "groq",
              });
            }
          }
        }
      } catch (err) {
        console.warn("[readiness/recommendations] Groq call failed:", err);
      }
    }

    // Deterministic evidence-based synthesis fallback
    const fallbackRecs: AiGoalRecommendation[] = [];
    let recCount = 1;

    // 1. Process explicit gaps
    for (const gap of gaps) {
      if (typeof gap !== "string" || !gap.trim()) continue;
      const cleanGap = gap.trim();
      const lower = cleanGap.toLowerCase();

      if (lower.includes("metric") || lower.includes("quantif") || lower.includes("outcome") || lower.includes("result")) {
        fallbackRecs.push({
          id: `rec-${recCount++}`,
          title: "Improve measurable impact in project descriptions",
          category: "resume",
          priority: "medium",
          reason: "Your resume contains project descriptions, but several achievements lack measurable outcomes or quantified KPIs.",
          suggestedAction: "Add meaningful metrics such as latency reductions, user scale, or performance benchmarks to substantiate your bullets.",
          finding: cleanGap,
          targetRole,
        });
      } else if (lower.includes("system design") || lower.includes("scalab") || lower.includes("architect") || lower.includes("distributed")) {
        fallbackRecs.push({
          id: `rec-${recCount++}`,
          title: "Strengthen system design & distributed architecture preparation",
          category: "skills",
          priority: "high",
          reason: `Your target role (${targetRole}) emphasizes distributed systems, but your current resume provides limited evidence of experience with scalability and system architecture.`,
          suggestedAction: "Review distributed system concepts (caching, load balancing, DB sharding, CAP theorem) and document architectural decisions in your portfolio.",
          finding: cleanGap,
          targetRole,
        });
      } else if (lower.includes("database") || lower.includes("sql") || lower.includes("query") || lower.includes("schema")) {
        fallbackRecs.push({
          id: `rec-${recCount++}`,
          title: "Demonstrate stronger database & indexing experience",
          category: "skills",
          priority: "medium",
          reason: "Database-related competencies for your target role are not sufficiently demonstrated in your resume.",
          suggestedAction: "Practice database indexing, query optimization, and transaction management, and highlight relevant data modeling in your projects.",
          finding: cleanGap,
          targetRole,
        });
      } else if (lower.includes("summary") || lower.includes("generic")) {
        fallbackRecs.push({
          id: `rec-${recCount++}`,
          title: `Tailor professional summary for ${targetRole}`,
          category: "resume",
          priority: "medium",
          reason: "Your professional summary lacks role-specific framing and target technical stack alignment.",
          suggestedAction: `Refactor your summary to explicitly position yourself for ${targetRole} roles and highlight your primary engineering domain.`,
          finding: cleanGap,
          targetRole,
        });
      } else {
        fallbackRecs.push({
          id: `rec-${recCount++}`,
          title: `Address profile gap: ${cleanGap.slice(0, 50)}`,
          category: "skills",
          priority: "medium",
          reason: `This competency is recommended for ${targetRole}, but is not sufficiently demonstrated in your current resume.`,
          suggestedAction: `Complete technical exercises or update relevant project descriptions addressing ${cleanGap}.`,
          finding: cleanGap,
          targetRole,
        });
      }
    }

    // 2. Process missing technical keywords
    const missingKeys = Array.isArray(missingKeywords) ? missingKeywords.slice(0, 3) : [];
    for (const kw of missingKeys) {
      const word = typeof kw === "string" ? kw : kw.word;
      if (!word) continue;
      // Skip if already covered
      if (fallbackRecs.some((r) => r.title.toLowerCase().includes(word.toLowerCase()))) continue;

      fallbackRecs.push({
        id: `rec-${recCount++}`,
        title: `Demonstrate experience with ${word}`,
        category: "skills",
        priority: "high",
        reason: `The target role (${targetRole}) values ${word}, but this skill is not sufficiently demonstrated in your current resume.`,
        suggestedAction: `Build a focused prototype or document project implementation decisions showcasing ${word}.`,
        finding: `Key technical keyword '${word}' missing from resume.`,
        targetRole,
      });
    }

    // 3. Interview practice goal if target role is set
    if (targetRole && !fallbackRecs.some((r) => r.category === "interview")) {
      fallbackRecs.push({
        id: `rec-${recCount++}`,
        title: `Practice ${targetRole} technical & behavioral interviews`,
        category: "interview",
        priority: "high",
        reason: `Interviewing for ${targetRole} requires clear articulation of architecture trade-offs and structured STAR behavioral communication.`,
        suggestedAction: `Complete 2 mock technical and behavioral sessions in Mock Interview Coach to practice explaining project decisions.`,
        finding: `Target role preparation for ${targetRole}.`,
        targetRole,
      });
    }

    return NextResponse.json({
      recommendations: fallbackRecs.slice(0, 5),
      status: fallbackRecs.length > 0 ? "ready" : "no_gaps",
      source: "deterministic",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        recommendations: [],
        status: "error",
        error: err instanceof Error ? err.message : "Failed to generate recommendations.",
      },
      { status: 500 }
    );
  }
}

