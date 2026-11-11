"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LiveAgentInterviewRoom from "@/components/interview/LiveAgentInterviewRoom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Layers,
  Layout,
  Server,
  Brain,
  Cloud,
  Activity,
  BarChart3,
  Smartphone,
  ShieldAlert,
} from "lucide-react";
import { clsx } from "clsx";
import { QUESTION_BANK_ROLES, type InterviewRoleMeta } from "@/lib/interview-roles";

// Map string icon names to Lucide icon components
const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Layers,
  Layout,
  Server,
  Brain,
  Cloud,
  Activity,
  BarChart3,
  Smartphone,
  ShieldAlert,
};

const ACCENT_STYLES: Record<
  InterviewRoleMeta["accent"],
  {
    iconBg: string;
    iconColor: string;
    borderHover: string;
    glowHover: string;
    badgeVariant: "indigo" | "emerald" | "amber" | "violet" | "rose";
  }
> = {
  indigo: {
    iconBg: "bg-indigo-500/15 border-indigo-500/30",
    iconColor: "text-indigo-400",
    borderHover: "hover:border-indigo-500/50",
    glowHover: "group-hover:shadow-[0_0_28px_rgba(99,102,241,0.18)]",
    badgeVariant: "indigo",
  },
  cyan: {
    iconBg: "bg-cyan-500/15 border-cyan-500/30",
    iconColor: "text-cyan-400",
    borderHover: "hover:border-cyan-500/50",
    glowHover: "group-hover:shadow-[0_0_28px_rgba(6,182,212,0.18)]",
    badgeVariant: "indigo",
  },
  blue: {
    iconBg: "bg-blue-500/15 border-blue-500/30",
    iconColor: "text-blue-400",
    borderHover: "hover:border-blue-500/50",
    glowHover: "group-hover:shadow-[0_0_28px_rgba(59,130,246,0.18)]",
    badgeVariant: "indigo",
  },
  purple: {
    iconBg: "bg-purple-500/15 border-purple-500/30",
    iconColor: "text-purple-400",
    borderHover: "hover:border-purple-500/50",
    glowHover: "group-hover:shadow-[0_0_28px_rgba(168,85,247,0.18)]",
    badgeVariant: "violet",
  },
  sky: {
    iconBg: "bg-sky-500/15 border-sky-500/30",
    iconColor: "text-sky-400",
    borderHover: "hover:border-sky-500/50",
    glowHover: "group-hover:shadow-[0_0_28px_rgba(14,165,233,0.18)]",
    badgeVariant: "indigo",
  },
  rose: {
    iconBg: "bg-rose-500/15 border-rose-500/30",
    iconColor: "text-rose-400",
    borderHover: "hover:border-rose-500/50",
    glowHover: "group-hover:shadow-[0_0_28px_rgba(244,63,94,0.18)]",
    badgeVariant: "rose",
  },
  amber: {
    iconBg: "bg-amber-500/15 border-amber-500/30",
    iconColor: "text-amber-400",
    borderHover: "hover:border-amber-500/50",
    glowHover: "group-hover:shadow-[0_0_28px_rgba(245,158,11,0.18)]",
    badgeVariant: "amber",
  },
  emerald: {
    iconBg: "bg-emerald-500/15 border-emerald-500/30",
    iconColor: "text-emerald-400",
    borderHover: "hover:border-emerald-500/50",
    glowHover: "group-hover:shadow-[0_0_28px_rgba(16,185,129,0.18)]",
    badgeVariant: "emerald",
  },
  violet: {
    iconBg: "bg-violet-500/15 border-violet-500/30",
    iconColor: "text-violet-400",
    borderHover: "hover:border-violet-500/50",
    glowHover: "group-hover:shadow-[0_0_28px_rgba(139,92,246,0.18)]",
    badgeVariant: "violet",
  },
};

export default function QuestionBankRoleSelectionPage() {
  const [liveAgentMode, setLiveAgentMode] = useState(true);
  const [selectedRole, setSelectedRole] = useState<InterviewRoleMeta | null>(null);
  const [interviewStarted, setInterviewStarted] = useState(false);

  if (interviewStarted && selectedRole) {
    return (
      <LiveAgentInterviewRoom
        targetRole={selectedRole.title || "Full-Stack SDE"}
        onExit={() => setInterviewStarted(false)}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── HEADER BAR ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[rgba(100,110,255,0.12)] gap-4">
        <div>
          <Link
            href="/interview"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mb-2 group font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Interview Modes</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              <BookOpen className="w-6 h-6" />
            </div>
            <span>Choose Your Interview Role</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Select your target role to launch a live multi-turn conversational AI interviewer grounded in your resume and skill evidence matrix.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLiveAgentMode((prev) => !prev)}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
              liveAgentMode
                ? "bg-indigo-600/25 border-indigo-500/50 text-indigo-200 shadow-sm shadow-indigo-500/20"
                : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
            )}
          >
            {liveAgentMode ? "⚡ Live Conversational AI Interviewer: ON" : "📚 Classic Question Bank Mode"}
          </button>
          <Badge variant="indigo" size="md">
            QUESTION BANK
          </Badge>
          <div className="px-3 py-1 rounded-full bg-white/5 border border-[rgba(100,110,255,0.12)] text-slate-300 text-xs font-mono font-medium">
            {QUESTION_BANK_ROLES.length} ROLES AVAILABLE
          </div>
        </div>
      </div>

      {/* ─── ROLES RESPONSIVE GRID (2 OR 3 COLS DESKTOP, 1 COL MOBILE) ───────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {QUESTION_BANK_ROLES.map((role) => {
          const IconComponent = ROLE_ICONS[role.iconName] || Layers;
          const styling = ACCENT_STYLES[role.accent] || ACCENT_STYLES.indigo;

          const cardInner = (
            <Card
              className={clsx(
                "h-full p-5 sm:p-6 bg-[#0B0D18] border border-white/10 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4",
                styling.borderHover,
                styling.glowHover,
                "group-hover:-translate-y-0.5"
              )}
            >
              {/* Top Section: Icon & Category */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div
                    className={clsx(
                      "w-12 h-12 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105",
                      styling.iconBg,
                      styling.iconColor
                    )}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>

                  <Badge variant={styling.badgeVariant} size="sm">
                    {role.category}
                  </Badge>
                </div>

                {/* Role Title & Description */}
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {role.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-3">
                    {role.description}
                  </p>
                </div>
              </div>

              {/* Bottom Section: Topic Tags & Explore / Start Indicator */}
              <div className="pt-3 border-t border-[rgba(100,110,255,0.12)] space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {role.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-medium font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-[rgba(100,110,255,0.12)] group-hover:border-white/10 transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {liveAgentMode ? (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole(role);
                        setInterviewStarted(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      ⚡ Start Interview →
                    </button>
                    <Link
                      href={`/interview/question-bank/${role.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] font-medium text-slate-400 hover:text-indigo-300 transition-colors"
                    >
                      Static Bank
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                    <span>Explore Interview</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </div>
                )}
              </div>
            </Card>
          );

          if (liveAgentMode) {
            return (
              <div
                key={role.slug}
                onClick={() => {
                  setSelectedRole(role);
                  setInterviewStarted(true);
                }}
                className="block group focus:outline-none"
              >
                {cardInner}
              </div>
            );
          }

          return (
            <Link
              key={role.slug}
              href={`/interview/question-bank/${role.slug}`}
              className="block group focus:outline-none"
            >
              {cardInner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
