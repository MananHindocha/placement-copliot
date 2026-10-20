"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { JOBS } from "@/lib/mock-data";
import type { Job } from "@/types";
import {
  Search,
  MapPin,
  Clock,
  DollarSign,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Briefcase,
  Sliders,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";

const TYPE_BADGE: Record<string, "indigo" | "emerald" | "amber" | "violet"> = {
  "Full-time": "indigo",
  Internship: "emerald",
  Contract: "amber",
  "Part-time": "violet",
};

const SCORE_COLOR = (score: number) =>
  score >= 85 ? "text-emerald-400" : score >= 70 ? "text-amber-400" : "text-rose-400";

const SCORE_BAR = (score: number): "emerald" | "amber" | "rose" =>
  score >= 85 ? "emerald" : score >= 70 ? "amber" : "rose";

export default function JobsPage() {
  const [savedJobs, setSavedJobs] = useState<Set<string>>(
    new Set(JOBS.filter((j) => j.saved).map((j) => j.id))
  );
  const [selectedJob, setSelectedJob] = useState<Job | null>(JOBS[0]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  const toggleSave = (id: string) => {
    setSavedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filtered = JOBS.filter((j) => {
    const matchSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || j.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search roles or companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/8 rounded-xl text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            {["All", "Full-time", "Internship", "Contract"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  typeFilter === t
                    ? "bg-indigo-500 text-white"
                    : "bg-white/5 text-slate-400 hover:text-white border border-white/8"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" icon={<Sliders className="w-3.5 h-3.5" />}>
            Filters
          </Button>
          <div className="flex items-center gap-1.5 ml-auto">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs text-slate-400">
              <span className="text-white font-semibold">{filtered.length}</span> roles matched
            </span>
          </div>
        </div>
      </Card>

      {/* Job list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Job list */}
        <div className="lg:col-span-2 space-y-2">
          {filtered.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className={clsx(
                "flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-150",
                selectedJob?.id === job.id
                  ? "bg-indigo-500/10 border-indigo-500/30"
                  : "bg-[#111827] border-white/6 hover:border-white/12 hover:bg-[#1a2234]"
              )}
            >
              {/* Logo */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-indigo-300">{job.logo}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{job.title}</p>
                    <p className="text-xs text-slate-400">{job.company}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSave(job.id);
                    }}
                    className="text-slate-500 hover:text-amber-400 transition-colors shrink-0"
                  >
                    {savedJobs.has(job.id) ? (
                      <BookmarkCheck className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant={TYPE_BADGE[job.type] ?? "slate"} size="sm">
                    {job.type}
                  </Badge>
                  <span className={clsx("text-xs font-bold", SCORE_COLOR(job.matchScore))}>
                    {job.matchScore}% match
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  {job.posted}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Job detail */}
        <div className="lg:col-span-3">
          {selectedJob ? (
            <Card className="sticky top-0">
              {/* Header */}
              <div className="flex items-start gap-4 pb-5 border-b border-white/5 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-indigo-300">{selectedJob.logo}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white">{selectedJob.title}</h2>
                  <p className="text-slate-400 text-sm">{selectedJob.company}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedJob.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      {selectedJob.salary}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedJob.posted}
                    </span>
                  </div>
                </div>
              </div>

              {/* Match score */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400">Profile Match</span>
                  <span
                    className={clsx(
                      "text-sm font-bold",
                      SCORE_COLOR(selectedJob.matchScore)
                    )}
                  >
                    {selectedJob.matchScore}%
                  </span>
                </div>
                <ProgressBar
                  value={selectedJob.matchScore}
                  color={SCORE_BAR(selectedJob.matchScore)}
                  size="lg"
                />
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-5">
                {selectedJob.tags.map((tag) => (
                  <Badge key={tag} variant="slate" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white mb-2">About the Role</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {selectedJob.description}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {selectedJob.applied ? (
                  <Button variant="success" size="md" icon={<Briefcase className="w-4 h-4" />} className="flex-1">
                    Applied ✓
                  </Button>
                ) : (
                  <Button variant="primary" size="md" icon={<ExternalLink className="w-4 h-4" />} className="flex-1">
                    Apply Now
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="md"
                  icon={
                    savedJobs.has(selectedJob.id) ? (
                      <BookmarkCheck className="w-4 h-4" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )
                  }
                  onClick={() => toggleSave(selectedJob.id)}
                >
                  {savedJobs.has(selectedJob.id) ? "Saved" : "Save"}
                </Button>
                <Button variant="ghost" size="md" icon={<ChevronRight className="w-4 h-4" />}>
                  Track
                </Button>
              </div>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
              Select a job to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
