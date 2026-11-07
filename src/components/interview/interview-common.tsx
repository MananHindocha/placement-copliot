import React from "react";
import type { InterviewCategory, InterviewQuestion } from "@/types";

export interface DsaTestResultItem {
  caseId: string;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  executionTrace?: string;
}

export interface DsaCodeReviewItem {
  overallScore: number;
  detectedTimeComplexity: string;
  detectedSpaceComplexity: string;
  complexityMatch: boolean;
  edgeCasesHandled: string[];
  edgeCasesMissed: string[];
  bugsOrBottlenecks: string[];
  optimalCodeSuggestion: string;
  followUpQuestion: { prompt: string; intent: string };
}

export interface DsaRunCodeResponse {
  status: "Accepted" | "Wrong Answer" | "Time Limit Exceeded" | "Compilation Error";
  passedCount: number;
  totalCount: number;
  runtimeMs: number;
  memoryMb: number;
  compilerMessage?: string;
  testResults: DsaTestResultItem[];
  codeReview?: DsaCodeReviewItem;
}

export interface StudioQuestion extends InterviewQuestion {
  isCustom?: boolean;
}

export function handleEditorKeyDown(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  code: string,
  onChange: (val: string) => void
) {
  const textarea = e.currentTarget;
  const { selectionStart, selectionEnd } = textarea;

  if (e.key === "Tab") {
    e.preventDefault();
    const before = code.substring(0, selectionStart);
    const after = code.substring(selectionEnd);
    const nextCode = before + "  " + after;
    onChange(nextCode);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
    }, 0);
    return;
  }

  const pairs: Record<string, string> = {
    "(": ")",
    "[": "]",
    "{": "}",
    '"': '"',
    "'": "'",
  };
  if (pairs[e.key] && selectionStart === selectionEnd) {
    const closing = pairs[e.key];
    const before = code.substring(0, selectionStart);
    const after = code.substring(selectionEnd);
    const nextChar = after[0];
    if (!nextChar || /\s|[),\]}]/.test(nextChar)) {
      e.preventDefault();
      const nextCode = before + e.key + closing + after;
      onChange(nextCode);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      }, 0);
      return;
    }
  }

  if (e.key === "Enter") {
    const before = code.substring(0, selectionStart);
    const after = code.substring(selectionEnd);
    const lines = before.split("\n");
    const currentLine = lines[lines.length - 1] || "";
    const match = currentLine.match(/^\s*/);
    let indent = match ? match[0] : "";
    const trimmed = currentLine.trim();
    if (trimmed.endsWith("{") || trimmed.endsWith(":") || trimmed.endsWith("(")) {
      indent += "  ";
    }
    e.preventDefault();
    const nextCode = before + "\n" + indent + after;
    onChange(nextCode);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = selectionStart + 1 + indent.length;
    }, 0);
    return;
  }
}

export function GithubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export interface SpeechRecognitionResultItem {
  transcript: string;
}

export interface SpeechRecognitionResultList {
  length: number;
  [index: number]: {
    [index: number]: SpeechRecognitionResultItem;
    isFinal: boolean;
  };
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export const CATEGORY_CONFIG: Record<
  InterviewCategory,
  { label: string; variant: "indigo" | "emerald" | "amber" | "violet" | "rose" }
> = {
  behavioral: { label: "Behavioral & STAR", variant: "indigo" },
  technical: { label: "Technical", variant: "violet" },
  situational: { label: "Situational", variant: "amber" },
  culture: { label: "Culture & Ownership", variant: "emerald" },
  "resume-grill": { label: "Resume Project Grill", variant: "rose" },
  "core-technical": { label: "Core Technical", variant: "violet" },
  "system-design": { label: "System Design", variant: "indigo" },
  dsa: { label: "DSA & Problem Solving", variant: "amber" },
  debugging: { label: "Live Debugging & RCA", variant: "rose" },
  "custom-jd": { label: "Custom JD Tailored", variant: "emerald" },
};

export const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "text-emerald-400",
  medium: "text-amber-400",
  hard: "text-rose-400",
};

export const FILLER_WORDS_LIST = [
  "um",
  "uh",
  "like",
  "basically",
  "actually",
  "literally",
  "you know",
] as const;

export function getQuestionExpectedConcepts(question?: StudioQuestion): string[] {
  if (!question) return [];
  if (Array.isArray(question.keyConceptsToCover) && question.keyConceptsToCover.length > 0) {
    return question.keyConceptsToCover;
  }
  if (question.hint) {
    const hintClean = question.hint.replace(/^Interviewer Expectations?:\s*/i, "");
    const parts = hintClean
      .split(/[,;•|]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && s.length < 35);
    if (parts.length >= 2) return parts.slice(0, 5);
  }
  const words = question.question
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  return Array.from(new Set(words)).slice(0, 4);
}

export const CONCEPT_SYNONYM_DICTIONARY: Record<string, string[]> = {
  "o(1)": ["constant time", "hash map", "direct index", "o 1", "constant complexity"],
  "optimistic ui": [
    "optimistic update",
    "rollback",
    "instant feedback",
    "speculative update",
    "useoptimistic",
  ],
  redis: ["in-memory", "cache", "pub/sub", "key value store", "ttl", "eviction"],
  kafka: ["event stream", "message queue", "partition", "broker", "consumer group", "offset"],
  "connection pool": ["pooling", "active connections", "pgbouncer", "pool size", "db pool"],
  deadlock: ["lock contention", "mutex", "circular wait", "two phase locking", "race condition"],
  crdt: ["conflict free", "eventual consistency", "vector clock", "state based replication"],
  "rate limiting": ["token bucket", "leaky bucket", "sliding window", "429", "throttle"],
  idempotency: ["idempotent", "unique key", "retry safe", "at most once", "deduplication"],
  sharding: ["horizontal partition", "shard key", "consistent hashing", "database partition"],
  websocket: ["real time", "full duplex", "socket", "long polling", "bidirectional"],
  graphql: ["schema", "resolver", "overfetching", "query mutation", "dataloader"],
  jwt: ["token", "bearer", "claims", "stateless auth", "signature", "refresh token"],
  acid: ["atomicity", "consistency", "isolation", "durability", "transaction"],
  "b-tree": ["b tree", "index scan", "clustered index", "binary search tree", "leaf nodes"],
  lru: ["least recently used", "cache eviction", "doubly linked list", "eviction policy"],
  "sliding window": ["two pointer", "window size", "subarray", "rolling window"],
  "dynamic programming": [
    "memoization",
    "tabulation",
    "optimal substructure",
    "overlapping subproblems",
    "dp",
  ],
};

export const CODE_LANGUAGES = [
  {
    id: "typescript",
    name: "TypeScript / JS",
    defaultSnippet:
      "// TypeScript / JavaScript\nfunction handleOptimisticUpdate(state, action) {\n  // Instant state update with rollback fallback\n}",
  },
  {
    id: "python",
    name: "Python 3",
    defaultSnippet:
      "# Python 3\ndef handle_optimistic_update(state, action):\n    # Instant state update with rollback fallback\n    pass",
  },
  {
    id: "java",
    name: "Java",
    defaultSnippet:
      "// Java\nclass Solution {\n    public void handleOptimisticUpdate(Object state, Object action) {\n        // Instant state update with rollback fallback\n    }\n}",
  },
  {
    id: "cpp",
    name: "C++",
    defaultSnippet:
      "// C++\n#include <iostream>\nusing namespace std;\n\nvoid handleOptimisticUpdate() {\n    // Instant state update with rollback fallback\n}",
  },
  {
    id: "sql",
    name: "SQL Schema",
    defaultSnippet:
      "-- SQL Schema & Query\nCREATE TABLE state_events (\n  id SERIAL PRIMARY KEY,\n  action_type VARCHAR(64),\n  payload JSONB\n);",
  },
  {
    id: "go",
    name: "Go",
    defaultSnippet:
      "// Go (Golang)\npackage main\n\nfunc HandleOptimisticUpdate() {\n    // Implementation here\n}",
  },
  {
    id: "pseudocode",
    name: "Pseudocode",
    defaultSnippet:
      "// High-Level Architecture / Algorithm Pseudocode\n// Step 1: Record initial state\n// Step 2: Apply speculative mutation\n// Step 3: Catch async rejection & revert",
  },
] as const;

export const COMPANY_JD_PRESETS = [
  {
    name: "Razorpay",
    role: "Backend Engineer",
    company: "Razorpay",
    desc: "Build scalable payment gateway microservices. Requires high-throughput API design, idempotency keys, MySQL transaction isolation, Redis caching, Kafka distributed event queues, and zero-downtime database migrations.",
  },
  {
    name: "Google",
    role: "Systems SDE",
    company: "Google",
    desc: "Design globally distributed systems and real-time data pipelines. Requires deep understanding of Big-O complexity, RPCs, Paxos/Raft consensus, memory layout, lock-free concurrency, and fault tolerance at 100k+ QPS.",
  },
  {
    name: "Swiggy / Flipkart",
    role: "Full-Stack SDE",
    company: "Swiggy",
    desc: "Build low-latency delivery & checkout pipelines. Strong focus on Next.js/React frontend performance, WebSockets for live driver geolocation, Redis geospatial indexes, rate limiting, and elastic worker queues.",
  },
  {
    name: "Goldman Sachs",
    role: "Low-Latency / Quant SDE",
    company: "Goldman Sachs",
    desc: "Engineer ultra-low latency order matching engines and risk analytics. Demands C++/Java memory management, cache locality, lock-free ring buffers, multithreading, and microsecond latency optimization.",
  },
  {
    name: "Zepto / Zomato",
    role: "Full-Stack SDE",
    company: "Zepto",
    desc: "10-minute quick-commerce logistics stack. High concurrent inventory reservation locks, p99 latency optimization, optimistic UI updates, PostgreSQL connection pooling, and distributed tracing.",
  },
];

export function isConceptCovered(concept: string, text: string, code: string): boolean {
  if (!concept) return false;
  const combined = `${text} ${code}`.toLowerCase().replace(/[^a-z0-9]/g, " ");
  const normalizedConcept = concept
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalizedConcept && combined.includes(normalizedConcept)) return true;

  // Check synonym dictionary
  for (const [key, synonyms] of Object.entries(CONCEPT_SYNONYM_DICTIONARY)) {
    if (normalizedConcept.includes(key) || key.includes(normalizedConcept)) {
      if (synonyms.some((syn) => combined.includes(syn.toLowerCase().replace(/[^a-z0-9]/g, " ")))) {
        return true;
      }
    }
  }

  const tokens = concept
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[\s\-_/]+/)
    .filter((t) => t.length > 2);
  if (tokens.length === 0) return false;

  const significant = tokens.filter(
    (t) =>
      ![
        "the",
        "and",
        "for",
        "with",
        "from",
        "using",
        "state",
        "pattern",
        "handling",
        "model",
        "approach",
        "strategy",
      ].includes(t)
  );
  const toCheck = significant.length > 0 ? significant : tokens;
  let matches = 0;
  for (const token of toCheck) {
    const stem = token.length > 5 ? token.slice(0, token.length - 2) : token;
    if (combined.includes(token) || combined.includes(stem)) {
      matches++;
    }
  }
  return matches / toCheck.length >= 0.6;
}

