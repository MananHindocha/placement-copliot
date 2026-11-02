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
    bg: "bg-[rgba(27,31,184,0.20)] border-[rgba(100,110,255,0.28)]",
    icon: "text-[#777CFF]",
    delta: "text-[#777CFF]",
  },
  emerald: {
    bg: "bg-emerald-500/15 border-emerald-500/25",
    icon: "text-emerald-400",
    delta: "text-emerald-400",
  },
  amber: {
    bg: "bg-amber-500/15 border-amber-500/25",
    icon: "text-amber-400",
    delta: "text-amber-400",
  },
  rose: {
    bg: "bg-rose-500/15 border-rose-500/25",
    icon: "text-rose-400",
    delta: "text-rose-400",
  },
  violet: {
    bg: "bg-violet-500/15 border-violet-500/25",
    icon: "text-violet-400",
    delta: "text-violet-400",
  },
};

export default function StatCard({ label, value, delta, deltaPositive, icon, color }: StatCardType) {
  const Icon = ICONS[icon] ?? TrendingUp;
  const c = colorMap[color] ?? colorMap.indigo;

  return (
    <div className="bg-[#0B0D18] border border-[rgba(100,110,255,0.12)] rounded-2xl p-5 hover:border-[rgba(100,110,255,0.28)] hover:bg-[#151A35]/40 transition-all duration-200 hover:shadow-xl hover:shadow-[rgba(27,31,184,0.10)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#A2A7C0] font-medium">{label}</p>
          <p className="text-3xl font-bold text-[#F5F6FF] mt-1.5">{value}</p>
          {delta && (
            <p
              className={clsx(
                "text-xs mt-1.5 font-medium",
                deltaPositive ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {deltaPositive ? "▲" : "▼"} {delta}
            </p>
          )}
        </div>
        <div className={clsx("w-10 h-10 rounded-xl border flex items-center justify-center", c.bg)}>
          <Icon className={clsx("w-5 h-5", c.icon)} />
        </div>
      </div>
    </div>
  );
}
