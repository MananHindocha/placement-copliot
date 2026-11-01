import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import mammoth from "mammoth";
import zlib from "zlib";
import type { ResumeAnalysis, TailorSuggestion, ParsedResumeDocument } from "@/types";
import { getResumeBulletTargets, parseStructuredResume } from "@/lib/resume/parser";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_FILE_BYTES + 256 * 1024;

// ─── Environment Variable Access ─────────────────────────────────────────────

function getGeminiApiKey(): string | null {
  const raw = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
  const cleaned = raw.trim().replace(/^["']|["']$/g, "");
  if (!cleaned || cleaned.includes("your_gemini") || cleaned.length < 10) return null;
  return cleaned;
}

function getGroqApiKey(): string | null {
  const raw = process.env.GROQ_API_KEY || "";
  const cleaned = raw.trim().replace(/^["']|["']$/g, "");
  if (!cleaned || cleaned.includes("your_groq") || cleaned.length < 10) return null;
  return cleaned;
}

// ─── Data Extraction & Sanitization Helpers ─────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readScore(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(100, Math.max(0, Math.round(value)));
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return Math.min(100, Math.max(0, Math.round(parsed)));
    }
  }
  return fallback;
}

function readStringArray(value: unknown, limit: number): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, limit)
    : [];
}

function cleanPlainText(value: string): string {
  return value
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*[-•▪◦‣]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts and safely parses JSON from model responses, handling markdown code
 * fences, leading/trailing prose, and minor syntax anomalies.
 */
function extractJsonPayload(raw: string): unknown | null {
  if (!raw || typeof raw !== "string") return null;
  let text = raw.trim();

  // Strip markdown fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Find outermost { ... }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(text);
  } catch {
    // Attempt minor repair of trailing commas
    try {
      const sanitized = text
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/[\u0000-\u001F]+/g, (m) => (m.includes("\n") ? "\n" : " "));
      return JSON.parse(sanitized);
    } catch {
      return null;
    }
  }
}

// ─── Compact Prompt Builder ──────────────────────────────────────────────────

function buildCompactPrompt(
  parsedDoc: ParsedResumeDocument,
  targetRole: string,
  jobDescription: string
): string {
  const targets = getResumeBulletTargets(parsedDoc);
  const workAndProjectBullets = targets
    .filter((t) => t.targetSection === "experience" || t.targetSection === "projects")
    .map((t) => ({
      bulletId: t.targetBulletId,
      entryId: t.targetEntryId,
      section: t.targetSection,
      label: t.sectionLabel,
      text: t.text,
    }));

  const fallbackBullets = targets.map((t) => ({
    bulletId: t.targetBulletId,
    entryId: t.targetEntryId,
    section: t.targetSection,
    label: t.sectionLabel,
    text: t.text,
  }));

  const bulletsToEvaluate = (workAndProjectBullets.length > 0 ? workAndProjectBullets : fallbackBullets).slice(0, 25);
  const skillsList = parsedDoc.skills.slice(0, 30);
  const roleName = targetRole.trim() || "Software Engineer";
  const jdText = jobDescription.trim() ? `\nTarget Job Description:\n${jobDescription.trim().slice(0, 1500)}` : "";

  return `You are a Principal Staff Engineer & Technical Recruiter evaluating a candidate's resume for the role: "${roleName}".${jdText}

Candidate Extracted Skills:
${JSON.stringify(skillsList)}

Candidate Work & Project Bullets to Evaluate (reference these exact bulletId and entryId values):
${JSON.stringify(bulletsToEvaluate, null, 2)}

TASK:
1. Score the resume (0-100 integers):
   - matchScore: Overall JD & role alignment.
   - atsScore: Structural ATS readability and keyword coverage.
   - impactScore: Quantified business/technical outcome density.
   - verbScore: Assertive technical action verb density.
2. Strengths: 3 to 5 concise bullet points highlighting verified technical depth and impact.
3. Gaps: 3 to 5 specific, actionable critical gaps for this role (e.g. missing high-priority skills, lack of scale/metrics).
4. Keywords: 12 to 20 key technical skills relevant to ${roleName}, whether found in the candidate's bullets/skills (boolean found), and importance ("high" | "medium").
5. Suggestions: Provide up to 6 high-impact bullet rewrites using Google's XYZ formula:
   "Accomplished [X] as measured by [Y], by doing [Z]"
   RULES:
   - For each rewrite, quote the exact "bulletId", "entryId", "section", and "label" from the input bullets.
   - "original": Exact text from the input bullet.
   - "improved": Rewritten version in PLAIN TEXT (NO markdown bold, asterisks, or bullet points).
   - "reason": Clear recruiter reason explaining why this improves ATS & hiring manager impact.
   - "impactLevel": "high" or "medium".
   - Keep the candidate's genuine experience; enhance phrasing, action verbs, and structure.

OUTPUT FORMAT: Return pure JSON without markdown wrapping:
{
  "matchScore": 78,
  "atsScore": 84,
  "impactScore": 72,
  "verbScore": 80,
  "strengths": ["..."],
  "gaps": ["..."],
  "keywords": [{ "word": "React", "found": true, "importance": "high" }],
  "suggestions": [
    {
      "targetSection": "experience",
      "targetEntryId": "exp-0",
      "targetBulletId": "exp-0-b-1",
      "sectionLabel": "Experience: Adani Power",
      "original": "Worked on frontend dashboard...",
      "improved": "Accomplished [X] as measured by [Y], by doing [Z]",
      "reason": "Why this rewrite improves impact",
      "impactLevel": "high"
    }
  ]
}`;
}

// ─── Exact ID Mapping & Partial-Heal Normalization ──────────────────────────

function normalizeSuggestions(value: unknown, parsedDoc: ParsedResumeDocument): TailorSuggestion[] {
  if (!Array.isArray(value)) return [];
  const targets = getResumeBulletTargets(parsedDoc);
  const targetById = new Map(targets.map((t) => [t.targetBulletId, t]));
  const normalized: TailorSuggestion[] = [];
  const seenTargets = new Set<string>();

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) continue;

    const requestedBulletId = readString(item.targetBulletId || item.bulletId).trim();
    const requestedOriginal = cleanPlainText(readString(item.original));
    const improvedRaw = readString(item.improved || item.suggested);
    const improved = cleanPlainText(improvedRaw);

    if (!improved || improved.length < 8) continue;

    // Direct exact targetBulletId match
    let target = requestedBulletId ? targetById.get(requestedBulletId) : undefined;

    // Fallback 1: match by exact original text
    if (!target && requestedOriginal) {
      target = targets.find((t) => cleanPlainText(t.text) === requestedOriginal);
    }

    // Fallback 2: match by substring prefix
    if (!target && requestedOriginal && requestedOriginal.length >= 20) {
      const origSnippet = requestedOriginal.toLowerCase().slice(0, 35);
      target = targets.find((t) => cleanPlainText(t.text).toLowerCase().includes(origSnippet));
    }

    // Fallback 3: match if requested original contains target snippet
    if (!target && requestedOriginal && requestedOriginal.length >= 20) {
      target = targets.find((t) => requestedOriginal.toLowerCase().includes(cleanPlainText(t.text).toLowerCase().slice(0, 35)));
    }

    if (!target) continue;
    if (seenTargets.has(target.targetBulletId)) continue;
    seenTargets.add(target.targetBulletId);

    // Skip if unchanged
    if (cleanPlainText(target.text) === improved) continue;

    const impactLevel = item.impactLevel === "high" || item.impact === "high" ? ("high" as const) : ("medium" as const);
    const reason = readString(
      item.reason,
      "Rewritten using the Google XYZ formula for greater quantified recruiter impact."
    );

    normalized.push({
      id: `sug-${index + 1}-${target.targetBulletId}`,
      section: target.targetSection,
      targetSection: target.targetSection,
      targetEntryId: target.targetEntryId,
      targetBulletId: target.targetBulletId,
      sectionLabel: target.sectionLabel,
      original: target.text,
      suggested: improved,
      improved,
      impact: impactLevel,
      impactLevel,
      reason,
    });

    if (normalized.length >= 8) break;
  }

  return normalized;
}

function buildAiAnalysis(
  value: unknown,
  parsedDoc: ParsedResumeDocument,
  targetRole: string,
  jobDescription: string,
  pageCount: number
): ResumeAnalysis | null {
  if (!isRecord(value)) return null;

  // Local baseline calculation for merging/fallback
  const baseline = scoreResumeAccurately(parsedDoc, targetRole, jobDescription, pageCount);

  // Check if value has ANY usable evaluation content
  const hasScores = typeof value.matchScore === "number" || typeof value.atsScore === "number";
  const hasGaps = Array.isArray(value.gaps) && value.gaps.length > 0;
  const hasStrengths = Array.isArray(value.strengths) && value.strengths.length > 0;
  const hasSuggestions = Array.isArray(value.suggestions) && value.suggestions.length > 0;
  const hasKeywords = Array.isArray(value.keywords) && value.keywords.length > 0;

  if (!hasScores && !hasGaps && !hasStrengths && !hasSuggestions && !hasKeywords) {
    return null;
  }

  // Read scores safely with baseline fallback
  const matchScore = readScore(value.matchScore, baseline.matchScore);
  const atsScore = readScore(value.atsScore, baseline.atsScore);

  // Section scores: read either nested sectionScores or flat impactScore/verbScore
  const impactVal = isRecord(value.sectionScores) ? value.sectionScores.impact : value.impactScore;
  const verbVal = isRecord(value.sectionScores) ? value.sectionScores.style : value.verbScore;
  const brevityVal = isRecord(value.sectionScores) ? value.sectionScores.brevity : value.brevityScore;
  const skillsVal = isRecord(value.sectionScores) ? value.sectionScores.skills : value.skillsScore;

  const sectionScores = {
    impact: readScore(impactVal, baseline.sectionScores?.impact ?? 75),
    brevity: readScore(brevityVal, baseline.sectionScores?.brevity ?? 80),
    style: readScore(verbVal, baseline.sectionScores?.style ?? 75),
    skills: readScore(skillsVal, baseline.sectionScores?.skills ?? 80),
  };

  // Strengths & Gaps
  const strengths = readStringArray(value.strengths, 6);
  const effectiveStrengths = strengths.length > 0 ? strengths : baseline.strengths;

  const gaps = readStringArray(value.gaps, 8);
  const effectiveGaps = gaps.length > 0 ? gaps : baseline.gaps;

  // Keywords
  let effectiveKeywords = baseline.keywords;
  if (Array.isArray(value.keywords) && value.keywords.length > 0) {
    const parsedKeywords = value.keywords
      .filter(isRecord)
      .map((item) => {
        const word = readString(item.word || item.keyword).trim();
        const present = item.present === true || item.found === true;
        const importance = item.importance === "high" ? ("high" as const) : ("medium" as const);
        return { word, present, importance };
      })
      .filter((k) => k.word.length > 0);

    if (parsedKeywords.length > 0) {
      effectiveKeywords = parsedKeywords.slice(0, 30);
    }
  }

  // Suggestions with exact ID mapping
  const normalized = normalizeSuggestions(value.suggestions, parsedDoc);
  const effectiveSuggestions = normalized.length > 0 ? normalized : baseline.suggestions;

  // Skills
  const extractedSkills = readStringArray(value.extractedSkills || value.skills, 40);
  const effectiveSkills = extractedSkills.length > 0
    ? Array.from(new Set([...extractedSkills, ...parsedDoc.skills])).slice(0, 30)
    : parsedDoc.skills;

  return {
    ...baseline,
    matchScore,
    atsScore,
    jobTitle: targetRole || "Software Engineer",
    company: "Target Placement Role",
    strengths: effectiveStrengths,
    gaps: effectiveGaps,
    suggestions: effectiveSuggestions,
    keywords: effectiveKeywords,
    sectionScores,
    extractedSkills: effectiveSkills,
    meta: { ...baseline.meta, pageCount },
    rawText: parsedDoc.rawText,
    parsedResume: parsedDoc,
  };
}

// ─── Document Upload Stream Reader ──────────────────────────────────────────

async function readBoundedBody(request: NextRequest, maxBytes: number): Promise<Uint8Array | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function conservativeRewrite(text: string): string | null {
  const normalized = cleanPlainText(text);
  const rewrites: Array<[RegExp, string]> = [
    [/^worked on\s+/i, "Contributed to "],
    [/^helped (?:to )?/i, "Supported "],
    [/^assisted (?:with|in)\s+/i, "Supported "],
    [/^participated in\s+/i, "Contributed to "],
    [/^responsible for\s+/i, "Managed "],
    [/^developed\s+/i, "Engineered "],
    [/^built\s+/i, "Engineered "],
    [/^created\s+/i, "Developed "],
    [/^conducted\s+/i, "Executed "],
    [/^performed\s+/i, "Executed "],
    [/^implemented\s+/i, "Delivered "],
    [/^optimized\s+/i, "Improved "],
    [/^improved\s+/i, "Strengthened "],
    [/^designed\s+/i, "Architected "],
    [/^managed\s+/i, "Led "],
    [/^led\s+/i, "Directed "],
    [/^reduced\s+/i, "Cut "],
    [/^increased\s+/i, "Raised "],
    [/^deployed\s+/i, "Launched "],
    [/^integrated\s+/i, "Connected "],
    [/^collaborated on\s+/i, "Contributed to "],
  ];
  for (const [pattern, replacement] of rewrites) {
    if (pattern.test(normalized)) return normalized.replace(pattern, replacement);
  }
  if (normalized.length < 35 || !/\b(?:using|with|for|across|through|to)\b/i.test(normalized)) return null;
  return `Contributed to ${normalized.charAt(0).toLowerCase()}${normalized.slice(1)}`;
}

// ─── Dictionaries & Role Keywords ───────────────────────────────────────────

const STRONG_ACTION_VERBS = [
  "architected", "engineered", "spearheaded", "optimized", "developed",
  "automated", "streamlined", "accelerated", "designed", "implemented",
  "orchestrated", "reduced", "scaled", "delivered", "mentored", "revamped",
  "integrated", "refactored", "formulated", "executed", "constructed",
  "benchmarked", "deployed", "built", "authored", "led", "established"
];

const WEAK_ACTION_VERBS = [
  "worked on", "responsible for", "helped", "assisted", "did", "handled",
  "participated in", "was part of", "tried to", "supported", "contributed to",
  "involved in", "tasked with", "worked with"
];

const ROLE_KEYWORD_MAP: Record<string, string[]> = {
  frontend: [
    "React", "Next.js", "TypeScript", "JavaScript", "HTML5", "CSS3",
    "Tailwind CSS", "Redux", "State Management", "Responsive Design",
    "REST APIs", "GraphQL", "Webpack", "Vite", "Performance Optimization",
    "Jest", "UI/UX", "Git"
  ],
  backend: [
    "Node.js", "Python", "Java", "Go", "FastAPI", "Express", "Spring Boot",
    "PostgreSQL", "MongoDB", "Redis", "Kafka", "Docker", "Kubernetes",
    "AWS", "REST APIs", "GraphQL", "Microservices", "System Design",
    "SQL", "Git", "CI/CD"
  ],
  fullstack: [
    "React", "Next.js", "TypeScript", "Node.js", "Python", "PostgreSQL",
    "MongoDB", "Redis", "Docker", "REST APIs", "GraphQL", "Tailwind CSS",
    "Git", "CI/CD", "AWS", "System Design", "Microservices", "Linux"
  ],
  data: [
    "Python", "SQL", "Pandas", "NumPy", "Scikit-learn", "PyTorch",
    "TensorFlow", "Machine Learning", "Deep Learning", "Data Pipelines",
    "PostgreSQL", "Docker", "Data Visualization", "Git", "NLP"
  ],
  devops: [
    "Docker", "Kubernetes", "AWS", "GCP", "Terraform", "CI/CD",
    "Linux", "Git", "Python", "Bash", "Prometheus", "Grafana",
    "Microservices", "Networking", "Security"
  ],
  general: [
    "React", "Next.js", "TypeScript", "JavaScript", "Node.js", "Python",
    "Java", "C++", "SQL", "PostgreSQL", "MongoDB", "Redis", "Docker",
    "Kubernetes", "AWS", "Git", "CI/CD", "REST APIs", "System Design",
    "Data Structures", "Algorithms", "Tailwind CSS", "Linux"
  ]
};

const SYNONYM_MAP: Record<string, string> = {
  "react.js": "React",
  "reactjs": "React",
  "nextjs": "Next.js",
  "next.js": "Next.js",
  "nodejs": "Node.js",
  "node.js": "Node.js",
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "psql": "PostgreSQL",
  "k8s": "Kubernetes",
  "golang": "Go",
  "ts": "TypeScript",
  "js": "JavaScript",
  "mongo": "MongoDB",
  "mongodb": "MongoDB",
  "tailwind": "Tailwind CSS",
  "tailwindcss": "Tailwind CSS",
  "rest api": "REST APIs",
  "restful api": "REST APIs",
  "rest apis": "REST APIs",
  "rest": "REST APIs",
  "system architecture": "System Design",
  "ci-cd": "CI/CD",
  "cicd": "CI/CD",
  "amazon web services": "AWS",
};

// ─── Native Document Text Extraction ────────────────────────────────────────

function extractTextFromPdfStreams(buffer: Buffer): string {
  const textChunks: string[] = [];
  const content = buffer.toString("binary");
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(content)) !== null) {
    try {
      const streamBytes = Buffer.from(match[1], "binary");
      const decompressed = zlib.inflateSync(streamBytes);
      const str = decompressed.toString("utf-8");

      const tjMatches = str.match(/\(([^)]+)\)\s*Tj/g) || [];
      for (const tj of tjMatches) {
        const clean = tj.replace(/^\(|\)\s*Tj$/g, "").trim();
        if (clean.length > 1) textChunks.push(clean);
      }

      const tjBlockMatches = str.match(/\[([^\]]+)\]\s*TJ/g) || [];
      for (const tjb of tjBlockMatches) {
        const inner = tjb.replace(/^\[|\]\s*TJ$/g, "");
        const strings = inner.match(/\(([^)]+)\)/g) || [];
        const combined = strings.map((s) => s.slice(1, -1)).join("");
        if (combined.trim().length > 1) textChunks.push(combined.trim());
      }
    } catch {
      // not a flate compressed stream
    }
  }

  return textChunks.join(" ");
}

async function extractDocumentText(
  fileBytes: Buffer,
  filename: string,
  mimeType: string
): Promise<{ text: string; pageCount: number; links: string[] }> {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  let text = "";
  let pageCount = 1;
  const links: string[] = [];

  if (ext === "pdf" || mimeType.includes("pdf")) {
    try {
      const res = await extractText(new Uint8Array(fileBytes), { mergePages: true });
      if (res && typeof res.text === "string" && res.text.trim().length > 30) {
        text = res.text.trim();
        pageCount = res.totalPages || 1;
      }
    } catch (err) {
      console.warn("[unpdf notice]:", err);
    }

    if (!text || text.length < 50) {
      try {
        const streamText = extractTextFromPdfStreams(fileBytes);
        if (streamText.length > text.length) {
          text = streamText;
        }
      } catch (err) {
        console.warn("[zlib stream notice]:", err);
      }
    }
  } else if (ext === "docx" || mimeType.includes("word") || mimeType.includes("officedocument")) {
    try {
      const res = await mammoth.extractRawText({ buffer: fileBytes });
      text = res.value.trim();
      pageCount = Math.max(1, Math.ceil(text.split("\n\n").length / 15));
    } catch (err) {
      console.warn("[mammoth notice]:", err);
    }
  } else {
    try {
      text = fileBytes.toString("utf-8").trim();
    } catch {
      text = fileBytes.toString("latin1").trim();
    }
  }

  const linkMatches = text.match(/https?:\/\/[^\s]+|(?:github\.com|linkedin\.com\/in)\/[^\s]+/gi) || [];
  for (const l of linkMatches) {
    const clean = l.replace(/[),;.]+$/, "").trim();
    if (!links.includes(clean)) links.push(clean);
  }

  return { text, pageCount, links: links.slice(0, 8) };
}

// ─── Deterministic Dynamic Scoring & Critical Gaps Engine ────────────────────

function scoreResumeAccurately(
  parsedDoc: ParsedResumeDocument,
  targetRole: string,
  jobDescription: string,
  pageCount = 1
): ResumeAnalysis {
  const textLower = parsedDoc.rawText.toLowerCase();
  const jdLower = (jobDescription || "").toLowerCase();
  const roleLower = (targetRole || "Software Engineer").toLowerCase();

  let roleKey = "general";
  if (roleLower.includes("front")) roleKey = "frontend";
  else if (roleLower.includes("back")) roleKey = "backend";
  else if (roleLower.includes("full")) roleKey = "fullstack";
  else if (roleLower.includes("data") || roleLower.includes("ai") || roleLower.includes("ml")) roleKey = "data";
  else if (roleLower.includes("devops") || roleLower.includes("cloud")) roleKey = "devops";

  const standardRoleKeywords = ROLE_KEYWORD_MAP[roleKey] || ROLE_KEYWORD_MAP.general;

  const customJdKeywords: string[] = [];
  if (jdLower.length > 50) {
    for (const [syn, norm] of Object.entries(SYNONYM_MAP)) {
      if (jdLower.includes(syn) && !customJdKeywords.includes(norm)) {
        customJdKeywords.push(norm);
      }
    }
    for (const kw of ROLE_KEYWORD_MAP.general) {
      if (jdLower.includes(kw.toLowerCase()) && !customJdKeywords.includes(kw)) {
        customJdKeywords.push(kw);
      }
    }
  }

  const effectiveKeywords = Array.from(new Set([...customJdKeywords, ...standardRoleKeywords])).slice(0, 24);

  const keywordsList: { word: string; present: boolean; importance: "high" | "medium" }[] = [];
  const foundSkills: string[] = [];

  for (const kw of effectiveKeywords) {
    const kwLower = kw.toLowerCase();
    let isPresent = textLower.includes(kwLower);

    if (!isPresent) {
      for (const [syn, norm] of Object.entries(SYNONYM_MAP)) {
        if (norm.toLowerCase() === kwLower && textLower.includes(syn)) {
          isPresent = true;
          break;
        }
      }
    }

    if (isPresent) {
      foundSkills.push(kw);
    }

    const isHigh = customJdKeywords.includes(kw) || standardRoleKeywords.slice(0, 8).includes(kw);
    keywordsList.push({
      word: kw,
      present: isPresent,
      importance: isHigh ? "high" : "medium",
    });
  }

  const bulletTargets = getResumeBulletTargets(parsedDoc);
  const allBullets = bulletTargets.map((target) => target.text);

  const metricRegex = /\b\d+(\.\d+)?\s*(%|x|ms|s|seconds|minutes|hours|days|users|clients|requests|queries|k|M|LPA|₹|\$|commits|models|datasets|accuracy|latency|fps)\b/i;
  const quantifiedBullets = allBullets.filter((b) => metricRegex.test(b));
  const unquantifiedBullets = allBullets.filter((b) => !metricRegex.test(b));

  const totalBulletCount = Math.max(allBullets.length, 1);
  const metricRatio = quantifiedBullets.length / totalBulletCount;
  const impactScore = Math.min(100, Math.max(25, Math.round(35 + metricRatio * 110)));

  let strongVerbBullets = 0;
  let weakVerbBullets = 0;

  for (const b of allBullets) {
    const bLower = b.toLowerCase();
    const hasStrong = STRONG_ACTION_VERBS.some((v) => bLower.includes(v));
    const hasWeak = WEAK_ACTION_VERBS.some((v) => bLower.includes(v));
    if (hasStrong) strongVerbBullets++;
    if (hasWeak) weakVerbBullets++;
  }

  const verbRatio = (strongVerbBullets - weakVerbBullets * 0.5) / totalBulletCount;
  const verbScore = Math.min(100, Math.max(30, Math.round(50 + verbRatio * 60)));

  let atsScore = 40;
  if (parsedDoc.email && parsedDoc.phone) atsScore += 18;
  if (parsedDoc.links.length > 0) atsScore += 10;
  if (parsedDoc.experience.length > 0) atsScore += 12;
  if (parsedDoc.projects.length > 0) atsScore += 10;
  if (parsedDoc.education.length > 0) atsScore += 10;

  const wordCount = parsedDoc.rawText.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 350 && wordCount <= 850) atsScore += 10;
  else if (wordCount < 200) atsScore -= 15;

  atsScore = Math.min(100, Math.max(30, atsScore));

  const matchedKeywordCount = keywordsList.filter((k) => k.present).length;
  const matchRatio = matchedKeywordCount / Math.max(keywordsList.length, 1);
  const keywordScore = matchRatio * 65;
  const sectionsScore = (parsedDoc.experience.length > 0 ? 10 : 0) + (parsedDoc.projects.length > 0 ? 10 : 0);
  const depthScore = Math.min(15, allBullets.length * 2);

  const matchScore = Math.min(100, Math.max(25, Math.round(keywordScore + sectionsScore + depthScore)));

  const strengths: string[] = [];
  if (foundSkills.length >= 4) {
    strengths.push(`Core tech coverage: Verified proficiency in ${foundSkills.slice(0, 4).join(", ")}`);
  }
  if (quantifiedBullets.length > 0) {
    strengths.push(`Demonstrates quantified business impact across ${quantifiedBullets.length} project/experience accomplishments`);
  }
  if (parsedDoc.links.length > 0) {
    strengths.push(`Provides technical verification links: ${parsedDoc.links.slice(0, 2).join(", ")}`);
  }
  if (parsedDoc.experience.length > 0 && parsedDoc.projects.length > 0) {
    strengths.push("Well-structured balance between hands-on engineering projects and practical work experience");
  }

  const gaps: string[] = [];
  const missingHighPriority = keywordsList.filter((k) => !k.present && k.importance === "high").map((k) => k.word);

  if (missingHighPriority.length > 0) {
    gaps.push(
      `Missing core ${targetRole} keywords: ${missingHighPriority.slice(0, 4).join(", ")} — adding these in Projects/Skills will lift JD Match from ${matchScore}% to ~${Math.min(96, matchScore + 22)}%.`
    );
  }

  if (unquantifiedBullets.length > 0) {
    const sampleUnquantified = unquantifiedBullets[0].slice(0, 75);
    gaps.push(
      `${unquantifiedBullets.length} bullet point(s) lack measurable metrics (e.g., "${sampleUnquantified}...") — quantify outcomes using the XYZ formula (latency, %, scale).`
    );
  }

  if (verbScore < 75) {
    gaps.push(
      `Action verb density is ${verbScore}% — replace passive phrasing with assertive technical verbs ("Architected", "Engineered", "Optimized", "Benchmarked").`
    );
  }

  if (parsedDoc.links.length === 0) {
    gaps.push("No clickable GitHub or LinkedIn profile link detected — technical recruiters screen for verified public repositories.");
  }

  if (wordCount < 350) {
    gaps.push("Total resume length is concise (< 350 words) — expand on implementation details, architectural trade-offs, and technical depth.");
  }

  if (gaps.length === 0) {
    gaps.push("Increase keyword alignment with specific production technologies mentioned in target job listings.");
  }

  const suggestions: TailorSuggestion[] = bulletTargets.flatMap((target, index) => {
    const improved = conservativeRewrite(target.text);
    if (!improved || improved === target.text) return [];
    const impactLevel: "high" | "medium" = /\d/.test(target.text) ? "medium" : "high";
    return [{
      id: `sug-${index + 1}-${target.targetBulletId}`,
      section: target.targetSection,
      targetSection: target.targetSection,
      targetEntryId: target.targetEntryId,
      targetBulletId: target.targetBulletId,
      sectionLabel: target.sectionLabel,
      original: target.text,
      suggested: improved,
      improved,
      impact: impactLevel,
      impactLevel,
      reason: "Strengthens the opening while keeping the original claim and metrics intact.",
    }];
  }).slice(0, 8);

  return {
    matchScore,
    atsScore,
    jobTitle: targetRole || "Software Engineer",
    company: "Target Placement Role",
    strengths,
    gaps,
    suggestions,
    keywords: keywordsList,
    sectionScores: {
      impact: impactScore,
      brevity: Math.min(100, Math.max(50, wordCount > 350 && wordCount < 850 ? 95 : 70)),
      style: verbScore,
      skills: Math.min(100, Math.round((foundSkills.length / 8) * 100)),
    },
    extractedSkills: Array.from(new Set([...foundSkills, ...parsedDoc.skills])).slice(0, 20),
    meta: {
      pageCount,
      wordCount,
      bulletCount: allBullets.length,
      hasQuantifiedMetrics: quantifiedBullets.length > 0,
      fileName: parsedDoc.fileName,
      contact: {
        email: parsedDoc.email,
        phone: parsedDoc.phone,
        links: parsedDoc.links,
      },
    },
    rawText: parsedDoc.rawText,
    parsedResume: parsedDoc,
  };
}

// ─── Tier 1: Google Gemini AI Engine ─────────────────────────────────────────

const GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.8-flash",
];

async function analyzeWithGemini(
  parsedDoc: ParsedResumeDocument,
  targetRole: string,
  jobDescription: string,
  pageCount: number
): Promise<ResumeAnalysis | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const prompt = buildCompactPrompt(parsedDoc, targetRole, jobDescription);

  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.15,
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(9000),
        }
      );

      if (!res.ok) {
        // If 404 (model deprecated/unavailable) or 503 (temporary high demand), try next Gemini candidate
        if (res.status === 404 || res.status === 503) {
          continue;
        }
        // If 429 (rate-limited) or 400+, fail over to Groq immediately
        return null;
      }

      const data: unknown = await res.json();
      if (!isRecord(data)) continue;
      const candidates = data.candidates;
      if (!Array.isArray(candidates) || !isRecord(candidates[0])) continue;
      const content = candidates[0].content;
      if (!isRecord(content) || !Array.isArray(content.parts) || !isRecord(content.parts[0])) continue;
      const responseText = readString(content.parts[0].text);
      if (!responseText) continue;

      const parsedJson = extractJsonPayload(responseText);
      if (!parsedJson) continue;

      const analysis = buildAiAnalysis(parsedJson, parsedDoc, targetRole, jobDescription, pageCount);
      if (analysis) return analysis;
    } catch (err: unknown) {
      console.warn(`[Gemini ${model} fallback notice]:`, err instanceof Error ? err.message : err);
    }
  }

  return null;
}

// ─── Tier 2: Groq High-Speed AI Failover ─────────────────────────────────────

const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "llama-3.3-70b-versatile",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
];

async function analyzeWithGroq(
  parsedDoc: ParsedResumeDocument,
  targetRole: string,
  jobDescription: string,
  pageCount: number
): Promise<ResumeAnalysis | null> {
  const apiKey = getGroqApiKey();
  if (!apiKey) return null;

  const prompt = buildCompactPrompt(parsedDoc, targetRole, jobDescription);

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.15,
          max_tokens: 3500,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        // If 404 (model not found on current tier), try next Groq candidate model
        if (res.status === 404) {
          continue;
        }
        if (res.status === 429) {
          return null;
        }
        continue;
      }

      const data: unknown = await res.json();
      if (!isRecord(data) || !Array.isArray(data.choices) || !isRecord(data.choices[0])) continue;
      const message = data.choices[0].message;
      if (!isRecord(message)) continue;
      const content = readString(message.content);
      if (!content) continue;

      const parsedJson = extractJsonPayload(content);
      if (!parsedJson) continue;

      const analysis = buildAiAnalysis(parsedJson, parsedDoc, targetRole, jobDescription, pageCount);
      if (analysis) return analysis;
    } catch (err: unknown) {
      console.warn(`[Groq ${model} fallback notice]:`, err instanceof Error ? err.message : err);
    }
  }

  return null;
}

// ─── POST Route Handler ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_MULTIPART_BYTES) {
      return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 413 });
    }
    const boundedBody = await readBoundedBody(request, MAX_MULTIPART_BYTES);
    if (!boundedBody) {
      return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 413 });
    }
    const contentType = request.headers.get("content-type") || "";
    if (!/^multipart\/form-data\s*;\s*boundary=/i.test(contentType)) {
      return NextResponse.json({ error: "The upload request is missing its multipart boundary. Please retry the upload." }, { status: 400 });
    }
    const bodyBuffer = new ArrayBuffer(boundedBody.byteLength);
    new Uint8Array(bodyBuffer).set(boundedBody);
    const formDataRequest = new Request(request.url, {
      method: "POST",
      headers: { "content-type": contentType },
      body: bodyBuffer,
    });
    const formData = await formDataRequest.formData();
    const file = formData.get("file");
    const targetRole = readString(formData.get("targetRole"), "Software Engineer");
    const jobDescription = readString(formData.get("jobDescription"));
    const rawTextOverride = readString(formData.get("rawText"));

    let rawText = "";
    let pageCount = 1;
    let extractedLinks: string[] = [];
    let fileName = "uploaded_resume.pdf";
    let pythonParserActive = false;

    if (rawTextOverride && rawTextOverride.length > 20) {
      // Direct text re-evaluation
      rawText = rawTextOverride;
      fileName = readString(formData.get("fileName"), "Current_Resume.pdf");
    } else if (file && file instanceof Blob) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 413 });
      }
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Please upload a valid .pdf, .docx, or .txt resume file." }, { status: 400 });
      }
      fileName = file.name || "uploaded_resume.pdf";
      const extension = fileName.split(".").pop()?.toLowerCase();
      if (!extension || !["pdf", "docx", "txt"].includes(extension)) {
        return NextResponse.json({ error: "Please upload a valid .pdf, .docx, or .txt resume file." }, { status: 400 });
      }
      const fileBytes = Buffer.from(await file.arrayBuffer());

      // 1. Quick probe to local Python FastAPI if active (1500ms timeout)
      const pythonUrl = process.env.PYTHON_PARSER_URL || "http://127.0.0.1:8000";
      try {
        const pythonForm = new FormData();
        const fileBlob = new Blob([fileBytes], { type: file.type || "application/octet-stream" });
        pythonForm.append("file", fileBlob, fileName);

        const pyRes = await fetch(`${pythonUrl}/api/parse-resume`, {
          method: "POST",
          body: pythonForm,
          signal: AbortSignal.timeout(1500),
        });

        if (pyRes.ok) {
          const pyData: unknown = await pyRes.json();
          if (isRecord(pyData) && typeof pyData.rawText === "string" && pyData.rawText.trim().length > 30) {
            rawText = pyData.rawText.trim();
            const contact = isRecord(pyData.contact) ? pyData.contact : {};
            const meta = isRecord(pyData.meta) ? pyData.meta : {};
            extractedLinks = readStringArray(contact.links, 20);
            pageCount = typeof meta.pageCount === "number" && meta.pageCount > 0 ? Math.floor(meta.pageCount) : 1;
            pythonParserActive = true;
          }
        }
      } catch {
        pythonParserActive = false;
      }

      // 2. Seamless Native Next.js/Node.js Extraction (unpdf + mammoth + zlib)
      if (!rawText || rawText.length < 30) {
        const extracted = await extractDocumentText(fileBytes, fileName, file.type || "");
        rawText = extracted.text;
        pageCount = extracted.pageCount;
        extractedLinks = extracted.links;
      }
    } else {
      return NextResponse.json(
        { error: "Please upload a valid .pdf, .docx, or .txt resume file." },
        { status: 400 }
      );
    }

    if (!rawText || rawText.trim().length < 15) {
      return NextResponse.json(
        { error: "Could not extract text from document. Please ensure it contains selectable text (not a scanned image)." },
        { status: 422 }
      );
    }

    // 3. Lossless Local Structural Extraction First (<50ms)
    const parsedDoc = parseStructuredResume(rawText, fileName, extractedLinks);

    // 4. Compact Hybrid Evaluation: Gemini Primary -> Groq Failover -> Local Baseline
    let analysis: ResumeAnalysis | null = null;
    let engineSource: "gemini" | "groq" | "heuristic" = "heuristic";

    analysis = await analyzeWithGemini(parsedDoc, targetRole, jobDescription, pageCount);
    if (analysis) {
      engineSource = "gemini";
    }

    if (!analysis) {
      analysis = await analyzeWithGroq(parsedDoc, targetRole, jobDescription, pageCount);
      if (analysis) {
        engineSource = "groq";
      }
    }

    if (!analysis) {
      analysis = scoreResumeAccurately(parsedDoc, targetRole, jobDescription, pageCount);
      engineSource = "heuristic";
    }

    let engineDiagnostic = "⚡ Heuristic Engine Active (Fallback)";
    if (engineSource === "gemini") {
      engineDiagnostic = "✨ Google Gemini AI Active (Primary Engine)";
    } else if (engineSource === "groq") {
      engineDiagnostic = "⚡ Groq Ultra-Fast AI Active (Failover Engine)";
    }

    return NextResponse.json({
      analysis,
      source: engineSource,
      pythonParserActive,
      diagnosticTip: pythonParserActive
        ? `PyMuPDF Document Extractor • ${engineDiagnostic}`
        : `⚡ Native Next.js Parser • ${engineDiagnostic}`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal resume analysis failed." },
      { status: 500 }
    );
  }
}
