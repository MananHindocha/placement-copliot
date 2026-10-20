"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { KANBAN_CARDS } from "@/lib/mock-data";
import type { KanbanCard, KanbanStatus } from "@/types";
import {
  Plus,
  MoreHorizontal,
  CalendarCheck,
  Clock,
  ArrowRight,
  AlertCircle,
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
  const [cards, setCards] = useState<KanbanCard[]>(KANBAN_CARDS);

  const getByStatus = (status: KanbanStatus) =>
    cards.filter((c) => c.status === status);

  const moveCard = (id: string, newStatus: KanbanStatus) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
  };

  return (
    <div className="space-y-5 max-w-full">
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

      {/* Kanban board */}
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
                <button className="text-slate-500 hover:text-white transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
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
                    <span className="text-xs text-slate-600">Drop cards here</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
            onClick={() => setShowMenu((p) => !p)}
            className="text-slate-600 hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-5 z-20 bg-[#1a2234] border border-white/10 rounded-xl shadow-xl w-40 py-1">
              {columns
                .filter((s) => s !== card.status)
                .map((s) => (
                  <button
                    key={s}
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
