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
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
const asText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

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

function getArrangement(value: string, isRemote?: boolean): WorkArrangement {
  if (isRemote === true) return "remote";
  const text = value.toLowerCase();
  if (/\b(remote|work from home|work-from-home|wfh|fully distributed)\b/.test(text)) return "remote";
  if (/\b(hybrid|flexible hybrid)\b/.test(text)) return "hybrid";
  if (/\b(on[ -]?site|in[ -]?office|office[ -]based|onsite)\b/.test(text)) return "onsite";
  return "unspecified";
}

function getExperience(title: string, text: string, employmentType: string | null): JobExperienceLevel {
  const value = `${title} ${employmentType || ""} ${text}`.toLowerCase();
  if (/\bintern(ship)?\b/.test(value)) return "internship";
  if (
    /\b(fresher|new grad(?:uate)?|recent grad(?:uate)?|graduate engineer|graduate program(?:me)?)\b/.test(value) ||
    /\bgraduate\b/.test(title.toLowerCase())
  )
    return "fresher";
  if (/\b(entry[ -]?level|junior|early career|0\s*[-–]\s*1 years?|0\s*to\s*1 years?)\b/.test(value))
    return "entry";
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
    .map((item) => (typeof item === "string" ? item.trim() : asText(asRecord(item).name)))
    .filter(Boolean);
  const extracted = [
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "Python",
    "Java",
    "Go",
    "SQL",
    "PostgreSQL",
    "MongoDB",
    "AWS",
    "Docker",
    "Kubernetes",
    "REST APIs",
    "GraphQL",
    "Tailwind CSS",
    "Machine Learning",
  ].filter((skill) => `${title} ${description}`.toLowerCase().includes(skill.toLowerCase()));
  return Array.from(new Set([...supplied, ...extracted])).slice(0, 12);
}

function salaryRange(record: JsonRecord): {
  text: string | null;
  currency: string | null;
  minLpa: number | null;
  maxLpa: number | null;
} {
  const salary = record.salary;
  if (typeof salary === "string" && salary.trim())
    return { text: salary.trim(), currency: null, minLpa: null, maxLpa: null };
  const currency = asText(record.salary_currency ?? record.salaryCurrency) || null;
  const min = typeof record.salary_min === "number" ? record.salary_min : null;
  const max = typeof record.salary_max === "number" ? record.salary_max : null;
  if (min === null && max === null) return { text: null, currency, minLpa: null, maxLpa: null };
  const amount = (n: number) =>
    currency === "INR" ? `₹${n.toLocaleString("en-IN")}` : `${currency ? `${currency} ` : ""}${n.toLocaleString("en-US")}`;
  const text =
    min !== null && max !== null
      ? `${amount(min)} – ${amount(max)}`
      : min !== null
      ? `${amount(min)}+`
      : `Up to ${amount(max!)}`;
  const period = asText(record.salary_period ?? record.salary_unit).toLowerCase();
  const annual = ["year", "yearly", "annual", "annually", "lpa"].some((unit) => period.includes(unit));
  return {
    text,
    currency,
    minLpa: annual && currency === "INR" && min !== null ? min / 100_000 : null,
    maxLpa: annual && currency === "INR" && max !== null ? max / 100_000 : null,
  };
}

function makeListing(input: {
  source: JobProviderSource;
  externalId: string;
  title: string;
  company: string;
  location: string;
  description: unknown;
  employmentType?: unknown;
  postedAt?: unknown;
  url?: unknown;
  sourceUrl?: unknown;
  logo?: unknown;
  tags?: unknown;
  record?: JsonRecord;
  attributionLabel: string;
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
  const id = `${input.source}:${externalId}`;
  const applyUrl = normalizedUrl(record.apply_url ?? record.application_url ?? input.url);
  const sourceUrl = normalizedUrl(input.sourceUrl ?? input.url);

  return {
    id,
    source: input.source,
    externalId,
    isDemo: input.source === "demo",
    title,
    company,
    companyLogo: normalizedUrl(input.logo),
    location,
    workArrangement: getArrangement(arrangementText, record.job_is_remote === true),
    employmentType,
    experienceLevel: getExperience(
      title,
      `${description} ${asText(record.experience_level)}`,
      employmentType
    ),
    skills,
    salaryRange: salary.text,
    salaryMinLpa: salary.minLpa,
    salaryMaxLpa: salary.maxLpa,
    salaryCurrency: salary.currency,
    postedAt,
    postedDateLabel: relativeDate(postedAt),
    closingDate,
    deadlineProvenance: closingDate
      ? ("verified_source" as DeadlineProvenance)
      : ("unknown" as DeadlineProvenance),
    applyUrl,
    sourceUrl,
    attributionLabel: input.attributionLabel,
    retrievedAt: new Date().toISOString(),
    type: getLegacyType(employmentType),
    salary: salary.text || "Not disclosed",
    matchScore: 0,
    posted: relativeDate(postedAt),
    tags: skills,
    logo: company.slice(0, 1).toUpperCase(),
    saved: false,
    applied: false,
    description: description.slice(0, 20_000),
  };
}

/**
 * Normalizes an OpenWeb Ninja / JSearch job item.
 */
export function normalizeOpenWebNinja(value: unknown): NormalizedJobListing | null {
  const record = asRecord(value);
  const title = asText(record.job_title || record.title) || "Software Engineer";
  const externalId = String(record.job_id || record.id || "");
  if (!externalId) return null;

  const company = asText(record.employer_name || record.company_name) || "Tech Employer";
  const locationParts = [record.job_city, record.job_state, record.job_country].map(asText).filter(Boolean);
  const location = record.job_is_remote === true
    ? "Remote"
    : asText(record.job_location) || Array.from(new Set(locationParts)).join(", ") || "India";

  const rawEmp =
    asText(record.job_employment_type) ||
    asText(asArray(record.job_employment_types)[0]) ||
    asText(record.employment_type);
  const empUpper = rawEmp.toUpperCase();
  const employmentType =
    empUpper === "INTERN" || empUpper === "INTERNSHIP"
      ? "Internship"
      : empUpper === "FULLTIME" || empUpper === "FULL_TIME"
      ? "Full-time"
      : empUpper === "PARTTIME" || empUpper === "PART_TIME"
      ? "Part-time"
      : empUpper === "CONTRACTOR" || empUpper === "CONTRACT"
      ? "Contract"
      : rawEmp || null;

  const description = [
    record.job_description || record.description,
    ...asArray(asRecord(record.job_highlights).Qualifications),
    ...asArray(asRecord(record.job_highlights).Responsibilities),
  ]
    .map(asText)
    .filter(Boolean)
    .join(" ");

  const applyUrl =
    normalizedUrl(record.job_apply_link) ||
    normalizedUrl(asRecord(asArray(record.apply_options)[0]).apply_link);
  const sourceUrl = normalizedUrl(record.job_google_link || record.job_apply_link);

  const postedAt =
    validIso(record.job_posted_at_datetime_utc) ||
    (record.job_posted_at_timestamp
      ? new Date(Number(record.job_posted_at_timestamp) * 1000).toISOString()
      : null);

  const rawClosing = record.job_offer_expiration_datetime_utc;
  const rawClosingTs = record.job_offer_expiration_timestamp;
  const closingDate =
    validDateOnly(rawClosing) ||
    (rawClosingTs ? new Date(Number(rawClosingTs) * 1000).toISOString().slice(0, 10) : null);

  const job = makeListing({
    source: "openwebninja",
    externalId,
    title,
    company,
    location,
    description,
    employmentType,
    postedAt,
    url: applyUrl,
    sourceUrl,
    logo: record.employer_logo || record.company_logo,
    tags: record.job_required_skills,
    record: {
      ...record,
      salary: record.job_salary_string,
      salary_min: record.job_min_salary,
      salary_max: record.job_max_salary,
      salary_currency: record.job_salary_currency ?? record.job_salary_currency_code,
      salary_period: record.job_salary_period,
      application_deadline: closingDate,
    },
    attributionLabel: `OpenWeb Ninja (JSearch)${record.job_publisher ? ` · ${asText(record.job_publisher)}` : ""}`,
  });

  if (
    record.job_is_remote === true ||
    /\b(remote|work from home|wfh)\b/i.test(`${title} ${location}`)
  ) {
    job.workArrangement = "remote";
  } else {
    const descLower = `${title} ${description} ${location}`.toLowerCase();
    if (/\bhybrid\b/i.test(descLower)) {
      job.workArrangement = "hybrid";
    } else if (/\b(on-site|onsite|in-office|work from office|wfo)\b/i.test(descLower)) {
      job.workArrangement = "onsite";
    } else {
      job.workArrangement = "unspecified";
    }
  }

  if (closingDate) {
    job.closingDate = closingDate;
    job.deadlineProvenance = "verified_source";
  }

  return job;
}

const INDIA_NAMES = new Set(["in", "india", "ind"]);

/**
 * Normalizes a Himalayas Remote Jobs API item.
 */
export function normalizeHimalayas(value: unknown, country?: string): NormalizedJobListing | null {
  const record = asRecord(value);
  const title = asText(record.title);
  const guid = asText(record.guid || record.slug || record.id);
  if (!title || !guid) return null;

  // Drop expired jobs where item.expiryDate && item.expiryDate * 1000 < Date.now()
  const expiry = typeof record.expiryDate === "number" ? record.expiryDate : Number(record.expiryDate);
  if (Number.isFinite(expiry) && expiry > 0 && expiry * 1000 < Date.now()) return null;

  const restrictions = asArray(record.locationRestrictions).map((item) => asText(item).toLowerCase());
  const zones = asArray(record.timezoneRestrictions).map((item) => asText(item).toLowerCase());
  const wantsIndia = country?.toLowerCase() === "in" || country?.toLowerCase() === "india";
  if (wantsIndia && restrictions.length && !restrictions.some((item) => INDIA_NAMES.has(item) || item === "in"))
    return null;
  if (
    wantsIndia &&
    zones.length &&
    !zones.some((zone) => zone.includes("+05:30") || zone === "5.5" || zone === "330")
  )
    return null;

  const company = asText(record.companyName) || "Unknown company";
  const countryLabels = restrictions.map((item) =>
    item === "in" ? "India" : item === "us" ? "United States" : item === "gb" ? "United Kingdom" : item.toUpperCase()
  );
  const location =
    Array.isArray(record.locationRestrictions) && record.locationRestrictions.length > 0
      ? `Remote (${countryLabels.join(", ")})`
      : zones.length
      ? "Remote (timezone restricted)"
      : "Remote (Worldwide)";

  const cleanDesc = cleanJobText(record.description || record.excerpt || "");
  const min = typeof record.minSalary === "number" ? record.minSalary : null;
  const max = typeof record.maxSalary === "number" ? record.maxSalary : null;
  const currency = asText(record.currency) || null;
  const salary =
    min === null && max === null
      ? "Not disclosed"
      : `${currency ? `${currency} ` : ""}${min?.toLocaleString() ?? ""}${min !== null && max !== null ? " – " : ""}${max?.toLocaleString() ?? (min !== null ? "+" : "")}${record.salaryPeriod ? ` / ${asText(record.salaryPeriod)}` : ""}`;

  const sourceUrl = normalizedUrl(record.guid || record.url) || "https://himalayas.app";
  const applyUrl = normalizedUrl(record.applicationLink || record.guid);
  const postedAt =
    typeof record.pubDate === "number"
      ? new Date(record.pubDate * 1000).toISOString()
      : validIso(record.pubDate);
  const closingDate =
    Number.isFinite(expiry) && expiry > 0 ? new Date(expiry * 1000).toISOString().slice(0, 10) : null;

  const job = makeListing({
    source: "himalayas",
    externalId: guid,
    title,
    company,
    location,
    description: cleanDesc,
    employmentType: asText(record.employmentType) || null,
    postedAt,
    url: applyUrl,
    sourceUrl,
    logo: record.companyLogo,
    tags: record.categories,
    record: {
      ...record,
      salary,
      application_deadline: closingDate,
    },
    attributionLabel: "Himalayas Remote",
  });

  job.id = `himalayas:${guid}`;
  job.workArrangement = "remote";
  job.experienceLevel = asText(record.seniority).toLowerCase().includes("entry")
    ? "entry"
    : asText(record.seniority).toLowerCase().includes("senior")
    ? "senior"
    : asText(record.seniority).toLowerCase().includes("mid")
    ? "mid"
    : "unspecified";

  if (closingDate) {
    job.closingDate = closingDate;
    job.deadlineProvenance = "verified_source";
  }

  return job;
}

export function normalizeDemoJob(job: Job): NormalizedJobListing {
  const listing = makeListing({
    source: "demo",
    externalId: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    employmentType: job.type,
    postedAt: null,
    tags: job.tags,
    attributionLabel: "Demo Catalog",
  });
  return {
    ...listing,
    id: job.id,
    matchScore: job.matchScore,
    posted: job.posted,
    saved: job.saved,
    applied: job.applied,
    salary: job.salary,
    logo: job.logo,
    tags: job.tags,
  };
}

export function matchesJobSearch(job: NormalizedJobListing, query: string, location: string): boolean {
  const text = `${job.title} ${job.company} ${job.description} ${job.skills.join(" ")} ${job.employmentType || ""} ${job.experienceLevel} ${job.workArrangement}`.toLowerCase();
  const place = `${job.location} ${job.workArrangement}`.toLowerCase();
  return (
    (!query || query.toLowerCase().split(/\s+/).filter(Boolean).every((term) => text.includes(term))) &&
    (!location || location.toLowerCase().split(/\s+/).filter(Boolean).every((term) => place.includes(term)))
  );
}
