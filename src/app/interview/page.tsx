"use client";

import { useState, useRef, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import {
  getInterviewQuestions,
  getPastInterviewSessions,
} from "@/lib/services/interview.service";
import type { InterviewQuestion, InterviewSession } from "@/types";
import {
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  Eye,
  EyeOff,
  Mic,
  MicOff,
  Star,
  Clock,
  TrendingUp,
  Brain,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";

const CATEGORY_CONFIG: Record<
  string,
  { label: string; variant: "indigo" | "emerald" | "amber" | "violet" }
> = {
  behavioral: { label: "Behavioral", variant: "indigo" },
  technical: { label: "Technical", variant: "violet" },
  situational: { label: "Situational", variant: "amber" },
  culture: { label: "Culture", variant: "emerald" },
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "text-emerald-400",
  medium: "text-amber-400",
  hard: "text-rose-400",
};

const SCORE_COLOR = (score: number) =>
  score >= 85 ? "text-emerald-400" : score >= 70 ? "text-amber-400" : "text-rose-400";

type FilterCategory = "all" | InterviewQuestion["category"];

export default function InterviewPage() {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<"practice" | "history">("practice");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const evalTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([getInterviewQuestions(), getPastInterviewSessions()])
      .then(([qs, past]) => {
        setQuestions(qs);
        setSessions(past);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load interview coaching data.");
        setLoading(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([getInterviewQuestions(), getPastInterviewSessions()])
      .then(([qs, past]) => {
        if (!isMounted) return;
        setQuestions(qs);
        setSessions(past);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load interview coaching data.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered =
    filterCategory === "all"
      ? questions
      : questions.filter((q) => q.category === filterCategory);

  const question = filtered[currentIdx] ?? filtered[0];
  const catConfig = question ? (CATEGORY_CONFIG[question.category] ?? CATEGORY_CONFIG.behavioral) : CATEGORY_CONFIG.behavioral;

  const clearEvaluation = () => {
    if (evalTimerRef.current) {
      clearTimeout(evalTimerRef.current);
      evalTimerRef.current = null;
    }
    setIsEvaluating(false);
    setFeedback(null);
  };

  const prev = () => {
    clearEvaluation();
    setCurrentIdx((i) => Math.max(0, i - 1));
    setShowHint(false);
    setShowAnswer(false);
    setResponse("");
  };

  const next = () => {
    clearEvaluation();
    setCurrentIdx((i) => Math.min(filtered.length - 1, i + 1));
    setShowHint(false);
    setShowAnswer(false);
    setResponse("");
  };

  const handleGetFeedback = () => {
    const trimmed = response.trim();
    if (!trimmed || !question) return;
    clearEvaluation();
    setIsEvaluating(true);

    evalTimerRef.current = setTimeout(() => {
      setIsEvaluating(false);
      evalTimerRef.current = null;
      const wordCount = trimmed.split(/\s+/).length;
      const isBrief = wordCount < 30;
      setFeedback(
        isBrief
          ? `[Demo Prototype · Simulated Feedback] Your response is brief (${wordCount} words). For ${question.category} interview prompts, aim for 80-150 words using the STAR method: articulate the Situation, the exact Task, the Actions you personally led, and the measurable Results achieved.`
          : `[Demo Prototype · Simulated Feedback] Solid response depth (${wordCount} words) tailored to this ${question.difficulty}-level ${question.category} prompt. Key recommendation: Strengthen your narrative by quantifying results with business metrics (e.g., latency reduction, revenue lift, or team adoption).`
      );
    }, 700);
  };

  useEffect(() => {
    return () => {
      if (evalTimerRef.current) {
        clearTimeout(evalTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Error state */}
      {error && (
        <ErrorBanner
          title="Interview Service Sync Error"
          message={error}
          onRetry={loadData}
        />
      )}

      {/* Mode navigation */}
      <div className="flex items-center gap-1 p-1 bg-[#111827] border border-white/6 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveSection("practice")}
          className={clsx(
            "px-4 py-2 text-sm font-medium rounded-lg transition-all",
            activeSection === "practice"
              ? "bg-indigo-500 text-white shadow"
              : "text-slate-400 hover:text-white"
          )}
        >
          🎙️ Practice Mode
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("history")}
          className={clsx(
            "px-4 py-2 text-sm font-medium rounded-lg transition-all",
            activeSection === "history"
              ? "bg-indigo-500 text-white shadow"
              : "text-slate-400 hover:text-white"
          )}
        >
          📜 Past Sessions ({sessions.length})
        </button>
      </div>

      {loading && questions.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-sm">Loading interview coach...</span>
        </div>
      ) : activeSection === "practice" ? (
        <div className="space-y-4">
          {/* Category filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "behavioral", "technical", "situational", "culture"] as const).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    clearEvaluation();
                    setFilterCategory(cat);
                    setCurrentIdx(0);
                    setShowHint(false);
                    setShowAnswer(false);
                    setResponse("");
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",
                    filterCategory === cat
                      ? "bg-indigo-500 text-white"
                      : "bg-white/5 text-slate-400 hover:text-white border border-white/8"
                  )}
                >
                  {cat}
                </button>
              )
            )}
          </div>

          {question ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Question column */}
              <div className="lg:col-span-2 space-y-4">
                {/* Main question card */}
                <Card>
                <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={catConfig.variant} size="sm">
                      {catConfig.label}
                    </Badge>
                    <span
                      className={clsx(
                        "text-xs font-semibold capitalize",
                        DIFFICULTY_COLOR[question.difficulty]
                      )}
                    >
                      {question.difficulty}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Question {currentIdx + 1} of {filtered.length}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white mb-6 leading-snug">
                  {question.question}
                </h2>

                {/* Answer area */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Your Response
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsRecording(!isRecording)}
                      className={clsx(
                        "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                        isRecording
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse"
                          : "bg-white/5 text-slate-400 border-white/8 hover:text-white"
                      )}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-3.5 h-3.5" /> Recording...
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5" /> Voice Input (Demo)
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Type your answer here, or click 'Voice Input' to simulate speech-to-text..."
                    className="w-full p-3.5 text-sm bg-white/3 border border-white/8 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none transition-all leading-relaxed"
                  />
                </div>

                {/* Question actions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Lightbulb className="w-3.5 h-3.5 text-amber-400" />}
                      onClick={() => setShowHint(!showHint)}
                    >
                      {showHint ? "Hide Hint" : "Hint"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={
                        showAnswer ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        )
                      }
                      onClick={() => setShowAnswer(!showAnswer)}
                    >
                      {showAnswer ? "Hide Sample" : "Sample Answer"}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleGetFeedback}
                      disabled={!response.trim() || isEvaluating}
                    >
                      {isEvaluating ? "Analyzing..." : "Get AI Feedback"}
                    </Button>
                    <button
                      type="button"
                      aria-label="Previous question"
                      onClick={prev}
                      disabled={currentIdx === 0}
                      className="p-2 rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next question"
                      onClick={next}
                      disabled={currentIdx === filtered.length - 1}
                      className="p-2 rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Hint collapsible */}
                {showHint && (
                  <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed">
                    💡 <span className="font-semibold">Coach Hint:</span> {question.hint}
                  </div>
                )}

                {/* Sample answer collapsible */}
                {showAnswer && (
                  <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 leading-relaxed space-y-1">
                    <p className="font-semibold text-emerald-400 uppercase tracking-wide text-[10px]">
                      Sample Answer (STAR Approach)
                    </p>
                    <p>{question.sampleAnswer}</p>
                  </div>
                )}

                {/* Feedback block */}
                {feedback && (
                  <div className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/25 space-y-2">
                    <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs">
                      <Brain className="w-4 h-4" />
                      AI Coach Feedback
                    </div>
                    <p className="text-xs text-indigo-200 leading-relaxed">{feedback}</p>
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar info */}
            <div className="space-y-4">
              {/* Follow-up questions */}
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Expected Follow-ups</h3>
                </div>
                <ul className="space-y-2.5">
                  {question.followUps.map((fu, i) => (
                    <li
                      key={i}
                      className="text-xs text-slate-300 p-2.5 rounded-lg bg-white/2 border border-white/5 leading-relaxed"
                    >
                      ❓ {fu}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* STAR method tip */}
              <Card>
                <h3 className="text-sm font-semibold text-white mb-2">⭐ The STAR Method</h3>
                <div className="space-y-2 text-xs text-slate-400">
                  <p>
                    <strong className="text-white">Situation:</strong> Set context in 1-2
                    sentences.
                  </p>
                  <p>
                    <strong className="text-white">Task:</strong> Your specific responsibility.
                  </p>
                  <p>
                    <strong className="text-white">Action:</strong> What you personally built or
                    did.
                  </p>
                  <p>
                    <strong className="text-white">Result:</strong> Measurable outcomes and
                    learnings.
                  </p>
                </div>
              </Card>
            </div>
          </div>
          ) : (
            <div className="p-8 text-center text-slate-400 border border-dashed border-white/10 rounded-2xl">
              No questions found in this category. Select another category above to continue practice.
            </div>
          )}
        </div>
      ) : (
        /* History */
        <div className="space-y-4 max-w-3xl">
          {/* Aggregate stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Sessions", value: sessions.length, icon: MessageSquare, color: "text-indigo-400" },
              {
                label: "Avg Score",
                value: sessions.length
                  ? `${Math.round(sessions.reduce((s, i) => s + i.score, 0) / sessions.length)}%`
                  : "N/A",
                icon: Star,
                color: "text-amber-400",
              },
              {
                label: "Questions",
                value: sessions.reduce((s, i) => s + i.questionsAnswered, 0),
                icon: Brain,
                color: "text-violet-400",
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="text-center">
                  <Icon className={clsx("w-5 h-5 mx-auto mb-2", stat.color)} />
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </Card>
              );
            })}
          </div>

          {/* Session list */}
          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id} hover>
                <div className="flex items-start gap-4">
                  {/* Score ring */}
                  <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                      <circle
                        cx="28"
                        cy="28"
                        r="22"
                        fill="none"
                        stroke={session.score >= 85 ? "#10b981" : session.score >= 70 ? "#f59e0b" : "#f43f5e"}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 22}`}
                        strokeDashoffset={`${2 * Math.PI * 22 * (1 - session.score / 100)}`}
                      />
                    </svg>
                    <span className={clsx("absolute text-sm font-bold", SCORE_COLOR(session.score))}>
                      {session.score}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{session.role}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {session.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {session.questionsAnswered} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {session.duration}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed bg-white/3 px-3 py-2 rounded-lg">
                      💬 {session.feedback}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Review
                  </Button>
                </div>
              </Card>
            ))}
            {sessions.length === 0 && (
              <div className="p-8 text-center text-slate-400 border border-dashed border-white/10 rounded-2xl">
                No past interview sessions recorded. Start practice mode above to complete your first session.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
