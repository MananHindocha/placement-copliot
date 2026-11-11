import fs from "fs";
import os from "os";
import path from "path";
import type { DsaOaProblem, DsaTopic } from "@/lib/dsa-oa-questions";

const CACHE_FILE_PATH = path.join(os.tmpdir(), "placement-copilot-liquidslr-cache-v2.json");
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export type RepoTimeframe = "all" | "30d" | "3m" | "6m" | "6m+";

const TIMEFRAME_FILES: Record<RepoTimeframe, string> = {
  all: "5. All.csv",
  "30d": "1. Thirty Days.csv",
  "3m": "2. Three Months.csv",
  "6m": "3. Six Months.csv",
  "6m+": "4. More Than Six Months.csv",
};

const REPO_COMPANY_FOLDER_MAP: Record<string, string> = {
  "Amazon OA": "Amazon",
  Amazon: "Amazon",
  Google: "Google",
  Microsoft: "Microsoft",
  Meta: "Meta",
  Apple: "Apple",
  Netflix: "Netflix",
  Stripe: "Stripe",
  Uber: "Uber",
  "Goldman Sachs": "Goldman Sachs",
  Adobe: "Adobe",
  Atlassian: "Atlassian",
  Confluent: "Confluent",
  Swiggy: "Swiggy",
  Flipkart: "Flipkart",
  Zomato: "Zomato",
  Razorpay: "Razorpay",
  Paytm: "Paytm",
  Postman: "Postman",
  "Morgan Stanley": "Morgan Stanley",
  "Media.net": "Media.net",
  Sprinklr: "Sprinklr",
  "DE Shaw": "DE Shaw",
  "D.E. Shaw": "DE Shaw",
  Oracle: "Oracle",
  Salesforce: "Salesforce",
  Cisco: "Cisco",
  Intuit: "Intuit",
  PhonePe: "PhonePe",
  Walmart: "Walmart Labs",
  "Walmart Labs": "Walmart Labs",
};

interface CachedCompanyEntry {
  timestamp: number;
  csvUrl?: string;
  problems: DsaOaProblem[];
}

export interface LiquidSlrFetchResult {
  success: boolean;
  source: string;
  csvUrl?: string;
  company: string;
  timeframe: RepoTimeframe;
  totalInRepoForCompany: number;
  problems: DsaOaProblem[];
  error?: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function toCamelCaseMethod(title: string): string {
  const words = title
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "solveProblem";
  return words
    .map((w, idx) =>
      idx === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join("");
}

function computeStableRepoNumber(repoFolder: string, slug: string): number {
  const key = `${repoFolder.toLowerCase()}:${slug.toLowerCase()}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Keep repo IDs cleanly above curated #1..#30 so localStorage status never collides
  return 100000 + ((hash >>> 0) % 899999);
}

function mapCsvTopicsToDsaTopic(topicsList: string[]): DsaTopic {
  const joined = topicsList.join(" ").toLowerCase();
  if (/dynamic programming|memoization|knapsack/.test(joined)) return "Dynamic Programming";
  if (/graph|bfs|dfs|topological|union find|shortest path|breadth-first|depth-first/.test(joined)) {
    return "Graphs, BFS/DFS & TopoSort";
  }
  if (/tree|bst|binary search|segment tree|binary indexed/.test(joined)) {
    return "Trees & Binary Search";
  }
  if (/sliding window|two pointers/.test(joined)) return "Sliding Window & Two Pointers";
  if (/stack|queue|monotonic/.test(joined)) return "Stacks, Queues & Monotonic";
  if (/linked list|design|doubly-linked|lru/.test(joined)) return "Linked Lists & Cache Design";
  if (/heap|priority queue|greedy|interval/.test(joined)) return "Heaps & Greedy";
  if (/backtracking|trie|recursion/.test(joined)) return "Backtracking & Tries";
  return "Arrays & Hashing";
}

function buildWorkspaceCodeTemplates(title: string, topicsList: string[]) {
  const fnName = toCamelCaseMethod(title);
  const topicHint = topicsList.slice(0, 3).join(", ") || "Optimal Approach";

  return {
    starterCode: {
      python: `class Solution:\n    def ${fnName}(self, *args):\n        # ${title} — Focus: ${topicHint}\n        # Write your optimal solution below\n        pass\n`,
      typescript: `// ${title} — Focus: ${topicHint}\nfunction ${fnName}(...args: unknown[]): unknown {\n  // Write your optimal solution below\n  return null;\n}\n`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    // ${title} — Focus: ${topicHint}\n    void ${fnName}() {\n        // Write your optimal solution below\n    }\n};\n`,
      java: `import java.util.*;\n\nclass Solution {\n    // ${title} — Focus: ${topicHint}\n    public void ${fnName}() {\n        // Write your optimal solution below\n    }\n}\n`,
    },
    referenceSolution: {
      python: `# Optimal ${topicHint} approach for ${title}\n# 1. Identify base cases and invariants.\n# 2. Choose appropriate auxiliary structure to meet optimal time/space bounds.\n`,
      typescript: `// Optimal ${topicHint} approach for ${title}\n// Structure solution with clean edge-case guards and optimal time/space complexity.\n`,
      cpp: `// Optimal ${topicHint} approach for ${title}\n// Use STL containers (unordered_map, priority_queue, deque) safely within constraints.\n`,
      java: `// Optimal ${topicHint} approach for ${title}\n// Use HashMap, ArrayDeque, or PriorityQueue with clear boundary checks.\n`,
    },
  };
}

function readTempCache(): Record<string, CachedCompanyEntry> {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE_PATH, "utf-8")) as Record<string, CachedCompanyEntry>;
    }
  } catch {
    // Ignore corrupt cache safely
  }
  return {};
}

function writeTempCache(cache: Record<string, CachedCompanyEntry>): void {
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cache), "utf-8");
  } catch {
    // Ignore read-only fs errors cleanly
  }
}

export async function fetchLiquidSlrCompanyProblems(options: {
  company: string;
  timeframe?: string;
  limit?: number;
}): Promise<LiquidSlrFetchResult> {
  const companyParam = (options.company || "Google").trim();
  const timeframeRaw = (options.timeframe || "all").trim();
  const timeframe: RepoTimeframe =
    timeframeRaw in TIMEFRAME_FILES ? (timeframeRaw as RepoTimeframe) : "all";
  const limit = Math.min(Math.max(1, Number(options.limit || 50)), 100);

  const repoFolder = REPO_COMPANY_FOLDER_MAP[companyParam] || companyParam;
  const csvFileName = TIMEFRAME_FILES[timeframe];
  const cacheKey = `${repoFolder}::${csvFileName}`;

  const cache = readTempCache();
  const cachedEntry = cache[cacheKey];
  if (
    cachedEntry &&
    Date.now() - cachedEntry.timestamp < CACHE_TTL_MS &&
    Array.isArray(cachedEntry.problems) &&
    cachedEntry.problems.length > 0
  ) {
    const stamped = cachedEntry.problems.map((p) =>
      p.companyTags[0] === companyParam ? p : { ...p, companyTags: [companyParam] }
    );
    return {
      success: true,
      source: "liquidslr/leetcode-company-wise-problems (cached)",
      csvUrl: cachedEntry.csvUrl,
      company: companyParam,
      timeframe,
      totalInRepoForCompany: stamped.length,
      problems: stamped.slice(0, limit),
    };
  }

  const candidateFiles = csvFileName === "5. All.csv" ? ["5. All.csv"] : [csvFileName, "5. All.csv"];
  let rawCsvText = "";
  let usedFileUrl = "";

  for (const fileCandidate of candidateFiles) {
    const encodedFolder = encodeURIComponent(repoFolder);
    const encodedFile = encodeURIComponent(fileCandidate);
    const rawUrl = `https://raw.githubusercontent.com/liquidslr/leetcode-company-wise-problems/main/${encodedFolder}/${encodedFile}`;

    try {
      const res = await fetch(rawUrl, {
        headers: { "User-Agent": "Placement-Copilot-DSA-Sync" },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        rawCsvText = await res.text();
        usedFileUrl = rawUrl;
        break;
      }
    } catch {
      // Try fallback candidate CSV file cleanly
    }
  }

  if (!rawCsvText) {
    return {
      success: false,
      source: "liquidslr/leetcode-company-wise-problems",
      company: companyParam,
      timeframe,
      totalInRepoForCompany: 0,
      problems: [],
      error: `Company "${companyParam}" CSV not found in liquidslr/leetcode-company-wise-problems repository.`,
    };
  }

  const lines = rawCsvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const dataLines = lines.slice(1);
  const parsedDrafts: Array<Omit<DsaOaProblem, "displayRank">> = [];

  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    if (cols.length < 5) continue;

    const [rawDiff, rawTitle, rawFreq, rawAcc, rawLink, rawTopics = ""] = cols;
    if (!rawTitle) continue;

    const upperDiff = (rawDiff || "MEDIUM").toUpperCase();
    const difficulty: "Easy" | "Medium" | "Hard" =
      upperDiff === "EASY" ? "Easy" : upperDiff === "HARD" ? "Hard" : "Medium";

    const frequency = Math.min(100, Math.max(1, Math.round(parseFloat(rawFreq) || 50)));
    const parsedAcc = parseFloat(rawAcc);
    const acceptanceRate =
      !Number.isFinite(parsedAcc) || parsedAcc <= 0
        ? 45
        : parsedAcc <= 0.015
        ? Math.min(100, Math.round(parsedAcc * 100000) / 10)
        : parsedAcc <= 1
        ? Math.min(100, Math.round(parsedAcc * 1000) / 10)
        : Math.min(100, Math.round(parsedAcc * 10) / 10);

    const topicsList = rawTopics
      ? rawTopics
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : ["Algorithms", "Data Structures"];

    const mappedTopic = mapCsvTopicsToDsaTopic(topicsList);
    const topicSummary = topicsList.slice(0, 3).join(", ") || mappedTopic;
    const slug =
      rawLink.split("/problems/")[1]?.replace(/\/$/, "") ||
      rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const folderSlug = repoFolder.toLowerCase().replace(/[^a-z0-9]/g, "");
    const stableNumber = computeStableRepoNumber(repoFolder, slug);
    const { starterCode, referenceSolution } = buildWorkspaceCodeTemplates(rawTitle, topicsList);
    const expectedTimeComplexity = difficulty === "Hard" ? "O(N log N)" : "O(N)";
    const expectedSpaceComplexity = "O(N)";

    parsedDrafts.push({
      id: `liquidslr-${folderSlug}-${slug}`,
      number: stableNumber,
      title: rawTitle,
      difficulty,
      topic: mappedTopic,
      topicsList,
      frequency,
      acceptanceRate,
      leetcodeUrl: rawLink || `https://leetcode.com/problems/${slug}`,
      companyTags: [companyParam],
      roles: ["Software Engineer", "SDE-1", "Backend Engineer"],
      problemStatement: `Official ${companyParam} interview problem sourced from liquidslr/leetcode-company-wise-problems (Interview Frequency: ${frequency}%, Acceptance Rate: ${acceptanceRate}%).\n\nImplement the optimal solution for "${rawTitle}" focusing on ${topicSummary}. Verify edge cases and explain your time and space trade-offs aloud to the AI Bar-Raiser Agent.`,
      examples: [
        {
          input: `Standard "${rawTitle}" input case (Focus: ${topicSummary})`,
          output: `Expected optimal result verified via AI Bar-Raiser dry-run & test suite`,
        },
      ],
      constraints: [
        `Asked in ${companyParam} interviews (Frequency: ${frequency}%, Acceptance: ${acceptanceRate}%)`,
        `Core Topics: ${topicsList.join(", ")}`,
        `Target Bounds: ${expectedTimeComplexity} time, ${expectedSpaceComplexity} space`,
      ],
      expectedTimeComplexity,
      expectedSpaceComplexity,
      keyConcepts:
        topicsList.length >= 2
          ? topicsList.slice(0, 4)
          : [...topicsList, "Edge Case Handling", "Time-Space Trade-off"],
      hints: [
        `Break down "${rawTitle}" using ${topicSummary} fundamentals before optimizing.`,
        `Aim for ${expectedTimeComplexity} time complexity and guard against empty, single-element, or boundary inputs.`,
      ],
      starterCode,
      referenceSolution,
      testCases: [
        {
          id: "tc-1",
          inputDisplay: `Representative baseline input for ${rawTitle}`,
          expectedOutputDisplay: `Expected baseline output`,
        },
        {
          id: "tc-2",
          inputDisplay: `Edge case input (empty / duplicate / boundary constraint) for ${rawTitle}`,
          expectedOutputDisplay: `Expected edge-case output`,
          isHidden: true,
        },
      ],
    });
  }

  parsedDrafts.sort((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0));
  const finalProblems: DsaOaProblem[] = parsedDrafts.map((p, idx) => ({
    ...p,
    displayRank: idx + 1,
  }));

  cache[cacheKey] = {
    timestamp: Date.now(),
    csvUrl: usedFileUrl,
    problems: finalProblems,
  };
  writeTempCache(cache);

  return {
    success: true,
    source: "liquidslr/leetcode-company-wise-problems",
    csvUrl: usedFileUrl,
    company: companyParam,
    timeframe,
    totalInRepoForCompany: finalProblems.length,
    problems: finalProblems.slice(0, limit),
  };
}

export async function findRepoProblemForWorkspace(params: {
  questionId: string;
  company?: string;
  timeframe?: string;
}): Promise<{ problem: DsaOaProblem; allProblems: DsaOaProblem[] } | null> {
  const { questionId, company, timeframe = "all" } = params;
  const normalizedQ = decodeURIComponent(questionId).toLowerCase();

  // 1. Check os.tmpdir() cache first across all stored company/timeframe slices
  const cache = readTempCache();
  for (const entry of Object.values(cache)) {
    if (!Array.isArray(entry.problems)) continue;
    const hit = entry.problems.find(
      (p) => p.id.toLowerCase() === normalizedQ || p.number.toString() === normalizedQ
    );
    if (hit) {
      return { problem: hit, allProblems: entry.problems };
    }
  }

  // 2. If not in cache yet and a company hint was passed (or inferable from `liquidslr-<company>-`), fetch live
  let inferredCompany = company?.trim() || "";
  if (!inferredCompany && normalizedQ.startsWith("liquidslr-")) {
    const rest = normalizedQ.slice("liquidslr-".length);
    const knownMatch = Object.keys(REPO_COMPANY_FOLDER_MAP).find((name) =>
      rest.startsWith(`${name.toLowerCase().replace(/[^a-z0-9]/g, "")}-`)
    );
    if (knownMatch) inferredCompany = knownMatch;
  }

  if (inferredCompany) {
    const fetched = await fetchLiquidSlrCompanyProblems({
      company: inferredCompany,
      timeframe,
      limit: 100,
    });
    if (fetched.success) {
      const hit = fetched.problems.find(
        (p) => p.id.toLowerCase() === normalizedQ || p.number.toString() === normalizedQ
      );
      if (hit) {
        return { problem: hit, allProblems: fetched.problems };
      }
    }
  }

  return null;
}

