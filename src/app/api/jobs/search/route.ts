import { NextRequest, NextResponse } from "next/server";
import {
  normalizeOpenWebNinja,
  normalizeHimalayas,
  normalizeAdzuna,
  normalizeRemoteOK,
} from "@/lib/jobs/normalize";
import type { NormalizedJobListing } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProviderResult = {
  jobs: NormalizedJobListing[];
  status: "ok" | "disabled" | "error";
  message?: string;
};

const responseCache = new Map<string, { expiresAt: number; payload: unknown }>();
const inFlight = new Map<string, Promise<unknown>>();

function sanitizeKey(key: string | undefined): string {
  if (!key) return "";
  return key.trim().replace(/^["']|["']$/g, "").trim();
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function providerStatus(
  status: "ok" | "disabled" | "error",
  jobs: NormalizedJobListing[],
  message?: string
): ProviderResult {
  return { jobs, status, ...(message ? { message } : {}) };
}

function indiaLocation(location: string): boolean {
  return /\b(india|bengaluru|bangalore|mumbai|delhi|hyderabad|chennai|pune|kolkata|gurugram|gurgaon|noida|ahmedabad|jaipur|kochi)\b/i.test(
    location
  );
}

function countryCode(location: string): string | null {
  if (!location || indiaLocation(location)) return "in";
  const value = location.toLowerCase();
  if (/\b(remote|worldwide|global|anywhere)\b/.test(value)) return null;
  if (/\b(united states|usa|\bus\b|new york|california|texas)\b/.test(value)) return "us";
  if (/\b(united kingdom|\buk\b|england|london)\b/.test(value)) return "gb";
  if (/\b(canada|toronto|vancouver)\b/.test(value)) return "ca";
  if (/\b(australia|sydney|melbourne)\b/.test(value)) return "au";
  if (/\b(germany|berlin|france|paris)\b/.test(value))
    return value.includes("france") || value.includes("paris") ? "fr" : "de";
  return null;
}

async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload as T;
  }
  const pending = inFlight.get(key);
  if (pending) {
    return (await pending) as T;
  }

  const promise = (async () => {
    const result = await fetcher();
    responseCache.set(key, { expiresAt: Date.now() + ttlMs, payload: result });
    return result;
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

/**
 * OpenWeb Ninja JSearch Adapter (Primary Indian & Global Job Search)
 * Dual-Gateway Fallback:
 * 1. Direct OpenWeb Ninja API (api.openwebninja.com) with "x-api-key"
 * 2. RapidAPI JSearch Gateway (jsearch.p.rapidapi.com) with "X-RapidAPI-Key"
 * Quota Protection: 6-hour cache + 12s timeout
 */
async function fetchOpenWebNinja(input: {
  query: string;
  location: string;
  arrangement: string;
  postedWithin: string;
  employment: string;
  cursor?: string;
  page?: number;
}): Promise<ProviderResult & { nextCursor: string | null }> {
  const apiKey = sanitizeKey(
    process.env.OPENWEBNINJA_API_KEY ||
    process.env.JWEBNINJA_API_KEY ||
    process.env.JSEARCH_API_KEY
  );
  if (!apiKey || apiKey.startsWith("your_") || apiKey.startsWith("demo_")) {
    return {
      ...providerStatus("disabled", [], "JWebNinja / OpenWeb Ninja API key is not configured."),
      nextCursor: null,
    };
  }

  // Combine query and location naturally for JSearch semantic parsing
  const combinedQuery = [
    input.query || "software engineer",
    input.location ? `in ${input.location}` : "in India",
  ]
    .filter(Boolean)
    .join(" ");

  const params = new URLSearchParams({
    query: combinedQuery,
    page: String(input.page || 1),
    num_pages: "1",
  });

  const country = countryCode(input.location);
  if (country) params.set("country", country);

  // Recency mapping (strict JSearch enum: all | today | 3days | week | month)
  if (input.postedWithin && input.postedWithin !== "any") {
    const recencyMap: Record<string, string> = {
      today: "today",
      "3days": "3days",
      week: "week",
      month: "month",
    };
    if (recencyMap[input.postedWithin]) {
      params.set("date_posted", recencyMap[input.postedWithin]);
    }
  }

  // Remote / Work from home (Only pass "true" when remote; never pass "false")
  if (input.arrangement === "remote") {
    params.set("work_from_home", "true");
  }

  // Employment type mapping (FULLTIME | INTERN | PARTTIME | CONTRACTOR)
  if (input.employment) {
    const typeLower = input.employment.toLowerCase();
    const typeMap: Record<string, string> = {
      internship: "INTERN",
      "full-time": "FULLTIME",
      "part-time": "PARTTIME",
      contract: "CONTRACTOR",
    };
    if (typeMap[typeLower]) {
      params.set("employment_types", typeMap[typeLower]);
    }
  }

  if (input.cursor) {
    params.set("cursor", input.cursor);
  }

  const cacheKey = `openwebninja:${params.toString()}`;

  try {
    const payload = await cachedFetch<Record<string, unknown>>(
      cacheKey,
      6 * 60 * 60 * 1000, // 6 hours
      async () => {
        let lastErrorMsg = "";

        // Gateway 1: Primary Direct OpenWeb Ninja API
        try {
          const directUrl = `https://api.openwebninja.com/jsearch/search?${params}`;
          const directRes = await fetch(directUrl, {
            headers: {
              "x-api-key": apiKey,
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(12000),
          });

          if (directRes.ok) {
            return (await directRes.json()) as Record<string, unknown>;
          }
          lastErrorMsg = `Direct OpenWeb Ninja HTTP ${directRes.status}`;
        } catch (directErr) {
          lastErrorMsg = directErr instanceof Error ? directErr.message : "Direct gateway network error";
        }

        // Gateway 2: Fallback to RapidAPI JSearch Gateway
        try {
          const rapidUrl = `https://jsearch.p.rapidapi.com/search?${params}`;
          const rapidRes = await fetch(rapidUrl, {
            headers: {
              "X-RapidAPI-Key": apiKey,
              "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(12000),
          });

          if (rapidRes.ok) {
            return (await rapidRes.json()) as Record<string, unknown>;
          }
          lastErrorMsg = `RapidAPI HTTP ${rapidRes.status} (Primary attempt failed: ${lastErrorMsg})`;
        } catch (rapidErr) {
          lastErrorMsg = `RapidAPI failed: ${rapidErr instanceof Error ? rapidErr.message : String(rapidErr)} (Primary: ${lastErrorMsg})`;
        }

        throw new Error(lastErrorMsg);
      }
    );

    const rawJobs = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.jobs)
      ? payload.jobs
      : Array.isArray(payload.results)
      ? payload.results
      : Array.isArray(payload)
      ? payload
      : [];

    let jobs = rawJobs
      .map(normalizeOpenWebNinja)
      .filter((job): job is NormalizedJobListing => Boolean(job));

    // Strict work arrangement filtering if user requested specific mode
    if (input.arrangement === "remote") {
      jobs = jobs.filter((j) => j.workArrangement === "remote");
    } else if (input.arrangement === "hybrid") {
      jobs = jobs.filter((j) => j.workArrangement === "hybrid");
    } else if (input.arrangement === "onsite") {
      jobs = jobs.filter((j) => j.workArrangement === "onsite");
    }

    const nextCursor = text(
      payload.nextCursor ?? payload.next_cursor ?? payload.cursor
    );

    return {
      ...providerStatus("ok", jobs),
      nextCursor: nextCursor || null,
    };
  } catch (error) {
    console.error("[Jobs Search] JWebNinja error:", error);
    return {
      ...providerStatus(
        "error",
        [],
        error instanceof Error ? error.message : "OpenWeb Ninja request failed."
      ),
      nextCursor: null,
    };
  }
}

/**
 * Himalayas Remote Jobs Adapter (Supplementary Remote & Worldwide Search)
 * Quota Protection: 2-hour cache + 12s timeout
 */
async function fetchHimalayas(input: {
  query: string;
  location: string;
  arrangement: string;
  experience: string;
  employment: string;
  page: number;
}): Promise<ProviderResult & { nextPage: number | null }> {
  // If user strictly requested on-site or hybrid, Himalayas has zero relevant roles
  if (input.arrangement === "onsite" || input.arrangement === "hybrid") {
    return {
      ...providerStatus("disabled", [], "Himalayas provides remote-only listings."),
      nextPage: null,
    };
  }

  const params = new URLSearchParams({
    sort: "recent",
    page: String(input.page),
  });

  if (input.query) params.set("q", input.query.slice(0, 100));

  if (indiaLocation(input.location)) {
    params.set("country", "IN");
  } else if (!input.location || /remote|worldwide|global/i.test(input.location)) {
    params.set("worldwide", "true");
  }

  // Seniority mapping
  const seniorityMap: Record<string, string> = {
    entry: "Entry-level",
    fresher: "Entry-level",
    junior: "Entry-level",
    mid: "Mid-level",
    senior: "Senior",
  };
  if (seniorityMap[input.experience]) {
    params.set("seniority", seniorityMap[input.experience]);
  }

  // Employment type mapping
  const employmentMap: Record<string, string> = {
    internship: "Intern",
    "full-time": "Full Time",
    "part-time": "Part Time",
    contract: "Contractor",
  };
  const empLower = input.employment.toLowerCase();
  if (employmentMap[empLower]) {
    params.set("employment_type", employmentMap[empLower]);
  }

  const apiKey = sanitizeKey(
    process.env.HIMALAYAS_API_KEY ||
    process.env.HIMALAYA_API_KEY
  );
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey && !apiKey.startsWith("your_") && !apiKey.startsWith("demo_")) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const cacheKey = `himalayas:${params.toString()}`;

  try {
    const payload = await cachedFetch<Record<string, unknown>>(
      cacheKey,
      2 * 60 * 60 * 1000, // 2 hours
      async () => {
        const url = `https://himalayas.app/jobs/api/search?${params}`;
        const response = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) {
          throw new Error(`Himalayas returned HTTP ${response.status}`);
        }
        return (await response.json()) as Record<string, unknown>;
      }
    );

    const rawJobs = Array.isArray(payload.jobs)
      ? payload.jobs
      : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload)
      ? payload
      : [];

    const country = indiaLocation(input.location) ? "IN" : undefined;
    const jobs = rawJobs
      .map((job) => normalizeHimalayas(job, country))
      .filter((job): job is NormalizedJobListing => Boolean(job));

    return {
      ...providerStatus("ok", jobs),
      nextPage: rawJobs.length >= 20 ? input.page + 1 : null,
    };
  } catch (error) {
    console.error("[Jobs Search] Himalayas error:", error);
    return {
      ...providerStatus(
        "error",
        [],
        error instanceof Error ? error.message : "Himalayas request failed."
      ),
      nextPage: null,
    };
  }
}

/**
 * Adzuna Job Search Adapter (Supplementary Regional & Indian Search)
 */
async function fetchAdzuna(input: {
  query: string;
  location: string;
}): Promise<ProviderResult> {
  const appId = sanitizeKey(process.env.ADZUNA_APP_ID);
  const apiKey = sanitizeKey(process.env.ADZUNA_API_KEY);
  if (!appId || !apiKey) {
    return providerStatus("disabled", [], "Adzuna credentials not configured");
  }

  const country = countryCode(input.location) || "in";
  const what = encodeURIComponent(input.query || "software engineer");
  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${apiKey}&results_per_page=20&what=${what}`;
  const cacheKey = `adzuna:${country}:${what}`;

  try {
    const payload = await cachedFetch<Record<string, unknown>>(
      cacheKey,
      2 * 60 * 60 * 1000,
      async () => {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          throw new Error(`Adzuna HTTP ${res.status}`);
        }
        return (await res.json()) as Record<string, unknown>;
      }
    );

    const raw = Array.isArray(payload.results) ? payload.results : [];
    const jobs = raw
      .map(normalizeAdzuna)
      .filter((job): job is NormalizedJobListing => Boolean(job));

    return providerStatus("ok", jobs);
  } catch (error) {
    console.error("[Jobs] Adzuna failed:", error);
    return providerStatus("error", [], error instanceof Error ? error.message : "Adzuna failed");
  }
}

/**
 * RemoteOK API Adapter (Public Remote Developer Jobs - Zero API Key Needed)
 */
async function fetchRemoteOK(input: {
  query: string;
}): Promise<ProviderResult> {
  const cacheKey = `remoteok:${input.query || "all"}`;
  try {
    const rawJobs = await cachedFetch<unknown[]>(
      cacheKey,
      60 * 60 * 1000, // 1 hour cache
      async () => {
        const res = await fetch("https://remoteok.com/api", {
          headers: {
            "User-Agent": "PlacementCopilot/1.0 (Job Discovery Engine; https://github.com/MananHindocha/placement-copliot)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          throw new Error(`RemoteOK HTTP ${res.status}`);
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
    );

    const q = input.query.toLowerCase().trim();
    let jobs = rawJobs
      .map(normalizeRemoteOK)
      .filter((job): job is NormalizedJobListing => Boolean(job));

    if (q) {
      const qTerms = q.split(/\s+/).filter(Boolean);
      jobs = jobs.filter((job) => {
        const text = `${job.title} ${job.company} ${job.description} ${job.skills.join(" ")}`.toLowerCase();
        return qTerms.some((term) => text.includes(term));
      });
    }

    return providerStatus("ok", jobs.slice(0, 30));
  } catch (error) {
    console.error("[Jobs] RemoteOK failed:", error);
    return providerStatus("error", [], error instanceof Error ? error.message : "RemoteOK failed");
  }
}

// ─── Query Sanitization & Expansion ───────────────────────────────────────────

interface ExpandedQueryInfo {
  rawQuery: string;
  cleanQuery: string;
  isAiMlRole: boolean;
  isDataRole: boolean;
  isDevOpsRole: boolean;
  isFrontendRole: boolean;
  isBackendRole: boolean;
  userSkills: string[];
}

function sanitizeAndExpandRoleQuery(rawQuery: string, rawSkills: string): ExpandedQueryInfo {
  const trimmed = rawQuery.trim();
  const isAiMlRole = /ai|ml|machine\s*learning|deep\s*learning|artificial\s*intelligence/i.test(trimmed);
  const isDataRole = !isAiMlRole && /data|analytics|business\s*intelligence/i.test(trimmed);
  const isDevOpsRole = /devops|cloud|sre|platform|infrastructure/i.test(trimmed);
  const isFrontendRole = /frontend|front-end|react|web\s*developer/i.test(trimmed);
  const isBackendRole = /backend|back-end/i.test(trimmed);

  let cleanQuery = trimmed;
  if (isAiMlRole) {
    cleanQuery = "Machine Learning Engineer AI Engineer";
  } else if (isDataRole) {
    cleanQuery = "Data Engineer Data Analyst";
  } else if (isDevOpsRole) {
    cleanQuery = "DevOps Cloud Engineer";
  } else if (isFrontendRole) {
    cleanQuery = "Frontend React Developer";
  } else if (isBackendRole) {
    cleanQuery = "Backend Software Engineer";
  } else if (trimmed) {
    cleanQuery = trimmed.replace(/[\/&]+/g, " ").replace(/\s+/g, " ").trim();
  }

  let userSkills: string[] = [];
  if (rawSkills) {
    try {
      if (rawSkills.startsWith("[")) {
        userSkills = JSON.parse(rawSkills);
      } else {
        userSkills = rawSkills.split(",").map((s) => s.trim()).filter(Boolean);
      }
    } catch {
      userSkills = rawSkills.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  return {
    rawQuery: trimmed,
    cleanQuery: cleanQuery || "Software Engineer",
    isAiMlRole,
    isDataRole,
    isDevOpsRole,
    isFrontendRole,
    isBackendRole,
    userSkills,
  };
}

// ─── Role-Based Post-Filter & Match Scoring ───────────────────────────────────

const AI_REJECT_REGEX = /\b(\.net|c#|csharp|angular|php|wordpress|salesforce|sap|sharepoint|cobol)\b/i;
const AI_BOOST_REGEX = /\b(ai|ml|machine\s*learning|deep\s*learning|data|nlp|llm|computer\s*vision|vision|python|pytorch|tensorflow|scikit|pandas|numpy|neural|generative\s*ai|rag|langchain)\b/i;

function computeNonZeroMatchScore(job: NormalizedJobListing, info: ExpandedQueryInfo): number {
  const title = job.title.toLowerCase();
  const desc = (job.description || "").toLowerCase();
  const jobSkills = (job.skills || []).map((s) => s.toLowerCase());

  let skillScore = 0;
  if (info.userSkills.length > 0) {
    const matchedCount = info.userSkills.filter((sk) => {
      const sLower = sk.toLowerCase();
      return (
        jobSkills.some((js) => js.includes(sLower) || sLower.includes(js)) ||
        title.includes(sLower) ||
        desc.includes(sLower)
      );
    }).length;
    skillScore = (matchedCount / Math.max(1, Math.min(info.userSkills.length, 6))) * 50;
  } else {
    skillScore = 32;
  }

  let roleScore = 35;
  if (info.isAiMlRole) {
    if (/\b(machine\s*learning|ml|ai|deep\s*learning|nlp|llm|vision|data\s*scientist)\b/i.test(title)) {
      roleScore += 30;
    } else if (AI_BOOST_REGEX.test(title) || AI_BOOST_REGEX.test(desc)) {
      roleScore += 18;
    }
  } else if (info.rawQuery) {
    const terms = info.rawQuery.toLowerCase().split(/[\s/&-]+/).filter((t) => t.length > 2);
    const matched = terms.filter((t) => title.includes(t) || desc.includes(t));
    if (matched.length > 0) {
      roleScore += (matched.length / terms.length) * 25;
    }
  }

  let arrangementBonus = 5;
  if (job.workArrangement === "remote" || job.workArrangement === "hybrid") {
    arrangementBonus += 5;
  }

  return Math.min(96, Math.max(52, Math.round(skillScore + roleScore + arrangementBonus)));
}

function processAndFilterJobs(rawJobs: NormalizedJobListing[], info: ExpandedQueryInfo): NormalizedJobListing[] {
  let filtered = rawJobs;

  if (info.isAiMlRole) {
    filtered = rawJobs.filter((job) => {
      // Exclude titles with .net, c#, angular, php, etc.
      if (AI_REJECT_REGEX.test(job.title)) return false;
      // Prioritize / require some relevance if description or title has ai/ml/data/python
      const combined = `${job.title} ${job.skills.join(" ")} ${(job.description || "").slice(0, 500)}`;
      return AI_BOOST_REGEX.test(combined);
    });

    // If strict filter removed everything, keep jobs that don't have hard rejected keywords
    if (filtered.length === 0) {
      filtered = rawJobs.filter((job) => !AI_REJECT_REGEX.test(job.title));
    }
  }

  // Ensure every job computes a non-zero matchScore (1-100)
  const scored = filtered.map((job) => {
    const score = computeNonZeroMatchScore(job, info);
    return {
      ...job,
      matchScore: score,
    };
  });

  // Sort highest matchScore first
  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored;
}

export async function GET(request: NextRequest) {
  const jwebninjaKey = sanitizeKey(
    process.env.OPENWEBNINJA_API_KEY ||
    process.env.JWEBNINJA_API_KEY ||
    process.env.JSEARCH_API_KEY
  );
  const himalayasKey = sanitizeKey(
    process.env.HIMALAYAS_API_KEY ||
    process.env.HIMALAYA_API_KEY
  );
  const adzunaAppId = sanitizeKey(process.env.ADZUNA_APP_ID);
  const adzunaApiKey = sanitizeKey(process.env.ADZUNA_API_KEY);

  console.log("[Jobs Search] API keys present:", {
    jwebninja: !!jwebninjaKey,
    himalayas: !!himalayasKey,
    adzuna: !!(adzunaAppId && adzunaApiKey),
    remoteok: true, // no key needed
  });

  const rawQuery = text(
    request.nextUrl.searchParams.get("q") ||
    request.nextUrl.searchParams.get("query") ||
    request.nextUrl.searchParams.get("role") ||
    request.nextUrl.searchParams.get("search") ||
    ""
  ).slice(0, 120);
  const rawSkills = text(
    request.nextUrl.searchParams.get("skills") ||
    request.nextUrl.searchParams.get("userSkills") ||
    ""
  );

  const queryInfo = sanitizeAndExpandRoleQuery(rawQuery, rawSkills);
  const query = queryInfo.cleanQuery;
  const location = text(request.nextUrl.searchParams.get("location")).slice(0, 120);
  const arrangement = text(request.nextUrl.searchParams.get("arrangement")).toLowerCase();
  const postedWithin = text(request.nextUrl.searchParams.get("postedWithin"));
  const experience = text(request.nextUrl.searchParams.get("experience"));
  const employment = text(request.nextUrl.searchParams.get("employment"));
  const limitParam = Number(request.nextUrl.searchParams.get("limit") || "0");
  const limit = limitParam > 0 ? Math.min(limitParam, 50) : 0;
  const openwebninjaCursor = text(
    request.nextUrl.searchParams.get("openwebninjaCursor") ||
      request.nextUrl.searchParams.get("jsearchCursor")
  );
  const himalayasPage = Math.max(
    1,
    Number(request.nextUrl.searchParams.get("himalayasPage") || "1") || 1
  );

  // ─── STEP 1: Try JWebNinja (OpenWeb Ninja) First (if key exists) ────────────
  if (jwebninjaKey) {
    try {
      const ninjaRes = await fetchOpenWebNinja({
        query,
        location,
        arrangement,
        postedWithin,
        employment,
        cursor: openwebninjaCursor,
      });
      if (ninjaRes && ninjaRes.jobs && ninjaRes.jobs.length > 0) {
        console.log(`[Jobs] JWebNinja: ${ninjaRes.jobs.length} jobs`);
        const processed = processAndFilterJobs(ninjaRes.jobs, queryInfo);
        const jobList = limit > 0 ? processed.slice(0, limit) : processed;
        return NextResponse.json({
          jobs: jobList,
          results: jobList,
          data: jobList,
          total: jobList.length,
          count: jobList.length,
          source: "openwebninja",
          pagination: {
            openwebninjaNextCursor: ninjaRes.nextCursor || null,
            jsearchNextCursor: ninjaRes.nextCursor || null,
            himalayasNextPage: null,
          },
        });
      }
    } catch (e) {
      console.error("[Jobs] JWebNinja failed:", e);
    }
  }

  // ─── STEP 2: Try Himalaya Second (if key exists or remote permitted) ────────
  if (himalayasKey || (arrangement !== "onsite" && arrangement !== "hybrid")) {
    try {
      const himalayasRes = await fetchHimalayas({
        query,
        location,
        arrangement,
        experience,
        employment,
        page: himalayasPage,
      });
      if (himalayasRes && himalayasRes.jobs && himalayasRes.jobs.length > 0) {
        console.log(`[Jobs] Himalaya: ${himalayasRes.jobs.length} jobs`);
        const processed = processAndFilterJobs(himalayasRes.jobs, queryInfo);
        const jobList = limit > 0 ? processed.slice(0, limit) : processed;
        return NextResponse.json({
          jobs: jobList,
          results: jobList,
          data: jobList,
          total: jobList.length,
          count: jobList.length,
          source: "himalayas",
          pagination: {
            openwebninjaNextCursor: null,
            jsearchNextCursor: null,
            himalayasNextPage: himalayasRes.nextPage || null,
          },
        });
      }
    } catch (e) {
      console.error("[Jobs] Himalaya failed:", e);
    }
  }

  // ─── STEP 3: Try Adzuna Third (if credentials exist) ───────────────────────
  if (adzunaAppId && adzunaApiKey) {
    try {
      const adzunaRes = await fetchAdzuna({ query, location });
      if (adzunaRes && adzunaRes.jobs && adzunaRes.jobs.length > 0) {
        console.log(`[Jobs] Adzuna: ${adzunaRes.jobs.length} jobs`);
        const processed = processAndFilterJobs(adzunaRes.jobs, queryInfo);
        const jobList = limit > 0 ? processed.slice(0, limit) : processed;
        return NextResponse.json({
          jobs: jobList,
          results: jobList,
          data: jobList,
          total: jobList.length,
          count: jobList.length,
          source: "adzuna",
          pagination: {
            openwebninjaNextCursor: null,
            jsearchNextCursor: null,
            himalayasNextPage: null,
          },
        });
      }
    } catch (e) {
      console.error("[Jobs] Adzuna failed:", e);
    }
  }

  // ─── STEP 4: Try RemoteOK Last (Public, no key needed, always available) ───
  try {
    const remoteOkRes = await fetchRemoteOK({ query });
    if (remoteOkRes && remoteOkRes.jobs && remoteOkRes.jobs.length > 0) {
      console.log(`[Jobs] RemoteOK: ${remoteOkRes.jobs.length} jobs`);
      const processed = processAndFilterJobs(remoteOkRes.jobs, queryInfo);
      const jobList = limit > 0 ? processed.slice(0, limit) : processed;
      return NextResponse.json({
        jobs: jobList,
        results: jobList,
        data: jobList,
        total: jobList.length,
        count: jobList.length,
        source: "remoteok",
        pagination: {
          openwebninjaNextCursor: null,
          jsearchNextCursor: null,
          himalayasNextPage: null,
        },
      });
    }
  } catch (e) {
    console.error("[Jobs] RemoteOK failed:", e);
  }

  // ─── All APIs failed — return empty, never mock data ───────────────────────
  console.warn("[Jobs] All APIs failed or returned empty. Returning [].");
  return NextResponse.json({
    jobs: [],
    results: [],
    data: [],
    total: 0,
    count: 0,
    message: "No matching jobs found right now. Try adjusting your search query.",
    source: "none",
    pagination: {
      openwebninjaNextCursor: null,
      jsearchNextCursor: null,
      himalayasNextPage: null,
    },
  });
}
