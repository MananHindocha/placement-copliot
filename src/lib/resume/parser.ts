import type {
  ParsedResumeDocument,
  ResumeBullet,
  ResumeCustomSection,
  ResumeEntry,
} from "@/types";

type SectionKind = "header" | "summary" | "experience" | "projects" | "skills" | "education" | "custom";

interface ResumeSectionBuffer {
  kind: SectionKind;
  heading: string;
  lines: string[];
}

interface PendingEntry {
  headers: string[];
  bullets: ResumeBullet[];
}

const BULLET_PREFIX = /^[\s]*[•\-*▪◦‣]\s*/u;
const DATE_RANGE = /\b(?:19|20)\d{2}\s*(?:[-–—]|to)\s*(?:(?:19|20)\d{2}|present|current)\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s*(?:[-–—]|to)\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:\d{4}|present|current)\b/i;
const LOCATION_PATTERN = /\b(Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|Noida|Gurugram|Gurgaon|Chennai|Kolkata|Remote|India|USA|United States|London|Toronto|Singapore)\b/i;
const KNOWN_HEADINGS: Record<string, { kind: SectionKind; heading: string }> = {
  summary: { kind: "summary", heading: "Professional Summary" },
  "professional summary": { kind: "summary", heading: "Professional Summary" },
  profile: { kind: "summary", heading: "Profile" },
  "about me": { kind: "summary", heading: "About Me" },
  objective: { kind: "summary", heading: "Objective" },
  experience: { kind: "experience", heading: "Work Experience" },
  "work experience": { kind: "experience", heading: "Work Experience" },
  "professional experience": { kind: "experience", heading: "Work Experience" },
  employment: { kind: "experience", heading: "Work Experience" },
  "employment history": { kind: "experience", heading: "Work Experience" },
  internships: { kind: "experience", heading: "Work Experience" },
  projects: { kind: "projects", heading: "Projects" },
  "personal projects": { kind: "projects", heading: "Projects" },
  "academic projects": { kind: "projects", heading: "Projects" },
  skills: { kind: "skills", heading: "Technical Skills" },
  "technical skills": { kind: "skills", heading: "Technical Skills" },
  "skills and expertise": { kind: "skills", heading: "Technical Skills" },
  "skills & expertise": { kind: "skills", heading: "Technical Skills" },
  "core competencies": { kind: "skills", heading: "Technical Skills" },
  "technical competencies": { kind: "skills", heading: "Technical Skills" },
  "tech stack": { kind: "skills", heading: "Technical Skills" },
  technologies: { kind: "skills", heading: "Technical Skills" },
  education: { kind: "education", heading: "Education" },
  academics: { kind: "education", heading: "Education" },
  "academic background": { kind: "education", heading: "Education" },
  qualifications: { kind: "education", heading: "Education" },
  achievements: { kind: "custom", heading: "Achievements" },
  awards: { kind: "custom", heading: "Awards" },
  honors: { kind: "custom", heading: "Honors" },
  certifications: { kind: "custom", heading: "Certifications" },
  leadership: { kind: "custom", heading: "Leadership" },
  "leadership experience": { kind: "custom", heading: "Leadership" },
  extracurricular: { kind: "custom", heading: "Extracurricular Activities" },
  extracurriculars: { kind: "custom", heading: "Extracurricular Activities" },
  "extra curricular": { kind: "custom", heading: "Extracurricular Activities" },
  coursework: { kind: "custom", heading: "Coursework" },
  publications: { kind: "custom", heading: "Publications" },
  research: { kind: "custom", heading: "Research" },
  volunteering: { kind: "custom", heading: "Volunteering" },
  volunteer: { kind: "custom", heading: "Volunteering" },
  languages: { kind: "custom", heading: "Languages" },
  interests: { kind: "custom", heading: "Interests" },
  "positions of responsibility": { kind: "custom", heading: "Positions of Responsibility" },
  "personal information": { kind: "custom", heading: "Personal Information" },
};

const COMMON_SKILLS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Express", "Python", "Django", "FastAPI",
  "Java", "Spring Boot", "C++", "Go", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker",
  "Kubernetes", "AWS", "GCP", "Git", "GitHub", "Linux", "REST APIs", "GraphQL", "Tailwind CSS",
  "HTML", "CSS", "Redux", "Kafka", "CI/CD", "Jest", "PyTorch", "TensorFlow", "System Design",
  "Microservices", "Figma", "SQL", "C#", "Azure", "Tableau", "Pandas", "NumPy",
];

function cleanLine(line: string): string {
  return line.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

function normalizeHeading(line: string): string {
  return cleanLine(line)
    .replace(/^[#\s]+|[#\s:]+$/g, "")
    .replace(/[|]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function looksLikeHeading(line: string, isFirstNameLine: boolean): boolean {
  if (!line || line.length > 70 || BULLET_PREFIX.test(line) || isFirstNameLine) return false;
  const normalized = normalizeHeading(line);
  if (KNOWN_HEADINGS[normalized]) return true;
  const letters = line.replace(/[^A-Za-z]/g, "");
  if (letters.length < 4 || DATE_RANGE.test(line) || /@|https?:\/\//i.test(line)) return false;
  const isUpper = letters === letters.toUpperCase();
  const isColonLabel = /:$/.test(line) && !/[.!?]$/.test(line);
  return isUpper || isColonLabel;
}

function isLikelyEntryHeader(line: string): boolean {
  if (!line || BULLET_PREFIX.test(line) || line.length > 150) return false;
  if (DATE_RANGE.test(line)) return true;
  if (/(?:\s[|]\s|\s[-–—]\s)/.test(line) && line.length < 130) return true;
  const letters = line.replace(/[^A-Za-z]/g, "");
  const titleCase = /^[A-Z][^.!?]{2,90}$/.test(line) && letters.length > 4;
  const noVerbStart = !/^(built|created|developed|designed|implemented|engineered|managed|led|improved|reduced|increased|launched|delivered|worked|helped|supported|assisted|collaborated|responsible)\b/i.test(line);
  return titleCase && noVerbStart && line.split(/\s+/).length <= 12;
}

function splitProjectFragments(line: string): string[] {
  const labelBoundary = /\b(?:Live Demo|GitHub|Telegram|Portfolio|Demo|Repo|Source Code|Link)\s+(?=[A-Z][A-Za-z0-9_-]{2,35}\s*:)/g;
  const normalized = line.replace(labelBoundary, "\n");
  return normalized.split(/(?<=[.!?])\s+(?=[A-Z][A-Za-z0-9\s\-_/+&.]{2,35}\s*[:|–—-]\s*\S)/).map(cleanLine).filter(Boolean);
}

function splitSentences(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]?/g)?.map(cleanLine).filter(Boolean) || [];
  const bullets: string[] = [];
  for (let index = 0; index < sentences.length; index += 2) {
    bullets.push(sentences.slice(index, index + 2).join(" "));
  }
  return bullets;
}

function makeBullet(id: string, text: string): ResumeBullet {
  return { id, text: cleanLine(text.replace(BULLET_PREFIX, "")) };
}

function appendWrappedLine(bullet: ResumeBullet, line: string): void {
  bullet.text = `${bullet.text} ${cleanLine(line)}`.trim();
}

function extractDateRange(text: string): string {
  return text.match(DATE_RANGE)?.[0]?.trim() || "";
}

function buildEntry(prefix: string, index: number, pending: PendingEntry): ResumeEntry {
  const id = `${prefix}-${index}`;
  const headers = pending.headers.map(cleanLine).filter(Boolean);
  const joinedHeaders = headers.join(" | ");
  const dateRange = extractDateRange(joinedHeaders);
  const scoreMatch = joinedHeaders.match(/\b(?:CGPA|GPA|score|grade|percentage)\s*[:=]?\s*[\d.]+(?:\s*\/\s*\d+|\s*%)?/i);
  const locationMatch = joinedHeaders.match(LOCATION_PATTERN);
  const headerWithoutDate = headers.map((header) => header.replace(DATE_RANGE, "").trim().replace(/[|,;–—-]+$/g, "").trim()).filter(Boolean);
  const splitHeader = headerWithoutDate.flatMap((header) => header.split(/\s+[|]\s+|\s+[–—]\s+|\s+-\s+/).map((part) => part.trim()).filter(Boolean));
  const title = splitHeader[0] || headers[0] || "";
  const subtitle = splitHeader.slice(1).join(" | ") || headers.slice(1).join(" | ");

  return {
    id,
    title,
    subtitle,
    dateRange,
    location: locationMatch?.[0],
    scoreOrMeta: scoreMatch?.[0],
    bullets: pending.bullets.map((bullet, bulletIndex) => ({
      id: `${id}-b-${bulletIndex + 1}`,
      text: bullet.text,
    })),
  };
}

function parseEntries(lines: string[], prefix: string, sectionLabel: string): ResumeEntry[] {
  const pendingEntries: PendingEntry[] = [];
  let current: PendingEntry = { headers: [], bullets: [] };
  let hasCurrent = false;

  const ensureCurrent = () => {
    if (!hasCurrent) {
      current = { headers: [], bullets: [] };
      hasCurrent = true;
    }
  };
  const flush = () => {
    if (hasCurrent && (current.headers.length > 0 || current.bullets.length > 0)) pendingEntries.push(current);
    current = { headers: [], bullets: [] };
    hasCurrent = false;
  };

  const expandedLines = lines.flatMap((source) => {
    const line = cleanLine(source);
    if (prefix === "proj") return splitProjectFragments(line);
    if (prefix === "edu") return line.split(/\s+(?=(?:B\.?\s?Tech|Diploma\b|HSC\b|SSC\b|B\.?\s?E\.?\b))/i).map(cleanLine).filter(Boolean);
    return line.split(/\s*[•▪◦●]\s*/u).map((part, index) => index === 0 ? cleanLine(part) : `• ${cleanLine(part)}`).filter(Boolean);
  });

  for (const sourceLine of expandedLines) {
    const line = cleanLine(sourceLine);
    if (!line) continue;
    const startsBullet = BULLET_PREFIX.test(line);
    if (prefix === "edu" && current.headers.length > 0 && /^(?:B\.?\s?Tech|Diploma\b|HSC\b|SSC\b|B\.?\s?E\.?\b)/i.test(line)) {
      flush();
      ensureCurrent();
      current.headers.push(line);
      continue;
    }
    if (prefix === "proj") {
      const project = line.match(/^([A-Z][A-Za-z0-9\s\-_/+&.]{2,35}?)\s*[:|–—-]\s*(.+)$/);
      if (project) {
        flush();
        ensureCurrent();
        current.headers.push(project[1].trim());
        for (const sentence of splitSentences(project[2])) current.bullets.push(makeBullet(`${prefix}-${pendingEntries.length}-b-${current.bullets.length + 1}`, sentence));
        continue;
      }
    }
    const entryHeader = isLikelyEntryHeader(line);

    if (entryHeader && current.bullets.length > 0) {
      flush();
      ensureCurrent();
      current.headers.push(line);
      continue;
    }

    if (entryHeader && current.bullets.length === 0) {
      ensureCurrent();
      current.headers.push(line);
      continue;
    }

    ensureCurrent();
    if (startsBullet || current.bullets.length === 0) {
      current.bullets.push(makeBullet(`${prefix}-${pendingEntries.length}-b-${current.bullets.length + 1}`, line));
    } else {
      appendWrappedLine(current.bullets[current.bullets.length - 1], line);
    }
  }
  flush();

  return pendingEntries.map((entry, index) => {
    const result = buildEntry(prefix, index, entry);
    if (!result.title) result.title = sectionLabel;
    return result;
  });
}

function parseCustomItems(lines: string[], sectionId: string): ResumeBullet[] {
  const items: ResumeBullet[] = [];
  for (const sourceLine of lines) {
    const line = cleanLine(sourceLine);
    if (!line) continue;
    if (BULLET_PREFIX.test(line)) {
      items.push(makeBullet(`${sectionId}-b-${items.length + 1}`, line));
      continue;
    }
    const previous = items[items.length - 1];
    const appearsWrapped = previous && (/^[a-z(]/.test(line) || /^(and|or|with|including|which|that|to|for|from|by)\b/i.test(line));
    if (appearsWrapped) appendWrappedLine(previous, line);
    else items.push({ id: `${sectionId}-b-${items.length + 1}`, text: line });
  }
  return items;
}

function detectLinks(text: string, suppliedLinks: string[]): string[] {
  const extracted = text.match(/(?:https?:\/\/|www\.)[^\s<>]+|(?:github\.com|linkedin\.com\/in|gitlab\.com)\/[^\s<>]+/gi) || [];
  return Array.from(new Set([...suppliedLinks, ...extracted].map((link) => link.replace(/[),.;]+$/g, "").trim()).filter(Boolean)));
}

function extractSkills(lines: string[], rawText: string): { categories: Array<{ category: string; skills: string[] }>; skills: string[] } {
  const byCategory = new Map<string, string[]>();
  for (const sourceLine of lines) {
    const line = cleanLine(sourceLine.replace(BULLET_PREFIX, ""));
    if (!line) continue;
    const colonIndex = line.indexOf(":");
    const category = colonIndex > 0 && colonIndex < 40 ? line.slice(0, colonIndex).trim() : "Technical Skills";
    const values = (colonIndex > 0 && colonIndex < 40 ? line.slice(colonIndex + 1) : line)
      .split(/[,;|•]/)
      .map((skill) => skill.trim())
      .filter(Boolean);
    const list = byCategory.get(category) || [];
    byCategory.set(category, Array.from(new Set([...list, ...values])));
  }

  const found = COMMON_SKILLS.filter((skill) => new RegExp("\\b" + skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(rawText));
  if (byCategory.size === 0 && found.length > 0) byCategory.set("Detected Skills", found);
  const categories = Array.from(byCategory, ([category, skills]) => ({ category, skills }));
  return { categories, skills: Array.from(new Set(categories.flatMap((item) => item.skills))) };
}

export function parseStructuredResume(rawText: string, fileName: string, extractedLinks: string[] = []): ParsedResumeDocument {
  const lines = rawText.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const firstNameLineIndex = lines.findIndex((line) => {
    const words = line.split(/\s+/);
    return words.length <= 4 && /^[\p{L} .'-]+$/u.test(line) && !KNOWN_HEADINGS[normalizeHeading(line)] && !/@|https?:\/\//i.test(line) && !DATE_RANGE.test(line);
  });

  const email = rawText.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/)?.[0] || "";
  const phone = rawText.match(/(?:\+?\d[\d().\s-]{7,}\d)/)?.[0]?.trim() || "";
  const location = rawText.match(LOCATION_PATTERN)?.[0] || "";
  const labeledLinks = rawText.match(/\b(?:LinkedIn|GitHub|Portfolio(?: Website)?|GitLab)\b/gi) || [];
  const links = Array.from(new Set([...detectLinks(rawText, extractedLinks), ...labeledLinks]));
  const nameLine = firstNameLineIndex >= 0 ? lines[firstNameLineIndex] : "";
  const candidateName = nameLine;

  const buffers: ResumeSectionBuffer[] = [];
  const headerBuffer: ResumeSectionBuffer = { kind: "header", heading: "Contact", lines: [] };
  let active: ResumeSectionBuffer = headerBuffer;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const normalized = normalizeHeading(line);
    const known = KNOWN_HEADINGS[normalized];
    const unknownSectionHeader = !known && looksLikeHeading(line, index === firstNameLineIndex);
    if (known || unknownSectionHeader) {
      active = {
        kind: known?.kind || "custom",
        heading: known?.heading || line.replace(/[:#]+$/g, "").trim(),
        lines: [],
      };
      buffers.push(active);
      continue;
    }
    active.lines.push(line);
  }

  const allBuffers = [headerBuffer, ...buffers];
  const first = (kind: SectionKind) => allBuffers.find((section) => section.kind === kind)?.lines || [];
  const summaryLines = first("summary");
  const isContactLine = (line: string) => /@|https?:\/\/|www\.|\+?\d[\d().\s-]{7,}\d|\b(?:linkedin|github|portfolio|gitlab|mumbai|india)\b|[•|]/i.test(line);
  const headerExtras = headerBuffer.lines.filter((line) => line !== candidateName && !isContactLine(line));
  const summary = summaryLines.length > 0 ? summaryLines.filter((line) => !isContactLine(line)).join(" ") : headerExtras.join(" ");
  const skillLines = allBuffers.filter((section) => section.kind === "skills").flatMap((section) => section.lines);
  const { categories: skillCategories, skills } = extractSkills(skillLines, rawText);

  const experience = parseEntries(allBuffers.filter((section) => section.kind === "experience").flatMap((section) => section.lines), "exp", "Work Experience");
  const projects = parseEntries(allBuffers.filter((section) => section.kind === "projects").flatMap((section) => section.lines), "proj", "Project");
  const education = parseEntries(allBuffers.filter((section) => section.kind === "education").flatMap((section) => section.lines), "edu", "Education").map((entry) => {
    const combined = `${entry.title} ${entry.subtitle} ${entry.dateRange} ${entry.bullets.map((bullet) => bullet.text).join(" ")}`;
    const score = combined.match(/\b(?:CGPA|GPA|score|grade|percentage)\s*[:=]?\s*[\d.]+(?:\s*\/\s*\d+|\s*%)?/i)?.[0];
    return { ...entry, scoreOrMeta: score || entry.scoreOrMeta };
  });

  const customSections: ResumeCustomSection[] = allBuffers
    .filter((section) => section.kind === "custom")
    .map((section, index) => {
      const id = `custom-${index}`;
      return { id, heading: section.heading, items: parseCustomItems(section.lines, id) };
    });

  if (headerExtras.length > 0 && summaryLines.length > 0) {
    customSections.unshift({ id: "custom-header", heading: "Additional Header Details", items: parseCustomItems(headerExtras, "custom-header") });
  }

  return {
    fileName,
    candidateName,
    email,
    phone,
    location,
    links,
    summary,
    skillCategories,
    skills,
    experience,
    projects,
    education,
    customSections,
    rawText,
  };
}

export interface ResumeBulletTarget {
  targetSection: "experience" | "projects" | "education" | "custom";
  targetEntryId: string;
  targetBulletId: string;
  sectionLabel: string;
  text: string;
}

export function getResumeBulletTargets(resume: ParsedResumeDocument): ResumeBulletTarget[] {
  const entries: ResumeBulletTarget[] = [];
  const addEntries = (section: "experience" | "projects" | "education", values: ResumeEntry[], label: string) => {
    for (const entry of values) {
      for (const bullet of entry.bullets) {
        entries.push({ targetSection: section, targetEntryId: entry.id, targetBulletId: bullet.id, sectionLabel: `${label}: ${entry.title || entry.subtitle}`, text: bullet.text });
      }
    }
  };
  addEntries("experience", resume.experience, "Experience");
  addEntries("projects", resume.projects, "Project");
  addEntries("education", resume.education, "Education");
  for (const section of resume.customSections) {
    for (const item of section.items) {
      entries.push({ targetSection: "custom", targetEntryId: section.id, targetBulletId: item.id, sectionLabel: section.heading, text: item.text });
    }
  }
  return entries;
}

export function replaceResumeBullet(resume: ParsedResumeDocument, targetBulletId: string, text: string): ParsedResumeDocument {
  const replace = (bullet: ResumeBullet) => bullet.id === targetBulletId ? { ...bullet, text } : bullet;
  return {
    ...resume,
    experience: resume.experience.map((entry) => ({ ...entry, bullets: entry.bullets.map(replace) })),
    projects: resume.projects.map((entry) => ({ ...entry, bullets: entry.bullets.map(replace) })),
    education: resume.education.map((entry) => ({ ...entry, bullets: entry.bullets.map(replace) })),
    customSections: resume.customSections.map((section) => ({ ...section, items: section.items.map(replace) })),
  };
}
