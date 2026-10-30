import { NextRequest, NextResponse } from "next/server";
import {
  normalizeOpenWebNinja,
  normalizeHimalayas,
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
  const apiKey = sanitizeKey(process.env.OPENWEBNINJA_API_KEY);
  if (!apiKey || apiKey.startsWith("your_") || apiKey.startsWith("demo_")) {
    return {
      ...providerStatus("disabled", [], "OPENWEBNINJA_API_KEY is not configured."),
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

  const apiKey = sanitizeKey(process.env.HIMALAYAS_API_KEY);
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

export async function GET(request: NextRequest) {
  const query = text(request.nextUrl.searchParams.get("q")).slice(0, 120);
  const location = text(request.nextUrl.searchParams.get("location")).slice(0, 120);
  const arrangement = text(request.nextUrl.searchParams.get("arrangement")).toLowerCase();
  const postedWithin = text(request.nextUrl.searchParams.get("postedWithin"));
  const experience = text(request.nextUrl.searchParams.get("experience"));
  const employment = text(request.nextUrl.searchParams.get("employment"));
  const openwebninjaCursor = text(
    request.nextUrl.searchParams.get("openwebninjaCursor") ||
      request.nextUrl.searchParams.get("jsearchCursor")
  );
  const himalayasPage = Math.max(
    1,
    Number(request.nextUrl.searchParams.get("himalayasPage") || "1") || 1
  );

  // ─── Work-Mode Coordinator Routing ──────────────────────────────────────────
  // - All opportunities / unspecified: Query OpenWeb Ninja + Himalayas in parallel
  // - Remote: Query OpenWeb Ninja (work_from_home=true) + Himalayas
  // - Hybrid / On-site: Query OpenWeb Ninja only (Himalayas provides remote only)
  const queryHimalayas = arrangement !== "hybrid" && arrangement !== "onsite";

  const [openwebninjaSettled, himalayasSettled] = await Promise.allSettled([
    fetchOpenWebNinja({
      query,
      location,
      arrangement,
      postedWithin,
      employment,
      cursor: openwebninjaCursor,
    }),
    queryHimalayas
      ? fetchHimalayas({
          query,
          location,
          arrangement,
          experience,
          employment,
          page: himalayasPage,
        })
      : Promise.resolve({
          ...providerStatus("disabled", [], "Himalayas provides remote-only listings."),
          nextPage: null,
        }),
  ]);

  const openwebninjaRes =
    openwebninjaSettled.status === "fulfilled" ? openwebninjaSettled.value : null;
  const himalayasRes =
    himalayasSettled.status === "fulfilled" ? himalayasSettled.value : null;

  const providers: Record<string, ProviderResult> = {
    openwebninja:
      openwebninjaRes ||
      providerStatus("error", [], "OpenWeb Ninja request failed."),
    himalayas: queryHimalayas
      ? himalayasRes || providerStatus("error", [], "Himalayas request failed.")
      : providerStatus("disabled", [], "Himalayas provides remote-only listings."),
  };

  const allJobs = Object.values(providers).flatMap((p) => p.jobs);

  // Deduplicate by normalized application URL or company + title + location
  const dedupeKey = (job: NormalizedJobListing) =>
    job.applyUrl?.toLowerCase().replace(/\/$/, "") ||
    `${job.title}|${job.company}|${job.location}`.toLowerCase().replace(/\s+/g, " ");

  const uniqueJobs = Array.from(
    new Map(allJobs.map((job) => [dedupeKey(job), job])).values()
  ).slice(0, 80);

  const sources = Object.fromEntries(
    Object.entries(providers).map(([name, result]) => [
      name,
      {
        status: result.status,
        ...(result.message ? { message: result.message } : {}),
        count: result.jobs.length,
      },
    ])
  );

  const activeSources = Array.from(new Set(uniqueJobs.map((j) => j.source)));
  const source = uniqueJobs.length
    ? activeSources.join(",")
    : "live-empty";

  return NextResponse.json({
    jobs: uniqueJobs,
    source,
    sources,
    count: uniqueJobs.length,
    pagination: {
      openwebninjaNextCursor: openwebninjaRes?.nextCursor || null,
      jsearchNextCursor: openwebninjaRes?.nextCursor || null,
      himalayasNextPage: himalayasRes?.nextPage || null,
    },
  });
}
