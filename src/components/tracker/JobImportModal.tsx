"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  MapPin,
  Clock,
  ExternalLink,
  Briefcase,
  Plus,
  Check,
  X,
  Loader2,
  AlertCircle,
  Building,
  RotateCcw,
  Sparkles,
  Globe,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { searchJobs } from "@/lib/services/jobs.service";
import type { Job, KanbanCard } from "@/types";
import { clsx } from "clsx";

interface JobImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddJob: (job: Job) => Promise<void>;
  existingCards: KanbanCard[];
}

type SourceFilter = "all" | "openwebninja" | "himalayas";

const JOB_TYPES = [
  { label: "All Types", value: "" },
  { label: "Full-time", value: "Full-time" },
  { label: "Internship", value: "Internship" },
  { label: "Contract", value: "Contract" },
  { label: "Part-time", value: "Part-time" },
];

const EXPERIENCE_LEVELS = [
  { label: "All Levels", value: "" },
  { label: "Fresher / Entry (0-1 yr)", value: "fresher" },
  { label: "Junior (1-3 yr)", value: "junior" },
  { label: "Mid-level (3-5 yr)", value: "mid" },
  { label: "Senior (5+ yr)", value: "senior" },
];

export default function JobImportModal({
  isOpen,
  onClose,
  onAddJob,
  existingCards,
}: JobImportModalProps) {
  const [query, setQuery] = useState("Software Engineer");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerStatuses, setProviderStatuses] = useState<
    Record<string, { status: "ok" | "disabled" | "error"; message?: string; count: number }>
  >({});
  const [addingJobId, setAddingJobId] = useState<string | null>(null);

  // Check if a job is already in the tracker
  const isJobTracked = useCallback(
    (job: Job): boolean => {
      return existingCards.some((card) => {
        if (card.externalJobId && job.externalId && card.externalJobId === job.externalId) {
          return true;
        }
        if (card.externalJobId && card.externalJobId === job.id) {
          return true;
        }
        if (
          card.url &&
          job.applyUrl &&
          card.url.toLowerCase().replace(/\/$/, "") === job.applyUrl.toLowerCase().replace(/\/$/, "")
        ) {
          return true;
        }
        if (
          card.sourceUrl &&
          job.sourceUrl &&
          card.sourceUrl.toLowerCase().replace(/\/$/, "") === job.sourceUrl.toLowerCase().replace(/\/$/, "")
        ) {
          return true;
        }
        return (
          card.company.trim().toLowerCase() === job.company.trim().toLowerCase() &&
          card.title.trim().toLowerCase() === job.title.trim().toLowerCase()
        );
      });
    },
    [existingCards]
  );

  // Fetch jobs using existing search API
  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await searchJobs(query.trim(), location.trim(), {
        employment: jobType || undefined,
        experience: experienceLevel || undefined,
      });

      setJobs(res.jobs || []);
      if (res.sources) {
        setProviderStatuses(res.sources);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch live job listings. Please check your network and retry."
      );
    } finally {
      setLoading(false);
    }
  }, [query, location, jobType, experienceLevel]);

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen && jobs.length === 0 && !loading) {
      handleSearch();
    }
  }, [isOpen, jobs.length, loading, handleSearch]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter jobs by selected provider source
  const displayedJobs = useMemo(() => {
    if (sourceFilter === "all") return jobs;
    return jobs.filter((job) => job.source === sourceFilter);
  }, [jobs, sourceFilter]);

  // Counts per source
  const countAll = jobs.length;
  const countJSearch = jobs.filter((j) => j.source === "openwebninja").length;
  const countHimalayas = jobs.filter((j) => j.source === "himalayas").length;

  const handleClearFilters = () => {
    setQuery("");
    setLocation("");
    setJobType("");
    setExperienceLevel("");
    setSourceFilter("all");
  };

  const handleAddClick = async (job: Job) => {
    if (isJobTracked(job) || addingJobId === job.id) return;
    setAddingJobId(job.id);
    try {
      await onAddJob(job);
    } finally {
      setAddingJobId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 animate-fadeIn">
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-[#0D0D0D] border border-[#292929] rounded-2xl flex flex-col overflow-hidden text-[#F5F5F5]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="p-5 border-b border-[#1D1D1D] bg-[#0A0A0A] flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#121212] text-[#A78BFA] border border-[#292929]">
                <Briefcase className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-[#F5F5F5] tracking-tight">
                Add a Job to Your Tracker
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25">
                Live API Import
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Discover opportunities and add jobs you want to pursue to your application pipeline.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#121212] transition-colors cursor-pointer"
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Selection & Search Toolbar */}
        <div className="p-4 border-b border-[#1D1D1D] bg-[#050505] space-y-3 shrink-0">
          {/* Source Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 bg-[#0A0A0A] border border-[#1D1D1D] rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setSourceFilter("all")}
                className={clsx(
                  "px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                  sourceFilter === "all"
                    ? "bg-[#121212] text-[#F5F5F5] border border-[#292929]"
                    : "text-[#71717A] hover:text-[#F5F5F5]"
                )}
              >
                <span>All Sources</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#050505] text-[#A1A1AA] tabular-nums">
                  {countAll}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSourceFilter("openwebninja")}
                className={clsx(
                  "px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                  sourceFilter === "openwebninja"
                    ? "bg-[#121212] text-[#F5F5F5] border border-[#292929]"
                    : "text-[#71717A] hover:text-[#F5F5F5]"
                )}
              >
                <span>JSearch</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#050505] text-[#A1A1AA] tabular-nums">
                  {countJSearch}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSourceFilter("himalayas")}
                className={clsx(
                  "px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                  sourceFilter === "himalayas"
                    ? "bg-[#121212] text-[#F5F5F5] border border-[#292929]"
                    : "text-[#71717A] hover:text-[#F5F5F5]"
                )}
              >
                <span>Himalayas</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#050505] text-[#A1A1AA] tabular-nums">
                  {countHimalayas}
                </span>
              </button>
            </div>

            {/* Provider Status Alerts if any */}
            {providerStatuses.openwebninja?.status === "disabled" && (
              <span className="text-[11px] text-[#F59E0B] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>JSearch optional key disabled • Active on Himalayas</span>
              </span>
            )}
          </div>

          {/* Search Inputs & Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            {/* Keyword Search */}
            <div className="sm:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#71717A]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Job title or keywords..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#080808] border border-[#1D1D1D] rounded-lg text-xs text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#292929] transition-colors"
              />
            </div>

            {/* Location Filter */}
            <div className="sm:col-span-3 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#71717A]" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Location (e.g. India, Remote)..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#080808] border border-[#1D1D1D] rounded-lg text-xs text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#292929] transition-colors"
              />
            </div>

            {/* Job Type Dropdown */}
            <div className="sm:col-span-2">
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full bg-[#080808] border border-[#1D1D1D] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#292929] transition-colors"
              >
                {JOB_TYPES.map((t) => (
                  <option key={t.label} value={t.value} className="bg-[#0D0D0D]">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Experience Level Dropdown */}
            <div className="sm:col-span-2">
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full bg-[#080808] border border-[#1D1D1D] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#292929] transition-colors"
              >
                {EXPERIENCE_LEVELS.map((el) => (
                  <option key={el.label} value={el.value} className="bg-[#0D0D0D]">
                    {el.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Actions */}
            <div className="sm:col-span-1 flex items-center gap-1">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSearch}
                disabled={loading}
                className="w-full justify-center px-2 py-1.5 text-xs"
                title="Search listings"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>

          {(query !== "Software Engineer" || location || jobType || experienceLevel) && (
            <div className="flex items-center justify-between pt-1 text-[11px]">
              <span className="text-[#71717A] tabular-nums">
                Showing {displayedJobs.length} opportunities
              </span>
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-[#A1A1AA] hover:text-[#F5F5F5] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset search</span>
              </button>
            </div>
          )}
        </div>

        {/* Content / Job Listing Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
          {error && (
            <ErrorBanner
              title="Failed to Load Listings"
              message={error}
              onRetry={handleSearch}
            />
          )}

          {loading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] animate-pulse space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#171717]" />
                      <div className="space-y-1.5">
                        <div className="w-48 h-3.5 bg-[#171717] rounded" />
                        <div className="w-28 h-2.5 bg-[#171717] rounded" />
                      </div>
                    </div>
                    <div className="w-24 h-7 bg-[#171717] rounded-lg" />
                  </div>
                  <div className="w-full h-2.5 bg-[#171717] rounded" />
                </div>
              ))}
            </div>
          ) : displayedJobs.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#121212] border border-[#292929] text-[#A1A1AA] flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#F5F5F5]">
                No matching jobs found
              </h3>
              <p className="text-xs text-[#71717A] max-w-sm mx-auto">
                Try widening your search terms, changing the location, or switching between JSearch and Himalayas providers.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearFilters}
                className="gap-1.5 text-xs mt-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default Search</span>
              </Button>
            </div>
          ) : (
            displayedJobs.map((job) => {
              const alreadyTracked = isJobTracked(job);
              const isAdding = addingJobId === job.id;

              return (
                <div
                  key={job.id}
                  className={clsx(
                    "p-4 rounded-xl border transition-colors space-y-3 relative group",
                    alreadyTracked
                      ? "border-[#10B981]/30 bg-[#10B981]/5"
                      : "bg-[#0A0A0A] border-[#1D1D1D] hover:border-[#292929] hover:bg-[#121212]"
                  )}
                >
                  {/* Top Bar: Company, Title & Add Button */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Logo or Monogram */}
                      <div className="w-10 h-10 rounded-lg bg-[#121212] border border-[#292929] text-[#F5F5F5] font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
                        {job.logo && job.logo.startsWith("http") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={job.logo}
                            alt={job.company}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span>{job.company.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>

                      {/* Title & Metadata */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#A1A1AA] transition-colors">
                            {job.title}
                          </h4>
                          {/* Source Badge */}
                          <span
                            className={clsx(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                              job.source === "himalayas"
                                ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25"
                                : "bg-[#121212] text-[#A1A1AA] border-[#292929]"
                            )}
                          >
                            {job.source === "himalayas" ? "Himalayas" : "JSearch"}
                          </span>

                          {/* Work Arrangement / Job Type */}
                          {job.type && job.type !== "Unspecified" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#121212] text-[#A1A1AA] border border-[#1D1D1D] font-medium">
                              {job.type}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#F5F5F5]/90 font-medium flex items-center gap-1.5 flex-wrap">
                          <Building className="w-3.5 h-3.5 text-[#71717A]" />
                          <span>{job.company}</span>
                          {job.location && (
                            <>
                              <span className="text-[#52525B]">•</span>
                              <span className="text-[#A1A1AA] flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#71717A]" />
                                {job.location}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                      {job.applyUrl && (
                        <a
                          href={job.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] bg-[#121212] hover:bg-[#1A1A1A] border border-[#292929] transition-colors"
                          title="Open external job listing"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {alreadyTracked ? (
                        <button
                          type="button"
                          disabled
                          className="py-1.5 px-3 rounded-lg bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-90"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Already in Tracker</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddClick(job)}
                          disabled={isAdding}
                          className="py-1.5 px-3 rounded-lg bg-[#F5F5F5] hover:bg-[#E4E4E7] text-[#000000] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {isAdding ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          <span>+ Add to Tracker</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Compensation & Date Info */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] pt-2 border-t border-[#1D1D1D] text-[#71717A]">
                    {/* Salary when available */}
                    {job.salary && job.salary !== "Competitive" ? (
                      <span className="text-[#10B981] font-semibold flex items-center gap-1">
                        <span>💰 {job.salary}</span>
                      </span>
                    ) : (
                      <span className="text-[#71717A]">
                        Salary: Not specified
                      </span>
                    )}

                    {/* Date posted when available */}
                    {(job.postedDateLabel || job.posted) && (
                      <span className="flex items-center gap-1 text-[#71717A]">
                        <Clock className="w-3 h-3 text-[#71717A]" />
                        <span>Posted {job.postedDateLabel || job.posted}</span>
                      </span>
                    )}

                    {/* Work arrangement tag */}
                    {job.workArrangement && job.workArrangement !== "unspecified" && (
                      <span className="capitalize px-2 py-0.5 rounded bg-[#121212] border border-[#1D1D1D] text-[#A1A1AA]">
                        {job.workArrangement}
                      </span>
                    )}
                  </div>

                  {/* Clean Job Description snippet */}
                  {job.description && (
                    <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed">
                      {job.description.replace(/\s+/g, " ").trim()}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#1D1D1D] bg-[#0A0A0A] flex items-center justify-between text-xs text-[#71717A] shrink-0">
          <span>
            Added jobs enter your <strong className="text-[#F5F5F5]">Saved / Wishlist</strong> stage immediately.
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

