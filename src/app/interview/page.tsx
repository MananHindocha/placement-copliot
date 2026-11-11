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
import { DSA_OA_PROBLEMS } from "@/lib/dsa-oa-questions";

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
      border: "border-[#1D1D1D]",
      borderHover: "hover:border-[#292929]",
      glow: "",
      iconBg: "bg-[#121212] group-hover:bg-[#1A1A1A] border-[#292929] group-hover:border-[#3A3A3A]",
      iconColor: "text-[#F5F5F5]",
      badgeBg: "bg-[#0A0A0A]",
      badgeColor: "text-[#A1A1AA]",
      arrowColor: "text-[#A1A1AA] group-hover:text-[#F5F5F5]",
      numberColor: "text-[#71717A] font-mono",
    },
    tags: [`${DSA_OA_PROBLEMS.length} OA Problems`, "Multi-Language IDE", "Test Runner", "Big-O Verification"],
    actionText: "Start Practice →",
  },
  {
    number: "02",
    title: "Technical Interview",
    description: "Answer technical questions for your target role. Get scored on depth and clarity.",
    icon: BookOpen,
    route: "/interview/question-bank",
    accent: {
      border: "border-[#1D1D1D]",
      borderHover: "hover:border-[#292929]",
      glow: "",
      iconBg: "bg-[#121212] group-hover:bg-[#1A1A1A] border-[#292929] group-hover:border-[#3A3A3A]",
      iconColor: "text-[#F5F5F5]",
      badgeBg: "bg-[#0A0A0A]",
      badgeColor: "text-[#A1A1AA]",
      arrowColor: "text-[#A1A1AA] group-hover:text-[#F5F5F5]",
      numberColor: "text-[#71717A] font-mono",
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
      border: "border-[#1D1D1D]",
      borderHover: "hover:border-[#292929]",
      glow: "",
      iconBg: "bg-[#121212] group-hover:bg-[#1A1A1A] border-[#292929] group-hover:border-[#3A3A3A]",
      iconColor: "text-[#F59E0B]",
      badgeBg: "bg-[#0A0A0A]",
      badgeColor: "text-[#A1A1AA]",
      arrowColor: "text-[#A1A1AA] group-hover:text-[#F5F5F5]",
      numberColor: "text-[#71717A] font-mono",
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
      border: "border-[#1D1D1D]",
      borderHover: "hover:border-[#292929]",
      glow: "",
      iconBg: "bg-[#121212] group-hover:bg-[#1A1A1A] border-[#292929] group-hover:border-[#3A3A3A]",
      iconColor: "text-[#A78BFA]",
      badgeBg: "bg-[#0A0A0A]",
      badgeColor: "text-[#A1A1AA]",
      arrowColor: "text-[#A1A1AA] group-hover:text-[#F5F5F5]",
      numberColor: "text-[#71717A] font-mono",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1D1D1D]">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-lg bg-[#121212] text-[#A78BFA] border border-[#292929]">
              <Brain className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">
              Practice Interviews
            </h1>
          </div>
          <p className="text-sm text-[#A1A1AA] leading-relaxed">
            Choose your interview mode and prepare for your next technical interview.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#0D0D0D] border border-[#1D1D1D] text-[#A1A1AA] self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
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
              className={`group block relative rounded-xl bg-[#0D0D0D] border ${mode.accent.border} ${mode.accent.borderHover} ${mode.accent.glow} p-6 transition-colors hover:bg-[#121212] cursor-pointer`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                {/* Left Section: Icon & Numbered Indicator */}
                <div className="flex items-center gap-4 shrink-0">
                  <div
                    className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors ${mode.accent.iconBg}`}
                  >
                    <Icon className={`w-6 h-6 transition-colors ${mode.accent.iconColor}`} />
                  </div>
                  <div>
                    <span className={`text-xs font-bold tracking-wider ${mode.accent.numberColor}`}>
                      MODE {mode.number}
                    </span>
                    <div className="text-xs text-[#71717A] font-medium">Select to open</div>
                  </div>
                </div>

                {/* Middle Section: Mode Title, Description, and Category Tags */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-bold text-[#F5F5F5] group-hover:text-[#F5F5F5] transition-colors">
                      {mode.title}
                    </h2>
                  </div>

                  <p className="text-xs text-[#A1A1AA] leading-relaxed">
                    {mode.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {mode.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md border border-[#1D1D1D] transition-colors ${mode.accent.badgeBg} ${mode.accent.badgeColor}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right Section: Action Indicator & Hover Arrow */}
                <div className="flex items-center gap-2 text-xs font-semibold pt-2 md:pt-0 border-t md:border-t-0 border-[#1D1D1D] md:border-none shrink-0 self-start md:self-center">
                  <span className={`transition-colors ${mode.accent.arrowColor}`}>
                    {mode.actionText}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-lg border border-[#292929] bg-[#121212] flex items-center justify-center transition-transform group-hover:translate-x-0.5 ${mode.accent.arrowColor}`}
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
      <div className="pt-6 border-t border-[#1D1D1D] space-y-4">
        <h2 className="text-base font-bold text-[#F5F5F5] tracking-tight">
          Recent Practice Sessions
        </h2>

        {sessions.length === 0 ? (
          <div className="p-8 rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] text-center">
            <p className="text-xs text-[#71717A]">
              You haven&apos;t done any practice sessions yet. Pick a mode above to start.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.slice(0, 4).map((s) => (
              <Link
                key={s.sessionId}
                href={`/interview/customize/session/${s.sessionId}`}
                className="p-4 rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] hover:border-[#292929] hover:bg-[#121212] transition-colors flex items-center justify-between"
              >
                <div>
                  <h3 className="text-sm font-semibold text-[#F5F5F5]">{s.targetRole}</h3>
                  <p className="text-xs text-[#71717A]">
                    {s.targetCompany ? `${s.targetCompany} · ` : ""}{s.generatedQuestions?.length || 0} questions · {s.difficulty}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#A1A1AA]" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
