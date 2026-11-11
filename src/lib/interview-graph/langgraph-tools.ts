import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const PISTON_LANGUAGE_MAP: Record<
  string,
  { language: string; version: string; fileName: string }
> = {
  python: { language: "python", version: "3.10.0", fileName: "main.py" },
  "python 3.11": { language: "python", version: "3.10.0", fileName: "main.py" },
  py: { language: "python", version: "3.10.0", fileName: "main.py" },
  javascript: { language: "javascript", version: "18.15.0", fileName: "index.js" },
  js: { language: "javascript", version: "18.15.0", fileName: "index.js" },
  typescript: { language: "typescript", version: "5.0.3", fileName: "index.ts" },
  ts: { language: "typescript", version: "5.0.3", fileName: "index.ts" },
  cpp: { language: "c++", version: "10.2.0", fileName: "main.cpp" },
  "c++": { language: "c++", version: "10.2.0", fileName: "main.cpp" },
  java: { language: "java", version: "15.0.2", fileName: "Main.java" },
};

export interface SandboxExecutionToolResult {
  sandboxAvailable: boolean;
  sandboxNote: string | null;
  sandboxExecution: {
    language: string;
    version: string;
    stdout: string;
    stderr: string;
    exitCode: number;
    executionLatencyMs: number;
  };
}

export interface InspectedSourceFile {
  path: string;
  codeExcerpt: string;
}

export interface GitHubRepoToolResult {
  owner: string;
  repo: string;
  fullName: string;
  htmlUrl: string;
  description: string;
  primaryLanguage: string;
  defaultBranch: string;
  stars: number;
  filePaths: string[];
  totalFilesScanned: number;
  readmeExcerpt: string;
  dependenciesManifest: string;
  recentCommits: string[];
  inspectedSourceFiles: InspectedSourceFile[];
}

interface GitTreeItem {
  path?: string;
  type?: string;
}

interface GitCommitItem {
  commit?: {
    message?: string;
  };
}

function parseGitHubRepo(input?: string): { owner: string; repo: string } | null {
  if (!input || typeof input !== "string") return null;
  const cleaned = input.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const matchUrl = cleaned.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/i);
  if (matchUrl) return { owner: matchUrl[1], repo: matchUrl[2] };
  const parts = cleaned.split("/");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { owner: parts[0].trim(), repo: parts[1].trim() };
  }
  return null;
}

function selectHighSignalSourceFiles(filePaths: string[], focusNotes: string): string[] {
  const codeExtensions = /\.(ts|tsx|js|jsx|py|go|java|rs|cpp)$/i;
  const ignorePatterns =
    /(node_modules|\.next|dist|build|\.d\.ts|tailwind\.config|postcss|eslint|vite\.config|__tests__|\.spec\.|\.test\.)/i;

  const candidateFiles = filePaths.filter(
    (p) => codeExtensions.test(p) && !ignorePatterns.test(p)
  );

  const focusKeywords = focusNotes
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);

  const scored = candidateFiles.map((filePath) => {
    const lower = filePath.toLowerCase();
    let score = 0;
    if (lower.includes("api/") || lower.includes("route.") || lower.includes("controller")) score += 5;
    if (
      lower.includes("lib/") ||
      lower.includes("service") ||
      lower.includes("engine") ||
      lower.includes("agent") ||
      lower.includes("model") ||
      lower.includes("graph")
    ) {
      score += 6;
    }
    if (lower.includes("context/") || lower.includes("store") || lower.includes("db") || lower.includes("schema")) {
      score += 4;
    }
    if (lower.startsWith("src/components/interview/")) score += 3;
    for (const kw of focusKeywords) {
      if (lower.includes(kw)) score += 10;
    }
    return { filePath, score };
  });

  scored.sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath));
  return scored.slice(0, 5).map((s) => s.filePath);
}

/**
 * LangChain DynamicStructuredTool that executes candidate code against the configured
 * Piston sandbox API and falls back cleanly with static telemetry metadata when offline.
 */
export const executeSandboxCodeTool = new DynamicStructuredTool({
  name: "execute_sandbox_code_tool",
  description:
    "Compiles and runs candidate DSA solution code in an isolated Piston sandbox runtime and returns stdout, stderr, exitCode, and latency.",
  schema: z.object({
    language: z.string().describe("Programming language key such as python, typescript, cpp, or java"),
    code: z.string().describe("Candidate source code to execute"),
    testRunnerSnippet: z
      .string()
      .optional()
      .describe("Optional inline test harness appended after source code"),
  }),
  func: async ({ language, code, testRunnerSnippet }): Promise<string> => {
    const langKey = String(language || "python").toLowerCase().trim();
    const pistonSpec = PISTON_LANGUAGE_MAP[langKey] || PISTON_LANGUAGE_MAP.python;
    const executableSource = testRunnerSnippet ? `${code}\n\n${testRunnerSnippet}` : code;

    const pistonStart = Date.now();
    let stdout = "";
    let stderr = "";
    let exitCode = -1;
    let sandboxAvailable = false;
    let sandboxNote: string | null = null;

    try {
      const pistonEndpoint =
        process.env.PISTON_API_URL?.trim() || "https://emkc.org/api/v2/piston/execute";
      const pistonRes = await fetch(pistonEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          language: pistonSpec.language,
          version: pistonSpec.version,
          files: [{ name: pistonSpec.fileName, content: executableSource }],
          run_timeout: 3000,
        }),
      });

      if (pistonRes.ok) {
        const pistonJson = (await pistonRes.json()) as {
          run?: { stdout?: string; stderr?: string; code?: number };
          compile?: { stderr?: string };
        };
        stdout = pistonJson.run?.stdout || "";
        stderr = pistonJson.run?.stderr || pistonJson.compile?.stderr || "";
        exitCode = typeof pistonJson.run?.code === "number" ? pistonJson.run.code : -1;
        sandboxAvailable = true;
      } else {
        sandboxNote =
          pistonRes.status === 401
            ? "Remote Piston public sandbox is whitelist-only (HTTP 401); static trace & test telemetry active."
            : `Remote Piston sandbox returned HTTP ${pistonRes.status}; static trace & test telemetry active.`;
      }
    } catch {
      sandboxNote = "Remote Piston sandbox unreachable; static trace & test telemetry active.";
    }

    const result: SandboxExecutionToolResult = {
      sandboxAvailable,
      sandboxNote,
      sandboxExecution: {
        language: pistonSpec.language,
        version: pistonSpec.version,
        stdout,
        stderr,
        exitCode,
        executionLatencyMs: Date.now() - pistonStart,
      },
    };

    return JSON.stringify(result);
  },
});

/**
 * LangChain DynamicStructuredTool that inspects a public GitHub repository's metadata,
 * recursive file tree, and README excerpt for codebase Deep-Grill questioning.
 */
export const inspectGitHubRepoTool = new DynamicStructuredTool({
  name: "inspect_github_repo_tool",
  description:
    "Fetches live GitHub repository metadata, recursive file tree, package manifest, recent commits, README excerpt, and actual source code excerpts from up to 5 core implementation files.",
  schema: z.object({
    repoInput: z.string().describe("GitHub repository URL or owner/repo slug"),
    focusNotes: z
      .string()
      .optional()
      .describe("Optional module or architecture focus notes for prioritizing source files"),
  }),
  func: async ({ repoInput, focusNotes = "" }): Promise<string> => {
    const parsed = parseGitHubRepo(repoInput);
    if (!parsed) {
      throw new Error(
        `INVALID_GITHUB_REPO: Could not parse "${repoInput}". Expected owner/repo or https://github.com/owner/repo.`
      );
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Placement-Copilot-Deep-Grill-Agent",
    };
    const token = process.env.GITHUB_TOKEN?.trim();
    if (token && !token.includes("placeholder")) {
      headers.Authorization = `Bearer ${token}`;
    }

    const repoRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!repoRes.ok) {
      throw new Error(
        `GITHUB_API_ERROR: Could not fetch repo ${parsed.owner}/${parsed.repo} (HTTP ${repoRes.status}). Make sure the repository exists and is public.`
      );
    }
    const repoMeta = (await repoRes.json()) as {
      default_branch?: string;
      description?: string;
      language?: string;
      stargazers_count?: number;
      html_url?: string;
    };
    const defaultBranch = repoMeta.default_branch || "main";

    const [treeRes, readmeRes, pkgRes, reqsRes, commitsRes] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
        {
          headers,
          signal: AbortSignal.timeout(10000),
        }
      ),
      fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/readme`, {
        headers,
        signal: AbortSignal.timeout(10000),
      }),
      fetch(
        `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(defaultBranch)}/package.json`,
        { signal: AbortSignal.timeout(8000) }
      ).catch(() => null),
      fetch(
        `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(defaultBranch)}/requirements.txt`,
        { signal: AbortSignal.timeout(8000) }
      ).catch(() => null),
      fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=8`,
        {
          headers,
          signal: AbortSignal.timeout(8000),
        }
      ).catch(() => null),
    ]);

    let allBlobPaths: string[] = [];
    if (treeRes.ok) {
      const treeJson = (await treeRes.json()) as { tree?: GitTreeItem[] };
      allBlobPaths = (treeJson.tree || [])
        .filter((item) => item.type === "blob" && typeof item.path === "string")
        .map((item) => item.path!);
    }

    let readmeExcerpt = "";
    if (readmeRes.ok) {
      const readmeJson = (await readmeRes.json()) as { content?: string };
      if (readmeJson.content) {
        readmeExcerpt = Buffer.from(readmeJson.content, "base64").toString("utf-8").slice(0, 2200);
      }
    }

    let dependenciesManifest = "";
    if (pkgRes && pkgRes.ok) {
      dependenciesManifest = (await pkgRes.text()).slice(0, 1800);
    } else if (reqsRes && reqsRes.ok) {
      dependenciesManifest = (await reqsRes.text()).slice(0, 1500);
    }

    let recentCommits: string[] = [];
    if (commitsRes && commitsRes.ok) {
      const commitsJson = (await commitsRes.json()) as GitCommitItem[];
      if (Array.isArray(commitsJson)) {
        recentCommits = commitsJson
          .map((c) => c.commit?.message?.split("\n")[0]?.trim())
          .filter((msg): msg is string => Boolean(msg))
          .slice(0, 6);
      }
    }

    const keyFilesToRead = selectHighSignalSourceFiles(allBlobPaths, focusNotes);
    const inspectedSourceFiles: InspectedSourceFile[] = [];

    await Promise.all(
      keyFilesToRead.map(async (filePath) => {
        try {
          const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
          const rawFileUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(defaultBranch)}/${encodedPath}`;
          const fRes = await fetch(rawFileUrl, { signal: AbortSignal.timeout(8000) });
          if (fRes.ok) {
            const text = await fRes.text();
            inspectedSourceFiles.push({
              path: filePath,
              codeExcerpt: text.slice(0, 1800),
            });
          }
        } catch {
          // Skip individual file fetch failures cleanly
        }
      })
    );

    // Keep deterministic order matching priority score
    inspectedSourceFiles.sort(
      (a, b) => keyFilesToRead.indexOf(a.path) - keyFilesToRead.indexOf(b.path)
    );

    const result: GitHubRepoToolResult = {
      owner: parsed.owner,
      repo: parsed.repo,
      fullName: `${parsed.owner}/${parsed.repo}`,
      htmlUrl: repoMeta.html_url || `https://github.com/${parsed.owner}/${parsed.repo}`,
      description: repoMeta.description || "",
      primaryLanguage: repoMeta.language || "Unknown",
      defaultBranch,
      stars: repoMeta.stargazers_count || 0,
      filePaths: allBlobPaths.slice(0, 120),
      totalFilesScanned: allBlobPaths.length,
      readmeExcerpt,
      dependenciesManifest,
      recentCommits,
      inspectedSourceFiles,
    };

    return JSON.stringify(result);
  },
});

