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
  ExternalLink,
} from "lucide-react";
import InterviewStudioStage from "@/components/interview/InterviewStudioStage";
import { GithubIcon, type StudioQuestion } from "@/components/interview/interview-common";
import type { GitHubGrillAnalysis, InterviewQuestion } from "@/types";

export default function ResumeGrillPage() {
  const [githubUrl, setGithubUrl] = useState("");
  const [githubFocusNotes, setGithubFocusNotes] = useState("");
  const [isAnalyzingRepo, setIsAnalyzingRepo] = useState(false);
  const [githubAnalysis, setGithubAnalysis] = useState<GitHubGrillAnalysis | null>(null);
  const [grillQuestions, setGrillQuestions] = useState<StudioQuestion[]>([]);
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
  }, []);

  const handleAnalyzeGitHubRepo = async () => {
    if (!githubUrl.trim()) {
      setError("Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo or owner/repo).");
      return;
    }

    setIsAnalyzingRepo(true);
    setError(null);

    try {
      const res = await fetch("/api/interview/github-grill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl: githubUrl.trim(),
          focusNotes: githubFocusNotes.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to analyze GitHub repository");
      }

      const data = await res.json();
      if (data.analysis) {
        const analysis: GitHubGrillAnalysis = data.analysis;
        setGithubAnalysis(analysis);

        const convertedQuestions: StudioQuestion[] = analysis.grillQuestions.map((gq, i) => ({
          id: gq.id || `gh-grill-${Date.now()}-${i + 1}`,
          role: `${analysis.owner}/${analysis.repoName}`,
          category: "resume-grill",
          difficulty: gq.difficulty === "Medium" ? "medium" : "hard",
          question: gq.question,
          hint: `${gq.whatInterviewerLooksFor} · Hint: ${gq.hint}`,
          sampleAnswer: `Architectural breakdown for ${analysis.repoName}`,
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
              </h3>
              <p className="text-xs text-amber-300/80">
                Provide your project repo to analyze file trees, dependencies, and commit history for file-specific grilling on trade-offs &amp; scale.
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
            ⚡ Inspects README.md, package.json, file tree, and git commits to formulate deep architectural cross-questions.
          </span>
          <Button
            variant="primary"
            size="sm"
            icon={isAnalyzingRepo ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Search className="w-4 h-4" />}
            onClick={handleAnalyzeGitHubRepo}
            disabled={isAnalyzingRepo || !githubUrl.trim()}
            className="bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-md shadow-amber-600/20"
          >
            {isAnalyzingRepo ? "Inspecting Codebase & Formulating Questions..." : "Analyze Repo & Generate Grill Questions"}
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

            <p className="text-xs text-slate-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/6">
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
      initialRole="Full-Stack SDE"
      initialCategory="resume-grill"
      initialQuestions={grillQuestions.length > 0 ? grillQuestions : undefined}
      backHref="/interview"
      pageTitle="Resume & Project Grill"
      pageSubtitle="Experience an in-depth technical interview based on your resume, projects, architecture, implementation decisions, and engineering trade-offs."
      badgeLabel="🔥 Deep Grill Mode"
      badgeVariant="amber"
      showRoleSelector={true}
      showCategoryFilters={false}
      headerSlot={headerSlot}
      onQuestionsChange={(qs) => setGrillQuestions(qs)}
    />
  );
}

