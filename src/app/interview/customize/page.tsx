"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  ArrowLeft,
  Building2,
} from "lucide-react";
import { clsx } from "clsx";
import {
  type StudioQuestion,
  COMPANY_JD_PRESETS,
} from "@/components/interview/interview-common";
import { INTERVIEW_ROLES } from "@/lib/interview-questions";
import type { InterviewQuestion } from "@/types";
import {
  saveCustomInterviewSession,
  saveDraftCustomConfig,
  getDraftCustomConfig,
} from "@/lib/custom-interview-storage";
import LiveAgentInterviewRoom from "@/components/interview/LiveAgentInterviewRoom";

interface RawResumeProject {
  title?: string;
  subtitle?: string;
  bullets?: Array<string | { text?: string }>;
}

interface RawResumeExperience {
  title?: string;
  subtitle?: string;
  bullets?: Array<string | { text?: string }>;
}

export default function CustomizePage() {
  const router = useRouter();

  const [customRole, setCustomRole] = useState("Full-Stack SDE");
  const [customCompany, setCustomCompany] = useState("");
  const [customJdText, setCustomJdText] = useState("");
  const [customDifficulty, setCustomDifficulty] = useState<"Easy" | "Medium" | "Hard" | "Mixed">("Mixed");
  const [customFocusCategories, setCustomFocusCategories] = useState<string[]>([
    "core-technical",
    "resume-grill",
    "system-design",
    "behavioral",
    "debugging",
  ]);
  const [includeResumeContext, setIncludeResumeContext] = useState(true);
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const [liveAgentActive, setLiveAgentActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // LocalStorage Resume Detection
  const [detectedResume, setDetectedResume] = useState<{
    fileName: string;
    candidateName?: string;
    skills: string[];
    projects: Array<{ title: string; subtitle?: string; bullets: string[] }>;
    experience: Array<{ title: string; subtitle?: string; bullets: string[] }>;
  } | null>(null);

  // Restore draft configuration if available
  useEffect(() => {
    const draft = getDraftCustomConfig();
    if (draft) {
      if (draft.targetRole) setCustomRole(draft.targetRole);
      if (draft.targetCompany) setCustomCompany(draft.targetCompany);
      if (draft.jobDescription) setCustomJdText(draft.jobDescription);
      if (draft.difficulty) setCustomDifficulty(draft.difficulty);
      if (draft.selectedFocusAreas?.length) setCustomFocusCategories(draft.selectedFocusAreas);
    }
  }, []);

  // Detect resume from local storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("copilot_latest_resume_analysis");
      if (raw) {
        const workspace = JSON.parse(raw);
        const skills: string[] =
          workspace.editableResume?.skills?.length
            ? (workspace.editableResume.skills as string[])
            : (workspace.analysis?.skills as string[]) || [];
        const rawProjects = (workspace.editableResume?.projects as RawResumeProject[] | undefined) || [];
        const projects = rawProjects.map((p) => ({
          title: p.title || "Project",
          subtitle: p.subtitle,
          bullets: Array.isArray(p.bullets)
            ? p.bullets.map((b) => (typeof b === "string" ? b : b?.text || ""))
            : [],
        }));
        const rawExperience = (workspace.editableResume?.experience as RawResumeExperience[] | undefined) || [];
        const experience = rawExperience.map((e) => ({
          title: e.title || "Experience",
          subtitle: e.subtitle,
          bullets: Array.isArray(e.bullets)
            ? e.bullets.map((b) => (typeof b === "string" ? b : b?.text || ""))
            : [],
        }));
        const candidateName = workspace.editableResume?.contactInfo?.fullName || "Candidate";
        const fileName = workspace.fileName || "Uploaded Resume.pdf";

        setDetectedResume({
          fileName,
          candidateName,
          skills,
          projects,
          experience,
        });
      }
    } catch {
      // Safe fallback
    }
  }, []);

  // Read cross-module handoff from /jobs or /tracker
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      try {
        const handoffRaw = sessionStorage.getItem("copilot_interview_handoff");
        if (handoffRaw) {
          const handoff = JSON.parse(handoffRaw);
          sessionStorage.removeItem("copilot_interview_handoff");
          if (handoff.company) setCustomCompany(handoff.company);
          if (handoff.title) setCustomRole(handoff.title);
          if (handoff.jobDescription) setCustomJdText(handoff.jobDescription);
        }
      } catch {
        // Safe fallback
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleGenerateCustomQuestions = async (appendMode: boolean = false) => {
    const role = customRole || "Full-Stack SDE";
    const requirement =
      customJdText.trim() || `${role} engineering competencies, clean architecture, and production scale`;

    setIsGeneratingCustom(true);
    setError(null);

    // Save draft configuration for future edits
    saveDraftCustomConfig({
      targetRole: role,
      targetCompany: customCompany.trim() || undefined,
      difficulty: customDifficulty,
      selectedFocusAreas: customFocusCategories,
      jobDescription: requirement,
    });

    try {
      const payload = {
        targetRole: role,
        targetCompany: customCompany.trim() || undefined,
        jobRequirement: requirement,
        resumeContext:
          includeResumeContext && detectedResume
            ? {
                candidateName: detectedResume.candidateName,
                skills: detectedResume.skills,
                projects: detectedResume.projects,
                experience: detectedResume.experience,
              }
            : undefined,
        focusCategories: customFocusCategories,
        difficulty: customDifficulty,
        count: appendMode ? 10 : 12,
      };

      const res = await fetch("/api/interview/custom-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate tailored interview questions.");
      }

      const data = await res.json();
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        const taggedQuestions: StudioQuestion[] = data.questions.map((q: InterviewQuestion, idx: number) => ({
          ...q,
          id: q.id || `custom-q-${Date.now()}-${idx + 1}`,
          isCustom: true,
        }));

        // Generate unique session identifier
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        // Save session to persistence store
        saveCustomInterviewSession({
          sessionId,
          targetRole: role,
          targetCompany: customCompany.trim() || undefined,
          difficulty: customDifficulty,
          selectedFocusAreas: customFocusCategories,
          jobDescription: requirement,
          resumeContext:
            includeResumeContext && detectedResume
              ? {
                  candidateName: detectedResume.candidateName,
                  skills: detectedResume.skills,
                  projects: detectedResume.projects,
                  experience: detectedResume.experience,
                }
              : undefined,
          generatedQuestions: taggedQuestions,
          createdAt: Date.now(),
        });

        // Navigate to the dedicated mock interview workspace
        router.push(`/interview/customize/session/${sessionId}`);
      } else {
        throw new Error("No interview questions were generated. Please refine your requirements.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate custom interview questions.");
      setIsGeneratingCustom(false);
    }
  };

  if (liveAgentActive) {
    return (
      <LiveAgentInterviewRoom
        targetRole={customRole || "Software Engineer"}
        targetCompany={customCompany || ""}
        jobDescription={customJdText}
        onExit={() => setLiveAgentActive(false)}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── HEADER BAR ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1D1D1D] gap-4">
        <div>
          <Link
            href="/interview"
            className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors mb-2 group font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Interview Modes</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#121212] text-[#A78BFA] border border-[#292929]">
              <Sparkles className="w-6 h-6" />
            </div>
            <span>Customize by Resume &amp; JD</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1">
            Generate personalized interview questions matching your resume and target role.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="md">
            DUAL-SYNTHESIZER AI
          </Badge>
        </div>
      </div>

      {/* ─── DUAL-SYNTHESIZER AI QUESTION GENERATOR CARD ─────────────────────── */}
      <Card className="p-5 md:p-8 bg-[#0D0D0D] border-[#1D1D1D] rounded-xl space-y-6">
        {/* Card Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#1D1D1D]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-lg bg-[#121212] text-[#A78BFA] border border-[#292929]">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-[#F5F5F5] tracking-tight">
                Dual-Synthesizer AI Question Generator
              </h2>
              <Badge variant="emerald" size="sm">
                Resume &amp; JD Matched
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
              Synthesizes your uploaded resume projects &amp; skills with target company requirements to generate tailored, bar-raiser interview questions.
            </p>
          </div>
        </div>

        {/* Section A: Resume Integration Status Card */}
        <div
          className={clsx(
            "p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors",
            detectedResume
              ? "bg-[#10B981]/10 border-[#10B981]/25 text-emerald-200"
              : "bg-[#0A0A0A] border-[#1D1D1D] text-[#A1A1AA]"
          )}
        >
          <div className="flex items-center gap-2.5">
            {detectedResume ? (
              <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
            )}
            <div>
              {detectedResume ? (
                <p className="font-semibold text-[#10B981]">
                  ✓ Loaded Resume: <span className="text-[#F5F5F5] font-mono">{detectedResume.fileName}</span>
                  <span className="text-[#10B981]/80 font-normal ml-1.5">
                    ({detectedResume.projects.length} Projects, {detectedResume.skills.length} Skills detected)
                  </span>
                </p>
              ) : (
                <p>
                  No uploaded resume found in workspace. Using target role defaults, or upload your resume in the{" "}
                  <Link href="/resume" className="text-[#F5F5F5] underline hover:text-[#A1A1AA] font-medium">
                    Resume Screener
                  </Link>.
                </p>
              )}
            </div>
          </div>

          {detectedResume && (
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-[#F5F5F5] hover:text-[#A1A1AA] bg-[#0D0D0D] px-2.5 py-1.5 rounded-lg border border-[#292929] shrink-0 transition-colors">
              <input
                type="checkbox"
                checked={includeResumeContext}
                onChange={(e) => setIncludeResumeContext(e.target.checked)}
                className="rounded border-[#292929] accent-[#A78BFA] focus:ring-0"
              />
              <span>Include Resume in AI Prompt</span>
            </label>
          )}
        </div>

        {/* Section B, C, D: Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Section B: Target Role */}
          <div>
            <label className="text-xs font-semibold text-[#F5F5F5] block mb-1">
              Target Role <span className="text-[#A78BFA]">*</span>
            </label>
            <select
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              className="w-full text-xs bg-[#080808] border border-[#1D1D1D] rounded-lg px-3 py-2.5 text-[#F5F5F5] focus:outline-none focus:border-[#292929] cursor-pointer"
            >
              {INTERVIEW_ROLES.map((r) => (
                <option key={r} value={r} className="bg-[#0D0D0D] text-[#F5F5F5]">
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Section C: Target Company */}
          <div>
            <label className="text-xs font-semibold text-[#F5F5F5] block mb-1">
              Target Company (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Google, Stripe, Zepto, Swiggy"
              value={customCompany}
              onChange={(e) => setCustomCompany(e.target.value)}
              className="w-full text-xs bg-[#080808] border border-[#1D1D1D] rounded-lg px-3 py-2.5 text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#292929]"
            />
          </div>

          {/* Section D: Difficulty */}
          <div>
            <label className="text-xs font-semibold text-[#F5F5F5] block mb-1">
              Difficulty Bar
            </label>
            <select
              value={customDifficulty}
              onChange={(e) => setCustomDifficulty(e.target.value as "Easy" | "Medium" | "Hard" | "Mixed")}
              className="w-full text-xs bg-[#080808] border border-[#1D1D1D] rounded-lg px-3 py-2.5 text-[#F5F5F5] focus:outline-none focus:border-[#292929] cursor-pointer"
            >
              <option value="Mixed" className="bg-[#0D0D0D]">Mixed (Bar-Raiser &amp; Core)</option>
              <option value="Hard" className="bg-[#0D0D0D]">Hard (Senior / Staff)</option>
              <option value="Medium" className="bg-[#0D0D0D]">Medium (Mid-Level SDE)</option>
              <option value="Easy" className="bg-[#0D0D0D]">Easy (Foundational)</option>
            </select>
          </div>
        </div>

        {/* Section E: Question Mix Focus Categories */}
        <div>
          <label className="text-xs font-semibold text-[#F5F5F5] block mb-1.5">
            Target Question Focus Areas
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "core-technical", label: "Core Technical & Architecture" },
              { id: "resume-grill", label: "Resume Project Grill" },
              { id: "system-design", label: "Distributed System Design" },
              { id: "behavioral", label: "STAR Leadership & Ownership" },
              { id: "debugging", label: "Live Debugging & RCA" },
              { id: "dsa", label: "DSA & Algorithmic Problem Solving" },
            ].map((area) => {
              const selected = customFocusCategories.includes(area.id);
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => {
                    if (selected) {
                      if (customFocusCategories.length > 1) {
                        setCustomFocusCategories((prev) => prev.filter((id) => id !== area.id));
                      }
                    } else {
                      setCustomFocusCategories((prev) => [...prev, area.id]);
                    }
                  }}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors select-none cursor-pointer",
                    selected
                      ? "bg-[#121212] border-[#F5F5F5]/40 text-[#F5F5F5] font-semibold"
                      : "bg-[#0A0A0A] border-[#1D1D1D] text-[#71717A] hover:text-[#F5F5F5]"
                  )}
                >
                  {selected ? "✓ " : "+ "}{area.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section F: Job Description & Requirements Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-xs font-semibold text-[#F5F5F5]">
              Job Description &amp; Technical Requirements <span className="text-[#A78BFA]">*</span>
            </label>
            <span className="text-[10px] text-[#71717A]">
              Paste responsibilities, required stack, or key qualifications
            </span>
          </div>

          {/* 1-Click Company Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-[#71717A] font-semibold uppercase tracking-wider mr-1">Presets:</span>
            {COMPANY_JD_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setCustomCompany(preset.company);
                  setCustomRole(preset.role);
                  setCustomJdText(preset.desc);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#121212] hover:bg-[#1A1A1A] border border-[#292929] text-xs text-[#A1A1AA] hover:text-[#F5F5F5] font-medium transition-colors cursor-pointer"
              >
                🏢 {preset.name}
              </button>
            ))}
          </div>

          <textarea
            rows={5}
            placeholder="Paste target Job Description, required competencies, or tech stack expectations (e.g. 'Must have experience with Next.js, Kafka, microservices, and high-concurrency database indexing')..."
            value={customJdText}
            onChange={(e) => setCustomJdText(e.target.value)}
            className="w-full text-xs bg-[#080808] border border-[#1D1D1D] rounded-lg p-3.5 text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#292929] leading-relaxed font-sans"
          />
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-3.5 rounded-xl bg-[#F43F5E]/10 border border-[#F43F5E]/25 text-[#F43F5E] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#F43F5E] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section G: Question Generation Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1D1D1D]">
          <span className="text-[11px] text-[#71717A]">
            Configure parameters above and generate your personalized bar-raiser interview questions.
          </span>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setLiveAgentActive(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg transition cursor-pointer"
            >
              🎙️ Start Live Agent Interview (Multi-Turn) →
            </button>

            <Button
              variant="secondary"
              size="sm"
              icon={isGeneratingCustom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 text-[#A1A1AA]" />}
              onClick={() => handleGenerateCustomQuestions(true)}
              disabled={isGeneratingCustom || (!customJdText.trim() && !customRole)}
              className="text-xs"
            >
              + Generate 10 More
            </Button>

            <Button
              variant="primary"
              size="md"
              icon={isGeneratingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              onClick={() => handleGenerateCustomQuestions(false)}
              disabled={isGeneratingCustom || (!customJdText.trim() && !customRole)}
              className="text-xs px-4 py-2"
            >
              {isGeneratingCustom ? "Synthesizing Profile & Generating..." : "⚡ Generate Tailored Questions (12)"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
