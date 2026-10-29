"use client";

import { useState, useEffect, useRef } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import {
  getApplications,
  updateApplicationStatus,
  addApplication,
  deleteApplication,
  updateApplication,
} from "@/lib/services/applications.service";
import type { KanbanCard, KanbanStatus } from "@/types";
import {
  Plus,
  Search,
  Filter,
  Loader2,
  Calendar,
  Clock,
  MoreVertical,
  ChevronRight,
  ExternalLink,
  Trash2,
  X,
  Sparkles,
  LayoutGrid,
  List,
  CheckCircle2,
  ArrowRight,
  DollarSign,
  AlertCircle,
  Building,
  Edit3,
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
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inline Quick-Add State per column
  const [quickAddTexts, setQuickAddTexts] = useState<Record<string, string>>({});

  // Slide-over Add Application Form State
  const [newCompany, setNewCompany] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newStatus, setNewStatus] = useState<KanbanStatus>("Wishlist");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium");
  const [newSalary, setNewSalary] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newNextStep, setNewNextStep] = useState("");
  const [newNextStepDate, setNewNextStepDate] = useState("");

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

  // ─── Inline Quick Add ──────────────────────────────────────────────────────

  const handleQuickAdd = async (stage: StageConfig) => {
    const text = (quickAddTexts[stage.id] || "").trim();
    if (!text) return;

    let company = text;
    let title = "Software Engineer";

    if (text.includes("-")) {
      const parts = text.split("-");
      company = parts[0].trim();
      title = parts.slice(1).join("-").trim();
    } else if (text.includes("—")) {
      const parts = text.split("—");
      company = parts[0].trim();
      title = parts.slice(1).join("—").trim();
    }

    const newApp: Omit<KanbanCard, "id"> = {
      company,
      title,
      logo: company.slice(0, 2).toUpperCase(),
      status: stage.defaultStatus,
      priority: "medium",
      appliedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      matchScore: 80,
    };

    setQuickAddTexts((prev) => ({ ...prev, [stage.id]: "" }));

    try {
      const created = await addApplication(newApp);
      setCards((prev) => [created, ...prev]);
      showToast(`Added ${company} (${title})`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create application.");
    }
  };

  // ─── Detailed Add Modal Submit ─────────────────────────────────────────────

  const handleDetailedAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim() || !newRole.trim()) return;

    const newApp: Omit<KanbanCard, "id"> = {
      company: newCompany.trim(),
      title: newRole.trim(),
      logo: newCompany.trim().slice(0, 2).toUpperCase(),
      status: newStatus,
      priority: newPriority,
      salary: newSalary.trim() || undefined,
      notes: newNotes.trim() || undefined,
      nextStep: newNextStep.trim() || undefined,
      nextStepDate: newNextStepDate || undefined,
      appliedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      matchScore: 82,
    };

    try {
      const created = await addApplication(newApp);
      setCards((prev) => [created, ...prev]);
      setShowAddDrawer(false);
      setNewCompany("");
      setNewRole("");
      setNewSalary("");
      setNewNotes("");
      setNewNextStep("");
      setNewNextStepDate("");
      showToast(`Successfully added ${newApp.company}!`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create application.");
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
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/95 text-white text-xs font-semibold shadow-2xl border border-indigo-400/30 animate-bounce">
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
            Drag cards between columns or use inline Quick-Add to manage interviews effortlessly.
          </p>
        </div>

        {/* View Switchers & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Density Switcher: 4-Stage Compact vs 6-Stage Detailed */}
          <div className="flex items-center gap-1 p-1 bg-[#0B1120] border border-white/8 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setViewDensity("compact")}
              className={clsx(
                "px-3 py-1 rounded-lg font-medium transition-all",
                viewDensity === "compact"
                  ? "bg-indigo-600 text-white shadow-sm"
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
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              6-Stage Detailed
            </button>
          </div>

          {/* Layout Mode: Board vs List */}
          <div className="flex items-center gap-1 p-1 bg-[#0B1120] border border-white/8 rounded-xl text-xs">
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

          {/* Add Application Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddDrawer(true)}
            className="gap-1.5 text-xs shadow-md shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Application
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B1120] p-3 rounded-2xl border border-white/8">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company or role..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#050811] border border-white/6 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40"
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

            return (
              <div
                key={stage.id}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.defaultStatus)}
                className={clsx(
                  "flex flex-col rounded-2xl bg-[#0B1120] border-t-2 border border-white/8 min-h-[500px] transition-all",
                  stage.accentColor,
                  isDropActive
                    ? "ring-2 ring-indigo-500/80 bg-indigo-500/5 scale-[1.01]"
                    : ""
                )}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-white/6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      {stage.label}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                      {stageCards.length}
                    </span>
                  </div>
                </div>

                {/* Inline Quick Add Input */}
                <div className="p-2.5 border-b border-white/5 bg-white/1">
                  <div className="relative">
                    <input
                      type="text"
                      value={quickAddTexts[stage.id] || ""}
                      onChange={(e) =>
                        setQuickAddTexts((prev) => ({
                          ...prev,
                          [stage.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleQuickAdd(stage);
                        }
                      }}
                      placeholder="+ Quick add (Company - Role)..."
                      className="w-full bg-[#050811] border border-white/8 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuickAdd(stage)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400"
                      title="Quick Add"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[70vh]">
                  {stageCards.map((card) => {
                    const isCardSelected = selectedCard?.id === card.id;

                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, card.id)}
                        onClick={() => setSelectedCard(card)}
                        className={clsx(
                          "rounded-xl border p-3.5 bg-[#0F172A] cursor-grab active:cursor-grabbing hover:border-indigo-500/40 hover:bg-[#131c33] transition-all relative group shadow-sm",
                          isCardSelected
                            ? "border-indigo-500 ring-1 ring-indigo-500/50"
                            : "border-white/6"
                        )}
                      >
                        {/* 4 Essential Data Points */}
                        {/* 1. Company Avatar + Name & Status Pill */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {card.logo || card.company.slice(0, 2).toUpperCase()}
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
                              <option key={s} value={s} className="bg-[#0B1120] text-white">
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Role Title */}
                        <p className="text-xs text-slate-300 font-medium mb-3 line-clamp-1">
                          {card.title}
                        </p>

                        {/* 3. Match / CTC Badge & Priority */}
                        <div className="flex items-center justify-between text-[11px] mb-2 pt-2 border-t border-white/5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-400 font-bold">
                              {card.matchScore}%
                            </span>
                            {card.salary && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                • {card.salary}
                              </span>
                            )}
                          </div>

                          <span
                            className={clsx(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize",
                              PRIORITY_COLOR[card.priority]
                            )}
                          >
                            {card.priority}
                          </span>
                        </div>

                        {/* 4. Next Action Date / Step */}
                        {card.nextStep ? (
                          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {card.nextStep}
                              {card.nextStepDate ? ` (${card.nextStepDate})` : ""}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Applied: {card.appliedDate || "Recently"}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {stageCards.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No applications in this stage.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table / List View */
        <div className="rounded-2xl border border-white/8 bg-[#0B1120] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#050811] text-slate-400 border-b border-white/6 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Match</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Next Step</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCards.map((card) => (
                  <tr
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className="hover:bg-white/2 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center">
                        {card.logo || card.company.slice(0, 2).toUpperCase()}
                      </div>
                      {card.company}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{card.title}</td>
                    <td className="py-3 px-4">
                      <span
                        className={clsx(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                          STATUS_PILL_COLOR[card.status]
                        )}
                      >
                        {card.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      {card.matchScore}%
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={clsx(
                          "px-2 py-0.5 rounded text-[10px] font-semibold border capitalize",
                          PRIORITY_COLOR[card.priority]
                        )}
                      >
                        {card.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {card.nextStep || "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCard(card.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete application"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Right Slide-over Detail Sheet */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0B1120] border-l border-white/10 h-full p-6 overflow-y-auto space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-sm flex items-center justify-center">
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
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Status Control */}
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
                className="w-full bg-[#050811] border border-white/8 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority & Match */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Match Score
                </span>
                <p className="text-xl font-bold text-emerald-400">
                  {selectedCard.matchScore}%
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
            <div className="p-4 rounded-xl bg-white/3 border border-white/6 space-y-2">
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
                className="w-full bg-[#050811] border border-white/8 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500">
                Auto-saves when you click out of the box.
              </span>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-white/8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteCard(selectedCard.id)}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
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

      {/* Slide-over "Add with Details" Modal */}
      {showAddDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0B1120] border-l border-white/10 h-full p-6 overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-400" />
                Add Application With Details
              </h3>
              <button
                type="button"
                onClick={() => setShowAddDrawer(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDetailedAdd} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="e.g. Google, Razorpay, Flipkart"
                  className="w-full bg-[#050811] border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Role Title *
                </label>
                <input
                  type="text"
                  required
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. SDE-1, Frontend Developer"
                  className="w-full bg-[#050811] border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as KanbanStatus)}
                    className="w-full bg-[#050811] border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) =>
                      setNewPriority(e.target.value as "high" | "medium" | "low")
                    }
                    className="w-full bg-[#050811] border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Expected CTC / Salary
                </label>
                <input
                  type="text"
                  value={newSalary}
                  onChange={(e) => setNewSalary(e.target.value)}
                  placeholder="e.g. ₹20L – ₹28L, Competitive"
                  className="w-full bg-[#050811] border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Next Step
                  </label>
                  <input
                    type="text"
                    value={newNextStep}
                    onChange={(e) => setNewNextStep(e.target.value)}
                    placeholder="e.g. Technical Round 1"
                    className="w-full bg-[#050811] border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Next Step Date
                  </label>
                  <input
                    type="date"
                    value={newNextStepDate}
                    onChange={(e) => setNewNextStepDate(e.target.value)}
                    className="w-full bg-[#050811] border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Add details, referral info, or links..."
                  className="w-full bg-[#050811] border border-white/8 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-white/8 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddDrawer(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
