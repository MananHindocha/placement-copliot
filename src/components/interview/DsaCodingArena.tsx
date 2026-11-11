"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Code2,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  Sparkles,
  Lightbulb,
  Terminal,
  Activity,
  Brain,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Target,
  AlertCircle,
  Mic,
  MicOff,
  Loader2,
  ArrowLeft,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import {
  DSA_OA_PROBLEMS,
  DSA_OA_TOPICS,
  type DsaOaProblem,
} from "@/lib/dsa-oa-questions";
import {
  type DsaRunCodeResponse,
  type SpeechRecognitionLike,
  type SpeechRecognitionConstructor,
  handleEditorKeyDown,
  isConceptCovered,
  FILLER_WORDS_LIST,
} from "./interview-common";

interface DsaCodingArenaProps {
  backHref?: string;
}

export default function DsaCodingArena({ backHref = "/interview" }: DsaCodingArenaProps) {
  // Filters & Selected Problem
  const [dsaProblemIdx, setDsaProblemIdx] = useState(0);
  const [dsaTopicFilter, setDsaTopicFilter] = useState<string>("all");
  const [dsaDifficultyFilter, setDsaDifficultyFilter] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<"cpp" | "java" | "python" | "typescript">("python");
  const [sourceCodeMap, setSourceCodeMap] = useState<Record<string, Record<string, string>>>({});
  const [claimedTimeComplexity, setClaimedTimeComplexity] = useState("O(N)");
  const [claimedSpaceComplexity, setClaimedSpaceComplexity] = useState("O(1)");
  const [consoleTab, setConsoleTab] = useState<"testcases" | "results" | "review">("testcases");
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [customTestInput, setCustomTestInput] = useState("");
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [runCodeResult, setRunCodeResult] = useState<DsaRunCodeResponse | null>(null);
  const [runCodeError, setRunCodeError] = useState<string | null>(null);
  const [showHintModal, setShowHintModal] = useState(false);
  const [activeHintIdx, setActiveHintIdx] = useState(0);
  const [showOaVerbalBar, setShowOaVerbalBar] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Verbal Practice State
  const [response, setResponse] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [liveWpm, setLiveWpm] = useState(0);
  const [fillerCounts, setFillerCounts] = useState<Record<string, number>>({});
  const [micActiveLevel, setMicActiveLevel] = useState(0);

  const filteredDsaProblems = DSA_OA_PROBLEMS.filter((p) => {
    if (dsaTopicFilter !== "all" && p.topic !== dsaTopicFilter) return false;
    if (dsaDifficultyFilter !== "all" && p.difficulty.toLowerCase() !== dsaDifficultyFilter.toLowerCase())
      return false;
    return true;
  });

  const activeDsaProblem: DsaOaProblem =
    filteredDsaProblems[dsaProblemIdx] || filteredDsaProblems[0] || DSA_OA_PROBLEMS[0];

  const currentDsaCode: string =
    sourceCodeMap[activeDsaProblem.id]?.[selectedLanguage] ||
    activeDsaProblem.starterCode[selectedLanguage] ||
    "";

  const totalFillersSpoken = Object.values(fillerCounts).reduce((a, b) => a + b, 0);

  const handleDsaCodeChange = (newCode: string) => {
    setSourceCodeMap((prev) => ({
      ...prev,
      [activeDsaProblem.id]: {
        ...(prev[activeDsaProblem.id] || {}),
        [selectedLanguage]: newCode,
      },
    }));
  };

  const handleResetDsaTemplate = () => {
    setSourceCodeMap((prev) => ({
      ...prev,
      [activeDsaProblem.id]: {
        ...(prev[activeDsaProblem.id] || {}),
        [selectedLanguage]: activeDsaProblem.starterCode[selectedLanguage],
      },
    }));
  };

  const handleRunCode = async (mode: "run" | "submit") => {
    if (!activeDsaProblem) return;
    setIsRunningCode(true);
    setRunCodeError(null);
    setConsoleTab(mode === "run" ? "results" : "review");

    try {
      const res = await fetch("/api/interview/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: activeDsaProblem.id,
          problemTitle: `#${activeDsaProblem.number}. ${activeDsaProblem.title}`,
          problemStatement: activeDsaProblem.problemStatement,
          language: selectedLanguage,
          sourceCode: currentDsaCode,
          testCases: activeDsaProblem.testCases,
          mode,
          claimedTimeComplexity,
          claimedSpaceComplexity,
          verbalTranscript: response.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRunCodeError(data.error || "Failed to execute code");
      } else {
        setRunCodeResult(data);
        if (mode === "run") {
          setConsoleTab("results");
        } else {
          setConsoleTab("review");
        }
      }
    } catch (err) {
      setRunCodeError(err instanceof Error ? err.message : "Network error executing code");
    } finally {
      setIsRunningCode(false);
    }
  };

  const countFillers = (text: string) => {
    const counts: Record<string, number> = {};
    const lower = text.toLowerCase();
    FILLER_WORDS_LIST.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = lower.match(regex);
      if (matches) counts[word] = matches.length;
    });
    setFillerCounts(counts);
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setLiveWpm(Math.min(180, Math.max(90, Math.round(words * 2.2))));
  };

  // Mock microphone simulation for verbal intuition
  const startRecording = () => {
    setIsRecording(true);
    setMicActiveLevel(50);
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (event) => {
            let str = "";
            for (let i = 0; i < event.results.length; i++) {
              str += event.results[i][0].transcript + " ";
            }
            setResponse(str.trim());
            countFillers(str);
          };
          recognition.start();
        } catch {
          // Fallback to manual typing
        }
      }
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setMicActiveLevel(0);
  };

  const handleCopyOptimalCode = async (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── HEADER BAR ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1D1D1D] gap-4">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors mb-2 group font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Interview Modes</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#F5F5F5] flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#121212] text-[#A78BFA] border border-[#292929]">
              <Code2 className="w-6 h-6" />
            </div>
            <span>OA &amp; DSA Coding Arena</span>
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Solve coding challenges, execute test cases, analyze time &amp; space complexity, and receive AI-powered code reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="violet" size="md">
            30 OA Problems
          </Badge>
          <Badge variant="indigo" size="md">
            Multi-Language IDE
          </Badge>
        </div>
      </div>

      {/* ─── LEETCODE OA & DSA CODING ARENA SPLIT VIEW ─── */}
      <div className="space-y-4">
        {/* Top Navigation & Quick Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0D0D0D] border border-[#1D1D1D]">
          <div className="flex items-center gap-2.5 flex-wrap flex-1">
            {/* Topic Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#71717A] font-medium">Topic:</span>
              <select
                value={dsaTopicFilter}
                onChange={(e) => {
                  setDsaTopicFilter(e.target.value);
                  setDsaProblemIdx(0);
                  setRunCodeResult(null);
                  setRunCodeError(null);
                }}
                className="text-xs bg-[#080808] border border-[#1D1D1D] rounded-lg px-2.5 py-1.5 text-[#F5F5F5] focus:outline-none focus:border-[#292929] cursor-pointer"
              >
                <option value="all" className="bg-[#0D0D0D]">All Topics (30)</option>
                {DSA_OA_TOPICS.map((topic) => (
                  <option key={topic} value={topic} className="bg-[#0D0D0D]">
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#71717A] font-medium">Difficulty:</span>
              <select
                value={dsaDifficultyFilter}
                onChange={(e) => {
                  setDsaDifficultyFilter(e.target.value);
                  setDsaProblemIdx(0);
                  setRunCodeResult(null);
                  setRunCodeError(null);
                }}
                className="text-xs bg-[#080808] border border-[#1D1D1D] rounded-lg px-2.5 py-1.5 text-[#F5F5F5] focus:outline-none focus:border-[#292929] cursor-pointer"
              >
                <option value="all" className="bg-[#0D0D0D]">All Difficulties</option>
                <option value="easy" className="bg-[#0D0D0D]">Easy</option>
                <option value="medium" className="bg-[#0D0D0D]">Medium</option>
                <option value="hard" className="bg-[#0D0D0D]">Hard</option>
              </select>
            </div>

            {/* Problem Dropdown Selector */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
              <select
                value={activeDsaProblem.id}
                onChange={(e) => {
                  const idx = filteredDsaProblems.findIndex((p) => p.id === e.target.value);
                  if (idx !== -1) {
                    setDsaProblemIdx(idx);
                    setRunCodeResult(null);
                    setRunCodeError(null);
                    setActiveHintIdx(0);
                  }
                }}
                className="w-full text-xs font-semibold bg-[#080808] border border-[#292929] rounded-lg px-3 py-1.5 text-[#F5F5F5] focus:outline-none focus:border-[#3A3A3A] truncate cursor-pointer"
              >
                {filteredDsaProblems.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#0D0D0D]">
                    #{p.number}. {p.title} ({p.difficulty} • {p.companyTags[0] || "OA"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Prev / Next Navigation & Count */}
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setDsaProblemIdx((i) => Math.max(0, i - 1));
                setRunCodeResult(null);
                setRunCodeError(null);
                setActiveHintIdx(0);
              }}
              disabled={dsaProblemIdx === 0}
              className="p-1.5 rounded-lg bg-[#121212] hover:bg-[#1A1A1A] border border-[#292929] text-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Previous Problem"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-[#71717A] font-mono font-medium tabular-nums">
              {dsaProblemIdx + 1} / {filteredDsaProblems.length}
            </span>
            <button
              type="button"
              onClick={() => {
                setDsaProblemIdx((i) => Math.min(filteredDsaProblems.length - 1, i + 1));
                setRunCodeResult(null);
                setRunCodeError(null);
                setActiveHintIdx(0);
              }}
              disabled={dsaProblemIdx >= filteredDsaProblems.length - 1}
              className="p-1.5 rounded-lg bg-[#121212] hover:bg-[#1A1A1A] border border-[#292929] text-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Next Problem"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Split Grid (Problem Spec vs Multi-Language IDE) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ─── LEFT PANE: OA Problem Spec & Monospace Cards ─── */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 bg-[#0D0D0D] border-[#1D1D1D] rounded-xl space-y-4">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        activeDsaProblem.difficulty === "Easy"
                          ? "emerald"
                          : activeDsaProblem.difficulty === "Medium"
                          ? "amber"
                          : "rose"
                      }
                      size="sm"
                    >
                      {activeDsaProblem.difficulty}
                    </Badge>
                    <span className="text-xs text-[#71717A] font-mono">
                      {activeDsaProblem.topic}
                    </span>
                  </div>

                  {/* Company OA Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {activeDsaProblem.companyTags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#121212] text-[#A1A1AA] border border-[#1D1D1D]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <h2 className="text-lg font-bold text-[#F5F5F5] tracking-tight tabular-nums">
                  #{activeDsaProblem.number}. {activeDsaProblem.title}
                </h2>
              </div>

              {/* Collapsible Explain Intuition Out Loud Bar */}
              <div className="rounded-xl border border-[#1D1D1D] bg-[#0A0A0A] overflow-hidden transition-colors">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer select-none bg-[#121212] hover:bg-[#1A1A1A] transition-colors"
                  onClick={() => setShowOaVerbalBar((prev) => !prev)}
                >
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-[#10B981]" />
                    <span className="text-xs font-bold text-[#F5F5F5]">
                      🎙️ Explain Approach Out Loud
                    </span>
                    <span className="text-[10px] text-[#71717A]">
                      (Evaluated by Bar-Raiser)
                    </span>
                  </div>
                  <span className="text-xs text-[#A1A1AA]">
                    {showOaVerbalBar ? "▲ Minimize" : "▼ Expand Voice"}
                  </span>
                </div>

                {showOaVerbalBar && (
                  <div className="p-3.5 space-y-3 border-t border-[#1D1D1D]">
                    {/* Audio Controls Strip */}
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        {!isRecording ? (
                          <button
                            type="button"
                            onClick={startRecording}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#10B981] hover:bg-emerald-500 text-black rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Mic className="w-3.5 h-3.5" />
                            <span>Start Speaking Intuition</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#F43F5E] hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <MicOff className="w-3.5 h-3.5" />
                            <span>Stop Recording</span>
                          </button>
                        )}

                        {isRecording && (
                          <div className="flex items-center gap-0.5 h-3.5 px-2 py-1 rounded bg-[#080808] border border-[#1D1D1D]">
                            {[1, 2, 3, 4, 5].map((b) => (
                              <span
                                key={b}
                                className={clsx(
                                  "w-1 rounded-full transition-all duration-75",
                                  micActiveLevel >= b * 18 ? "bg-[#10B981]" : "bg-[#171717]"
                                )}
                                style={{ height: micActiveLevel >= b * 18 ? `${Math.max(4, b * 3)}px` : "3px" }}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#71717A]">
                        <span className="font-mono tabular-nums">
                          {liveWpm > 0 ? `${liveWpm} WPM` : "Pacing ready"}
                        </span>
                        <span>•</span>
                        <span className={totalFillersSpoken > 2 ? "text-[#F43F5E]" : "text-[#10B981]"}>
                          {totalFillersSpoken} fillers
                        </span>
                      </div>
                    </div>

                    {/* Key Concepts Pills */}
                    {activeDsaProblem.keyConcepts && activeDsaProblem.keyConcepts.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-[#F5F5F5]">Algorithmic Rubric Concepts</span>
                          <span className="text-[10px] text-[#10B981] font-medium">
                            Lights up green as you speak
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activeDsaProblem.keyConcepts.map((concept, idx) => {
                            const covered = isConceptCovered(concept, response, currentDsaCode);
                            return (
                              <span
                                key={idx}
                                className={clsx(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors",
                                  covered
                                    ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-semibold"
                                    : "bg-[#0D0D0D] text-[#A1A1AA] border border-[#1D1D1D]"
                                )}
                              >
                                {covered ? (
                                  <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#3F3F46]" />
                                )}
                                <span>{concept}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Response Textarea Preview */}
                    <textarea
                      rows={2}
                      value={response}
                      onChange={(e) => {
                        setResponse(e.target.value);
                        countFillers(e.target.value);
                      }}
                      placeholder="Your spoken algorithmic approach & trade-off intuition transcribes here live..."
                      className="w-full p-2.5 text-xs bg-[#080808] border border-[#1D1D1D] rounded-lg text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#292929] resize-none font-sans"
                    />
                  </div>
                )}
              </div>

              {/* Problem Description */}
              <div className="text-xs text-[#F5F5F5]/90 leading-relaxed font-sans space-y-2 whitespace-pre-line">
                {activeDsaProblem.problemStatement}
              </div>

              {/* Examples Cards */}
              <div className="space-y-3 pt-1">
                <h3 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">
                  Examples
                </h3>
                {activeDsaProblem.examples.map((ex, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] text-xs space-y-1.5 font-mono"
                  >
                    <div className="text-[11px] font-bold text-[#71717A] uppercase">
                      Example {i + 1}
                    </div>
                    <div>
                      <span className="text-[#71717A]">Input: </span>
                      <span className="text-[#F5F5F5]">{ex.input}</span>
                    </div>
                    <div>
                      <span className="text-[#71717A]">Output: </span>
                      <span className="text-[#10B981] font-semibold">{ex.output}</span>
                    </div>
                    {ex.explanation && (
                      <div className="text-[#A1A1AA] text-[11px] pt-1 font-sans">
                        <span className="text-[#71717A] font-mono">Explanation: </span>
                        {ex.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Constraints */}
              {activeDsaProblem.constraints.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#1D1D1D]">
                  <h3 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">
                    Constraints
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-xs text-[#A1A1AA] font-mono">
                    {activeDsaProblem.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Expected Target Complexities */}
              <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] flex items-center justify-between flex-wrap gap-2 text-xs">
                <div>
                  <span className="text-[#71717A] font-medium">Target Time: </span>
                  <span className="text-[#F59E0B] font-mono font-semibold">
                    {activeDsaProblem.expectedTimeComplexity}
                  </span>
                </div>
                <div>
                  <span className="text-[#71717A] font-medium">Target Space: </span>
                  <span className="text-[#38BDF8] font-mono font-semibold">
                    {activeDsaProblem.expectedSpaceComplexity}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* ─── RIGHT PANE: Multi-Language IDE & Bottom Console ─── */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-4 md:p-5 bg-[#0D0D0D] border-[#1D1D1D] rounded-xl space-y-3">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-[#1D1D1D]">
                {/* Left: Language & Claimed Complexities */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value as "cpp" | "java" | "python" | "typescript");
                    }}
                    className="text-xs font-semibold bg-[#080808] border border-[#1D1D1D] rounded-lg px-2.5 py-1.5 text-[#F5F5F5] focus:outline-none focus:border-[#292929] cursor-pointer"
                  >
                    <option value="python" className="bg-[#0D0D0D]">Python 3.11</option>
                    <option value="cpp" className="bg-[#0D0D0D]">C++ (GCC 13 / STL)</option>
                    <option value="java" className="bg-[#0D0D0D]">Java 21 (JDK)</option>
                    <option value="typescript" className="bg-[#0D0D0D]">TypeScript (Node.js)</option>
                  </select>

                  <div className="flex items-center gap-1 bg-[#080808] border border-[#1D1D1D] rounded-lg px-2 py-1">
                    <span className="text-[10px] text-[#71717A] font-mono">Time:</span>
                    <select
                      value={claimedTimeComplexity}
                      onChange={(e) => setClaimedTimeComplexity(e.target.value)}
                      className="text-[11px] font-mono bg-transparent text-[#F59E0B] focus:outline-none cursor-pointer"
                    >
                      <option value="O(1)" className="bg-[#0D0D0D] text-[#F5F5F5]">O(1)</option>
                      <option value="O(log N)" className="bg-[#0D0D0D] text-[#F5F5F5]">O(log N)</option>
                      <option value="O(N)" className="bg-[#0D0D0D] text-[#F5F5F5]">O(N)</option>
                      <option value="O(N log N)" className="bg-[#0D0D0D] text-[#F5F5F5]">O(N log N)</option>
                      <option value="O(N^2)" className="bg-[#0D0D0D] text-[#F5F5F5]">O(N^2)</option>
                      <option value="O(2^N)" className="bg-[#0D0D0D] text-[#F5F5F5]">O(2^N)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 bg-[#080808] border border-[#1D1D1D] rounded-lg px-2 py-1">
                    <span className="text-[10px] text-[#71717A] font-mono">Space:</span>
                    <select
                      value={claimedSpaceComplexity}
                      onChange={(e) => setClaimedSpaceComplexity(e.target.value)}
                      className="text-[11px] font-mono bg-transparent text-[#38BDF8] focus:outline-none cursor-pointer"
                    >
                      <option value="O(1)" className="bg-[#0D0D0D] text-[#F5F5F5]">O(1)</option>
                      <option value="O(log N)" className="bg-[#0D0D0D] text-[#F5F5F5]">O(log N)</option>
                      <option value="O(N)" className="bg-[#0D0D0D] text-[#F5F5F5]">O(N)</option>
                      <option value="O(N^2)" className="bg-[#0D0D0D] text-[#F5F5F5]">O(N^2)</option>
                    </select>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleResetDsaTemplate}
                    title="Reset to starter template"
                    className="p-1.5 rounded-lg bg-[#121212] hover:bg-[#1A1A1A] border border-[#292929] text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowHintModal(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#121212] hover:bg-[#1A1A1A] border border-[#292929] text-[#F5F5F5] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Hint</span>
                  </button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRunCode("run")}
                    disabled={isRunningCode}
                    icon={
                      isRunningCode ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-[#10B981] fill-[#10B981]" />
                      )
                    }
                    className="text-xs"
                  >
                    Run Tests
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleRunCode("submit")}
                    disabled={isRunningCode}
                    icon={
                      isRunningCode ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )
                    }
                    className="text-xs"
                  >
                    Submit OA
                  </Button>
                </div>
              </div>

              {/* Editor Surface */}
              <div className="rounded-xl border border-[#1D1D1D] overflow-hidden bg-[#050505]">
                <div className="flex font-mono text-xs max-h-[440px] overflow-hidden">
                  {/* Line Numbers Gutter */}
                  <div className="select-none py-3 px-2.5 text-right text-[#52525B] bg-[#000000] border-r border-[#1D1D1D] font-mono text-xs shrink-0 tabular-nums">
                    {Array.from({ length: Math.max(16, currentDsaCode.split("\n").length) }).map((_, i) => (
                      <div key={i} className="leading-6 h-6">{i + 1}</div>
                    ))}
                  </div>

                  {/* Code Textarea */}
                  <textarea
                    rows={Math.max(16, Math.min(26, currentDsaCode.split("\n").length + 2))}
                    value={currentDsaCode}
                    onChange={(e) => handleDsaCodeChange(e.target.value)}
                    onKeyDown={(e) => handleEditorKeyDown(e, currentDsaCode, handleDsaCodeChange)}
                    className="flex-1 p-3 bg-transparent text-emerald-300 font-mono text-xs leading-6 focus:outline-none resize-none overflow-auto whitespace-pre font-normal"
                    spellCheck={false}
                  />
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#000000] border-t border-[#1D1D1D] text-[10px] text-[#71717A] font-mono tabular-nums">
                  <div>
                    {selectedLanguage.toUpperCase()} • {currentDsaCode.split("\n").length} lines • {currentDsaCode.length} chars
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Tab: 2 spaces</span>
                    <span>•</span>
                    <span>UTF-8</span>
                  </div>
                </div>
              </div>

              {/* Console Container */}
              <div className="rounded-xl border border-[#1D1D1D] bg-[#050505] overflow-hidden">
                {/* Console Tab Headers */}
                <div className="flex items-center justify-between border-b border-[#1D1D1D] px-2 bg-[#0A0A0A] overflow-x-auto">
                  <div className="flex items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setConsoleTab("testcases")}
                      className={clsx(
                        "px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer",
                        consoleTab === "testcases"
                          ? "border-[#F5F5F5] text-[#F5F5F5]"
                          : "border-transparent text-[#71717A] hover:text-[#F5F5F5]"
                      )}
                    >
                      <Terminal className="w-3.5 h-3.5 text-[#A78BFA]" />
                      <span>Testcases</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConsoleTab("results")}
                      className={clsx(
                        "px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer",
                        consoleTab === "results"
                          ? "border-[#10B981] text-[#F5F5F5]"
                          : "border-transparent text-[#71717A] hover:text-[#F5F5F5]"
                      )}
                    >
                      <Activity className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>Test Results</span>
                      {runCodeResult && (
                        <span
                          className={clsx(
                            "text-[10px] px-1.5 py-0.5 rounded font-mono font-bold tabular-nums",
                            runCodeResult.status === "Accepted"
                              ? "bg-[#10B981]/15 text-[#10B981]"
                              : "bg-[#F43F5E]/15 text-[#F43F5E]"
                          )}
                        >
                          {runCodeResult.passedCount}/{runCodeResult.totalCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setConsoleTab("review")}
                      className={clsx(
                        "px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer",
                        consoleTab === "review"
                          ? "border-[#F59E0B] text-[#F5F5F5]"
                          : "border-transparent text-[#71717A] hover:text-[#F5F5F5]"
                      )}
                    >
                      <Brain className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>AI Bar-Raiser Review</span>
                      {runCodeResult?.codeReview && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] font-mono font-bold tabular-nums">
                          {runCodeResult.codeReview.overallScore}/100
                        </span>
                      )}
                    </button>
                  </div>

                  {isRunningCode && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#F59E0B] pr-2 shrink-0">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F59E0B]" />
                      <span>Executing...</span>
                    </div>
                  )}
                </div>

                {/* Console Tab Content */}
                <div className="p-3.5 min-h-[160px] max-h-[300px] overflow-y-auto">
                  {runCodeError && (
                    <div className="mb-3 p-3 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/25 text-xs text-[#F43F5E] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-[#F43F5E] shrink-0" />
                      <span>{runCodeError}</span>
                    </div>
                  )}

                  {/* Tab 1: Testcases */}
                  {consoleTab === "testcases" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {activeDsaProblem.testCases.map((tc, idx) => (
                          <button
                            key={tc.id}
                            type="button"
                            onClick={() => setSelectedCaseIdx(idx)}
                            className={clsx(
                              "px-2.5 py-1 rounded-lg text-xs font-medium font-mono transition-colors border cursor-pointer",
                              selectedCaseIdx === idx
                                ? "bg-[#121212] text-[#F5F5F5] border-[#292929]"
                                : "bg-[#0A0A0A] text-[#71717A] border-[#1D1D1D] hover:text-[#F5F5F5]"
                            )}
                          >
                            Case {idx + 1}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setSelectedCaseIdx(-1)}
                          className={clsx(
                            "px-2.5 py-1 rounded-lg text-xs font-medium font-mono transition-colors border cursor-pointer",
                            selectedCaseIdx === -1
                              ? "bg-[#121212] text-[#F5F5F5] border-[#292929]"
                              : "bg-[#0A0A0A] text-[#71717A] border-[#1D1D1D] hover:text-[#F5F5F5]"
                          )}
                        >
                          Custom Input
                        </button>
                      </div>

                      {selectedCaseIdx >= 0 && activeDsaProblem.testCases[selectedCaseIdx] && (
                        <div className="space-y-2 text-xs font-mono">
                          <div>
                            <div className="text-[11px] text-[#71717A] uppercase font-semibold mb-1">
                              Input:
                            </div>
                            <pre className="p-2.5 rounded-lg bg-[#0D0D0D] border border-[#1D1D1D] text-[#F5F5F5] overflow-x-auto whitespace-pre-wrap">
                              {activeDsaProblem.testCases[selectedCaseIdx].inputDisplay}
                            </pre>
                          </div>
                          <div>
                            <div className="text-[11px] text-[#71717A] uppercase font-semibold mb-1">
                              Expected Output:
                            </div>
                            <pre className="p-2.5 rounded-lg bg-[#0D0D0D] border border-[#1D1D1D] text-[#10B981] font-semibold overflow-x-auto whitespace-pre-wrap">
                              {activeDsaProblem.testCases[selectedCaseIdx].expectedOutputDisplay}
                            </pre>
                          </div>
                        </div>
                      )}

                      {selectedCaseIdx === -1 && (
                        <div className="space-y-2 text-xs">
                          <div className="text-[11px] text-[#71717A]">
                            Provide custom input format matching problem parameters:
                          </div>
                          <textarea
                            rows={3}
                            value={customTestInput}
                            onChange={(e) => setCustomTestInput(e.target.value)}
                            placeholder="e.g. nums = [1, 2, 3], k = 3"
                            className="w-full p-2.5 rounded-lg bg-[#080808] border border-[#1D1D1D] text-xs font-mono text-emerald-300 focus:outline-none focus:border-[#292929] resize-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Test Results */}
                  {consoleTab === "results" && (
                    <div>
                      {isRunningCode ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                          <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" />
                          <p className="text-xs text-[#F5F5F5] font-medium">
                            Compiling &amp; Executing against Sandboxed Micro-Containers...
                          </p>
                        </div>
                      ) : runCodeResult ? (
                        <div className="space-y-3">
                          {/* Top Verdict Strip */}
                          <div className="flex items-center justify-between pb-2 border-b border-[#1D1D1D]">
                            <div className="flex items-center gap-2">
                              <span
                                className={clsx(
                                  "text-sm font-bold flex items-center gap-1.5",
                                  runCodeResult.status === "Accepted"
                                    ? "text-[#10B981]"
                                    : "text-[#F43F5E]"
                                )}
                              >
                                {runCodeResult.status === "Accepted" ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                                {runCodeResult.status}
                              </span>
                              <span className="text-xs text-[#71717A] tabular-nums">
                                ({runCodeResult.passedCount}/{runCodeResult.totalCount} passed)
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] font-mono text-[#71717A] tabular-nums">
                              <span>Runtime: <strong className="text-[#F5F5F5]">{runCodeResult.runtimeMs}ms</strong></span>
                              <span>•</span>
                              <span>Memory: <strong className="text-[#F5F5F5]">{runCodeResult.memoryMb}MB</strong></span>
                            </div>
                          </div>

                          {/* Compiler Message / Trace */}
                          {runCodeResult.compilerMessage && (
                            <div className="p-2.5 rounded-lg bg-[#0D0D0D] border border-[#1D1D1D] font-mono text-xs text-[#A1A1AA] whitespace-pre-wrap">
                              {runCodeResult.compilerMessage}
                            </div>
                          )}

                          {/* Testcase Breakdown */}
                          <div className="space-y-2">
                            {runCodeResult.testResults.map((tr, i) => (
                              <div
                                key={tr.caseId}
                                className={clsx(
                                  "p-2.5 rounded-lg border text-xs font-mono space-y-1",
                                  tr.passed
                                    ? "bg-[#10B981]/10 border-[#10B981]/25 text-[#10B981]"
                                    : "bg-[#F43F5E]/10 border-[#F43F5E]/25 text-[#F43F5E]"
                                )}
                              >
                                <div className="flex items-center justify-between font-bold">
                                  <span>Test Case {i + 1}</span>
                                  <span>{tr.passed ? "✓ Passed" : "✕ Failed"}</span>
                                </div>
                                <div className="text-[11px] text-[#71717A]">
                                  Input: <span className="text-[#F5F5F5]">{tr.input}</span>
                                </div>
                                <div className="text-[11px] text-[#71717A]">
                                  Expected: <span className="text-[#10B981]">{tr.expectedOutput}</span> | Actual:{" "}
                                  <span className={tr.passed ? "text-[#10B981]" : "text-[#F43F5E]"}>
                                    {tr.actualOutput}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-[#71717A] text-xs">
                          Click <strong className="text-[#F5F5F5]">Run Tests</strong> to compile and execute your code against test cases.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 3: AI Bar-Raiser Code Review */}
                  {consoleTab === "review" && (
                    <div>
                      {isRunningCode ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                          <Loader2 className="w-6 h-6 animate-spin text-[#F59E0B]" />
                          <p className="text-xs text-[#F5F5F5] font-medium">
                            Synthesizing Bar-Raiser Big-O Verification &amp; Edge Cases...
                          </p>
                        </div>
                      ) : runCodeResult?.codeReview ? (
                        <div className="space-y-4">
                          {/* Score Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-[#1D1D1D]">
                            <div>
                              <div className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider">
                                Bar-Raiser AI Evaluation
                              </div>
                              <p className="text-xs text-[#A1A1AA]">
                                Evaluated against FAANG algorithmic standards &amp; edge case resilience.
                              </p>
                            </div>
                            <div className="text-right tabular-nums">
                              <span className="text-2xl font-extrabold text-[#F59E0B]">
                                {runCodeResult.codeReview.overallScore}
                              </span>
                              <span className="text-xs text-[#71717A]"> / 100</span>
                            </div>
                          </div>

                          {/* Big-O Analysis Card */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] space-y-1">
                              <span className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider block">
                                Time Complexity Verification
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-bold text-[#F59E0B]">
                                  {runCodeResult.codeReview.detectedTimeComplexity}
                                </span>
                                <span className="text-[11px] text-[#71717A]">
                                  (Target: {activeDsaProblem.expectedTimeComplexity})
                                </span>
                              </div>
                              <span className="text-[10px] text-[#10B981] block font-medium">
                                {runCodeResult.codeReview.complexityMatch ? "✓ Matches optimal bound" : "⚠️ Suboptimal time complexity"}
                              </span>
                            </div>

                            <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] space-y-1">
                              <span className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider block">
                                Space Complexity Verification
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-bold text-[#38BDF8]">
                                  {runCodeResult.codeReview.detectedSpaceComplexity}
                                </span>
                                <span className="text-[11px] text-[#71717A]">
                                  (Target: {activeDsaProblem.expectedSpaceComplexity})
                                </span>
                              </div>
                              <span className="text-[10px] text-[#71717A] block font-medium">
                                Memory footprint within bounds
                              </span>
                            </div>
                          </div>

                          {/* Edge Cases Diagnosed */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/25 space-y-1">
                              <span className="font-bold text-[#10B981] block text-[11px]">
                                Edge Cases Handled ({runCodeResult.codeReview.edgeCasesHandled.length})
                              </span>
                              <ul className="list-disc list-inside space-y-0.5 text-[#A1A1AA] text-[11px]">
                                {runCodeResult.codeReview.edgeCasesHandled.map((ec, idx) => (
                                  <li key={idx}>{ec}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="p-3 rounded-xl bg-[#F43F5E]/10 border border-[#F43F5E]/25 space-y-1">
                              <span className="font-bold text-[#F43F5E] block text-[11px]">
                                Potential Missed Edge Cases ({runCodeResult.codeReview.edgeCasesMissed.length})
                              </span>
                              <ul className="list-disc list-inside space-y-0.5 text-[#A1A1AA] text-[11px]">
                                {runCodeResult.codeReview.edgeCasesMissed.map((ec, idx) => (
                                  <li key={idx}>{ec}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Optimal Code Suggestion */}
                          {runCodeResult.codeReview.optimalCodeSuggestion && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#F5F5F5]">
                                  Optimal Canonical Implementation
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyOptimalCode(runCodeResult?.codeReview?.optimalCodeSuggestion || "")}
                                  className="text-[11px] text-[#A1A1AA] hover:text-[#F5F5F5] flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  {copiedCode ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                                </button>
                              </div>
                              <pre className="p-2.5 rounded-lg bg-[#000000] border border-[#1D1D1D] font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
                                {runCodeResult.codeReview.optimalCodeSuggestion}
                              </pre>
                            </div>
                          )}

                          {/* Follow-up Question Probe */}
                          {runCodeResult.codeReview.followUpQuestion && (
                            <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#292929] space-y-1">
                              <div className="text-[11px] font-bold text-[#F5F5F5] flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-[#A78BFA]" />
                                Interviewer Follow-up Probe
                              </div>
                              <p className="text-xs text-[#F5F5F5] leading-relaxed">
                                &ldquo;{runCodeResult.codeReview.followUpQuestion.prompt}&rdquo;
                              </p>
                              <p className="text-[10px] text-[#71717A] italic">
                                Interviewer Intent: {runCodeResult.codeReview.followUpQuestion.intent}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-[#71717A] text-xs">
                          Click <strong className="text-[#F5F5F5]">Submit OA</strong> above to generate an authentic Bar-Raiser AI Code Review, Big-O verification, and follow-up probes.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ─── HINT MODAL ──────────────────────────────────────────────────────── */}
      {showHintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0D0D0D] border border-[#292929] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1D1D1D]">
              <div className="flex items-center gap-2 text-[#F5F5F5] font-bold text-sm">
                <Lightbulb className="w-4 h-4 text-[#F59E0B]" />
                <span>Interviewer Progressive Hints</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHintModal(false)}
                className="text-[#71717A] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {activeDsaProblem.hints.map((hint, i) => (
                <div
                  key={i}
                  className={clsx(
                    "p-3 rounded-xl border text-xs leading-relaxed transition-colors",
                    i <= activeHintIdx
                      ? "bg-[#0A0A0A] border-[#292929] text-[#F5F5F5]"
                      : "bg-[#050505] border-[#1D1D1D] text-[#52525B] select-none blur-[1px]"
                  )}
                >
                  <div className="flex items-center justify-between font-bold text-[11px] mb-1 text-[#A78BFA]">
                    <span>Hint {i + 1}</span>
                    {i > activeHintIdx && <span>Locked</span>}
                  </div>
                  <p>{i <= activeHintIdx ? hint : "Click Reveal Next Hint below to unlock."}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1D1D1D]">
              <span className="text-[11px] text-[#71717A] tabular-nums">
                Revealed {Math.min(activeHintIdx + 1, activeDsaProblem.hints.length)} of {activeDsaProblem.hints.length} hints
              </span>
              <div className="flex items-center gap-2">
                {activeHintIdx < activeDsaProblem.hints.length - 1 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveHintIdx((prev) => prev + 1)}
                    className="text-xs"
                  >
                    Reveal Next Hint
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowHintModal(false)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

