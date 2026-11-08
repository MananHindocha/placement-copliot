"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAgent } from "@/context/AgentProvider";
import {
  Terminal,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Code2,
  Check,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { clsx } from "clsx";

interface QuestionDef {
  id: string;
  topic: string;
  question: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

const SKILL_QUESTION_DATABASE: Record<string, QuestionDef[]> = {
  "postgresql": [
    {
      id: "pg-q1",
      topic: "B-Tree vs Hash Indexing in High-Write Transactions",
      question:
        "In a high-write financial ledger with frequent concurrent UPDATE operations, why can a secondary Hash Index severely degrade throughput compared to a B-Tree index with FillFactor 80?",
      options: [
        {
          id: "A",
          text: "Hash indexes lack HOT (Heap-Only Tuples) optimization and cause write amplification with WAL page fragmentation.",
          isCorrect: true,
          explanation:
            "Correct! In PostgreSQL, updating an indexed column on a Hash Index prevents Heap-Only Tuple (HOT) optimization, forcing new root pointer updates and severe WAL write amplification.",
        },
        {
          id: "B",
          text: "B-Trees require O(1) disk lookups while Hash indexes require O(log N) tree traversal.",
          isCorrect: false,
          explanation: "Incorrect. B-Trees require O(log N) traversal, not O(1).",
        },
        {
          id: "C",
          text: "Hash indexes enforce table-level exclusive locks on every SELECT query.",
          isCorrect: false,
          explanation: "Incorrect. Hash indexes use lightweight lock primitives, not table-level exclusive locks.",
        },
      ],
    },
    {
      id: "pg-q2",
      topic: "MVCC Isolation & Read Committed Anomalies",
      question:
        "Under PostgreSQL's default MVCC Read Committed isolation level, which anomaly can occur when two concurrent transactions execute conflicting ranges?",
      options: [
        {
          id: "A",
          text: "Phantom Read: Transaction A executes SELECT WHERE active=true twice, while Transaction B commits an INSERT active=true in between.",
          isCorrect: true,
          explanation:
            "Spot on! Read Committed takes a fresh snapshot at each statement, allowing newly committed phantom rows to appear between consecutive queries.",
        },
        {
          id: "B",
          text: "Dirty Read: Transaction A reads uncommitted in-memory rows from Transaction B.",
          isCorrect: false,
          explanation: "PostgreSQL's MVCC design never permits Dirty Reads, even at the lowest isolation level.",
        },
        {
          id: "C",
          text: "PostgreSQL table autovacuum destroys rows currently referenced by active snapshot transactions.",
          isCorrect: false,
          explanation: "Autovacuum respects active transaction horizons and never removes live rows.",
        },
      ],
    },
  ],
  "redis": [
    {
      id: "redis-q1",
      topic: "Cache Stampede & Dogpiling Mitigation",
      question:
        "When 10,000 concurrent client threads request an expired high-traffic key at the exact same millisecond ('Cache Stampede'), what is the optimal production mitigation?",
      options: [
        {
          id: "A",
          text: "Acquire a distributed mutual-exclusion lock (SETNX / Redlock) or apply probabilistic early expiration (XFetch algorithm) so only one thread recomputes.",
          isCorrect: true,
          explanation:
            "Exact match! Mutex locking or XFetch probabilistic pre-computation prevents duplicate database queries under sudden traffic spikes.",
        },
        {
          id: "B",
          text: "Restart the Redis instance to trigger an automatic RDB snapshot replay.",
          isCorrect: false,
          explanation: "Restarting Redis drops connections and escalates database outages.",
        },
        {
          id: "C",
          text: "Increase the Redis client socket read timeout to 60 seconds.",
          isCorrect: false,
          explanation: "Increasing timeouts exhausts connection pools and causes thread starvation.",
        },
      ],
    },
    {
      id: "redis-q2",
      topic: "allkeys-lru vs volatile-lru Eviction Trade-offs",
      question:
        "Under memory saturation, what is the critical architectural difference between Redis 'allkeys-lru' and 'volatile-lru'?",
      options: [
        {
          id: "A",
          text: "allkeys-lru evicts any key regardless of TTL expiry, risking eviction of non-expiring configuration metadata, whereas volatile-lru only evicts keys with an explicit TTL set.",
          isCorrect: true,
          explanation:
            "Correct! If your Redis instance stores both permanent configuration/session tokens and cache keys, allkeys-lru risks purging permanent state.",
        },
        {
          id: "B",
          text: "volatile-lru writes purged keys to PostgreSQL before deleting them from RAM.",
          isCorrect: false,
          explanation: "Redis eviction policies operate purely in memory and do not write to relational databases.",
        },
        {
          id: "C",
          text: "allkeys-lru only functions on single-node instances and is disabled on Redis clusters.",
          isCorrect: false,
          explanation: "allkeys-lru is standard across both standalone Redis and Redis clusters.",
        },
      ],
    },
  ],
  "system design": [
    {
      id: "sys-q1",
      topic: "Idempotent Webhook Processing under Network Partitions",
      question:
        "In designing a payment processing webhook receiver that handles duplicate network retries, which design guarantees strict exactly-once financial execution?",
      options: [
        {
          id: "A",
          text: "Unique idempotency keys stored in a transactional database with unique constraints and atomic row locking before debiting funds.",
          isCorrect: true,
          explanation:
            "Accurate! Enforcing unique idempotency keys inside an ACID transaction ensures subsequent retries return the cached response without double-debiting.",
        },
        {
          id: "B",
          text: "Relying on client-side exponential backoff without server-side deduplication keys.",
          isCorrect: false,
          explanation: "Client backoff does not prevent duplicated state mutations on the server.",
        },
        {
          id: "C",
          text: "Publishing every webhook payload directly to an unindexed UDP socket.",
          isCorrect: false,
          explanation: "UDP sockets are lossy and offer zero delivery or ordering guarantees.",
        },
      ],
    },
    {
      id: "sys-q2",
      topic: "Distributed Rate Limiter: Token Bucket vs Sliding Window",
      question:
        "When implementing an API Gateway rate limiter across a distributed cluster handling 50k RPS, why is a Sliding Window Counter preferred over a Fixed Window Counter?",
      options: [
        {
          id: "A",
          text: "Fixed Window allows up to 2x burst limit at the boundary edges (e.g. 00:59 and 01:00), while Sliding Window smooths traffic across rolling intervals.",
          isCorrect: true,
          explanation:
            "Correct! Fixed window counters suffer from double-burst traffic surges at boundary resets; sliding window counters calculate weighted rolling averages.",
        },
        {
          id: "B",
          text: "Fixed window requires O(N) memory per client while sliding window consumes zero memory.",
          isCorrect: false,
          explanation: "Sliding window logs require memory for timestamps; sliding window counters approximate this in O(1) space.",
        },
        {
          id: "C",
          text: "Sliding window eliminates all network round-trips to Redis.",
          isCorrect: false,
          explanation: "Distributed sliding window implementations typically execute Redis Lua scripts.",
        },
      ],
    },
  ],
  "node.js": [
    {
      id: "node-q1",
      topic: "Libuv Event Loop Microtask Execution Ordering",
      question:
        "In Node.js's libuv Event Loop, in what exact order do microtasks (`process.nextTick`, `Promise.then`) execute relative to macrotasks (`setImmediate`, `setTimeout`)?",
      options: [
        {
          id: "A",
          text: "`process.nextTick` executes immediately after the current operation finishes, before any Promise microtasks and before transitioning to the next event loop phase.",
          isCorrect: true,
          explanation:
            "Spot on! process.nextTick sits in its own microtask queue processed immediately after the current JavaScript tick, preceding the Promise microtask queue.",
        },
        {
          id: "B",
          text: "`setImmediate` always runs before `process.nextTick`.",
          isCorrect: false,
          explanation: "setImmediate runs during the check phase of the event loop, well after nextTick microtasks.",
        },
        {
          id: "C",
          text: "Node.js runs microtasks and macrotasks concurrently across arbitrary OS worker threads.",
          isCorrect: false,
          explanation: "The Node.js event loop executes user JavaScript on a single thread.",
        },
      ],
    },
    {
      id: "node-q2",
      topic: "CPU-Intensive Tasks & Event Loop Starvation",
      question:
        "When an Express server encounters a CPU-intensive cryptographic hashing loop, how should the backend prevent blocking the Event Loop for other incoming HTTP requests?",
      options: [
        {
          id: "A",
          text: "Offload the CPU task to a Node.js `worker_threads` pool or native async libuv threadpool (e.g. `crypto.pbkdf2` async).",
          isCorrect: true,
          explanation:
            "Correct! Running CPU-bound tasks in a worker thread keeps the main thread unblocked to accept incoming HTTP socket events.",
        },
        {
          id: "B",
          text: "Wrap the synchronous while-loop inside `new Promise((resolve) => ...)`.",
          isCorrect: false,
          explanation: "Wrapping synchronous code in a Promise constructor still runs synchronously on the main thread!",
        },
        {
          id: "C",
          text: "Increase the Express server HTTP port limit to 65535.",
          isCorrect: false,
          explanation: "Port numbers have no bearing on event loop concurrency.",
        },
      ],
    },
  ],
};

function getQuestionsForSkill(skillName: string): QuestionDef[] {
  const norm = skillName.toLowerCase();
  for (const [key, questions] of Object.entries(SKILL_QUESTION_DATABASE)) {
    if (norm.includes(key)) return questions;
  }

  // Generic fallback adversarial questions for any skill
  return [
    {
      id: "gen-q1",
      topic: `${skillName} Production Trade-offs`,
      question: `In a production deployment of ${skillName}, how do you monitor and handle latency degradation under 5x peak traffic?`,
      options: [
        {
          id: "A",
          text: "Profile bottleneck metrics (p95/p99 latency, connection saturation, memory footprint) and apply backpressure, indexing, and connection pooling.",
          isCorrect: true,
          explanation: "Correct! Proactive telemetry monitoring combined with backpressure and pooling mitigates cascading failures.",
        },
        {
          id: "B",
          text: "Disable all application logging and retry loops unconditionally.",
          isCorrect: false,
          explanation: "Disabling logs blinds operational visibility during an incident.",
        },
        {
          id: "C",
          text: "Immediately reboot application pods sequentially without health check readiness gates.",
          isCorrect: false,
          explanation: "Rebooting without readiness gates causes dropped customer requests.",
        },
      ],
    },
    {
      id: "gen-q2",
      topic: `${skillName} Fault Tolerance & Resiliency`,
      question: `When integrating ${skillName} with dependent microservices, what architectural pattern prevents cascading timeout failures?`,
      options: [
        {
          id: "A",
          text: "Implement Circuit Breaker (e.g. Resilience4j / Opossum) with exponential jitter backoff and fallback defaults.",
          isCorrect: true,
          explanation: "Exact match! Circuit breakers stop calling degraded services, allowing graceful degradation and recovery.",
        },
        {
          id: "B",
          text: "Increase HTTP request timeout to infinity so queries never fail.",
          isCorrect: false,
          explanation: "Infinite timeouts lock up socket buffers and exhaust memory.",
        },
        {
          id: "C",
          text: "Remove all input schema validation to speed up network serialization.",
          isCorrect: false,
          explanation: "Removing validation invites data corruption and security injection.",
        },
      ],
    },
  ];
}

export interface SkillMicroProbeModalProps {
  skillName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SkillMicroProbeModal({
  skillName,
  isOpen,
  onClose,
  onSuccess,
}: SkillMicroProbeModalProps) {
  const { updateSkillEvidence } = useAgent();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(60);
  const [submitted, setSubmitted] = useState(false);
  const [isPassed, setIsPassed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFreeTextMode, setIsFreeTextMode] = useState(false);
  const [freeTextAnswer, setFreeTextAnswer] = useState("");

  const questions = useMemo(() => getQuestionsForSkill(skillName), [skillName]);

  // Reset state on modal open
  useEffect(() => {
    if (isOpen) {
      setSelectedAnswers({});
      setTimeLeft(60);
      setSubmitted(false);
      setIsPassed(false);
      setIsSubmitting(false);
      setIsFreeTextMode(false);
      setFreeTextAnswer("");
    }
  }, [isOpen, skillName]);

  // 60-second timer countdown
  useEffect(() => {
    if (!isOpen || submitted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, submitted]);

  if (!isOpen) return null;

  const handleSelectOption = (qIdx: number, optId: string) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optId }));
  };

  const calculateScore = () => {
    if (isFreeTextMode) {
      return freeTextAnswer.trim().length >= 35 ? 2 : 1;
    }
    let correct = 0;
    questions.forEach((q, idx) => {
      const chosen = q.options.find((opt) => opt.id === selectedAnswers[idx]);
      if (chosen?.isCorrect) correct++;
    });
    return correct;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const score = calculateScore();
    const passed = score >= 2;
    setIsPassed(passed);
    setSubmitted(true);

    if (passed) {
      try {
        const citation = `Cleared 60-sec Adversarial Micro-Probe on ${skillName}: Answered 2/2 rigorous architectural trade-offs correctly.`;
        await updateSkillEvidence(skillName, "POSITIVE", "READINESS_DRILL", citation);
        if (onSuccess) onSuccess();
      } catch (err) {
        console.error("Failed to commit verification:", err);
      }
    }
    setIsSubmitting(false);
  };

  const allAnswered = isFreeTextMode
    ? freeTextAnswer.trim().length >= 20
    : Object.keys(selectedAnswers).length === questions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0c1020] via-[#090d1a] to-[#060810] border border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-black/60 border-b border-indigo-500/20">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-400/50 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-400/50 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/50 inline-block" />
            </div>
            <div className="h-4 w-px bg-white/10 mx-1" />
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>adversarial-probe://{skillName.toLowerCase().replace(/\s+/g, "-")}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 60s Animated Timer */}
            <div
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border transition-colors",
                timeLeft <= 15
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                  : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{timeLeft}s remaining</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Subheader Banner */}
        <div className="px-6 py-2.5 bg-indigo-950/40 border-b border-indigo-500/15 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-indigo-200">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">60-Sec Adversarial Competency Drill</span>
            <span className="text-slate-400">• Pass 2/2 to elevate confidence tier and clear Bluff Risk</span>
          </div>

          <button
            type="button"
            onClick={() => setIsFreeTextMode((prev) => !prev)}
            className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
          >
            {isFreeTextMode ? "← Switch to Multiple Choice" : "Switch to Free-Text Terminal"}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 font-sans">
          {submitted ? (
            /* Result Banner */
            <div
              className={clsx(
                "p-5 rounded-xl border text-center space-y-3 animate-fadeIn",
                isPassed
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                  : "bg-rose-950/40 border-rose-500/40 text-rose-200"
              )}
            >
              <div className="flex justify-center">
                {isPassed ? (
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/30">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-base font-bold text-white">
                  {isPassed ? "🎉 Challenge Passed! Competency Verified" : "Review Required: Gaps Detected"}
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                  {isPassed
                    ? `Your empirical knowledge for ${skillName} is proven. Digital Twin updated: Damped Confidence ladder promoted by +1 tier and Bluff Risk cleared!`
                    : `You answered ${calculateScore()}/2 correctly. Re-read the explanations below and re-test when ready.`}
                </p>
              </div>

              {isPassed && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Damped Confidence Promoted +1 Tier • Bluff Risk Cleared</span>
                </div>
              )}
            </div>
          ) : null}

          {/* Free-Text Mode */}
          {isFreeTextMode && !submitted && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300 space-y-2">
                <span className="font-bold text-white">Free-Text Adversarial Prompt:</span>
                <p className="leading-relaxed">
                  Explain how you handle concurrency, locking, and data integrity in {skillName} under heavy distributed traffic. Include trade-offs and error scenarios.
                </p>
              </div>
              <textarea
                value={freeTextAnswer}
                onChange={(e) => setFreeTextAnswer(e.target.value)}
                placeholder="Type your architectural rationale here (minimum 35 characters for verification)..."
                rows={6}
                className="w-full p-4 rounded-xl bg-black/60 border border-indigo-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 font-mono leading-relaxed"
              />
              <div className="text-right text-[11px] text-slate-400 font-mono">
                {freeTextAnswer.length} characters (min 35)
              </div>
            </div>
          )}

          {/* Multiple-Choice Questions */}
          {!isFreeTextMode &&
            questions.map((q, qIdx) => {
              const selectedOptId = selectedAnswers[qIdx];
              return (
                <div
                  key={q.id}
                  className="p-4 rounded-xl bg-black/30 border border-white/8 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold shrink-0">
                      Q{qIdx + 1} • {q.topic}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-white leading-relaxed">
                    {q.question}
                  </p>

                  <div className="space-y-2 pt-1">
                    {q.options.map((opt) => {
                      const isSelected = selectedOptId === opt.id;
                      const showFeedback = submitted;
                      const isCorrect = opt.isCorrect;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOption(qIdx, opt.id)}
                          disabled={submitted}
                          className={clsx(
                            "w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 cursor-pointer",
                            showFeedback && isCorrect
                              ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-100 ring-1 ring-emerald-500/40"
                              : showFeedback && isSelected && !isCorrect
                              ? "bg-rose-950/60 border-rose-500/60 text-rose-100"
                              : isSelected
                              ? "bg-indigo-600/30 border-indigo-400 text-white ring-1 ring-indigo-500/50"
                              : "bg-[#0b0e1a]/80 border-white/6 hover:border-indigo-500/30 hover:bg-[#101426] text-slate-300"
                          )}
                        >
                          <span
                            className={clsx(
                              "w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[11px] shrink-0 mt-0.5 border",
                              showFeedback && isCorrect
                                ? "bg-emerald-500/30 border-emerald-400 text-emerald-300"
                                : showFeedback && isSelected && !isCorrect
                                ? "bg-rose-500/30 border-rose-400 text-rose-300"
                                : isSelected
                                ? "bg-indigo-500/40 border-indigo-400 text-indigo-200"
                                : "bg-white/5 border-white/10 text-slate-400"
                            )}
                          >
                            {opt.id}
                          </span>
                          <div className="flex-1 leading-relaxed">
                            <span>{opt.text}</span>
                            {showFeedback && (isSelected || isCorrect) && (
                              <p
                                className={clsx(
                                  "mt-1.5 text-[11px] font-medium leading-relaxed",
                                  isCorrect ? "text-emerald-400" : "text-rose-400"
                                )}
                              >
                                {opt.explanation}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-black/60 border-t border-white/8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-all border border-white/10 cursor-pointer"
          >
            {submitted ? "Close Window" : "Abandon Probe"}
          </button>

          {!submitted ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Empirical Proof...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Submit Proof (Verify Skill)</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {!isPassed && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAnswers({});
                    setTimeLeft(60);
                    setSubmitted(false);
                    setIsPassed(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Probe (60s)</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-500/25 cursor-pointer"
              >
                <span>Done</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

