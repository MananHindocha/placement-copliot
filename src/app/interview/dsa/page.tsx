"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Code2,
  ArrowLeft,
  Search,
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Circle,
  ArrowRight,
  Filter,
  ArrowUpDown,
  Tag,
  Check,
} from "lucide-react";
import { clsx } from "clsx";
import {
  CORE_MAJOR_COMPANIES,
  DSA_OA_PROBLEMS,
  DSA_OA_TOPICS,
  getCompanyLogoUrl,
} from "@/lib/dsa-oa-questions";
import { getDsaStatuses, type DsaProblemStatus } from "@/lib/dsa-storage";

function CompanyLogoImg({ company, size = 14 }: { company: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        style={{ width: size, height: size }}
        className="inline-flex items-center justify-center rounded-sm bg-violet-500/20 text-[9px] font-bold text-violet-200 shrink-0 uppercase"
      >
        {company.slice(0, 1)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getCompanyLogoUrl(company)}
      alt={`${company} logo`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-sm object-contain shrink-0 bg-white/95 p-[1px]"
      onError={() => setFailed(true)}
    />
  );
}

function CompanyLogoDropdown({
  value,
  onChange,
  companies,
  companyCounts,
}: {
  value: string;
  onChange: (company: string) => void;
  companies: string[];
  companyCounts: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full py-2 px-3 bg-black/40 border border-white/10 hover:border-violet-500/40 rounded-xl text-xs text-slate-200 flex items-center justify-between gap-2 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 truncate">
          {value === "all" ? (
            <span>All Companies ({companies.length})</span>
          ) : (
            <>
              <CompanyLogoImg company={value} size={15} />
              <span className="truncate font-medium">{value}</span>
              <span className="text-[10px] text-slate-400 font-mono">({companyCounts[value] || 0})</span>
            </>
          )}
        </span>
        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close company menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="absolute right-0 mt-1.5 w-full min-w-[230px] max-h-72 overflow-y-auto z-40 rounded-xl bg-[#0e1122] border border-white/15 shadow-2xl p-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onChange("all");
                setOpen(false);
              }}
              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                value === "all"
                  ? "bg-violet-500/20 text-violet-200 font-semibold"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <span>All Companies ({companies.length})</span>
            </button>
            {companies.map((comp) => (
              <button
                key={comp}
                type="button"
                onClick={() => {
                  onChange(comp);
                  setOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors ${
                  value === comp
                    ? "bg-violet-500/20 text-violet-200 font-semibold"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <CompanyLogoImg company={comp} size={15} />
                  <span className="truncate">{comp}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {companyCounts[comp] || 0}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type SortOption = "number_asc" | "number_desc" | "title_asc" | "difficulty_asc" | "difficulty_desc";

export default function DsaProblemsetPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("number_asc");
  const [problemStatuses, setProblemStatuses] = useState<Record<number, "solved" | "attempted">>({});

  // Load problem statuses from localStorage
  useEffect(() => {
    setProblemStatuses(getDsaStatuses());

    const handleStatusUpdate = () => {
      setProblemStatuses(getDsaStatuses());
    };

    window.addEventListener("copilot-dsa-status-updated", handleStatusUpdate);
    return () => {
      window.removeEventListener("copilot-dsa-status-updated", handleStatusUpdate);
    };
  }, []);

  // Calculate difficulty counts dynamically from the dataset
  const totalCount = DSA_OA_PROBLEMS.length;
  const easyCount = useMemo(() => DSA_OA_PROBLEMS.filter((p) => p.difficulty === "Easy").length, []);
  const mediumCount = useMemo(() => DSA_OA_PROBLEMS.filter((p) => p.difficulty === "Medium").length, []);
  const hardCount = useMemo(() => DSA_OA_PROBLEMS.filter((p) => p.difficulty === "Hard").length, []);

  // Extract unique sorted companies from dataset
  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    DSA_OA_PROBLEMS.forEach((p) => {
      p.companyTags.forEach((c) => set.add(c));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, []);

  // Solved & attempted counts
  const solvedCount = useMemo(() => {
    return Object.values(problemStatuses).filter((s) => s === "solved").length;
  }, [problemStatuses]);

  // Filtering and sorting
  const filteredAndSortedProblems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = DSA_OA_PROBLEMS.filter((p) => {
      // Search query filter (title, number, topic, companies)
      if (q) {
        const matchesNumber = p.number.toString().includes(q) || `#${p.number}`.includes(q);
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesTopic = p.topic.toLowerCase().includes(q);
        const matchesCompany = p.companyTags.some((c) => c.toLowerCase().includes(q));
        if (!matchesNumber && !matchesTitle && !matchesTopic && !matchesCompany) {
          return false;
        }
      }

      // Difficulty filter
      if (selectedDifficulty !== "all" && p.difficulty.toLowerCase() !== selectedDifficulty.toLowerCase()) {
        return false;
      }

      // Topic filter
      if (selectedTopic !== "all" && p.topic !== selectedTopic) {
        return false;
      }

      // Company filter
      if (selectedCompany !== "all" && !p.companyTags.includes(selectedCompany)) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "all") {
        const status: DsaProblemStatus = (problemStatuses[p.number] as DsaProblemStatus | undefined) || "unsolved";
        if (selectedStatus === "solved" && status !== "solved") return false;
        if (selectedStatus === "attempted" && status !== "attempted") return false;
        if (selectedStatus === "unsolved" && status !== "unsolved") return false;
      }

      return true;
    });

    // Sorting (Default: Ascending Problem Number)
    filtered.sort((a, b) => {
      if (sortBy === "number_asc") {
        return a.number - b.number;
      }
      if (sortBy === "number_desc") {
        return b.number - a.number;
      }
      if (sortBy === "title_asc") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "difficulty_asc") {
        const order = { Easy: 1, Medium: 2, Hard: 3 };
        return order[a.difficulty] - order[b.difficulty] || a.number - b.number;
      }
      if (sortBy === "difficulty_desc") {
        const order = { Easy: 1, Medium: 2, Hard: 3 };
        return order[b.difficulty] - order[a.difficulty] || a.number - b.number;
      }
      return a.number - b.number;
    });

    return filtered;
  }, [searchQuery, selectedDifficulty, selectedTopic, selectedCompany, selectedStatus, sortBy, problemStatuses]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedDifficulty !== "all" ||
    selectedTopic !== "all" ||
    selectedCompany !== "all" ||
    selectedStatus !== "all" ||
    sortBy !== "number_asc";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDifficulty("all");
    setSelectedTopic("all");
    setSelectedCompany("all");
    setSelectedStatus("all");
    setSortBy("number_asc");
  };

  const getStatus = (num: number): DsaProblemStatus => {
    return problemStatuses[num] || "unsolved";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── HEADER BAR ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[rgba(100,110,255,0.12)] gap-4">
        <div>
          <Link
            href="/interview"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mb-2 group font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Interview Modes</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/25">
              <Code2 className="w-6 h-6" />
            </div>
            <span>OA &amp; DSA Problemset</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Practice coding problems, sharpen your algorithms, and prepare for technical assessments.
          </p>
        </div>

        {/* Dynamic Metric Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="indigo" size="md">
            {totalCount} Problems
          </Badge>
          {easyCount > 0 && (
            <Badge variant="emerald" size="md">
              {easyCount} Easy
            </Badge>
          )}
          <Badge variant="amber" size="md">
            {mediumCount} Medium
          </Badge>
          <Badge variant="rose" size="md">
            {hardCount} Hard
          </Badge>
          {solvedCount > 0 && (
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 font-mono">
              <Check className="w-3.5 h-3.5" />
              <span>{solvedCount} / {totalCount} Solved</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── SEARCH & FILTERING TOOLBAR ──────────────────────────────────────── */}
      <Card className="p-4 bg-[#0B0D18] border-white/10 rounded-2xl shadow-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Bar */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, #number, topic, or company..."
              className="w-full pl-9 pr-8 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Difficulty Dropdown */}
          <div className="md:col-span-2">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Topic Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500 cursor-pointer truncate"
            >
              <option value="all">All Topics ({DSA_OA_TOPICS.length})</option>
              {DSA_OA_TOPICS.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </div>

          {/* Company Dropdown with Brand Logos */}
          <div className="md:col-span-3">
            <CompanyLogoDropdown
              value={selectedCompany}
              onChange={setSelectedCompany}
              companies={availableCompanies}
              companyCounts={DSA_OA_PROBLEMS.reduce<Record<string, number>>((acc, item) => {
                for (const tag of item.companyTags) {
                  acc[tag] = (acc[tag] || 0) + 1;
                }
                return acc;
              }, {})}
            />
          </div>
        </div>

        {/* Company Quick-Filter Strip with Brand Logos */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          <button
            type="button"
            onClick={() => setSelectedCompany("all")}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border whitespace-nowrap transition-colors shrink-0 ${
              selectedCompany === "all"
                ? "bg-violet-500/20 border-violet-400/50 text-violet-200"
                : "bg-black/30 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
            }`}
          >
            All ({DSA_OA_PROBLEMS.length})
          </button>
          {CORE_MAJOR_COMPANIES.filter((c) => availableCompanies.includes(c)).map((comp) => {
            const count = DSA_OA_PROBLEMS.filter((p) => p.companyTags.includes(comp)).length;
            const active = selectedCompany === comp;
            return (
              <button
                key={comp}
                type="button"
                onClick={() => setSelectedCompany(active ? "all" : comp)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border whitespace-nowrap flex items-center gap-1.5 transition-colors shrink-0 ${
                  active
                    ? "bg-violet-500/20 border-violet-400/50 text-violet-100"
                    : "bg-black/30 border-white/10 text-slate-300 hover:text-white hover:border-violet-400/30"
                }`}
              >
                <CompanyLogoImg company={comp} size={14} />
                <span>{comp}</span>
                <span className="text-[10px] font-mono text-slate-400">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Second Row: Status Filter, Sorting, Reset, and Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Quick Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Status:</span>
              <div className="flex items-center bg-black/40 border border-[rgba(100,110,255,0.12)] rounded-lg p-0.5">
                {(["all", "solved", "attempted", "unsolved"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStatus(st)}
                    className={clsx(
                      "px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-all",
                      selectedStatus === st
                        ? "bg-violet-600 text-white font-semibold"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Control */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-400 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="number_asc">Problem # (Ascending)</option>
                <option value="number_desc">Problem # (Descending)</option>
                <option value="title_asc">Title (A - Z)</option>
                <option value="difficulty_asc">Difficulty (Easy → Hard)</option>
                <option value="difficulty_desc">Difficulty (Hard → Easy)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-between sm:justify-end">
            <span className="text-slate-400 font-medium text-xs">
              Showing <strong className="text-white font-mono">{filteredAndSortedProblems.length}</strong> of {totalCount} problems
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* ─── LEETCODE-STYLE PROBLEMCARD / TABLE ───────────────────────────────── */}
      <Card className="overflow-hidden bg-[#080A14] border-white/10 rounded-2xl shadow-2xl p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[rgba(100,110,255,0.12)] bg-black/40 text-[11px] uppercase tracking-wider text-slate-400 font-semibold select-none">
                <th className="py-3 px-4 w-14 text-center">Status</th>
                <th className="py-3 px-4 min-w-[260px]">Problem</th>
                <th className="py-3 px-4 w-28">Difficulty</th>
                <th className="py-3 px-4 min-w-[180px]">Topic</th>
                <th className="py-3 px-4 min-w-[220px]">Companies</th>
                <th className="py-3 px-4 w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-sans">
              {filteredAndSortedProblems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Filter className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-sm font-semibold text-slate-300">No matching coding problems</p>
                      <p className="text-xs text-slate-500">Try adjusting your search terms or filters.</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleResetFilters}
                        icon={<RotateCcw className="w-3.5 h-3.5" />}
                        className="mt-2 text-xs"
                      >
                        Reset All Filters
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedProblems.map((p, idx) => {
                  const status = getStatus(p.number);
                  const isEven = idx % 2 === 0;

                  return (
                    <tr
                      key={p.id}
                      className={clsx(
                        "group transition-all duration-150 cursor-pointer",
                        isEven ? "bg-transparent" : "bg-white/[0.015]",
                        "hover:bg-violet-950/20 hover:border-l-2 hover:border-l-violet-500"
                      )}
                    >
                      {/* Status Column */}
                      <td className="py-3.5 px-4 text-center">
                        <Link href={`/interview/dsa/${p.number}`} className="inline-flex items-center justify-center">
                          {status === "solved" ? (
                            <span title="Solved">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </span>
                          ) : status === "attempted" ? (
                            <span title="Attempted">
                              <AlertCircle className="w-4 h-4 text-amber-400" />
                            </span>
                          ) : (
                            <span title="Unsolved">
                              <Circle className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                            </span>
                          )}
                        </Link>
                      </td>

                      {/* Problem Number & Title Column */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/interview/dsa/${p.number}`}
                          className="flex items-center gap-2 group-hover:text-violet-300 transition-colors"
                        >
                          <span className="font-mono text-slate-400 font-semibold group-hover:text-indigo-400 text-xs">
                            #{p.number}.
                          </span>
                          <span className="font-semibold text-slate-200 group-hover:text-white transition-colors">
                            {p.title}
                          </span>
                        </Link>
                      </td>

                      {/* Difficulty Column */}
                      <td className="py-3.5 px-4">
                        <Link href={`/interview/dsa/${p.number}`}>
                          <Badge
                            variant={
                              p.difficulty === "Easy"
                                ? "emerald"
                                : p.difficulty === "Medium"
                                ? "amber"
                                : "rose"
                            }
                            size="sm"
                          >
                            {p.difficulty}
                          </Badge>
                        </Link>
                      </td>

                      {/* Topic Column */}
                      <td className="py-3.5 px-4">
                        <Link href={`/interview/dsa/${p.number}`}>
                          <span className="text-slate-400 font-mono text-xs flex items-center gap-1.5">
                            <Tag className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{p.topic}</span>
                          </span>
                        </Link>
                      </td>

                      {/* Companies Column */}
                      <td className="py-3.5 px-4">
                        <Link href={`/interview/dsa/${p.number}`}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[...p.companyTags]
                              .sort((a, b) =>
                                a === selectedCompany ? -1 : b === selectedCompany ? 1 : 0
                              )
                              .slice(0, 3)
                              .map((comp) => (
                                <span
                                  key={comp}
                                  className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-[rgba(100,110,255,0.12)] group-hover:border-violet-500/20 group-hover:bg-violet-500/10 transition-colors"
                                >
                                  <CompanyLogoImg company={comp} size={13} />
                                  <span>{comp}</span>
                                </span>
                              ))}
                            {p.companyTags.length > 3 && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                +{p.companyTags.length - 3}
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Action Column */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/interview/dsa/${p.number}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors"
                        >
                          <span>Solve</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
