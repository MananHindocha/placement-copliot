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
    bg: "bg-[#171820] border-[#262733]",
    icon: "text-[#B293E2]",
    delta: "text-[#B293E2]",
  },
  emerald: {
    bg: "bg-[#171820] border-[#262733]",
    icon: "text-emerald-400",
    delta: "text-emerald-400",
  },
  amber: {
    bg: "bg-[#171820] border-[#262733]",
    icon: "text-amber-400",
    delta: "text-amber-400",
  },
  rose: {
    bg: "bg-[#171820] border-[#262733]",
    icon: "text-rose-400",
    delta: "text-rose-400",
  },
  violet: {
    bg: "bg-[#171820] border-[#262733]",
    icon: "text-[#B293E2]",
    delta: "text-[#B293E2]",
  },
};

export default function StatCard({ label, value, delta, deltaPositive, icon, color }: StatCardType) {
  const Icon = ICONS[icon] ?? TrendingUp;
  const c = colorMap[color] ?? colorMap.indigo;

  return (
    <div className="bg-[#111218] border border-[#22232D] rounded-xl p-5 hover:border-[#313241] hover:bg-[#14151D] transition-colors duration-150">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#969085]">{label}</p>
          <p className="text-2xl font-semibold text-[#F8F8F9] mt-2 tracking-tight tabular-nums">{value}</p>
          {delta && (
            <p
              className={clsx(
                "text-xs mt-2 font-medium",
                deltaPositive ? "text-emerald-400" : "text-rose-400"
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
