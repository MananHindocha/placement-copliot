"use client";

import { useState, useEffect, useRef } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import ErrorBanner from "@/components/ui/ErrorBanner";
import {
  getResumeAnalysis,
  analyzeResumeFile,
  reEvaluateResumeText,
} from "@/lib/services/resume.service";
import { setUserSkills, getUserSkills } from "@/lib/services/jobs.service";
import type { ResumeAnalysis, ParsedResumeDocument, TailorSuggestion } from "@/types";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  RotateCcw,
  Loader2,
  Check,
  Target,
  Zap,
  TrendingUp,
  Cpu,
  RefreshCw,
  ExternalLink,
  Printer,
  Sliders,
  AlertCircle,
  ShieldCheck,
  Award,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
} from "lucide-react";
import { clsx } from "clsx";

const SECTION_LABELS: Record<string, string> = {
  summary: "Professional Summary",
  experience: "Work Experience",
  skills: "Skills & Tech Stack",
  education: "Education",
  projects: "Projects & Portfolio",
};

const IMPACT_BADGE: Record<string, "rose" | "amber" | "emerald"> = {
  high: "rose",
  medium: "amber",
  low: "emerald",
};

export default function ResumePage() {
  const [activeTab, setActiveTab] = useState<"analyse" | "tailor">("analyse");
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>("sug-1");
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Core Data
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // File Upload & Input State
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [targetJd, setTargetJd] = useState("");
  const [isJdOpen, setIsJdOpen] = useState(false);
  const [diagnosticTip, setDiagnosticTip] = useState<string | null>(null);
  const [pythonParserActive, setPythonParserActive] = useState<boolean | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadInitialAnalysis = () => {
    setLoading(true);
    setError(null);
    getResumeAnalysis()
      .then((data) => {
        setAnalysis(data);
        if (data.jobTitle && data.jobTitle !== "Upload a resume to begin") {
          setTargetRole(data.jobTitle);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load resume analysis.");
        setLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    getResumeAnalysis()
      .then((data) => {
        if (!isMounted) return;
        setAnalysis(data);
        if (data.jobTitle && data.jobTitle !== "Upload a resume to begin") {
          setTargetRole(data.jobTitle);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load resume analysis.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ─── File Upload Handler ──────────────────────────────────────────────────

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const validExtensions = [".pdf", ".docx", ".txt"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setError("Please upload a .pdf, .docx, or .txt file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds the 5MB maximum upload limit.");
      return;
    }

    setUploadedFile(file);
    setAnalyzing(true);
    setError(null);
    setUploadProgress(20);

    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 150);

    try {
      const result = await analyzeResumeFile(file, targetRole, targetJd);
      clearInterval(progressTimer);
      setUploadProgress(100);

      setAnalysis(result.analysis);
      setPythonParserActive(result.pythonParserActive);
      setDiagnosticTip(result.diagnosticTip || null);
      setAppliedSuggestions(new Set());

      if (result.analysis.suggestions.length > 0) {
        setExpandedSuggestion(result.analysis.suggestions[0].id);
      }

      showToast(`Resume parsed successfully via ${result.source.toUpperCase()} engine!`);
    } catch (err: unknown) {
      clearInterval(progressTimer);
      setError(err instanceof Error ? err.message : "Document analysis failed.");
    } finally {
      setAnalyzing(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  const handleReEvaluate = async () => {
    if (uploadedFile) {
      await handleFileUpload(uploadedFile);
    } else if (analysis?.rawText) {
      setAnalyzing(true);
      setError(null);
      try {
        const res = await reEvaluateResumeText(
          analysis.rawText,
          analysis.parsedResume?.fileName || "Current_Resume.pdf",
          targetRole,
          targetJd
        );
        setAnalysis(res.analysis);
        setDiagnosticTip(res.diagnosticTip || null);
        showToast("Re-evaluated resume against new role & JD!");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Re-evaluation failed.");
      } finally {
        setAnalyzing(false);
      }
    } else {
      showToast("Upload a resume to analyze against this target role.");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // ─── Interactive Actions ──────────────────────────────────────────────────

  const handleCopy = async (id: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        showToast("Copied improved bullet point to clipboard!");
      } catch {
        // Fallback
      }
    }
  };

  const handleApplySuggestion = (id: string) => {
    setAppliedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast("Reverted suggestion from resume preview.");
      } else {
        next.add(id);
        showToast("Applied improved bullet to resume preview!");
      }
      return next;
    });
  };

  const handleSyncSkills = () => {
    if (!analysis || !analysis.extractedSkills || analysis.extractedSkills.length === 0) {
      showToast("No extracted skills found in current analysis.");
      return;
    }

    const currentSkills = getUserSkills();
    const merged = Array.from(new Set([...analysis.extractedSkills, ...currentSkills]));
    setUserSkills(merged);
    showToast(`Synced ${analysis.extractedSkills.length} skills to your profile & Job Matcher!`);
  };

  const matchScore = analysis?.matchScore ?? 82;
  const atsScore = analysis?.atsScore ?? 78;
  const impactScore = analysis?.sectionScores?.impact ?? 80;
  const verbScore = analysis?.sectionScores?.style ?? 75;

  const parsedResume = analysis?.parsedResume;
  const isUploadedResume = Boolean(parsedResume && parsedResume.candidateName !== "Arjun Kumar");

  // Helper to check if a specific bullet line has an applied rewrite
  const getRenderedBullet = (originalText: string, suggestionId?: string) => {
    if (!analysis) return { text: originalText, isApplied: false };
    // Find matching suggestion
    const match = analysis.suggestions.find(
      (s) => (suggestionId && s.id === suggestionId) || s.original.trim() === originalText.trim()
    );
    if (match && appliedSuggestions.has(match.id)) {
      return { text: match.suggested, isApplied: true };
    }
    return { text: originalText, isApplied: false };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-600/95 text-white text-sm font-medium shadow-2xl shadow-indigo-500/30 border border-indigo-400/30 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" />
          {toastMessage}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <ErrorBanner
          title="Resume Screener Alert"
          message={error}
          onRetry={loadInitialAnalysis}
        />
      )}

      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Resume Screener & Tailor
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              XYZ Formula Engine
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Extract, score, and rewrite resume bullets with Google-caliber impact formulas.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#0B1120] border border-white/8 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("analyse")}
            className={clsx(
              "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === "analyse"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-400 hover:text-white"
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Diagnostic Score
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tailor")}
            className={clsx(
              "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === "tailor"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Tailor Workspace
            {appliedSuggestions.size > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Diagnostic Tip / Microservice Health Pill */}
      {diagnosticTip && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-xs border bg-white/3 border-white/6 text-slate-300">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{diagnosticTip}</span>
          </div>
          {pythonParserActive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <Check className="w-3 h-3" /> PyMuPDF Active
            </span>
          )}
        </div>
      )}

      {/* Main Content Area */}
      {loading && !analysis ? (
        <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-sm">Loading resume telemetry...</span>
        </div>
      ) : analysis ? (
        activeTab === "analyse" ? (
          <div className="space-y-6">
            {/* 4-Pillar ATS Diagnostic Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Overall JD Match */}
              <div className="p-4 rounded-xl border border-white/8 bg-[#0B1120] relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-medium">JD Match Score</span>
                  <Target className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-3xl font-extrabold text-white mb-2">
                  <span className={clsx(matchScore >= 80 ? "text-emerald-400" : matchScore >= 65 ? "text-amber-400" : "text-rose-400")}>
                    {matchScore}%
                  </span>
                </div>
                <ProgressBar
                  value={matchScore}
                  color={matchScore >= 80 ? "emerald" : matchScore >= 65 ? "amber" : "rose"}
                  size="sm"
                  label="JD Match"
                />
                <span className="text-[10px] text-slate-500 mt-2 block">
                  {matchScore >= 80 ? "Strong Placement Alignment" : "Add missing keywords to reach 80%+"}
                </span>
              </div>

              {/* ATS Parsability */}
              <div className="p-4 rounded-xl border border-white/8 bg-[#0B1120] relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-medium">ATS Parsability</span>
                  <ShieldCheck className="w-4 h-4 text-violet-400" />
                </div>
                <div className="text-3xl font-extrabold text-violet-400 mb-2">
                  {atsScore}%
                </div>
                <ProgressBar value={atsScore} color="violet" size="sm" label="ATS Score" />
                <span className="text-[10px] text-slate-500 mt-2 block">Standard hierarchy & headers</span>
              </div>

              {/* Quantified Impact */}
              <div className="p-4 rounded-xl border border-white/8 bg-[#0B1120] relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-medium">Quantified Impact</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold text-emerald-400 mb-2">
                  {impactScore}%
                </div>
                <ProgressBar value={impactScore} color="emerald" size="sm" label="Impact Score" />
                <span className="text-[10px] text-slate-500 mt-2 block">
                  {analysis.meta?.hasQuantifiedMetrics ? "Numbers & % present" : "Needs %, $, scale metrics"}
                </span>
              </div>

              {/* Action Verb Strength */}
              <div className="p-4 rounded-xl border border-white/8 bg-[#0B1120] relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-medium">Action Verb Strength</span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-extrabold text-amber-400 mb-2">
                  {verbScore}%
                </div>
                <ProgressBar value={verbScore} color="amber" size="sm" label="Verb Strength" />
                <span className="text-[10px] text-slate-500 mt-2 block">Active technical verbs</span>
              </div>
            </div>

            {/* Split Grid: Left Upload & Parameters, Right Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Upload Zone + Target Role & JD Bar */}
              <div className="lg:col-span-1 space-y-4">
                {/* Drag-and-Drop Dropzone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={clsx(
                    "relative border-2 border-dashed rounded-2xl p-6 text-center transition-all bg-[#0B1120]",
                    dragActive
                      ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
                      : "border-white/10 hover:border-indigo-500/40"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />

                  {analyzing ? (
                    <div className="py-6 space-y-3">
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                      <p className="text-xs font-semibold text-white">Analyzing Document...</p>
                      <p className="text-[10px] text-slate-400">Extracting sections, links & metrics</p>
                      <div className="w-48 mx-auto">
                        <ProgressBar value={uploadProgress} color="indigo" size="sm" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 shadow-md shadow-indigo-500/10">
                        <Upload className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h4 className="text-xs font-semibold text-white mb-1">
                        Upload Your Resume
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Drag and drop .PDF or .DOCX (up to 5MB)
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose File
                      </Button>
                    </div>
                  )}

                  {/* Active Document Pill */}
                  {analysis.meta?.fileName && (
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-left">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-300 truncate max-w-[150px]">
                          {analysis.meta.fileName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {analysis.meta.pageCount ? `${analysis.meta.pageCount} page(s)` : ""}
                      </span>
                    </div>
                  )}
                </div>

                {/* Target Role & Collapsible Job Description Bar */}
                <div className="rounded-2xl border border-white/8 bg-[#0B1120] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-indigo-400" />
                      Target Role
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsJdOpen(!isJdOpen)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                    >
                      {isJdOpen ? "Hide JD Bar" : "Paste JD"}
                      {isJdOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Frontend Developer, SDE-1"
                      className="w-full bg-[#050811] border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleReEvaluate}
                      disabled={analyzing}
                      className="text-[11px] shrink-0"
                    >
                      Analyze
                    </Button>
                  </div>

                  {/* Collapsible JD Input */}
                  {isJdOpen && (
                    <div className="space-y-2 pt-1 animate-fadeIn">
                      <label className="text-[10px] text-slate-400 block font-medium">
                        Paste Job Description (JD) to match against:
                      </label>
                      <textarea
                        rows={4}
                        value={targetJd}
                        onChange={(e) => setTargetJd(e.target.value)}
                        placeholder="Paste required skills, requirements or JD text here..."
                        className="w-full bg-[#050811] border border-white/8 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs"
                        onClick={handleReEvaluate}
                        disabled={analyzing}
                      >
                        Re-evaluate with this JD
                      </Button>
                    </div>
                  )}
                </div>

                {/* Auto-Sync Extracted Skills to Profile & Job Discovery */}
                <div className="rounded-2xl border border-white/8 bg-[#0B1120] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Profile Synchronization</span>
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Automatically pass discovered skills to the AI Job Matcher so discovery matches your actual resume.
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="w-full text-xs justify-center gap-1.5"
                    onClick={handleSyncSkills}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sync Skills to Job Matcher
                  </Button>
                </div>
              </div>

              {/* Right Column: Strengths, Keyword Gaps & "What to Improve" */}
              <div className="lg:col-span-2 space-y-5">
                {/* Critical Fixes & Gaps */}
                <div className="rounded-2xl border border-white/8 bg-[#0B1120] p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Critical Gaps to Address
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {analysis.gaps.map((gap, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/15 flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed"
                      >
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{gap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verified Strengths */}
                <div className="rounded-2xl border border-white/8 bg-[#0B1120] p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Verified Strengths
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {analysis.strengths.map((str, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-start gap-2.5 text-xs text-slate-300"
                      >
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{str}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keyword Analysis Breakdown */}
                <div className="rounded-2xl border border-white/8 bg-[#0B1120] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Keyword Match Grid ({targetRole})
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      {analysis.keywords.filter((k) => k.present).length} of {analysis.keywords.length} present
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {analysis.keywords.map((kw) => (
                      <span
                        key={kw.word}
                        className={clsx(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border",
                          kw.present
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-300 border-rose-500/20"
                        )}
                      >
                        {kw.present ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-400" />
                        )}
                        {kw.word}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Tailor Mode Workspace */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: AI XYZ-Formula Suggestions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    AI Bullet Rewrites (XYZ Formula)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Accomplished [X] as measured by [Y], by doing [Z]
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {appliedSuggestions.size} of {analysis.suggestions.length} applied
                </span>
              </div>

              {analysis.suggestions.map((suggestion) => {
                const isExpanded = expandedSuggestion === suggestion.id;
                const isApplied = appliedSuggestions.has(suggestion.id);

                return (
                  <div
                    key={suggestion.id}
                    className={clsx(
                      "rounded-2xl border transition-all overflow-hidden bg-[#0B1120]",
                      isApplied
                        ? "border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                        : "border-white/8 hover:border-white/15"
                    )}
                  >
                    {/* Header bar */}
                    <button
                      type="button"
                      onClick={() => setExpandedSuggestion(isExpanded ? null : suggestion.id)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Badge variant={IMPACT_BADGE[suggestion.impact]} size="sm">
                          {suggestion.impact} impact
                        </Badge>
                        <span className="text-xs font-semibold text-white">
                          {SECTION_LABELS[suggestion.section] || suggestion.section}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isApplied && (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Applied
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Expandable Body */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                        {/* Original Bullet */}
                        <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 block mb-1">
                            Original Line
                          </span>
                          <p className="text-xs text-rose-200/90 leading-relaxed font-mono">
                            {suggestion.original}
                          </p>
                        </div>

                        {/* Suggested XYZ Bullet */}
                        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                              AI Improved (XYZ Formula)
                            </span>
                            <span className="text-[10px] text-slate-400 italic">
                              {suggestion.reason}
                            </span>
                          </div>
                          <p className="text-xs text-emerald-200 font-medium leading-relaxed font-mono">
                            {suggestion.suggested}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(suggestion.id, suggestion.suggested)}
                            className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
                          >
                            {copiedId === suggestion.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy Bullet
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApplySuggestion(suggestion.id)}
                            className={clsx(
                              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                              isApplied
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                            )}
                          >
                            {isApplied ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Revert
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                Apply to Preview
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right: Live Resume Document Preview Pane */}
            <div className="rounded-2xl border border-white/8 bg-[#0B1120] p-6 space-y-4 sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/8">
                <div>
                  <h4 className="text-sm font-semibold text-white">Live Resume Document</h4>
                  <p className="text-[11px] text-slate-400">
                    {appliedSuggestions.size} improvement(s) actively reflected in preview
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5 text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Export PDF
                </Button>
              </div>

              {/* Status Header Badge */}
              <div className="text-[11px] px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center justify-between">
                <span>
                  {isUploadedResume
                    ? `Live Preview: ${parsedResume?.fileName || "Uploaded Resume"}`
                    : "Viewing Sample Demo Resume (Upload your resume to tailor your own)"}
                </span>
                {isUploadedResume && (
                  <span className="font-semibold text-emerald-400">Custom Document</span>
                )}
              </div>

              {/* Printable Document Sheet (Binds dynamically to candidate's parsedResume) */}
              <div className="bg-white text-slate-900 rounded-xl p-6 sm:p-8 font-serif shadow-2xl space-y-4 text-left text-xs leading-relaxed max-h-[750px] overflow-y-auto">
                {/* Dynamic Header */}
                <div className="text-center border-b border-slate-200 pb-3">
                  <h2 className="text-lg font-bold text-slate-900 font-sans tracking-tight">
                    {(parsedResume?.candidateName || "ARJUN KUMAR").toUpperCase()}
                  </h2>
                  <p className="text-[11px] text-slate-600 mt-1 font-sans">
                    {[
                      parsedResume?.email || "arjun.kumar@nitt.edu",
                      parsedResume?.phone || "+91 98765 43210",
                      parsedResume?.location || "Bangalore, India",
                      parsedResume?.links?.[0] || "github.com/profile",
                    ]
                      .filter(Boolean)
                      .join(" | ")}
                  </p>
                </div>

                {/* Professional Summary */}
                <div>
                  <h3 className="text-xs font-bold font-sans uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-1.5">
                    Professional Summary
                  </h3>
                  <p className="text-slate-700">
                    {(() => {
                      const summarySug = analysis.suggestions.find((s) => s.section === "summary");
                      if (summarySug && appliedSuggestions.has(summarySug.id)) {
                        return (
                          <span className="bg-emerald-50 text-emerald-950 font-medium px-1 rounded border-l-2 border-emerald-500 block">
                            {summarySug.suggested}
                          </span>
                        );
                      }
                      return (
                        parsedResume?.summary ||
                        "Full-stack engineer with proven experience building high-scale consumer applications, specialising in modern frontend and backend architectures."
                      );
                    })()}
                  </p>
                </div>

                {/* Work Experience */}
                <div>
                  <h3 className="text-xs font-bold font-sans uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-1.5">
                    Experience
                  </h3>
                  <div className="space-y-3">
                    {parsedResume?.experience && parsedResume.experience.length > 0 ? (
                      parsedResume.experience.map((exp) => (
                        <div key={exp.id} className="space-y-1">
                          <div className="flex justify-between items-baseline font-sans font-semibold text-slate-800 text-[11px]">
                            <span>{exp.role} — {exp.company}</span>
                            <span className="text-slate-500 font-normal text-[10px]">{exp.duration}</span>
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-slate-700">
                            {exp.bullets.map((b, bIdx) => {
                              const bulletState = getRenderedBullet(b);
                              return (
                                <li
                                  key={bIdx}
                                  className={clsx(
                                    bulletState.isApplied &&
                                      "bg-emerald-50 text-emerald-950 font-medium p-1 rounded border-l-2 border-emerald-500 transition-all font-sans"
                                  )}
                                >
                                  {bulletState.text}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between items-baseline font-sans font-semibold text-slate-800 text-[11px]">
                          <span>Software Engineering Intern — Razorpay</span>
                          <span className="text-slate-500 font-normal text-[10px]">Jan 2026 – Present</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-1 text-slate-700">
                          <li>Engineered responsive client-facing interfaces across core views.</li>
                          <li>Standardized reusable frontend component libraries.</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technical Skills */}
                <div>
                  <h3 className="text-xs font-bold font-sans uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-1.5">
                    Technical Skills
                  </h3>
                  <p className="text-slate-700 font-sans">
                    <span className="font-semibold text-slate-900">Technologies & Tools: </span>
                    {parsedResume?.skills && parsedResume.skills.length > 0
                      ? parsedResume.skills.join(", ")
                      : analysis.extractedSkills?.join(", ") || "TypeScript, React, Next.js, Node.js, PostgreSQL, Docker"}
                  </p>
                </div>

                {/* Projects */}
                <div>
                  <h3 className="text-xs font-bold font-sans uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-1.5">
                    Projects
                  </h3>
                  <div className="space-y-3">
                    {parsedResume?.projects && parsedResume.projects.length > 0 ? (
                      parsedResume.projects.map((proj) => (
                        <div key={proj.id} className="space-y-1">
                          <div className="flex justify-between items-baseline font-sans font-semibold text-slate-800 text-[11px]">
                            <span>{proj.title}</span>
                            <span className="text-slate-500 font-normal text-[10px]">{proj.techStack}</span>
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-slate-700">
                            {proj.bullets.map((b, pIdx) => {
                              const bulletState = getRenderedBullet(b);
                              return (
                                <li
                                  key={pIdx}
                                  className={clsx(
                                    bulletState.isApplied &&
                                      "bg-emerald-50 text-emerald-950 font-medium p-1 rounded border-l-2 border-emerald-500 transition-all font-sans"
                                  )}
                                >
                                  {bulletState.text}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))
                    ) : (
                      <div className="space-y-1">
                        <span className="font-semibold text-slate-900 font-sans text-[11px]">
                          Placement Co-pilot — AI Career Suite
                        </span>
                        <p className="text-slate-700">
                          Architected full-stack career platform utilizing modern REST APIs and PostgreSQL.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Education */}
                {parsedResume?.education && parsedResume.education.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold font-sans uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-1.5">
                      Education
                    </h3>
                    <div className="space-y-1">
                      {parsedResume.education.map((edu, eIdx) => (
                        <div key={eIdx} className="flex justify-between items-baseline font-sans text-[11px]">
                          <div>
                            <span className="font-semibold text-slate-800">{edu.institution}</span>
                            <span className="text-slate-600 block text-[10px]">{edu.degree} {edu.score ? `• ${edu.score}` : ""}</span>
                          </div>
                          <span className="text-slate-500 text-[10px]">{edu.year}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
