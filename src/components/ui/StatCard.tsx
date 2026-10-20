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
    bg: "bg-indigo-500/15 border-indigo-500/20",
    icon: "text-indigo-400",
    delta: "text-indigo-400",
  },
  emerald: {
    bg: "bg-emerald-500/15 border-emerald-500/20",
    icon: "text-emerald-400",
    delta: "text-emerald-400",
  },
  amber: {
    bg: "bg-amber-500/15 border-amber-500/20",
    icon: "text-amber-400",
    delta: "text-amber-400",
  },
  rose: {
    bg: "bg-rose-500/15 border-rose-500/20",
    icon: "text-rose-400",
    delta: "text-rose-400",
  },
  violet: {
    bg: "bg-violet-500/15 border-violet-500/20",
    icon: "text-violet-400",
    delta: "text-violet-400",
  },
};

export default function StatCard({ label, value, delta, deltaPositive, icon, color }: StatCardType) {
  const Icon = ICONS[icon] ?? TrendingUp;
  const c = colorMap[color] ?? colorMap.indigo;

  return (
    <div className="bg-[#111827] border border-white/6 rounded-2xl p-5 hover:border-white/12 transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 font-medium">{label}</p>
          <p className="text-3xl font-bold text-white mt-1.5">{value}</p>
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
