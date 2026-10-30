import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import mammoth from "mammoth";
import zlib from "zlib";
import type { ResumeAnalysis, TailorSuggestion, ParsedResumeDocument } from "@/types";
import { getResumeBulletTargets, parseStructuredResume } from "@/lib/resume/parser";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_FILE_BYTES + 256 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readScore(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : fallback;
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
    .replace(/^\s*[-•▪]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSuggestions(value: unknown, parsedDoc: ParsedResumeDocument): TailorSuggestion[] {
  if (!Array.isArray(value)) return [];
  const targets = getResumeBulletTargets(parsedDoc);
  const targetById = new Map(targets.map((target) => [target.targetBulletId, target]));
  const normalized: TailorSuggestion[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) continue;
    const requestedId = readString(item.targetBulletId);
    const requestedOriginal = readString(item.original).trim();
    const target = targetById.get(requestedId) || targets.find((candidate) => candidate.text.trim() === requestedOriginal);
    if (!target || !requestedOriginal || requestedOriginal !== target.text.trim()) continue;
    const improved = cleanPlainText(readString(item.improved, readString(item.suggested)));
    if (!improved || improved === target.text.trim()) continue;
    const impactLevel = item.impactLevel === "high" ? "high" : "medium";
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
      reason: readString(item.reason, "Keeps your original facts while making the contribution easier to scan."),
    });
    if (normalized.length >= 8) break;
  }
  return normalized;
}

function buildAiAnalysis(
  value: unknown,
  parsedDoc: ParsedResumeDocument,
  targetRole: string,
  pageCount: number
): ResumeAnalysis | null {
  if (!isRecord(value) || typeof value.matchScore !== "number" || !Array.isArray(value.gaps)) return null;
  const baseline = scoreResumeAccurately(parsedDoc, targetRole, "", pageCount);
  const keywords = Array.isArray(value.keywords)
    ? value.keywords.filter(isRecord).map((item) => ({
        word: readString(item.word),
        present: item.present === true,
        importance: item.importance === "high" ? "high" as const : "medium" as const,
      })).filter((item) => item.word.length > 0).slice(0, 40)
    : baseline.keywords;

  return {
    ...baseline,
    matchScore: readScore(value.matchScore, baseline.matchScore),
    atsScore: readScore(value.atsScore, baseline.atsScore),
    jobTitle: targetRole || "Software Engineer",
    company: "Target Placement Role",
    strengths: readStringArray(value.strengths, 6),
    gaps: readStringArray(value.gaps, 8),
    suggestions: (() => {
      const suggestions = normalizeSuggestions(value.suggestions, parsedDoc);
      return suggestions.length > 0 ? suggestions : baseline.suggestions;
    })(),
    keywords,
    sectionScores: {
      impact: readScore(isRecord(value.sectionScores) ? value.sectionScores.impact : undefined, baseline.sectionScores?.impact ?? 50),
      brevity: readScore(isRecord(value.sectionScores) ? value.sectionScores.brevity : undefined, baseline.sectionScores?.brevity ?? 50),
      style: readScore(isRecord(value.sectionScores) ? value.sectionScores.style : undefined, baseline.sectionScores?.style ?? 50),
      skills: readScore(isRecord(value.sectionScores) ? value.sectionScores.skills : undefined, baseline.sectionScores?.skills ?? 50),
    },
    extractedSkills: readStringArray(value.extractedSkills, 60).length > 0
      ? readStringArray(value.extractedSkills, 60)
      : parsedDoc.skills,
    meta: { ...baseline.meta, pageCount },
    rawText: parsedDoc.rawText,
    parsedResume: parsedDoc,
  };
}

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

      // Extract text inside PDF text operator parentheses: (text) Tj
      const tjMatches = str.match(/\(([^)]+)\)\s*Tj/g) || [];
      for (const tj of tjMatches) {
        const clean = tj.replace(/^\(|\)\s*Tj$/g, "").trim();
        if (clean.length > 1) textChunks.push(clean);
      }

      // Extract array-based PDF text operators: [(some) 10 (text)] TJ
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
    // 1. Primary: Serverless native unpdf extractor
    try {
      const res = await extractText(new Uint8Array(fileBytes), { mergePages: true });
      if (res && typeof res.text === "string" && res.text.trim().length > 30) {
        text = res.text.trim();
        pageCount = res.totalPages || 1;
      }
    } catch (err) {
      console.warn("[unpdf notice]:", err);
    }

    // 2. Secondary fallback: Stream decompression for FlateDecode streams
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
    // Plain text
    try {
      text = fileBytes.toString("utf-8").trim();
    } catch {
      text = fileBytes.toString("latin1").trim();
    }
  }

  // Extract URLs
  const linkMatches = text.match(/https?:\/\/[^\s]+|(?:github\.com|linkedin\.com\/in)\/[^\s]+/gi) || [];
  for (const l of linkMatches) {
    const clean = l.replace(/[),;.]+$/, "").trim();
    if (!links.includes(clean)) links.push(clean);
  }

  return { text, pageCount, links: links.slice(0, 8) };
}

// ─── Structural Resume Parser (ParsedResumeDocument) ────────────────────────

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

  // 1. Determine Target Keyword Set
  let roleKey = "general";
  if (roleLower.includes("front")) roleKey = "frontend";
  else if (roleLower.includes("back")) roleKey = "backend";
  else if (roleLower.includes("full")) roleKey = "fullstack";
  else if (roleLower.includes("data") || roleLower.includes("ai") || roleLower.includes("ml")) roleKey = "data";
  else if (roleLower.includes("devops") || roleLower.includes("cloud")) roleKey = "devops";

  const standardRoleKeywords = ROLE_KEYWORD_MAP[roleKey] || ROLE_KEYWORD_MAP.general;

  // Extract custom keywords from user pasted JD if provided
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

  // Check presence with synonyms
  const keywordsList: { word: string; present: boolean; importance: "high" | "medium" }[] = [];
  const foundSkills: string[] = [];

  for (const kw of effectiveKeywords) {
    const kwLower = kw.toLowerCase();
    let isPresent = textLower.includes(kwLower);

    // Check synonym matches
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

  // 2. Real Metric Density (Quantified Impact)
  const bulletTargets = getResumeBulletTargets(parsedDoc);
  const allBullets = bulletTargets.map((target) => target.text);

  const metricRegex = /\b\d+(\.\d+)?\s*(%|x|ms|s|seconds|minutes|hours|days|users|clients|requests|queries|k|M|LPA|₹|\$|commits|models|datasets|accuracy|latency|fps)\b/i;
  const quantifiedBullets = allBullets.filter((b) => metricRegex.test(b));
  const unquantifiedBullets = allBullets.filter((b) => !metricRegex.test(b));

  const totalBulletCount = Math.max(allBullets.length, 1);
  const metricRatio = quantifiedBullets.length / totalBulletCount;

  // Real scaled impact score: 0 metrics -> ~35%, 50% metrics -> ~90%
  const impactScore = Math.min(100, Math.max(25, Math.round(35 + metricRatio * 110)));

  // 3. Real Action Verb Strength
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

  // 4. ATS Parsability Score
  let atsScore = 40; // baseline
  if (parsedDoc.email && parsedDoc.phone) atsScore += 18;
  if (parsedDoc.links.length > 0) atsScore += 10;
  if (parsedDoc.experience.length > 0) atsScore += 12;
  if (parsedDoc.projects.length > 0) atsScore += 10;
  if (parsedDoc.education.length > 0) atsScore += 10;

  const wordCount = parsedDoc.rawText.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 350 && wordCount <= 850) atsScore += 10;
  else if (wordCount < 200) atsScore -= 15;

  atsScore = Math.min(100, Math.max(30, atsScore));

  // 5. JD Match Score
  const matchedKeywordCount = keywordsList.filter((k) => k.present).length;
  const matchRatio = matchedKeywordCount / Math.max(keywordsList.length, 1);
  const keywordScore = matchRatio * 65;
  const sectionsScore = (parsedDoc.experience.length > 0 ? 10 : 0) + (parsedDoc.projects.length > 0 ? 10 : 0);
  const depthScore = Math.min(15, allBullets.length * 2);

  const matchScore = Math.min(100, Math.max(25, Math.round(keywordScore + sectionsScore + depthScore)));

  // 6. Verified Strengths
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

  // 7. Dynamic Critical Gaps (Never Empty!)
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

  // Fallback safety: ensure gaps array is never empty
  if (gaps.length === 0) {
    gaps.push("Increase keyword alignment with specific production technologies mentioned in target job listings.");
  }

  // Only propose deterministic rewrites that preserve the candidate's facts.
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

// ─── Gemini 2.0 Flash AI Enhancement ────────────────────────────────────────

async function analyzeWithGemini(
  parsedDoc: ParsedResumeDocument,
  targetRole: string,
  jobDescription: string,
  pageCount: number
): Promise<ResumeAnalysis | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || apiKey.includes("your_gemini")) return null;

  try {
  const bulletTargets = getResumeBulletTargets(parsedDoc);
  const structure = { ...parsedDoc, rawText: undefined };
  const prompt = `Analyze this resume for ${targetRole || "Software Engineer"}. Use only facts in the resume; never invent metrics or credentials. Suggestions must quote exact bullet text and target its supplied targetBulletId. Return JSON matching the response schema.
Target job description: ${jobDescription || "Not provided"}
Full resume text:\n${parsedDoc.rawText}
Parsed resume structure:\n${JSON.stringify(structure)}
Valid bullet targets:\n${JSON.stringify(bulletTargets)}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 3000,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                matchScore: { type: "NUMBER" }, atsScore: { type: "NUMBER" },
                sectionScores: { type: "OBJECT", properties: { impact: { type: "NUMBER" }, brevity: { type: "NUMBER" }, style: { type: "NUMBER" }, skills: { type: "NUMBER" } } },
                strengths: { type: "ARRAY", items: { type: "STRING" } }, gaps: { type: "ARRAY", items: { type: "STRING" } },
                suggestions: { type: "ARRAY", items: { type: "OBJECT", properties: { targetBulletId: { type: "STRING" }, original: { type: "STRING" }, improved: { type: "STRING" }, reason: { type: "STRING" }, impactLevel: { type: "STRING", enum: ["high", "medium"] } }, required: ["targetBulletId", "original", "improved", "reason", "impactLevel"] } },
                keywords: { type: "ARRAY", items: { type: "OBJECT", properties: { word: { type: "STRING" }, present: { type: "BOOLEAN" }, importance: { type: "STRING", enum: ["high", "medium"] } }, required: ["word", "present", "importance"] } },
                extractedSkills: { type: "ARRAY", items: { type: "STRING" } },
              }, required: ["matchScore", "atsScore", "sectionScores", "strengths", "gaps", "suggestions", "keywords", "extractedSkills"],
            },
          },
        }),
        signal: AbortSignal.timeout(9000),
      }
    );

    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (!isRecord(data)) return null;
    const candidates = data.candidates;
    if (!Array.isArray(candidates) || !isRecord(candidates[0])) return null;
    const content = candidates[0].content;
    if (!isRecord(content) || !Array.isArray(content.parts) || !isRecord(content.parts[0])) return null;
    const responseText = readString(content.parts[0].text);
    if (!responseText) return null;
    return buildAiAnalysis(JSON.parse(responseText) as unknown, parsedDoc, targetRole, pageCount);
  } catch {
    return null;
  }
}

// ─── Groq Llama 3.3 70B AI Fallback ──────────────────────────────────────────

async function analyzeWithGroq(
  parsedDoc: ParsedResumeDocument,
  targetRole: string,
  jobDescription: string,
  pageCount: number
): Promise<ResumeAnalysis | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("your_groq")) return null;

  try {
  const bulletTargets = getResumeBulletTargets(parsedDoc);
  const prompt = `You are a Principal Staff Engineer ATS Evaluator. Use only resume facts and do not invent metrics. Analyze the full resume:
Role: ${targetRole || "Software Engineer"}
JD: ${jobDescription || "Campus Placement Software Engineer"}
Full resume text:\n${parsedDoc.rawText}
Valid bullet targets:\n${JSON.stringify(bulletTargets)}
Return JSON with matchScore, atsScore, sectionScores, strengths, gaps, suggestions (targetBulletId, exact original, improved, reason, impactLevel), keywords, and extractedSkills.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.15,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!isRecord(data) || !Array.isArray(data.choices) || !isRecord(data.choices[0])) return null;
    const message = data.choices[0].message;
    if (!isRecord(message)) return null;
    const content = readString(message.content);
    if (!content) return null;
    return buildAiAnalysis(JSON.parse(content) as unknown, parsedDoc, targetRole, pageCount);
  } catch {
    return null;
  }
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

    // 3. Parse into Structured Resume Document
    const parsedDoc = parseStructuredResume(rawText, fileName, extractedLinks);

    // 4. Run Analysis: Gemini -> Groq -> Heuristic Fallback
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

    return NextResponse.json({
      analysis,
      source: engineSource,
      pythonParserActive,
      diagnosticTip: pythonParserActive
        ? "PyMuPDF high-fidelity document extractor active."
        : "⚡ High-Precision Native Next.js Parser Active (Zero external server required)",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal resume analysis failed." },
      { status: 500 }
    );
  }
}
