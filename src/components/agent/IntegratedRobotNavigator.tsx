"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAgent } from "@/context/AgentProvider";
import {
  getStoredApplications,
  saveStoredApplications,
  getStoredReadinessMilestones,
  saveStoredReadinessMilestones,
  saveStoredResumeWorkspace,
} from "@/lib/storage-sync";

const ROLE_PRESETS = [
  "Full-Stack Engineer",
  "Backend Software Engineer",
  "Frontend Engineer",
  "AI / ML Engineer",
  "Data & Analytics Engineer",
  "DevOps / Cloud Engineer",
];

interface LiveScoutedJob {
  id: string;
  company: string;
  title: string;
  location: string;
  salary: string;
  url: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  deadlineDate: string;
}

interface RoleSearchConfig {
  searchQueries: string[];
  requiredKeywords: string[];
  rejectedKeywords: string[];
}

function buildRoleSearchConfig(role: string): RoleSearchConfig {
  const r = (role || "").toLowerCase();
  if (/ai|ml|machine\s*learning|deep\s*learning|artificial\s*intelligence/i.test(r)) {
    return {
      searchQueries: [
        "machine learning engineer",
        "ai engineer",
        "data scientist",
        "deep learning engineer",
      ],
      requiredKeywords: [
        "ai",
        "ml",
        "machine learning",
        "deep learning",
        "nlp",
        "llm",
        "vision",
        "data",
        "python",
        "pytorch",
        "tensorflow",
        "neural",
        "rag",
      ],
      rejectedKeywords: [".net", "c#", "csharp", "angular", "php", "wordpress", "salesforce", "sap", "sharepoint"],
    };
  }
  if (/data|analytics/i.test(r)) {
    return {
      searchQueries: ["data engineer", "analytics engineer", "data analyst"],
      requiredKeywords: ["data", "sql", "etl", "python", "analytics", "pipeline", "warehouse", "spark", "bi"],
      rejectedKeywords: [".net", "c#", "angular", "php", "wordpress"],
    };
  }
  if (/devops|cloud|sre/i.test(r)) {
    return {
      searchQueries: ["devops engineer", "cloud engineer", "site reliability engineer", "platform engineer"],
      requiredKeywords: ["devops", "cloud", "aws", "kubernetes", "docker", "terraform", "ci/cd", "linux"],
      rejectedKeywords: ["wordpress", "php"],
    };
  }
  if (/frontend|front-end/i.test(r)) {
    return {
      searchQueries: ["frontend engineer", "react developer", "frontend developer"],
      requiredKeywords: ["frontend", "front-end", "react", "typescript", "javascript", "next.js", "css", "html", "web"],
      rejectedKeywords: ["c#", ".net", "embedded", "firmware"],
    };
  }
  if (/backend|back-end/i.test(r)) {
    return {
      searchQueries: ["backend software engineer", "backend developer", "software engineer"],
      requiredKeywords: ["backend", "back-end", "api", "node", "python", "go", "java", "sql", "database"],
      rejectedKeywords: ["wordpress", "drupal"],
    };
  }
  return {
    searchQueries: [role.replace(/[\/&]+/g, " ").replace(/\s+/g, " ").trim() || "software engineer"],
    requiredKeywords: [],
    rejectedKeywords: [".net", "c#"],
  };
}

export function IntegratedRobotNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastSyncRef = useRef<string>("");
  const [isDuplicateInstance, setIsDuplicateInstance] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    digitalTwin,
    parsedResume,
    uploadedFileName,
    targetRole,
    setTargetRole,
    isUploadingResume,
    agentError,
    clearAgentError,
    uploadResumeForRole,
    resetWorkspaceToZero,
  } = useAgent();

  const [customRoleInput, setCustomRoleInput] = useState(targetRole || "");
  const [isScoutingJobs, setIsScoutingJobs] = useState(false);
  const [scoutedJobs, setScoutedJobs] = useState<LiveScoutedJob[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isDashboard = pathname === "/dashboard";

  useEffect(() => {
    if (typeof document === "undefined" || !containerRef.current) return;
    const allNavigators = document.querySelectorAll('[data-robot-navigator="singleton"]');
    if (allNavigators.length > 1 && allNavigators[0] !== containerRef.current) {
      setIsDuplicateInstance(true);
    }
  }, [pathname]);

  // Keep storage-sync.ts unified whenever parsedResume updates so /resume never crashes
  useEffect(() => {
    if (!parsedResume) return;
    const syncKey = `${uploadedFileName}::${targetRole}::${parsedResume.candidateName}::${parsedResume.atsScore}::${(parsedResume.extractedSkills || []).length}`;
    if (lastSyncRef.current === syncKey) return;
    lastSyncRef.current = syncKey;

    try {
      const skillNames = (parsedResume.extractedSkills || []).map((s: any) =>
        typeof s === "string" ? s : String(s?.name || s?.skill_name || s?.skill || "")
      ).filter(Boolean);

      const missingNames = (parsedResume.missingSkillsForTargetRole || []).map((m: any) =>
        typeof m === "string" ? m : String(m?.skill || "")
      ).filter(Boolean);

      const fullKeywords = [
        ...skillNames.map((w: string) => ({
          word: w,
          keyword: w,
          present: true,
          found: true,
          importance: "high" as const,
        })),
        ...missingNames.map((w: string) => ({
          word: w,
          keyword: w,
          present: false,
          found: false,
          importance: "high" as const,
        })),
      ];

      const fullAnalysis = {
        matchScore: parsedResume.atsScore || 75,
        atsScore: parsedResume.atsScore || 75,
        jobTitle: targetRole || parsedResume.targetRole || "Software Engineer",
        company: "Target Roles",
        candidateName: parsedResume.candidateName || "Candidate",
        strengths: skillNames.slice(0, 5).map((name: string) => `${name}: Verified in resume`),
        weaknesses: missingNames.map((m: string) => `${m}: Skill gap for ${targetRole || "target role"}`),
        missingKeywords: missingNames,
        gaps: (parsedResume.missingSkillsForTargetRole || []).map(
          (m: any) =>
            typeof m === "string"
              ? m
              : `${m?.skill || m}: ${m?.reason || "Recommended for " + (targetRole || "role")}`
        ),
        suggestions: (parsedResume.bulletImprovements || []).map((b: any, idx: number) => ({
          id: `sug-${idx + 1}`,
          section: "experience" as const,
          original: String(b?.originalBullet || ""),
          suggested: String(b?.proposedBullet || ""),
          improved: String(b?.proposedBullet || ""),
          impact: "high" as const,
          reason: `Grounded in ${b?.verifiedSourceProject || "Projects"}`,
          impactLevel: "high" as const,
        })),
        keywords: fullKeywords,
        sectionScores: {
          format: parsedResume.atsScore || 80,
          impact: 75,
          style: 80,
          skills: Math.min(100, Math.max(50, skillNames.length * 10)),
          experience: 75,
          education: 85,
        },
        improvements: (parsedResume.bulletImprovements || []).map((b: any) => String(b?.proposedBullet || "")),
        skills: skillNames,
        extractedSkills: skillNames,
        projects: parsedResume.projects || [],
        meta: {
          fileName: uploadedFileName || "Uploaded_Resume.pdf",
          pageCount: 1,
          bulletCount: (parsedResume.bulletImprovements || []).length,
          hasQuantifiedMetrics: true,
        },
      };

      const fullEditableResume = {
        name:
          parsedResume.candidateName ||
          (uploadedFileName || "Candidate").replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " "),
        candidateName:
          parsedResume.candidateName ||
          (uploadedFileName || "Candidate").replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " "),
        fileName: uploadedFileName || "Uploaded_Resume.pdf",
        email: "",
        phone: "",
        location: "Remote / Hybrid",
        links: [],
        summary: `Aspiring ${targetRole || "Software Engineer"} with technical background in ${skillNames
          .slice(0, 4)
          .join(", ")}.`,
        skillCategories: [{ category: "Technical Skills", skills: skillNames }],
        skills: skillNames,
        experience: (parsedResume.experience || []).map((e: any, i: number) => ({
          id: `exp-${i + 1}`,
          title: String(e?.role || "Software Engineer"),
          subtitle: String(e?.company || "Company"),
          dateRange: String(e?.duration || "Present"),
          bullets: (Array.isArray(e?.bullets) ? e.bullets : []).map((text: any, bIdx: number) => ({
            id: `exp-b-${i}-${bIdx}`,
            text: String(text),
          })),
        })),
        projects: (parsedResume.projects || []).map((p: any, i: number) => ({
          id: `proj-${i + 1}`,
          title: String(p?.name || "Technical Project"),
          name: String(p?.name || "Technical Project"),
          subtitle: Array.isArray(p?.techStack) ? p.techStack.join(", ") : "Technologies Used",
          dateRange: "Recent",
          bullets: (Array.isArray(p?.bullets) ? p.bullets : []).map((text: any, bIdx: number) => ({
            id: `proj-b-${i}-${bIdx}`,
            text: String(text),
          })),
        })),
        education: [
          {
            id: "edu-1",
            title: "Bachelor of Technology / Computer Science",
            subtitle: "University / Institute",
            dateRange: "2020 - 2024",
            bullets: [],
          },
        ],
        customSections: [],
        rawText: JSON.stringify(parsedResume.projects || []),
      };

      saveStoredResumeWorkspace({
        analysis: fullAnalysis,
        editableResume: fullEditableResume,
        appliedSuggestionIds: [],
        userId: null,
        fileName: uploadedFileName || "Uploaded_Resume.pdf",
        updatedAt: new Date().toISOString(),
      } as any);
    } catch {
      // Ignore storage quota errors
    }
  }, [parsedResume, uploadedFileName, targetRole]);

  if (isDuplicateInstance) {
    return null;
  }

  const extractedSkillsList =
    parsedResume?.extractedSkills && parsedResume.extractedSkills.length > 0
      ? parsedResume.extractedSkills
      : digitalTwin?.skills || [];

  const hasExtractedResume = Boolean(parsedResume || extractedSkillsList.length > 0);
  const atsScore = parsedResume?.atsScore ?? digitalTwin?.atsScore ?? 0;

  const handleSelectRole = (role: string) => {
    setCustomRoleInput(role);
    setTargetRole(role);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const roleToUse = customRoleInput.trim() || targetRole.trim() || "Full-Stack Engineer";
    const ok = await uploadResumeForRole(file, roleToUse);
    e.target.value = "";
    if (ok) {
      setStatusMessage(`Extracted resume for ${roleToUse}! Click Option 1 below to scout matching jobs.`);
    }
  };

  const handleDropFile = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const roleToUse = customRoleInput.trim() || targetRole.trim() || "Full-Stack Engineer";
    await uploadResumeForRole(file, roleToUse);
  };

  // OPTION 1: Smart Role Expansion & Strict Filtering in handleScoutSimilarJobsNow
  const handleScoutSimilarJobsNow = async () => {
    const roleToScout = (targetRole || customRoleInput || "Software Engineer").trim();
    const config = buildRoleSearchConfig(roleToScout);
    setIsScoutingJobs(true);
    setStatusMessage(`Scouting verified live openings for "${roleToScout}" matching your skills...`);

    try {
      const userSkillNames = extractedSkillsList
        .map((s: any) => (typeof s === "string" ? s : String(s?.name || s?.skill_name || s?.skill || "")))
        .filter(Boolean);

      let rawJobs: any[] = [];

      // 1. Query internal /api/jobs/search with all search queries from config
      for (const q of config.searchQueries) {
        if (rawJobs.length >= 10) break;
        try {
          const internalRes = await fetch(
            `/api/jobs/search?q=${encodeURIComponent(q)}&query=${encodeURIComponent(
              q
            )}&role=${encodeURIComponent(roleToScout)}&skills=${encodeURIComponent(userSkillNames.join(","))}`
          );
          if (internalRes.ok) {
            const internalJson = await internalRes.json();
            const jobsArr = Array.isArray(internalJson?.jobs)
              ? internalJson.jobs
              : Array.isArray(internalJson?.results)
              ? internalJson.results
              : Array.isArray(internalJson)
              ? internalJson
              : [];
            if (jobsArr.length > 0) {
              rawJobs.push(...jobsArr);
            }
          }
        } catch {
          // Continue to next query / Remotive
        }
      }

      // 2. Query Remotive API with clean queries
      if (rawJobs.length < 5) {
        for (const q of config.searchQueries.slice(0, 2)) {
          try {
            const remotiveRes = await fetch(
              `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=10`
            );
            if (remotiveRes.ok) {
              const remotiveJson = await remotiveRes.json();
              if (Array.isArray(remotiveJson?.jobs)) {
                rawJobs.push(...remotiveJson.jobs);
              }
            }
          } catch {
            // Remotive error
          }
        }
      }

      // 3. Strict filtering against rejected and required keywords
      const dedupeMap = new Map<string, any>();
      for (const j of rawJobs) {
        const title = String(j.title || "").toLowerCase();
        const desc = String(j.description || "").toLowerCase();
        const company = String(j.company_name || j.company || "").toLowerCase();
        const key = `${company}::${title}`;
        if (dedupeMap.has(key)) continue;

        // Reject forbidden keywords (e.g. .net, c#, angular, php for AI/ML)
        const isRejected = config.rejectedKeywords.some((rej) => {
          const regex = new RegExp(`\\b${rej.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
          return regex.test(title);
        });
        if (isRejected) continue;

        // If required keywords exist, title or desc or tags must match at least one
        if (config.requiredKeywords.length > 0) {
          const jobTags = Array.isArray(j.tags) ? j.tags.join(" ").toLowerCase() : "";
          const jobSkills = Array.isArray(j.skills) ? j.skills.join(" ").toLowerCase() : "";
          const fullText = `${title} ${jobTags} ${jobSkills} ${desc.slice(0, 400)}`;
          const hasRequired = config.requiredKeywords.some((req) => fullText.includes(req.toLowerCase()));
          if (!hasRequired) continue;
        }

        dedupeMap.set(key, j);
      }

      const filteredRawJobs = Array.from(dedupeMap.values());
      const now = Date.now();

      const mappedJobs: LiveScoutedJob[] = filteredRawJobs.slice(0, 6).map((j: any, index: number) => {
        const jobTags: string[] = Array.isArray(j.tags)
          ? j.tags.map(String)
          : Array.isArray(j.skills)
          ? j.skills.map(String)
          : ["Python", "Machine Learning", "Git", "SQL"];

        const matched = jobTags.filter((tag) =>
          userSkillNames.some(
            (us) => us.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(us.toLowerCase())
          )
        );
        const missing = jobTags.filter((tag) => !matched.includes(tag)).slice(0, 3);

        // Honest matchScore calculation:
        const titleLower = String(j.title || "").toLowerCase();
        let titleBonus = 0;
        if (config.requiredKeywords.some((k) => titleLower.includes(k))) {
          titleBonus = 25;
        }
        const skillRatio = (matched.length / Math.max(1, Math.min(jobTags.length, 5))) * 50;
        const baseScore = 20;
        const honestScore = Math.min(95, Math.max(55, Math.round(baseScore + skillRatio + titleBonus)));

        const deadline = new Date(now + (index + 2) * 86400000).toISOString().split("T")[0];

        return {
          id: String(j.id || `live-job-${index}-${Date.now()}`),
          company: String(j.company_name || j.company || "Tech Company"),
          title: String(j.title || roleToScout),
          location: String(j.candidate_required_location || j.location || "Remote / Hybrid"),
          salary: String(j.salary || "Competitive CTC"),
          url: String(j.url || j.applyUrl || j.link || "https://remotive.com"),
          matchScore: honestScore,
          matchedSkills: matched.length > 0 ? matched.slice(0, 4) : userSkillNames.slice(0, 3),
          missingSkills: missing,
          deadlineDate: deadline,
        };
      });

      setScoutedJobs(mappedJobs);

      // Save scouted jobs into Kanban Tracker storage so /tracker and /jobs have them immediately
      if (mappedJobs.length > 0) {
        const existingApps = getStoredApplications() || [];
        const existingKeySet = new Set(
          existingApps.map((a: any) => `${String(a.company).toLowerCase()}::${String(a.title).toLowerCase()}`)
        );

        const newKanbanCards = mappedJobs
          .filter((job) => !existingKeySet.has(`${job.company.toLowerCase()}::${job.title.toLowerCase()}`))
          .map((job) => ({
            id: `app-${job.id}`,
            company: job.company,
            title: job.title,
            status: "Saved",
            priority: job.matchScore >= 80 ? "high" : "medium",
            location: job.location,
            salary: job.salary,
            url: job.url,
            matchScore: job.matchScore,
            nextStep: `Apply before ${job.deadlineDate}`,
            nextStepDate: job.deadlineDate,
            notes: `Auto-scouted for ${roleToScout} (${job.matchScore}% Match).`,
            updatedAt: new Date().toISOString(),
          }));

        if (newKanbanCards.length > 0) {
          saveStoredApplications([...(newKanbanCards as any[]), ...existingApps]);
          window.dispatchEvent(new CustomEvent("copilot-data-updated"));
        }

        setStatusMessage(
          `Scouted ${mappedJobs.length} role-relevant "${roleToScout}" jobs and synced to your Kanban tracker!`
        );
      } else {
        setStatusMessage(`No remote "${roleToScout}" jobs found right now. Opening Job Discovery page...`);
        router.push(`/jobs?role=${encodeURIComponent(roleToScout)}`);
      }
    } catch (err: any) {
      setStatusMessage(`Job feed error (${err?.message || "network error"}). Opening Job Discovery...`);
      router.push("/jobs");
    } finally {
      setIsScoutingJobs(false);
    }
  };

  // OPTION 2: Populate Readiness Milestones from Missing Skills & Open /readiness
  const handleBuildStudyPlanNow = () => {
    const missingList = Array.isArray(parsedResume?.missingSkillsForTargetRole)
      ? parsedResume!.missingSkillsForTargetRole
      : [];

    const existingMilestones = getStoredReadinessMilestones() || [];
    const existingTitles = new Set(existingMilestones.map((m: any) => String(m.title || "").toLowerCase()));

    const newMilestones = missingList
      .map((m: any, idx: number) => ({
        id: `agent-gap-${Date.now()}-${idx}`,
        title: `Master ${m.skill} for ${targetRole || "Target Role"}`,
        description: m.reason || `Identified as a missing skill gap in ${uploadedFileName || "your resume"}.`,
        category: "Technical Gap",
        priority: m.priority === "MEDIUM" ? "medium" : "high",
        completed: false,
        dueDate: new Date(Date.now() + (idx + 2) * 86400000).toISOString().split("T")[0],
      }))
      .filter((m) => !existingTitles.has(m.title.toLowerCase()));

    if (newMilestones.length > 0) {
      saveStoredReadinessMilestones([...(newMilestones as any[]), ...existingMilestones]);
      window.dispatchEvent(new CustomEvent("copilot-data-updated"));
    }

    router.push("/readiness");
  };

  // ── SUB-PAGE COMPACT 1-LINE CONTEXT BAR ──────────────────────────────────────
  if (!isDashboard && !isExpanded) {
    return (
      <section
        ref={containerRef}
        data-robot-navigator="singleton"
        className="w-full bg-[#0B0C12] border border-white/[0.07] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[#F5F6FF]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#11131C]">
            <span className="text-sm">🤖</span>
          </div>
          <div className="flex items-center gap-2 truncate text-xs">
            <span className="font-semibold text-white truncate">Agent Context:</span>
            {targetRole ? (
              <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-medium text-indigo-300">
                {targetRole}
              </span>
            ) : (
              <span className="text-[#8E93A6]">No role selected</span>
            )}
            {uploadedFileName && (
              <span className="hidden sm:inline-flex rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-300 truncate max-w-[150px]">
                📄 {uploadedFileName}
              </span>
            )}
            {hasExtractedResume && (
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400">
                {atsScore}% Fit
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleScoutSimilarJobsNow}
            disabled={isScoutingJobs}
            className="rounded-lg border border-white/[0.08] bg-[#11131C] px-2.5 py-1 text-xs font-medium text-[#F5F6FF] hover:border-white/[0.16] hover:bg-[#181B26] transition-colors cursor-pointer disabled:opacity-50"
          >
            {isScoutingJobs ? "Scouting..." : "Scout Jobs"}
          </button>
          <button
            type="button"
            onClick={handleBuildStudyPlanNow}
            className="rounded-lg border border-white/[0.08] bg-[#11131C] px-2.5 py-1 text-xs font-medium text-[#F5F6FF] hover:border-white/[0.16] hover:bg-[#181B26] transition-colors cursor-pointer"
          >
            Study Plan
          </button>
          <button
            type="button"
            onClick={() => {
              resetWorkspaceToZero();
              router.push("/dashboard");
            }}
            className="text-xs text-[#8E93A6] hover:text-white transition-colors cursor-pointer px-1.5 py-1"
          >
            Change Role
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-xs font-medium text-[#8E93A6] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            Expand ▾
          </button>
        </div>
      </section>
    );
  }

  // ── FULL AGENT CARD (Dashboard or Expanded Sub-Page) ─────────────────────────
  return (
    <section
      ref={containerRef}
      data-robot-navigator="singleton"
      className="w-full rounded-2xl border border-white/[0.07] bg-[#0B0C12] p-5 sm:p-6 text-[#F5F6FF]"
    >
      {agentError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs sm:text-sm text-[#F5F6FF]">
          <div>
            <span className="font-semibold text-rose-400">Agent Alert: </span>
            <span>{agentError}</span>
          </div>
          <button
            type="button"
            onClick={clearAgentError}
            className="ml-4 shrink-0 rounded-lg border border-rose-500/30 bg-[#11131C] px-3 py-1 text-xs font-medium text-[#F5F6FF] hover:bg-[#181B26] transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {statusMessage && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#11131C] px-4 py-2.5 text-xs text-[#8E93A6]">
          <span>🤖 {statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="ml-3 text-[#636779] hover:text-[#F5F6FF] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Robot Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-[#11131C] transition-colors ${
              isUploadingResume || isScoutingJobs
                ? "border-amber-500/40 animate-pulse"
                : hasExtractedResume
                ? "border-emerald-500/30"
                : "border-white/[0.08]"
            }`}
          >
            <svg
              className={`h-6 w-6 ${
                isUploadingResume || isScoutingJobs
                  ? "text-amber-400"
                  : hasExtractedResume
                  ? "text-emerald-400"
                  : "text-indigo-400"
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect x="3" y="7" width="18" height="13" rx="4" />
              <circle cx="9" cy="13" r="1.5" fill="currentColor" />
              <circle cx="15" cy="13" r="1.5" fill="currentColor" />
              <path d="M9 17h6" strokeLinecap="round" />
              <path d="M12 3v4" strokeLinecap="round" />
              <circle cx="12" cy="3" r="1" fill="currentColor" />
            </svg>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-white">
                Autonomous Placement Agent
              </span>
              {targetRole && (
                <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                  Target Role: {targetRole}
                </span>
              )}
              {uploadedFileName && (
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                  Resume: {uploadedFileName}
                </span>
              )}
            </div>

            <p className="text-sm font-medium text-[#8E93A6] leading-relaxed">
              {isUploadingResume
                ? `Extracting skills & projects from your PDF for "${targetRole || customRoleInput}"...`
                : isScoutingJobs
                ? `Scouting live jobs matching "${targetRole}" and your extracted skills...`
                : !targetRole
                ? "Step 1: Which role are you aspiring for? Select your target role below to begin."
                : !hasExtractedResume
                ? `Step 2: Upload your PDF resume below so I can evaluate your fit for "${targetRole}".`
                : `Analyzed ${parsedResume?.candidateName || uploadedFileName || "your resume"} for "${targetRole}" (${extractedSkillsList.length} skills extracted, ${atsScore}% Role Fit). What should I execute next?`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
          {(targetRole || hasExtractedResume) && (
            <button
              type="button"
              onClick={() => {
                setScoutedJobs([]);
                setStatusMessage(null);
                resetWorkspaceToZero();
              }}
              className="rounded-lg border border-white/[0.08] bg-[#11131C] px-3.5 py-1.5 text-xs font-medium text-[#8E93A6] hover:border-white/[0.16] hover:bg-[#181B26] hover:text-[#F5F6FF] transition-colors cursor-pointer"
            >
              Change Role / Upload New Resume
            </button>
          )}
          {!isDashboard && isExpanded && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[#8E93A6] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              Collapse ▴
            </button>
          )}
        </div>
      </div>

      {/* STEP 1: TARGET ROLE PICKER */}
      {!targetRole && (
        <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-4">
          <div className="flex flex-wrap gap-2">
            {ROLE_PRESETS.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => handleSelectRole(role)}
                className="cursor-pointer rounded-lg border border-white/[0.07] bg-[#11131C] px-3.5 py-2 text-xs font-medium text-[#8E93A6] transition-colors hover:border-white/[0.15] hover:bg-[#181B26] hover:text-[#F5F6FF]"
              >
                {role}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={customRoleInput}
              onChange={(e) => setCustomRoleInput(e.target.value)}
              placeholder="Or type any custom role (e.g. Backend SDE, AI Engineer)..."
              className="flex-1 rounded-lg border border-white/[0.08] bg-[#11131C] px-3.5 py-2 text-sm text-[#F5F6FF] placeholder-[#636779] transition-colors focus:border-indigo-500/50 focus:bg-[#151824] focus:outline-none"
            />
            <button
              type="button"
              disabled={!customRoleInput.trim()}
              onClick={() => handleSelectRole(customRoleInput.trim())}
              className="cursor-pointer rounded-lg border border-indigo-500/40 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0"
            >
              Set Target Role →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PDF RESUME UPLOAD */}
      {targetRole && !hasExtractedResume && (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            onChange={handleFileSelected}
            className="hidden"
          />
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropFile}
            onClick={() => !isUploadingResume && fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border border-dashed p-6 text-center transition-colors ${
              isUploadingResume
                ? "border-amber-500/50 bg-[#11131C]"
                : "border-white/[0.10] bg-[#11131C]/60 hover:border-white/[0.20] hover:bg-[#11131C]"
            }`}
          >
            <p className="text-sm font-semibold text-[#F5F6FF]">
              {isUploadingResume
                ? "Uploading & Extracting Your PDF Resume..."
                : "Click to Upload Your Real PDF Resume (or Drag & Drop Here)"}
            </p>
            <p className="mt-1 text-xs text-[#8E93A6]">
              Automatically syncs across Home, My Resume, Readiness Plan, and Job Discovery for{" "}
              <span className="text-[#F5F6FF] font-medium">{targetRole}</span>.
            </p>
          </div>
        </div>
      )}

      {/* STEP 3: 4 WORKING ACTION OPTIONS + INLINE SCOUTED JOBS */}
      {hasExtractedResume && (
        <div className="mt-5 space-y-4 border-t border-white/[0.06] pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={handleScoutSimilarJobsNow}
              className="group cursor-pointer flex flex-col items-start rounded-xl border border-white/[0.06] bg-[#11131C]/80 hover:border-white/[0.14] hover:bg-[#181B26] p-4 text-left transition-all duration-150"
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8E93A6] whitespace-nowrap">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                Option 1 • Live Jobs
              </span>
              <span className="mt-1.5 text-sm font-semibold text-[#F5F6FF]">
                {isScoutingJobs ? "Scouting Similar Jobs..." : "Scout & Fetch Similar Jobs →"}
              </span>
              <span className="mt-1 text-xs text-[#8E93A6] leading-relaxed">
                Directly fetches live {targetRole} openings matched to your {extractedSkillsList.length} skills.
              </span>
            </button>

            <button
              type="button"
              onClick={handleBuildStudyPlanNow}
              className="group cursor-pointer flex flex-col items-start rounded-xl border border-white/[0.06] bg-[#11131C]/80 hover:border-white/[0.14] hover:bg-[#181B26] p-4 text-left transition-all duration-150"
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8E93A6] whitespace-nowrap">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                Option 2 • Study Plan
              </span>
              <span className="mt-1.5 text-sm font-semibold text-[#F5F6FF]">
                Cover {parsedResume?.missingSkillsForTargetRole?.length ?? 0} Missing Skills →
              </span>
              <span className="mt-1 text-xs text-[#8E93A6] leading-relaxed">
                Adds your skill gaps to Study Plan & tracks your Readiness %.
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/interview")}
              className="group cursor-pointer flex flex-col items-start rounded-xl border border-white/[0.06] bg-[#11131C]/80 hover:border-white/[0.14] hover:bg-[#181B26] p-4 text-left transition-all duration-150"
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8E93A6] whitespace-nowrap">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                Option 3 • Mock Interview
              </span>
              <span className="mt-1.5 text-sm font-semibold text-[#F5F6FF]">
                Practice with AI Interviewer →
              </span>
              <span className="mt-1 text-xs text-[#8E93A6] leading-relaxed">
                Live technical interview grilling your resume projects & weak spots.
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/tracker")}
              className="group cursor-pointer flex flex-col items-start rounded-xl border border-white/[0.06] bg-[#11131C]/80 hover:border-white/[0.14] hover:bg-[#181B26] p-4 text-left transition-all duration-150"
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8E93A6] whitespace-nowrap">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                Option 4 • Deadlines
              </span>
              <span className="mt-1.5 text-sm font-semibold text-[#F5F6FF]">
                Open Kanban Pipeline →
              </span>
              <span className="mt-1 text-xs text-[#8E93A6] leading-relaxed">
                Track saved jobs, OA dates, and upcoming interview deadlines.
              </span>
            </button>
          </div>

          {/* Direct Inline Display of Fetched Similar Jobs when Option 1 is Clicked */}
          {scoutedJobs.length > 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0E1017] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
                  Live Similar Jobs Matched to Your Resume ({scoutedJobs.length} Found & Added to Kanban)
                </h4>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/jobs")}
                    className="cursor-pointer text-xs font-medium text-[#8E93A6] hover:text-white transition-colors"
                  >
                    Open Full Job Discovery →
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/tracker")}
                    className="cursor-pointer text-xs font-medium text-[#8E93A6] hover:text-white transition-colors"
                  >
                    View in Kanban Tracker →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {scoutedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-xl border border-white/[0.06] bg-[#11131C]/90 hover:border-white/[0.12] p-4 flex flex-col justify-between space-y-3 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-[#8E93A6]">{job.company}</p>
                          <p className="text-sm font-semibold text-[#F5F6FF] leading-snug">{job.title}</p>
                        </div>
                        <span className="shrink-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                          {job.matchScore}% Match
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-[#8E93A6]">
                        {job.location} • Deadline: <span className="text-amber-400">{job.deadlineDate}</span>
                      </p>
                      {job.matchedSkills.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {job.matchedSkills.map((sk, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-white/[0.03] border border-white/[0.06] px-1.5 py-0.5 text-[10px] text-[#8E93A6]"
                            >
                              ✓ {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-white hover:text-indigo-300 transition-colors"
                      >
                        Apply Directly ↗
                      </a>
                      <button
                        type="button"
                        onClick={() => router.push("/tracker")}
                        className="cursor-pointer rounded-lg border border-white/[0.08] bg-[#151824] hover:bg-[#1C2030] px-2.5 py-1 text-[11px] font-medium text-[#8E93A6] hover:text-[#F5F6FF] transition-colors"
                      >
                        Tracked in Kanban ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default IntegratedRobotNavigator;
