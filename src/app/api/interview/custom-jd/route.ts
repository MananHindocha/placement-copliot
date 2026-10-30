import { NextRequest, NextResponse } from "next/server";
import type { InterviewQuestion, InterviewCategory } from "@/types";

interface CustomJdRequestBody {
  targetCompany?: string;
  jobTitle?: string;
  jobDescription: string;
  count?: number;
}

function generateDeterministicJdQuestions(
  company: string,
  role: string,
  jd: string
): InterviewQuestion[] {
  const lower = jd.toLowerCase();
  const detectedStack: string[] = [];

  const techKeywords = [
    "react", "next.js", "vue", "angular", "typescript", "javascript", "tailwind",
    "node.js", "express", "go", "golang", "python", "fastapi", "django", "java", "spring boot",
    "postgresql", "mysql", "mongodb", "redis", "kafka", "elasticsearch", "graphql",
    "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "ci/cd", "microservices",
    "distributed systems", "rest api", "grpc", "ci/cd", "ci cd", "git"
  ];

  for (const tech of techKeywords) {
    if (lower.includes(tech)) {
      detectedStack.push(tech.charAt(0).toUpperCase() + tech.slice(1));
    }
  }

  const primaryTech = detectedStack.slice(0, 4).join(", ") || "Full-Stack Software Engineering";

  return [
    {
      id: `custom-jd-${Date.now()}-1`,
      role: role || "Software Engineer",
      category: "core-technical",
      difficulty: "medium",
      question: `Looking at ${company || "our team"}'s core requirements around ${primaryTech}, how have you designed and maintained high-throughput components using these technologies in production?`,
      hint: "Walk through specific architectural decisions, state management, and latency optimizations you applied in a real project.",
      idealAnswer: `In my previous work with ${primaryTech}, I separated concerns into modular service layers, implemented connection pooling and caching layers (Redis), and benchmarked endpoints to keep p95 latency under 80ms while maintaining type safety.`,
      keyConceptsToCover: ["Architecture", "Throughput", "Caching", "Latency Tuning"]
    },
    {
      id: `custom-jd-${Date.now()}-2`,
      role: role || "Software Engineer",
      category: "system-design",
      difficulty: "hard",
      question: `Design an end-to-end resilient architecture tailored to ${company || "this company"}'s business domain that handles peak traffic spikes with zero data loss.`,
      hint: "Focus on decoupling write paths via message queues (Kafka/RabbitMQ), database sharding/read-replicas, and circuit breakers.",
      idealAnswer: `I would implement an event-driven design: write requests pass through an API Gateway to a distributed queue like Kafka with replication factor 3. Worker consumers write asynchronously to primary Postgres databases with automated retry queues and Dead Letter Queues (DLQ) for failed payloads.`,
      keyConceptsToCover: ["Event-Driven Architecture", "Kafka/Queues", "DLQ", "Circuit Breakers", "Read Replicas"]
    },
    {
      id: `custom-jd-${Date.now()}-3`,
      role: role || "Software Engineer",
      category: "debugging",
      difficulty: "hard",
      question: `Suppose a mission-critical endpoint at ${company || "our company"} starts returning intermittent 504 Gateway Timeouts during a marketing campaign. How would you diagnose and mitigate this under high pressure?`,
      hint: "Structure your response around immediate traffic mitigation, APM trace inspection, database slow query logs, and rollback/hotfix procedures.",
      idealAnswer: `First, I check APM dashboards to isolate the bottleneck layer. If DB connection exhaustion is the cause, I immediately shed load using read caches or rate limiting, investigate query locks, and deploy targeted index patches.`,
      keyConceptsToCover: ["APM Distributed Tracing", "DB Lock Contention", "Connection Pooling", "Load Shedding", "Root Cause Analysis"]
    },
    {
      id: `custom-jd-${Date.now()}-4`,
      role: role || "Software Engineer",
      category: "dsa",
      difficulty: "medium",
      question: `In the context of the data processing required for this role, how would you design an efficient in-memory algorithm to deduplicate and aggregate streaming log events in real time?`,
      hint: "Consider sliding window counters, hash maps with TTL, or Bloom filters for space-efficient membership tests.",
      idealAnswer: `I would utilize a sliding window with a Bloom filter for probabilistic pre-filtering (sub-millisecond rejection of seen items) combined with an LRU cache or Redis Sorted Set to maintain exact event timestamps and deduplication windows with bounded memory.`,
      keyConceptsToCover: ["Bloom Filters", "Sliding Window", "LRU Cache", "Time Complexity", "Space Complexity"]
    },
    {
      id: `custom-jd-${Date.now()}-5`,
      role: role || "Software Engineer",
      category: "behavioral",
      difficulty: "medium",
      question: `This role at ${company || "our organization"} requires cross-functional collaboration and moving fast with ambiguity. Tell me about a time you took ownership of a vaguely defined feature and drove it to production.`,
      hint: "Use STAR: Situation, Task, Action, Result. Highlight writing an RFC/spec, aligning stakeholders, and delivering measurable impact.",
      idealAnswer: `When tasked with improving checkout conversions without clear specs, I interviewed customer support and analyzed analytics drop-offs. I authored a 2-page technical proposal, aligned product and design leads, broke implementation into 2-week iterations, and successfully decreased cart drop-off by 18%.`,
      keyConceptsToCover: ["STAR Method", "RFC Documentation", "Ambiguity Resolution", "Stakeholder Alignment"]
    },
    {
      id: `custom-jd-${Date.now()}-6`,
      role: role || "Software Engineer",
      category: "culture",
      difficulty: "easy",
      question: `Why ${company || "this company"} specifically, and how do your technical principles align with the high-bar engineering culture described in this job posting?`,
      hint: "Mention specific products, scale challenges, and technical engineering philosophy mentioned in the job description.",
      idealAnswer: `I admire how ${company || "the company"} solves engineering problems at scale. My core philosophy is writing self-documenting code with comprehensive test coverage and automated CI/CD pipelines, ensuring our velocity increases as the system scales.`,
      keyConceptsToCover: ["Company Culture", "Engineering Principles", "Test Automation", "Continuous Delivery"]
    }
  ];
}

async function generateWithGroq(
  company: string,
  role: string,
  jd: string,
  count: number = 8
): Promise<InterviewQuestion[] | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("your_groq")) return null;

  const systemPrompt = `You are a Principal Engineering Hiring Manager and Bar-Raiser at a top-tier tech company.
Your task is to analyze the provided Job Description (JD) and produce an array of exactly ${count} highly targeted, challenging interview questions tailored specifically to the company, role, required tech stack, and responsibilities.

Questions must span categories: "core-technical", "system-design", "debugging", "dsa", "behavioral", and "culture".

Output MUST be strictly valid JSON in this exact schema:
{
  "questions": [
    {
      "id": "custom-1",
      "role": "${role}",
      "category": "core-technical",
      "difficulty": "medium" | "hard" | "easy",
      "question": "string (clear, probing question referencing actual tech/responsibilities from the JD)",
      "hint": "string (guidance on what a great candidate highlights)",
      "idealAnswer": "string (STAR/architectural model response demonstrating mastery)",
      "keyConceptsToCover": ["string", "string", "string"]
    }
  ]
}`;

  const userPrompt = `Target Company: ${company || "Not specified"}
Target Role: ${role || "Software Engineer"}
Full Job Description:
"""
${jd.slice(0, 4000)}
"""`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) return null;

    return parsed.questions.map((q: any, i: number) => ({
      id: `custom-jd-${Date.now()}-${i + 1}`,
      role: role || q.role || "Software Engineer",
      category: (q.category as InterviewCategory) || "core-technical",
      difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
      question: String(q.question),
      hint: String(q.hint || "Highlight practical real-world trade-offs."),
      idealAnswer: String(q.idealAnswer || ""),
      keyConceptsToCover: Array.isArray(q.keyConceptsToCover)
        ? q.keyConceptsToCover.slice(0, 5).map(String)
        : ["Architecture", "Trade-offs", "Production Scale"],
    }));
  } catch {
    return null;
  }
}

async function generateWithGemini(
  company: string,
  role: string,
  jd: string,
  count: number = 8
): Promise<InterviewQuestion[] | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || apiKey.includes("your_gemini")) return null;

  const prompt = `You are a Principal Engineering Hiring Manager.
Analyze this Job Description and return a JSON object with exactly ${count} deep, tailored interview questions across core-technical, system-design, debugging, dsa, behavioral, and culture.

Company: ${company || "Target Company"}
Role: ${role || "Software Engineer"}
Job Description:
"""
${jd.slice(0, 3500)}
"""

Respond ONLY with strictly valid JSON:
{
  "questions": [
    {
      "id": "jd-1",
      "role": "${role}",
      "category": "core-technical",
      "difficulty": "medium",
      "question": "string",
      "hint": "string",
      "idealAnswer": "string",
      "keyConceptsToCover": ["concept1", "concept2"]
    }
  ]
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
        signal: AbortSignal.timeout(12000),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) return null;

    return parsed.questions.map((q: any, i: number) => ({
      id: `custom-jd-${Date.now()}-${i + 1}`,
      role: role || q.role || "Software Engineer",
      category: (q.category as InterviewCategory) || "core-technical",
      difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
      question: String(q.question),
      hint: String(q.hint || "Highlight practical trade-offs."),
      idealAnswer: String(q.idealAnswer || ""),
      keyConceptsToCover: Array.isArray(q.keyConceptsToCover)
        ? q.keyConceptsToCover.slice(0, 5).map(String)
        : ["Architecture", "Trade-offs"],
    }));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CustomJdRequestBody;

    if (!body || !body.jobDescription || body.jobDescription.trim().length < 20) {
      return NextResponse.json(
        { error: "Please provide a valid Job Description of at least 20 characters." },
        { status: 400 }
      );
    }

    const company = (body.targetCompany || "").trim();
    const role = (body.jobTitle || "").trim() || "Software Engineer";
    const jd = body.jobDescription.trim();
    const count = Math.min(15, Math.max(5, body.count || 8));

    // 1. Try Groq Llama 3.3 70B
    const groqQuestions = await generateWithGroq(company, role, jd, count);
    if (groqQuestions && groqQuestions.length > 0) {
      return NextResponse.json({
        success: true,
        source: "groq-llama-3.3-70b",
        questions: groqQuestions,
      });
    }

    // 2. Try Gemini 2.0 Flash
    const geminiQuestions = await generateWithGemini(company, role, jd, count);
    if (geminiQuestions && geminiQuestions.length > 0) {
      return NextResponse.json({
        success: true,
        source: "gemini-2.0-flash",
        questions: geminiQuestions,
      });
    }

    // 3. Deterministic Heuristic Fallback
    const fallbackQuestions = generateDeterministicJdQuestions(company, role, jd);
    return NextResponse.json({
      success: true,
      source: "heuristic",
      questions: fallbackQuestions,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate custom JD questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
