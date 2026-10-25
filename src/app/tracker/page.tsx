"use client";

import { useState, useEffect } from "react";
import Badge from "@/components/ui/Badge";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { getApplications, updateApplicationStatus } from "@/lib/services/applications.service";
import type { KanbanCard, KanbanStatus } from "@/types";
import {
  MoreHorizontal,
  CalendarCheck,
  Clock,
  ArrowRight,
  AlertCircle,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";

const COLUMNS: { status: KanbanStatus; color: string; dotColor: string; bg: string }[] = [
  { status: "Wishlist", color: "text-slate-400", dotColor: "bg-slate-400", bg: "bg-slate-500/10" },
  { status: "Applied", color: "text-blue-400", dotColor: "bg-blue-400", bg: "bg-blue-500/10" },
  { status: "Phone Screen", color: "text-violet-400", dotColor: "bg-violet-400", bg: "bg-violet-500/10" },
  { status: "Interview", color: "text-amber-400", dotColor: "bg-amber-400", bg: "bg-amber-500/10" },
  { status: "Offer", color: "text-emerald-400", dotColor: "bg-emerald-400", bg: "bg-emerald-500/10" },
  { status: "Rejected", color: "text-rose-400", dotColor: "bg-rose-400", bg: "bg-rose-500/10" },
];

const PRIORITY_BADGE: Record<string, "rose" | "amber" | "slate"> = {
  high: "rose",
  medium: "amber",
  low: "slate",
};

const SCORE_COLOR = (score: number) =>
  score >= 85 ? "text-emerald-400" : score >= 70 ? "text-amber-400" : "text-rose-400";

export default function TrackerPage() {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");

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

  const filteredCards = cards.filter((c) => {
    const matchesSearch =
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority =
      priorityFilter === "all" || c.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getByStatus = (status: KanbanStatus) =>
    filteredCards.filter((c) => c.status === status);

  const moveCard = async (id: string, newStatus: KanbanStatus) => {
    const previousStatus = cards.find((c) => c.id === id)?.status;
    if (!previousStatus || previousStatus === newStatus) return;

    // Optimistic update
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );

    try {
      await updateApplicationStatus(id, newStatus);
    } catch (err: unknown) {
      // Reload authoritative persisted status to avoid restoring an obsolete status over a later successful move
      try {
        const freshCards = await getApplications();
        setCards(freshCards);
      } catch {
        setCards((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: previousStatus } : c))
        );
      }
      setError(err instanceof Error ? err.message : "Failed to persist status change.");
    }
  };

  return (
    <div className="space-y-5 max-w-full">
      {/* Error state */}
      {error && (
        <ErrorBanner
          title="Application Tracker Sync Error"
          message={error}
          onRetry={loadCards}
        />
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {COLUMNS.map((col) => {
          const count = getByStatus(col.status).length;
          return (
            <div
              key={col.status}
              className={clsx(
                "flex flex-col items-center justify-center p-3 rounded-xl border border-white/6",
                col.bg
              )}
            >
              <span className={clsx("text-2xl font-bold", col.color)}>{count}</span>
              <span className="text-xs text-slate-400 mt-0.5 text-center">{col.status}</span>
            </div>
          );
        })}
      </div>

      {/* Filter and search toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#111827] border border-white/6 rounded-xl">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search companies or roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/5 border border-white/8 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
            {(["all", "high", "medium", "low"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                className={clsx(
                  "px-2.5 py-1 text-xs font-medium rounded-lg capitalize transition-colors",
                  priorityFilter === p
                    ? "bg-indigo-500 text-white"
                    : "bg-white/5 text-slate-400 hover:text-white"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-semibold">{filteredCards.length}</span> of {cards.length} applications
        </div>
      </div>

      {/* Loading state */}
      {loading && cards.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-sm">Loading application pipeline...</span>
        </div>
      ) : (
        /* Kanban board */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colCards = getByStatus(col.status);
            return (
              <div key={col.status} className="flex-shrink-0 w-[260px]">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={clsx("w-2 h-2 rounded-full", col.dotColor)} />
                    <span className="text-sm font-semibold text-white">{col.status}</span>
                    <span className="text-xs text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-full">
                      {colCards.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-3 kanban-col">
                  {colCards.map((card) => (
                    <KanbanCardView
                      key={card.id}
                      card={card}
                      columns={COLUMNS.map((c) => c.status)}
                      onMove={moveCard}
                    />
                  ))}
                  {colCards.length === 0 && (
                    <div className="border-2 border-dashed border-white/6 rounded-xl py-8 flex flex-col items-center justify-center text-center px-4">
                      <span className="text-xs text-slate-600">No applications</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KanbanCardView({
  card,
  columns,
  onMove,
}: {
  card: KanbanCard;
  columns: KanbanStatus[];
  onMove: (id: string, status: KanbanStatus) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-[#111827] border border-white/6 rounded-xl p-4 hover:border-indigo-500/20 hover:shadow-lg hover:shadow-black/20 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-indigo-300">{card.logo.slice(0, 2)}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{card.company}</p>
            <p className="text-xs text-slate-400 leading-tight truncate w-36">{card.title}</p>
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label={`Move ${card.company} application`}
            aria-expanded={showMenu}
            onClick={() => setShowMenu((p) => !p)}
            className="text-slate-500 hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-5 z-20 bg-[#1a2234] border border-white/10 rounded-xl shadow-xl w-40 py-1">
                {columns
                  .filter((s) => s !== card.status)
                  .map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        onMove(card.id, s);
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <ArrowRight className="w-3 h-3" />
                      Move to {s}
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Match score */}
      <div className="flex items-center justify-between mb-3">
        <Badge variant={PRIORITY_BADGE[card.priority]} size="sm" dot>
          {card.priority} priority
        </Badge>
        <span className={clsx("text-xs font-bold", SCORE_COLOR(card.matchScore))}>
          {card.matchScore}% match
        </span>
      </div>

      {/* Meta */}
      {card.appliedDate && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
          <Clock className="w-3 h-3" />
          Applied {card.appliedDate}
        </div>
      )}
      {card.nextStep && (
        <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-1.5">
          <CalendarCheck className="w-3 h-3" />
          {card.nextStep} · {card.nextStepDate}
        </div>
      )}
      {card.notes && (
        <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-white/3 border border-white/5">
          <AlertCircle className="w-3 h-3 text-slate-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-400 leading-relaxed">{card.notes}</p>
        </div>
      )}
    </div>
  );
}
