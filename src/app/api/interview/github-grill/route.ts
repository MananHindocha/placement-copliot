import { NextRequest, NextResponse } from "next/server";
import type { GitHubGrillAnalysis, GitHubGrillQuestion } from "@/types";

interface GitHubGrillRequestBody {
  repoUrl: string;
  focusNotes?: string;
}

interface SourceSnippet {
  path: string;
  content: string;
}

interface RawGrillQuestion {
  id?: string;
  category?: "Architecture" | "Code Implementation" | "Scalability & Edge Cases" | "Trade-offs & Debugging" | "Security & Deployment";
  difficulty?: "Medium" | "Hard";
  question?: string;
  referencedFiles?: string[];
  whatInterviewerLooksFor?: string;
  hint?: string;
}

interface RepoCacheEntry {
  timestamp: number;
  analysis: GitHubGrillAnalysis;
  source: string;
}

// 15-Minute In-Memory Server Cache to avoid GitHub 60 req/hr unauthenticated rate limit
const repoGrillCache = new Map<string, RepoCacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const cleaned = url.trim().replace(/\/$/, "");
  // Matches https://github.com/owner/repo or github.com/owner/repo or owner/repo
  const match = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)/i);
  if (match) {
    return { owner: match[1], repo: match[2].replace(/\.git$/i, "") };
  }
  const shorthandMatch = cleaned.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_\.-]+)$/);
  if (shorthandMatch) {
    return { owner: shorthandMatch[1], repo: shorthandMatch[2].replace(/\.git$/i, "") };
  }
  return null;
}

function generateDeterministicGitHubGrill(
  owner: string,
  repo: string,
  detectedStack: string[],
  keyFiles: string[],
  notes: string,
  sourceSnippets: SourceSnippet[] = []
): GitHubGrillAnalysis {
  const stack = detectedStack.length > 0 ? detectedStack : ["TypeScript", "Next.js", "Node.js", "REST APIs"];
  const files = sourceSnippets.length > 0
    ? sourceSnippets.map((s) => s.path)
    : keyFiles.length > 0
    ? keyFiles
    : ["src/index.ts", "package.json", "README.md", "src/lib/api.ts"];
  const f0 = files[0] || "src/index.ts";
  const f1 = files[1] || files[0] || "src/app/page.tsx";
  const f2 = files[2] || files[0] || "src/lib/utils.ts";

  const questions: GitHubGrillQuestion[] = [
    {
      id: `gh-grill-${Date.now()}-1`,
      category: "Architecture",
      difficulty: "Hard",
      question: `In ${f0}, how did you separate state management, asynchronous mutations, and rendering? If you had to refactor this architecture today, what would you decouple?`,
      referencedFiles: [f0, f1],
      whatInterviewerLooksFor: "Ability to critically evaluate own architectural boundaries, modularity, and separation of concerns.",
      hint: "Explain data flow boundaries, caching strategies, and how components interact without tight coupling.",
    },
    {
      id: `gh-grill-${Date.now()}-2`,
      category: "Scalability & Edge Cases",
      difficulty: "Hard",
      question: `Looking at ${f0}, what happens if 5,000 users trigger simultaneous operations? Walk me through where the system hits memory or concurrency bottlenecks.`,
      referencedFiles: [f0],
      whatInterviewerLooksFor: "Understanding memory leaks, connection pool exhaustion, event-loop blocking, and scaling limits.",
      hint: "Analyze asynchronous queueing, DB connection limits, and horizontal scaling capabilities.",
    },
    {
      id: `gh-grill-${Date.now()}-3`,
      category: "Code Implementation",
      difficulty: "Medium",
      question: `In ${f1}, walk me through your input validation, boundary error handling, and null safety. How do you ensure bad payloads don't crash workers or leak internal stack traces?`,
      referencedFiles: [f1, f2],
      whatInterviewerLooksFor: "Input sanitization (e.g. Zod/Joi), centralized error handlers, and defense against malicious payloads.",
      hint: "Discuss runtime schema validation, HTTP error code mapping, and masking internal database errors.",
    },
    {
      id: `gh-grill-${Date.now()}-4`,
      category: "Trade-offs & Debugging",
      difficulty: "Hard",
      question: `What was the hardest bug, race condition, or performance bottleneck in ${f0} during development, and how did you isolate and patch it?`,
      referencedFiles: [f0, f2],
      whatInterviewerLooksFor: "Systematic root cause analysis, telemetry, reproducing bugs, and adding regression tests.",
      hint: "Use STAR format: Describe the symptom, profiling tool used, the unexpected race condition, and the permanent patch.",
    },
    {
      id: `gh-grill-${Date.now()}-5`,
      category: "Security & Deployment",
      difficulty: "Medium",
      question: `How are secrets, environment variables, and authentication tokens handled in ${repo} (${f2}) during development vs production CI/CD?`,
      referencedFiles: [f2, "package.json"],
      whatInterviewerLooksFor: "Zero hardcoded secrets, automated secret scanners, and secure token lifecycle management.",
      hint: "Highlight environment variable validation at startup and secret management in CI pipelines.",
    },
  ];

  return {
    repoName: repo,
    owner,
    summary: `Full-stack repository ${owner}/${repo} utilizing ${stack.join(", ")}. ${notes ? `Project focus: ${notes}` : ""}`,
    detectedStack: stack,
    keyFilesAnalyzed: files,
    architectureStrengths: [
      "Modular file organization with clear entrypoint separation",
      "Modern dependency configuration",
      "Clean TypeScript / component-based separation of concerns",
    ],
    potentialWeaknessesOrRisks: [
      "Potential memory / concurrency contention under high load",
      "Requires automated integration test coverage for core edge cases",
      "Need for distributed tracing and fine-grained latency observability",
    ],
    grillQuestions: questions,
  };
}

async function analyzeWithGroq(
  owner: string,
  repo: string,
  meta: Record<string, unknown>,
  fileTree: string[],
  readmeText: string,
  packageJson: string,
  commits: string[],
  notes: string,
  sourceSnippets: SourceSnippet[] = []
): Promise<GitHubGrillAnalysis | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("your_groq")) return null;

  const systemPrompt = `You are a Principal Software Engineer and Bar-Raiser conducting a deep, rigorous "Project Grill" technical interview.
You are given real repository metadata, file paths, README text, dependencies, and actual inspected source code from a candidate's GitHub project (${owner}/${repo}).

Generate a deeply technical, file-specific interrogation analysis that will test if the candidate actually built the project themselves or simply copied a template.
CITE ACTUAL FILE PATHS AND SPECIFIC FUNCTIONS/PATTERNS FROM THE INSPECTED SOURCE CODE IN THE QUESTIONS!

Return strictly valid JSON matching this schema:
{
  "repoName": "${repo}",
  "owner": "${owner}",
  "summary": "2-3 sentence overview of the architecture and purpose",
  "detectedStack": ["Tech1", "Tech2", "Tech3"],
  "keyFilesAnalyzed": ["file1", "file2", "file3"],
  "architectureStrengths": ["Strength 1", "Strength 2"],
  "potentialWeaknessesOrRisks": ["Risk 1", "Risk 2"],
  "grillQuestions": [
    {
      "id": "gh-1",
      "category": "Architecture",
      "difficulty": "Hard",
      "question": "Sharp question referencing actual files and decisions from the repo",
      "referencedFiles": ["path/to/file.ts"],
      "whatInterviewerLooksFor": "What signals competence vs superficial knowledge",
      "hint": "Guidance on trade-offs"
    }
  ]
}`;

  const sourceFilesText = sourceSnippets.length > 0
    ? `\n\nTop Inspected Source Code Files:\n${sourceSnippets.map((s) => `=== FILE: ${s.path} ===\n${s.content}\n`).join("\n")}`
    : "";

  const userPrompt = `Repository: ${owner}/${repo}
Description: ${meta?.description ? String(meta.description) : "No description provided"}
Primary Language: ${meta?.language ? String(meta.language) : "Unknown"}
Recent Commits: ${commits.join(" | ") || "None"}

Candidate's Project Focus Notes:
${notes || "None provided"}

File Tree (Sample):
${fileTree.slice(0, 50).join("\n")}

Package / Dependency Manifest (Sample):
${packageJson ? packageJson.slice(0, 1500) : "No package.json"}

README (Excerpt):
${readmeText ? readmeText.slice(0, 2000) : "No README"}${sourceFilesText}`;

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
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.grillQuestions) || parsed.grillQuestions.length === 0) return null;

    return {
      repoName: repo,
      owner,
      summary: String(parsed.summary || `Repository ${owner}/${repo}`),
      detectedStack: Array.isArray(parsed.detectedStack) ? parsed.detectedStack.map(String) : [meta?.language || "TypeScript"],
      keyFilesAnalyzed: Array.isArray(parsed.keyFilesAnalyzed) ? parsed.keyFilesAnalyzed.map(String) : fileTree.slice(0, 5),
      architectureStrengths: Array.isArray(parsed.architectureStrengths) ? parsed.architectureStrengths.map(String) : ["Clean code organization"],
      potentialWeaknessesOrRisks: Array.isArray(parsed.potentialWeaknessesOrRisks) ? parsed.potentialWeaknessesOrRisks.map(String) : ["Scalability bottlenecks"],
      grillQuestions: (parsed.grillQuestions as RawGrillQuestion[]).map((q, i: number) => ({
        id: `gh-grill-${Date.now()}-${i + 1}`,
        category: q.category || "Architecture",
        difficulty: ["Medium", "Hard"].includes(q.difficulty || "") ? (q.difficulty as "Medium" | "Hard") : "Hard",
        question: String(q.question || ""),
        referencedFiles: Array.isArray(q.referencedFiles) ? q.referencedFiles.map(String) : [],
        whatInterviewerLooksFor: String(q.whatInterviewerLooksFor || "Technical depth and ownership."),
        hint: String(q.hint || "Discuss trade-offs and alternative solutions."),
      })),
    };
  } catch {
    return null;
  }
}

async function analyzeWithGemini(
  owner: string,
  repo: string,
  meta: Record<string, unknown>,
  fileTree: string[],
  readmeText: string,
  packageJson: string,
  commits: string[],
  notes: string,
  sourceSnippets: SourceSnippet[] = []
): Promise<GitHubGrillAnalysis | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || apiKey.includes("your_gemini")) return null;

  const sourceFilesText = sourceSnippets.length > 0
    ? `\n\nTop Inspected Source Code Files:\n${sourceSnippets.map((s) => `=== FILE: ${s.path} ===\n${s.content}\n`).join("\n")}`
    : "";

  const prompt = `You are a Principal Software Engineer and Bar-Raiser conducting a deep, rigorous "Project Grill" technical interview on GitHub repository ${owner}/${repo}.
Review the file tree, dependencies, README, and the actual source code files provided.
CRITICAL: Ground your questions in the real source code implementation. Cite specific files, functions, error handling logic, and architectural boundaries in your questions.

Metadata:
Language: ${meta?.language ? String(meta.language) : "Unknown"}
Description: ${meta?.description ? String(meta.description) : "None"}
Notes: ${notes}

Key Files:
${fileTree.slice(0, 40).join("\n")}

Dependencies:
${packageJson.slice(0, 1000)}

README Excerpt:
${readmeText.slice(0, 1500)}${sourceFilesText}

Respond strictly in valid JSON:
{
  "repoName": "${repo}",
  "owner": "${owner}",
  "summary": "string",
  "detectedStack": ["string"],
  "keyFilesAnalyzed": ["string"],
  "architectureStrengths": ["string"],
  "potentialWeaknessesOrRisks": ["string"],
  "grillQuestions": [
    {
      "id": "gh-1",
      "category": "Architecture",
      "difficulty": "Hard",
      "question": "string citing specific files",
      "referencedFiles": ["string"],
      "whatInterviewerLooksFor": "string",
      "hint": "string"
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
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.grillQuestions) || parsed.grillQuestions.length === 0) return null;

    return {
      repoName: repo,
      owner,
      summary: String(parsed.summary || `Repository ${owner}/${repo}`),
      detectedStack: Array.isArray(parsed.detectedStack) ? parsed.detectedStack.map(String) : [meta?.language || "TypeScript"],
      keyFilesAnalyzed: Array.isArray(parsed.keyFilesAnalyzed) ? parsed.keyFilesAnalyzed.map(String) : fileTree.slice(0, 5),
      architectureStrengths: Array.isArray(parsed.architectureStrengths) ? parsed.architectureStrengths.map(String) : ["Clean architecture"],
      potentialWeaknessesOrRisks: Array.isArray(parsed.potentialWeaknessesOrRisks) ? parsed.potentialWeaknessesOrRisks.map(String) : ["Edge case resilience"],
      grillQuestions: (parsed.grillQuestions as RawGrillQuestion[]).map((q, i: number) => ({
        id: `gh-grill-${Date.now()}-${i + 1}`,
        category: q.category || "Architecture",
        difficulty: ["Medium", "Hard"].includes(q.difficulty || "") ? (q.difficulty as "Medium" | "Hard") : "Hard",
        question: String(q.question || ""),
        referencedFiles: Array.isArray(q.referencedFiles) ? q.referencedFiles.map(String) : [],
        whatInterviewerLooksFor: String(q.whatInterviewerLooksFor || "Technical depth and ownership."),
        hint: String(q.hint || "Discuss trade-offs and alternative solutions."),
      })),
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GitHubGrillRequestBody;

    if (!body || !body.repoUrl || !body.repoUrl.trim()) {
      return NextResponse.json(
        { error: "Please provide a valid GitHub repository URL (e.g., https://github.com/owner/repo or owner/repo)." },
        { status: 400 }
      );
    }

    const parsedRepo = parseGitHubUrl(body.repoUrl);
    if (!parsedRepo) {
      return NextResponse.json(
        { error: "Invalid GitHub URL format. Please use 'owner/repo' or 'https://github.com/owner/repo'." },
        { status: 400 }
      );
    }

    const { owner, repo } = parsedRepo;
    const notes = (body.focusNotes || "").trim();

    // 0. Check 15-minute in-memory server cache
    const cacheKey = `${owner.toLowerCase()}/${repo.toLowerCase()}:${notes.toLowerCase()}`;
    const cached = repoGrillCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        source: `${cached.source} (cached)`,
        analysis: cached.analysis,
      });
    }

    // 1. Fetch Repository Metadata from GitHub API
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "PlacementCoPilot-GitHubGrill/1.0",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    let meta: Record<string, unknown> = { name: repo, language: "TypeScript" };
    let fileTree: string[] = [];
    let readmeText = "";
    let packageJson = "";
    let commits: string[] = [];

    try {
      const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers,
        signal: AbortSignal.timeout(6000),
      });
      if (metaRes.ok) {
        meta = (await metaRes.json()) as Record<string, unknown>;
      }
    } catch {
      // Ignore network timeout on GitHub API
    }

    const defaultBranch = typeof meta?.default_branch === "string" ? meta.default_branch : "main";

    // 2. Fetch Git Tree
    try {
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
        { headers, signal: AbortSignal.timeout(6000) }
      );
      if (treeRes.ok) {
        const treeData = (await treeRes.json()) as { tree?: Array<{ type?: string; path?: string }> };
        if (Array.isArray(treeData?.tree)) {
          fileTree = treeData.tree
            .filter((node) => node.type === "blob" && typeof node.path === "string")
            .map((node) => node.path as string)
            .slice(0, 150);
        }
      }
    } catch {
      // Tree fetch fallback
    }

    // 3. Fetch README
    try {
      const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
        headers,
        signal: AbortSignal.timeout(6000),
      });
      if (readmeRes.ok) {
        const readmeData = (await readmeRes.json()) as { content?: string };
        if (readmeData?.content) {
          readmeText = Buffer.from(readmeData.content, "base64").toString("utf-8");
        }
      }
    } catch {
      // README fallback
    }

    // 4. Fetch package.json if present
    const hasPackageJson = fileTree.find((f) => f.endsWith("package.json"));
    if (hasPackageJson) {
      try {
        const pkgRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${hasPackageJson}`,
          { headers, signal: AbortSignal.timeout(5000) }
        );
        if (pkgRes.ok) {
          const pkgData = (await pkgRes.json()) as { content?: string };
          if (pkgData?.content) {
            packageJson = Buffer.from(pkgData.content, "base64").toString("utf-8");
          }
        }
      } catch {
        // pkg fallback
      }
    }

    // 5. Fetch Recent Commits
    try {
      const commitRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`,
        { headers, signal: AbortSignal.timeout(5000) }
      );
      if (commitRes.ok) {
        const commitData = (await commitRes.json()) as Array<{ commit?: { message?: string } }>;
        if (Array.isArray(commitData)) {
          commits = commitData
            .map((c) => c?.commit?.message?.split("\n")[0] || "")
            .filter(Boolean);
        }
      }
    } catch {
      // commits fallback
    }

    // 6. Inspect Top 3 Actual Source Code Files (Routes, Models, Services, User-Specified Modules)
    const EXCLUDED_EXTENSIONS = [".md", ".json", ".lock", ".svg", ".png", ".jpg", ".jpeg", ".ico", ".css", ".scss", ".d.ts", ".map", ".html", ".txt"];
    const EXCLUDED_DIRS = ["node_modules", ".git", ".next", "dist", "build", ".husky", "coverage"];

    const candidateFiles = fileTree.filter((path) => {
      const lower = path.toLowerCase();
      if (EXCLUDED_DIRS.some((dir) => lower.includes(dir))) return false;
      if (EXCLUDED_EXTENSIONS.some((ext) => lower.endsWith(ext))) return false;
      return /\.(ts|tsx|js|jsx|py|go|rs|java|cpp|c|rb|php|sql|prisma)$/i.test(path);
    });

    const scoredFiles = candidateFiles.map((path) => {
      let score = 0;
      const lower = path.toLowerCase();
      if (notes) {
        const noteWords = notes.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        for (const word of noteWords) {
          if (lower.includes(word)) score += 10;
        }
      }
      if (lower.includes("route.") || lower.includes("api/") || lower.includes("server.") || lower.includes("main.") || lower.includes("app.")) score += 8;
      if (lower.includes("model") || lower.includes("schema") || lower.includes("entity") || lower.includes("db/")) score += 6;
      if (lower.includes("service") || lower.includes("controller") || lower.includes("lib/")) score += 5;
      if (lower.includes("page.") || lower.includes("component")) score += 3;
      return { path, score };
    });

    scoredFiles.sort((a, b) => b.score - a.score);
    const topFilesToFetch = scoredFiles.slice(0, 3).map((f) => f.path);

    const sourceSnippets: SourceSnippet[] = [];
    await Promise.all(
      topFilesToFetch.map(async (filePath) => {
        try {
          const rawRes = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${filePath}`,
            { headers, signal: AbortSignal.timeout(5000) }
          );
          if (rawRes.ok) {
            const text = await rawRes.text();
            sourceSnippets.push({
              path: filePath,
              content: text.slice(0, 2000),
            });
          }
        } catch {
          // ignore single file fetch timeout
        }
      })
    );

    // Extract tech stack clues from files
    const detectedStack: string[] = [];
    if (fileTree.some((f) => f.endsWith(".tsx") || f.endsWith(".jsx"))) detectedStack.push("React");
    if (fileTree.some((f) => f.includes("next.config") || f.includes("app/"))) detectedStack.push("Next.js");
    if (fileTree.some((f) => f.endsWith(".ts"))) detectedStack.push("TypeScript");
    if (fileTree.some((f) => f.endsWith(".py"))) detectedStack.push("Python");
    if (fileTree.some((f) => f.endsWith(".go"))) detectedStack.push("Go");
    if (fileTree.some((f) => f.includes("docker") || f.includes("Dockerfile"))) detectedStack.push("Docker");
    if (detectedStack.length === 0 && meta?.language) detectedStack.push(String(meta.language));

    // AI Analysis via Groq
    const groqAnalysis = await analyzeWithGroq(
      owner,
      repo,
      meta,
      fileTree,
      readmeText,
      packageJson,
      commits,
      notes,
      sourceSnippets
    );
    if (groqAnalysis) {
      repoGrillCache.set(cacheKey, { timestamp: Date.now(), analysis: groqAnalysis, source: "groq-llama-3.3-70b" });
      return NextResponse.json({
        success: true,
        source: "groq-llama-3.3-70b",
        analysis: groqAnalysis,
      });
    }

    // AI Analysis via Gemini
    const geminiAnalysis = await analyzeWithGemini(
      owner,
      repo,
      meta,
      fileTree,
      readmeText,
      packageJson,
      commits,
      notes,
      sourceSnippets
    );
    if (geminiAnalysis) {
      repoGrillCache.set(cacheKey, { timestamp: Date.now(), analysis: geminiAnalysis, source: "gemini-2.0-flash" });
      return NextResponse.json({
        success: true,
        source: "gemini-2.0-flash",
        analysis: geminiAnalysis,
      });
    }

    // Deterministic Fallback
    const fallbackAnalysis = generateDeterministicGitHubGrill(
      owner,
      repo,
      detectedStack,
      fileTree.slice(0, 10),
      notes,
      sourceSnippets
    );
    repoGrillCache.set(cacheKey, { timestamp: Date.now(), analysis: fallbackAnalysis, source: "heuristic" });
    return NextResponse.json({
      success: true,
      source: "heuristic",
      analysis: fallbackAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "GitHub analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

