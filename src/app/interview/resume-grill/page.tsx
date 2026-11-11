"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  ArrowLeft,
  ArrowRight,
  Flame,
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
    iconBg: "bg-[#121212] border-[#292929] group-hover:border-[#3A3A3A]",
    iconColor: "text-[#F5F5F5]",
    borderHover: "hover:border-[#292929]",
    glowHover: "",
    badgeVariant: "indigo",
  },
  cyan: {
    iconBg: "bg-[#121212] border-[#292929] group-hover:border-[#3A3A3A]",
    iconColor: "text-[#38BDF8]",
    borderHover: "hover:border-[#292929]",
    glowHover: "",
    badgeVariant: "indigo",
  },
  blue: {
    iconBg: "bg-[#121212] border-[#292929] group-hover:border-[#3A3A3A]",
    iconColor: "text-[#38BDF8]",
    borderHover: "hover:border-[#292929]",
    glowHover: "",
    badgeVariant: "indigo",
  },
  purple: {
    iconBg: "bg-[#121212] border-[#292929] group-hover:border-[#3A3A3A]",
    iconColor: "text-[#A78BFA]",
    borderHover: "hover:border-[#292929]",
    glowHover: "",
    badgeVariant: "violet",
  },
  sky: {
    iconBg: "bg-[#121212] border-[#292929] group-hover:border-[#3A3A3A]",
    iconColor: "text-[#38BDF8]",
    borderHover: "hover:border-[#292929]",
    glowHover: "",
    badgeVariant: "indigo",
  },
  rose: {
    iconBg: "bg-[#121212] border-[#292929] group-hover:border-[#3A3A3A]",
    iconColor: "text-[#F43F5E]",
    borderHover: "hover:border-[#292929]",
    glowHover: "",
    badgeVariant: "rose",
  },
  amber: {
    iconBg: "bg-[#121212] border-[#292929] group-hover:border-[#3A3A3A]",
    iconColor: "text-[#F59E0B]",
    borderHover: "hover:border-[#292929]",
    glowHover: "",
    badgeVariant: "amber",
  },
  emerald: {
    iconBg: "bg-[#121212] border-[#292929] group-hover:border-[#3A3A3A]",
    iconColor: "text-[#10B981]",
    borderHover: "hover:border-[#292929]",
    glowHover: "",
    badgeVariant: "emerald",
  },
  violet: {
    iconBg: "bg-[#121212] border-[#292929] group-hover:border-[#3A3A3A]",
    iconColor: "text-[#A78BFA]",
    borderHover: "hover:border-[#292929]",
    glowHover: "",
    badgeVariant: "violet",
  },
};

export default function ResumeGrillRoleSelectionPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── HEADER BAR ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1D1D1D] gap-4">
        <div>
          <Link
            href="/interview"
            className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors mb-2 group font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Interview Modes</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#121212] text-[#F59E0B] border border-[#292929]">
              <Flame className="w-6 h-6" />
            </div>
            <span>Choose Your Interview Role</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 max-w-2xl">
            Select your target engineering role to experience an in-depth technical interview based on your projects, architecture, and engineering decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="amber" size="md">
            RESUME &amp; PROJECT GRILL
          </Badge>
          <div className="px-3 py-1 rounded-full bg-[#0D0D0D] border border-[#1D1D1D] text-[#A1A1AA] text-xs font-mono font-medium tabular-nums">
            {QUESTION_BANK_ROLES.length} ROLES AVAILABLE
          </div>
        </div>
      </div>

      {/* ─── ROLES RESPONSIVE GRID (2 OR 3 COLS DESKTOP, 1 COL MOBILE) ───────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {QUESTION_BANK_ROLES.map((role) => {
          const IconComponent = ROLE_ICONS[role.iconName] || Layers;
          const styling = ACCENT_STYLES[role.accent] || ACCENT_STYLES.amber;

          return (
            <Link
              key={role.slug}
              href={`/interview/resume-grill/${role.slug}`}
              className="block group focus:outline-none"
            >
              <Card
                className={clsx(
                  "h-full p-5 sm:p-6 bg-[#0D0D0D] border border-[#1D1D1D] rounded-xl transition-colors cursor-pointer flex flex-col justify-between space-y-4 hover:bg-[#121212]",
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
                    <h3 className="text-lg font-bold text-[#F5F5F5] transition-colors">
                      {role.title}
                    </h3>
                    <p className="text-xs text-[#71717A] mt-1.5 leading-relaxed line-clamp-3">
                      {role.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Section: Topic Tags & Explore Indicator */}
                <div className="pt-3 border-t border-[#1D1D1D] space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {role.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium font-mono px-2 py-0.5 rounded-md bg-[#121212] text-[#A1A1AA] border border-[#1D1D1D] transition-colors"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs font-semibold text-[#A1A1AA] group-hover:text-[#F5F5F5]">
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
