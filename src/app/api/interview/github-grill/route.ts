import { NextRequest, NextResponse } from "next/server";
import type { GitHubGrillAnalysis, GitHubGrillQuestion } from "@/types";

interface GitHubGrillRequestBody {
  repoUrl: string;
  focusNotes?: string;
}

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
  notes: string
): GitHubGrillAnalysis {
  const stack = detectedStack.length > 0 ? detectedStack : ["TypeScript", "Next.js", "Node.js", "REST APIs"];
  const files = keyFiles.length > 0 ? keyFiles : ["src/index.ts", "package.json", "README.md", "src/lib/api.ts"];

  const questions: GitHubGrillQuestion[] = [
    {
      id: `gh-grill-${Date.now()}-1`,
      category: "Architecture",
      difficulty: "Hard",
      question: `In ${repo}, how did you separate state management, data mutations, and rendering? If you had to refactor this architecture today, what would you decouple?`,
      referencedFiles: files.slice(0, 2),
      whatInterviewerLooksFor: "Ability to critically evaluate own architectural boundaries, modularity, and separation of concerns.",
      hint: "Explain data flow boundaries, caching strategies, and how components interact without tight coupling.",
    },
    {
      id: `gh-grill-${Date.now()}-2`,
      category: "Scalability & Edge Cases",
      difficulty: "Hard",
      question: `Looking at ${files[0] || "your core entrypoint"}, what happens if 5,000 users trigger simultaneous operations? Walk me through where the system hits memory or concurrency bottlenecks.`,
      referencedFiles: [files[0] || "src/index.ts"],
      whatInterviewerLooksFor: "Understanding memory leaks, connection pool exhaustion, event-loop blocking, and scaling limits.",
      hint: "Analyze asynchronous queueing, DB connection limits, and horizontal scaling capabilities.",
    },
    {
      id: `gh-grill-${Date.now()}-3`,
      category: "Code Implementation",
      difficulty: "Medium",
      question: `Walk me through your error handling and validation logic in ${repo}. How do you ensure user-provided inputs don't crash the server or leak sensitive error stack traces?`,
      referencedFiles: files.slice(1, 3),
      whatInterviewerLooksFor: "Input sanitization (e.g. Zod/Joi), centralized error handlers, and defense against malicious payloads.",
      hint: "Discuss runtime schema validation, HTTP error code mapping, and masking internal database errors.",
    },
    {
      id: `gh-grill-${Date.now()}-4`,
      category: "Trade-offs & Debugging",
      difficulty: "Hard",
      question: `What was the hardest bug or race condition you encountered while developing ${repo}, and how did you isolate and fix it?`,
      referencedFiles: files.slice(0, 3),
      whatInterviewerLooksFor: "Systematic root cause analysis, telemetry, reproducing bugs, and adding regression tests.",
      hint: "Use STAR format: Describe the symptom, profiling tool used, the unexpected race condition, and the permanent patch.",
    },
    {
      id: `gh-grill-${Date.now()}-5`,
      category: "Security & Deployment",
      difficulty: "Medium",
      question: `How are secrets, environment variables, and authentication tokens handled in ${repo} during development vs production CI/CD?`,
      referencedFiles: ["package.json", ".env.example"],
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
  meta: any,
  fileTree: string[],
  readmeText: string,
  packageJson: string,
  commits: string[],
  notes: string
): Promise<GitHubGrillAnalysis | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("your_groq")) return null;

  const systemPrompt = `You are a Principal Software Engineer and Bar-Raiser conducting a deep, rigorous "Project Grill" technical interview.
You are given real repository metadata, file paths, README text, and dependencies from a candidate's GitHub project (${owner}/${repo}).

Generate a deeply technical, file-specific interrogation analysis that will test if the candidate actually built the project themselves or simply copied a template.
Cite actual file paths from the file tree in the questions!

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
      "category": "Architecture" | "Code Implementation" | "Scalability & Edge Cases" | "Trade-offs & Debugging" | "Security & Deployment",
      "difficulty": "Medium" | "Hard",
      "question": "Sharp question referencing actual files and decisions from the repo",
      "referencedFiles": ["path/to/file.ts"],
      "whatInterviewerLooksFor": "What signals competence vs superficial knowledge",
      "hint": "Guidance on trade-offs"
    }
  ]
}`;

  const userPrompt = `Repository: ${owner}/${repo}
Description: ${meta?.description || "No description provided"}
Primary Language: ${meta?.language || "Unknown"}
Recent Commits: ${commits.join(" | ") || "None"}

Candidate's Project Focus Notes:
${notes || "None provided"}

File Tree (Sample):
${fileTree.slice(0, 50).join("\n")}

Package / Dependency Manifest (Sample):
${packageJson ? packageJson.slice(0, 1500) : "No package.json"}

README (Excerpt):
${readmeText ? readmeText.slice(0, 2000) : "No README"}`;

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
      grillQuestions: parsed.grillQuestions.map((q: any, i: number) => ({
        id: `gh-grill-${Date.now()}-${i + 1}`,
        category: q.category || "Architecture",
        difficulty: ["Medium", "Hard"].includes(q.difficulty) ? q.difficulty : "Hard",
        question: String(q.question),
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
  meta: any,
  fileTree: string[],
  readmeText: string,
  packageJson: string,
  commits: string[],
  notes: string
): Promise<GitHubGrillAnalysis | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || apiKey.includes("your_gemini")) return null;

  const prompt = `You are a Principal Software Engineer and Bar-Raiser conducting a deep, rigorous "Project Grill" technical interview on GitHub repository ${owner}/${repo}.
Review the file tree, dependencies, and README. Generate a JSON response with deep, file-referencing interview questions that test whether the candidate deeply understands the design decisions and trade-offs.

Metadata:
Language: ${meta?.language}
Description: ${meta?.description}
Notes: ${notes}

Key Files:
${fileTree.slice(0, 40).join("\n")}

Dependencies:
${packageJson.slice(0, 1000)}

README Excerpt:
${readmeText.slice(0, 1500)}

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
      grillQuestions: parsed.grillQuestions.map((q: any, i: number) => ({
        id: `gh-grill-${Date.now()}-${i + 1}`,
        category: q.category || "Architecture",
        difficulty: ["Medium", "Hard"].includes(q.difficulty) ? q.difficulty : "Hard",
        question: String(q.question),
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

    // 1. Fetch Repository Metadata from GitHub API
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "PlacementCoPilot-GitHubGrill/1.0",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    let meta: any = { name: repo, language: "TypeScript" };
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
        meta = await metaRes.json();
      }
    } catch {
      // Ignore network timeout on GitHub API
    }

    const defaultBranch = meta?.default_branch || "main";

    // 2. Fetch Git Tree
    try {
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
        { headers, signal: AbortSignal.timeout(6000) }
      );
      if (treeRes.ok) {
        const treeData = await treeRes.json();
        if (Array.isArray(treeData?.tree)) {
          fileTree = treeData.tree
            .filter((node: any) => node.type === "blob")
            .map((node: any) => node.path as string)
            .slice(0, 120);
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
        const readmeData = await readmeRes.json();
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
          const pkgData = await pkgRes.json();
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
        const commitData = await commitRes.json();
        if (Array.isArray(commitData)) {
          commits = commitData.map((c: any) => c?.commit?.message?.split("\n")[0] || "").filter(Boolean);
        }
      }
    } catch {
      // commits fallback
    }

    // Extract tech stack clues from files
    const detectedStack: string[] = [];
    if (fileTree.some((f) => f.endsWith(".tsx") || f.endsWith(".jsx"))) detectedStack.push("React");
    if (fileTree.some((f) => f.includes("next.config") || f.includes("app/"))) detectedStack.push("Next.js");
    if (fileTree.some((f) => f.endsWith(".ts"))) detectedStack.push("TypeScript");
    if (fileTree.some((f) => f.endsWith(".py"))) detectedStack.push("Python");
    if (fileTree.some((f) => f.endsWith(".go"))) detectedStack.push("Go");
    if (fileTree.some((f) => f.includes("docker") || f.includes("Dockerfile"))) detectedStack.push("Docker");
    if (detectedStack.length === 0 && meta?.language) detectedStack.push(meta.language);

    // AI Analysis via Groq
    const groqAnalysis = await analyzeWithGroq(
      owner,
      repo,
      meta,
      fileTree,
      readmeText,
      packageJson,
      commits,
      notes
    );
    if (groqAnalysis) {
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
      notes
    );
    if (geminiAnalysis) {
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
      notes
    );
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

