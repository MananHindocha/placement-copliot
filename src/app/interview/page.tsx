"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { INTERVIEW_QUESTIONS, INTERVIEW_SESSIONS } from "@/lib/mock-data";
import type { InterviewQuestion } from "@/types";
import {
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  Eye,
  EyeOff,
  Mic,
  MicOff,
  RotateCcw,
  Star,
  Clock,
  TrendingUp,
  Play,
  Brain,
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
  const [activeSection, setActiveSection] = useState<"practice" | "history">("practice");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [response, setResponse] = useState("");

  const filtered =
    filterCategory === "all"
      ? INTERVIEW_QUESTIONS
      : INTERVIEW_QUESTIONS.filter((q) => q.category === filterCategory);

  const question = filtered[currentIdx] ?? filtered[0];
  const catConfig = CATEGORY_CONFIG[question?.category] ?? CATEGORY_CONFIG.behavioral;

  const prev = () => setCurrentIdx((i) => Math.max(0, i - 1));
  const next = () => {
    setCurrentIdx((i) => Math.min(filtered.length - 1, i + 1));
    setShowHint(false);
    setShowAnswer(false);
    setResponse("");
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-[#111827] border border-white/6 rounded-xl w-fit">
        {(["practice", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSection(tab)}
            className={clsx(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all",
              activeSection === tab
                ? "bg-indigo-500 text-white shadow"
                : "text-slate-400 hover:text-white"
            )}
          >
            {tab === "practice" ? "🎤 Practice" : "📊 Session History"}
          </button>
        ))}
      </div>

      {activeSection === "practice" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Question list sidebar */}
          <div className="space-y-3">
            <Card padding="sm">
              {/* Category filter */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(["all", "behavioral", "technical", "situational", "culture"] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setFilterCategory(cat);
                        setCurrentIdx(0);
                        setShowHint(false);
                        setShowAnswer(false);
                      }}
                      className={clsx(
                        "px-2.5 py-1 text-xs font-medium rounded-lg transition-all capitalize",
                        filterCategory === cat
                          ? "bg-indigo-500 text-white"
                          : "bg-white/5 text-slate-400 hover:text-white"
                      )}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>

              <p className="text-xs text-slate-500 mb-2">
                {filtered.length} questions
              </p>

              <div className="space-y-1.5">
                {filtered.map((q, i) => {
                  const cc = CATEGORY_CONFIG[q.category];
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIdx(i);
                        setShowHint(false);
                        setShowAnswer(false);
                        setResponse("");
                      }}
                      className={clsx(
                        "w-full text-left p-3 rounded-xl border transition-all",
                        i === currentIdx
                          ? "bg-indigo-500/10 border-indigo-500/30"
                          : "border-white/4 hover:bg-white/3"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={cc.variant} size="sm">{cc.label}</Badge>
                        <span className={clsx("text-xs font-medium capitalize", DIFFICULTY_COLOR[q.difficulty])}>
                          {q.difficulty}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-snug line-clamp-2">{q.question}</p>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Practice area */}
          <div className="lg:col-span-2 space-y-4">
            {question && (
              <>
                {/* Question card */}
                <Card>
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant={catConfig.variant} size="md">{catConfig.label}</Badge>
                    <span className={clsx("text-xs font-semibold capitalize", DIFFICULTY_COLOR[question.difficulty])}>
                      {question.difficulty}
                    </span>
                    <span className="ml-auto text-xs text-slate-500">
                      {currentIdx + 1} / {filtered.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-4 h-4 text-indigo-400 shrink-0" />
                    <h3 className="text-sm font-medium text-white leading-relaxed">
                      {question.question}
                    </h3>
                  </div>

                  {/* Hint */}
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors mb-2"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    {showHint ? "Hide hint" : "Show hint"}
                  </button>
                  {showHint && (
                    <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-200 mb-4">
                      💡 {question.hint}
                    </div>
                  )}

                  {/* Follow-ups */}
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-2">Likely follow-ups:</p>
                    <div className="flex flex-wrap gap-2">
                      {question.followUps.map((fu, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-xs text-slate-400"
                        >
                          {fu}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ChevronLeft className="w-4 h-4" />}
                      onClick={prev}
                      disabled={currentIdx === 0}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                      onClick={() => { setShowHint(false); setShowAnswer(false); setResponse(""); }}
                    >
                      Reset
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<ChevronRight className="w-4 h-4" />}
                      onClick={next}
                      disabled={currentIdx === filtered.length - 1}
                      className="ml-auto"
                    >
                      Next
                    </Button>
                  </div>
                </Card>

                {/* Response area */}
                <Card>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold text-white">Your Response</h3>
                    <button
                      onClick={() => setIsRecording(!isRecording)}
                      className={clsx(
                        "ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        isRecording
                          ? "bg-rose-500/15 text-rose-300 border border-rose-500/20"
                          : "bg-white/5 text-slate-400 hover:text-white border border-white/8"
                      )}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-3.5 h-3.5" />
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5" />
                          Record Answer
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Type your answer here using the STAR method (Situation, Task, Action, Result)..."
                    className="w-full h-32 px-3 py-2.5 bg-white/4 border border-white/8 rounded-xl text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none transition-all"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-500">
                      {response.split(/\s+/).filter(Boolean).length} words
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Play className="w-3.5 h-3.5" />}
                    >
                      Get AI Feedback
                    </Button>
                  </div>
                </Card>

                {/* Sample Answer */}
                <Card>
                  <button
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="flex items-center justify-between w-full"
                  >
                    <div className="flex items-center gap-2">
                      {showAnswer ? (
                        <EyeOff className="w-4 h-4 text-violet-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-violet-400" />
                      )}
                      <span className="text-sm font-semibold text-white">
                        {showAnswer ? "Hide" : "View"} Sample Answer
                      </span>
                    </div>
                    <ChevronRight
                      className={clsx("w-4 h-4 text-slate-500 transition-transform", showAnswer && "rotate-90")}
                    />
                  </button>
                  {showAnswer && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {question.sampleAnswer}
                      </p>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      ) : (
        /* History */
        <div className="space-y-4 max-w-3xl">
          {/* Aggregate stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Sessions", value: INTERVIEW_SESSIONS.length, icon: MessageSquare, color: "text-indigo-400" },
              {
                label: "Avg Score",
                value: `${Math.round(INTERVIEW_SESSIONS.reduce((s, i) => s + i.score, 0) / INTERVIEW_SESSIONS.length)}%`,
                icon: Star,
                color: "text-amber-400",
              },
              {
                label: "Questions",
                value: INTERVIEW_SESSIONS.reduce((s, i) => s + i.questionsAnswered, 0),
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
            {INTERVIEW_SESSIONS.map((session) => (
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
          </div>
        </div>
      )}
    </div>
  );
}
