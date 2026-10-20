import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import { READINESS_MILESTONES, READINESS_DOMAINS } from "@/lib/mock-data";
import type { ReadinessMilestone } from "@/types";
import {
  CheckCircle2,
  Circle,
  FileText,
  Code2,
  Users,
  MessageSquare,
  Send,
  Target,
  Calendar,
  Flame,
  TrendingUp,
  Plus,
} from "lucide-react";
import { clsx } from "clsx";

const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  resume: { icon: FileText, label: "Resume", color: "text-indigo-400" },
  skills: { icon: Code2, label: "Skills", color: "text-violet-400" },
  network: { icon: Users, label: "Networking", color: "text-amber-400" },
  interview: { icon: MessageSquare, label: "Interviews", color: "text-emerald-400" },
  applications: { icon: Send, label: "Applications", color: "text-rose-400" },
};

const PRIORITY_BADGE: Record<string, "rose" | "amber" | "slate"> = {
  high: "rose",
  medium: "amber",
  low: "slate",
};

function MilestoneRow({ milestone }: { milestone: ReadinessMilestone }) {
  const config = CATEGORY_CONFIG[milestone.category] ?? CATEGORY_CONFIG.resume;
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        "flex items-start gap-4 p-4 rounded-xl border transition-all",
        milestone.completed
          ? "bg-emerald-500/5 border-emerald-500/15"
          : "bg-[#111827] border-white/6 hover:border-white/12"
      )}
    >
      <button className="mt-0.5 shrink-0">
        {milestone.completed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <Circle className="w-5 h-5 text-slate-600" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <p
            className={clsx(
              "text-sm font-semibold",
              milestone.completed ? "text-slate-400 line-through" : "text-white"
            )}
          >
            {milestone.title}
          </p>
          <Badge variant={PRIORITY_BADGE[milestone.priority]} size="sm">
            {milestone.priority}
          </Badge>
          <div className={clsx("flex items-center gap-1 text-xs", config.color)}>
            <Icon className="w-3 h-3" />
            {config.label}
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{milestone.description}</p>
        {milestone.dueDate && (
          <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
            <Calendar className="w-3 h-3" />
            Due {milestone.dueDate}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReadinessPage() {
  const completed = READINESS_MILESTONES.filter((m) => m.completed).length;
  const total = READINESS_MILESTONES.length;
  const overallPct = Math.round((completed / total) * 100);

  const overallReadiness = Math.round(
    READINESS_DOMAINS.reduce((s, d) => s + d.score, 0) / READINESS_DOMAINS.length
  );

  const pending = READINESS_MILESTONES.filter((m) => !m.completed);
  const done = READINESS_MILESTONES.filter((m) => m.completed);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Readiness ring */}
        <Card className="flex items-center gap-5">
          <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="#6366f1"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - overallReadiness / 100)}`}
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-xl font-black text-white">{overallReadiness}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Overall Readiness</p>
            <p className="text-xs text-slate-400 mt-1">
              {overallReadiness >= 80
                ? "Ready to interview!"
                : overallReadiness >= 60
                ? "Strong progress"
                : "Keep building"}
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              +4% this week
            </div>
          </div>
        </Card>

        {/* Milestones */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-semibold text-white">Milestones</p>
          </div>
          <div className="flex items-end gap-1 mb-2">
            <span className="text-3xl font-bold text-white">{completed}</span>
            <span className="text-sm text-slate-400 mb-1">/ {total} done</span>
          </div>
          <ProgressBar value={overallPct} color="amber" size="lg" className="mb-2" />
          <p className="text-xs text-slate-400">{total - completed} remaining</p>
        </Card>

        {/* Streak */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-rose-400" />
            <p className="text-sm font-semibold text-white">Activity Streak</p>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            7 <span className="text-base font-normal text-slate-400">days</span>
          </p>
          <p className="text-xs text-slate-400 mb-3">Longest: 14 days</p>
          <div className="flex gap-1">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className={clsx(
                  "flex-1 h-2 rounded-full",
                  i >= 7 ? "bg-white/8" : "bg-rose-500/60"
                )}
              />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Domain breakdown */}
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Domain Breakdown</h3>
            <div className="space-y-4">
              {READINESS_DOMAINS.map((domain) => {
                const config = CATEGORY_CONFIG[domain.label.toLowerCase()];
                const Icon = config?.icon ?? Target;
                return (
                  <div key={domain.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" style={{ color: domain.color }} />
                        <span className="text-xs font-medium text-slate-300">{domain.label}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-300">{domain.score}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/6">
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{ width: `${domain.score}%`, backgroundColor: domain.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recommended focus */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-3">Focus This Week</h3>
            <div className="space-y-2">
              {[
                { text: "Complete 3 LeetCode mediums", icon: Code2, color: "text-violet-400" },
                { text: "2 mock behavioral interviews", icon: MessageSquare, color: "text-emerald-400" },
                { text: "Reach out to 2 LinkedIn contacts", icon: Users, color: "text-amber-400" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/3 transition-colors"
                  >
                    <Icon className={clsx("w-4 h-4 shrink-0", item.color)} />
                    <span className="text-xs text-slate-300">{item.text}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Milestones list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Pending Milestones</h3>
            <Button variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
              Add Goal
            </Button>
          </div>

          <div className="space-y-2">
            {pending.map((m) => (
              <MilestoneRow key={m.id} milestone={m} />
            ))}
          </div>

          {done.length > 0 && (
            <>
              <div className="flex items-center gap-3 mt-6">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Completed ({done.length})
                </span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="space-y-2 opacity-70">
                {done.map((m) => (
                  <MilestoneRow key={m.id} milestone={m} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
