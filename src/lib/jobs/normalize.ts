import type {
  DeadlineProvenance,
  Job,
  JobExperienceLevel,
  JobProviderSource,
  NormalizedJobListing,
  WorkArrangement,
} from "@/types";

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
const asText = (value: unknown): string => typeof value === "string" ? value.trim() : "";
const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

export function cleanJobText(value: unknown): string {
  return asText(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|br)\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([\da-f]{1,6});/gi, (_match, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedUrl(value: unknown): string | null {
  const raw = asText(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? raw : null;
  } catch {
    return null;
  }
}

function validIso(value: unknown): string | null {
  const raw = typeof value === "number" ? value : asText(value);
  if (raw === "" || raw === null) return null;
  const numeric = typeof raw === "number" || /^\d{10,13}$/.test(raw);
  const date = new Date(numeric ? Number(raw) * (Number(raw) < 10_000_000_000 ? 1000 : 1) : raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function validDateOnly(value: unknown): string | null {
  const iso = validIso(value);
  return iso ? iso.slice(0, 10) : null;
}

function getArrangement(source: JobProviderSource, value: string): WorkArrangement {
  if (source === "remotive") return "remote";
  const text = value.toLowerCase();
  if (/\b(remote|work from home|work-from-home|wfh|fully distributed)\b/.test(text)) return "remote";
  if (/\b(hybrid|flexible hybrid)\b/.test(text)) return "hybrid";
  if (/\b(on[ -]?site|in[ -]?office|office[ -]based|onsite)\b/.test(text)) return "onsite";
  return "unspecified";
}

function getExperience(title: string, text: string, employmentType: string | null): JobExperienceLevel {
  const value = `${title} ${employmentType || ""} ${text}`.toLowerCase();
  if (/\bintern(ship)?\b/.test(value)) return "internship";
  if (/\b(fresher|new grad(?:uate)?|recent grad(?:uate)?|graduate engineer|graduate program(?:me)?)\b/.test(value) || /\bgraduate\b/.test(title.toLowerCase())) return "fresher";
  if (/\b(entry[ -]?level|junior|early career|0\s*[-–]\s*1 years?|0\s*to\s*1 years?)\b/.test(value)) return "entry";
  if (/\b(senior|staff|principal|lead)\b/.test(title.toLowerCase())) return "senior";
  if (/\b(mid[ -]?level|3\s*[-–]\s*5 years?)\b/.test(value)) return "mid";
  return "unspecified";
}

function getLegacyType(employmentType: string | null): Job["type"] {
  const value = (employmentType || "").toLowerCase();
  if (!value) return "Unspecified";
  if (value.includes("intern")) return "Internship";
  if (value.includes("part")) return "Part-time";
  if (value.includes("contract") || value.includes("freelance")) return "Contract";
  return "Full-time";
}

function relativeDate(iso: string | null): string {
  if (!iso) return "Date not listed";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? "" : "s"} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? "" : "s"} ago`;
}

function tagsFrom(record: JsonRecord, description: string, title: string): string[] {
  const supplied = asArray(record.tags ?? record.skills_required ?? record.skills)
    .map((item) => typeof item === "string" ? item.trim() : asText(asRecord(item).name))
    .filter(Boolean);
  const extracted = ["JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "Go", "SQL", "PostgreSQL", "MongoDB", "AWS", "Docker", "Kubernetes", "REST APIs", "Machine Learning"]
    .filter((skill) => `${title} ${description}`.toLowerCase().includes(skill.toLowerCase()));
  return Array.from(new Set([...supplied, ...extracted])).slice(0, 12);
}

function salaryRange(record: JsonRecord): { text: string | null; currency: string | null; minLpa: number | null; maxLpa: number | null } {
  const salary = record.salary;
  if (typeof salary === "string" && salary.trim()) return { text: salary.trim(), currency: null, minLpa: null, maxLpa: null };
  const currency = asText(record.salary_currency ?? record.salaryCurrency) || null;
  const min = typeof record.salary_min === "number" ? record.salary_min : null;
  const max = typeof record.salary_max === "number" ? record.salary_max : null;
  if (min === null && max === null) return { text: null, currency, minLpa: null, maxLpa: null };
  const amount = (n: number) => currency === "INR" ? `₹${n.toLocaleString("en-IN")}` : `${currency ? `${currency} ` : ""}${n.toLocaleString("en-US")}`;
  const text = min !== null && max !== null ? `${amount(min)} – ${amount(max)}` : min !== null ? `${amount(min)}+` : `Up to ${amount(max!)}`;
  const period = asText(record.salary_period ?? record.salary_unit).toLowerCase();
  const annual = ["year", "yearly", "annual", "annually", "lpa"].some((unit) => period.includes(unit));
  return { text, currency, minLpa: annual && currency === "INR" && min !== null ? min / 100_000 : null, maxLpa: annual && currency === "INR" && max !== null ? max / 100_000 : null };
}

function makeListing(input: {
  source: JobProviderSource; externalId: string; title: string; company: string; location: string;
  description: unknown; employmentType?: unknown; postedAt?: unknown; url?: unknown; sourceUrl?: unknown;
  logo?: unknown; tags?: unknown; record?: JsonRecord; attributionLabel: string;
}): NormalizedJobListing {
  const record = input.record || {};
  const title = cleanJobText(input.title) || "Untitled role";
  const company = cleanJobText(input.company) || "Unknown company";
  const description = cleanJobText(input.description);
  const location = cleanJobText(input.location) || "Unspecified";
  const employmentType = cleanJobText(input.employmentType) || null;
  const postedAt = validIso(input.postedAt);
  const deadlineValue = record.application_deadline ?? record.closing_date ?? record.deadline;
  const closingDate = validDateOnly(deadlineValue);
  const skills = tagsFrom({ ...record, tags: input.tags ?? record.tags }, description, title);
  const salary = salaryRange(record);
  const arrangementText = `${asText(record.work_model)} ${location} ${description}`;
  const externalId = input.externalId || title;
  const id = input.source === "greenhouse"
    ? `greenhouse:${asText(record.board_token) || "board"}:${externalId}`
    : `${input.source}:${externalId}`;
  const applyUrl = normalizedUrl(record.apply_url ?? record.application_url ?? input.url);
  const sourceUrl = normalizedUrl(input.sourceUrl ?? input.url);
  return {
    id, source: input.source, externalId, isDemo: input.source === "demo", title, company,
    companyLogo: normalizedUrl(input.logo), location,
    workArrangement: getArrangement(input.source, arrangementText),
    employmentType, experienceLevel: getExperience(title, `${description} ${asText(record.experience_level)}`, employmentType),
    skills, salaryRange: salary.text, salaryMinLpa: salary.minLpa, salaryMaxLpa: salary.maxLpa,
    salaryCurrency: salary.currency, postedAt, postedDateLabel: relativeDate(postedAt),
    closingDate, deadlineProvenance: closingDate ? "verified_source" as DeadlineProvenance : "unknown" as DeadlineProvenance,
    applyUrl, sourceUrl, attributionLabel: input.attributionLabel, retrievedAt: new Date().toISOString(),
    type: getLegacyType(employmentType), salary: salary.text || "Not disclosed", matchScore: 0,
    posted: relativeDate(postedAt), tags: skills, logo: company.slice(0, 1).toUpperCase(),
    saved: false, applied: false, description: description.slice(0, 20_000),
  };
}

export function normalizeJobvetta(value: unknown): NormalizedJobListing | null {
  const record = asRecord(value);
  const title = asText(record.title);
  const externalId = asText(record.job_id);
  if (!title || !externalId) return null;
  const company = asText(record.company) || "Unknown company";
  return makeListing({ source: "jobvetta", externalId, title, company, location: asText(record.location),
    description: record.description, employmentType: record.employment_type, postedAt: record.created_at,
    url: record.apply_url, sourceUrl: record.url, logo: record.company_logo, record,
    attributionLabel: "Jobvetta" });
}

export function normalizeGreenhouse(value: unknown, boardToken: string): NormalizedJobListing | null {
  const record = asRecord(value);
  const title = asText(record.title);
  const externalId = String(record.id ?? "");
  if (!title || !externalId) return null;
  const location = asText(asRecord(record.location).name) || asArray(record.offices).map((office) => asText(asRecord(office).location)).filter(Boolean).join("; ");
  const company = asText(record.company_name) || cleanJobText(boardToken).replace(/[-_]/g, " ");
  const content = record.content;
  return makeListing({ source: "greenhouse", externalId, title, company, location, description: content,
    employmentType: record.employment_type, postedAt: record.first_published ?? record.updated_at,
    url: record.absolute_url, sourceUrl: record.absolute_url, tags: [], record: { ...record, board_token: boardToken },
    attributionLabel: `Greenhouse Direct (${company})` });
}

export function normalizeRemotive(value: unknown): NormalizedJobListing | null {
  const record = asRecord(value);
  const title = asText(record.title);
  const externalId = String(record.id ?? "");
  if (!title || !externalId) return null;
  return makeListing({ source: "remotive", externalId, title, company: asText(record.company_name),
    location: asText(record.candidate_required_location) || "Remote", description: record.description,
    employmentType: record.job_type, postedAt: record.publication_date, url: record.url, sourceUrl: record.url,
    logo: record.company_logo_url ?? record.company_logo, tags: record.tags, record,
    attributionLabel: "Remotive" });
}

export function normalizeJSearch(value: unknown): NormalizedJobListing | null {
  const record = asRecord(value);
  const title = asText(record.job_title);
  const externalId = asText(record.job_id);
  if (!title || !externalId) return null;
  const company = asText(record.employer_name) || "Unknown company";
  const locationParts = [record.job_city, record.job_state, record.job_country].map(asText).filter(Boolean);
  const location = asText(record.job_location) || Array.from(new Set(locationParts)).join(", ");
  const employmentType = asText(record.job_employment_type) || asText(asArray(record.job_employment_types)[0]) || null;
  const description = [record.job_description, ...asArray(asRecord(record.job_highlights).Qualifications)]
    .map(asText).filter(Boolean).join(" ");
  const job = makeListing({ source: "jsearch", externalId, title, company, location, description,
    employmentType, postedAt: record.job_posted_at_datetime_utc ?? record.job_posted_at_timestamp,
    url: record.job_apply_link, sourceUrl: record.job_google_link || record.job_apply_link,
    logo: record.employer_logo, tags: record.job_required_skills, record: {
      ...record,
      salary: record.job_salary_string,
      salary_min: record.job_min_salary,
      salary_max: record.job_max_salary,
      salary_currency: record.job_salary_currency ?? record.job_salary_currency_code,
      salary_period: record.job_salary_period,
      application_deadline: record.job_offer_expiration_datetime_utc ?? record.job_offer_expiration_timestamp,
    }, attributionLabel: `JSearch${record.job_publisher ? ` · ${asText(record.job_publisher)}` : ""}` });
  if (record.job_is_remote === true) job.workArrangement = "remote";
  return job;
}

const INDIA_NAMES = new Set(["in", "india", "ind"]);
export function normalizeHimalayas(value: unknown, country?: string): NormalizedJobListing | null {
  const record = asRecord(value);
  const title = asText(record.title);
  const guid = asText(record.guid);
  if (!title || !guid) return null;
  const expiry = typeof record.expiryDate === "number" ? record.expiryDate : Number(record.expiryDate);
  if (Number.isFinite(expiry) && expiry > 0 && expiry * 1000 < Date.now()) return null;
  const restrictions = asArray(record.locationRestrictions).map((item) => asText(item).toLowerCase());
  const zones = asArray(record.timezoneRestrictions).map((item) => asText(item).toLowerCase());
  const wantsIndia = country?.toLowerCase() === "in" || country?.toLowerCase() === "india";
  if (wantsIndia && restrictions.length && !restrictions.some((item) => INDIA_NAMES.has(item) || item === "in")) return null;
  if (wantsIndia && zones.length && !zones.some((zone) => zone.includes("+05:30") || zone === "5.5" || zone === "330")) return null;
  const company = asText(record.companyName) || "Unknown company";
  const countryLabels = restrictions.map((item) => item === "in" ? "India" : item === "us" ? "United States" : item === "gb" ? "United Kingdom" : item.toUpperCase());
  const location = restrictions.length
    ? `Remote (${countryLabels.join(", ")})`
    : zones.length ? "Remote (timezone restricted)" : "Remote (Worldwide)";
  const min = typeof record.minSalary === "number" ? record.minSalary : null;
  const max = typeof record.maxSalary === "number" ? record.maxSalary : null;
  const currency = asText(record.currency) || null;
  const salary = min === null && max === null ? null : `${currency ? `${currency} ` : ""}${min?.toLocaleString() ?? ""}${min !== null && max !== null ? " – " : ""}${max?.toLocaleString() ?? (min !== null ? "+" : "")}${record.salaryPeriod ? ` / ${asText(record.salaryPeriod)}` : ""}`;
  const sourceUrl = normalizedUrl(record.url) || "https://himalayas.app";
  const job = makeListing({ source: "himalayas", externalId: guid, title, company, location,
    description: record.description ?? record.excerpt, employmentType: record.employmentType,
    postedAt: record.pubDate, url: record.applicationLink, sourceUrl, logo: record.companyLogo,
    tags: record.categories, record: { ...record, salary }, attributionLabel: "Himalayas" });
  job.id = `himalayas:${guid}`;
  job.workArrangement = "remote";
  job.experienceLevel = asText(record.seniority).toLowerCase().includes("entry") ? "entry"
    : asText(record.seniority).toLowerCase().includes("senior") ? "senior"
      : asText(record.seniority).toLowerCase().includes("mid") ? "mid" : "unspecified";
  return job;
}

export function normalizeDemoJob(job: Job): NormalizedJobListing {
  const listing = makeListing({ source: "demo", externalId: job.id, title: job.title, company: job.company,
    location: job.location, description: job.description, employmentType: job.type, postedAt: null,
    tags: job.tags, attributionLabel: "Demo data" });
  return { ...listing, id: job.id, matchScore: job.matchScore, posted: job.posted, saved: job.saved, applied: job.applied,
    salary: job.salary, logo: job.logo, tags: job.tags };
}

export function matchesJobSearch(job: NormalizedJobListing, query: string, location: string): boolean {
  const text = `${job.title} ${job.company} ${job.description} ${job.skills.join(" ")} ${job.employmentType || ""} ${job.experienceLevel} ${job.workArrangement}`.toLowerCase();
  const place = `${job.location} ${job.workArrangement}`.toLowerCase();
  return (!query || query.toLowerCase().split(/\s+/).filter(Boolean).every((term) => text.includes(term))) &&
    (!location || location.toLowerCase().split(/\s+/).filter(Boolean).every((term) => place.includes(term)));
}
