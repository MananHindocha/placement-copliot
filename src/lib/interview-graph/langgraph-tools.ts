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

export interface GitHubRepoToolResult {
  owner: string;
  repo: string;
  fullName: string;
  description: string;
  primaryLanguage: string;
  stars: number;
  filePaths: string[];
  readmeExcerpt: string;
}

interface GitTreeItem {
  path?: string;
  type?: string;
}

function parseGitHubRepo(input?: string): { owner: string; repo: string } | null {
  if (!input || typeof input !== "string") return null;
  const cleaned = input.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const matchUrl = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (matchUrl) return { owner: matchUrl[1], repo: matchUrl[2] };
  const parts = cleaned.split("/");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { owner: parts[0], repo: parts[1] };
  }
  return null;
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
    "Fetches live GitHub repository metadata, up to 80 file tree paths, and the README excerpt for an engineering Deep-Grill session.",
  schema: z.object({
    repoInput: z.string().describe("GitHub repository URL or owner/repo slug"),
  }),
  func: async ({ repoInput }): Promise<string> => {
    const parsed = parseGitHubRepo(repoInput);
    if (!parsed) {
      throw new Error(
        `INVALID_GITHUB_REPO: Could not parse "${repoInput}". Expected owner/repo or https://github.com/owner/repo.`
      );
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Placement-Copilot-Agent",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const repoRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!repoRes.ok) {
      throw new Error(
        `GITHUB_API_ERROR: Could not fetch repo ${parsed.owner}/${parsed.repo} (HTTP ${repoRes.status}). Make sure the repository is public.`
      );
    }
    const repoMeta = (await repoRes.json()) as {
      default_branch?: string;
      description?: string;
      language?: string;
      stargazers_count?: number;
    };
    const defaultBranch = repoMeta.default_branch || "main";

    const [treeRes, readmeRes] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${defaultBranch}?recursive=1`,
        {
          headers,
          signal: AbortSignal.timeout(10000),
        }
      ),
      fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/readme`, {
        headers,
        signal: AbortSignal.timeout(10000),
      }),
    ]);

    let filePaths: string[] = [];
    if (treeRes.ok) {
      const treeJson = (await treeRes.json()) as { tree?: GitTreeItem[] };
      filePaths = (treeJson.tree || [])
        .filter((item) => item.type === "blob" && typeof item.path === "string")
        .map((item) => item.path!)
        .slice(0, 80);
    }

    let readmeExcerpt = "";
    if (readmeRes.ok) {
      const readmeJson = (await readmeRes.json()) as { content?: string };
      if (readmeJson.content) {
        readmeExcerpt = Buffer.from(readmeJson.content, "base64").toString("utf-8").slice(0, 2500);
      }
    }

    const result: GitHubRepoToolResult = {
      owner: parsed.owner,
      repo: parsed.repo,
      fullName: `${parsed.owner}/${parsed.repo}`,
      description: repoMeta.description || "",
      primaryLanguage: repoMeta.language || "Unknown",
      stars: repoMeta.stargazers_count || 0,
      filePaths,
      readmeExcerpt,
    };

    return JSON.stringify(result);
  },
});

