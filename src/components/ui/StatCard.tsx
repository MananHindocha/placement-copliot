import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import type { StatCard as StatCardType } from "@/types";
import {
  Send,
  CalendarCheck,
  FileText,
  TrendingUp,
  Users,
  Briefcase,
  MessageSquare,
  Target,
  Code2,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Send,
  CalendarCheck,
  FileText,
  TrendingUp,
  Users,
  Briefcase,
  MessageSquare,
  Target,
  Code2,
};

const colorMap: Record<string, { bg: string; icon: string; delta: string }> = {
  indigo: {
    bg: "bg-[#121212] border-[#292929]",
    icon: "text-[#F5F5F5]",
    delta: "text-[#A1A1AA]",
  },
  emerald: {
    bg: "bg-[#121212] border-[#292929]",
    icon: "text-[#10B981]",
    delta: "text-[#10B981]",
  },
  amber: {
    bg: "bg-[#121212] border-[#292929]",
    icon: "text-[#F59E0B]",
    delta: "text-[#F59E0B]",
  },
  rose: {
    bg: "bg-[#121212] border-[#292929]",
    icon: "text-[#F43F5E]",
    delta: "text-[#F43F5E]",
  },
  violet: {
    bg: "bg-[#121212] border-[#292929]",
    icon: "text-[#A78BFA]",
    delta: "text-[#A78BFA]",
  },
};

export default function StatCard({ label, value, delta, deltaPositive, icon, color }: StatCardType) {
  const Icon = ICONS[icon] ?? TrendingUp;
  const c = colorMap[color] ?? colorMap.indigo;

  return (
    <div className="bg-[#0D0D0D] border border-[#1D1D1D] rounded-xl p-5 hover:border-[#292929] hover:bg-[#121212] transition-colors duration-150">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#A1A1AA]">{label}</p>
          <p className="text-2xl font-semibold text-[#F5F5F5] mt-2 tracking-tight tabular-nums">{value}</p>
          {delta && (
            <p
              className={clsx(
                "text-xs mt-2 font-medium",
                deltaPositive ? "text-[#10B981]" : "text-[#F43F5E]"
              )}
            >
              {deltaPositive ? "▲" : "▼"} {delta}
            </p>
          )}
        </div>
        <div className={clsx("w-9 h-9 rounded-lg border flex items-center justify-center shrink-0", c.bg)}>
          <Icon className={clsx("w-4 h-4", c.icon)} />
        </div>
      </div>
    </div>
  );
}
