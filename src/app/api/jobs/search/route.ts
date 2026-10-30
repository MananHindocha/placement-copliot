import { NextRequest, NextResponse } from "next/server";
import {
  matchesJobSearch,
  normalizeGreenhouse,
  normalizeHimalayas,
  normalizeJSearch,
  normalizeJobvetta,
  normalizeRemotive,
} from "@/lib/jobs/normalize";
import type { NormalizedJobListing } from "@/types";

export const dynamic = "force-dynamic";

type ProviderResult = { jobs: NormalizedJobListing[]; status: "ok" | "disabled" | "error"; message?: string };
const timeout = () => AbortSignal.timeout(10_000);
const responseCache = new Map<string, { expiresAt: number; payload: unknown }>();
const inFlight = new Map<string, Promise<unknown>>();
let jsearchMonth = "";
let jsearchRequests = 0;
const jobvettaResultCache = new Map<string, { expiresAt: number; result: ProviderResult }>();
let jobvettaRequestDay = "";
let jobvettaRequestsToday = 0;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function cachedJson(url: string, headers: HeadersInit, ttlMs: number): Promise<unknown> {
  const cached = responseCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.payload;
  const pending = inFlight.get(url);
  if (pending) return pending;
  const request = (async () => {
    const response = await fetch(url, {
      headers,
      signal: timeout(),
      next: { revalidate: Math.max(60, Math.floor(ttlMs / 1000)) },
    });
    if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);
    const payload: unknown = await response.json();
    responseCache.set(url, { expiresAt: Date.now() + ttlMs, payload });
    return payload;
  })();
  inFlight.set(url, request);
  try { return await request; } finally { inFlight.delete(url); }
}

async function fetchJobvetta(query: string, location: string): Promise<ProviderResult> {
  const key = process.env.JOBVETTA_API_KEY;
  if (!key || key.startsWith("your_")) return { jobs: [], status: "disabled", message: "JOBVETTA_API_KEY is not configured." };
  const cacheKey = `${query.toLowerCase()}|${location.toLowerCase()}`;
  const cached = jobvettaResultCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  const day = new Date().toISOString().slice(0, 10);
  if (jobvettaRequestDay !== day) {
    jobvettaRequestDay = day;
    jobvettaRequestsToday = 0;
  }
  if (jobvettaRequestsToday >= 40) {
    return { jobs: [], status: "disabled", message: "Jobvetta daily request safeguard reached (40 requests per server process)." };
  }
  jobvettaRequestsToday += 1;
  try {
    const params = new URLSearchParams({ limit: "10" });
    if (query) params.set("q", query.slice(0, 100));
    if (location) params.set("location", location.slice(0, 100));
    const response = await fetch(`https://api.jobvetta.com/v1/jobs?${params}`, {
      headers: { Authorization: `Bearer ${key}` }, signal: timeout(), next: { revalidate: 3600 },
    });
    if (!response.ok) return { jobs: [], status: "error", message: `Jobvetta returned HTTP ${response.status}.` };
    const payload = await response.json() as { jobs?: unknown[] };
    const result = { jobs: (payload.jobs || []).map(normalizeJobvetta).filter((job): job is NormalizedJobListing => Boolean(job)), status: "ok" as const };
    jobvettaResultCache.set(cacheKey, { expiresAt: Date.now() + 6 * 60 * 60 * 1000, result });
    return result;
  } catch {
    return { jobs: [], status: "error", message: "Jobvetta could not be reached." };
  }
}

async function fetchGreenhouse(query: string, location: string): Promise<ProviderResult> {
  const boardTokens = Array.from(new Set((process.env.GREENHOUSE_BOARD_TOKENS || "")
    .split(",").map((token) => token.trim()).filter((token) => !token.startsWith("your_") && /^[a-zA-Z0-9_-]{1,80}$/.test(token))));
  if (!boardTokens.length) return { jobs: [], status: "disabled", message: "No GREENHOUSE_BOARD_TOKENS are configured." };
  const results = await Promise.all(boardTokens.map(async (token) => {
    try {
      const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`, {
        signal: timeout(), next: { revalidate: 1800 },
      });
      if (!response.ok) return { jobs: [] as NormalizedJobListing[], error: `Greenhouse board ${token} returned HTTP ${response.status}.` };
      const payload = await response.json() as { jobs?: unknown[] };
      const jobs = (payload.jobs || []).map((job) => normalizeGreenhouse(job, token))
        .filter((job): job is NormalizedJobListing => Boolean(job));
      return { jobs, error: "" };
    } catch {
      return { jobs: [] as NormalizedJobListing[], error: `Greenhouse board ${token} could not be reached.` };
    }
  }));
  const jobs = results.flatMap((result) => result.jobs).filter((job) => matchesJobSearch(job, query, location));
  const errors = results.map((result) => result.error).filter(Boolean);
  if (jobs.length || !errors.length) return { jobs, status: "ok" };
  return { jobs: [], status: "error", message: errors.join(" ") };
}

async function fetchRemotive(query: string, location: string): Promise<ProviderResult> {
  try {
    // A single unfiltered feed URL is cached for six hours to honor Remotive's low request guidance.
    const response = await fetch("https://remotive.com/api/remote-jobs?limit=100", {
      signal: timeout(), next: { revalidate: 21_600 },
    });
    if (!response.ok) return { jobs: [], status: "error", message: `Remotive returned HTTP ${response.status}.` };
    const payload = await response.json() as { jobs?: unknown[] };
    const jobs = (payload.jobs || []).map(normalizeRemotive)
      .filter((job): job is NormalizedJobListing => Boolean(job))
      .filter((job) => matchesJobSearch(job, query, location));
    return { jobs, status: "ok" };
  } catch {
    return { jobs: [], status: "error", message: "Remotive could not be reached." };
  }
}

function providerStatus(status: "ok" | "disabled" | "error", jobs: NormalizedJobListing[], message?: string) {
  return { jobs, status, ...(message ? { message } : {}) };
}

function indiaLocation(location: string): boolean {
  return /\b(india|bengaluru|bangalore|mumbai|delhi|hyderabad|chennai|pune|kolkata|gurugram|gurgaon|noida|ahmedabad|jaipur|kochi)\b/i.test(location);
}

function countryCode(location: string): string | null {
  if (!location || indiaLocation(location)) return "in";
  const value = location.toLowerCase();
  if (/\b(united states|usa|\bus\b|new york|california|texas)\b/.test(value)) return "us";
  if (/\b(united kingdom|\buk\b|england|london)\b/.test(value)) return "gb";
  if (/\b(canada|toronto|vancouver)\b/.test(value)) return "ca";
  if (/\b(australia|sydney|melbourne)\b/.test(value)) return "au";
  if (/\b(germany|berlin|france|paris)\b/.test(value)) return value.includes("france") || value.includes("paris") ? "fr" : "de";
  return null;
}

async function fetchJSearch(input: { query: string; location: string; arrangement: string; postedWithin: string; cursor: string }): Promise<ProviderResult & { nextCursor: string | null }> {
  const apiKey = process.env.OPENWEBNINJA_API_KEY;
  if (!apiKey) return { ...providerStatus("disabled", [], "OPENWEBNINJA_API_KEY is not configured."), nextCursor: null };
  const month = new Date().toISOString().slice(0, 7);
  if (jsearchMonth !== month) { jsearchMonth = month; jsearchRequests = 0; }
  const params = new URLSearchParams({ query: [input.query, input.location && `in ${input.location}`].filter(Boolean).join(" ") || "software engineer jobs in India", language: "en" });
  const country = countryCode(input.location);
  if (country) params.set("country", country);
  if (input.arrangement === "remote") params.set("work_from_home", "true");
  if (input.postedWithin && input.postedWithin !== "any") params.set("date_posted", ({ today: "today", "3days": "3days", week: "week", month: "month" } as Record<string, string>)[input.postedWithin] || "all");
  if (input.cursor) params.set("cursor", input.cursor);
  const url = `https://api.openwebninja.com/jsearch/search-v2?${params}`;
  const needsUpstreamCall = !responseCache.has(url) && !inFlight.has(url);
  if (jsearchRequests >= 150 && needsUpstreamCall) return { ...providerStatus("disabled", [], "JSearch monthly safety cap reached for this server process."), nextCursor: null };
  if (needsUpstreamCall) jsearchRequests += 1;
  try {
    const payload = (await cachedJson(url, { "x-api-key": apiKey }, 12 * 60 * 60 * 1000)) as Record<string, unknown>;
    const rawJobs = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.jobs) ? payload.jobs : [];
    const jobs = rawJobs.map(normalizeJSearch).filter((job): job is NormalizedJobListing => Boolean(job))
      .filter((job) => input.arrangement === "unspecified" || !input.arrangement || job.workArrangement === input.arrangement);
    const cursor = text(payload.nextCursor ?? payload.next_cursor ?? payload.cursor);
    return { ...providerStatus("ok", jobs), nextCursor: cursor || null };
  } catch (error) {
    return { ...providerStatus("error", [], error instanceof Error ? error.message : "JSearch request failed."), nextCursor: null };
  }
}

async function fetchHimalayas(input: { query: string; location: string; arrangement: string; experience: string; employment: string; page: number }): Promise<ProviderResult & { nextPage: number | null }> {
  if (input.arrangement === "onsite" || input.arrangement === "hybrid") return { ...providerStatus("disabled", [], "Himalayas provides remote-only listings."), nextPage: null };
  const params = new URLSearchParams({ sort: "recent", page: String(input.page) });
  if (input.query) params.set("q", input.query);
  if (indiaLocation(input.location)) params.set("country", "IN");
  else if (!input.location || /remote|worldwide|global/i.test(input.location)) params.set("worldwide", "true");
  const seniority = ({ entry: "Entry-level", fresher: "Entry-level", junior: "Entry-level", mid: "Mid-level", senior: "Senior" } as Record<string, string>)[input.experience];
  if (seniority) params.set("seniority", seniority);
  const employment = ({ internship: "Intern", "full-time": "Full Time", "part-time": "Part Time", contract: "Contractor" } as Record<string, string>)[input.employment.toLowerCase()];
  if (employment) params.set("employment_type", employment);
  const url = `https://himalayas.app/jobs/api/search?${params}`;
  const apiKey = process.env.HIMALAYAS_API_KEY;
  try {
    const payload = (await cachedJson(url, apiKey ? { Authorization: `Bearer ${apiKey}` } : {}, 24 * 60 * 60 * 1000)) as Record<string, unknown>;
    const rawJobs = Array.isArray(payload.jobs) ? payload.jobs : Array.isArray(payload.data) ? payload.data : [];
    const country = indiaLocation(input.location) ? "IN" : undefined;
    const jobs = rawJobs.map((job) => normalizeHimalayas(job, country)).filter((job): job is NormalizedJobListing => Boolean(job));
    return { ...providerStatus("ok", jobs), nextPage: rawJobs.length >= 20 ? input.page + 1 : null };
  } catch (error) {
    return { ...providerStatus("error", [], error instanceof Error ? error.message : "Himalayas request failed."), nextPage: null };
  }
}

export async function GET(request: NextRequest) {
  const query = text(request.nextUrl.searchParams.get("q")).slice(0, 120);
  const location = text(request.nextUrl.searchParams.get("location")).slice(0, 120);
  const arrangement = text(request.nextUrl.searchParams.get("arrangement")).toLowerCase();
  const postedWithin = text(request.nextUrl.searchParams.get("postedWithin"));
  const experience = text(request.nextUrl.searchParams.get("experience"));
  const employment = text(request.nextUrl.searchParams.get("employment"));
  const jsearchCursor = text(request.nextUrl.searchParams.get("jsearchCursor"));
  const himalayasPage = Math.max(1, Number(request.nextUrl.searchParams.get("himalayasPage") || "1") || 1);
  const settled = await Promise.allSettled([
    fetchJobvetta(query, location), fetchGreenhouse(query, location), fetchRemotive(query, location),
    fetchJSearch({ query, location, arrangement, postedWithin, cursor: jsearchCursor }),
    fetchHimalayas({ query, location, arrangement, experience, employment, page: himalayasPage }),
  ]);
  const results = settled.map((entry) => entry.status === "fulfilled" ? entry.value : null);
  const [jobvetta, greenhouse, remotive, jsearch, himalayas] = results as [ProviderResult | null, ProviderResult | null, ProviderResult | null, (ProviderResult & { nextCursor: string | null }) | null, (ProviderResult & { nextPage: number | null }) | null];
  const providers: Record<string, ProviderResult> = {
    jobvetta: jobvetta || providerStatus("error", [], "Jobvetta request failed."),
    greenhouse: greenhouse || providerStatus("error", [], "Greenhouse request failed."),
    remotive: remotive || providerStatus("error", [], "Remotive request failed."),
    jsearch: jsearch || providerStatus("error", [], "JSearch request failed."),
    himalayas: himalayas || providerStatus("error", [], "Himalayas request failed."),
  };
  const jobs = Object.values(providers).flatMap((provider) => provider.jobs);
  const dedupeKey = (job: NormalizedJobListing) => job.applyUrl?.toLowerCase().replace(/\/$/, "") || `${job.title}|${job.company}|${job.location}`.toLowerCase().replace(/\s+/g, " ");
  const uniqueJobs = Array.from(new Map(jobs.map((job) => [dedupeKey(job), job])).values()).slice(0, 80);
  const sources = Object.fromEntries(Object.entries(providers).map(([name, result]) => [name, {
    status: result.status,
    ...(result.message ? { message: result.message } : {}),
    count: result.jobs.length,
  }]));
  const source = uniqueJobs.length
    ? Array.from(new Set(uniqueJobs.map((job) => job.source))).join(",")
    : "live-empty";

  return NextResponse.json({ jobs: uniqueJobs, source, sources, count: uniqueJobs.length, pagination: {
    jsearchNextCursor: jsearch?.nextCursor || null,
    himalayasNextPage: himalayas?.nextPage || null,
  } });
}
