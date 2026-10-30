"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import ErrorBanner from "@/components/ui/ErrorBanner";
import {
  searchJobs,
  scoreJobMatches,
  applyFilters,
  getUserSkills,
  toggleSaveJob,
  DEFAULT_FILTERS,
} from "@/lib/services/jobs.service";
import type { JobFilters, MatchResult } from "@/lib/services/jobs.service";
import type { Job } from "@/types";
import { addApplication } from "@/lib/services/applications.service";
import {
  Search,
  MapPin,
  Clock,
  DollarSign,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Briefcase,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  SlidersHorizontal,
  X,
  Zap,
  TrendingUp,
  CheckCircle,
  XCircle,
  Filter,
  Globe,
  GraduationCap,
  IndianRupee,
  Calendar,
  Tag,
  RotateCcw,
  Wifi,
  WifiOff,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Target,
} from "lucide-react";
import { clsx } from "clsx";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, "indigo" | "emerald" | "amber" | "violet"> = {
  "Full-time": "indigo",
  Internship:  "emerald",
  Contract:    "amber",
  "Part-time": "violet",
};

const SCORE_COLOR = (score: number) =>
  score >= 85 ? "text-emerald-400" : score >= 70 ? "text-amber-400" : "text-rose-400";

const SCORE_BAR = (score: number): "emerald" | "amber" | "rose" =>
  score >= 85 ? "emerald" : score >= 70 ? "amber" : "rose";

const SCORE_BG = (score: number) =>
  score >= 85
    ? "bg-emerald-500/10 border-emerald-500/20"
    : score >= 70
      ? "bg-amber-500/10 border-amber-500/20"
      : "bg-rose-500/10 border-rose-500/20";

const FIT_BADGE: Record<string, "emerald" | "amber" | "rose" | "slate"> = {
  "Strong Fit":  "emerald",
  "Good Fit":    "amber",
  "Partial Fit": "slate",
  "Low Fit":     "rose",
};

const DIMENSION_LABELS: Record<string, string> = {
  skillAlignment: "Skills",
  roleAlignment:  "Role Fit",
  levelFit:       "Level Fit",
  preferenceFit:  "Preferences",
};

const JOB_TYPES = ["Full-time", "Part-time", "Internship", "Contract"];
const EXPERIENCE_LEVELS = [
  { value: "fresher", label: "Fresher (0-1 yr)" },
  { value: "junior",  label: "Junior (1-3 yr)" },
  { value: "mid",     label: "Mid (3-5 yr)" },
  { value: "senior",  label: "Senior (5+ yr)" },
];
const POSTED_OPTIONS = [
  { value: "today",  label: "Today" },
  { value: "3days",  label: "Last 3 days" },
  { value: "week",   label: "Last week" },
  { value: "month",  label: "Last month" },
  { value: "any",    label: "Any time" },
];

// ─── Collapsible Filter Section ───────────────────────────────────────────────

function FilterSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-3 px-1 text-left group"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
          <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          {title}
        </span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        )}
      </button>
      {open && <div className="pb-3 px-1">{children}</div>}
    </div>
  );
}

// ─── Score Dimension Row ──────────────────────────────────────────────────────

function DimensionRow({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? "emerald" : score >= 60 ? "amber" : "rose";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-medium">{label}</span>
        <span className={clsx("text-[10px] font-bold", SCORE_COLOR(score))}>{score}%</span>
      </div>
      <ProgressBar value={score} color={color} size="sm" label={label} />
    </div>
  );
}

// ─── Score Source Pill ────────────────────────────────────────────────────────

function ScoreSourcePill({ source }: { source: "gemini" | "heuristic" }) {
  if (source === "gemini") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20">
        <Sparkles className="w-2.5 h-2.5" />
        AI Analysis
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
      <Target className="w-2.5 h-2.5" />
      Skill Analysis
    </span>
  );
}

// ─── Match Insight Panel (shown in detail pane) ───────────────────────────────

function MatchInsightPanel({
  match,
}: {
  match: MatchResult;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl bg-white/3 border border-white/5 overflow-hidden">
      {/* Summary row — always visible */}
      <div className="p-3 space-y-2">
        {/* Fit label + source + reason */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={FIT_BADGE[match.fitLabel] ?? "slate"} size="sm">
              <Zap className="w-3 h-3" />
              {match.fitLabel}
            </Badge>
            <ScoreSourcePill source={match.scoreSource} />
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">{match.matchReason}</p>

        {/* Score disclaimer */}
        <p className="text-[10px] text-slate-600 italic">
          Score reflects profile-to-job alignment, not a hiring probability.
        </p>
      </div>

      {/* Quick skills row */}
      <div className="px-3 pb-2 space-y-2">
        {match.strengths.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
              Matching skills
            </p>
            <div className="flex flex-wrap gap-1">
              {match.strengths.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                >
                  <CheckCircle className="w-2.5 h-2.5" />
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {match.missingSkills.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
              Skills to learn
            </p>
            <div className="flex flex-wrap gap-1">
              {match.missingSkills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20"
                >
                  <XCircle className="w-2.5 h-2.5" />
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expand / collapse toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-white/5 text-[10px] font-medium text-slate-500 hover:text-indigo-400 hover:bg-white/3 transition-colors"
        aria-expanded={expanded}
        aria-controls={`match-detail-${match.jobId}`}
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3 h-3" />
            Hide detailed breakdown
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            View full breakdown
          </>
        )}
      </button>

      {/* Expanded section — dimension scores + improvements + unknown reqs */}
      {expanded && (
        <div
          id={`match-detail-${match.jobId}`}
          className="border-t border-white/5 p-3 space-y-4"
        >
          {/* Dimension breakdown */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              Score breakdown
            </p>
            <div className="space-y-2">
              {Object.entries(match.dimensions).map(([key, value]) => (
                <DimensionRow
                  key={key}
                  label={DIMENSION_LABELS[key] ?? key}
                  score={value}
                />
              ))}
            </div>
          </div>

          {/* Improvement suggestions */}
          {match.improvements.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                How to strengthen your application
              </p>
              <ul className="space-y-2">
                {match.improvements.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-slate-400 leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Unknown requirements */}
          {match.unknownRequirements.length > 0 && (
            <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold text-amber-300 mb-1">Cannot verify from profile</p>
                  <ul className="space-y-0.5">
                    {match.unknownRequirements.map((req, i) => (
                      <li key={i} className="text-[10px] text-amber-400/70">{req}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="p-2 rounded-lg bg-slate-500/5 border border-slate-500/10">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-500 leading-relaxed">
                This analysis is based on available profile information and job description text.
                It estimates profile-to-job alignment, not your probability of being selected.
                Actual requirements may differ from what the description states.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JobsPage() {
  // Core data
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerWarning, setProviderWarning] = useState<string | null>(null);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [dataSource, setDataSource] = useState<string>("demo");
  const [pagination, setPagination] = useState<{ jsearchNextCursor: string | null; himalayasNextPage: number | null }>({ jsearchNextCursor: null, himalayasNextPage: null });

  // Match scoring
  const [matchResults, setMatchResults] = useState<Map<string, MatchResult>>(new Map());
  const [scoring, setScoring] = useState(false);

  // Filters
  const [filters, setFilters] = useState<JobFilters>({ ...DEFAULT_FILTERS });
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [userSkills, setUserSkillsState] = useState<string[]>(() => getUserSkills());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Active filter count ────────────────────────────────────────────────

  const activeFilterCount = (() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.location) count++;
    if (filters.jobTypes.length > 0) count++;
    if (filters.experienceLevel) count++;
    if (filters.minMatchScore > 0) count++;
    if (filters.salaryMin > 0 || filters.salaryMax < 30) count++;
    if (!filters.includeSalaryNotDisclosed) count++;
    if (filters.skills.length > 0) count++;
    if (filters.postedWithin !== "any") count++;
    if (filters.workArrangement !== "any") count++;
    return count;
  })();

  // ─── Load initial jobs ──────────────────────────────────────────────────

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchJobs("", "");
      const data = result.jobs;
      setJobs(data);
      setSelectedJob(data[0] || null);
      setSavedJobs(new Set(data.filter((job) => job.saved).map((job) => job.id)));
      setDataSource(result.source);
      const warnings = Object.entries(result.sources || []).filter(([, status]) => status.status !== "ok")
        .map(([provider, status]) => `${provider}: ${status.message || status.status}`);
      setProviderWarning(warnings.length ? warnings.join(" · ") : null);
      setPagination(result.pagination || { jsearchNextCursor: null, himalayasNextPage: null });

      const skills = getUserSkills();
      setUserSkillsState(skills);

      // Score matches immediately on load using current filter.location as
      // a preference signal — users often set location in filters
      setScoring(true);
      const scores = await scoreJobMatches(data, skills, "Frontend Developer", {
        preferredLocation: "",
        preferredTypes: [],
      });
      setMatchResults(scores);
      setJobs((prev) =>
        prev.map((j) => {
          const match = scores.get(j.id);
          return match ? { ...j, matchScore: match.matchScore } : j;
        })
      );
    } catch (err: unknown) {
      setJobs([]);
      setSelectedJob(null);
      setError(err instanceof Error ? err.message : "Failed to load jobs.");
    } finally {
      setLoading(false);
      setScoring(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void loadJobs(); }, 0);

    const handleSkillsUpdate = () => {
      loadJobs();
    };
    window.addEventListener("placement_skills_updated", handleSkillsUpdate);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("placement_skills_updated", handleSkillsUpdate);
    };
  }, [loadJobs]);

  // ─── Live search with debounce ──────────────────────────────────────────

  const handleLiveSearch = useCallback(
    (searchQuery: string, locationQuery: string, overrides: Partial<JobFilters> = {}) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const searchFilters = { ...filters, ...overrides };
          const result = await searchJobs(searchQuery, locationQuery, {
            workArrangement: searchFilters.workArrangement,
            employment: searchFilters.jobTypes[0],
            experience: searchFilters.experienceLevel,
            postedWithin: searchFilters.postedWithin,
          });
          const warnings = Object.entries(result.sources || {})
            .filter(([, status]) => status.status !== "ok")
            .map(([provider, status]) => `${provider}: ${status.message || status.status}`);
          setProviderWarning(warnings.length ? warnings.join(" · ") : null);
          setDataSource(result.source);
          setPagination(result.pagination || { jsearchNextCursor: null, himalayasNextPage: null });
          if (result.jobs.length > 0) {
            setError(null);
            setJobs(result.jobs);
            setSelectedJob(result.jobs[0]);

            // Re-score with location as a preference signal
            const currentSkills = getUserSkills();
            setScoring(true);
            const scores = await scoreJobMatches(
              result.jobs,
              currentSkills,
              "Frontend Developer",
              {
                preferredLocation: locationQuery,
                preferredTypes:    filters.jobTypes,
              }
            );
            setMatchResults(scores);
            setJobs((prev) =>
              prev.map((j) => {
                const match = scores.get(j.id);
                return match ? { ...j, matchScore: match.matchScore } : j;
              })
            );
            setScoring(false);
          } else {
            setJobs([]);
            setSelectedJob(null);
            const providerErrors = Object.entries(result.sources || {})
              .filter(([, status]) => status.status !== "ok")
              .map(([provider, status]) => `${provider}: ${status.message || status.status}`);
            setError(providerErrors.length
              ? `Live job search returned no results. ${providerErrors.join(" ")}`
              : "No live listings matched that search. Try another role or location.");
          }
        } catch (err: unknown) {
          setJobs([]);
          setSelectedJob(null);
          setPagination({ jsearchNextCursor: null, himalayasNextPage: null });
          setError(err instanceof Error ? err.message : "Live job search failed.");
        } finally {
          setSearching(false);
          setScoring(false);
        }
      }, 300);
    },
    [filters]
  );

  // ─── Update filter ──────────────────────────────────────────────────────

  const updateFilter = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));

    if (key === "search" || key === "location" || key === "workArrangement" || key === "experienceLevel" || key === "postedWithin") {
      const newFilters = { ...filters, [key]: value };
      handleLiveSearch(newFilters.search, newFilters.location, newFilters);
    }
  };

  const clearFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    loadJobs();
  };

  const toggleJobType = (type: string) => {
    const nextTypes = filters.jobTypes.includes(type)
      ? filters.jobTypes.filter((t) => t !== type)
      : [...filters.jobTypes, type];
    setFilters((prev) => ({ ...prev, jobTypes: nextTypes }));
    handleLiveSearch(filters.search, filters.location, { ...filters, jobTypes: nextTypes });
  };

  const toggleSkill = (skill: string) => {
    setFilters((prev) => {
      const existing = prev.skills;
      const next = existing.includes(skill)
        ? existing.filter((s) => s !== skill)
        : [...existing, skill];
      return { ...prev, skills: next };
    });
  };

  const loadMoreJobs = async () => {
    if (!pagination.jsearchNextCursor && !pagination.himalayasNextPage) return;
    setSearching(true);
    try {
      const result = await searchJobs(filters.search, filters.location, {
        workArrangement: filters.workArrangement,
        employment: filters.jobTypes[0],
        experience: filters.experienceLevel,
        postedWithin: filters.postedWithin,
        jsearchCursor: pagination.jsearchNextCursor || undefined,
        himalayasPage: pagination.himalayasNextPage || undefined,
      });
      const warnings = Object.entries(result.sources || {}).filter(([, status]) => status.status !== "ok")
        .map(([provider, status]) => `${provider}: ${status.message || status.status}`);
      setProviderWarning(warnings.length ? warnings.join(" · ") : null);
      setPagination(result.pagination || { jsearchNextCursor: null, himalayasNextPage: null });
      const existingIds = new Set(jobs.map((job) => job.id));
      const added = result.jobs.filter((job) => !existingIds.has(job.id));
      if (added.length) {
        const scores = await scoreJobMatches(added, getUserSkills(), "Frontend Developer", {
          preferredLocation: filters.location,
          preferredTypes: filters.jobTypes,
        });
        setJobs((previous) => [...previous, ...added.map((job) => ({ ...job, matchScore: scores.get(job.id)?.matchScore ?? job.matchScore }))]);
        setMatchResults((previous) => new Map([...previous, ...scores]));
      }
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load more job listings.");
    } finally {
      setSearching(false);
    }
  };

  // ─── Toggle save ────────────────────────────────────────────────────────

  const toggleSave = async (id: string) => {
    const isCurrentlySaved = savedJobs.has(id);
    const newSaved = !isCurrentlySaved;

    setSavedJobs((prev) => {
      const next = new Set(prev);
      if (newSaved) next.add(id);
      else next.delete(id);
      return next;
    });

    try {
      await toggleSaveJob(id, newSaved);
    } catch (err: unknown) {
      setSavedJobs((prev) => {
        const next = new Set(prev);
        if (isCurrentlySaved) next.add(id);
        else next.delete(id);
        return next;
      });
      setError(err instanceof Error ? err.message : "Failed to update saved job status.");
    }
  };

  const handleApply = async (job: Job) => {
    if (job.applied) return;
    const destination = job.applyUrl || job.sourceUrl;
    const applyWindow = destination ? window.open("about:blank", "_blank") : null;
    if (applyWindow) applyWindow.opener = null;
    try {
      await addApplication({
        company: job.company,
        title: job.title,
        logo: job.logo,
        status: "Wishlist",
        priority: "medium",
        matchScore: job.matchScore,
        salary: job.salaryRange || job.salary,
        url: job.applyUrl || undefined,
        location: job.location,
        source: job.source,
        sourceUrl: job.sourceUrl || undefined,
        closingDate: job.closingDate || undefined,
        deadlineProvenance: job.deadlineProvenance || "unknown",
        notes: job.attributionLabel ? `Listed by ${job.attributionLabel}.` : undefined,
      });
      setJobs((prev) => prev.map((item) => item.id === job.id ? { ...item, applied: true } : item));
      if (selectedJob?.id === job.id) setSelectedJob((prev) => prev ? { ...prev, applied: true } : null);
      if (destination && applyWindow) applyWindow.location.href = destination;
      else if (destination) setError("The job was added to your tracker, but the browser blocked the new tab. Open its saved link from the tracker.");
      else setError("This job was added to your tracker, but the source did not provide an application link.");
    } catch (err: unknown) {
      applyWindow?.close();
      setError(err instanceof Error ? err.message : "Could not add this job to your tracker.");
    }
  };

  // ─── Apply all filters client-side ─────────────────────────────────────

  // Sort by match score (descending) after filtering so best matches appear first
  const filtered = applyFilters(jobs, filters).sort(
    (a, b) => b.matchScore - a.matchScore
  );
  const activeJob =
    selectedJob && filtered.some((j) => j.id === selectedJob.id)
      ? selectedJob
      : filtered[0] ?? null;

  const activeMatchResult = activeJob ? matchResults.get(activeJob.id) : null;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Error state */}
      {error && (
        <ErrorBanner
          title="Job Discovery Sync Error"
          message={error}
          onRetry={loadJobs}
        />
      )}
      {providerWarning && (
        <div role="status" className="px-4 py-2 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-200">
          Some job sources are unavailable: {providerWarning}
        </div>
      )}

      {/* Top bar with source indicator */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            className={clsx(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
              filterPanelOpen
                ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                : "bg-white/5 border-white/8 text-slate-400 hover:text-white hover:border-white/15"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-bold min-w-[20px] text-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-400 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Data source pill */}
          <div
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border",
              dataSource === "demo"
                ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            )}
          >
            {dataSource === "demo" ? (
              <WifiOff className="w-3 h-3" />
            ) : (
              <Wifi className="w-3 h-3" />
            )}
            {dataSource === "demo" ? "Demo Data" : `Live · ${dataSource}`}
          </div>

          {/* Results count */}
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs text-slate-400">
              <span className="text-white font-semibold">{filtered.length}</span> roles
              {searching && (
                <Loader2 className="w-3 h-3 animate-spin inline ml-1.5 text-indigo-400" />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && jobs.length === 0 ? (
        <div className="flex gap-4">
          <div className="w-[280px] shrink-0 p-4 rounded-2xl bg-[#0B1120] border border-white/5 space-y-4">
            <div className="h-5 w-24 skeleton mb-2" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2 py-2">
                <div className="h-3.5 w-20 skeleton" />
                <div className="h-2.5 w-32 skeleton" />
              </div>
            ))}
          </div>

          <div className="flex-1 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-2xl bg-[#0B1120] border border-white/5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl skeleton shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-48 skeleton" />
                    <div className="h-3 w-28 skeleton" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-16 skeleton rounded-full" />
                  <div className="h-5 w-20 skeleton rounded-full" />
                </div>
              </div>
            ))}
          </div>

          <div className="w-[420px] shrink-0 p-5 rounded-2xl bg-[#0B1120] border border-white/5 space-y-4 hidden xl:block">
            <div className="h-6 w-48 skeleton" />
            <div className="h-4 w-32 skeleton" />
            <div className="h-24 w-full skeleton my-4" />
            <div className="space-y-2">
              <div className="h-3.5 w-full skeleton" />
              <div className="h-3.5 w-5/6 skeleton" />
              <div className="h-3.5 w-4/6 skeleton" />
            </div>
          </div>
        </div>
      ) : (
        /* Main 3-column layout: Filter | List | Detail */
        <div className="flex gap-4">
          {/* ─── LEFT: Filter Panel ──────────────────────────────────────── */}
          {filterPanelOpen && (
            <div className="w-[280px] shrink-0">
              <Card className="sticky top-0 max-h-[calc(100vh-160px)] overflow-y-auto scrollbar-thin">
                <div className="space-y-1">
                  {/* Panel header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <span className="flex items-center gap-2 text-sm font-bold text-white">
                      <Filter className="w-4 h-4 text-indigo-400" />
                      Filters
                    </span>
                    <button
                      type="button"
                      onClick={() => setFilterPanelOpen(false)}
                      className="p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Search */}
                  <FilterSection title="Search" icon={Search} defaultOpen={true}>
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Role, company, or keyword..."
                          value={filters.search}
                          onChange={(e) => updateFilter("search", e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-xs bg-white/5 border border-white/8 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                        />
                      </div>
                      <div className="relative">
                        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          placeholder="City or Remote"
                          value={filters.location}
                          onChange={(e) => updateFilter("location", e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-xs bg-white/5 border border-white/8 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
                        />
                      </div>
                    </div>
                  </FilterSection>

                  <FilterSection title="Work Arrangement" icon={Globe} defaultOpen={false}>
                    <select
                      value={filters.workArrangement}
                      onChange={(e) => updateFilter("workArrangement", e.target.value as JobFilters["workArrangement"])}
                      className="w-full bg-[#050811] border border-white/8 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="any">Any arrangement</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">On-site</option>
                    </select>
                  </FilterSection>

                  {/* Job Type */}
                  <FilterSection title="Job Type" icon={Briefcase}>
                    <div className="space-y-1.5">
                      {JOB_TYPES.map((type) => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={filters.jobTypes.includes(type)}
                            onChange={() => toggleJobType(type)}
                            className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/30 focus:ring-offset-0"
                          />
                          <span className="text-xs text-slate-400 group-hover:text-white transition-colors">
                            {type}
                          </span>
                        </label>
                      ))}
                    </div>
                  </FilterSection>

                  {/* Experience Level */}
                  <FilterSection title="Experience" icon={GraduationCap} defaultOpen={false}>
                    <div className="space-y-1.5">
                      {EXPERIENCE_LEVELS.map((lvl) => (
                        <label key={lvl.value} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="radio"
                            name="experience"
                            value={lvl.value}
                            checked={filters.experienceLevel === lvl.value}
                            onChange={(e) => updateFilter("experienceLevel", e.target.value)}
                            className="w-3.5 h-3.5 border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/30 focus:ring-offset-0"
                          />
                          <span className="text-xs text-slate-400 group-hover:text-white transition-colors">
                            {lvl.label}
                          </span>
                        </label>
                      ))}
                      {filters.experienceLevel && (
                        <button
                          type="button"
                          onClick={() => updateFilter("experienceLevel", "")}
                          className="text-xs text-slate-500 hover:text-indigo-400 mt-1 transition-colors"
                        >
                          Clear selection
                        </button>
                      )}
                    </div>
                  </FilterSection>

                  {/* Match Score */}
                  <FilterSection title="Match Score" icon={TrendingUp} defaultOpen={false}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Min match %</span>
                        <span className={clsx("text-xs font-bold", SCORE_COLOR(filters.minMatchScore))}>
                          {filters.minMatchScore}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={filters.minMatchScore}
                        onChange={(e) => updateFilter("minMatchScore", parseInt(e.target.value, 10))}
                        className="w-full h-1.5 rounded-full appearance-none bg-white/8 accent-indigo-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </FilterSection>

                  {/* Salary Range */}
                  <FilterSection title="Salary Range" icon={IndianRupee} defaultOpen={false}>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Range (LPA)</span>
                          <span className="text-xs font-medium text-slate-300">
                            ₹{filters.salaryMin}L – ₹{filters.salaryMax}L
                          </span>
                        </div>
                        <div className="space-y-1">
                          <input
                            type="range"
                            min={0}
                            max={30}
                            step={1}
                            value={filters.salaryMin}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (val <= filters.salaryMax) updateFilter("salaryMin", val);
                            }}
                            className="w-full h-1.5 rounded-full appearance-none bg-white/8 accent-indigo-500 cursor-pointer"
                          />
                          <input
                            type="range"
                            min={0}
                            max={30}
                            step={1}
                            value={filters.salaryMax}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (val >= filters.salaryMin) updateFilter("salaryMax", val);
                            }}
                            className="w-full h-1.5 rounded-full appearance-none bg-white/8 accent-emerald-500 cursor-pointer"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.includeSalaryNotDisclosed}
                          onChange={(e) =>
                            updateFilter("includeSalaryNotDisclosed", e.target.checked)
                          }
                          className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/30 focus:ring-offset-0"
                        />
                        <span className="text-xs text-slate-400">Include &quot;Not disclosed&quot;</span>
                      </label>
                    </div>
                  </FilterSection>

                  {/* Skills */}
                  <FilterSection title="Skills" icon={Tag}>
                    <div className="flex flex-wrap gap-1.5">
                      {userSkills.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={clsx(
                            "px-2 py-1 rounded-md text-xs font-medium transition-all border",
                            filters.skills.includes(skill)
                              ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                              : "bg-white/5 border-white/8 text-slate-500 hover:text-slate-300 hover:border-white/15"
                          )}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </FilterSection>

                  {/* Posted Within */}
                  <FilterSection title="Posted Within" icon={Calendar} defaultOpen={false}>
                    <div className="space-y-1.5">
                      {POSTED_OPTIONS.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="radio"
                            name="postedWithin"
                            value={opt.value}
                            checked={filters.postedWithin === opt.value}
                            onChange={(e) => updateFilter("postedWithin", e.target.value)}
                            className="w-3.5 h-3.5 border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/30 focus:ring-offset-0"
                          />
                          <span className="text-xs text-slate-400 group-hover:text-white transition-colors">
                            {opt.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </FilterSection>
                </div>
              </Card>
            </div>
          )}

          {/* ─── CENTER: Job List ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* AI Scoring indicator */}
            {scoring && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <Zap className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span className="text-xs text-indigo-300">
                  Analysing profile-to-job alignment...
                </span>
                <Loader2 className="w-3 h-3 animate-spin text-indigo-400 ml-auto" />
              </div>
            )}

            {filtered.map((job) => {
              const match = matchResults.get(job.id);
              return (
                <div
                  key={job.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedJob(job)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedJob(job);
                    }
                  }}
                  className={clsx(
                    "group relative p-4 rounded-2xl border cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
                    activeJob?.id === job.id
                      ? "bg-indigo-500/8 border-indigo-500/30 shadow-lg shadow-indigo-500/5"
                      : "bg-[#111827] border-white/6 hover:border-white/12 hover:bg-[#131d2e]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Company logo */}
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-indigo-300">{job.logo}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-200 transition-colors">
                            {job.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{job.company}</p>
                          {job.attributionLabel && (
                            <p className="text-[10px] text-slate-500 mt-0.5">Source: {job.attributionLabel}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label={
                            savedJobs.has(job.id) ? `Remove ${job.title} from saved` : `Save ${job.title}`
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSave(job.id);
                          }}
                          className="text-slate-500 hover:text-amber-400 transition-colors shrink-0 p-1 rounded-lg hover:bg-amber-500/10 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        >
                          {savedJobs.has(job.id) ? (
                            <BookmarkCheck className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="w-3 h-3" />
                          {job.location.length > 25 ? job.location.slice(0, 25) + "…" : job.location}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <DollarSign className="w-3 h-3" />
                          {job.salary}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {job.posted}
                        </span>
                      </div>

                      {/* Bottom row: type badge + match score + fit label */}
                      <div className="flex items-center gap-2 mt-2.5">
                        <Badge variant={TYPE_BADGE[job.type] ?? "slate"} size="sm">
                          {job.type}
                        </Badge>

                        {/* Match score pill */}
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border",
                            SCORE_BG(job.matchScore),
                            SCORE_COLOR(job.matchScore)
                          )}
                        >
                          <TrendingUp className="w-3 h-3" />
                          {job.matchScore}%
                        </span>

                        {/* AI fit label */}
                        {match?.fitLabel && (
                          <Badge variant={FIT_BADGE[match.fitLabel] ?? "slate"} size="sm">
                            {match.fitLabel}
                          </Badge>
                        )}

                        {/* Score source indicator (compact) */}
                        {match?.scoreSource === "gemini" && (
                          <span title="AI-scored">
                            <Sparkles className="w-3 h-3 text-violet-400" />
                          </span>
                        )}

                        {/* Applied badge */}
                        {job.applied && (
                          <Badge variant="emerald" size="sm" dot>
                            Tracked
                          </Badge>
                        )}
                      </div>

                      {/* Skill tags (first 4) — highlight if in filter selection */}
                      {job.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {job.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className={clsx(
                                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                filters.skills.includes(tag)
                                  ? "bg-indigo-500/20 text-indigo-300"
                                  : "bg-white/5 text-slate-500"
                              )}
                            >
                              {tag}
                            </span>
                          ))}
                          {job.tags.length > 4 && (
                            <span className="px-1.5 py-0.5 text-[10px] text-slate-600">
                              +{job.tags.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && !loading && (
              <div className="p-12 text-center bg-[#111827] border border-white/6 rounded-2xl">
                <Globe className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-400">No matching roles found</p>
                <p className="text-xs text-slate-500 mt-1">
                  {jobs.length > 0
                    ? "Your current filters removed all jobs. Try broadening your search."
                    : "No live jobs found. Check the provider status above, verify your API keys, or adjust your search."}
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Clear all filters
                  </button>
                )}
              </div>
            )}
            {(pagination.jsearchNextCursor || pagination.himalayasNextPage) && (
              <Button variant="secondary" size="md" className="w-full" onClick={loadMoreJobs} disabled={searching}>
                {searching ? "Loading more…" : "Load More Jobs"}
              </Button>
            )}
          </div>

          {/* ─── RIGHT: Job Detail Panel ──────────────────────────────────── */}
          <div className="w-[420px] shrink-0 hidden lg:block">
            {activeJob ? (
              <Card className="sticky top-0 max-h-[calc(100vh-160px)] overflow-y-auto scrollbar-thin">
                {/* Header */}
                <div className="flex items-start gap-4 pb-5 border-b border-white/5 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="text-xl font-bold text-indigo-300">{activeJob.logo}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white">{activeJob.title}</h2>
                    <p className="text-slate-400 text-sm">{activeJob.company}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {activeJob.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        {activeJob.salary}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {activeJob.posted}
                      </span>
                    </div>
                  </div>
                </div>

                {(activeJob.attributionLabel || activeJob.workArrangement || activeJob.closingDate) && (
                  <div className="mb-5 p-3 rounded-xl bg-white/3 border border-white/5 space-y-1.5 text-xs text-slate-400">
                    {activeJob.attributionLabel && (
                      <p>
                        Source: {activeJob.sourceUrl ? (
                          <a href={activeJob.sourceUrl} target="_blank" rel="noreferrer" className="text-indigo-300 hover:text-indigo-200 underline underline-offset-2">
                            {activeJob.attributionLabel}
                          </a>
                        ) : activeJob.attributionLabel}
                      </p>
                    )}
                    {activeJob.workArrangement && <p>Work arrangement: {activeJob.workArrangement}</p>}
                    {activeJob.closingDate && (
                      <p>Application deadline: {new Date(activeJob.closingDate).toLocaleDateString()} · verified by source</p>
                    )}
                    {!activeJob.closingDate && activeJob.source && activeJob.source !== "demo" && (
                      <p>Application deadline: Not listed by source</p>
                    )}
                  </div>
                )}

                {/* Match score section */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-400">Profile Alignment</span>
                    <span className={clsx("text-sm font-bold", SCORE_COLOR(activeJob.matchScore))}>
                      {activeJob.matchScore}%
                    </span>
                  </div>
                  <ProgressBar
                    value={activeJob.matchScore}
                    color={SCORE_BAR(activeJob.matchScore)}
                    size="lg"
                    label="Profile alignment score"
                  />

                  {/* Enriched AI Match Insight panel */}
                  {activeMatchResult ? (
                    <div className="mt-3">
                      <MatchInsightPanel
                        match={activeMatchResult}
                      />
                    </div>
                  ) : scoring ? (
                    <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-white/3 border border-white/5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                      <span className="text-xs text-slate-400">Analysing profile alignment...</span>
                    </div>
                  ) : null}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {activeJob.tags.map((tag) => (
                    <Badge key={tag} variant="slate" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-white mb-2">About the Role</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {activeJob.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {activeJob.applied ? (
                    <Button
                      variant="success"
                      size="md"
                      icon={<Briefcase className="w-4 h-4" />}
                      className="flex-1"
                    >
                      Added to tracker ✓
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="md"
                      icon={<ExternalLink className="w-4 h-4" />}
                      className="flex-1"
                      onClick={() => handleApply(activeJob)}
                    >
                      {activeJob.applyUrl || activeJob.sourceUrl ? "Track & Apply" : "Track Job"}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="md"
                    icon={
                      savedJobs.has(activeJob.id) ? (
                        <BookmarkCheck className="w-4 h-4" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )
                    }
                    onClick={() => toggleSave(activeJob.id)}
                  >
                    {savedJobs.has(activeJob.id) ? "Saved" : "Save"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    icon={<ChevronRight className="w-4 h-4" />}
                  >
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
      )}
    </div>
  );
}
