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
  updateReadinessMilestoneDueDate,
  calculatePreparationProgress,
  parseFlexibleDueDate,
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
  Pencil,
} from "lucide-react";
import { clsx } from "clsx";
import DigitalTwinMatrix from "@/components/agent/DigitalTwinMatrix";
import MultiCompanyOverlapCard from "@/components/agent/MultiCompanyOverlapCard";

function toSkillLabel(item: any): string {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item.name === "string") return item.name;
  if (typeof item.skill_name === "string") return item.skill_name;
  if (typeof item.skill === "string") return item.skill;
  return JSON.stringify(item);
}

function toSkillLevel(item: any): string {
  if (!item || typeof item === "string") return "";
  return item.claimedLevel || item.verified_confidence || item.strength || item.level || "";
}

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
  resume: { icon: FileText, label: "Resume Polish", color: "text-[#A1A1AA]", badgeVariant: "indigo" },
  skills: { icon: Code2, label: "Skills & Tech", color: "text-[#A1A1AA]", badgeVariant: "violet" },
  network: { icon: Users, label: "Networking", color: "text-amber-400", badgeVariant: "amber" },
  networking: { icon: Users, label: "Networking", color: "text-amber-400", badgeVariant: "amber" },
  interview: { icon: MessageSquare, label: "Practice Interview", color: "text-emerald-400", badgeVariant: "emerald" },
  interviews: { icon: MessageSquare, label: "Practice Interview", color: "text-emerald-400", badgeVariant: "emerald" },
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
  onUpdateDueDate,
}: {
  milestone: ReadinessMilestone;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdateDueDate?: (id: string, newDueDate: string) => Promise<void>;
}) {
  const config = CATEGORY_CONFIG[milestone.category] ?? CATEGORY_CONFIG.skills;
  const Icon = config.icon;
  const [editingDate, setEditingDate] = useState(false);
  const [draftDate, setDraftDate] = useState(
    () => parseFlexibleDueDate(milestone.dueDate) || ""
  );
  const [savingDate, setSavingDate] = useState(false);

  const handleSaveDate = async () => {
    if (!onUpdateDueDate) return;
    setSavingDate(true);
    try {
      await onUpdateDueDate(milestone.id, draftDate);
      setEditingDate(false);
    } finally {
      setSavingDate(false);
    }
  };

  return (
    <div
      className={clsx(
        "flex items-start gap-4 p-4 rounded-xl border transition-colors group",
        milestone.completed
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-[#0D0D0D] border-[#1D1D1D] hover:border-[#292929] hover:bg-[#121212]"
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(milestone.id)}
        aria-label={milestone.completed ? "Mark milestone incomplete" : "Mark milestone completed"}
        className="mt-0.5 shrink-0 text-[#71717A] hover:text-[#F5F5F5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#F5F5F5]/20 rounded cursor-pointer"
      >
        {milestone.completed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <Circle className="w-5 h-5 text-[#3F3F46] hover:text-[#A1A1AA]" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <p
            className={clsx(
              "text-sm font-semibold",
              milestone.completed ? "text-[#71717A] line-through" : "text-[#F5F5F5]"
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
        {milestone.description && (
          <p className="text-xs text-[#A1A1AA] leading-relaxed">{milestone.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {!editingDate ? (
            <>
              {milestone.dueDate ? (
                <div className="flex items-center gap-1 text-xs text-[#71717A]">
                  <Calendar className="w-3 h-3" />
                  <span>Due {milestone.dueDate}</span>
                </div>
              ) : (
                <span className="text-xs text-[#52525B]">No deadline set</span>
              )}
              {onUpdateDueDate && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftDate(parseFlexibleDueDate(milestone.dueDate) || "");
                    setEditingDate(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-[#A1A1AA] hover:text-[#F5F5F5] opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Edit milestone deadline"
                >
                  <Pencil className="w-3 h-3" />
                  <span>{milestone.dueDate ? "Change deadline" : "Set deadline"}</span>
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                aria-label="Milestone due date"
                className="bg-[#080808] border border-[#1D1D1D] rounded-md px-2 py-1 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#292929]"
              />
              <button
                type="button"
                disabled={savingDate}
                onClick={handleSaveDate}
                className="px-2 py-1 rounded-md bg-[#F5F5F5] hover:bg-[#E4E4E7] text-[#000000] text-[11px] font-semibold cursor-pointer disabled:opacity-50"
              >
                {savingDate ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditingDate(false)}
                className="px-2 py-1 rounded-md bg-[#121212] border border-[#292929] text-[#A1A1AA] hover:text-[#F5F5F5] text-[11px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(milestone.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-[#71717A] hover:text-rose-400 rounded-lg hover:bg-[#121212] cursor-pointer"
          title="Delete Goal"
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

  const handleUpdateDueDate = async (id: string, newDate: string) => {
    try {
      const updatedDisplay = await updateReadinessMilestoneDueDate(id, newDate || null);
      setMilestones((prev) =>
        prev.map((m) => (m.id === id ? { ...m, dueDate: updatedDisplay } : m))
      );
      showToast(
        updatedDisplay ? `Updated deadline to ${updatedDisplay}` : "Cleared milestone deadline"
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update milestone deadline.");
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

  const progressSummary = useMemo(
    () => calculatePreparationProgress(milestones, digitalTwin?.skills),
    [milestones, digitalTwin?.skills]
  );

  const completed = progressSummary.completedTasks;
  const total = progressSummary.totalTasks;
  const overallPct = progressSummary.overallTaskPercentage;
  const overallReadiness = progressSummary.overallReadinessPercentage;

  const pending = milestones.filter((m) => !m.completed);
  const done = milestones.filter((m) => m.completed);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <title>Study Plan</title>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="rounded-xl border border-[#292929] bg-[#0D0D0D] p-3.5 flex items-center gap-2 text-xs text-[#F5F5F5]">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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
        <div className="flex items-center justify-center py-24 text-[#A1A1AA] gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#F5F5F5]" />
          <span className="text-sm">Loading readiness telemetry...</span>
        </div>
      ) : (
        <>
          {/* Top Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#1D1D1D]">
            <div>
              <h1 className="text-xl font-bold text-[#F5F5F5] tracking-tight">
                Study Plan
              </h1>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Your preparation roadmap and daily goals to get interview-ready.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                runAutonomousBootstrap();
                loadRecommendations(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#121212] hover:bg-[#1A1A1A] border border-[#292929] text-[#F5F5F5] font-semibold text-xs transition-colors cursor-pointer shrink-0"
            >
              <span>✨ Refresh My Plan</span>
            </button>
          </div>

          {/* ─── SECTION 1: SCORE RING & SECTION 2: WHAT THIS SCORE MEANS ─── */}
          <div className="flex flex-col items-center justify-center p-6 bg-[#0D0D0D] rounded-xl border border-[#1D1D1D] text-center space-y-3">
            <div className="relative flex items-center justify-center w-28 h-28 shrink-0">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#1D1D1D" strokeWidth="6" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="#F5F5F5"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - overallReadiness / 100)}`}
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-2xl font-black text-[#F5F5F5] tabular-nums">{overallReadiness}%</span>
              </div>
            </div>

            <div>
              <h2 className="text-base font-bold text-[#F5F5F5]">Interview Readiness</h2>
              <p style={{ textAlign: "center", fontSize: "13px", color: "#A1A1AA", marginTop: "4px" }}>
                Complete milestones below to improve your score. Each completed task adds to your readiness.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#A1A1AA] font-medium pt-1 flex-wrap justify-center tabular-nums">
              <span className="text-[#F5F5F5] font-semibold">{completed} of {total} completed ({overallPct}%)</span>
              <span className="text-[#3F3F46]">•</span>
              <span>7-day streak 🔥</span>
            </div>
          </div>

          {/* ─── SECTION 3: MILESTONE CHECKLIST & SECTION 4: ADD YOUR OWN GOAL ─── */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#F5F5F5] tracking-tight">
                  Milestones Checklist
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  Track and complete your study goals. Check tasks as you finish them.
                </p>
              </div>

              {/* Filter Tabs & Add Goal Action */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[#050505] border border-[#1D1D1D] text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterTab("all")}
                    className={clsx(
                      "px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer tabular-nums",
                      filterTab === "all" ? "bg-[#121212] text-[#F5F5F5] border border-[#292929]" : "text-[#71717A] hover:text-[#F5F5F5]"
                    )}
                  >
                    All ({total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("pending")}
                    className={clsx(
                      "px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer tabular-nums",
                      filterTab === "pending" ? "bg-[#121212] text-[#F5F5F5] border border-[#292929]" : "text-[#71717A] hover:text-[#F5F5F5]"
                    )}
                  >
                    Pending ({pending.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("completed")}
                    className={clsx(
                      "px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer tabular-nums",
                      filterTab === "completed" ? "bg-[#121212] text-[#F5F5F5] border border-[#292929]" : "text-[#71717A] hover:text-[#F5F5F5]"
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
                  className="gap-1.5 text-xs cursor-pointer"
                >
                  {showAddForm ? "Cancel" : "+ Create Custom Goal"}
                </Button>
              </div>
            </div>

            {/* Inline Add Goal Form (Section 4) */}
            {showAddForm && (
              <form
                onSubmit={handleAddMilestone}
                className="p-5 rounded-xl bg-[#0D0D0D] border border-[#292929] space-y-3.5 animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#1D1D1D]">
                  <h4 className="text-xs font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
                    Create Custom Preparation Goal
                  </h4>
                  <span className="text-[10px] text-[#71717A]">Manual Entry</span>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#F5F5F5] block mb-1">
                    Goal Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Master System Design Caching & Redis Partitioning"
                    className="w-full bg-[#080808] border border-[#1D1D1D] rounded-lg px-3 py-2 text-xs text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#292929] transition-colors"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-[#F5F5F5] block mb-1">
                      Category
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full bg-[#080808] border border-[#1D1D1D] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#292929]"
                    >
                      <option value="skills">Skills &amp; Tech</option>
                      <option value="resume">Resume Polish</option>
                      <option value="interview">Practice Interview</option>
                      <option value="network">Networking</option>
                      <option value="applications">Applications</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-[#F5F5F5] block mb-1">
                      Priority
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                      className="w-full bg-[#080808] border border-[#1D1D1D] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#292929]"
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-[#F5F5F5] block mb-1">
                      Target Due Date
                    </label>
                    <input
                      type="text"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      placeholder="e.g. In 7 days, Nov 15"
                      className="w-full bg-[#080808] border border-[#1D1D1D] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#292929] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#F5F5F5] block mb-1">
                    Action Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Add specific target tasks, problem links, or milestones..."
                    className="w-full bg-[#080808] border border-[#1D1D1D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#292929] transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1D1D1D]">
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

            {/* Milestones List */}
            <div className="space-y-2.5">
              {milestones.length === 0 ? (
                <div className="p-10 rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] text-center space-y-2">
                  <p className="text-sm font-medium text-[#F5F5F5]">
                    Upload your resume to get a personalised study plan based on your skill gaps.
                  </p>
                </div>
              ) : pending.length === 0 && filterTab === "pending" ? (
                <div className="p-8 rounded-xl border border-emerald-500/25 bg-[#0D0D0D] text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-emerald-300">
                    You&apos;ve completed everything on your plan!
                  </p>
                  <p className="text-xs text-[#A1A1AA]">
                    Click &ldquo;✨ Refresh My Plan&rdquo; to get new recommendations.
                  </p>
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
                      onUpdateDueDate={handleUpdateDueDate}
                    />
                  ))
              )}
            </div>
          </div>

          {/* ─── SECTION 5: AI SUGGESTIONS (Suggested for You) ─── */}
          <div className="pt-6 border-t border-[#1D1D1D] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="p-1.5 rounded-lg bg-[#121212] text-[#A78BFA] border border-[#292929]">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-[#F5F5F5] tracking-tight">
                    Suggested for You
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#121212] text-[#F5F5F5] border border-[#292929]">
                    Target: {recTargetRole}
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Personalized preparation tasks based on your resume gaps and target role.
                </p>
              </div>
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
                    className="p-4 rounded-xl bg-[#0D0D0D] border border-[#1D1D1D] animate-pulse space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-20 h-4 bg-[#171717] rounded" />
                      <div className="w-14 h-4 bg-[#171717] rounded" />
                    </div>
                    <div className="w-3/4 h-4 bg-[#171717] rounded" />
                    <div className="w-full h-8 bg-[#171717] rounded" />
                    <div className="w-24 h-7 bg-[#171717] rounded mt-2" />
                  </div>
                ))}
              </div>
            ) : recStatus === "no_resume" ? (
              /* Case A: No Resume Uploaded */
              <div className="p-8 rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#121212] border border-[#292929] text-[#A78BFA] flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#F5F5F5]">
                    Unlock Personalized Recommendations
                  </h4>
                  <p className="text-xs text-[#A1A1AA] max-w-md mx-auto leading-relaxed">
                    Upload your resume to identify skill gaps, improve your profile, and receive personalized preparation goals tailored to your target role.
                  </p>
                </div>
                <Link
                  href="/resume"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F5F5F5] hover:bg-[#E4E4E7] text-[#000000] font-semibold text-xs transition-colors mt-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Resume</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : recStatus === "needs_analysis" ? (
              /* Case B: Resume Uploaded but Not Analyzed */
              <div className="p-8 rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#F5F5F5]">
                    Resume Analysis Required
                  </h4>
                  <p className="text-xs text-[#A1A1AA] max-w-md mx-auto leading-relaxed">
                    Your resume is available, but it needs to be analyzed first to extract verified skill gaps and personalized roadmap goals.
                  </p>
                </div>
                <Link
                  href="/resume"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F5F5F5] hover:bg-[#E4E4E7] text-[#000000] font-semibold text-xs transition-colors mt-1"
                >
                  <span>Analyze in My Resume</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : recStatus === "no_gaps" || recommendations.length === 0 ? (
              /* Case C: Resume Analyzed but No Significant Gaps Found */
              <div className="p-8 rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#F5F5F5]">
                    No Major Resume Gaps Identified
                  </h4>
                  <p className="text-xs text-[#A1A1AA] max-w-md mx-auto leading-relaxed">
                    Your current resume strongly demonstrates the foundational competencies for <span className="text-[#F5F5F5] font-medium">{recTargetRole}</span>. You can create custom challenges or add practice interview goals above.
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
                        "p-5 rounded-xl border flex flex-col justify-between transition-colors space-y-4",
                        isAdded
                          ? "bg-emerald-500/5 border-emerald-500/25"
                          : "bg-[#0D0D0D] border-[#1D1D1D] hover:border-[#292929] hover:bg-[#121212]"
                      )}
                    >
                      <div className="space-y-3">
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={clsx(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1",
                              config.color,
                              "bg-[#121212] border-[#292929]"
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
                                : "text-[#A1A1AA] bg-[#121212] border-[#292929]"
                            )}
                          >
                            {rec.priority} Priority
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-bold text-[#F5F5F5] tracking-tight leading-snug">
                          {toSkillLabel(rec.title)}
                        </h4>

                        {/* Reason / Why Recommended */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-[#71717A] uppercase tracking-wider">
                            Why Recommended:
                          </span>
                          <p className="text-xs text-[#A1A1AA] leading-relaxed">
                            {toSkillLabel(rec.reason)}
                          </p>
                        </div>

                        {/* Action / Suggested Steps */}
                        {rec.suggestedAction && (
                          <div className="p-2.5 rounded-lg bg-[#0A0A0A] border border-[#1D1D1D] space-y-1">
                            <span className="text-[10px] font-semibold text-[#A78BFA] uppercase tracking-wider block">
                              Suggested Action:
                            </span>
                            <p className="text-xs text-[#A1A1AA] leading-relaxed">
                              {toSkillLabel(rec.suggestedAction)}
                            </p>
                          </div>
                        )}

                        {/* Related Finding Tag */}
                        {rec.finding && (
                          <p className="text-[10px] text-[#71717A] italic">
                            Finding: {toSkillLabel(rec.finding)}
                          </p>
                        )}
                      </div>

                      {/* Add Button */}
                      <div className="pt-2 border-t border-[#1D1D1D]">
                        {isAdded ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2 px-3 rounded-lg bg-emerald-500/12 text-emerald-300 border border-emerald-500/25 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Added to Plan ✓</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddRecommendationToPlan(rec)}
                            disabled={isProcessing}
                            className="w-full py-2 px-3 rounded-lg bg-[#F5F5F5] hover:bg-[#E4E4E7] text-[#000000] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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

          {/* ─── SECTION 6: DOMAIN BREAKDOWN ─── */}
          <div className="pt-6 border-t border-[#1D1D1D] space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#F5F5F5] tracking-tight">
                Domain Breakdown
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Your preparation distribution across key engineering domains.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {domains.map((domain) => {
                const Icon = DOMAIN_ICONS[domain.icon] ?? CATEGORY_CONFIG[domain.label.toLowerCase()]?.icon ?? Target;
                return (
                  <Card key={domain.label} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-[#A1A1AA]" />
                        <span className="text-xs font-semibold text-[#F5F5F5]">{domain.label}</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-[#F5F5F5] tabular-nums">{domain.score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#171717] border border-[#1D1D1D] overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-700 bg-[#F5F5F5]"
                        style={{ width: `${domain.score}%` }}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* ─── SECTION 7: ADVANCED DETAILS (COLLAPSED BY DEFAULT) ─── */}
          <div className="pt-6 border-t border-[#1D1D1D]">
            <details className="group">
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#71717A",
                  padding: "8px 0",
                  userSelect: "none",
                }}
                className="hover:text-[#F5F5F5] transition-colors"
              >
                Show advanced skill details
              </summary>
              <div style={{ marginTop: "12px" }} className="space-y-6">
                <DigitalTwinMatrix />
                <MultiCompanyOverlapCard />
              </div>
            </details>
          </div>
        </>
      )}
    </div>
  );
}
