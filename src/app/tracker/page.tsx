"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import JobImportModal from "@/components/tracker/JobImportModal";
import {
  getApplications,
  updateApplicationStatus,
  addApplication,
  deleteApplication,
  updateApplication,
} from "@/lib/services/applications.service";
import type { KanbanCard, KanbanStatus, Job } from "@/types";
import {
  Plus,
  Search,
  Filter,
  Loader2,
  Calendar,
  Clock,
  ExternalLink,
  Trash2,
  X,
  Sparkles,
  LayoutGrid,
  List,
  CheckCircle2,
  Building,
  Send,
  Briefcase,
  Award,
} from "lucide-react";
import { clsx } from "clsx";

// ─── Stage Definitions ────────────────────────────────────────────────────────

interface StageConfig {
  id: string;
  label: string;
  statuses: KanbanStatus[];
  defaultStatus: KanbanStatus;
  accentColor: string;
  badgeVariant: "slate" | "indigo" | "amber" | "emerald" | "rose" | "violet";
}

const FOUR_STAGES: StageConfig[] = [
  {
    id: "wishlist",
    label: "Saved / Wishlist",
    statuses: ["Wishlist"],
    defaultStatus: "Wishlist",
    accentColor: "border-slate-500",
    badgeVariant: "slate",
  },
  {
    id: "applied",
    label: "Applied & OA",
    statuses: ["Applied"],
    defaultStatus: "Applied",
    accentColor: "border-blue-500",
    badgeVariant: "indigo",
  },
  {
    id: "interviewing",
    label: "Interviewing",
    statuses: ["Phone Screen", "Interview"],
    defaultStatus: "Interview",
    accentColor: "border-amber-500",
    badgeVariant: "amber",
  },
  {
    id: "decision",
    label: "Decision (Offer / Reject)",
    statuses: ["Offer", "Rejected"],
    defaultStatus: "Offer",
    accentColor: "border-emerald-500",
    badgeVariant: "emerald",
  },
];

const SIX_STAGES: StageConfig[] = [
  {
    id: "Wishlist",
    label: "Wishlist",
    statuses: ["Wishlist"],
    defaultStatus: "Wishlist",
    accentColor: "border-slate-500",
    badgeVariant: "slate",
  },
  {
    id: "Applied",
    label: "Applied",
    statuses: ["Applied"],
    defaultStatus: "Applied",
    accentColor: "border-blue-500",
    badgeVariant: "indigo",
  },
  {
    id: "Phone Screen",
    label: "Phone Screen",
    statuses: ["Phone Screen"],
    defaultStatus: "Phone Screen",
    accentColor: "border-violet-500",
    badgeVariant: "violet",
  },
  {
    id: "Interview",
    label: "Interview",
    statuses: ["Interview"],
    defaultStatus: "Interview",
    accentColor: "border-amber-500",
    badgeVariant: "amber",
  },
  {
    id: "Offer",
    label: "Offer",
    statuses: ["Offer"],
    defaultStatus: "Offer",
    accentColor: "border-emerald-500",
    badgeVariant: "emerald",
  },
  {
    id: "Rejected",
    label: "Rejected",
    statuses: ["Rejected"],
    defaultStatus: "Rejected",
    accentColor: "border-rose-500",
    badgeVariant: "rose",
  },
];

const ALL_STATUSES: KanbanStatus[] = [
  "Wishlist",
  "Applied",
  "Phone Screen",
  "Interview",
  "Offer",
  "Rejected",
];

const STATUS_PILL_COLOR: Record<KanbanStatus, string> = {
  Wishlist: "text-slate-300 bg-slate-500/15 border-slate-500/30",
  Applied: "text-blue-300 bg-blue-500/15 border-blue-500/30",
  "Phone Screen": "text-violet-300 bg-violet-500/15 border-violet-500/30",
  Interview: "text-amber-300 bg-amber-500/15 border-amber-500/30",
  Offer: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  Rejected: "text-rose-300 bg-rose-500/15 border-rose-500/30",
};

const PRIORITY_COLOR: Record<string, string> = {
  high: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  low: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

export default function TrackerPage() {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View Controls
  const [viewDensity, setViewDensity] = useState<"compact" | "detailed">("compact");
  const [layoutMode, setLayoutMode] = useState<"board" | "table">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");

  // Interaction State
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);
  const [showJobImportModal, setShowJobImportModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const router = useRouter();

  const handlePracticeInterview = (card: KanbanCard) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "copilot_interview_handoff",
        JSON.stringify({
          company: card.company,
          title: card.title,
          jobDescription:
            card.notes ||
            `Role at ${card.company} for ${card.title}. Next step: ${card.nextStep || card.status}`,
          skills: card.skills || [],
        })
      );
    }
    router.push("/interview");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadCards = () => {
    setLoading(true);
    setError(null);
    getApplications()
      .then((data) => {
        setCards(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load applications.");
        setLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    getApplications()
      .then((data) => {
        if (!isMounted) return;
        setCards(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load applications.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ─── Drag and Drop Handlers ───────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData("text/plain", cardId);
    setDraggedCardId(cardId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setActiveDropZone(stageId);
  };

  const handleDragLeave = () => {
    setActiveDropZone(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: KanbanStatus) => {
    e.preventDefault();
    setActiveDropZone(null);
    const cardId = e.dataTransfer.getData("text/plain") || draggedCardId;
    setDraggedCardId(null);

    if (!cardId) return;

    const currentCard = cards.find((c) => c.id === cardId);
    if (!currentCard || currentCard.status === targetStatus) return;

    // Optimistic UI update
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, status: targetStatus } : c))
    );

    try {
      await updateApplicationStatus(cardId, targetStatus);
      showToast(`Moved ${currentCard.company} to ${targetStatus}`);
    } catch (err: unknown) {
      loadCards();
      setError(err instanceof Error ? err.message : "Failed to update status.");
    }
  };

  const handleStatusChange = async (cardId: string, newStat: KanbanStatus) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status === newStat) return;

    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, status: newStat } : c))
    );

    try {
      await updateApplicationStatus(cardId, newStat);
      showToast(`Updated to ${newStat}`);
      if (selectedCard?.id === cardId) {
        setSelectedCard((prev) => (prev ? { ...prev, status: newStat } : null));
      }
    } catch {
      loadCards();
    }
  };

  // ─── Add Job From API Import Modal ────────────────────────────────────────

  const handleAddJobFromApi = async (job: Job) => {
    const newApp: Omit<KanbanCard, "id"> = {
      company: job.company,
      title: job.title,
      logo: job.logo && !job.logo.startsWith("http") ? job.logo : job.company.slice(0, 2).toUpperCase(),
      companyLogo: job.logo && job.logo.startsWith("http") ? job.logo : undefined,
      status: "Wishlist",
      priority: "medium",
      matchScore: job.matchScore > 0 ? job.matchScore : 0,
      salary: job.salaryRange || (job.salary && job.salary !== "Competitive" ? job.salary : undefined),
      url: job.applyUrl || undefined,
      sourceUrl: job.sourceUrl || undefined,
      location: job.location || undefined,
      source: job.source,
      externalJobId: job.externalId || job.id,
      jobType: job.type !== "Unspecified" ? job.type : undefined,
      postedDate: job.postedDateLabel || job.posted || undefined,
      closingDate: job.closingDate || undefined,
      deadlineProvenance: job.deadlineProvenance || "unknown",
      notes: job.attributionLabel
        ? `Discovered via ${job.attributionLabel}.`
        : job.description
        ? job.description.slice(0, 300)
        : undefined,
    };

    try {
      const created = await addApplication(newApp);
      setCards((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      showToast(`Added ${job.company} (${job.title}) to Wishlist`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add job to tracker.");
    }
  };

  const handleDeleteCard = async (id: string) => {
    const card = cards.find((c) => c.id === id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    if (selectedCard?.id === id) setSelectedCard(null);

    try {
      await deleteApplication(id);
      showToast(`Removed application for ${card?.company || "company"}`);
    } catch {
      loadCards();
    }
  };

  // ─── Filtered Cards ────────────────────────────────────────────────────────

  const filteredCards = cards.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority =
      priorityFilter === "all" || c.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const activeStages = viewDensity === "compact" ? FOUR_STAGES : SIX_STAGES;

  return (
    <div className="space-y-6 max-w-full pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B1FB8]/95 text-white text-xs font-semibold shadow-2xl border border-indigo-400/30 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          {toastMessage}
        </div>
      )}

      {/* Error state */}
      {error && (
        <ErrorBanner
          title="Application Pipeline Alert"
          message={error}
          onRetry={loadCards}
        />
      )}

      {/* Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Application Pipeline
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {cards.length} Tracked
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Import real job listings into Wishlist, then drag and drop cards to track your interview pipeline.
          </p>
        </div>

        {/* View Switchers (Global Add button removed per specification) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Density Switcher: 4-Stage Compact vs 6-Stage Detailed */}
          <div className="flex items-center gap-1 p-1 bg-[#0B0D18] border border-[rgba(100,110,255,0.12)] rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setViewDensity("compact")}
              className={clsx(
                "px-3 py-1 rounded-lg font-medium transition-all",
                viewDensity === "compact"
                  ? "bg-[#1B1FB8] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              4-Stage Compact
            </button>
            <button
              type="button"
              onClick={() => setViewDensity("detailed")}
              className={clsx(
                "px-3 py-1 rounded-lg font-medium transition-all",
                viewDensity === "detailed"
                  ? "bg-[#1B1FB8] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              6-Stage Detailed
            </button>
          </div>

          {/* Layout Mode: Board vs List */}
          <div className="flex items-center gap-1 p-1 bg-[#0B0D18] border border-[rgba(100,110,255,0.12)] rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setLayoutMode("board")}
              className={clsx(
                "p-1.5 rounded-lg transition-all",
                layoutMode === "board"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white"
              )}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("table")}
              className={clsx(
                "p-1.5 rounded-lg transition-all",
                layoutMode === "table"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white"
              )}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B0D18] p-3 rounded-2xl border border-[rgba(100,110,255,0.12)]">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company or role..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#050505] border border-[rgba(100,110,255,0.12)] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Priority:</span>
          {(["all", "high", "medium", "low"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={clsx(
                "px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all",
                priorityFilter === p
                  ? "bg-[#1B1FB8]/30 text-indigo-300 border border-indigo-500/40"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Board or Table Render */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-xs">Loading application pipeline...</span>
        </div>
      ) : layoutMode === "board" ? (
        /* Kanban Board View */
        <div
          className={clsx(
            "grid gap-4 items-start",
            viewDensity === "compact"
              ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
              : "grid-cols-1 md:grid-cols-3 xl:grid-cols-6"
          )}
        >
          {activeStages.map((stage) => {
            const stageCards = filteredCards.filter((c) =>
              stage.statuses.includes(c.status)
            );
            const isDropActive = activeDropZone === stage.id;
            const isFirstStage =
              stage.id === "wishlist" || stage.id === "Wishlist";

            return (
              <div
                key={stage.id}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.defaultStatus)}
                className={clsx(
                  "flex flex-col rounded-2xl bg-[#0B0D18] border-t-2 border border-[rgba(100,110,255,0.12)] min-h-[500px] transition-all",
                  stage.accentColor,
                  isDropActive
                    ? "ring-2 ring-indigo-500/80 bg-indigo-500/5 scale-[1.01]"
                    : ""
                )}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-[rgba(100,110,255,0.12)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      {stage.label}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                      {stageCards.length}
                    </span>
                  </div>
                </div>

                {/* Prominent Add Button ONLY in First Column */}
                {isFirstStage && (
                  <div className="p-2.5 border-b border-[rgba(100,110,255,0.12)] bg-indigo-500/[0.04]">
                    <button
                      type="button"
                      onClick={() => setShowJobImportModal(true)}
                      className="w-full py-2 px-3 rounded-xl bg-[#1B1FB8]/20 hover:bg-[#1B1FB8]/30 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-500/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm group"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                      <span>+ Add Job Application</span>
                    </button>
                  </div>
                )}

                {/* Cards Container */}
                <div className="p-2.5 space-y-2.5 flex-1 flex flex-col overflow-y-auto max-h-[70vh]">
                  {stageCards.map((card) => {
                    const isCardSelected = selectedCard?.id === card.id;

                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, card.id)}
                        onClick={() => setSelectedCard(card)}
                        className={clsx(
                          "rounded-xl border p-3.5 bg-[#0B0D18] cursor-grab active:cursor-grabbing hover:border-indigo-500/40 hover:bg-[#151A35]/60 hover:shadow-lg hover:shadow-[rgba(27,31,184,0.12)] transition-all relative group shadow-sm",
                          isCardSelected
                            ? "border-indigo-500 ring-1 ring-indigo-500/50"
                            : "border-[rgba(100,110,255,0.12)]"
                        )}
                      >
                        {/* Company Avatar + Name & Status Pill */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                              {card.companyLogo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={card.companyLogo}
                                  alt={card.company}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <span>{card.logo || card.company.slice(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-white truncate">
                              {card.company}
                            </span>
                          </div>

                          {/* 1-Click Status Dropdown Pill */}
                          <select
                            value={card.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleStatusChange(
                                card.id,
                                e.target.value as KanbanStatus
                              )
                            }
                            className={clsx(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none appearance-none pr-3",
                              STATUS_PILL_COLOR[card.status]
                            )}
                          >
                            {ALL_STATUSES.map((s) => (
                              <option key={s} value={s} className="bg-[#0B0D18] text-white">
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Role Title */}
                        <p className="text-xs text-slate-300 font-medium mb-3 line-clamp-1">
                          {card.title}
                        </p>

                        {/* Match / CTC Badge & Priority */}
                        <div className="flex items-center justify-between text-[11px] mb-2 pt-2 border-t border-white/5">
                          <div className="flex items-center gap-1.5 truncate">
                            {card.matchScore > 0 && (
                              <span className="text-emerald-400 font-bold">
                                {card.matchScore}%
                              </span>
                            )}
                            {card.salary && (
                              <span className="text-[10px] text-slate-400 font-medium truncate">
                                {card.matchScore > 0 ? "• " : ""}{card.salary}
                              </span>
                            )}
                            {!card.salary && (!card.matchScore || card.matchScore === 0) && card.location && (
                              <span className="text-[10px] text-slate-500 truncate">
                                {card.location}
                              </span>
                            )}
                          </div>

                          <span
                            className={clsx(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize shrink-0",
                              PRIORITY_COLOR[card.priority]
                            )}
                          >
                            {card.priority}
                          </span>
                        </div>

                        {/* Next Action Date / Step or Added Date */}
                        {card.nextStep ? (
                          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {card.nextStep}
                              {card.nextStepDate ? ` (${card.nextStepDate})` : ""}
                            </span>
                          </div>
                        ) : card.appliedDate ? (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Applied: {card.appliedDate}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-slate-600" />
                            <span className="truncate">
                              {card.source ? `Source: ${card.source}` : "Discovered opportunity"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Empty States */}
                  {stageCards.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center">
                      {isFirstStage ? (
                        <div className="space-y-3">
                          <div className="w-10 h-10 rounded-xl bg-white/5 border border-[rgba(100,110,255,0.12)] text-slate-400 flex items-center justify-center mx-auto">
                            <Briefcase className="w-5 h-5 text-indigo-400/80" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-slate-300">
                              No jobs added yet.
                            </p>
                            <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                              Start building your application pipeline by importing jobs from Job Discovery.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowJobImportModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B1FB8]/30 hover:bg-[#1B1FB8]/50 text-indigo-200 text-xs font-medium border border-indigo-500/30 transition-all mt-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Import from APIs</span>
                          </button>
                        </div>
                      ) : stage.id === "applied" || stage.id === "Applied" ? (
                        <div className="space-y-1.5 text-slate-500">
                          <div className="w-8 h-8 rounded-lg bg-white/4 flex items-center justify-center mx-auto text-slate-400">
                            <Send className="w-4 h-4 text-blue-400/70" />
                          </div>
                          <p className="text-xs font-medium text-slate-300">
                            No applications in this stage
                          </p>
                          <p className="text-[10px] text-slate-500 max-w-[180px] mx-auto leading-relaxed">
                            Drag jobs here once you submit an application or complete an OA.
                          </p>
                        </div>
                      ) : stage.id === "interviewing" || stage.id === "Interview" || stage.id === "Phone Screen" ? (
                        <div className="space-y-1.5 text-slate-500">
                          <div className="w-8 h-8 rounded-lg bg-white/4 flex items-center justify-center mx-auto text-slate-400">
                            <Calendar className="w-4 h-4 text-amber-400/70" />
                          </div>
                          <p className="text-xs font-medium text-slate-300">
                            No interviews scheduled
                          </p>
                          <p className="text-[10px] text-slate-500 max-w-[180px] mx-auto leading-relaxed">
                            Move applications here when interview rounds or screenings are confirmed.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 text-slate-500">
                          <div className="w-8 h-8 rounded-lg bg-white/4 flex items-center justify-center mx-auto text-slate-400">
                            <Award className="w-4 h-4 text-emerald-400/70" />
                          </div>
                          <p className="text-xs font-medium text-slate-300">
                            No final decisions yet
                          </p>
                          <p className="text-[10px] text-slate-500 max-w-[180px] mx-auto leading-relaxed">
                            Track job offers, negotiations, and outcome decisions here.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table / List View */
        <div className="rounded-2xl border border-[rgba(100,110,255,0.12)] bg-[#0B0D18] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#050505] text-slate-400 border-b border-[rgba(100,110,255,0.12)] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Match / Salary</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6 text-slate-300">
                {filteredCards.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="max-w-sm mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                          <Briefcase className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-semibold text-white">
                          No applications in pipeline
                        </h4>
                        <p className="text-xs text-slate-400">
                          Switch to Kanban view or import open positions from live job APIs directly into your Saved / Wishlist.
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setLayoutMode("board");
                            setShowJobImportModal(true);
                          }}
                          className="gap-1.5 text-xs shadow-md shadow-indigo-500/20"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Job Application</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCards.map((card) => (
                    <tr
                      key={card.id}
                      onClick={() => setSelectedCard(card)}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {card.logo || card.company.slice(0, 2).toUpperCase()}
                        </div>
                        <span>{card.company}</span>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        {card.title}
                      </td>

                      <td
                        className="py-3.5 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={card.status}
                          onChange={(e) =>
                            handleStatusChange(
                              card.id,
                              e.target.value as KanbanStatus
                            )
                          }
                          className={clsx(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none appearance-none pr-3",
                            STATUS_PILL_COLOR[card.status]
                          )}
                        >
                          {ALL_STATUSES.map((s) => (
                            <option
                              key={s}
                              value={s}
                              className="bg-[#0B0D18] text-white"
                            >
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {card.matchScore > 0 ? (
                            <span className="text-emerald-400 font-bold">
                              {card.matchScore}%
                            </span>
                          ) : null}
                          {card.salary && (
                            <span className="text-slate-400 text-[11px]">
                              {card.matchScore > 0 ? "• " : ""}{card.salary}
                            </span>
                          )}
                          {!card.salary && (!card.matchScore || card.matchScore === 0) && (
                            <span className="text-slate-500 text-[11px]">Not specified</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={clsx(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize",
                            PRIORITY_COLOR[card.priority]
                          )}
                        >
                          {card.priority}
                        </span>
                      </td>

                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                          title="Delete Application"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over Detail Panel */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0B0D18] border-l border-[rgba(100,110,255,0.16)] h-full p-6 overflow-y-auto space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[rgba(100,110,255,0.12)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 font-bold text-sm flex items-center justify-center shrink-0">
                  {selectedCard.logo || selectedCard.company.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedCard.company}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedCard.title}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCard(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Pipeline Stage
              </label>
              <select
                value={selectedCard.status}
                onChange={(e) =>
                  handleStatusChange(
                    selectedCard.id,
                    e.target.value as KanbanStatus
                  )
                }
                className="w-full bg-[#050505] border border-[rgba(100,110,255,0.12)] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* External Links & Metadata */}
            {(selectedCard.url || selectedCard.sourceUrl || selectedCard.location || selectedCard.closingDate) && (
              <div className="p-3 rounded-xl bg-white/3 border border-[rgba(100,110,255,0.12)] space-y-2 text-xs">
                {selectedCard.location && <p className="text-slate-400">Location: {selectedCard.location}</p>}
                {selectedCard.source && <p className="text-slate-400">Source: {selectedCard.source}</p>}
                {selectedCard.closingDate && (
                  <p className="text-slate-400">
                    Deadline: {selectedCard.closingDate}
                    {selectedCard.deadlineProvenance === "verified_source" ? " · verified by source" : " · user entered"}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {selectedCard.url && (
                    <a href={selectedCard.url} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1">
                      Application page <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {selectedCard.sourceUrl && selectedCard.sourceUrl !== selectedCard.url && (
                    <a href={selectedCard.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1">
                      Listing source <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Priority & Match */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Match Score
                </span>
                <p className="text-xl font-bold text-emerald-400">
                  {selectedCard.matchScore > 0 ? `${selectedCard.matchScore}%` : "Not evaluated"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Priority
                </span>
                <p className="text-sm font-semibold capitalize text-white">
                  {selectedCard.priority} Priority
                </p>
              </div>
            </div>

            {/* Next Steps & Action Dates */}
            <div className="p-4 rounded-xl bg-white/3 border border-[rgba(100,110,255,0.12)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Next Step Action
                </span>
                {selectedCard.nextStepDate && (
                  <span className="text-[10px] text-slate-400">
                    {selectedCard.nextStepDate}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {selectedCard.nextStep || "No scheduled interview or next action set."}
              </p>
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Application Notes
              </label>
              <textarea
                rows={4}
                defaultValue={selectedCard.notes || ""}
                onBlur={async (e) => {
                  const val = e.target.value.trim();
                  await updateApplication(selectedCard.id, { notes: val });
                  showToast("Saved application notes.");
                }}
                placeholder="Add preparation links, interviewer feedback, or notes..."
                className="w-full bg-[#050505] border border-[rgba(100,110,255,0.12)] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500">
                Auto-saves when you click out of the box.
              </span>
            </div>

            {/* Practice Interview Button */}
            <button
              type="button"
              onClick={() => handlePracticeInterview(selectedCard)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              <span>🎙️ Practice Mock Interview for This Role</span>
            </button>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-[rgba(100,110,255,0.12)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteCard(selectedCard.id)}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Application
              </button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedCard(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* API-Powered Job Import Modal */}
      <JobImportModal
        isOpen={showJobImportModal}
        onClose={() => setShowJobImportModal(false)}
        onAddJob={handleAddJobFromApi}
        existingCards={cards}
      />
    </div>
  );
}
