"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { getResumeAnalysis } from "@/lib/services/resume.service";
import type { ResumeAnalysis } from "@/types";
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
} from "lucide-react";
import { clsx } from "clsx";

const SECTION_LABELS: Record<string, string> = {
  summary: "Professional Summary",
  experience: "Work Experience",
  skills: "Skills",
  education: "Education",
};

const IMPACT_BADGE: Record<string, "rose" | "amber" | "emerald"> = {
  high: "rose",
  medium: "amber",
  low: "emerald",
};

export default function ResumePage() {
  const [activeTab, setActiveTab] = useState<"analyse" | "tailor">("analyse");
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>("s1");
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalysis = () => {
    setLoading(true);
    setError(null);
    getResumeAnalysis()
      .then((data) => {
        setAnalysis(data);
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

  const handleCopy = async (id: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        // Clipboard write blocked
      }
    }
  };

  const handleApply = (id: string) => {
    setAppliedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleReset = (id: string) => {
    setAppliedSuggestions((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const matchScore = analysis?.matchScore ?? 82;
  const scoreColor =
    matchScore >= 85
      ? "text-emerald-400"
      : matchScore >= 70
      ? "text-amber-400"
      : "text-rose-400";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Error Banner */}
      {error && (
        <ErrorBanner
          title="Resume Analysis Sync Error"
          message={error}
          onRetry={loadAnalysis}
        />
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-[#111827] border border-white/6 rounded-xl w-fit">
        {(["analyse", "tailor"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all",
              activeTab === tab
                ? "bg-indigo-500 text-white shadow"
                : "text-slate-400 hover:text-white"
            )}
          >
            {tab === "analyse" ? "📊 Analyse & Score" : "✨ Tailor Mode"}
          </button>
        ))}
      </div>

      {loading && !analysis ? (
        <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-sm">Loading resume telemetry...</span>
        </div>
      ) : analysis ? (
        activeTab === "analyse" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload zone */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <h3 className="text-sm font-semibold text-white mb-4">Upload Resume</h3>
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-indigo-500/40 transition-colors cursor-pointer group">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-indigo-400" />
                  </div>
                  <p className="text-sm text-slate-300 font-medium mb-1">
                    Drop your resume here
                  </p>
                  <p className="text-xs text-slate-500 mb-4">PDF, DOCX up to 5MB</p>
                  <Button variant="secondary" size="sm">
                    Browse Files
                  </Button>
                </div>
              </Card>

              {/* Target role selector */}
              <Card>
                <h3 className="text-sm font-semibold text-white mb-3">Target Role</h3>
                <div className="p-3 rounded-xl bg-white/3 border border-white/6">
                  <p className="text-sm font-medium text-white">{analysis.jobTitle}</p>
                  <p className="text-xs text-slate-400">{analysis.company || "General Tech Profile"}</p>
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
                  Change Target Role
                </Button>
              </Card>
            </div>

            {/* Scores & breakdown */}
            <div className="lg:col-span-2 space-y-6">
              {/* Score cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-medium">JD Match Score</span>
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className={clsx("text-4xl font-extrabold mb-3", scoreColor)}>
                    {analysis.matchScore}%
                  </div>
                  <ProgressBar
                    value={analysis.matchScore}
                    color={analysis.matchScore >= 80 ? "emerald" : "amber"}
                    size="md"
                    label="JD Match score progress"
                  />
                  <p className="text-xs text-slate-500 mt-2">Target: 85%+ for top candidate tier</p>
                </Card>

                <Card>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-medium">ATS Parsability</span>
                    <FileText className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="text-4xl font-extrabold text-violet-400 mb-3">
                    {analysis.atsScore}%
                  </div>
                  <ProgressBar value={analysis.atsScore} color="violet" size="md" label="ATS Parsability score progress" />
                  <p className="text-xs text-slate-500 mt-2">Standard headings, readable fonts</p>
                </Card>
              </div>

              {/* Strengths & Gaps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Strengths</h3>
                  </div>
                  <ul className="space-y-2">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                    {analysis.strengths.length === 0 && (
                      <li className="text-xs text-slate-500">No strengths recorded yet.</li>
                    )}
                  </ul>
                </Card>

                <Card>
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <h3 className="text-sm font-semibold text-white">Gaps to Address</h3>
                  </div>
                  <ul className="space-y-2">
                    {analysis.gaps.map((g, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                        {g}
                      </li>
                    ))}
                    {analysis.gaps.length === 0 && (
                      <li className="text-xs text-slate-500">No critical gaps identified.</li>
                    )}
                  </ul>
                </Card>
              </div>

              {/* Keywords */}
              <Card>
                <h3 className="text-sm font-semibold text-white mb-3">Keyword Analysis</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.keywords.map((kw) => (
                    <span
                      key={kw.word}
                      className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border",
                        kw.present
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-300 border-rose-500/20"
                      )}
                    >
                      {kw.present ? (
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3 h-3 text-rose-400" />
                      )}
                      {kw.word}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        ) : (
          /* Tailor mode */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Suggestions list */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">AI Tailor Suggestions</h3>
                  <p className="text-xs text-slate-400">
                    Apply suggestions to improve your resume match score
                  </p>
                </div>
                <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                  {appliedSuggestions.size} of {analysis.suggestions.length} applied
                </span>
              </div>

              {analysis.suggestions.map((suggestion) => {
                const isExpanded = expandedSuggestion === suggestion.id;
                const isApplied = appliedSuggestions.has(suggestion.id);
                return (
                  <Card key={suggestion.id} padding="none">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      className="w-full text-left flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/2 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl"
                      onClick={() =>
                        setExpandedSuggestion(isExpanded ? null : suggestion.id)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={IMPACT_BADGE[suggestion.impact]} size="sm">
                          {suggestion.impact} impact
                        </Badge>
                        <span className="text-sm font-medium text-white">
                          {SECTION_LABELS[suggestion.section]}
                        </span>
                        {isApplied && (
                          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Applied
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 space-y-3 border-t border-white/5">
                        {/* Original */}
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                            Current
                          </p>
                          <div className="p-3 rounded-xl bg-white/2 border border-white/6 text-xs text-slate-400 line-through leading-relaxed">
                            {suggestion.original}
                          </div>
                        </div>

                        {/* Suggested */}
                        <div>
                          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI Tailored
                          </p>
                          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed font-medium">
                            {suggestion.suggested}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant={isApplied ? "secondary" : "primary"}
                            size="sm"
                            onClick={() => handleApply(suggestion.id)}
                          >
                            {isApplied ? "Revert" : "Apply to Resume"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Copy className="w-3.5 h-3.5" />}
                            onClick={() => handleCopy(suggestion.id, suggestion.suggested)}
                          >
                            {copiedId === suggestion.id ? "Copied!" : "Copy"}
                          </Button>
                          {isApplied && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<RotateCcw className="w-3.5 h-3.5" />}
                              onClick={() => handleReset(suggestion.id)}
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Live Preview */}
            <Card>
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Resume Live Preview</h3>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.print();
                    }
                  }}
                >
                  Export PDF
                </Button>
              </div>
              <div className="bg-white rounded-xl p-6 text-slate-800 text-xs leading-relaxed min-h-[400px]">
                <div className="border-b border-slate-200 pb-3 mb-4">
                  <h2 className="text-base font-bold text-slate-900">Arjun Kumar</h2>
                  <p className="text-slate-500 text-xs">
                    arjun.kumar@email.com · linkedin.com/in/arjunkumar · github.com/arjunkumar
                  </p>
                </div>
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Summary
                    </h3>
                    {appliedSuggestions.has("s1") && (
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        Tailored ✨
                      </span>
                    )}
                  </div>
                  <p className={clsx("text-slate-600", appliedSuggestions.has("s1") && "bg-emerald-50 p-2 rounded border border-emerald-200 font-medium")}>
                    {appliedSuggestions.has("s1")
                      ? "Full-stack engineer with 3+ years experience designing distributed payment pipelines and high-throughput microservices using TypeScript, React, and Node.js. Proven track record improving latency and scalability for financial workflows."
                      : "Full-stack engineer with 3+ years building high-scale consumer products, specialising in TypeScript, React, and API-driven architectures — eager to contribute to Stripe's payments infrastructure."}
                  </p>
                </div>
                <div className="mb-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Experience
                  </h3>
                  <div>
                    <p className="font-semibold text-slate-800">Software Engineer · TechCorp</p>
                    <p className="text-slate-500 text-[10px]">Jul 2023 – Present</p>
                    <ul className="mt-1 space-y-0.5 list-disc list-inside text-slate-600">
                      <li>
                        Engineered an analytics dashboard that reduced reporting time by 40%,
                        serving 200+ daily active users.
                      </li>
                      <li>
                        Built a microservices-based notification system handling 50k events/day.
                      </li>
                    </ul>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Skills
                  </h3>
                  <p className="text-slate-600">
                    Node.js · React · TypeScript · PostgreSQL · Redis · Docker · GraphQL · REST APIs
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )
      ) : null}
    </div>
  );
}
