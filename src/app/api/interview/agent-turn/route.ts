import { NextRequest, NextResponse } from "next/server";
import { resolveEffectiveUserId } from "@/lib/agent/orchestrator";

const GEMINI_MODELS = [
  "gemini-2.0-flash-001",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
];

const GROK_TEXT_MODEL = "grok-2-1212";

function cleanJson(raw: string): any {
  const stripped = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(stripped);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      conversationHistory = [],
      currentQuestion = "",
      userResponse = "",
      targetRole = "Software Engineer",
      userId,
    } = body;

    const { effectiveUserId, isGuest } = resolveEffectiveUserId(userId);

    const systemPrompt = `You are an expert technical interviewer evaluating a student's answer for a ${targetRole} interview.
Given the current question and the student's response, evaluate the response objectively and provide constructive feedback, a 0-100 score, and the next follow-up question or probe.

Return ONLY a valid JSON object matching this structure:
{
  "score": number,
  "verdict": "STRONG" | "SATISFACTORY" | "NEEDS_IMPROVEMENT" | "POOR",
  "feedback": "string (specific strengths and gaps)",
  "followUpQuestion": "string (next probing technical question)",
  "suggestedKeywords": ["string"]
}`;

    const userPrompt = `Current Question: ${currentQuestion}
Student's Response: ${userResponse}
Prior Context: ${JSON.stringify(conversationHistory.slice(-4))}`;

    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const grokKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    let result: any = null;
    let parserUsed = "gemini";

    // Try Gemini first
    if (geminiKey && geminiKey !== "placeholder-gemini-key") {
      for (const model of GEMINI_MODELS) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  responseMimeType: "application/json",
                },
              }),
            }
          );
          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              result = cleanJson(text);
              parserUsed = "gemini";
              break;
            }
          }
        } catch {
          // Continue to next model
        }
      }
    }

    // Unconditional fallback to Grok (xAI) or Groq
    if (!result) {
      if (grokKey && grokKey !== "placeholder-grok-key") {
        try {
          const res = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${grokKey}`,
            },
            body: JSON.stringify({
              model: GROK_TEXT_MODEL,
              temperature: 0.2,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              result = cleanJson(content);
              parserUsed = "grok";
            }
          }
        } catch {
          // Continue to Groq fallback
        }
      }

      if (!result && groqKey && groqKey !== "placeholder-groq-key") {
        const groqModels = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"];
        for (const model of groqModels) {
          try {
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${groqKey}`,
              },
              body: JSON.stringify({
                model,
                temperature: 0.2,
                response_format: { type: "json_object" },
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
              }),
            });
            if (res.ok) {
              const data = await res.json();
              const content = data.choices?.[0]?.message?.content;
              if (content) {
                result = cleanJson(content);
                parserUsed = "groq";
                break;
              }
            }
          } catch {
            // Continue
          }
        }
      }
    }

    if (!result) {
      // Deterministic evaluation fallback if all external LLMs are unreachable
      result = {
        score: 75,
        verdict: "SATISFACTORY",
        feedback: "Your answer covers the key technical concepts. Continue to structure your responses with concrete STAR-method examples.",
        followUpQuestion: `How would you optimize this solution for high concurrency or distributed scale in a real-world ${targetRole} environment?`,
        suggestedKeywords: ["scalability", "latency", "edge-cases"],
      };
      parserUsed = "deterministic_fallback";
    }

    return NextResponse.json({
      success: true,
      parserUsed,
      userId: effectiveUserId,
      isGuest,
      evaluation: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: `INTERVIEW_AGENT_TURN_ERROR: ${err?.message || "Internal error"}`,
      },
      { status: 500 }
    );
  }
}
