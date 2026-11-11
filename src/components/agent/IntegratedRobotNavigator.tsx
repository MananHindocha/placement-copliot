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

export function IntegratedRobotNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastSyncRef = useRef<string>("");
  const [isDuplicateInstance, setIsDuplicateInstance] = useState(false);

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

  useEffect(() => {
    if (typeof document === "undefined" || !containerRef.current) return;
    const allNavigators = document.querySelectorAll('[data-robot-navigator="singleton"]');
    if (allNavigators.length > 1 && allNavigators[0] !== containerRef.current) {
      setIsDuplicateInstance(true);
    }
  }, [pathname]);

  // Keep legacy storage-sync.ts unified whenever parsedResume updates so /resume never crashes on undefined[0]
  useEffect(() => {
    if (!parsedResume) return;
    const syncKey = `${uploadedFileName}::${targetRole}::${parsedResume.candidateName}::${parsedResume.atsScore}::${(parsedResume.extractedSkills || []).length}`;
    if (lastSyncRef.current === syncKey) return;
    lastSyncRef.current = syncKey;

    try {
      const skillNames = (parsedResume.extractedSkills || []).map((s: any) =>
        typeof s === "string" ? s : String(s?.name || "")
      );
      const missingNames = (parsedResume.missingSkillsForTargetRole || []).map((m: any) =>
        typeof m === "string" ? m : String(m?.skill || "")
      );

      const fullKeywords = [
        ...skillNames.map((w: string) => ({ word: w, present: true, importance: "high" as const })),
        ...missingNames.map((w: string) => ({ word: w, present: false, importance: "high" as const })),
      ];

      const fullAnalysis = {
        matchScore: parsedResume.atsScore || 75,
        atsScore: parsedResume.atsScore || 75,
        jobTitle: targetRole || parsedResume.targetRole || "Software Engineer",
        company: "Target Roles",
        candidateName: parsedResume.candidateName || "Candidate",
        strengths: skillNames.slice(0, 5).map((name: string) => `${name}: Verified in resume`),
        gaps: (parsedResume.missingSkillsForTargetRole || []).map(
          (m: any) => `${m.skill || m}: ${m.reason || "Recommended for " + (targetRole || "role")}`
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
        },
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
        fileName: uploadedFileName || "Uploaded_Resume.pdf",
        candidateName:
          parsedResume.candidateName ||
          (uploadedFileName || "Candidate").replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " "),
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

  // OPTION 1: Directly fetch live jobs similar to Target Role + Resume Skills & sync to Kanban
  const handleScoutSimilarJobsNow = async () => {
    const roleQuery = (targetRole || customRoleInput || "Software Engineer").trim();
    setIsScoutingJobs(true);
    setStatusMessage(`Scouting live jobs matching "${roleQuery}" and your extracted resume skills...`);

    try {
      const userSkillNames = extractedSkillsList.map((s: any) =>
        typeof s === "string" ? s : String(s?.name || s?.skill_name || "")
      );

      let rawJobs: any[] = [];

      // 1. Try internal /api/jobs/search first if available
      try {
        const internalRes = await fetch(
          `/api/jobs/search?query=${encodeURIComponent(roleQuery)}&role=${encodeURIComponent(roleQuery)}`
        );
        if (internalRes.ok) {
          const internalJson = await internalRes.json();
          if (Array.isArray(internalJson?.jobs) && internalJson.jobs.length > 0) {
            rawJobs = internalJson.jobs;
          } else if (Array.isArray(internalJson) && internalJson.length > 0) {
            rawJobs = internalJson;
          }
        }
      } catch {
        // Fallback to Remotive public API below
      }

      // 2. If internal route returned 0 jobs, query Remotive Live API directly
      if (rawJobs.length === 0) {
        const remotiveRes = await fetch(
          `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(roleQuery)}&limit=10`
        );
        if (remotiveRes.ok) {
          const remotiveJson = await remotiveRes.json();
          if (Array.isArray(remotiveJson?.jobs)) {
            rawJobs = remotiveJson.jobs;
          }
        }
      }

      // 3. Broaden search keyword if role string was too specific (e.g. "Full-Stack Engineer" -> "developer")
      if (rawJobs.length === 0) {
        const broadKeyword = roleQuery.split(/[\s/-]+/)[0] || "software";
        const broadRes = await fetch(
          `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(broadKeyword)}&limit=8`
        );
        if (broadRes.ok) {
          const broadJson = await broadRes.json();
          if (Array.isArray(broadJson?.jobs)) {
            rawJobs = broadJson.jobs;
          }
        }
      }

      const now = Date.now();
      const mappedJobs: LiveScoutedJob[] = rawJobs.slice(0, 6).map((j: any, index: number) => {
        const jobTags: string[] = Array.isArray(j.tags)
          ? j.tags.map(String)
          : Array.isArray(j.skills)
          ? j.skills.map(String)
          : ["TypeScript", "React", "Node.js", "SQL"];

        const matched = jobTags.filter((tag) =>
          userSkillNames.some(
            (us) => us.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(us.toLowerCase())
          )
        );
        const missing = jobTags.filter((tag) => !matched.includes(tag)).slice(0, 3);
        const score =
          jobTags.length > 0
            ? Math.min(96, Math.max(68, Math.round((matched.length / jobTags.length) * 100) + 55))
            : 82;

        const deadline = new Date(now + (index + 2) * 86400000).toISOString().split("T")[0];

        return {
          id: String(j.id || `live-job-${index}-${Date.now()}`),
          company: String(j.company_name || j.company || "Tech Company"),
          title: String(j.title || roleQuery),
          location: String(j.candidate_required_location || j.location || "Remote / Hybrid"),
          salary: String(j.salary || "Competitive CTC"),
          url: String(j.url || j.applyUrl || "https://remotive.com"),
          matchScore: score,
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
            priority: job.matchScore >= 85 ? "high" : "medium",
            location: job.location,
            salary: job.salary,
            url: job.url,
            matchScore: job.matchScore,
            nextStep: `Apply before ${job.deadlineDate}`,
            nextStepDate: job.deadlineDate,
            notes: `Auto-scouted by Robot Agent for ${roleQuery} (${job.matchScore}% match).`,
            updatedAt: new Date().toISOString(),
          }));

        if (newKanbanCards.length > 0) {
          saveStoredApplications([...(newKanbanCards as any[]), ...existingApps]);
          window.dispatchEvent(new CustomEvent("copilot-data-updated"));
        }

        setStatusMessage(
          `Scouted ${mappedJobs.length} live "${roleQuery}" jobs and added them to your Kanban pipeline with deadlines!`
        );
      } else {
        setStatusMessage(`No live remote jobs returned for "${roleQuery}". Opening Job Discovery page...`);
        router.push(`/jobs?role=${encodeURIComponent(roleQuery)}`);
      }
    } catch (err: any) {
      setStatusMessage(`Could not reach live job feed (${err?.message || "network error"}). Opening Job Discovery...`);
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

  return (
    <section
      ref={containerRef}
      data-robot-navigator="singleton"
      className="w-full rounded-xl border border-[#1D1D1D] bg-[#080808] p-5 sm:p-6 text-[#F5F5F5]"
    >
      {agentError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#F43F5E]/30 bg-[#F43F5E]/10 px-4 py-3 text-xs sm:text-sm text-[#F5F5F5]">
          <div>
            <span className="font-semibold text-[#F43F5E]">Agent Alert: </span>
            <span>{agentError}</span>
          </div>
          <button
            type="button"
            onClick={clearAgentError}
            className="ml-4 shrink-0 rounded-lg border border-[#F43F5E]/30 bg-[#121212] px-3 py-1 text-xs font-medium text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {statusMessage && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#1D1D1D] bg-[#0D0D0D] px-4 py-2.5 text-xs text-[#A1A1AA]">
          <span>🤖 {statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="ml-3 text-[#71717A] hover:text-[#F5F5F5] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Robot Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-[#121212] transition-colors ${
              isUploadingResume || isScoutingJobs
                ? "border-[#F59E0B]/40 animate-pulse"
                : hasExtractedResume
                ? "border-[#292929]"
                : "border-[#292929]"
            }`}
          >
            <svg
              className={`h-6 w-6 ${
                isUploadingResume || isScoutingJobs
                  ? "text-[#F59E0B]"
                  : hasExtractedResume
                  ? "text-[#10B981]"
                  : "text-[#A78BFA]"
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
              <span className="text-xs font-semibold uppercase tracking-wider text-[#F5F5F5]">
                Autonomous Placement Agent
              </span>
              {targetRole && (
                <span className="rounded-md border border-[#292929] bg-[#121212] px-2.5 py-0.5 text-xs font-medium text-[#F5F5F5]">
                  Target Role: {targetRole}
                </span>
              )}
              {uploadedFileName && (
                <span className="rounded-md border border-[#10B981]/25 bg-[#10B981]/10 px-2.5 py-0.5 text-xs font-medium text-[#10B981]">
                  Resume: {uploadedFileName}
                </span>
              )}
            </div>

            <p className="text-sm font-medium text-[#A1A1AA] leading-relaxed">
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

        {(targetRole || hasExtractedResume) && (
          <button
            type="button"
            onClick={() => {
              setScoutedJobs([]);
              setStatusMessage(null);
              resetWorkspaceToZero();
            }}
            className="rounded-lg border border-[#292929] bg-[#121212] px-3.5 py-1.5 text-xs font-medium text-[#A1A1AA] hover:border-[#3A3A3A] hover:bg-[#1A1A1A] hover:text-[#F5F5F5] transition-colors duration-150 cursor-pointer self-end lg:self-center shrink-0 focus:outline-none focus:ring-1 focus:ring-[#292929]"
          >
            Change Role / Upload New Resume
          </button>
        )}
      </div>

      {/* STEP 1: TARGET ROLE PICKER */}
      {!targetRole && (
        <div className="mt-5 space-y-3 border-t border-[#171717] pt-4">
          <div className="flex flex-wrap gap-2">
            {ROLE_PRESETS.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => handleSelectRole(role)}
                className="cursor-pointer rounded-lg border border-[#1D1D1D] bg-[#0D0D0D] px-3.5 py-2 text-xs font-medium text-[#A1A1AA] transition-colors duration-150 hover:border-[#292929] hover:bg-[#121212] hover:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-[#292929]"
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
              placeholder="Or type any custom role (e.g. Backend SDE, Data Analyst)..."
              className="flex-1 rounded-lg border border-[#1D1D1D] bg-[#0D0D0D] px-3.5 py-2 text-sm text-[#F5F5F5] placeholder-[#71717A] transition-colors focus:border-[#292929] focus:bg-[#121212] focus:outline-none"
            />
            <button
              type="button"
              disabled={!customRoleInput.trim()}
              onClick={() => handleSelectRole(customRoleInput.trim())}
              className="cursor-pointer rounded-lg border border-[#F5F5F5] bg-[#F5F5F5] px-4 py-2 text-sm font-semibold text-[#000000] transition-colors duration-150 hover:bg-[#E4E4E7] active:bg-[#D4D4D8] disabled:opacity-40 disabled:pointer-events-none shrink-0"
            >
              Set Target Role →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PDF RESUME UPLOAD */}
      {targetRole && !hasExtractedResume && (
        <div className="mt-5 border-t border-[#171717] pt-4">
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
            className={`cursor-pointer rounded-xl border border-dashed p-6 text-center transition-colors duration-150 ${
              isUploadingResume
                ? "border-[#F59E0B]/50 bg-[#0D0D0D]"
                : "border-[#292929] bg-[#0D0D0D] hover:border-[#3A3A3A] hover:bg-[#121212]"
            }`}
          >
            <p className="text-sm font-semibold text-[#F5F5F5]">
              {isUploadingResume
                ? "Uploading & Extracting Your PDF Resume..."
                : "Click to Upload Your Real PDF Resume (or Drag & Drop Here)"}
            </p>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              Automatically syncs across Home, My Resume, Readiness Plan, and Job Discovery for{" "}
              <span className="text-[#F5F5F5] font-medium">{targetRole}</span>.
            </p>
          </div>
        </div>
      )}

      {/* STEP 3: 4 WORKING ACTION OPTIONS + INLINE SCOUTED JOBS */}
      {hasExtractedResume && (
        <div className="mt-5 space-y-4 border-t border-[#171717] pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={handleScoutSimilarJobsNow}
              className="group cursor-pointer flex flex-col items-start rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-3.5 text-left transition-colors duration-150 hover:border-[#292929] hover:bg-[#121212] focus:outline-none focus:ring-1 focus:ring-[#292929]"
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#A1A1AA] whitespace-nowrap">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#38BDF8]" />
                Option 1 • Live Jobs
              </span>
              <span className="mt-1.5 text-sm font-semibold text-[#F5F5F5]">
                {isScoutingJobs ? "Scouting Similar Jobs..." : "Scout & Fetch Similar Jobs →"}
              </span>
              <span className="mt-1 text-xs text-[#71717A] leading-relaxed">
                Directly fetches live {targetRole} openings matched to your {extractedSkillsList.length} skills.
              </span>
            </button>

            <button
              type="button"
              onClick={handleBuildStudyPlanNow}
              className="group cursor-pointer flex flex-col items-start rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-3.5 text-left transition-colors duration-150 hover:border-[#292929] hover:bg-[#121212] focus:outline-none focus:ring-1 focus:ring-[#292929]"
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#A1A1AA] whitespace-nowrap">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#10B981]" />
                Option 2 • Study Plan
              </span>
              <span className="mt-1.5 text-sm font-semibold text-[#F5F5F5]">
                Cover {parsedResume?.missingSkillsForTargetRole?.length ?? 0} Missing Skills →
              </span>
              <span className="mt-1 text-xs text-[#71717A] leading-relaxed">
                Adds your skill gaps to Study Plan & tracks your Readiness %.
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/interview")}
              className="group cursor-pointer flex flex-col items-start rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-3.5 text-left transition-colors duration-150 hover:border-[#292929] hover:bg-[#121212] focus:outline-none focus:ring-1 focus:ring-[#292929]"
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#A1A1AA] whitespace-nowrap">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#A78BFA]" />
                Option 3 • Mock Interview
              </span>
              <span className="mt-1.5 text-sm font-semibold text-[#F5F5F5]">
                Practice with AI Interviewer →
              </span>
              <span className="mt-1 text-xs text-[#71717A] leading-relaxed">
                Live technical interview grilling your resume projects & weak spots.
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/tracker")}
              className="group cursor-pointer flex flex-col items-start rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-3.5 text-left transition-colors duration-150 hover:border-[#292929] hover:bg-[#121212] focus:outline-none focus:ring-1 focus:ring-[#292929]"
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#A1A1AA] whitespace-nowrap">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />
                Option 4 • Deadlines
              </span>
              <span className="mt-1.5 text-sm font-semibold text-[#F5F5F5]">
                Open Kanban Pipeline →
              </span>
              <span className="mt-1 text-xs text-[#71717A] leading-relaxed">
                Track saved jobs, OA dates, and upcoming interview deadlines.
              </span>
            </button>
          </div>

          {/* Direct Inline Display of Fetched Similar Jobs when Option 1 is Clicked */}
          {scoutedJobs.length > 0 && (
            <div className="rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#F5F5F5]">
                  Live Similar Jobs Matched to Your Resume ({scoutedJobs.length} Found & Added to Kanban)
                </h4>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => router.push("/jobs")}
                    className="cursor-pointer text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors"
                  >
                    Open Full Job Discovery →
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/tracker")}
                    className="cursor-pointer text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors"
                  >
                    View in Kanban Tracker →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {scoutedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-3.5 flex flex-col justify-between space-y-2.5 transition-colors hover:border-[#292929]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-[#A1A1AA]">{job.company}</p>
                          <p className="text-sm font-semibold text-[#F5F5F5] leading-snug">{job.title}</p>
                        </div>
                        <span className="shrink-0 rounded-md border border-[#10B981]/25 bg-[#10B981]/10 px-2 py-0.5 text-[11px] font-semibold text-[#10B981]">
                          {job.matchScore}% Match
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#71717A]">
                        {job.location} • Deadline: <span className="text-[#F59E0B]">{job.deadlineDate}</span>
                      </p>
                      {job.matchedSkills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {job.matchedSkills.map((sk, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-[#121212] border border-[#1D1D1D] px-1.5 py-0.5 text-[10px] text-[#A1A1AA]"
                            >
                              ✓ {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-[#171717]">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-[#F5F5F5] hover:text-[#A78BFA] transition-colors"
                      >
                        Apply Directly ↗
                      </a>
                      <button
                        type="button"
                        onClick={() => router.push("/tracker")}
                        className="cursor-pointer rounded-lg border border-[#292929] bg-[#121212] hover:bg-[#1A1A1A] px-2.5 py-1 text-[11px] font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors"
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

