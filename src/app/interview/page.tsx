import Link from "next/link";
import {
  BookOpen,
  Flame,
  Code2,
  Sparkles,
  ArrowRight,
  Brain,
} from "lucide-react";

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
    title: "Standard Question Bank",
    description:
      "Practice technical, behavioral, and HR interview questions tailored to your selected engineering role.",
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
    actionText: "Start Practicing",
  },
  {
    number: "02",
    title: "Resume & Project Grill",
    description:
      "Experience an in-depth technical interview based on your resume, projects, architecture, implementation decisions, and engineering trade-offs.",
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
    actionText: "Enter Grill Mode",
  },
  {
    number: "03",
    title: "OA & DSA Coding Arena",
    description:
      "Solve coding challenges, execute test cases, analyze time and space complexity, and receive AI-powered code reviews.",
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
    actionText: "Launch Arena",
  },
  {
    number: "04",
    title: "Customize by Resume & JD",
    description:
      "Generate personalized interview questions by analyzing your resume, target company, job description, and technical requirements.",
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
    actionText: "Customize Questions",
  },
];

export default function InterviewLandingPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(100,110,255,0.12)]">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              <Brain className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              AI Practice Interview Coach
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
    </div>
  );
}
