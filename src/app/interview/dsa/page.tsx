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
  DSA_OA_PROBLEMS,
  DSA_OA_TOPICS,
} from "@/lib/dsa-oa-questions";
import { getDsaStatuses, type DsaProblemStatus } from "@/lib/dsa-storage";

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
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#1D1D1D] gap-4">
        <div>
          <Link
            href="/interview"
            className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors mb-2 group font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Interview Modes</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#121212] text-[#A78BFA] border border-[#292929]">
              <Code2 className="w-6 h-6" />
            </div>
            <span>OA &amp; DSA Problemset</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1">
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
            <div className="px-2.5 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/25 text-[#10B981] text-xs font-semibold flex items-center gap-1.5 font-mono tabular-nums">
              <Check className="w-3.5 h-3.5" />
              <span>{solvedCount} / {totalCount} Solved</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── SEARCH & FILTERING TOOLBAR ──────────────────────────────────────── */}
      <Card className="p-4 bg-[#0D0D0D] border-[#1D1D1D] rounded-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Bar */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, #number, topic, or company..."
              className="w-full pl-9 pr-8 py-2 bg-[#080808] border border-[#1D1D1D] rounded-lg text-xs text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#292929] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#F5F5F5] cursor-pointer"
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
              className="w-full py-2 px-3 bg-[#080808] border border-[#1D1D1D] rounded-lg text-xs text-[#F5F5F5] focus:outline-none focus:border-[#292929] cursor-pointer"
            >
              <option value="all" className="bg-[#0D0D0D]">All Difficulties</option>
              <option value="easy" className="bg-[#0D0D0D]">Easy</option>
              <option value="medium" className="bg-[#0D0D0D]">Medium</option>
              <option value="hard" className="bg-[#0D0D0D]">Hard</option>
            </select>
          </div>

          {/* Topic Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full py-2 px-3 bg-[#080808] border border-[#1D1D1D] rounded-lg text-xs text-[#F5F5F5] focus:outline-none focus:border-[#292929] cursor-pointer truncate"
            >
              <option value="all" className="bg-[#0D0D0D]">All Topics ({DSA_OA_TOPICS.length})</option>
              {DSA_OA_TOPICS.map((topic) => (
                <option key={topic} value={topic} className="bg-[#0D0D0D]">
                  {topic}
                </option>
              ))}
            </select>
          </div>

          {/* Company Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full py-2 px-3 bg-[#080808] border border-[#1D1D1D] rounded-lg text-xs text-[#F5F5F5] focus:outline-none focus:border-[#292929] cursor-pointer truncate"
            >
              <option value="all" className="bg-[#0D0D0D]">All Companies ({availableCompanies.length})</option>
              {availableCompanies.map((comp) => (
                <option key={comp} value={comp} className="bg-[#0D0D0D]">
                  {comp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Second Row: Status Filter, Sorting, Reset, and Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#1D1D1D] text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Quick Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#71717A] font-medium">Status:</span>
              <div className="flex items-center bg-[#050505] border border-[#1D1D1D] rounded-lg p-0.5">
                {(["all", "solved", "attempted", "unsolved"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStatus(st)}
                    className={clsx(
                      "px-2.5 py-0.5 rounded text-[11px] font-medium capitalize transition-colors cursor-pointer",
                      selectedStatus === st
                        ? "bg-[#121212] text-[#F5F5F5] border border-[#292929] font-semibold"
                        : "text-[#71717A] hover:text-[#F5F5F5]"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Control */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#71717A]" />
              <span className="text-[#71717A] font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-[#080808] border border-[#1D1D1D] rounded-lg px-2 py-1 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#292929] cursor-pointer"
              >
                <option value="number_asc" className="bg-[#0D0D0D]">Problem # (Ascending)</option>
                <option value="number_desc" className="bg-[#0D0D0D]">Problem # (Descending)</option>
                <option value="title_asc" className="bg-[#0D0D0D]">Title (A - Z)</option>
                <option value="difficulty_asc" className="bg-[#0D0D0D]">Difficulty (Easy → Hard)</option>
                <option value="difficulty_desc" className="bg-[#0D0D0D]">Difficulty (Hard → Easy)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-between sm:justify-end">
            <span className="text-[#71717A] font-medium text-xs tabular-nums">
              Showing <strong className="text-[#F5F5F5] font-mono">{filteredAndSortedProblems.length}</strong> of {totalCount} problems
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-[#F5F5F5] hover:text-[#A1A1AA] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* ─── LEETCODE-STYLE PROBLEMCARD / TABLE ───────────────────────────────── */}
      <Card className="overflow-hidden bg-[#0D0D0D] border-[#1D1D1D] rounded-xl p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1D1D1D] bg-[#0A0A0A] text-[11px] uppercase tracking-wider text-[#71717A] font-semibold select-none">
                <th className="py-3 px-4 w-14 text-center">Status</th>
                <th className="py-3 px-4 min-w-[260px]">Problem</th>
                <th className="py-3 px-4 w-28">Difficulty</th>
                <th className="py-3 px-4 min-w-[180px]">Topic</th>
                <th className="py-3 px-4 min-w-[220px]">Companies</th>
                <th className="py-3 px-4 w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171717] text-xs font-sans">
              {filteredAndSortedProblems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#71717A]">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Filter className="w-8 h-8 text-[#52525B] mx-auto" />
                      <p className="text-sm font-semibold text-[#F5F5F5]">No matching coding problems</p>
                      <p className="text-xs text-[#71717A]">Try adjusting your search terms or filters.</p>
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
                        "group transition-colors cursor-pointer",
                        isEven ? "bg-transparent" : "bg-[#0A0A0A]/50",
                        "hover:bg-[#121212] hover:border-l-2 hover:border-l-[#A78BFA]"
                      )}
                    >
                      {/* Status Column */}
                      <td className="py-3.5 px-4 text-center">
                        <Link href={`/interview/dsa/${p.number}`} className="inline-flex items-center justify-center">
                          {status === "solved" ? (
                            <span title="Solved">
                              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                            </span>
                          ) : status === "attempted" ? (
                            <span title="Attempted">
                              <AlertCircle className="w-4 h-4 text-[#F59E0B]" />
                            </span>
                          ) : (
                            <span title="Unsolved">
                              <Circle className="w-3.5 h-3.5 text-[#3F3F46] group-hover:text-[#71717A] transition-colors" />
                            </span>
                          )}
                        </Link>
                      </td>

                      {/* Problem Number & Title Column */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/interview/dsa/${p.number}`}
                          className="flex items-center gap-2 transition-colors"
                        >
                          <span className="font-mono text-[#71717A] font-semibold group-hover:text-[#F5F5F5] text-xs tabular-nums">
                            #{p.number}.
                          </span>
                          <span className="font-semibold text-[#F5F5F5] transition-colors">
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
                          <span className="text-[#A1A1AA] font-mono text-xs flex items-center gap-1.5">
                            <Tag className="w-3 h-3 text-[#71717A] shrink-0" />
                            <span>{p.topic}</span>
                          </span>
                        </Link>
                      </td>

                      {/* Companies Column */}
                      <td className="py-3.5 px-4">
                        <Link href={`/interview/dsa/${p.number}`}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {p.companyTags.slice(0, 3).map((comp) => (
                              <span
                                key={comp}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#121212] text-[#A1A1AA] border border-[#1D1D1D] group-hover:border-[#292929] group-hover:text-[#F5F5F5] transition-colors"
                              >
                                {comp}
                              </span>
                            ))}
                            {p.companyTags.length > 3 && (
                              <span className="text-[10px] text-[#71717A] font-mono">
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
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#F5F5F5] group-hover:text-[#A1A1AA] transition-colors"
                        >
                          <span>Solve</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
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
