import { NextRequest, NextResponse } from "next/server";
import type {
  InterviewEvaluationRequest,
  InterviewEvaluationResponse,
  StarBreakdown,
  DeliveryCritique,
} from "@/types";

// ─── Helper: Clamp Numbers ───────────────────────────────────────────────────

function clamp(val: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(val)));
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
      deliveryScore += 5; // Bonus for strong executive eye presence
    } else if (eyeContactPct < 60) {
      deliveryScore -= 10;
    }
  }

  deliveryScore = clamp(deliveryScore, 42, 98);

  // 3. Content Score Calculation (Weighted STAR Rubric)
  const contentScore = clamp(
    Math.round(
      starBreakdown.situation.score * 0.2 +
        starBreakdown.task.score * 0.2 +
        starBreakdown.action.score * 0.35 +
        starBreakdown.result.score * 0.25
    ),
    40,
    98
  );

  // 4. Overall Composite (70% Content + 30% Delivery)
  const overallScore = clamp(Math.round(contentScore * 0.7 + deliveryScore * 0.3));

  // 5. Pacing Verdict & Critique
  let pacingVerdict: DeliveryCritique["pacingVerdict"] = "Optimal (115-155 WPM)";
  let pacingAdvice = "Your pacing is well-modulated and easy for interviewers to follow.";

  if (avgWpm < 100) {
    pacingVerdict = "Too Slow (<100 WPM)";
    pacingAdvice = `Average pacing was ${avgWpm} WPM. Pick up momentum slightly to maintain interviewer engagement.`;
  } else if (avgWpm > 160) {
    pacingVerdict = "Rushed (>160 WPM)";
    pacingAdvice = `Average pacing was ${avgWpm} WPM. Slow down slightly and pause after key milestones to emphasize technical decisions.`;
  }

  // Filler Advice
  const topFillers = Object.entries(fillerWords)
    .sort((a, b) => b[1] - a[1])
    .map(([w, c]) => `"${w}" (${c}x)`)
    .join(", ");

  const fillerAdvice =
    totalFillerCount > 0
      ? `Detected ${totalFillerCount} filler occurrences (${topFillers || "um/like"}). Embrace brief silent pauses instead of reflexively filling silence.`
      : "Exceptional verbal economy — zero distracting filler words detected.";

  // Body Language Advice
  let bodyLanguageAdvice =
    "Camera was inactive. We recommend practicing with the camera enabled to calibrate your eye-contact ratio.";
  if (eyeContactPct >= 0) {
    if (eyeContactPct >= 75) {
      bodyLanguageAdvice = `Outstanding direct eye contact (${eyeContactPct}%). Posture stability is well centered (${postureStabilityPct}%).`;
    } else {
      bodyLanguageAdvice = `Eye contact was ${eyeContactPct}%. Try looking directly at the camera lens rather than looking down or at the screen corners.`;
    }
  }

  // 6. Strengths & Improvements
  const strengths: string[] = [];
  if (actionHits >= 2) strengths.push("Articulated concrete engineering choices and execution steps.");
  if (totalFillerCount <= 2) strengths.push("Maintained clear verbal articulation with minimal vocal disfluency.");
  if (avgWpm >= 115 && avgWpm <= 155) strengths.push(`Optimal vocal pacing maintained at ${avgWpm} WPM.`);
  if (resultHits > 0) strengths.push("Highlighted business or system outcomes rather than just responsibilities.");
  if (strengths.length < 2) strengths.push("Demonstrated direct answers aligned with the interviewer prompt.");

  const improvements: string[] = [];
  if (!resultPresent) improvements.push("Quantify your end results using exact metrics (latency, percentage gains, user adoption).");
  if (totalFillerCount > 3) improvements.push(`Reduce filler density (used ${totalFillerCount} filler words). Practice pausing in silence.`);
  if (hesitationGapsCount >= 2) improvements.push(`Detected ${hesitationGapsCount} prolonged hesitation pauses (>2.5s). Structure answers faster with STAR.`);
  if (!taskPresent) improvements.push("State the technical problem constraint explicitly before jumping into the code implementation.");
  if (improvements.length < 2) improvements.push("Deepen your explanation of technical trade-offs between competing architectural options.");

  // 7. Rewritten Ideal Answer (95/100 Polished First-Person STAR Answer)
  const roleName = req.role || "Software Engineer";
  const userSummary = transcript.length > 50 ? transcript.slice(0, 180) : "working on our core application architecture";
  const rewrittenIdealAnswer =
    `"In my previous project as a ${roleName}, I encountered a critical challenge: ${userSummary.replace(/"/g, "")}... ` +
    `To resolve the root bottleneck, I architected a robust pipeline using modern design patterns, structured logging, and automated integration tests. ` +
    `Specifically, I decoupled the heavy computational tasks into asynchronous background jobs and introduced Redis caching for hot paths. ` +
    `As a direct outcome, we cut p99 response latency by 42%, reduced infrastructure costs by 18%, and maintained zero regression incidents across 50,000+ daily active users."`;

  // 8. Contextual Follow-Up Probe (Dynamic Cross-Question)
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

// ─── Groq Llama 3.3 70B AI Evaluator ─────────────────────────────────────────

async function evaluateWithGroq(
  req: InterviewEvaluationRequest
): Promise<InterviewEvaluationResponse | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("your_groq")) return null;

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
- Total Filler Words: ${req.telemetry?.totalFillerCount ?? 0} (Breakdown: ${JSON.stringify(req.telemetry?.fillerWords || {})})
- Hesitation Pauses (>2.5s): ${req.telemetry?.hesitationGapsCount ?? 0}
- Eye Contact: ${req.telemetry?.eyeContactPct >= 0 ? `${req.telemetry.eyeContactPct}%` : "Camera Disabled"}
- Posture Stability: ${req.telemetry?.postureStabilityPct ?? 85}%
${req.resumeContext ? `\nResume / Project Context:\n${req.resumeContext}` : ""}
${req.githubRepoContext ? `\nGitHub Repository Architecture Context:\n${req.githubRepoContext}` : ""}
${req.customJdContext ? `\nTarget Job Description Requirements:\n${req.customJdContext}` : ""}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(9000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    if (!parsed.overallScore || !parsed.starBreakdown) return null;

    return {
      overallScore: clamp(parsed.overallScore),
      contentScore: clamp(parsed.contentScore ?? parsed.overallScore),
      deliveryScore: clamp(parsed.deliveryScore ?? 80),
      starBreakdown: {
        situation: {
          score: clamp(parsed.starBreakdown?.situation?.score ?? 70),
          feedback: String(parsed.starBreakdown?.situation?.feedback || "Good context."),
          present: Boolean(parsed.starBreakdown?.situation?.present),
        },
        task: {
          score: clamp(parsed.starBreakdown?.task?.score ?? 70),
          feedback: String(parsed.starBreakdown?.task?.feedback || "Task explained."),
          present: Boolean(parsed.starBreakdown?.task?.present),
        },
        action: {
          score: clamp(parsed.starBreakdown?.action?.score ?? 75),
          feedback: String(parsed.starBreakdown?.action?.feedback || "Solid action steps."),
          present: Boolean(parsed.starBreakdown?.action?.present),
        },
        result: {
          score: clamp(parsed.starBreakdown?.result?.score ?? 65),
          feedback: String(parsed.starBreakdown?.result?.feedback || "Result noted."),
          present: Boolean(parsed.starBreakdown?.result?.present),
        },
      },
      deliveryCritique: {
        pacingVerdict: ["Too Slow (<100 WPM)", "Optimal (115-155 WPM)", "Rushed (>160 WPM)"].includes(
          parsed.deliveryCritique?.pacingVerdict
        )
          ? parsed.deliveryCritique.pacingVerdict
          : "Optimal (115-155 WPM)",
        pacingAdvice: String(parsed.deliveryCritique?.pacingAdvice || "Good speaking cadence."),
        fillerAdvice: String(parsed.deliveryCritique?.fillerAdvice || "Low filler frequency."),
        bodyLanguageAdvice: String(parsed.deliveryCritique?.bodyLanguageAdvice || "Maintained focus."),
      },
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.slice(0, 4).map(String)
        : ["Clear articulation", "Structured overview"],
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements.slice(0, 4).map(String)
        : ["Add more quantitative metrics", "Clarify architectural trade-offs"],
      rewrittenIdealAnswer: String(parsed.rewrittenIdealAnswer || ""),
      followUpQuestion: {
        prompt: String(
          parsed.followUpQuestion?.prompt ||
            "How did you monitor performance and maintain reliability post-release?"
        ),
        intent: String(
          parsed.followUpQuestion?.intent || "Evaluating operational readiness and metric validation."
        ),
      },
      evaluationSource: "ai",
    };
  } catch {
    return null;
  }
}

// ─── Gemini 2.0 Flash AI Evaluator ───────────────────────────────────────────

async function evaluateWithGemini(
  req: InterviewEvaluationRequest
): Promise<InterviewEvaluationResponse | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || apiKey.includes("your_gemini")) return null;

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
- Eye Contact: ${req.telemetry?.eyeContactPct >= 0 ? `${req.telemetry.eyeContactPct}%` : "Camera Off"}
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

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1400,
          },
        }),
        signal: AbortSignal.timeout(9000),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.overallScore || !parsed.starBreakdown) return null;

    return {
      overallScore: clamp(parsed.overallScore),
      contentScore: clamp(parsed.contentScore ?? parsed.overallScore),
      deliveryScore: clamp(parsed.deliveryScore ?? 80),
      starBreakdown: {
        situation: {
          score: clamp(parsed.starBreakdown?.situation?.score ?? 70),
          feedback: String(parsed.starBreakdown?.situation?.feedback || ""),
          present: Boolean(parsed.starBreakdown?.situation?.present),
        },
        task: {
          score: clamp(parsed.starBreakdown?.task?.score ?? 70),
          feedback: String(parsed.starBreakdown?.task?.feedback || ""),
          present: Boolean(parsed.starBreakdown?.task?.present),
        },
        action: {
          score: clamp(parsed.starBreakdown?.action?.score ?? 75),
          feedback: String(parsed.starBreakdown?.action?.feedback || ""),
          present: Boolean(parsed.starBreakdown?.action?.present),
        },
        result: {
          score: clamp(parsed.starBreakdown?.result?.score ?? 65),
          feedback: String(parsed.starBreakdown?.result?.feedback || ""),
          present: Boolean(parsed.starBreakdown?.result?.present),
        },
      },
      deliveryCritique: {
        pacingVerdict: ["Too Slow (<100 WPM)", "Optimal (115-155 WPM)", "Rushed (>160 WPM)"].includes(
          parsed.deliveryCritique?.pacingVerdict
        )
          ? parsed.deliveryCritique.pacingVerdict
          : "Optimal (115-155 WPM)",
        pacingAdvice: String(parsed.deliveryCritique?.pacingAdvice || ""),
        fillerAdvice: String(parsed.deliveryCritique?.fillerAdvice || ""),
        bodyLanguageAdvice: String(parsed.deliveryCritique?.bodyLanguageAdvice || ""),
      },
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4).map(String) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 4).map(String) : [],
      rewrittenIdealAnswer: String(parsed.rewrittenIdealAnswer || ""),
      followUpQuestion: {
        prompt: String(parsed.followUpQuestion?.prompt || "How did you monitor performance?"),
        intent: String(parsed.followUpQuestion?.intent || "Evaluating verification."),
      },
      evaluationSource: "ai",
    };
  } catch {
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

    // 1. Try Groq (Ultra-fast Llama 3.3 70B)
    const groqResult = await evaluateWithGroq(payload);
    if (groqResult) {
      return NextResponse.json(groqResult);
    }

    // 2. Try Gemini 2.0 Flash
    const geminiResult = await evaluateWithGemini(payload);
    if (geminiResult) {
      return NextResponse.json(geminiResult);
    }

    // 3. Guaranteed Deterministic Heuristic Fallback
    const heuristicResult = computeDeterministicEvaluation(payload);
    return NextResponse.json(heuristicResult);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal evaluation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
