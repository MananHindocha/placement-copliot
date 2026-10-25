import { NextRequest, NextResponse } from "next/server";
import type { Job } from "@/types";
import { JOBS, EXTENDED_JOBS } from "@/lib/mock-data";

// ─── Types for external API responses ────────────────────────────────────────

interface AdzunaResult {
  id: string;
  title: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  description?: string;
  salary_min?: number;
  salary_max?: number;
  contract_type?: string;
  redirect_url?: string;
  created?: string;
  category?: { label?: string; tag?: string };
}

interface AdzunaResponse {
  results: AdzunaResult[];
  count?: number;
}

interface RemotiveJob {
  id: number;
  title: string;
  company_name: string;
  candidate_required_location: string;
  description: string;
  salary: string;
  job_type: string;
  url: string;
  publication_date: string;
  tags?: string[];
  category?: string;
}

interface RemotiveResponse {
  jobs: RemotiveJob[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} month(s) ago`;
}

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return "Not disclosed";
  const fmt = (n: number) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
    return `$${n}`;
  };
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

function mapContractType(ct?: string): Job["type"] {
  if (!ct) return "Full-time";
  const lower = ct.toLowerCase();
  if (lower.includes("full")) return "Full-time";
  if (lower.includes("part")) return "Part-time";
  if (lower.includes("intern")) return "Internship";
  if (lower.includes("contract") || lower.includes("freelance")) return "Contract";
  return "Full-time";
}

function extractTagsFromDescription(desc: string): string[] {
  const techKeywords = [
    "React", "Angular", "Vue", "TypeScript", "JavaScript", "Python", "Java",
    "Go", "Rust", "C++", "Node.js", "Next.js", "GraphQL", "REST", "SQL",
    "PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "GCP",
    "Azure", "Machine Learning", "AI", "DevOps", "CI/CD", "Git", "Linux",
    "Spring", "Django", "Flask", "FastAPI", "Terraform", "Kafka",
  ];
  const found = new Set<string>();
  const descLower = desc.toLowerCase();
  for (const kw of techKeywords) {
    if (descLower.includes(kw.toLowerCase())) {
      found.add(kw);
    }
  }
  return Array.from(found).slice(0, 6);
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ─── Adzuna Fetch ────────────────────────────────────────────────────────────

async function fetchAdzuna(
  query: string,
  location: string
): Promise<{ jobs: Job[]; source: "adzuna" } | null> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) return null;

  try {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: "20",
      what: query || "software engineer",
      "content-type": "application/json",
    });
    if (location) params.set("where", location);

    const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?${params}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as AdzunaResponse;

    const jobs: Job[] = (data.results || []).map(
      (r: AdzunaResult, idx: number) => ({
        id: `adzuna-${r.id || idx}`,
        title: r.title || "Untitled Role",
        company: r.company?.display_name || "Unknown Company",
        location: r.location?.display_name || "India",
        type: mapContractType(r.contract_type),
        salary: formatSalary(r.salary_min, r.salary_max),
        matchScore: 0, // will be scored by AI match endpoint
        posted: r.created ? timeAgo(r.created) : "Recently",
        tags: extractTagsFromDescription(r.description || r.title || ""),
        logo: (r.company?.display_name || "?")[0].toUpperCase(),
        saved: false,
        applied: false,
        description: stripHtmlTags(r.description || "No description available.").slice(0, 600),
      })
    );

    return { jobs, source: "adzuna" };
  } catch {
    return null;
  }
}

// ─── Remotive Fetch ──────────────────────────────────────────────────────────

async function fetchRemotive(
  query: string
): Promise<{ jobs: Job[]; source: "remotive" } | null> {
  try {
    const params = new URLSearchParams({
      limit: "20",
    });
    if (query) params.set("search", query);

    const url = `https://remotive.com/api/remote-jobs?${params}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as RemotiveResponse;

    const jobs: Job[] = (data.jobs || []).slice(0, 20).map(
      (r: RemotiveJob, idx: number) => ({
        id: `remotive-${r.id || idx}`,
        title: r.title || "Untitled Role",
        company: r.company_name || "Unknown Company",
        location: r.candidate_required_location || "Remote",
        type: mapContractType(r.job_type),
        salary: r.salary || "Not disclosed",
        matchScore: 0,
        posted: r.publication_date ? timeAgo(r.publication_date) : "Recently",
        tags: r.tags?.slice(0, 6) ||
          extractTagsFromDescription(stripHtmlTags(r.description || r.title || "")),
        logo: (r.company_name || "?")[0].toUpperCase(),
        saved: false,
        applied: false,
        description: stripHtmlTags(r.description || "No description available.").slice(0, 600),
      })
    );

    return { jobs, source: "remotive" };
  } catch {
    return null;
  }
}

// ─── Mock Fallback ───────────────────────────────────────────────────────────

function getMockJobs(query: string, location: string): Job[] {
  const allMock = [...JOBS, ...EXTENDED_JOBS];
  const q = query.toLowerCase();
  const loc = location.toLowerCase();

  return allMock.filter((j) => {
    const matchQuery =
      !q ||
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.tags.some((t) => t.toLowerCase().includes(q)) ||
      j.description.toLowerCase().includes(q);
    const matchLoc =
      !loc ||
      j.location.toLowerCase().includes(loc) ||
      (loc === "remote" && j.location.toLowerCase().includes("remote"));
    return matchQuery && matchLoc;
  });
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") || "";
  const location = searchParams.get("location") || "";
  const mode = searchParams.get("mode") || "auto"; // "auto" | "demo"

  // If explicitly demo mode, skip APIs
  if (mode === "demo") {
    return NextResponse.json({
      jobs: getMockJobs(query, location),
      source: "demo",
      count: getMockJobs(query, location).length,
    });
  }

  // Try Adzuna first
  const adzunaResult = await fetchAdzuna(query, location);
  if (adzunaResult && adzunaResult.jobs.length > 0) {
    return NextResponse.json({
      jobs: adzunaResult.jobs,
      source: adzunaResult.source,
      count: adzunaResult.jobs.length,
    });
  }

  // Fallback to Remotive
  const remotiveResult = await fetchRemotive(query);
  if (remotiveResult && remotiveResult.jobs.length > 0) {
    return NextResponse.json({
      jobs: remotiveResult.jobs,
      source: remotiveResult.source,
      count: remotiveResult.jobs.length,
    });
  }

  // Final fallback to mock data
  const mockJobs = getMockJobs(query, location);
  return NextResponse.json({
    jobs: mockJobs,
    source: "demo",
    count: mockJobs.length,
  });
}
