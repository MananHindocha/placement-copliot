import { createClient } from "@/lib/supabase/client";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import { DEMO_USER_SKILLS } from "@/lib/mock-data";
import type { Job } from "@/types";
import type { JobListingRow } from "./types";
import type { EnrichedMatchResult } from "@/app/api/jobs/match/route";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JobFilters {
  search: string;
  location: string;
  jobTypes: string[];
  experienceLevel: string;
  minMatchScore: number;
  salaryMin: number;
  salaryMax: number;
  includeSalaryNotDisclosed: boolean;
  skills: string[];
  postedWithin: string;
  workArrangement: "any" | "remote" | "hybrid" | "onsite";
}

/**
 * Re-export the enriched match result from the API route so consumers
 * across the UI can import from one place.
 */
export type { EnrichedMatchResult as MatchResult } from "@/app/api/jobs/match/route";

export interface JobSearchResponse {
  jobs: Job[];
  source: string;
  sources?: Record<string, { status: "ok" | "disabled" | "error"; message?: string; count: number }>;
  pagination?: {
    openwebninjaNextCursor?: string | null;
    jsearchNextCursor?: string | null;
    himalayasNextPage?: number | null;
  };
}

export interface JobSearchOptions {
  workArrangement?: JobFilters["workArrangement"];
  employment?: string;
  experience?: string;
  postedWithin?: string;
  openwebninjaCursor?: string;
  jsearchCursor?: string;
  himalayasPage?: number;
}

/**
 * Optional student preferences used to personalise match scoring.
 * When omitted, the matching engine uses neutral defaults.
 */
export interface MatchPreferences {
  /** e.g. "Bangalore", "Remote", "Mumbai" */
  preferredLocation?: string;
  /** e.g. ["Full-time", "Internship"] */
  preferredTypes?: string[];
}

export const DEFAULT_FILTERS: JobFilters = {
  search: "",
  location: "",
  jobTypes: [],
  experienceLevel: "",
  minMatchScore: 0,
  salaryMin: 0,
  salaryMax: 30,
  includeSalaryNotDisclosed: true,
  skills: [],
  postedWithin: "any",
  workArrangement: "any",
};

// ─── Job fetching ─────────────────────────────────────────────────────────────

export async function getJobs(): Promise<Job[]> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("job_listings")
    .select("*")
    .eq("is_active", true)
    .order("posted_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load jobs from database: ${error.message}`);
  }

  return ((data as JobListingRow[]) || []).map((row: JobListingRow) => ({
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    type: row.job_type,
    salary: row.salary_range || "Competitive",
    matchScore: row.match_score ?? 75,
    posted: new Date(row.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    tags: row.tags || [],
    logo: row.logo_url || row.company.slice(0, 1).toUpperCase(),
    saved: false,
    applied: false,
    description: row.description || "",
  }));
}

// ─── Live search via API route ────────────────────────────────────────────────

export async function searchJobs(
  query: string,
  location: string,
  options: JobSearchOptions = {},
): Promise<JobSearchResponse> {
  try {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (location) params.set("location", location);
    if (options.workArrangement && options.workArrangement !== "any") params.set("arrangement", options.workArrangement);
    if (options.employment) params.set("employment", options.employment);
    if (options.experience) params.set("experience", options.experience);
    if (options.postedWithin) params.set("postedWithin", options.postedWithin);
    if (options.openwebninjaCursor || options.jsearchCursor) {
      params.set("openwebninjaCursor", options.openwebninjaCursor || options.jsearchCursor || "");
    }
    if (options.himalayasPage) params.set("himalayasPage", String(options.himalayasPage));
    const res = await fetch(`/api/jobs/search?${params}`);
    if (!res.ok) throw new Error("Search API unavailable");

    const data = await res.json();
    return {
      jobs: data.jobs || [],
      source: data.source || "live-empty",
      sources: data.sources,
      pagination: data.pagination,
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Job search failed.");
  }
}

// ─── AI match scoring ─────────────────────────────────────────────────────────

/**
 * Scores jobs against the student's profile using the /api/jobs/match endpoint.
 * The endpoint uses Gemini 2.0 Flash when available, falling back to a
 * deterministic heuristic engine.
 *
 * @param jobs          – list of jobs to score
 * @param userSkills    – demonstrated skills (defaults to DEMO_USER_SKILLS)
 * @param userTargetRole – the student's stated target role
 * @param preferences   – optional location and job-type preferences for personalisation
 */
export async function scoreJobMatches(
  jobs: Job[],
  userSkills?: string[],
  userTargetRole?: string,
  preferences?: MatchPreferences,
): Promise<Map<string, EnrichedMatchResult>> {
  const resultMap = new Map<string, EnrichedMatchResult>();

  try {
    const payload = {
      jobs: jobs.map((j) => ({
        jobId:          j.id,
        jobTitle:       j.title,
        jobDescription: j.description.slice(0, 800),
        jobTags:        j.tags,
        jobType:        j.type,
      })),
      userSkills:        userSkills || DEMO_USER_SKILLS,
      userTargetRole:    userTargetRole || "Frontend Developer",
      preferredLocation: preferences?.preferredLocation ?? "",
      preferredTypes:    preferences?.preferredTypes ?? [],
    };

    const res = await fetch("/api/jobs/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Match API unavailable");

    const data = await res.json();
    for (const result of data.results || []) {
      resultMap.set(result.jobId, result as EnrichedMatchResult);
    }
  } catch {
    // Silently fail — jobs will keep their existing matchScore from the catalog
  }

  return resultMap;
}

// ─── Client-side filter logic ─────────────────────────────────────────────────

function parseSalaryLPA(salary: string): { min: number; max: number; disclosed: boolean } {
  if (!salary || salary === "Not disclosed" || salary === "Competitive") {
    return { min: 0, max: 0, disclosed: false };
  }

  // Match patterns like "₹18L – ₹28L", "₹1.2L/month"
  const lpaMatches = salary.match(/₹([\d.]+)L/gi);
  if (lpaMatches && lpaMatches.length >= 2) {
    const nums = lpaMatches.map((m) => parseFloat(m.replace(/[₹L]/gi, "")));
    return { min: nums[0], max: nums[1], disclosed: true };
  }
  if (lpaMatches && lpaMatches.length === 1) {
    const num = parseFloat(lpaMatches[0].replace(/[₹L]/gi, ""));
    return { min: num, max: num, disclosed: true };
  }

  // Match patterns like "$160k – $200k"
  const kMatches = salary.match(/\$([\d.]+)k/gi);
  if (kMatches && kMatches.length >= 1) {
    // Roughly convert: $160k ≈ ₹13L
    const nums = kMatches.map((m) => parseFloat(m.replace(/[\$k]/gi, "")) * 0.083);
    return {
      min: nums[0],
      max: nums.length > 1 ? nums[1] : nums[0],
      disclosed: true,
    };
  }

  return { min: 0, max: 0, disclosed: true }; // has text but can't parse
}

function postedWithinDays(posted: string): number {
  const lower = posted.toLowerCase();
  if (lower.includes("today") || lower.includes("just")) return 0;
  const dayMatch = lower.match(/(\d+)\s*day/);
  if (dayMatch) return parseInt(dayMatch[1], 10);
  if (lower.includes("1 week") || lower.includes("a week")) return 7;
  const weekMatch = lower.match(/(\d+)\s*week/);
  if (weekMatch) return parseInt(weekMatch[1], 10) * 7;
  if (lower.includes("1 month") || lower.includes("a month")) return 30;
  const monthMatch = lower.match(/(\d+)\s*month/);
  if (monthMatch) return parseInt(monthMatch[1], 10) * 30;
  return 999; // unknown age
}

export function applyFilters(jobs: Job[], filters: JobFilters): Job[] {
  return jobs.filter((job) => {
    if (filters.workArrangement !== "any" && job.workArrangement !== filters.workArrangement) return false;
    // Text search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const searchable = `${job.title} ${job.company} ${job.tags.join(" ")} ${job.description}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    // Location
    if (filters.location) {
      const loc = filters.location.toLowerCase();
      if (!job.location.toLowerCase().includes(loc)) return false;
    }

    // Job type
    if (filters.jobTypes.length > 0) {
      if (!filters.jobTypes.includes(job.type)) return false;
    }

    // Match score threshold — uses the job's current matchScore (updated after scoring)
    if (job.matchScore < filters.minMatchScore) return false;

    // Salary range
    const salary = parseSalaryLPA(job.salary);
    if (!salary.disclosed) {
      if (!filters.includeSalaryNotDisclosed) return false;
    } else if (filters.salaryMin > 0 || filters.salaryMax < 30) {
      if (salary.max > 0 && salary.max < filters.salaryMin) return false;
      if (salary.min > 0 && salary.min > filters.salaryMax) return false;
    }

    // Skills filter
    if (filters.skills.length > 0) {
      const jobSkills = `${job.tags.join(" ")} ${job.description}`.toLowerCase();
      const hasSkill = filters.skills.some((s) =>
        jobSkills.includes(s.toLowerCase())
      );
      if (!hasSkill) return false;
    }

    // Posted within
    if (filters.postedWithin !== "any") {
      const days = postedWithinDays(job.posted);
      const maxDays =
        filters.postedWithin === "today"  ? 0  :
        filters.postedWithin === "3days"  ? 3  :
        filters.postedWithin === "week"   ? 7  :
        filters.postedWithin === "month"  ? 30 : 9999;
      if (days > maxDays) return false;
    }

    return true;
  });
}

let activeUserSkills: string[] = [...DEMO_USER_SKILLS];

export function getUserSkills(): string[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("placement_user_skills");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          activeUserSkills = parsed;
        }
      }
    } catch {
      // Fallback
    }
  }
  return [...activeUserSkills];
}

export function setUserSkills(skills: string[]): void {
  if (skills && skills.length > 0) {
    activeUserSkills = Array.from(new Set(skills));
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("placement_user_skills", JSON.stringify(activeUserSkills));
        window.dispatchEvent(new CustomEvent("placement_skills_updated", { detail: activeUserSkills }));
      } catch {
        // Fallback
      }
    }
  }
}

// ─── Toggle save ──────────────────────────────────────────────────────────────

export async function toggleSaveJob(id: string, saved: boolean): Promise<void> {
  void id;
  void saved;
  throw new Error("Job bookmark persistence in live mode will be available in Phase 3.");
}
