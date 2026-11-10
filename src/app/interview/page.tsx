"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Flame,
  Code2,
  Sparkles,
  ArrowRight,
  Brain,
} from "lucide-react";
import { getAllCustomInterviewSessions, type CustomInterviewSession } from "@/lib/custom-interview-storage";

interface InterviewModeCard {
  number: string;
  title: string;
  description: string;
  icon: typeof BookOpen;
  route: string;
  accent: {
    border: string;
    borderHover: string;
    glow: string;
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeColor: string;
    arrowColor: string;
    numberColor: string;
  };
  tags: string[];
  actionText: string;
}

const INTERVIEW_MODES: InterviewModeCard[] = [
  {
    number: "01",
    title: "Coding Practice",
    description: "Solve algorithm problems with an AI evaluator giving real feedback.",
    icon: Code2,
    route: "/interview/dsa",
    accent: {
      border: "border-violet-500/20",
      borderHover: "hover:border-violet-500/50",
      glow: "hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]",
      iconBg: "bg-violet-500/15 group-hover:bg-violet-500/25 border-violet-500/30",
      iconColor: "text-violet-400 group-hover:text-violet-300",
      badgeBg: "bg-violet-500/10",
      badgeColor: "text-violet-300",
      arrowColor: "text-violet-400 group-hover:text-violet-300",
      numberColor: "text-violet-400/80 font-mono",
    },
    tags: ["30 OA Problems", "Multi-Language IDE", "Test Runner", "Big-O Verification"],
    actionText: "Start Practice →",
  },
  {
    number: "02",
    title: "Technical Interview",
    description: "Answer technical questions for your target role. Get scored on depth and clarity.",
    icon: BookOpen,
    route: "/interview/question-bank",
    accent: {
      border: "border-indigo-500/20",
      borderHover: "hover:border-indigo-500/50",
      glow: "hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]",
      iconBg: "bg-indigo-500/15 group-hover:bg-[#292EDB]/25 border-indigo-500/30",
      iconColor: "text-indigo-400 group-hover:text-indigo-300",
      badgeBg: "bg-indigo-500/10",
      badgeColor: "text-indigo-300",
      arrowColor: "text-indigo-400 group-hover:text-indigo-300",
      numberColor: "text-indigo-400/80 font-mono",
    },
    tags: ["Role-Specific", "STAR Framework", "Live Telemetry", "Bar-Raiser AI"],
    actionText: "Start Practice →",
  },
  {
    number: "03",
    title: "Talk About Your Resume",
    description: "Practice explaining your projects and experience out loud.",
    icon: Flame,
    route: "/interview/resume-grill",
    accent: {
      border: "border-amber-500/20",
      borderHover: "hover:border-amber-500/50",
      glow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]",
      iconBg: "bg-amber-500/15 group-hover:bg-amber-500/25 border-amber-500/30",
      iconColor: "text-amber-400 group-hover:text-amber-300",
      badgeBg: "bg-amber-500/10",
      badgeColor: "text-amber-300",
      arrowColor: "text-amber-400 group-hover:text-amber-300",
      numberColor: "text-amber-400/80 font-mono",
    },
    tags: ["GitHub Deep-Grill", "Architecture Defense", "System Trade-offs", "Failure Recovery"],
    actionText: "Start Practice →",
  },
  {
    number: "04",
    title: "Practice for a Specific Job",
    description: "Paste any job description and get an interview tailored to that role.",
    icon: Sparkles,
    route: "/interview/customize",
    accent: {
      border: "border-emerald-500/20",
      borderHover: "hover:border-emerald-500/50",
      glow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]",
      iconBg: "bg-emerald-500/15 group-hover:bg-emerald-500/25 border-emerald-500/30",
      iconColor: "text-emerald-400 group-hover:text-emerald-300",
      badgeBg: "bg-emerald-500/10",
      badgeColor: "text-emerald-300",
      arrowColor: "text-emerald-400 group-hover:text-emerald-300",
      numberColor: "text-emerald-400/80 font-mono",
    },
    tags: ["Resume Tailored", "Company Presets", "Job Description Match", "Dual-AI Synthesis"],
    actionText: "Start Practice →",
  },
];

export default function InterviewLandingPage() {
  const [sessions, setSessions] = useState<CustomInterviewSession[]>([]);

  useEffect(() => {
    try {
      const stored = getAllCustomInterviewSessions();
      setSessions(stored);
    } catch {
      setSessions([]);
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn">
      <title>Practice Interviews</title>

      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(100,110,255,0.12)]">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              <Brain className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Practice Interviews
            </h1>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Choose your interview mode and prepare for your next technical interview.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-slate-300 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>4 INTERVIEW MODES AVAILABLE</span>
        </div>
      </div>

      {/* ─── FOUR LARGE RECTANGULAR NAVIGATION CARDS (VERTICAL STACK) ───────── */}
      <div className="space-y-4">
        {INTERVIEW_MODES.map((mode) => {
          const Icon = mode.icon;
          return (
            <Link
              key={mode.number}
              href={mode.route}
              className={`group block relative rounded-2xl bg-[#0B0D18] border ${mode.accent.border} ${mode.accent.borderHover} ${mode.accent.glow} p-6 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#151A35] cursor-pointer`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                {/* Left Section: Icon & Numbered Indicator */}
                <div className="flex items-center gap-4 shrink-0">
                  <div
                    className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-inner ${mode.accent.iconBg}`}
                  >
                    <Icon className={`w-7 h-7 transition-colors ${mode.accent.iconColor}`} />
                  </div>
                  <div>
                    <span className={`text-xs font-bold tracking-wider ${mode.accent.numberColor}`}>
                      MODE {mode.number}
                    </span>
                    <div className="text-xs text-slate-500 font-medium">Select to open</div>
                  </div>
                </div>

                {/* Middle Section: Mode Title, Description, and Category Tags */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-bold text-white group-hover:text-white transition-colors">
                      {mode.title}
                    </h2>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {mode.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {mode.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md border border-white/5 transition-colors ${mode.accent.badgeBg} ${mode.accent.badgeColor}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right Section: Action Indicator & Hover Arrow */}
                <div className="flex items-center gap-2 text-xs font-semibold pt-2 md:pt-0 border-t md:border-t-0 border-white/5 md:border-none shrink-0 self-start md:self-center">
                  <span className={`transition-colors ${mode.accent.arrowColor}`}>
                    {mode.actionText}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 group-hover:bg-white/10 ${mode.accent.arrowColor}`}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ─── RECENT SESSIONS SECTION & EMPTY STATE ───────── */}
      <div className="pt-6 border-t border-[rgba(100,110,255,0.12)] space-y-4">
        <h2 className="text-base font-bold text-white tracking-tight">
          Recent Practice Sessions
        </h2>

        {sessions.length === 0 ? (
          <div className="p-8 rounded-2xl border border-[rgba(100,110,255,0.12)] bg-[#0B0D18] text-center">
            <p className="text-xs text-slate-400">
              You haven&apos;t done any practice sessions yet. Pick a mode above to start.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.slice(0, 4).map((s) => (
              <Link
                key={s.sessionId}
                href={`/interview/customize/session/${s.sessionId}`}
                className="p-4 rounded-xl border border-white/8 bg-[#0B0D18] hover:border-indigo-500/40 hover:bg-[#151A35]/50 transition-all flex items-center justify-between"
              >
                <div>
                  <h3 className="text-sm font-semibold text-white">{s.targetRole}</h3>
                  <p className="text-xs text-slate-400">
                    {s.targetCompany ? `${s.targetCompany} · ` : ""}{s.generatedQuestions?.length || 0} questions · {s.difficulty}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
