"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  Flame,
  Search,
  Loader2,
  FileCode,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import InterviewStudioStage from "@/components/interview/InterviewStudioStage";
import { GithubIcon, type StudioQuestion } from "@/components/interview/interview-common";
import type { GitHubGrillAnalysis } from "@/types";
import type { InterviewRoleMeta } from "@/lib/interview-roles";
import { getBaselineAsStudioQuestions } from "@/lib/interview/role-baseline-questions";

interface ResumeGrillWorkspaceProps {
  roleMeta: InterviewRoleMeta;
}

export default function ResumeGrillWorkspace({ roleMeta }: ResumeGrillWorkspaceProps) {
  const [githubUrl, setGithubUrl] = useState("");
  const [githubFocusNotes, setGithubFocusNotes] = useState("");
  const [isAnalyzingRepo, setIsAnalyzingRepo] = useState(false);
  const [githubAnalysis, setGithubAnalysis] = useState<GitHubGrillAnalysis | null>(null);
  const [grillQuestions, setGrillQuestions] = useState<StudioQuestion[]>(() =>
    getBaselineAsStudioQuestions(roleMeta.title, "grill")
  );
  const [error, setError] = useState<string | null>(null);

  // Read detected resume from localStorage
  const [detectedResume, setDetectedResume] = useState<{
    fileName: string;
    candidateName?: string;
    skills: string[];
    projects: Array<{ title: string; subtitle?: string; bullets: string[] }>;
    experience: Array<{ title: string; subtitle?: string; bullets: string[] }>;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem("copilot_latest_resume_analysis");
        if (raw) {
          const workspace = JSON.parse(raw);
          const skills: string[] =
            workspace.editableResume?.skills?.length
              ? workspace.editableResume.skills
              : workspace.analysis?.skills || [];
          const rawProjects = workspace.editableResume?.projects || [];
          const projects = rawProjects.map((p: { title?: string; subtitle?: string; bullets?: Array<string | { text?: string }> }) => ({
            title: p.title || "Project",
            subtitle: p.subtitle,
            bullets: Array.isArray(p.bullets)
              ? p.bullets.map((b) => (typeof b === "string" ? b : b?.text || ""))
              : [],
          }));
          const rawExperience = workspace.editableResume?.experience || [];
          const experience = rawExperience.map((e: { title?: string; subtitle?: string; bullets?: Array<string | { text?: string }> }) => ({
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
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleAnalyzeGitHubRepo = async () => {
    const hasResumeProjects = Boolean(detectedResume?.projects?.length);
    if (!githubUrl.trim() && !hasResumeProjects) {
      setError("Please enter a GitHub repository URL or upload a resume first to generate targeted project grilling questions.");
      return;
    }

    setIsAnalyzingRepo(true);
    setError(null);

    try {
      const contextualFocusNotes = [
        `Target Role: ${roleMeta.title}`,
        roleMeta.category ? `Domain Focus: ${roleMeta.category}` : "",
        githubFocusNotes.trim(),
      ]
        .filter(Boolean)
        .join(" | ");

      const res = await fetch("/api/interview/github-grill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: roleMeta.title,
          repoUrl: githubUrl.trim(),
          focusNotes: contextualFocusNotes,
          resumeContext: detectedResume
            ? {
                projects: detectedResume.projects,
                skills: detectedResume.skills,
              }
            : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to analyze GitHub repository");
      }

      const data = await res.json();
      if (data.analysis) {
        setGithubAnalysis(data.analysis as GitHubGrillAnalysis);
      }

      if (Array.isArray(data.questions) && data.questions.length > 0) {
        const richQuestions: StudioQuestion[] = data.questions.map((q: StudioQuestion) => ({
          ...q,
          role: roleMeta.title,
          category: "resume-grill",
          isCustom: true,
        }));
        setGrillQuestions(richQuestions);
      } else if (data.analysis?.grillQuestions?.length) {
        const analysis: GitHubGrillAnalysis = data.analysis;
        const convertedQuestions: StudioQuestion[] = analysis.grillQuestions.map((gq, i) => ({
          id: gq.id || `gh-grill-${Date.now()}-${i + 1}`,
          role: roleMeta.title,
          category: "resume-grill",
          difficulty: gq.difficulty === "Medium" ? "medium" : "hard",
          level: i < 3 ? 1 : i < 7 ? 2 : 3,
          question: gq.question,
          hint: `${gq.whatInterviewerLooksFor} · Hint: ${gq.hint}`,
          sampleAnswer: `Architectural breakdown for ${analysis.repoName} from a ${roleMeta.title} perspective.`,
          followUps: [],
          keyConceptsToCover: gq.keyConcepts && gq.keyConcepts.length > 0 ? gq.keyConcepts : gq.referencedFiles,
          referencedFiles: gq.referencedFiles,
          codeExcerpt: gq.codeExcerpt,
          whyAskThis: gq.whatInterviewerLooksFor,
          isCustom: true,
        }));

        setGrillQuestions(convertedQuestions);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to analyze repository");
    } finally {
      setIsAnalyzingRepo(false);
    }
  };

  const headerSlot = (
    <div className="space-y-4">
      {/* Resume Detection Quick Badge */}
      {detectedResume && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-amber-950/20 border border-amber-500/25 text-xs animate-fadeIn">
          <div className="flex items-center gap-2 text-amber-300">
            <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              Loaded Resume Context: <strong className="text-white font-mono">{detectedResume.fileName}</strong> ({detectedResume.projects.length} Projects, {detectedResume.skills.length} Skills detected)
            </span>
          </div>
          <span className="text-[11px] text-amber-400/80">
            Available for deep project grilling questions
          </span>
        </div>
      )}

      {/* GitHub Repository Deep-Grill Analyzer Card */}
      <Card className="p-6 bg-gradient-to-br from-[#160b14] via-[#1a0f1d] to-[#120a16] border-amber-500/30 shadow-2xl animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-amber-500/20 mb-4 gap-3">
          <div className="flex items-center gap-2.5">
            <GithubIcon className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                GitHub Repository Deep-Grill Analyzer
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  CODEBASE DEFENSE
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white/5 text-slate-300 border border-[rgba(100,110,255,0.12)] font-mono">
                  {roleMeta.title}
                </span>
              </h3>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Provide your project repo to analyze file trees, dependencies, and commit history for file-specific grilling on {roleMeta.title} architecture, trade-offs &amp; scale.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
          <div className="lg:col-span-7">
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              GitHub Repository URL (or owner/repo) <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              placeholder="https://github.com/facebook/react or username/project-name"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">1-Click Test Repos:</span>
              {[
                { name: "facebook/react", url: "https://github.com/facebook/react", focus: "Fiber reconciliation, hook queue, scheduling" },
                { name: "vercel/next.js", url: "https://github.com/vercel/next.js", focus: "Server components, streaming SSR, App Router" },
                { name: "expressjs/express", url: "https://github.com/expressjs/express", focus: "Middleware pipeline, router trie, error handling" },
              ].map((demo) => (
                <button
                  key={demo.name}
                  type="button"
                  onClick={() => {
                    setGithubUrl(demo.url);
                    setGithubFocusNotes(demo.focus);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-[11px] text-amber-300 font-mono transition-all"
                >
                  📦 {demo.name}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Focus Notes / Key Modules (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Focus on WebSocket engine, Redis lock, auth JWT"
              value={githubFocusNotes}
              onChange={(e) => setGithubFocusNotes(e.target.value)}
              className="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] text-slate-400">
            ⚡ Inspects README.md, package.json, file tree, and git commits to formulate deep {roleMeta.title} architectural cross-questions.
          </span>
          <Button
            variant="primary"
            size="sm"
            icon={isAnalyzingRepo ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Search className="w-4 h-4" />}
            onClick={handleAnalyzeGitHubRepo}
            disabled={isAnalyzingRepo || (!githubUrl.trim() && !(detectedResume?.projects?.length))}
            className="bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-md shadow-amber-600/20"
          >
            {isAnalyzingRepo
              ? "Inspecting Codebase & Formulating Questions..."
              : githubUrl.trim()
              ? "Analyze Repo & Generate Grill Questions"
              : "Generate Resume Project Grill Questions"}
          </Button>
        </div>

        {/* Repository Intelligence Result Card */}
        {githubAnalysis && (
          <div className="mt-5 pt-4 border-t border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-400" />
                Repository Intelligence: {githubAnalysis.owner}/{githubAnalysis.repoName}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {githubAnalysis.detectedStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-200 border border-amber-500/30"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-[rgba(100,110,255,0.12)]">
              {githubAnalysis.summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="font-bold text-emerald-400 block mb-1">Architecture Highlights</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  {githubAnalysis.architectureStrengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="font-bold text-rose-400 block mb-1">Risk Areas Under Grill</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  {githubAnalysis.potentialWeaknessesOrRisks.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  return (
    <InterviewStudioStage
      mode="grill"
      initialRole={roleMeta.title}
      initialCategory="resume-grill"
      initialQuestions={grillQuestions.length > 0 ? grillQuestions : undefined}
      backHref="/interview/resume-grill"
      pageTitle={`${roleMeta.title} Project Grill`}
      pageSubtitle={`Experience an in-depth technical interview based on your ${roleMeta.title} projects, architecture, implementation decisions, and engineering trade-offs.`}
      badgeLabel="🔥 Deep Grill Mode"
      badgeVariant="amber"
      showRoleSelector={false}
      showCategoryFilters={false}
      requireManualStart={true}
      startCardIcon="flame"
      startCardTitle="Ready for Your Technical Grill?"
      startCardDescription="Your AI interviewer is ready to challenge your engineering decisions, architecture, and implementation choices."
      startCardIndicators={[
        { label: "AI Technical Interviewer", dotColor: "bg-amber-400" },
        { label: "Repository-Aware Questions", dotColor: "bg-emerald-400" },
        { label: "Voice & Video Analysis", dotColor: "bg-indigo-400" },
        { label: "Architecture Trade-offs", dotColor: "bg-violet-400" },
      ]}
      headerSlot={headerSlot}
      onQuestionsChange={(qs) => setGrillQuestions(qs)}
    />
  );
}

