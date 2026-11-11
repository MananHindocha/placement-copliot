"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
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
    iconBg: "bg-[#171820] border-[#262733] group-hover:border-[#735BA0]/50",
    iconColor: "text-[#B293E2]",
    borderHover: "hover:border-[#735BA0]/60",
    glowHover: "",
    badgeVariant: "indigo",
  },
  cyan: {
    iconBg: "bg-[#171820] border-[#262733] group-hover:border-[#735BA0]/50",
    iconColor: "text-[#B293E2]",
    borderHover: "hover:border-[#735BA0]/60",
    glowHover: "",
    badgeVariant: "indigo",
  },
  blue: {
    iconBg: "bg-[#171820] border-[#262733] group-hover:border-[#735BA0]/50",
    iconColor: "text-[#B293E2]",
    borderHover: "hover:border-[#735BA0]/60",
    glowHover: "",
    badgeVariant: "indigo",
  },
  purple: {
    iconBg: "bg-[#171820] border-[#262733] group-hover:border-[#735BA0]/50",
    iconColor: "text-[#B293E2]",
    borderHover: "hover:border-[#735BA0]/60",
    glowHover: "",
    badgeVariant: "violet",
  },
  sky: {
    iconBg: "bg-[#171820] border-[#262733] group-hover:border-[#735BA0]/50",
    iconColor: "text-[#B293E2]",
    borderHover: "hover:border-[#735BA0]/60",
    glowHover: "",
    badgeVariant: "indigo",
  },
  rose: {
    iconBg: "bg-[#171820] border-[#262733] group-hover:border-[#735BA0]/50",
    iconColor: "text-rose-400",
    borderHover: "hover:border-[#735BA0]/60",
    glowHover: "",
    badgeVariant: "rose",
  },
  amber: {
    iconBg: "bg-[#171820] border-[#262733] group-hover:border-[#735BA0]/50",
    iconColor: "text-amber-400",
    borderHover: "hover:border-[#735BA0]/60",
    glowHover: "",
    badgeVariant: "amber",
  },
  emerald: {
    iconBg: "bg-[#171820] border-[#262733] group-hover:border-[#735BA0]/50",
    iconColor: "text-emerald-400",
    borderHover: "hover:border-[#735BA0]/60",
    glowHover: "",
    badgeVariant: "emerald",
  },
  violet: {
    iconBg: "bg-[#171820] border-[#262733] group-hover:border-[#735BA0]/50",
    iconColor: "text-[#B293E2]",
    borderHover: "hover:border-[#735BA0]/60",
    glowHover: "",
    badgeVariant: "violet",
  },
};

export default function QuestionBankRoleSelectionPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── HEADER BAR ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#22232D] gap-4">
        <div>
          <Link
            href="/interview"
            className="inline-flex items-center gap-1.5 text-xs text-[#B293E2] hover:text-[#C3A9EB] transition-colors mb-2 group font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Interview Modes</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F8F8F9] flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#171820] text-[#B293E2] border border-[#262733]">
              <BookOpen className="w-6 h-6" />
            </div>
            <span>Choose Your Interview Role</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#969085] mt-1 max-w-2xl">
            Select your target role to get a personalized interview experience with relevant technical, behavioral, and engineering questions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="indigo" size="md">
            QUESTION BANK
          </Badge>
          <div className="px-3 py-1 rounded-full bg-[#111218] border border-[#22232D] text-[#969085] text-xs font-mono font-medium tabular-nums">
            {QUESTION_BANK_ROLES.length} ROLES AVAILABLE
          </div>
        </div>
      </div>

      {/* ─── ROLES RESPONSIVE GRID (2 OR 3 COLS DESKTOP, 1 COL MOBILE) ───────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {QUESTION_BANK_ROLES.map((role) => {
          const IconComponent = ROLE_ICONS[role.iconName] || Layers;
          const styling = ACCENT_STYLES[role.accent] || ACCENT_STYLES.indigo;

          return (
            <Link
              key={role.slug}
              href={`/interview/question-bank/${role.slug}`}
              className="block group focus:outline-none"
            >
              <Card
                className={clsx(
                  "h-full p-5 sm:p-6 bg-[#111218] border border-[#22232D] rounded-xl transition-colors cursor-pointer flex flex-col justify-between space-y-4 hover:bg-[#171820]/70",
                  styling.borderHover,
                  styling.glowHover
                )}
              >
                {/* Top Section: Icon & Category */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div
                      className={clsx(
                        "w-11 h-11 rounded-lg border flex items-center justify-center transition-colors",
                        styling.iconBg,
                        styling.iconColor
                      )}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <Badge variant={styling.badgeVariant} size="sm">
                      {role.category}
                    </Badge>
                  </div>

                  {/* Role Title & Description */}
                  <div>
                    <h3 className="text-lg font-bold text-[#F8F8F9] group-hover:text-[#B293E2] transition-colors">
                      {role.title}
                    </h3>
                    <p className="text-xs text-[#969085] mt-1.5 leading-relaxed line-clamp-3">
                      {role.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Section: Topic Tags & Explore Indicator */}
                <div className="pt-3 border-t border-[#22232D] space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {role.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium font-mono px-2 py-0.5 rounded-md bg-[#171820] text-[#969085] border border-[#262733] transition-colors"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs font-semibold text-[#B293E2] group-hover:text-[#C3A9EB]">
                    <span>Explore Interview</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
