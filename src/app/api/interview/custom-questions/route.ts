import { NextRequest, NextResponse } from "next/server";
import type { InterviewQuestion } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface CustomQuestionsPayload {
  targetRole: string;
  targetCompany?: string;
  jobRequirement: string;
  resumeContext?: {
    candidateName?: string;
    skills?: string[];
    projects?: Array<{ title: string; subtitle?: string; bullets: string[] }>;
    experience?: Array<{ title: string; subtitle?: string; bullets: string[] }>;
  };
  focusCategories?: string[];
  difficulty?: "Easy" | "Medium" | "Hard" | "Mixed";
  count?: number;
}

function sanitizeKey(key: string | undefined): string {
  if (!key) return "";
  return key.trim().replace(/^["']|["']$/g, "").trim();
}

function extractJsonObject<T>(text: string): T | null {
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
    return JSON.parse(jsonCandidate) as T;
  } catch {
    return null;
  }
}

// ─── Smart Deterministic Generator (Zero-API Fallback) ─────────────────────────

function generateDeterministicQuestions(
  payload: CustomQuestionsPayload
): InterviewQuestion[] {
  const role = payload.targetRole || "Full-Stack SDE";
  const company = payload.targetCompany || "Tech Industry";
  const jd = payload.jobRequirement || "Scalable distributed web systems";
  const projects = payload.resumeContext?.projects || [];
  const skills = payload.resumeContext?.skills || [
    "TypeScript",
    "React",
    "Node.js",
    "PostgreSQL",
    "Redis",
    "AWS",
  ];
  const p1 = projects[0]?.title || "Full-Stack Web Platform";
  const p2 = projects[1]?.title || "Microservices Backend";
  const reqCount = payload.count || 12;

  const templates: Array<Omit<InterviewQuestion, "id">> = [
    {
      role,
      category: "resume-grill",
      difficulty: "hard",
      question: `On your resume, you built "${p1}". Since ${company} requires ${jd.slice(0, 70)}, walk me through the single point of failure (SPOF) in this project and how you would re-architect it for 10x scale.`,
      hint: `Address stateless application horizontal scaling, database connection pooling (PgBouncer), read replicas, and caching layer eviction policies.`,
      sampleAnswer: `In "${p1}", the primary vulnerability is the single relational database instance under sudden write surges. To adapt this for ${company}'s scale requirements, I would decouple ingress traffic using an Apache Kafka message broker for asynchronous processing, introduce Redis cluster for sub-5ms cached reads, and implement read-replicas with automated failover via AWS Aurora.`,
      keyConceptsToCover: ["Single Point of Failure", "Horizontal Scaling", "Read Replicas", "Write Buffering"],
      followUps: [
        "How do you ensure data consistency between your cache and primary database during network partitions?",
        "What metric would trigger horizontal pod autoscaling in this architecture?"
      ]
    },
    {
      role,
      category: "core-technical",
      difficulty: "medium",
      question: `Our team at ${company} relies heavily on ${skills.slice(0, 3).join(", ")}. How do you manage connection pooling, transaction boundaries, and deadlock prevention in your backend services?`,
      hint: `Discuss database isolation levels (READ COMMITTED vs SERIALIZABLE), row-level locks (SELECT FOR UPDATE), and keeping transaction blocks as brief as possible.`,
      sampleAnswer: `I manage connection pooling using PgBouncer in transaction pooling mode to prevent connection exhaustion. For transaction boundaries, I keep ACID transactions strictly limited to state mutations, moving external API calls and heavy computation outside the transaction block. To prevent deadlocks, all concurrent transactions acquire row locks in a strictly consistent global ordering.`,
      keyConceptsToCover: ["ACID Isolation Levels", "Row-Level Locking", "Connection Pool Tuning", "Deadlock Graph"],
      followUps: [
        "What happens when a database connection pool is completely saturated under a traffic spike?",
        "When would you choose optimistic concurrency control over pessimistic locks?"
      ]
    },
    {
      role,
      category: "system-design",
      difficulty: "hard",
      question: `Design an end-to-end ingestion and rate-limiting pipeline for ${company}'s public API, handling 50,000 requests per second with strict per-user quotas.`,
      hint: `Compare Token Bucket vs Leaky Bucket vs Sliding Window Counter algorithms using Redis in-memory atomic operations (INCRBY + EXPIRE or Lua scripts).`,
      sampleAnswer: `I would implement the Sliding Window Counter algorithm using Redis and a Lua script for atomic multi-step execution. At API gateway level (Kong / Envoy), each incoming request hashes the client's API key. If the counter in the current rolling 60-second window exceeds the quota, we return HTTP 429 Too Many Requests with a Retry-After header. For high availability, local in-memory token buckets act as a secondary fallback if the Redis cluster experiences transient latency.`,
      keyConceptsToCover: ["Token Bucket / Sliding Window", "Redis Lua Scripting", "HTTP 429 Retry-After", "Rate Limiter Fail-Open vs Fail-Closed"],
      followUps: [
        "How do you prevent a distributed denial-of-service (DDoS) attack from overwhelming your rate limiter itself?",
        "What are the trade-offs of Sliding Window Counter versus Token Bucket under bursty traffic?"
      ]
    },
    {
      role,
      category: "debugging",
      difficulty: "hard",
      question: `After deploying a new feature in "${p2 || p1}", customer support reports that 2% of users experience intermittent checkout timeouts, but server CPU and memory usage remain below 30%. How do you isolate the root cause?`,
      hint: `Low CPU + high latency indicates I/O blocking: third-party payment gateway timeouts, database connection starvation, unindexed foreign key queries, or thread pool exhaustion.`,
      sampleAnswer: `Since CPU and memory are healthy, the root cause is external I/O blocking or resource contention. First, I would inspect distributed traces in OpenTelemetry/Datadog to trace the p99 latency waterfall for the 2% affected requests. If the delay occurs at the database tier, I examine active locks via pg_stat_activity and slow query logs. If it originates from an external payment gateway, I verify connection timeout thresholds and check whether synchronous calls are blocking the worker thread pool.`,
      keyConceptsToCover: ["Distributed Tracing", "p99 Latency Breakdown", "Database Lock Contention", "I/O Thread Starvation"],
      followUps: [
        "How do you implement an automated circuit breaker to prevent cascading failures to upstream microservices?",
        "What diagnostic logs would you collect before executing a rollback?"
      ]
    },
    {
      role,
      category: "behavioral",
      difficulty: "medium",
      question: `Tell me about a time you had a strong technical disagreement with a team member or lead regarding an architectural decision on your resume projects. How did you resolve it?`,
      hint: `Use the STAR format (Situation, Task, Action, Result). Focus on empirical benchmarking, proof-of-concept (POC), objective criteria, and commitment to the team outcome.`,
      sampleAnswer: `In "${p1}", my peer proposed MongoDB for our primary datastore, while I advocated for PostgreSQL. The requirement involved financial ledger entries requiring strict transactional ACID guarantees. Rather than arguing conceptually, I built a rapid benchmark testing relational foreign-key consistency and multi-document transactions under simulated race conditions. The data demonstrated PostgreSQL eliminated edge-case double-credit bugs. My teammate concurred, and we successfully shipped with zero accounting reconciliation errors.`,
      keyConceptsToCover: ["Objective Benchmarking", "Proof of Concept", "Data-Driven Consensus", "Disagree and Commit"],
      followUps: [
        "What would you have done if the team lead overruled your benchmarks?",
        "How do you rebuild rapport with a colleague after a passionate technical debate?"
      ]
    },
    {
      role,
      category: "custom-jd",
      difficulty: "medium",
      question: `Reviewing the job requirement: "${jd.slice(0, 100)}...". Which required technical competency do you have the least production experience with, and how will you bridge that gap during your first 30 days?`,
      hint: `Demonstrate self-awareness, deep foundational knowledge transfer, proactive documentation review, and building sandbox spike projects.`,
      sampleAnswer: `While I have strong core expertise across ${skills.slice(0, 2).join(" and ")}, my hands-on exposure to ${jd.slice(0, 40)} has primarily been through architectural study and sandbox implementations rather than multi-region scale. To bridge this gap, in my first 30 days I will deep-dive into ${company}'s production runbooks, review merged pull requests from senior staff, and build a prototype service to internalize team conventions.`,
      keyConceptsToCover: ["Self-Awareness", "Rapid Ramp-Up Plan", "Production Runbook Study", "Accelerated Learning Curve"],
      followUps: [
        "How do you validate your understanding before committing changes to production codebases?",
        "Describe a time you had to learn a completely new framework over a weekend for a deadline."
      ]
    },
    {
      role,
      category: "dsa",
      difficulty: "medium",
      question: `How would you design a data structure that supports insert, delete, getRandom element, and getMedian all in sub-linear time?`,
      hint: `Combine an Array + Hash Map for O(1) getRandom and two Heaps (Max-Heap + Min-Heap) for O(log n) median maintenance.`,
      sampleAnswer: `I would combine two data structures: A Hash Map storing value-to-index mappings alongside a dynamic Array for O(1) insert, delete, and uniform getRandom selection. For median calculation, I maintain two balanced heaps: a Max-Heap for the lower half of values and a Min-Heap for the upper half, allowing O(log n) insertions and O(1) median retrieval by inspecting heap roots.`,
      keyConceptsToCover: ["Two Heaps (Min/Max)", "Hash Map + Dynamic Array", "O(1) Uniform Random", "Sub-linear Maintenance"],
      followUps: [
        "How do you handle duplicate values in this composite structure?",
        "What is the memory overhead of maintaining parallel heap pointers?"
      ]
    },
    {
      role,
      category: "system-design",
      difficulty: "hard",
      question: `How would you architect a distributed job processing queue (similar to BullMQ / Celery) with retry backoffs, deduplication, and dead-letter queue (DLQ) support?`,
      hint: `Discuss Redis Streams / ZSET for delayed scheduling, idempotent message keys, visibility timeouts, and exponential backoff jitter.`,
      sampleAnswer: `I would build the queue engine using Redis Sorted Sets (ZSET) where the score represents the scheduled execution timestamp (epoch ms). Workers poll via ZRANGEBYSCORE using atomic Lua scripts to pop and mark jobs active with a visibility timeout lease. For deduplication, each task payload is hashed (SHA-256) and validated against a Redis key with TTL. Failed jobs undergo exponential backoff with random jitter, and after 5 failed attempts, the payload transitions to a persistent Dead-Letter Queue (DLQ) in PostgreSQL for manual inspection.`,
      keyConceptsToCover: ["Redis ZSET Delayed Scheduling", "Idempotency Keys", "Visibility Timeout Leases", "Exponential Backoff with Jitter"],
      followUps: [
        "Why is jitter essential in exponential backoff algorithms?",
        "How do you prevent duplicate job execution if a worker node crashes mid-task?"
      ]
    },
    {
      role,
      category: "core-technical",
      difficulty: "medium",
      question: `Explain how Event Loop phases operate in Node.js (Microtask queue vs Timers vs Poll vs Check), and how unhandled promise rejections can compromise process stability.`,
      hint: `Walk through process.nextTick / Promise.then priority over setTimeout/setImmediate, and why blocking the Poll phase halts I/O handling.`,
      sampleAnswer: `The Node.js event loop cycles through Timers (setTimeout), Pending Callbacks, Poll (I/O execution), Check (setImmediate), and Close Callbacks. Crucially, the Microtask Queue (process.nextTick followed by Promise resolutions) drains completely after every phase before the loop advances. If recursive microtasks are scheduled, the Poll phase starves, freezing all I/O. Unhandled promise rejections emit an unhandledRejection event which, if uncaught, terminates the process to avoid corrupt in-memory state.`,
      keyConceptsToCover: ["Microtask vs Macrotask Queue", "Event Loop Starvation", "process.nextTick Priority", "Graceful Process Termination"],
      followUps: [
        "When should you use setImmediate over process.nextTick?",
        "How do worker threads differ from child processes in high-concurrency Node.js apps?"
      ]
    },
    {
      role,
      category: "debugging",
      difficulty: "hard",
      question: `Your service memory usage gradually creeps upward by 50MB per hour until Kubernetes OOM-kills the pod every 18 hours. How do you reproduce, profile, and fix this memory leak?`,
      hint: `Discuss taking V8 heap snapshots via inspect flag / heapdump, comparing retaining trees, identifying detached DOM or unclosed event listeners, and caching without TTL.`,
      sampleAnswer: `A steady memory leak usually stems from uncollected closures, unbounded caches, or lingering event listeners. I would run a reproduction instance under simulated load with node --inspect, take three sequential heap snapshots at 1-hour intervals, and load them into Chrome DevTools Memory Profiler. Using 'Comparison' mode, I filter by 'Objects allocated between snapshots'. If large arrays or closures retain references to completed HTTP requests, I trace their retaining paths to find the unclosed EventEmitter or global Map without eviction.`,
      keyConceptsToCover: ["V8 Heap Snapshots", "Retaining Paths", "Comparison Profiling", "Unbounded Map Caches"],
      followUps: [
        "Why does WeakMap prevent memory leaks in caching associations?",
        "How does V8 Generational Garbage Collection (Scavenge vs Mark-Sweep) handle long-lived objects?"
      ]
    },
    {
      role,
      category: "culture",
      difficulty: "medium",
      question: `At ${company}, we value proactive ownership. Can you share an example from your resume where you identified a performance, security, or DX issue that wasn't assigned to you, and took full initiative to resolve it?`,
      hint: `Highlight self-motivation, business empathy, impact on developer productivity, and creating sustainable tooling or automated guardrails.`,
      sampleAnswer: `While working on "${p1}", I observed our CI/CD pipeline was taking 14 minutes due to redundant dependency installation and un-cached Docker layers. Although my assigned ticket was UI feature work, I took initiative over a sprint lull to implement multi-stage Docker builds and configure GitHub Actions buildx caching with Turborepo. This slashed build times from 14 minutes down to 2.5 minutes, saving the engineering team dozens of developer hours weekly.`,
      keyConceptsToCover: ["Extreme Ownership", "Developer Experience (DX)", "CI/CD Optimization", "Quantified Time Savings"],
      followUps: [
        "How do you balance unsolicited optimization work with sprint commitments?",
        "How did you document the new CI/CD workflow for the rest of your team?"
      ]
    },
    {
      role,
      category: "resume-grill",
      difficulty: "hard",
      question: `In your resume bullets for "${p1}", you mention technical outcomes. What was the most significant technical trade-off you made during that project, and if you had to rewrite it today, what architecture would you discard?`,
      hint: `Demonstrate engineering maturity: acknowledge that all design is trade-offs. Contrast initial simplicity with subsequent operational complexity.`,
      sampleAnswer: `The biggest trade-off in "${p1}" was choosing an all-in-one Monolithic database model over an event-driven CQRS structure for speed to market. While it allowed rapid initial development, write locks began impacting real-time analytics dashboards. If rebuilding today, I would separate transactional commands from read queries using PostgreSQL logical replication into Elasticsearch or ClickHouse for analytical queries.`,
      keyConceptsToCover: ["Architectural Trade-offs", "CQRS / Event-Driven", "Read/Write Segregation", "Engineering Maturity"],
      followUps: [
        "What operational overhead does CQRS introduce compared to a simple relational schema?",
        "How do you handle eventual consistency in user interfaces when reads lag behind writes?"
      ]
    }
  ];

  return templates.slice(0, reqCount).map((q, idx) => ({
    id: `custom-${Date.now()}-${idx + 1}`,
    ...q,
  }));
}

// ─── Groq Generator ──────────────────────────────────────────────────────────

async function generateWithGroq(
  payload: CustomQuestionsPayload
): Promise<InterviewQuestion[] | null> {
  const apiKey = sanitizeKey(process.env.GROQ_API_KEY);
  if (!apiKey || apiKey.startsWith("your_") || apiKey.startsWith("demo_")) return null;

  const candidateModels = [
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
  ];

  const count = payload.count || 12;
  const systemPrompt = `You are an Elite Bar-Raiser Technical Interviewer and Principal Architect.
Generate ${count} deeply tailored, realistic technical and behavioral interview questions that directly evaluate the candidate by CROSS-REFERENCING their actual Resume background with the target Job Requirement / Job Description.

Each question MUST include:
1. id: string ("custom-1", "custom-2", etc.)
2. role: "${payload.targetRole}"
3. category: one of ["core-technical", "system-design", "dsa", "debugging", "behavioral", "culture", "resume-grill", "custom-jd"]
4. difficulty: "easy" | "medium" | "hard"
5. question: string (must explicitly reference the candidate's resume projects, tools, or bullet points alongside the job requirements!)
6. hint: string (actionable guidance)
7. sampleAnswer: string (a 90-120 word 95/100 model answer utilizing the STAR methodology)
8. keyConceptsToCover: string[] (3-5 technical keywords)
9. followUps: string[] (2 probing cross-questions)

Return ONLY valid JSON matching this schema:
{
  "questions": [
    {
      "id": "custom-1",
      "role": "${payload.targetRole}",
      "category": "core-technical",
      "difficulty": "hard",
      "question": "...",
      "hint": "...",
      "sampleAnswer": "...",
      "keyConceptsToCover": ["..."],
      "followUps": ["...", "..."]
    }
  ]
}`;

  const userPrompt = `Target Role: ${payload.targetRole}
Target Company: ${payload.targetCompany || "Top Tech Company"}
Job Requirements / JD:
"""
${payload.jobRequirement}
"""

Candidate Resume Context:
- Candidate Name: ${payload.resumeContext?.candidateName || "Candidate"}
- Demonstrated Skills: ${(payload.resumeContext?.skills || []).join(", ") || "Full-Stack Development"}
- Projects: ${JSON.stringify(payload.resumeContext?.projects || [])}
- Experience: ${JSON.stringify(payload.resumeContext?.experience || [])}
- Difficulty Level: ${payload.difficulty || "Mixed"}

Generate ${count} questions that specifically cross-examine their resume claims against this job requirement.`;

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
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = extractJsonObject<{ questions: InterviewQuestion[] }>(content);
          if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            return parsed.questions.map((q, idx) => ({
              ...q,
              id: q.id || `custom-${Date.now()}-${idx + 1}`,
              role: payload.targetRole,
            }));
          }
        }
      }
    } catch {
      // Try next model
    }
  }

  return null;
}

// ─── Gemini Generator ────────────────────────────────────────────────────────

async function generateWithGemini(
  payload: CustomQuestionsPayload
): Promise<InterviewQuestion[] | null> {
  const apiKey = sanitizeKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  if (!apiKey || apiKey.startsWith("your_") || apiKey.startsWith("demo_")) return null;

  const candidateModels = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-flash",
    "gemini-3.8-flash",
  ];

  const count = payload.count || 12;
  const prompt = `You are a Principal Technical Interviewer.
Generate ${count} tailored interview questions combining this Candidate Resume with the target Job Requirement.

Target Role: ${payload.targetRole}
Target Company: ${payload.targetCompany || "Tech"}
Job Requirement / JD:
${payload.jobRequirement}

Candidate Resume:
${JSON.stringify(payload.resumeContext || {})}

Return ONLY a JSON object matching this schema:
{
  "questions": [
    {
      "id": "custom-1",
      "role": "${payload.targetRole}",
      "category": "core-technical",
      "difficulty": "medium",
      "question": "<string probing resume project vs JD>",
      "hint": "<string>",
      "sampleAnswer": "<string>",
      "keyConceptsToCover": ["<string>"],
      "followUps": ["<string>", "<string>"]
    }
  ]
}`;

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
              temperature: 0.3,
              maxOutputTokens: 3500,
            },
          }),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (res.ok) {
        const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = extractJsonObject<{ questions: InterviewQuestion[] }>(rawText);
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return parsed.questions.map((q, idx) => ({
            ...q,
            id: q.id || `custom-${Date.now()}-${idx + 1}`,
            role: payload.targetRole,
          }));
        }
      }
    } catch {
      // Try next candidate model
    }
  }

  return null;
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as CustomQuestionsPayload;

    if (!payload.jobRequirement && !payload.targetRole) {
      return NextResponse.json(
        { error: "Target Role or Job Requirement is required." },
        { status: 400 }
      );
    }

    // 1. Try Groq (Llama 3.3 / GPT-OSS)
    const groqQuestions = await generateWithGroq(payload);
    if (groqQuestions && groqQuestions.length > 0) {
      return NextResponse.json({
        ok: true,
        questions: groqQuestions,
        count: groqQuestions.length,
        source: "groq",
      });
    }

    // 2. Try Gemini
    const geminiQuestions = await generateWithGemini(payload);
    if (geminiQuestions && geminiQuestions.length > 0) {
      return NextResponse.json({
        ok: true,
        questions: geminiQuestions,
        count: geminiQuestions.length,
        source: "gemini",
      });
    }

    // 3. Smart Deterministic Fallback
    const deterministicQuestions = generateDeterministicQuestions(payload);
    return NextResponse.json({
      ok: true,
      questions: deterministicQuestions,
      count: deterministicQuestions.length,
      source: "deterministic",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate custom questions";
    console.error("[Custom Questions API Error]:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

