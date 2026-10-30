"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import {
  getReadinessMilestones,
  getReadinessDomains,
  toggleMilestone as toggleMilestoneService,
  addReadinessMilestone,
  deleteReadinessMilestone,
} from "@/lib/services/readiness.service";
import type { ReadinessMilestone, ReadinessDomain } from "@/types";
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
  Loader2,
  Trash2,
  Sparkles,
  X,
} from "lucide-react";
import { clsx } from "clsx";

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  FileText,
  Code2,
  Users,
  MessageSquare,
  Send,
  Target,
};

const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  resume: { icon: FileText, label: "Resume", color: "text-indigo-400" },
  skills: { icon: Code2, label: "Skills", color: "text-violet-400" },
  network: { icon: Users, label: "Networking", color: "text-amber-400" },
  networking: { icon: Users, label: "Networking", color: "text-amber-400" },
  interview: { icon: MessageSquare, label: "Interviews", color: "text-emerald-400" },
  interviews: { icon: MessageSquare, label: "Interviews", color: "text-emerald-400" },
  applications: { icon: Send, label: "Applications", color: "text-rose-400" },
};

const PRIORITY_BADGE: Record<string, "rose" | "amber" | "slate"> = {
  high: "rose",
  medium: "amber",
  low: "slate",
};

function MilestoneRow({
  milestone,
  onToggle,
  onDelete,
}: {
  milestone: ReadinessMilestone;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const config = CATEGORY_CONFIG[milestone.category] ?? CATEGORY_CONFIG.resume;
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        "flex items-start gap-4 p-4 rounded-xl border transition-all group",
        milestone.completed
          ? "bg-emerald-500/5 border-emerald-500/15"
          : "bg-[#111827] border-white/6 hover:border-white/12"
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(milestone.id)}
        aria-label={milestone.completed ? "Mark milestone incomplete" : "Mark milestone completed"}
        className="mt-0.5 shrink-0 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded"
      >
        {milestone.completed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <Circle className="w-5 h-5 text-slate-600 hover:text-slate-400" />
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
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(milestone.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-white/5"
          title="Delete Milestone"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function ReadinessPage() {
  const [milestones, setMilestones] = useState<ReadinessMilestone[]>([]);
  const [domains, setDomains] = useState<ReadinessDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterTab, setFilterTab] = useState<"all" | "pending" | "completed">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<"resume" | "skills" | "network" | "interview" | "applications">("skills");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium");

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([getReadinessMilestones(), getReadinessDomains()])
      .then(([mList, dList]) => {
        setMilestones(mList);
        setDomains(dList);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load readiness data.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      Promise.all([getReadinessMilestones(), getReadinessDomains()]).then(([mList, dList]) => {
        setMilestones(mList);
        setDomains(dList);
      });
    };
    window.addEventListener("copilot-data-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("copilot-data-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const toggleMilestone = async (id: string) => {
    const target = milestones.find((m) => m.id === id);
    if (!target) return;
    const newCompleted = !target.completed;

    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, completed: newCompleted } : m))
    );

    try {
      await toggleMilestoneService(id, newCompleted);
      const updatedDomains = await getReadinessDomains();
      setDomains(updatedDomains);
    } catch (err: unknown) {
      setMilestones((prev) =>
        prev.map((m) => (m.id === id ? { ...m, completed: !newCompleted } : m))
      );
      setError(err instanceof Error ? err.message : "Failed to update milestone.");
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const added = await addReadinessMilestone({
        title: newTitle.trim(),
        category: newCategory,
        priority: newPriority,
        completed: false,
        description: "Custom goal added to placement readiness roadmap.",
        dueDate: "In 7 days",
      });
      setMilestones((prev) => [added, ...prev]);
      setNewTitle("");
      setShowAddForm(false);
      const updatedDomains = await getReadinessDomains();
      setDomains(updatedDomains);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add milestone.");
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    try {
      await deleteReadinessMilestone(id);
      setMilestones((prev) => prev.filter((m) => m.id !== id));
      const updatedDomains = await getReadinessDomains();
      setDomains(updatedDomains);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete milestone.");
    }
  };

  const completed = milestones.filter((m) => m.completed).length;
  const total = milestones.length;
  const overallPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const overallReadiness = domains.length
    ? Math.round(domains.reduce((s, d) => s + d.score, 0) / domains.length)
    : 0;

  const pending = milestones.filter((m) => !m.completed);
  const done = milestones.filter((m) => m.completed);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Error Banner */}
      {error && (
        <ErrorBanner
          title="Readiness Plan Sync Error"
          message={error}
          onRetry={loadData}
        />
      )}

      {loading && milestones.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-sm">Loading readiness telemetry...</span>
        </div>
      ) : (
        <>
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
                  {domains.map((domain) => {
                    const Icon = DOMAIN_ICONS[domain.icon] ?? CATEGORY_CONFIG[domain.label.toLowerCase()]?.icon ?? Target;
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/4 border border-white/8 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterTab("all")}
                    className={clsx(
                      "px-3 py-1 rounded-lg font-medium transition-all",
                      filterTab === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    )}
                  >
                    All ({total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("pending")}
                    className={clsx(
                      "px-3 py-1 rounded-lg font-medium transition-all",
                      filterTab === "pending" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    )}
                  >
                    Pending ({pending.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("completed")}
                    className={clsx(
                      "px-3 py-1 rounded-lg font-medium transition-all",
                      filterTab === "completed" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    )}
                  >
                    Completed ({done.length})
                  </button>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  icon={showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  {showAddForm ? "Cancel" : "Add Goal"}
                </Button>
              </div>

              {/* Inline Add Goal Form */}
              {showAddForm && (
                <form
                  onSubmit={handleAddMilestone}
                  className="p-4 rounded-xl bg-[#0B1120] border border-indigo-500/30 space-y-3 shadow-xl animate-fadeIn"
                >
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    New Preparation Milestone
                  </h4>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Master React Server Components & Streaming SSR"
                    className="w-full bg-[#050811] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as any)}
                        className="bg-[#050811] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="skills">Skills &amp; Tech</option>
                        <option value="resume">Resume Polish</option>
                        <option value="interview">Mock Interview</option>
                        <option value="network">Networking</option>
                        <option value="applications">Applications</option>
                      </select>

                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as any)}
                        className="bg-[#050811] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="high">High Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="low">Low Priority</option>
                      </select>
                    </div>

                    <Button type="submit" size="sm" disabled={!newTitle.trim()}>
                      Save Milestone
                    </Button>
                  </div>
                </form>
              )}

              {/* Milestones list */}
              <div className="space-y-2">
                {milestones
                  .filter((m) => {
                    if (filterTab === "pending") return !m.completed;
                    if (filterTab === "completed") return m.completed;
                    return true;
                  })
                  .map((m) => (
                    <MilestoneRow
                      key={m.id}
                      milestone={m}
                      onToggle={toggleMilestone}
                      onDelete={handleDeleteMilestone}
                    />
                  ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
