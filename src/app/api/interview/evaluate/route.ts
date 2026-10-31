import { NextRequest, NextResponse } from "next/server";
import type {
  InterviewEvaluationRequest,
  InterviewEvaluationResponse,
  StarBreakdown,
  DeliveryCritique,
} from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(val: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(Number(val) || 0)));
}

function sanitizeKey(key: string | undefined): string {
  if (!key) return "";
  return key.trim().replace(/^["']|["']$/g, "").trim();
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const cleaned = text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  const jsonCandidate = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(jsonCandidate);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

// ─── Deterministic Heuristic Fallback Engine ─────────────────────────────────

function computeDeterministicEvaluation(
  req: InterviewEvaluationRequest
): InterviewEvaluationResponse {
  const transcript = (req.userTranscript || "").trim();
  const lower = transcript.toLowerCase();
  const words = transcript.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const {
    avgWpm = 130,
    totalFillerCount = 0,
    hesitationGapsCount = 0,
    eyeContactPct = -1,
    postureStabilityPct = 85,
    fillerWords = {},
  } = req.telemetry || {};

  // 1. STAR Component Detection via Regex
  const situationMatches = [
    /\b(when i was|during my|at my|working on|in a project|in my previous|at the time|while building)\b/i,
    /\b(semester|internship|hackathon|freelance|client|team|company)\b/i,
  ];
  const situationHits = situationMatches.filter((re) => re.test(lower)).length;
  const situationPresent = situationHits > 0 || wordCount > 40;
  const situationScore = situationHits >= 2 ? 88 : situationHits === 1 ? 75 : wordCount > 30 ? 62 : 45;

  const taskMatches = [
    /\b(the challenge was|our goal was|needed to|had to|responsible for|tasked with|bottleneck|problem was|requirement)\b/i,
    /\b(deadline|objective|target|issue|bug|limitation|friction)\b/i,
  ];
  const taskHits = taskMatches.filter((re) => re.test(lower)).length;
  const taskPresent = taskHits > 0;
  const taskScore = taskHits >= 2 ? 90 : taskHits === 1 ? 78 : wordCount > 40 ? 64 : 42;

  const actionMatches = [
    /\b(implemented|architected|built|developed|optimized|refactored|designed|created|engineered|integrated|deployed|migrated)\b/i,
    /\b(using|utilizing|configured|analyzed|benchmarked|automated|tested|profiled)\b/i,
    /\b(react|node|typescript|python|docker|redis|sql|postgres|aws|api|cache|query)\b/i,
  ];
  const actionHits = actionMatches.filter((re) => re.test(lower)).length;
  const actionPresent = actionHits > 0;
  const actionScore = actionHits >= 3 ? 92 : actionHits === 2 ? 82 : actionHits === 1 ? 70 : 48;

  const resultMatches = [
    /\b\d+(\.\d+)?(%|x|ms|s|users|queries|lpa|k|m)\b/i,
    /\b(reduced|improved|increased|accelerated|decreased|saved|boosted|achieved|delivered)\b/i,
    /\b(production|latency|throughput|feedback|adoption|success)\b/i,
  ];
  const resultHits = resultMatches.filter((re) => re.test(lower)).length;
  const resultPresent = resultHits > 0;
  const resultScore = resultHits >= 2 ? 94 : resultHits === 1 ? 80 : 50;

  const starBreakdown: StarBreakdown = {
    situation: {
      score: clamp(situationScore),
      present: situationPresent,
      feedback: situationPresent
        ? "Clear baseline context provided about the project setting and timeframe."
        : "Missing clear context — specify the company, team, or project stakes in your opening sentence.",
    },
    task: {
      score: clamp(taskScore),
      present: taskPresent,
      feedback: taskPresent
        ? "Identified the primary challenge and engineering requirements effectively."
        : "Vague problem statement — clarify the explicit bottleneck or constraint you were tasked with solving.",
    },
    action: {
      score: clamp(actionScore),
      present: actionPresent,
      feedback: actionPresent
        ? `Strong technical action verbs identified (${actionHits} architectural signals).`
        : "Action lacked technical specifics — detail the architectural decisions and tools you personally spearheaded.",
    },
    result: {
      score: clamp(resultScore),
      present: resultPresent,
      feedback: resultPresent
        ? "Includes measurable impact or quantified engineering performance indicators."
        : "Lacks quantifiable metrics — always measure impact with percentages, latency (ms), or user volume.",
    },
  };

  // 2. Delivery & Acoustic / Visual Score Calculation
  let deliveryScore = 100;

  // Deduct 4 points per filler word (max -30)
  const fillerDeduction = Math.min(30, totalFillerCount * 4);
  deliveryScore -= fillerDeduction;

  // Deduct 15 points if pacing is outside 95 - 170 WPM
  if (avgWpm < 95 || avgWpm > 170) {
    deliveryScore -= 15;
  }

  // Deduct 5 points per hesitation gap (> 2.5s)
  const gapDeduction = Math.min(20, hesitationGapsCount * 5);
  deliveryScore -= gapDeduction;

  // Camera Eye-Contact Factor
  if (eyeContactPct >= 0) {
    if (eyeContactPct >= 75) {
      deliveryScore += 5;
    } else if (eyeContactPct < 60) {
      deliveryScore -= 10;
    }
  }

  // Posture Factor
  if (postureStabilityPct < 70) {
    deliveryScore -= 8;
  }

  deliveryScore = clamp(deliveryScore, 30, 98);

  // 3. Technical Content Score Calculation (STAR Weighting)
  const contentScore = clamp(
    situationScore * 0.2 + taskScore * 0.2 + actionScore * 0.35 + resultScore * 0.25,
    35,
    98
  );

  // 4. Overall Composite (70% Content + 30% Delivery)
  const overallScore = clamp(contentScore * 0.7 + deliveryScore * 0.3);

  // 5. Pacing Verdict & Actionable Critiques
  let pacingVerdict: DeliveryCritique["pacingVerdict"] = "Optimal (115-155 WPM)";
  let pacingAdvice = "Your pacing was steady and well-controlled for technical explanations.";

  if (avgWpm < 105) {
    pacingVerdict = "Too Slow (<100 WPM)";
    pacingAdvice = `Your pace was ${avgWpm} WPM. Increase cadence slightly to 120-140 WPM to project confidence and maintain interviewer momentum.`;
  } else if (avgWpm > 160) {
    pacingVerdict = "Rushed (>160 WPM)";
    pacingAdvice = `Your pace was ${avgWpm} WPM. Slow down slightly on complex system architecture points so the panel can absorb your points.`;
  }

  let fillerAdvice = "Excellent verbal economy with virtually zero vocal tics.";
  if (totalFillerCount > 4) {
    const topFillers = Object.entries(fillerWords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([w, c]) => `"${w}" (${c}x)`)
      .join(", ");
    fillerAdvice = `Detected ${totalFillerCount} filler words (${topFillers}). Replace filler sounds with deliberate 1-second pauses.`;
  } else if (totalFillerCount > 0) {
    fillerAdvice = `Low filler count (${totalFillerCount}). Good discipline maintaining clear vocal flow.`;
  }

  let bodyLanguageAdvice = "Camera telemetry was disabled or audio-only mode was used.";
  if (eyeContactPct >= 0) {
    if (eyeContactPct >= 75) {
      bodyLanguageAdvice = `Exceptional visual connection (${eyeContactPct}% camera alignment) and upright posture (${postureStabilityPct}% stability).`;
    } else if (eyeContactPct >= 60) {
      bodyLanguageAdvice = `Adequate eye presence (${eyeContactPct}%). Practice looking directly into the lens when concluding major technical points.`;
    } else {
      bodyLanguageAdvice = `Low direct camera focus (${eyeContactPct}%). Position your window higher so looking at the question aligns with the lens.`;
    }
  }

  // 6. Actionable Strengths
  const strengths: string[] = [];
  if (actionHits >= 2) strengths.push("Strong articulation of technical engineering actions and tooling choices.");
  if (situationHits >= 1) strengths.push("Established clear initial project context and problem stakes.");
  if (resultHits >= 1) strengths.push("Highlighted business or latency metrics to demonstrate concrete outcome.");
  if (totalFillerCount <= 2 && avgWpm >= 110 && avgWpm <= 155) {
    strengths.push("Controlled verbal cadence with low reliance on filler words.");
  }
  if (strengths.length < 2) {
    strengths.push("Directly addressed the core question prompt without going off-topic.");
    strengths.push("Maintained logical progression through the explanation.");
  }

  // 7. Targeted Technical Improvements
  const improvements: string[] = [];
  if (!resultPresent) {
    improvements.push("Quantify your results: Include concrete metrics (e.g., '% throughput increase', 'ms latency saved').");
  }
  if (!taskPresent) {
    improvements.push("Clarify the core engineering constraints: Explain why this problem was non-trivial.");
  }
  if (actionHits < 2) {
    improvements.push("Deepen technical specifics: Explicitly name database engines, caching layers, or design patterns.");
  }
  if (totalFillerCount > 3) {
    improvements.push("Reduce filler occurrences by pausing comfortably when thinking between sentences.");
  }
  if (improvements.length < 2) {
    improvements.push("Address trade-offs: Mention an alternative design you considered and why you rejected it.");
  }

  // 8. 95/100 STAR Answer Rewrite
  const rewrittenIdealAnswer = `In my previous engineering project, our core production service was experiencing severe throughput degradation during traffic surges. As the lead developer, I was tasked with identifying the root cause and restoring p99 latency to under 80ms under a strict 48-hour deadline. I profiled the bottleneck using distributed tracing, identified lock contention on the primary relational database, and implemented an in-memory Redis caching tier with a write-through strategy. This architectural shift offloaded 84% of read queries, reduced p99 response times from 450ms down to 38ms, and ensured zero downtime across 50,000 concurrent daily active users.`;

  // 9. Contextual Follow-Up Probe
  let followUpPrompt = "How did you monitor system health and handle edge-case failures during this rollout?";
  let followUpIntent = "Testing resilience engineering, telemetry, and fault-tolerance mindset.";

  if (req.githubRepoContext) {
    followUpPrompt =
      "Looking closely at your repository's design, what single point of failure (SPOF) exists in this component, and how would you redesign it for 10x traffic?";
    followUpIntent = "Probing distributed systems resilience, fault isolation, and architectural trade-offs in candidate's project.";
  } else if (req.customJdContext) {
    followUpPrompt =
      "How do your technical choices in this response directly address the performance and scale requirements outlined in the target job description?";
    followUpIntent = "Validating practical fit for the specific engineering stack and high-throughput requirements of this role.";
  } else if (!resultPresent) {
    followUpPrompt =
      "You walked through the implementation steps, but how exactly did you benchmark the performance improvement or business impact after shipping?";
    followUpIntent = "Verifying whether the candidate measures technical outcomes with real data.";
  } else if (!actionPresent) {
    followUpPrompt =
      "Can you walk me through the specific architectural trade-offs you evaluated before choosing your final technical stack?";
    followUpIntent = "Evaluating technical depth and rationale behind tool selection.";
  } else if (req.category === "resume-grill") {
    followUpPrompt =
      "If concurrent traffic or dataset size increased by 10x overnight, where would this architecture fail first, and how would you redesign it?";
    followUpIntent = "Assessing distributed systems scaling limits and bottleneck anticipation.";
  }

  return {
    overallScore,
    contentScore,
    deliveryScore,
    starBreakdown,
    deliveryCritique: {
      pacingVerdict,
      pacingAdvice,
      fillerAdvice,
      bodyLanguageAdvice,
    },
    strengths,
    improvements,
    rewrittenIdealAnswer,
    followUpQuestion: {
      prompt: followUpPrompt,
      intent: followUpIntent,
    },
    evaluationSource: "heuristic",
  };
}

// ─── Normalizer for LLM JSON Response ────────────────────────────────────────

function buildStandardizedResponse(
  parsed: Record<string, unknown>,
  fallback: InterviewEvaluationResponse
): InterviewEvaluationResponse {
  const overall = typeof parsed.overallScore === "number" ? clamp(parsed.overallScore) : fallback.overallScore;
  const content = typeof parsed.contentScore === "number" ? clamp(parsed.contentScore) : overall;
  const delivery = typeof parsed.deliveryScore === "number" ? clamp(parsed.deliveryScore) : fallback.deliveryScore;

  const starObj = (parsed.starBreakdown as Record<string, unknown>) || {};
  const situation = (starObj.situation as Record<string, unknown>) || {};
  const task = (starObj.task as Record<string, unknown>) || {};
  const action = (starObj.action as Record<string, unknown>) || {};
  const result = (starObj.result as Record<string, unknown>) || {};

  const critique = (parsed.deliveryCritique as Record<string, unknown>) || {};

  const validVerdicts: DeliveryCritique["pacingVerdict"][] = [
    "Too Slow (<100 WPM)",
    "Optimal (115-155 WPM)",
    "Rushed (>160 WPM)",
  ];
  const pacingVerdict = validVerdicts.includes(critique.pacingVerdict as DeliveryCritique["pacingVerdict"])
    ? (critique.pacingVerdict as DeliveryCritique["pacingVerdict"])
    : fallback.deliveryCritique.pacingVerdict;

  const strengths = Array.isArray(parsed.strengths) && parsed.strengths.length > 0
    ? parsed.strengths.slice(0, 4).map(String)
    : fallback.strengths;

  const improvements = Array.isArray(parsed.improvements) && parsed.improvements.length > 0
    ? parsed.improvements.slice(0, 4).map(String)
    : fallback.improvements;

  const rewrittenIdealAnswer = String(parsed.rewrittenIdealAnswer || "").trim() || fallback.rewrittenIdealAnswer;

  const fq = (parsed.followUpQuestion as Record<string, unknown>) || {};
  const followUpPrompt = String(fq.prompt || "").trim() || fallback.followUpQuestion.prompt;
  const followUpIntent = String(fq.intent || "").trim() || fallback.followUpQuestion.intent;

  return {
    overallScore: overall,
    contentScore: content,
    deliveryScore: delivery,
    starBreakdown: {
      situation: {
        score: clamp(typeof situation.score === "number" ? situation.score : fallback.starBreakdown.situation.score),
        feedback: String(situation.feedback || fallback.starBreakdown.situation.feedback),
        present: typeof situation.present === "boolean" ? situation.present : fallback.starBreakdown.situation.present,
      },
      task: {
        score: clamp(typeof task.score === "number" ? task.score : fallback.starBreakdown.task.score),
        feedback: String(task.feedback || fallback.starBreakdown.task.feedback),
        present: typeof task.present === "boolean" ? task.present : fallback.starBreakdown.task.present,
      },
      action: {
        score: clamp(typeof action.score === "number" ? action.score : fallback.starBreakdown.action.score),
        feedback: String(action.feedback || fallback.starBreakdown.action.feedback),
        present: typeof action.present === "boolean" ? action.present : fallback.starBreakdown.action.present,
      },
      result: {
        score: clamp(typeof result.score === "number" ? result.score : fallback.starBreakdown.result.score),
        feedback: String(result.feedback || fallback.starBreakdown.result.feedback),
        present: typeof result.present === "boolean" ? result.present : fallback.starBreakdown.result.present,
      },
    },
    deliveryCritique: {
      pacingVerdict,
      pacingAdvice: String(critique.pacingAdvice || fallback.deliveryCritique.pacingAdvice),
      fillerAdvice: String(critique.fillerAdvice || fallback.deliveryCritique.fillerAdvice),
      bodyLanguageAdvice: String(critique.bodyLanguageAdvice || fallback.deliveryCritique.bodyLanguageAdvice),
    },
    strengths,
    improvements,
    rewrittenIdealAnswer,
    followUpQuestion: {
      prompt: followUpPrompt,
      intent: followUpIntent,
    },
    evaluationSource: "ai",
  };
}

// ─── Engine 1: Groq Llama 3.3 70B AI Evaluator ───────────────────────────────

async function evaluateWithGroq(
  req: InterviewEvaluationRequest,
  fallback: InterviewEvaluationResponse
): Promise<InterviewEvaluationResponse | null> {
  const apiKey = sanitizeKey(process.env.GROQ_API_KEY);
  if (!apiKey || apiKey.startsWith("your_") || apiKey.startsWith("demo_")) return null;

  try {
    const systemPrompt = `You are a Principal Staff Software Engineer and Bar-Raiser Interviewer at a Tier-1 tech company.
Evaluate the candidate's interview answer based strictly on the STAR methodology (Situation, Task, Action, Result) combined with their acoustic/delivery telemetry.

Return a strictly valid JSON object matching this schema:
{
  "overallScore": number (0-100 composite, 70% content + 30% delivery),
  "contentScore": number (0-100),
  "deliveryScore": number (0-100),
  "starBreakdown": {
    "situation": { "score": number (0-100), "feedback": string, "present": boolean },
    "task": { "score": number (0-100), "feedback": string, "present": boolean },
    "action": { "score": number (0-100), "feedback": string, "present": boolean },
    "result": { "score": number (0-100), "feedback": string, "present": boolean }
  },
  "deliveryCritique": {
    "pacingVerdict": "Too Slow (<100 WPM)" | "Optimal (115-155 WPM)" | "Rushed (>160 WPM)",
    "pacingAdvice": string,
    "fillerAdvice": string,
    "bodyLanguageAdvice": string
  },
  "strengths": [string, string, string],
  "improvements": [string, string, string],
  "rewrittenIdealAnswer": string (a 95/100 polished first-person STAR answer incorporating candidate's context),
  "followUpQuestion": {
    "prompt": string (sharp interviewer cross-question directly probing a weakness or trade-off in the answer),
    "intent": string (why the interviewer asks this)
  }
}`;

    const userPrompt = `Target Role: ${req.role}
Question Category: ${req.category}
Question: ${req.questionText}
Candidate Spoken Transcript:
"""
${req.userTranscript || "No transcript provided"}
"""

Candidate Delivery Telemetry:
- Average WPM: ${req.telemetry?.avgWpm ?? 125} WPM
- Total Filler Words: ${req.telemetry?.totalFillerCount ?? 0}
- Hesitation Pauses (>2.5s): ${req.telemetry?.hesitationGapsCount ?? 0}
- Eye Contact: ${req.telemetry?.eyeContactPct !== undefined && req.telemetry.eyeContactPct >= 0 ? `${req.telemetry.eyeContactPct}%` : "Camera Disabled"}
- Posture Stability: ${req.telemetry?.postureStabilityPct ?? 85}%
${req.resumeContext ? `\nResume / Project Context:\n${req.resumeContext}` : ""}
${req.githubRepoContext ? `\nGitHub Repository Architecture Context:\n${req.githubRepoContext}` : ""}
${req.customJdContext ? `\nTarget Job Description Requirements:\n${req.customJdContext}` : ""}`;

    const candidateModels = [
      "llama-3.3-70b-versatile",
      "openai/gpt-oss-120b",
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-20b",
    ];

    let content: string | null = null;
    for (const model of candidateModels) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
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
          signal: AbortSignal.timeout(12000),
        });

        if (res.ok) {
          const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
          content = data?.choices?.[0]?.message?.content || null;
          if (content) break;
        }
      } catch {
        // Try next candidate model
      }
    }

    if (!content) return null;

    const parsed = extractJsonObject(content);
    if (!parsed) return null;

    return buildStandardizedResponse(parsed, fallback);
  } catch (err) {
    console.warn("[Groq Evaluation Warning]:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ─── Engine 2: Gemini 2.0 Flash AI Evaluator ─────────────────────────────────

async function evaluateWithGemini(
  req: InterviewEvaluationRequest,
  fallback: InterviewEvaluationResponse
): Promise<InterviewEvaluationResponse | null> {
  const apiKey = sanitizeKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  if (!apiKey || apiKey.startsWith("your_") || apiKey.startsWith("demo_")) return null;

  try {
    const prompt = `You are a Principal Staff Software Engineer and Bar-Raiser Interviewer.
Evaluate the candidate's interview response against the STAR rubric and delivery telemetry.

Role: ${req.role}
Question: ${req.questionText}
Candidate Transcript:
"""
${req.userTranscript || "No transcript"}
"""

Telemetry:
- WPM: ${req.telemetry?.avgWpm ?? 125}
- Fillers: ${req.telemetry?.totalFillerCount ?? 0}
- Silence gaps (>2.5s): ${req.telemetry?.hesitationGapsCount ?? 0}
- Eye Contact: ${req.telemetry?.eyeContactPct !== undefined && req.telemetry.eyeContactPct >= 0 ? `${req.telemetry.eyeContactPct}%` : "Camera Off"}
${req.resumeContext ? `\nResume Context:\n${req.resumeContext}` : ""}
${req.githubRepoContext ? `\nGitHub Repository Architecture Context:\n${req.githubRepoContext}` : ""}
${req.customJdContext ? `\nTarget Job Description Requirements:\n${req.customJdContext}` : ""}

Respond ONLY with valid JSON:
{
  "overallScore": <number 0-100>,
  "contentScore": <number 0-100>,
  "deliveryScore": <number 0-100>,
  "starBreakdown": {
    "situation": { "score": <number>, "feedback": "<string>", "present": <boolean> },
    "task": { "score": <number>, "feedback": "<string>", "present": <boolean> },
    "action": { "score": <number>, "feedback": "<string>", "present": <boolean> },
    "result": { "score": <number>, "feedback": "<string>", "present": <boolean> }
  },
  "deliveryCritique": {
    "pacingVerdict": "Optimal (115-155 WPM)",
    "pacingAdvice": "<string>",
    "fillerAdvice": "<string>",
    "bodyLanguageAdvice": "<string>"
  },
  "strengths": ["<string>", "<string>"],
  "improvements": ["<string>", "<string>"],
  "rewrittenIdealAnswer": "<string>",
  "followUpQuestion": {
    "prompt": "<string>",
    "intent": "<string>"
  }
}`;

    const candidateModels = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-2.5-flash",
      "gemini-3.8-flash",
    ];

    let rawText = "";
    for (const model of candidateModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
                maxOutputTokens: 2048,
              },
            }),
            signal: AbortSignal.timeout(10000),
          }
        );

        if (res.ok) {
          const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
          rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (rawText) break;
        }
      } catch {
        // Try next candidate model
      }
    }

    if (!rawText) return null;

    const parsed = extractJsonObject(rawText);
    if (!parsed) return null;

    return buildStandardizedResponse(parsed, fallback);
  } catch (err) {
    console.warn("[Gemini Evaluation Warning]:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as InterviewEvaluationRequest;

    if (!payload || !payload.questionText) {
      return NextResponse.json(
        { error: "Invalid request payload: questionText is required." },
        { status: 400 }
      );
    }

    // Always precalculate heuristic baseline for instant fallback & field guarantees
    const fallback = computeDeterministicEvaluation(payload);

    // 1. Try Engine 1: Groq (Llama 3.3 70B)
    const groqResult = await evaluateWithGroq(payload, fallback);
    if (groqResult) {
      return NextResponse.json(groqResult);
    }

    // 2. Try Engine 2: Gemini 2.0 Flash
    const geminiResult = await evaluateWithGemini(payload, fallback);
    if (geminiResult) {
      return NextResponse.json(geminiResult);
    }

    // 3. Guaranteed Deterministic Heuristic Fallback
    return NextResponse.json(fallback);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal evaluation error";
    console.error("[Evaluation Route Error]:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
