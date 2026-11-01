"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  Building2,
} from "lucide-react";
import { clsx } from "clsx";
import InterviewStudioStage from "@/components/interview/InterviewStudioStage";
import {
  type StudioQuestion,
  COMPANY_JD_PRESETS,
} from "@/components/interview/interview-common";
import { INTERVIEW_ROLES } from "@/lib/interview-questions";
import type { InterviewQuestion } from "@/types";

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
  const [customSuccessMsg, setCustomSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customQuestions, setCustomQuestions] = useState<StudioQuestion[]>([]);

  // LocalStorage Resume Detection
  const [detectedResume, setDetectedResume] = useState<{
    fileName: string;
    candidateName?: string;
    skills: string[];
    projects: Array<{ title: string; subtitle?: string; bullets: string[] }>;
    experience: Array<{ title: string; subtitle?: string; bullets: string[] }>;
  } | null>(null);

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
    setCustomSuccessMsg(null);

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
        const taggedQuestions: StudioQuestion[] = data.questions.map((q: InterviewQuestion) => ({
          ...q,
          isCustom: true,
        }));

        if (appendMode) {
          setCustomQuestions((prev) => [...prev, ...taggedQuestions]);
          setCustomSuccessMsg(
            `Added ${taggedQuestions.length} more custom questions to queue! (${data.source || "AI engine"})`
          );
        } else {
          setCustomQuestions(taggedQuestions);
          setCustomSuccessMsg(
            `Generated ${taggedQuestions.length} questions tailored to your resume & requirements! (${data.source || "AI engine"})`
          );
        }
      } else {
        throw new Error("No interview questions were generated. Please refine your requirements.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate custom interview questions.");
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  const headerSlot = (
    <div className="space-y-4">
      {/* ─── CUSTOM RESUME + JOB REQUIREMENT PANEL ───────────────────────── */}
      <Card className="p-5 md:p-6 bg-gradient-to-br from-[#0c1222] via-[#0f172a] to-[#0c1222] border-emerald-500/30 shadow-2xl rounded-2xl animate-fadeIn space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Dual-Synthesizer AI Question Generator
              </h3>
              <Badge variant="emerald" size="sm">
                Resume &amp; JD Matched
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Synthesizes your uploaded resume projects &amp; skills with target company requirements to generate tailored, bar-raiser interview questions.
            </p>
          </div>
        </div>

        {/* Resume Integration Status Card */}
        <div
          className={clsx(
            "p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all",
            detectedResume
              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
              : "bg-slate-900/60 border-white/8 text-slate-400"
          )}
        >
          <div className="flex items-center gap-2.5">
            {detectedResume ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            )}
            <div>
              {detectedResume ? (
                <p className="font-semibold text-emerald-300">
                  ✓ Loaded Resume: <span className="text-white font-mono">{detectedResume.fileName}</span>
                  <span className="text-emerald-400/80 font-normal ml-1.5">
                    ({detectedResume.projects.length} Projects, {detectedResume.skills.length} Skills detected)
                  </span>
                </p>
              ) : (
                <p>
                  No uploaded resume found in workspace. Using target role defaults, or upload your resume in the{" "}
                  <Link href="/resume" className="text-indigo-400 underline hover:text-indigo-300 font-medium">
                    Resume Screener
                  </Link>.
                </p>
              )}
            </div>
          </div>

          {detectedResume && (
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-slate-300 hover:text-white bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/10">
              <input
                type="checkbox"
                checked={includeResumeContext}
                onChange={(e) => setIncludeResumeContext(e.target.checked)}
                className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-400"
              />
              <span>Include Resume in AI Prompt</span>
            </label>
          )}
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Target Role */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Target Role <span className="text-emerald-400">*</span>
            </label>
            <select
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              className="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
              {INTERVIEW_ROLES.map((r) => (
                <option key={r} value={r} className="bg-slate-900 text-slate-200">
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Target Company */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Target Company (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Google, Stripe, Zepto, Swiggy"
              value={customCompany}
              onChange={(e) => setCustomCompany(e.target.value)}
              className="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Difficulty Bar
            </label>
            <select
              value={customDifficulty}
              onChange={(e) => setCustomDifficulty(e.target.value as "Easy" | "Medium" | "Hard" | "Mixed")}
              className="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Mixed" className="bg-slate-900">Mixed (Bar-Raiser &amp; Core)</option>
              <option value="Hard" className="bg-slate-900">Hard (Senior / Staff)</option>
              <option value="Medium" className="bg-slate-900">Medium (Mid-Level SDE)</option>
              <option value="Easy" className="bg-slate-900">Easy (Foundational)</option>
            </select>
          </div>
        </div>

        {/* Question Mix Focus Categories */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
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
                    "px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all select-none",
                    selected
                      ? "bg-emerald-600/30 border-emerald-500/60 text-emerald-200 font-semibold"
                      : "bg-white/5 border-white/8 text-slate-400 hover:text-white"
                  )}
                >
                  {selected ? "✓ " : "+ "}{area.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Job Description & Requirements Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-300">
              Job Description &amp; Technical Requirements <span className="text-emerald-400">*</span>
            </label>
            <span className="text-[10px] text-slate-500">
              Paste responsibilities, required stack, or key qualifications
            </span>
          </div>

          {/* 1-Click Company Presets */}
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Presets:</span>
            {COMPANY_JD_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setCustomCompany(preset.company);
                  setCustomRole(preset.role);
                  setCustomJdText(preset.desc);
                }}
                className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-[11px] text-emerald-300 font-medium transition-all"
              >
                🏢 {preset.name}
              </button>
            ))}
          </div>

          <textarea
            rows={4}
            placeholder="Paste target Job Description, required competencies, or tech stack expectations (e.g. 'Must have experience with Next.js, Kafka, microservices, and high-concurrency database indexing')..."
            value={customJdText}
            onChange={(e) => setCustomJdText(e.target.value)}
            className="w-full text-xs bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
          />
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Feedback */}
        {customSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{customSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setCustomSuccessMsg(null)}
              className="text-emerald-400/70 hover:text-white text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <span className="text-[11px] text-slate-500">
            {customQuestions.length > 0 ? `${customQuestions.length} custom questions currently in queue.` : "Configure parameters above and generate questions."}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={isGeneratingCustom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 text-emerald-400" />}
              onClick={() => handleGenerateCustomQuestions(true)}
              disabled={isGeneratingCustom || (!customJdText.trim() && !customRole)}
              className="text-xs border border-emerald-500/30 hover:border-emerald-500/60"
            >
              + Generate 10 More
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={isGeneratingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-300" />}
              onClick={() => handleGenerateCustomQuestions(false)}
              disabled={isGeneratingCustom || (!customJdText.trim() && !customRole)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30"
            >
              {isGeneratingCustom ? "Synthesizing Profile & Generating..." : "⚡ Generate Tailored Questions (12)"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <InterviewStudioStage
      mode="custom"
      initialRole={customRole}
      initialCategory="custom-jd"
      initialQuestions={customQuestions.length > 0 ? customQuestions : undefined}
      backHref="/interview"
      pageTitle="Customize by Resume & JD"
      pageSubtitle="Generate personalized interview questions by analyzing your resume, target company, job description, and technical requirements."
      badgeLabel="✨ Custom Tailored Mode"
      badgeVariant="emerald"
      showRoleSelector={false}
      showCategoryFilters={false}
      headerSlot={headerSlot}
      onQuestionsChange={(qs) => setCustomQuestions(qs)}
    />
  );
}

