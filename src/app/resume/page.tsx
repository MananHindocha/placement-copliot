"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { RESUME_ANALYSIS } from "@/lib/mock-data";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Target,
  Zap,
  Copy,
  RotateCcw,
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
  const analysis = RESUME_ANALYSIS;

  const scoreColor =
    analysis.matchScore >= 85
      ? "text-emerald-400"
      : analysis.matchScore >= 70
      ? "text-amber-400"
      : "text-rose-400";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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

      {activeTab === "analyse" ? (
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
              {/* Current file */}
              <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    Arjun_Kumar_Resume.pdf
                  </p>
                  <p className="text-xs text-slate-400">Uploaded · 245 KB</p>
                </div>
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-white mb-3">Target Job</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Job Title</label>
                  <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-white">
                    {analysis.jobTitle}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Company</label>
                  <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-white">
                    {analysis.company}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Job Description</label>
                  <textarea
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-slate-300 placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500/50 h-24"
                    placeholder="Paste JD here..."
                    defaultValue="Join Stripe's core product team building payment infrastructure..."
                  />
                </div>
                <Button variant="primary" size="md" icon={<Sparkles className="w-4 h-4" />} className="w-full">
                  Analyse Match
                </Button>
              </div>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Score cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center">
                <p className="text-xs text-slate-400 mb-2 font-medium">Match Score</p>
                <p className={clsx("text-5xl font-black mb-1", scoreColor)}>
                  {analysis.matchScore}%
                </p>
                <p className="text-xs text-slate-500">vs. {analysis.company} JD</p>
                <ProgressBar value={analysis.matchScore} color="indigo" size="sm" className="mt-3" />
              </Card>
              <Card className="text-center">
                <p className="text-xs text-slate-400 mb-2 font-medium">ATS Score</p>
                <p className={clsx("text-5xl font-black mb-1", "text-amber-400")}>
                  {analysis.atsScore}%
                </p>
                <p className="text-xs text-slate-500">Applicant Tracking</p>
                <ProgressBar value={analysis.atsScore} color="amber" size="sm" className="mt-3" />
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
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                      <span className="text-xs text-slate-300 leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-semibold text-white">Gaps to Fix</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.gaps.map((g, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                      <span className="text-xs text-slate-300 leading-relaxed">{g}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Keyword analysis */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Keyword Coverage</h3>
                <span className="ml-auto text-xs text-slate-400">
                  {analysis.keywords.filter((k) => k.present).length}/{analysis.keywords.length} found
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.keywords.map((kw) => (
                  <span
                    key={kw.word}
                    className={clsx(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                      kw.present
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-300 border-rose-500/20"
                    )}
                  >
                    {kw.present ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {kw.word}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* Tailor Mode */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">AI Suggestions</h3>
                <Badge variant="amber" size="sm" className="ml-auto">
                  {analysis.suggestions.length} improvements
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Apply these changes to boost your match score to 94%+
              </p>
              <div className="space-y-3">
                {analysis.suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="border border-white/6 rounded-xl overflow-hidden hover:border-white/12 transition-all"
                  >
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      onClick={() =>
                        setExpandedSuggestion(expandedSuggestion === s.id ? null : s.id)
                      }
                    >
                      <Badge variant={IMPACT_BADGE[s.impact]} size="sm">
                        {s.impact} impact
                      </Badge>
                      <span className="text-xs font-medium text-slate-300">
                        {SECTION_LABELS[s.section]}
                      </span>
                      <span className="ml-auto text-slate-500">
                        {expandedSuggestion === s.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </span>
                    </button>
                    {expandedSuggestion === s.id && (
                      <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                        <div>
                          <p className="text-xs text-slate-500 mb-1.5 mt-3">Current</p>
                          <div className="px-3 py-2.5 rounded-lg bg-rose-500/5 border border-rose-500/15 text-xs text-slate-300 leading-relaxed line-through decoration-rose-400/50">
                            {s.original}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1.5">Suggested</p>
                          <div className="px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-xs text-slate-200 leading-relaxed">
                            {s.suggested}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="success" size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />}>
                            Apply
                          </Button>
                          <Button variant="ghost" size="sm" icon={<Copy className="w-3.5 h-3.5" />}>
                            Copy
                          </Button>
                          <Button variant="ghost" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />}>
                            Regenerate
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Preview panel */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Resume Preview</h3>
              <Button variant="primary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
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
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Summary
                </h3>
                <p className="text-slate-600">
                  Full-stack engineer with 3+ years building high-scale consumer products,
                  specialising in TypeScript, React, and API-driven architectures — eager to
                  contribute to Stripe&apos;s payments infrastructure.
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
      )}
    </div>
  );
}
