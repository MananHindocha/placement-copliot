"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { useAgent } from "@/context/AgentProvider";
import {
  getReadinessMilestones,
  getReadinessDomains,
  toggleMilestone as toggleMilestoneService,
  addReadinessMilestone,
  deleteReadinessMilestone,
  fetchAiGoalRecommendations,
} from "@/lib/services/readiness.service";
import type { ReadinessMilestone, ReadinessDomain, AiGoalRecommendation } from "@/types";
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
  RotateCcw,
  Upload,
  ArrowRight,
  AlertCircle,
  Check,
  Briefcase,
  HelpCircle,
  Bot,
} from "lucide-react";
import { clsx } from "clsx";
import DigitalTwinMatrix from "@/components/agent/DigitalTwinMatrix";
import MultiCompanyOverlapCard from "@/components/agent/MultiCompanyOverlapCard";

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
  { icon: React.ElementType; label: string; color: string; badgeVariant: "indigo" | "violet" | "amber" | "emerald" | "rose" }
> = {
  resume: { icon: FileText, label: "Resume Polish", color: "text-indigo-400", badgeVariant: "indigo" },
  skills: { icon: Code2, label: "Skills & Tech", color: "text-violet-400", badgeVariant: "violet" },
  network: { icon: Users, label: "Networking", color: "text-amber-400", badgeVariant: "amber" },
  networking: { icon: Users, label: "Networking", color: "text-amber-400", badgeVariant: "amber" },
  interview: { icon: MessageSquare, label: "Mock Interview", color: "text-emerald-400", badgeVariant: "emerald" },
  interviews: { icon: MessageSquare, label: "Mock Interview", color: "text-emerald-400", badgeVariant: "emerald" },
  applications: { icon: Send, label: "Applications", color: "text-rose-400", badgeVariant: "rose" },
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
  const config = CATEGORY_CONFIG[milestone.category] ?? CATEGORY_CONFIG.skills;
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        "flex items-start gap-4 p-4 rounded-xl border transition-all group",
        milestone.completed
          ? "bg-emerald-500/5 border-emerald-500/15"
          : "bg-[#0B0D18] border-[rgba(100,110,255,0.12)] hover:border-[rgba(100,110,255,0.28)] hover:bg-[#151A35]/50"
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
          {(milestone.title.includes("[Agent Sprint") ||
            (milestone.category as string) === "Sprint" ||
            milestone.description?.toLowerCase().includes("agent")) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 shadow-sm animate-fadeIn">
              <Bot className="w-3 h-3 text-cyan-400" />
              <span>🤖 Agent Injected</span>
            </span>
          )}
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
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-white/5 cursor-pointer"
          title="Delete Milestone"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function ReadinessPage() {
  const { digitalTwin, bluffRiskCount, runAutonomousBootstrap } = useAgent();
  const [milestones, setMilestones] = useState<ReadinessMilestone[]>([]);
  const [domains, setDomains] = useState<ReadinessDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<AiGoalRecommendation[]>([]);
  const [recStatus, setRecStatus] = useState<"loading" | "ready" | "no_resume" | "needs_analysis" | "no_gaps" | "error">("loading");
  const [recTargetRole, setRecTargetRole] = useState<string>("Software Engineer");
  const [recRefreshing, setRecRefreshing] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [addingRecId, setAddingRecId] = useState<string | null>(null);

  // Manual Goal Creation State
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "completed">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newCategory, setNewCategory] = useState<ReadinessMilestone["category"]>("skills");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = useCallback(() => {
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
  }, []);

  const loadRecommendations = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRecRefreshing(true);
    else setRecStatus("loading");
    setRecError(null);

    try {
      const res = await fetchAiGoalRecommendations(forceRefresh);
      setRecommendations(res.recommendations);
      setRecStatus(res.status);
      if (res.targetRole) setRecTargetRole(res.targetRole);
      if (res.error) setRecError(res.error);
    } catch (err: unknown) {
      setRecStatus("error");
      setRecError(err instanceof Error ? err.message : "Failed to generate recommendations.");
    } finally {
      setRecRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadRecommendations();

    const handleUpdate = (e?: Event) => {
      Promise.all([getReadinessMilestones(), getReadinessDomains()]).then(([mList, dList]) => {
        setMilestones(mList);
        setDomains(dList);
      });
      // If resume updated, refresh recommendations
      const detail = (e as CustomEvent)?.detail;
      if (detail?.source === "resume") {
        loadRecommendations(true);
      }
    };

    window.addEventListener("copilot-data-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("agent-state-mutated", handleUpdate);
    return () => {
      window.removeEventListener("copilot-data-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("agent-state-mutated", handleUpdate);
    };
  }, [loadData, loadRecommendations]);

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
      showToast(`${newCompleted ? "Completed" : "Reopened"}: "${target.title}"`);
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
        description: newDescription.trim() || "Custom goal added to placement readiness roadmap.",
        dueDate: newDueDate.trim() || undefined,
      });

      setMilestones((prev) => [added, ...prev]);
      setNewTitle("");
      setNewDescription("");
      setNewDueDate("");
      setShowAddForm(false);
      const updatedDomains = await getReadinessDomains();
      setDomains(updatedDomains);
      showToast(`Added goal: "${added.title}"`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add milestone.");
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    const target = milestones.find((m) => m.id === id);
    try {
      await deleteReadinessMilestone(id);
      setMilestones((prev) => prev.filter((m) => m.id !== id));
      const updatedDomains = await getReadinessDomains();
      setDomains(updatedDomains);
      showToast(`Removed "${target?.title || "milestone"}"`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete milestone.");
    }
  };

  // Convert AI Recommendation to Milestone
  const handleAddRecommendationToPlan = async (rec: AiGoalRecommendation) => {
    if (isRecommendationAdded(rec) || addingRecId === rec.id) return;
    setAddingRecId(rec.id);

    try {
      const newMilestone = await addReadinessMilestone({
        title: rec.title,
        category: rec.category,
        priority: rec.priority,
        completed: false,
        description: rec.suggestedAction || rec.reason,
        dueDate: "In 7 days",
      });

      setMilestones((prev) => [newMilestone, ...prev.filter((m) => m.id !== newMilestone.id)]);
      const updatedDomains = await getReadinessDomains();
      setDomains(updatedDomains);
      showToast(`Added "${rec.title}" to preparation roadmap!`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add recommendation to plan.");
    } finally {
      setAddingRecId(null);
    }
  };

  const isRecommendationAdded = (rec: AiGoalRecommendation): boolean => {
    return milestones.some(
      (m) => m.title.trim().toLowerCase() === rec.title.trim().toLowerCase()
    );
  };

  const completed = milestones.filter((m) => m.completed).length;
  const total = milestones.length;
  const overallPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // ─── FEATURE 3: LIVE READINESS SCORE FORMULA TIED TO DIGITAL TWIN & MILESTONES ───
  // Map each skill in digitalTwin.skills to numerical confidence ratio:
  // HIGH = 1.0, MEDIUM = 0.7, UNVERIFIED = 0.4, LOW (or bluff_risk) = 0.2
  const skills = digitalTwin?.skills || [];
  const digitalTwinConfidenceRatio = useMemo(() => {
    if (!skills || skills.length === 0) return 0;
    const RATIO_MAP: Record<string, number> = {
      HIGH: 1.0,
      MEDIUM: 0.7,
      UNVERIFIED: 0.4,
      LOW: 0.2,
    };
    const totalRatio = skills.reduce((sum, s) => {
      if (s.bluff_risk) return sum + 0.2;
      return sum + (RATIO_MAP[s.verified_confidence] ?? 0.4);
    }, 0);
    return Math.round((totalRatio / skills.length) * 100);
  }, [skills]);

  const completedMilestonesRatio = total > 0 ? (completed / total) * 100 : 0;
  const overallReadiness = (skills.length > 0 || total > 0)
    ? Math.min(100, Math.round(0.6 * digitalTwinConfidenceRatio + 0.4 * completedMilestonesRatio))
    : 0;

  const pending = milestones.filter((m) => !m.completed);
  const done = milestones.filter((m) => m.completed);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="rounded-2xl border border-indigo-500/40 bg-indigo-950/80 p-3.5 flex items-center gap-2 text-xs text-indigo-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          {toastMessage}
        </div>
      )}

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
          {/* Top Page Header with 1-Click Autonomous Bootstrap */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/8">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5 flex-wrap">
                <span>Placement Readiness Plan</span>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Live Weighted Formula: 60% Digital Twin + 40% Milestones
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Calibrated readiness trajectory computed from empirical interview telemetry, verified skills, and roadmap completions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => runAutonomousBootstrap()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>🤖 Run Full-App Autonomous Bootstrap</span>
            </button>
          </div>

          {/* Top Telemetry & Streak Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Readiness Ring Gauge */}
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
                <p className="text-xs text-indigo-300 mt-1 font-medium">
                  Synced with Digital Twin • {bluffRiskCount} Bluff Risk{bluffRiskCount !== 1 ? "s" : ""} Active
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400">
                  <TrendingUp className="w-3 h-3" />
                  <span>{completed} of {total} milestones done ({overallPct}%)</span>
                </div>
              </div>
            </Card>

            {/* Milestones Counter */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-amber-400" />
                <p className="text-sm font-semibold text-white">Roadmap Milestones</p>
              </div>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-3xl font-bold text-white">{completed}</span>
                <span className="text-sm text-slate-400 mb-1">/ {total} done</span>
              </div>
              <ProgressBar value={overallPct} color="amber" size="lg" className="mb-2" />
              <p className="text-xs text-slate-400">
                {total === 0 ? "No milestones added yet" : `${total - completed} pending action`}
              </p>
            </Card>

            {/* Activity Streak */}
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

          {/* Autonomous Agent Intelligence Layer */}
          <div className="space-y-6">
            <MultiCompanyOverlapCard />
            <DigitalTwinMatrix />
          </div>

          {/* Main Grid: Domain Breakdown + Milestones Roadmap */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Domain Breakdown & Focus This Week */}
            <div className="space-y-4">
              {/* Domain Breakdown */}
              <Card>
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center justify-between">
                  <span>Domain Breakdown</span>
                  <span className="text-[10px] text-slate-500 font-normal">5 Weighted Pillars</span>
                </h3>
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
                        <div className="h-2 rounded-full bg-white/6 overflow-hidden">
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

              {/* Dynamic Focus This Week (Driven by real pending milestones) */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Focus This Week</h3>
                  <span className="text-[10px] text-indigo-400 font-medium">From Roadmap</span>
                </div>
                {pending.length === 0 ? (
                  <div className="py-6 text-center space-y-2">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      No active pending tasks.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Add custom goals or review the AI-recommended milestones below.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pending.slice(0, 3).map((item) => {
                      const config = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.skills;
                      const Icon = config.icon;
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                        >
                          <Icon className={clsx("w-4 h-4 mt-0.5 shrink-0", config.color)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-200 line-clamp-1">
                              {item.title}
                            </p>
                            <span className="text-[10px] text-slate-500 capitalize">
                              {item.priority} priority • {config.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Right Column: Milestones Roadmap Checklist */}
            <div className="lg:col-span-2 space-y-4">
              {/* Interactive Checklist Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl bg-[#0B0F20] border border-indigo-500/25">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Agent Roadmap Milestones Checklist
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Check/uncheck tasks to watch the live Readiness Score gauge recalculate in real time.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                    {completed} / {total} done ({overallPct}%)
                  </span>
                </div>
              </div>

              {/* Filter Tabs & Add Goal Action */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/4 border border-[rgba(100,110,255,0.12)] text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterTab("all")}
                    className={clsx(
                      "px-3 py-1 rounded-lg font-medium transition-all",
                      filterTab === "all" ? "bg-[#1B1FB8] text-white shadow-sm" : "text-slate-400 hover:text-white"
                    )}
                  >
                    All ({total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("pending")}
                    className={clsx(
                      "px-3 py-1 rounded-lg font-medium transition-all",
                      filterTab === "pending" ? "bg-[#1B1FB8] text-white shadow-sm" : "text-slate-400 hover:text-white"
                    )}
                  >
                    Pending ({pending.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("completed")}
                    className={clsx(
                      "px-3 py-1 rounded-lg font-medium transition-all",
                      filterTab === "completed" ? "bg-[#1B1FB8] text-white shadow-sm" : "text-slate-400 hover:text-white"
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
                  className="gap-1.5 text-xs shadow-md shadow-indigo-500/10"
                >
                  {showAddForm ? "Cancel" : "+ Add Goal"}
                </Button>
              </div>

              {/* Inline Add Goal Form */}
              {showAddForm && (
                <form
                  onSubmit={handleAddMilestone}
                  className="p-5 rounded-2xl bg-[#0B0D18] border border-indigo-500/30 space-y-3.5 shadow-2xl animate-fadeIn"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/8">
                    <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Create Custom Preparation Goal
                    </h4>
                    <span className="text-[10px] text-slate-500">Manual Entry</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">
                      Goal Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Master System Design Caching & Redis Partitioning"
                      className="w-full bg-[#050505] border border-[rgba(100,110,255,0.16)] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        Category
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as any)}
                        className="w-full bg-[#050505] border border-[rgba(100,110,255,0.16)] rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="skills">Skills &amp; Tech</option>
                        <option value="resume">Resume Polish</option>
                        <option value="interview">Mock Interview</option>
                        <option value="network">Networking</option>
                        <option value="applications">Applications</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        Priority
                      </label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as any)}
                        className="w-full bg-[#050505] border border-[rgba(100,110,255,0.16)] rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="high">High Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="low">Low Priority</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        Target Due Date
                      </label>
                      <input
                        type="text"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        placeholder="e.g. In 7 days, Nov 15"
                        className="w-full bg-[#050505] border border-[rgba(100,110,255,0.16)] rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">
                      Action Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Add specific target tasks, problem links, or milestones..."
                      className="w-full bg-[#050505] border border-[rgba(100,110,255,0.16)] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/8">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={!newTitle.trim()}>
                      Save Goal
                    </Button>
                  </div>
                </form>
              )}

              {/* Milestones Checklist List */}
              <div className="space-y-2.5">
                {milestones.length === 0 ? (
                  <div className="p-12 rounded-2xl border border-[rgba(100,110,255,0.12)] bg-[#0B0D18] text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                      <Target className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white">
                        No milestones in your preparation roadmap yet
                      </h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                        Start building your personalized roadmap by creating custom goals above or adopting AI recommendations below.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowAddForm(true)}
                      className="gap-1.5 text-xs mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Create Your First Goal</span>
                    </Button>
                  </div>
                ) : (
                  milestones
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
                    ))
                )}
              </div>
            </div>
          </div>

          {/* ─── DEDICATED SECTION: AI-RECOMMENDED GOALS ───────────────────────── */}
          <div className="pt-6 border-t border-white/8 space-y-4">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    AI-Recommended Goals
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Target: {recTargetRole}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Personalized preparation tasks based on your resume gaps and placement readiness.
                </p>
              </div>

              {/* Refresh Action */}
              <button
                type="button"
                onClick={() => loadRecommendations(true)}
                disabled={recRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-[rgba(100,110,255,0.12)] text-xs font-medium transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                title="Refresh recommendations based on latest resume"
              >
                <RotateCcw className={clsx("w-3.5 h-3.5", recRefreshing && "animate-spin text-indigo-400")} />
                <span>{recRefreshing ? "Analyzing..." : "Refresh Recommendations"}</span>
              </button>
            </div>

            {/* Error in recommendations */}
            {recError && (
              <ErrorBanner
                title="AI Recommendation Alert"
                message={recError}
                onRetry={() => loadRecommendations(true)}
              />
            )}

            {/* Recommendations Content State */}
            {recStatus === "loading" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-[#0B0D18] border border-[rgba(100,110,255,0.12)] animate-pulse space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-20 h-4 bg-white/8 rounded" />
                      <div className="w-14 h-4 bg-white/8 rounded" />
                    </div>
                    <div className="w-3/4 h-4 bg-white/10 rounded" />
                    <div className="w-full h-8 bg-white/5 rounded" />
                    <div className="w-24 h-7 bg-white/8 rounded mt-2" />
                  </div>
                ))}
              </div>
            ) : recStatus === "no_resume" ? (
              /* Case A: No Resume Uploaded */
              <div className="p-8 rounded-2xl border border-[rgba(100,110,255,0.12)] bg-[#0B0D18] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    Unlock Personalized Recommendations
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Upload your resume to identify skill gaps, improve your profile, and receive personalized preparation goals tailored to your target role.
                  </p>
                </div>
                <Link
                  href="/resume"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1B1FB8] hover:bg-[#292EDB] text-white font-medium text-xs shadow-md shadow-indigo-500/20 transition-all mt-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Resume in Resume Screener</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : recStatus === "needs_analysis" ? (
              /* Case B: Resume Uploaded but Not Analyzed */
              <div className="p-8 rounded-2xl border border-[rgba(100,110,255,0.12)] bg-[#0B0D18] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    Resume Analysis Required
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Your resume is available, but it needs to be analyzed first to extract verified skill gaps and personalized roadmap goals.
                  </p>
                </div>
                <Link
                  href="/resume"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1B1FB8] hover:bg-[#292EDB] text-white font-medium text-xs shadow-md shadow-indigo-500/20 transition-all mt-1"
                >
                  <span>Analyze in Resume Screener</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : recStatus === "no_gaps" || recommendations.length === 0 ? (
              /* Case C: Resume Analyzed but No Significant Gaps Found */
              <div className="p-8 rounded-2xl border border-[rgba(100,110,255,0.12)] bg-[#0B0D18] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    No Major Resume Gaps Identified
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Your current resume strongly demonstrates the foundational competencies for <span className="text-white font-medium">{recTargetRole}</span>. You can create custom challenges or add mock interview goals above.
                  </p>
                </div>
              </div>
            ) : (
              /* Active Recommendations Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((rec) => {
                  const isAdded = isRecommendationAdded(rec);
                  const config = CATEGORY_CONFIG[rec.category] ?? CATEGORY_CONFIG.skills;
                  const Icon = config.icon;
                  const isProcessing = addingRecId === rec.id;

                  return (
                    <div
                      key={rec.id}
                      className={clsx(
                        "p-5 rounded-2xl border flex flex-col justify-between transition-all space-y-4",
                        isAdded
                          ? "bg-emerald-500/[0.03] border-emerald-500/25"
                          : "bg-[#0B0D18] border-white/8 hover:border-indigo-500/40 hover:bg-[#151A35]/50"
                      )}
                    >
                      <div className="space-y-3">
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={clsx(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1",
                              config.color,
                              "bg-white/5 border-white/10"
                            )}
                          >
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </span>

                          <span
                            className={clsx(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize",
                              PRIORITY_BADGE[rec.priority] === "rose"
                                ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                                : PRIORITY_BADGE[rec.priority] === "amber"
                                ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                                : "text-slate-400 bg-slate-500/10 border-slate-500/20"
                            )}
                          >
                            {rec.priority} Priority
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                          {rec.title}
                        </h4>

                        {/* Reason / Why Recommended */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Why Recommended:
                          </span>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {rec.reason}
                          </p>
                        </div>

                        {/* Action / Suggested Steps */}
                        {rec.suggestedAction && (
                          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-[rgba(100,110,255,0.12)] space-y-1">
                            <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider block">
                              Suggested Action:
                            </span>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {rec.suggestedAction}
                            </p>
                          </div>
                        )}

                        {/* Related Finding Tag */}
                        {rec.finding && (
                          <p className="text-[10px] text-slate-500 italic">
                            Evidence: {rec.finding}
                          </p>
                        )}
                      </div>

                      {/* Add Button */}
                      <div className="pt-2 border-t border-white/6">
                        {isAdded ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Added to Plan ✓</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddRecommendationToPlan(rec)}
                            disabled={isProcessing}
                            className="w-full py-2 px-3 rounded-xl bg-[#1B1FB8] hover:bg-[#292EDB] active:scale-95 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            <span>+ Add to Plan</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
