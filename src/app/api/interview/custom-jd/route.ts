import { NextRequest, NextResponse } from "next/server";
import { callInterviewLLM, extractJsonObject } from "@/lib/interview/server-helpers";
import type { InterviewQuestion, InterviewCategory } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CustomJdRequestBody {
  targetCompany?: string;
  jobTitle?: string;
  jobDescription: string;
  count?: number;
}

interface RawJdQuestion {
  role?: unknown;
  category?: unknown;
  difficulty?: unknown;
  question?: unknown;
  hint?: unknown;
  idealAnswer?: unknown;
  keyConceptsToCover?: unknown;
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

async function generateWithSharedLLM(
  company: string,
  role: string,
  jd: string,
  count: number = 8
): Promise<{ provider: string; questions: InterviewQuestion[] } | null> {
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
    const { text, provider } = await callInterviewLLM({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      timeoutMs: 14000,
    });

    const parsed = JSON.parse(extractJsonObject(text)) as { questions?: RawJdQuestion[] };
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) return null;

    const questions: InterviewQuestion[] = parsed.questions.map((q, i) => ({
      id: `custom-jd-${Date.now()}-${i + 1}`,
      role: role || (typeof q.role === "string" ? q.role : "Software Engineer"),
      category: (typeof q.category === "string" ? q.category : "core-technical") as InterviewCategory,
      difficulty:
        typeof q.difficulty === "string" && ["easy", "medium", "hard"].includes(q.difficulty)
          ? (q.difficulty as "easy" | "medium" | "hard")
          : "medium",
      question: String(q.question || ""),
      hint: String(q.hint || "Highlight practical real-world trade-offs."),
      idealAnswer: String(q.idealAnswer || ""),
      keyConceptsToCover: Array.isArray(q.keyConceptsToCover)
        ? q.keyConceptsToCover.slice(0, 5).map(String)
        : ["Architecture", "Trade-offs", "Production Scale"],
    }));

    return { provider, questions };
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

    // 1. Try unified Gemini / Groq active model cascade via shared server-helpers
    const llmResult = await generateWithSharedLLM(company, role, jd, count);
    if (llmResult && llmResult.questions.length > 0) {
      return NextResponse.json({
        success: true,
        source: `${llmResult.provider}-active`,
        questions: llmResult.questions,
      });
    }

    // 2. Deterministic Heuristic Fallback when keys are unconfigured or providers are unavailable
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
