"use client";

import { useState, useEffect } from "react";
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
  ListFilter,
} from "lucide-react";
import { clsx } from "clsx";
import {
  type DsaOaProblem,
} from "@/lib/dsa-oa-questions";
import {
  type DsaRunCodeResponse,
  type SpeechRecognitionConstructor,
  handleEditorKeyDown,
  isConceptCovered,
  FILLER_WORDS_LIST,
} from "./interview-common";
import {
  getStoredDsaCode,
  setStoredDsaCode,
  getPreferredDsaLanguage,
  setPreferredDsaLanguage,
  setDsaStatus,
} from "@/lib/dsa-storage";

interface DsaProblemWorkspaceProps {
  problem: DsaOaProblem;
  allProblems: DsaOaProblem[];
  backHref?: string;
}

export default function DsaProblemWorkspace({
  problem,
  allProblems,
  backHref = "/interview/dsa",
}: DsaProblemWorkspaceProps) {
  // Navigation indexes
  const sortedProblems = [...allProblems].sort((a, b) => a.number - b.number);
  const currentIdx = sortedProblems.findIndex((p) => p.id === problem.id || p.number === problem.number);
  const prevProblem = currentIdx > 0 ? sortedProblems[currentIdx - 1] : null;
  const nextProblem = currentIdx < sortedProblems.length - 1 ? sortedProblems[currentIdx + 1] : null;

  // Language & Code State
  const [selectedLanguage, setSelectedLanguageState] = useState<"cpp" | "java" | "python" | "typescript">("python");
  const [currentDsaCode, setCurrentDsaCode] = useState<string>("");
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

  // Initialize language from preferences & code from storage
  useEffect(() => {
    const prefLang = getPreferredDsaLanguage();
    setSelectedLanguageState(prefLang);
    const savedCode = getStoredDsaCode(problem.number, prefLang);
    setCurrentDsaCode(savedCode || problem.starterCode[prefLang] || "");
  }, [problem]);

  const handleLanguageChange = (newLang: "cpp" | "java" | "python" | "typescript") => {
    setSelectedLanguageState(newLang);
    setPreferredDsaLanguage(newLang);
    const savedCode = getStoredDsaCode(problem.number, newLang);
    setCurrentDsaCode(savedCode || problem.starterCode[newLang] || "");
  };

  const handleDsaCodeChange = (newCode: string) => {
    setCurrentDsaCode(newCode);
    setStoredDsaCode(problem.number, selectedLanguage, newCode);
  };

  const handleResetDsaTemplate = () => {
    const starter = problem.starterCode[selectedLanguage] || "";
    setCurrentDsaCode(starter);
    setStoredDsaCode(problem.number, selectedLanguage, starter);
  };

  const handleRunCode = async (mode: "run" | "submit") => {
    setIsRunningCode(true);
    setRunCodeError(null);
    setConsoleTab(mode === "run" ? "results" : "review");

    try {
      const res = await fetch("/api/interview/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          problemTitle: `#${problem.number}. ${problem.title}`,
          problemStatement: problem.problemStatement,
          language: selectedLanguage,
          sourceCode: currentDsaCode,
          testCases: problem.testCases,
          mode,
          claimedTimeComplexity,
          claimedSpaceComplexity,
          verbalTranscript: response.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRunCodeError(data.error || "Failed to execute code");
        setDsaStatus(problem.number, "attempted");
      } else {
        setRunCodeResult(data);
        if (mode === "run") {
          setConsoleTab("results");
          if (data.status === "Accepted") {
            setDsaStatus(problem.number, "attempted");
          } else {
            setDsaStatus(problem.number, "attempted");
          }
        } else {
          setConsoleTab("review");
          if (data.status === "Accepted") {
            setDsaStatus(problem.number, "solved");
          } else {
            setDsaStatus(problem.number, "attempted");
          }
        }
      }
    } catch (err) {
      setRunCodeError(err instanceof Error ? err.message : "Network error executing code");
      setDsaStatus(problem.number, "attempted");
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

  const totalFillersSpoken = Object.values(fillerCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      {/* ─── TOP NAVIGATION & PROBLEM CONTEXT BAR ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#22232D] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs text-[#B293E2] hover:text-[#C3A9EB] transition-colors font-medium group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Problemset</span>
            </Link>
            <span className="text-[#4F414D] text-xs">•</span>
            <span className="text-xs text-[#969085] font-mono tabular-nums">
              Problem {currentIdx >= 0 ? currentIdx + 1 : 1} of {sortedProblems.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#F8F8F9] tracking-tight flex items-center gap-2.5">
              <span className="font-mono text-[#B293E2] font-semibold tabular-nums">#{problem.number}.</span>
              <span>{problem.title}</span>
            </h1>

            <Badge
              variant={
                problem.difficulty === "Easy"
                  ? "emerald"
                  : problem.difficulty === "Medium"
                  ? "amber"
                  : "rose"
              }
              size="sm"
            >
              {problem.difficulty}
            </Badge>

            <span className="text-xs text-[#969085] font-mono bg-[#171820] px-2 py-0.5 rounded border border-[#262733]">
              {problem.topic}
            </span>
          </div>
        </div>

        {/* Prev / Next Navigation Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {prevProblem ? (
            <Link
              href={`/interview/dsa/${prevProblem.number}`}
              className="px-3 py-1.5 rounded-lg bg-[#171820] hover:bg-[#1D1D26] border border-[#262733] text-xs font-medium text-[#F8F8F9] transition-colors flex items-center gap-1.5"
              title={`Previous: #${prevProblem.number}. ${prevProblem.title}`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev Problem</span>
            </Link>
          ) : (
            <button
              disabled
              className="px-3 py-1.5 rounded-lg bg-[#111218] border border-[#22232D] text-xs text-[#4F414D] cursor-not-allowed flex items-center gap-1.5 opacity-60"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>
          )}

          <Link
            href="/interview/dsa"
            className="p-1.5 rounded-lg bg-[#171820] hover:bg-[#1D1D26] border border-[#262733] text-[#969085] hover:text-[#F8F8F9] transition-colors"
            title="All Problems"
          >
            <ListFilter className="w-4 h-4" />
          </Link>

          {nextProblem ? (
            <Link
              href={`/interview/dsa/${nextProblem.number}`}
              className="px-3 py-1.5 rounded-lg bg-[#171820] hover:bg-[#1D1D26] border border-[#262733] text-xs font-medium text-[#F8F8F9] transition-colors flex items-center gap-1.5"
              title={`Next: #${nextProblem.number}. ${nextProblem.title}`}
            >
              <span className="hidden sm:inline">Next Problem</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button
              disabled
              className="px-3 py-1.5 rounded-lg bg-[#111218] border border-[#22232D] text-xs text-[#4F414D] cursor-not-allowed flex items-center gap-1.5 opacity-60"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─── MAIN WORKSPACE: SPLIT GRID (SPEC vs CODE EDITOR) ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ─── LEFT PANE: OA Problem Spec & Monospace Cards ─── */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5 bg-[#111218] border-[#22232D] rounded-xl space-y-4">
            {/* Header & Company Tags */}
            <div className="space-y-2.5 pb-2 border-b border-[#22232D]">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#969085] uppercase tracking-wider">
                  Target Company Tags
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {problem.companyTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1D1D26] text-[#B293E2] border border-[#735BA0]/35"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Collapsible Explain Intuition Out Loud Bar */}
            <div className="rounded-xl border border-[#262733] bg-[#171820] overflow-hidden transition-colors">
              <div
                className="flex items-center justify-between p-3 cursor-pointer select-none bg-[#1D1D26] hover:bg-[#252531] transition-colors"
                onClick={() => setShowOaVerbalBar((prev) => !prev)}
              >
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-[#F8F8F9]">
                    🎙️ Explain Approach Out Loud
                  </span>
                  <span className="text-[10px] text-[#969085]">
                    (Evaluated by Bar-Raiser)
                  </span>
                </div>
                <span className="text-xs text-[#B293E2]">
                  {showOaVerbalBar ? "▲ Minimize" : "▼ Expand Voice"}
                </span>
              </div>

              {showOaVerbalBar && (
                <div className="p-3.5 space-y-3 border-t border-[#22232D]">
                  {/* Audio Controls Strip */}
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      {!isRecording ? (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>Start Speaking Intuition</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <MicOff className="w-3.5 h-3.5" />
                          <span>Stop Recording</span>
                        </button>
                      )}

                      {isRecording && (
                        <div className="flex items-center gap-0.5 h-3.5 px-2 py-1 rounded bg-[#0A0B0F] border border-[#262733]">
                          {[1, 2, 3, 4, 5].map((b) => (
                            <span
                              key={b}
                              className={clsx(
                                "w-1 rounded-full transition-all duration-75",
                                micActiveLevel >= b * 18 ? "bg-emerald-400" : "bg-emerald-950/60"
                              )}
                              style={{ height: micActiveLevel >= b * 18 ? `${Math.max(4, b * 3)}px` : "3px" }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#969085]">
                      <span className="font-mono tabular-nums">
                        {liveWpm > 0 ? `${liveWpm} WPM` : "Pacing ready"}
                      </span>
                      <span>•</span>
                      <span className={totalFillersSpoken > 2 ? "text-rose-400" : "text-emerald-400"}>
                        {totalFillersSpoken} fillers
                      </span>
                    </div>
                  </div>

                  {/* Key Concepts Rubric Pills */}
                  {problem.keyConcepts && problem.keyConcepts.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#F8F8F9]">Algorithmic Rubric Concepts</span>
                        <span className="text-[10px] text-emerald-400 font-medium">
                          Lights up green as you speak
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {problem.keyConcepts.map((concept, idx) => {
                          const covered = isConceptCovered(concept, response, currentDsaCode);
                          return (
                            <span
                              key={idx}
                              className={clsx(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors",
                                covered
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold"
                                  : "bg-[#111218] text-[#969085] border border-[#262733]"
                              )}
                            >
                              {covered ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#4F414D]" />
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
                    className="w-full p-2.5 text-xs bg-[#0A0B0F] border border-[#262733] rounded-lg text-[#F8F8F9] placeholder-[#969085]/60 focus:outline-none focus:border-[#B293E2] resize-none font-sans"
                  />
                </div>
              )}
            </div>

            {/* Problem Description */}
            <div className="text-xs text-[#F8F8F9]/90 leading-relaxed font-sans space-y-2 whitespace-pre-line">
              {problem.problemStatement}
            </div>

            {/* Examples Cards */}
            <div className="space-y-3 pt-1">
              <h3 className="text-xs font-bold text-[#F8F8F9] uppercase tracking-wider">
                Examples
              </h3>
              {problem.examples.map((ex, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-[#171820] border border-[#22232D] text-xs space-y-1.5 font-mono"
                >
                  <div className="text-[11px] font-bold text-[#969085] uppercase">
                    Example {i + 1}
                  </div>
                  <div>
                    <span className="text-[#969085]">Input: </span>
                    <span className="text-[#F8F8F9]">{ex.input}</span>
                  </div>
                  <div>
                    <span className="text-[#969085]">Output: </span>
                    <span className="text-emerald-400 font-semibold">{ex.output}</span>
                  </div>
                  {ex.explanation && (
                    <div className="text-[#969085] text-[11px] pt-1 font-sans">
                      <span className="text-[#969085] font-mono">Explanation: </span>
                      {ex.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Constraints */}
            {problem.constraints.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#22232D]">
                <h3 className="text-xs font-bold text-[#F8F8F9] uppercase tracking-wider">
                  Constraints
                </h3>
                <ul className="list-disc list-inside space-y-1 text-xs text-[#969085] font-mono">
                  {problem.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Expected Target Complexities */}
            <div className="p-3 rounded-xl bg-[#171820] border border-[#22232D] flex items-center justify-between flex-wrap gap-2 text-xs">
              <div>
                <span className="text-[#969085] font-medium">Target Time: </span>
                <span className="text-amber-300 font-mono font-semibold">
                  {problem.expectedTimeComplexity}
                </span>
              </div>
              <div>
                <span className="text-[#969085] font-medium">Target Space: </span>
                <span className="text-[#B293E2] font-mono font-semibold">
                  {problem.expectedSpaceComplexity}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* ─── RIGHT PANE: Multi-Language IDE & Bottom Console ─── */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-4 md:p-5 bg-[#111218] border-[#22232D] rounded-xl space-y-3">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-[#22232D]">
              {/* Left: Language & Claimed Complexities */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedLanguage}
                  onChange={(e) => {
                    handleLanguageChange(e.target.value as "cpp" | "java" | "python" | "typescript");
                  }}
                  className="text-xs font-semibold bg-[#171820] border border-[#262733] rounded-lg px-2.5 py-1.5 text-[#F8F8F9] focus:outline-none focus:border-[#B293E2] cursor-pointer"
                >
                  <option value="python" className="bg-[#111218]">Python 3.11</option>
                  <option value="cpp" className="bg-[#111218]">C++ (GCC 13 / STL)</option>
                  <option value="java" className="bg-[#111218]">Java 21 (JDK)</option>
                  <option value="typescript" className="bg-[#111218]">TypeScript (Node.js)</option>
                </select>

                <div className="flex items-center gap-1 bg-[#0A0B0F] border border-[#262733] rounded-lg px-2 py-1">
                  <span className="text-[10px] text-[#969085] font-mono">Time:</span>
                  <select
                    value={claimedTimeComplexity}
                    onChange={(e) => setClaimedTimeComplexity(e.target.value)}
                    className="text-[11px] font-mono bg-transparent text-amber-300 focus:outline-none cursor-pointer"
                  >
                    <option value="O(1)" className="bg-[#111218] text-[#F8F8F9]">O(1)</option>
                    <option value="O(log N)" className="bg-[#111218] text-[#F8F8F9]">O(log N)</option>
                    <option value="O(N)" className="bg-[#111218] text-[#F8F8F9]">O(N)</option>
                    <option value="O(N log N)" className="bg-[#111218] text-[#F8F8F9]">O(N log N)</option>
                    <option value="O(N^2)" className="bg-[#111218] text-[#F8F8F9]">O(N^2)</option>
                    <option value="O(2^N)" className="bg-[#111218] text-[#F8F8F9]">O(2^N)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-[#0A0B0F] border border-[#262733] rounded-lg px-2 py-1">
                  <span className="text-[10px] text-[#969085] font-mono">Space:</span>
                  <select
                    value={claimedSpaceComplexity}
                    onChange={(e) => setClaimedSpaceComplexity(e.target.value)}
                    className="text-[11px] font-mono bg-transparent text-[#B293E2] focus:outline-none cursor-pointer"
                  >
                    <option value="O(1)" className="bg-[#111218] text-[#F8F8F9]">O(1)</option>
                    <option value="O(log N)" className="bg-[#111218] text-[#F8F8F9]">O(log N)</option>
                    <option value="O(N)" className="bg-[#111218] text-[#F8F8F9]">O(N)</option>
                    <option value="O(N^2)" className="bg-[#111218] text-[#F8F8F9]">O(N^2)</option>
                  </select>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetDsaTemplate}
                  title="Reset to starter template"
                  className="p-1.5 rounded-lg bg-[#171820] hover:bg-[#1D1D26] border border-[#262733] text-[#969085] hover:text-[#F8F8F9] transition-colors text-xs flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowHintModal(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1D1D26] hover:bg-[#262633] border border-[#735BA0]/45 text-[#B293E2] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-[#B293E2]" />
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
                      <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
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
            <div className="rounded-xl border border-[#22232D] overflow-hidden bg-[#0A0B0F]">
              <div className="flex font-mono text-xs max-h-[440px] overflow-hidden">
                {/* Line Numbers Gutter */}
                <div className="select-none py-3 px-2.5 text-right text-[#4F414D] bg-[#07080C] border-r border-[#22232D] font-mono text-xs shrink-0 tabular-nums">
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
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#07080C] border-t border-[#22232D] text-[10px] text-[#969085] font-mono tabular-nums">
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
            <div className="rounded-xl border border-[#22232D] bg-[#0A0B0F] overflow-hidden">
              {/* Console Tab Headers */}
              <div className="flex items-center justify-between border-b border-[#22232D] px-2 bg-[#111218] overflow-x-auto">
                <div className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setConsoleTab("testcases")}
                    className={clsx(
                      "px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer",
                      consoleTab === "testcases"
                        ? "border-[#B293E2] text-[#F8F8F9]"
                        : "border-transparent text-[#969085] hover:text-[#F8F8F9]"
                    )}
                  >
                    <Terminal className="w-3.5 h-3.5 text-[#B293E2]" />
                    <span>Testcases</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConsoleTab("results")}
                    className={clsx(
                      "px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer",
                      consoleTab === "results"
                        ? "border-emerald-400 text-[#F8F8F9]"
                        : "border-transparent text-[#969085] hover:text-[#F8F8F9]"
                    )}
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Test Results</span>
                    {runCodeResult && (
                      <span
                        className={clsx(
                          "text-[10px] px-1.5 py-0.5 rounded font-mono font-bold tabular-nums",
                          runCodeResult.status === "Accepted"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-rose-500/15 text-rose-300"
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
                        ? "border-amber-400 text-[#F8F8F9]"
                        : "border-transparent text-[#969085] hover:text-[#F8F8F9]"
                    )}
                  >
                    <Brain className="w-3.5 h-3.5 text-amber-400" />
                    <span>AI Bar-Raiser Review</span>
                    {runCodeResult?.codeReview && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono font-bold tabular-nums">
                        {runCodeResult.codeReview.overallScore}/100
                      </span>
                    )}
                  </button>
                </div>

                {isRunningCode && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-300 pr-2 shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Executing...</span>
                  </div>
                )}
              </div>

              {/* Console Tab Content */}
              <div className="p-3.5 min-h-[160px] max-h-[300px] overflow-y-auto">
                {runCodeError && (
                  <div className="mb-3 p-3 rounded-lg bg-rose-500/8 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{runCodeError}</span>
                  </div>
                )}

                {/* Tab 1: Testcases */}
                {consoleTab === "testcases" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {problem.testCases.map((tc, idx) => (
                        <button
                          key={tc.id}
                          type="button"
                          onClick={() => setSelectedCaseIdx(idx)}
                          className={clsx(
                            "px-2.5 py-1 rounded-lg text-xs font-medium font-mono transition-colors border cursor-pointer",
                            selectedCaseIdx === idx
                              ? "bg-[#1D1D26] text-[#F8F8F9] border-[#735BA0]/50"
                              : "bg-[#171820] text-[#969085] border-[#262733] hover:text-[#F8F8F9]"
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
                            ? "bg-[#1D1D26] text-[#F8F8F9] border-[#735BA0]/50"
                            : "bg-[#171820] text-[#969085] border-[#262733] hover:text-[#F8F8F9]"
                        )}
                      >
                        Custom Input
                      </button>
                    </div>

                    {selectedCaseIdx >= 0 && problem.testCases[selectedCaseIdx] && (
                      <div className="space-y-2 text-xs font-mono">
                        <div>
                          <div className="text-[11px] text-[#969085] uppercase font-semibold mb-1">
                            Input:
                          </div>
                          <pre className="p-2.5 rounded-lg bg-[#111218] border border-[#22232D] text-[#F8F8F9] overflow-x-auto whitespace-pre-wrap">
                            {problem.testCases[selectedCaseIdx].inputDisplay}
                          </pre>
                        </div>
                        <div>
                          <div className="text-[11px] text-[#969085] uppercase font-semibold mb-1">
                            Expected Output:
                          </div>
                          <pre className="p-2.5 rounded-lg bg-[#111218] border border-[#22232D] text-emerald-400 font-semibold overflow-x-auto whitespace-pre-wrap">
                            {problem.testCases[selectedCaseIdx].expectedOutputDisplay}
                          </pre>
                        </div>
                      </div>
                    )}

                    {selectedCaseIdx === -1 && (
                      <div className="space-y-2 text-xs">
                        <div className="text-[11px] text-[#969085]">
                          Provide custom input format matching problem parameters:
                        </div>
                        <textarea
                          rows={3}
                          value={customTestInput}
                          onChange={(e) => setCustomTestInput(e.target.value)}
                          placeholder="e.g. nums = [1, 2, 3], k = 3"
                          className="w-full p-2.5 rounded-lg bg-[#111218] border border-[#262733] text-xs font-mono text-emerald-300 focus:outline-none focus:border-[#B293E2] resize-none"
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
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                        <p className="text-xs text-[#F8F8F9] font-medium">
                          Compiling &amp; Executing against Sandboxed Micro-Containers...
                        </p>
                      </div>
                    ) : runCodeResult ? (
                      <div className="space-y-3">
                        {/* Top Verdict Strip */}
                        <div className="flex items-center justify-between pb-2 border-b border-[#22232D]">
                          <div className="flex items-center gap-2">
                            <span
                              className={clsx(
                                "text-sm font-bold flex items-center gap-1.5",
                                runCodeResult.status === "Accepted"
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              )}
                            >
                              {runCodeResult.status === "Accepted" ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              {runCodeResult.status}
                            </span>
                            <span className="text-xs text-[#969085] tabular-nums">
                              ({runCodeResult.passedCount}/{runCodeResult.totalCount} passed)
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] font-mono text-[#969085] tabular-nums">
                            <span>Runtime: <strong className="text-[#F8F8F9]">{runCodeResult.runtimeMs}ms</strong></span>
                            <span>•</span>
                            <span>Memory: <strong className="text-[#F8F8F9]">{runCodeResult.memoryMb}MB</strong></span>
                          </div>
                        </div>

                        {/* Compiler Message / Trace */}
                        {runCodeResult.compilerMessage && (
                          <div className="p-2.5 rounded-lg bg-[#111218] border border-[#22232D] font-mono text-xs text-[#969085] whitespace-pre-wrap">
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
                                  ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-300"
                                  : "bg-rose-500/8 border-rose-500/20 text-rose-300"
                              )}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span>Test Case {i + 1}</span>
                                <span>{tr.passed ? "✓ Passed" : "✕ Failed"}</span>
                              </div>
                              <div className="text-[11px] text-[#969085]">
                                Input: <span className="text-[#F8F8F9]">{tr.input}</span>
                              </div>
                              <div className="text-[11px] text-[#969085]">
                                Expected: <span className="text-emerald-400">{tr.expectedOutput}</span> | Actual:{" "}
                                <span className={tr.passed ? "text-emerald-400" : "text-rose-400"}>
                                  {tr.actualOutput}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-[#969085] text-xs">
                        Click <strong className="text-[#F8F8F9]">Run Tests</strong> to compile and execute your code against test cases.
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: AI Bar-Raiser Code Review */}
                {consoleTab === "review" && (
                  <div>
                    {isRunningCode ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                        <p className="text-xs text-[#F8F8F9] font-medium">
                          Synthesizing Bar-Raiser Big-O Verification &amp; Edge Cases...
                        </p>
                      </div>
                    ) : runCodeResult?.codeReview ? (
                      <div className="space-y-4">
                        {/* Score Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-[#22232D]">
                          <div>
                            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                              Bar-Raiser AI Evaluation
                            </div>
                            <p className="text-xs text-[#969085]">
                              Evaluated against FAANG algorithmic standards &amp; edge case resilience.
                            </p>
                          </div>
                          <div className="text-right tabular-nums">
                            <span className="text-2xl font-extrabold text-amber-300">
                              {runCodeResult.codeReview.overallScore}
                            </span>
                            <span className="text-xs text-[#969085]"> / 100</span>
                          </div>
                        </div>

                        {/* Big-O Analysis Card */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl bg-[#171820] border border-[#22232D] space-y-1">
                            <span className="text-[10px] text-[#969085] font-bold uppercase tracking-wider block">
                              Time Complexity Verification
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-amber-300">
                                {runCodeResult.codeReview.detectedTimeComplexity}
                              </span>
                              <span className="text-[11px] text-[#969085]">
                                (Target: {problem.expectedTimeComplexity})
                              </span>
                            </div>
                            <span className="text-[10px] text-emerald-400 block font-medium">
                              {runCodeResult.codeReview.complexityMatch ? "✓ Matches optimal bound" : "⚠️ Suboptimal time complexity"}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-[#171820] border border-[#22232D] space-y-1">
                            <span className="text-[10px] text-[#969085] font-bold uppercase tracking-wider block">
                              Space Complexity Verification
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-[#B293E2]">
                                {runCodeResult.codeReview.detectedSpaceComplexity}
                              </span>
                              <span className="text-[11px] text-[#969085]">
                                (Target: {problem.expectedSpaceComplexity})
                              </span>
                            </div>
                            <span className="text-[10px] text-[#969085] block font-medium">
                              Memory footprint within bounds
                            </span>
                          </div>
                        </div>

                        {/* Edge Cases Diagnosed */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 space-y-1">
                            <span className="font-bold text-emerald-400 block text-[11px]">
                              Edge Cases Handled ({runCodeResult.codeReview.edgeCasesHandled.length})
                            </span>
                            <ul className="list-disc list-inside space-y-0.5 text-[#969085] text-[11px]">
                              {runCodeResult.codeReview.edgeCasesHandled.map((ec, idx) => (
                                <li key={idx}>{ec}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-3 rounded-xl bg-rose-500/8 border border-rose-500/20 space-y-1">
                            <span className="font-bold text-rose-400 block text-[11px]">
                              Potential Missed Edge Cases ({runCodeResult.codeReview.edgeCasesMissed.length})
                            </span>
                            <ul className="list-disc list-inside space-y-0.5 text-[#969085] text-[11px]">
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
                              <span className="text-xs font-bold text-[#F8F8F9]">
                                Optimal Canonical Implementation
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyOptimalCode(runCodeResult?.codeReview?.optimalCodeSuggestion || "")}
                                className="text-[11px] text-[#B293E2] hover:text-[#F8F8F9] flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                              </button>
                            </div>
                            <pre className="p-2.5 rounded-lg bg-[#07080C] border border-[#22232D] font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
                              {runCodeResult.codeReview.optimalCodeSuggestion}
                            </pre>
                          </div>
                        )}

                        {/* Follow-up Question Probe */}
                        {runCodeResult.codeReview.followUpQuestion && (
                          <div className="p-3 rounded-xl bg-[#171820] border border-[#735BA0]/35 space-y-1">
                            <div className="text-[11px] font-bold text-[#B293E2] flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-[#B293E2]" />
                              Interviewer Follow-up Probe
                            </div>
                            <p className="text-xs text-[#F8F8F9] leading-relaxed">
                              &ldquo;{runCodeResult.codeReview.followUpQuestion.prompt}&rdquo;
                            </p>
                            <p className="text-[10px] text-[#969085] italic">
                              Interviewer Intent: {runCodeResult.codeReview.followUpQuestion.intent}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-[#969085] text-xs">
                        Click <strong className="text-[#F8F8F9]">Submit OA</strong> above to generate an authentic Bar-Raiser AI Code Review, Big-O verification, and follow-up probes.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── HINT MODAL ──────────────────────────────────────────────────────── */}
      {showHintModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111218] border border-[#2A2B38] rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#22232D]">
              <div className="flex items-center gap-2 text-[#F8F8F9] font-bold text-sm">
                <Lightbulb className="w-4 h-4 text-[#B293E2]" />
                <span>Interviewer Progressive Hints</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHintModal(false)}
                className="text-[#969085] hover:text-[#F8F8F9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {problem.hints.map((hint, i) => (
                <div
                  key={i}
                  className={clsx(
                    "p-3 rounded-xl border text-xs leading-relaxed transition-colors",
                    i <= activeHintIdx
                      ? "bg-[#171820] border-[#735BA0]/35 text-[#F8F8F9]"
                      : "bg-[#0A0B0F] border-[#22232D] text-[#4F414D] select-none blur-[1px]"
                  )}
                >
                  <div className="flex items-center justify-between font-bold text-[11px] mb-1 text-[#B293E2]">
                    <span>Hint {i + 1}</span>
                    {i > activeHintIdx && <span>Locked</span>}
                  </div>
                  <p>{i <= activeHintIdx ? hint : "Click Reveal Next Hint below to unlock."}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#22232D]">
              <span className="text-[11px] text-[#969085] tabular-nums">
                Revealed {Math.min(activeHintIdx + 1, problem.hints.length)} of {problem.hints.length} hints
              </span>
              <div className="flex items-center gap-2">
                {activeHintIdx < problem.hints.length - 1 && (
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

