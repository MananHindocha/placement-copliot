"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import VisionProctorStage from "./VisionProctorStage";
import {
  getStoredReadinessMilestones,
  setStoredReadinessMilestones,
  logActivity,
} from "@/lib/storage-sync";
import type { ReadinessMilestone } from "@/types";

export interface InterviewTurn {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: string;
  interviewerAction?: string;
  skillTested?: string;
}

interface SkillMutation {
  skillName: string;
  previousTier: string;
  nextTier: string;
  bluffRisk: boolean;
  verdict: "POSITIVE" | "NEGATIVE";
  turnScore: number;
  citation: string;
}

interface StudyPlanTaskItem {
  id: string;
  title: string;
  category: string;
  priority: string;
  estimated_hours?: number;
  description: string;
  completed: boolean;
  created_at: string;
}

interface FinalReport {
  isComplete: boolean;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  injectedReadinessTasksCount?: number;
  remedialTasks?: Array<{
    title: string;
    category: string;
    priority: string;
    evidenceReason: string;
  }>;
}

interface LiveAgentInterviewRoomProps {
  targetRole: string;
  targetCompany?: string;
  jobDescription?: string;
  userId?: string;
  onExit?: () => void;
}

function normalizeDisplayScore(rawScore: unknown, fallback = 65): number {
  if (rawScore === null || rawScore === undefined || rawScore === "") return fallback;
  const num = Number(rawScore);
  if (Number.isNaN(num) || num < 0) return fallback;
  if (num > 0 && num <= 1) return Math.round(num * 100);
  return Math.min(100, Math.round(num));
}

function mapTaskCategoryToMilestone(rawCategory?: string): ReadinessMilestone["category"] {
  const normalized = (rawCategory || "").trim().toUpperCase();
  if (normalized === "DSA" || normalized === "CORE_CS" || normalized === "SYSTEM_DESIGN") {
    return "skills";
  }
  if (normalized === "PROJECT_DEEP_DIVE") {
    return "interview";
  }
  if (normalized === "RESUME") return "resume";
  if (normalized === "NETWORK") return "network";
  if (normalized === "APPLICATIONS") return "applications";
  return "interview";
}

function mapTaskPriority(rawPriority?: string): ReadinessMilestone["priority"] {
  const lower = (rawPriority || "").trim().toLowerCase();
  if (lower === "low" || lower === "medium" || lower === "high") {
    return lower;
  }
  return "high";
}

function syncStudyTasksToBrowserLocalStorage(newTasks: StudyPlanTaskItem[]) {
  if (typeof window === "undefined" || !Array.isArray(newTasks) || newTasks.length === 0) return;
  try {
    const existingList = getStoredReadinessMilestones();
    const existingTitles = new Set(
      existingList.map((t) => String(t.title || "").trim().toLowerCase())
    );

    const formattedNew: ReadinessMilestone[] = [];
    for (const t of newTasks) {
      const normalizedTitle = String(t.title || "").trim().toLowerCase();
      if (!normalizedTitle || existingTitles.has(normalizedTitle)) continue;
      existingTitles.add(normalizedTitle);
      formattedNew.push({
        id: t.id || `interview-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: t.title,
        category: mapTaskCategoryToMilestone(t.category),
        priority: mapTaskPriority(t.priority),
        description: t.description || "Identified gap from Live Autonomous Interviewer",
        completed: false,
        dueDate: "In 3 days",
      });
    }

    if (formattedNew.length > 0) {
      setStoredReadinessMilestones([...formattedNew, ...existingList]);
      logActivity({
        type: "readiness",
        message: `Interview Agent added ${formattedNew.length} study task(s): ${formattedNew
          .map((t) => t.title)
          .join(", ")}`,
      });
    }
  } catch {
    // Ignore localStorage quota failures cleanly
  }
}

const ACTION_BADGE_STYLES: Record<string, { label: string; color: string }> = {
  OPENING_QUESTION: {
    label: "⚡ Agent Action: Opening Role Calibration",
    color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  },
  PROBE_DEEPER: {
    label: "🔍 Agent Action: Probing Edge Case & Trade-offs",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  CHALLENGE_RESUME_PROJECT: {
    label: "🔥 Agent Action: Cross-Examining Resume Project Claim",
    color: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  },
  GIVE_HINT: {
    label: "💡 Agent Action: Providing Directional Hint",
    color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  },
  NEXT_TOPIC_AND_LOG_EVIDENCE: {
    label: "✅ Agent Action: Logged Skill Evidence & Switching Topic",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  CONCLUDE_INTERVIEW: {
    label: "🏁 Agent Action: Interview Concluded & Study Plan Synced",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  },
};

export default function LiveAgentInterviewRoom({
  targetRole,
  targetCompany = "",
  jobDescription = "",
  userId,
  onExit,
}: LiveAgentInterviewRoomProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<InterviewTurn[]>([]);
  const [currentAction, setCurrentAction] = useState<string>("OPENING_QUESTION");
  const [candidateInput, setCandidateInput] = useState<string>("");
  const [codeScratchpad, setCodeScratchpad] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"verbal" | "code">("verbal");
  const [isAgentThinking, setIsAgentThinking] = useState<boolean>(true);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [skillMutations, setSkillMutations] = useState<SkillMutation[]>([]);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [turnNumber, setTurnNumber] = useState<number>(0);
  const [langGraphNodesExecuted, setLangGraphNodesExecuted] = useState<string[]>([]);
  const [agentEngine, setAgentEngine] = useState<string>("LangGraph.js StateGraph");
  const [storageMode, setStorageMode] = useState<string>("local_file");
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState<boolean>(true);

  // 30-Second Proactive Idle Hint States
  const [idleSeconds, setIdleSeconds] = useState<number>(0);
  const [showHintOfferPrompt, setShowHintOfferPrompt] = useState<boolean>(false);
  const [hintAlreadyOfferedForTurn, setHintAlreadyOfferedForTurn] = useState<boolean>(false);
  const [isRequestingHint, setIsRequestingHint] = useState<boolean>(false);
  const [activeHintBox, setActiveHintBox] = useState<{
    spokenHint: string;
    clueKeywords: string[];
  } | null>(null);

  // Automatic Study Plan Remediation Notification States
  const [studyPlanNotification, setStudyPlanNotification] = useState<string | null>(null);
  const [studyTasksAddedList, setStudyTasksAddedList] = useState<StudyPlanTaskItem[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const voiceEnabledRef = useRef<boolean>(voiceEnabled);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isAgentThinking, activeHintBox]);

  const speakText = useCallback((text: string, forceSpeak = false) => {
    if ((!voiceEnabledRef.current && !forceSpeak) || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.03;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsAgentSpeaking(true);
    utterance.onend = () => setIsAgentSpeaking(false);
    utterance.onerror = () => setIsAgentSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const hasStartedAnswering =
    Boolean(candidateInput.trim()) || Boolean(codeScratchpad.trim()) || isRecording;
  const shouldTrackIdle =
    !isAgentThinking &&
    !isAgentSpeaking &&
    !isRequestingHint &&
    !finalReport &&
    history.length > 0 &&
    !hasStartedAnswering &&
    !hintAlreadyOfferedForTurn;

  // 30-Second Inactivity Countdown (external timer callback only; no synchronous setState in effect)
  useEffect(() => {
    if (!shouldTrackIdle) return;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.min(30, Math.floor((Date.now() - startedAt) / 1000));
      setIdleSeconds(elapsed);
      if (elapsed >= 30) {
        clearInterval(interval);
        setHintAlreadyOfferedForTurn(true);
        setShowHintOfferPrompt(true);
        speakText(
          "I notice you are taking a moment to think. Would you like a small architectural hint to help structure your answer?"
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [shouldTrackIdle, speakText]);

  useEffect(() => {
    let cancelled = false;

    async function initAgentInterview() {
      try {
        const res = await fetch("/api/interview/agent-turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            targetRole: jobDescription ? `${targetRole} (${jobDescription.slice(0, 200)})` : targetRole,
            targetCompany,
            history: [],
            maxTurns: 6,
          }),
        });

        const data = (await res.json()) as {
          success?: boolean;
          error?: string;
          sessionId?: string | null;
          history?: InterviewTurn[];
          interviewerAction?: string;
          turnNumber?: number;
          spokenResponse?: string;
          engine?: string;
          storageMode?: string;
          langGraphNodesExecuted?: string[];
        };
        if (cancelled) return;

        if (!res.ok || !data.success) {
          setErrorBanner(data.error || `Failed to start interview agent (HTTP ${res.status})`);
          return;
        }

        setSessionId(data.sessionId || null);
        setHistory(data.history || []);
        setCurrentAction(data.interviewerAction || "OPENING_QUESTION");
        setTurnNumber(data.turnNumber ?? 0);
        setHintAlreadyOfferedForTurn(false);
        setShowHintOfferPrompt(false);
        setActiveHintBox(null);
        setIdleSeconds(0);
        if (data.engine) setAgentEngine(data.engine);
        if (data.storageMode) setStorageMode(data.storageMode);
        if (Array.isArray(data.langGraphNodesExecuted)) {
          setLangGraphNodesExecuted(data.langGraphNodesExecuted);
        }
        if (data.spokenResponse) {
          speakText(data.spokenResponse);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorBanner(err instanceof Error ? err.message : "Network error starting live interview agent.");
        }
      } finally {
        if (!cancelled) {
          setIsAgentThinking(false);
        }
      }
    }

    void initAgentInterview();

    return () => {
      cancelled = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [jobDescription, targetCompany, targetRole, userId, speakText]);

  async function requestSmallHintFromAgent() {
    const latestQuestion =
      [...history].reverse().find((m) => m.role === "interviewer")?.content || "";
    setIsRequestingHint(true);
    setShowHintOfferPrompt(false);
    setErrorBanner(null);

    try {
      const res = await fetch("/api/interview/agent-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userId,
          targetRole,
          targetCompany,
          history,
          requestType: "REQUEST_SMALL_HINT",
          currentQuestionText: latestQuestion,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        spokenHint?: string;
        clueKeywords?: string[];
        langGraphNodesExecuted?: string[];
      };
      if (!res.ok || !data.success) {
        setErrorBanner(data.error || "Could not fetch small hint from interviewer agent.");
        return;
      }

      setCurrentAction("GIVE_HINT");
      if (Array.isArray(data.langGraphNodesExecuted)) {
        setLangGraphNodesExecuted(data.langGraphNodesExecuted);
      }
      const spokenHint =
        data.spokenHint ||
        "Think carefully about state consistency, failure recovery modes, and latency bounds.";
      setActiveHintBox({
        spokenHint,
        clueKeywords: Array.isArray(data.clueKeywords) ? data.clueKeywords : [],
      });
      speakText(spokenHint);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Network error requesting hint.");
    } finally {
      setIsRequestingHint(false);
    }
  }

  async function submitCandidateTurn(forceConclude = false) {
    const trimmedVerbal = candidateInput.trim();
    const isShortYesOrHint =
      !forceConclude &&
      trimmedVerbal.length > 0 &&
      !codeScratchpad.trim() &&
      ((showHintOfferPrompt &&
        trimmedVerbal.split(/\s+/).length <= 5 &&
        /^(yes|yeah|yep|sure|ok|okay|please|hint)\b/i.test(trimmedVerbal)) ||
        /^(give me a( small)? hint|hint please|need a hint|hint)[.!?]*$/i.test(trimmedVerbal));

    if (isShortYesOrHint) {
      setCandidateInput("");
      await requestSmallHintFromAgent();
      return;
    }

    const combinedAnswer = [
      trimmedVerbal,
      codeScratchpad.trim() ? `\n[Code Scratchpad]:\n\`\`\`\n${codeScratchpad.trim()}\n\`\`\`` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (!combinedAnswer && !forceConclude) return;

    setIsAgentThinking(true);
    setErrorBanner(null);
    setShowHintOfferPrompt(false);
    setActiveHintBox(null);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsAgentSpeaking(false);
    }

    try {
      const res = await fetch("/api/interview/agent-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userId,
          targetRole,
          targetCompany,
          history,
          candidateMessage: forceConclude
            ? `${combinedAnswer || "Please conclude the interview now and generate my final diagnostic report."}`
            : combinedAnswer,
          maxTurns: forceConclude ? 1 : 6,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        sessionId?: string | null;
        history?: InterviewTurn[];
        interviewerAction?: string;
        turnNumber?: number;
        skillMatrixMutation?: SkillMutation | null;
        newlyAddedStudyPlanTasks?: StudyPlanTaskItem[];
        finalReport?: FinalReport | null;
        spokenResponse?: string;
        engine?: string;
        storageMode?: string;
        langGraphNodesExecuted?: string[];
      };
      if (!res.ok || !data.success) {
        setErrorBanner(data.error || `Agent turn failed (HTTP ${res.status})`);
        return;
      }

      setCandidateInput("");
      setSessionId(data.sessionId || sessionId);
      setHistory(data.history || []);
      setCurrentAction(data.interviewerAction || "PROBE_DEEPER");
      setTurnNumber(data.turnNumber ?? turnNumber + 1);
      setHintAlreadyOfferedForTurn(false);
      setIdleSeconds(0);
      if (data.engine) setAgentEngine(data.engine);
      if (data.storageMode) setStorageMode(data.storageMode);
      if (Array.isArray(data.langGraphNodesExecuted)) {
        setLangGraphNodesExecuted(data.langGraphNodesExecuted);
      }

      if (data.skillMatrixMutation) {
        const mutation = {
          ...data.skillMatrixMutation,
          turnScore: normalizeDisplayScore(data.skillMatrixMutation.turnScore, 60),
        };
        setSkillMutations((prev) => [mutation, ...prev]);
      }

      const addedTasks = Array.isArray(data.newlyAddedStudyPlanTasks)
        ? data.newlyAddedStudyPlanTasks
        : [];
      if (addedTasks.length > 0) {
        syncStudyTasksToBrowserLocalStorage(addedTasks);
        setStudyTasksAddedList((prev) => [...addedTasks, ...prev]);
        const titles = addedTasks.map((t) => `"${t.title}"`).join(", ");
        setStudyPlanNotification(
          `📚 Study Plan Updated: I have added ${addedTasks.length} task(s) to your Study Plan (${titles}) to help improve your understanding of the identified gaps.`
        );
      }

      if (data.finalReport) {
        setFinalReport({
          ...data.finalReport,
          overallScore: normalizeDisplayScore(data.finalReport.overallScore, 65),
        });
      }

      if (data.spokenResponse) {
        const speechText =
          addedTasks.length > 0
            ? `${data.spokenResponse} Also, I have added ${
                addedTasks.length === 1 ? "a task" : `${addedTasks.length} tasks`
              } to your Study Plan for ${addedTasks[0].title}.`
            : data.spokenResponse;
        speakText(speechText);
      }
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Network error sending response to interview agent.");
    } finally {
      setIsAgentThinking(false);
    }
  }

  async function toggleMicrophone() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", audioBlob, "answer.webm");

        try {
          const res = await fetch("/api/interview/transcribe", {
            method: "POST",
            body: formData,
          });
          const data = (await res.json()) as { text?: string; error?: string };
          if (data.text) {
            setCandidateInput((prev) => (prev ? `${prev} ${data.text}` : data.text!));
          } else if (data.error) {
            setErrorBanner(`Transcription error: ${data.error}`);
          }
        } catch (err: unknown) {
          setErrorBanner(
            `Transcription request failed: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err: unknown) {
      setErrorBanner(
        `Microphone permission denied or unavailable: ${err instanceof Error ? err.message : ""}`
      );
    }
  }

  const latestInterviewerTurn = [...history].reverse().find((m) => m.role === "interviewer");
  const badgeMeta = ACTION_BADGE_STYLES[currentAction] || ACTION_BADGE_STYLES.OPENING_QUESTION;

  return (
    <div className="min-h-screen bg-[#000000] text-[#F5F5F5] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1D1D1D] pb-4">
          <div className="flex items-center gap-3">
            {onExit && (
              <button
                onClick={onExit}
                className="px-3 py-1.5 rounded-lg bg-[#121212] border border-[#292929] text-xs text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] cursor-pointer transition-colors"
              >
                ← Exit Room
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-[#F5F5F5] flex items-center gap-2 flex-wrap">
                Live Autonomous AI Interviewer
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {targetRole} {targetCompany ? `@ ${targetCompany}` : ""}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#121212] text-[#A78BFA] border border-[#292929]">
                  {agentEngine}
                </span>
              </h1>
              <p className="text-xs text-[#A1A1AA]">
                Multi-turn adaptive cross-examination • 30s Proactive Hint Agent • Auto Study-Plan Sync ({storageMode === "supabase" ? "Supabase" : "Local Store"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {shouldTrackIdle && idleSeconds > 0 && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#121212] border border-[#292929] text-[#A1A1AA] font-mono tabular-nums">
                ⏱️ Thinking time: {idleSeconds}s / 30s
              </span>
            )}
            <span className="text-xs px-3 py-1.5 rounded-lg bg-[#121212] border border-[#1D1D1D] text-[#A1A1AA] font-mono tabular-nums">
              Turn {turnNumber} / 6
            </span>
            <button
              onClick={() => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
                  window.speechSynthesis.cancel();
                  setIsAgentSpeaking(false);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                voiceEnabled
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                  : "bg-[#121212] text-[#A1A1AA] border-[#292929]"
              }`}
            >
              {voiceEnabled ? "🔊 Interviewer Voice ON" : "🔇 Voice Muted"}
            </button>
            {!finalReport && history.length > 1 && (
              <button
                onClick={() => submitCandidateTurn(true)}
                disabled={isAgentThinking}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 cursor-pointer"
              >
                End &amp; Generate Debrief
              </button>
            )}
          </div>
        </div>

        {/* Live Study Plan Auto-Remediation Notification Banner */}
        {studyPlanNotification && (
          <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="text-base">✅</span>
              <span className="font-medium leading-relaxed">{studyPlanNotification}</span>
            </div>
            <button
              onClick={() => setStudyPlanNotification(null)}
              className="shrink-0 px-2.5 py-1 rounded bg-emerald-900/60 text-emerald-300 hover:text-white text-[11px] cursor-pointer"
            >
              Got it
            </button>
          </div>
        )}

        {/* Honest Error Banner */}
        {errorBanner && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-sm flex items-center justify-between">
            <span>⚠️ {errorBanner}</span>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-xs underline text-rose-300 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main 2-Column Agent Interview Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Live AI Agent Persona + Real-time Skill Evidence & Study Plan Feed (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl bg-[#0D0D0D] border border-[#1D1D1D] flex flex-col items-center text-center space-y-4">
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isAgentThinking || isRequestingHint
                    ? "border-amber-400 bg-amber-500/10 animate-pulse"
                    : isAgentSpeaking
                    ? "border-indigo-400 bg-indigo-500/20 shadow-[0_0_35px_rgba(99,102,241,0.45)]"
                    : "border-[#292929] bg-[#121212]"
                }`}
              >
                <span className="text-3xl">
                  {isAgentThinking || isRequestingHint ? "🧠" : isAgentSpeaking ? "🎙️" : "🤖"}
                </span>
              </div>

              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${badgeMeta.color}`}>
                {badgeMeta.label}
              </div>

              {langGraphNodesExecuted.length > 0 && (
                <div className="w-full text-left px-3 py-2 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#A78BFA]">
                    LangGraph Node Execution
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {langGraphNodesExecuted.map((node, idx) => (
                      <span key={`${node}-${idx}`} className="inline-flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-[#121212] border border-[#292929] text-[10px] font-mono text-[#F5F5F5]">
                          {node}
                        </span>
                        {idx < langGraphNodesExecuted.length - 1 && (
                          <span className="text-[10px] text-[#52525B] font-mono">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="w-full text-left p-4 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D]">
                <div className="text-[11px] uppercase tracking-wider text-[#71717A] mb-1">
                  Current Interviewer Prompt
                </div>
                <p className="text-sm text-[#F5F5F5] leading-relaxed">
                  {isAgentThinking
                    ? "Analyzing your response, checking skill gaps, and deciding next interviewer action..."
                    : latestInterviewerTurn?.content || "Initializing interview session..."}
                </p>
              </div>
            </div>

            {/* Live Skill Evidence Matrix & Study Plan Feed Logged During This Interview */}
            <div className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#1D1D1D] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Live Skill Matrix &amp; Study Plan Updates
                </h3>
                <span className="text-xs text-[#A78BFA] font-mono">
                  {skillMutations.length} skills • {studyTasksAddedList.length} tasks
                </span>
              </div>

              {skillMutations.length === 0 && studyTasksAddedList.length === 0 ? (
                <p className="text-xs text-[#71717A]">
                  As you answer technical questions, the agent logs verified skill confidence changes and automatically adds remedial tasks to your Study Plan whenever gaps are spotted.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {studyTasksAddedList.map((task, idx) => (
                    <div
                      key={`task-${idx}`}
                      className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold text-emerald-300">
                        <span>📚 Added to Study Plan</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20">
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-[#F5F5F5] font-medium">{task.title}</p>
                      <p className="text-[#A1A1AA] text-[11px]">{task.description}</p>
                    </div>
                  ))}

                  {skillMutations.map((m, idx) => (
                    <div
                      key={`skill-${idx}`}
                      className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-[#F5F5F5]">{m.skillName}</span>
                        <span
                          className={
                            m.verdict === "POSITIVE" ? "text-emerald-400" : "text-rose-400"
                          }
                        >
                          {m.previousTier} → {m.nextTier} ({m.turnScore}/100)
                        </span>
                      </div>
                      {m.bluffRisk && (
                        <div className="text-[11px] text-amber-400 font-medium">
                          ⚠️ Bluff Risk Flagged (Claimed HIGH on resume, scored LOW in live probe)
                        </div>
                      )}
                      <p className="text-[#A1A1AA]">{m.citation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Camera + MediaPipe CV Telemetry Stage, Compact Transcript, 30s Hint & Composer (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <VisionProctorStage
              interviewerTitle="AI Bar-Raiser Agent"
              targetFileBadge={latestInterviewerTurn?.skillTested || targetRole}
              interviewerActionBadge={currentAction}
              currentPromptText={
                latestInterviewerTurn?.content || "Initializing interview session..."
              }
              isAgentThinking={isAgentThinking}
              isAgentSpeaking={isAgentSpeaking}
              onSpeakPrompt={() => {
                if (latestInterviewerTurn?.content) {
                  speakText(latestInterviewerTurn.content, true);
                }
              }}
            />

            {/* Compact Collapsible Multi-Turn Conversation Transcript (shown once turns begin) */}
            {(history.length > 1 || isAgentThinking) && (
              <div className="rounded-2xl bg-[#0D0D0D] border border-[#1D1D1D] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTranscriptDrawer((prev) => !prev)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs bg-[#121212]/70 hover:bg-[#161616] transition-colors cursor-pointer"
                >
                  <span className="font-semibold text-[#E4E4E7]">
                    💬 Conversation History ({history.length} turns)
                  </span>
                  <span className="text-[#A1A1AA]">
                    {showTranscriptDrawer ? "Collapse ▲" : "Expand ▼"}
                  </span>
                </button>

                {showTranscriptDrawer && (
                  <div className="p-4 max-h-64 overflow-y-auto space-y-3 border-t border-[#1D1D1D]">
                    {history.map((turn, i) => (
                      <div
                        key={i}
                        className={`flex flex-col ${
                          turn.role === "candidate" ? "items-end" : "items-start"
                        }`}
                      >
                        <div className="text-[11px] text-[#71717A] mb-1 px-1">
                          {turn.role === "interviewer" ? "AI Bar-Raiser Agent" : "You (Candidate)"}
                          {turn.interviewerAction ? ` • ${turn.interviewerAction}` : ""}
                        </div>
                        <div
                          className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                            turn.role === "interviewer"
                              ? "bg-[#121212] border border-[#1D1D1D] text-[#F5F5F5]"
                              : "bg-indigo-600/20 border border-indigo-500/40 text-indigo-100"
                          }`}
                        >
                          {turn.content}
                        </div>
                      </div>
                    ))}
                    {isAgentThinking && (
                      <div className="text-xs text-amber-300 animate-pulse">
                        🤖 AI Interviewer is evaluating your answer &amp; checking for study plan gaps...
                      </div>
                    )}
                    <div ref={transcriptEndRef} />
                  </div>
                )}
              </div>
            )}

            {/* 30-Second Proactive Hint Offer Prompt */}
            {showHintOfferPrompt && !finalReport && (
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/50 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <span>💡 30s Thinking Pause Detected — Need a Small Hint?</span>
                  </div>
                  <p className="text-xs text-[#A1A1AA]">
                    Would you like a small architectural nudge related to this question? (Click Yes or type/say &ldquo;Yes&rdquo;)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={requestSmallHintFromAgent}
                    disabled={isRequestingHint}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition cursor-pointer"
                  >
                    {isRequestingHint ? "Generating Hint..." : "💡 Yes, Give Me a Hint"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowHintOfferPrompt(false);
                      setIdleSeconds(0);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#121212] border border-[#292929] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] text-xs cursor-pointer"
                  >
                    No thanks, still thinking
                  </button>
                </div>
              </div>
            )}

            {/* Active Small Hint Card (Shown after user accepts or requests a hint) */}
            {activeHintBox && !finalReport && (
              <div className="p-4 rounded-2xl bg-[#0D0D0D] border border-cyan-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-300">
                    💡 Interviewer Small Hint
                  </span>
                  <button
                    type="button"
                    onClick={() => speakText(activeHintBox.spokenHint)}
                    className="text-[11px] text-cyan-300 underline hover:text-white cursor-pointer"
                  >
                    🔊 Hear Hint Again
                  </button>
                </div>
                <p className="text-xs text-[#F5F5F5] leading-relaxed">
                  {activeHintBox.spokenHint}
                </p>
                {activeHintBox.clueKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {activeHintBox.clueKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-full text-[11px] bg-cyan-500/15 text-cyan-200 border border-cyan-500/30"
                      >
                        🔑 {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Candidate Input Area OR Final Executive Debrief */}
            {finalReport ? (
              <div className="p-6 rounded-2xl bg-[#0D0D0D] border border-indigo-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#F5F5F5]">
                    🏁 Interview Executive Debrief
                  </h2>
                  <span className="px-3 py-1 rounded-full text-sm font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Overall Score: {finalReport.overallScore}/100
                  </span>
                </div>

                {studyTasksAddedList.length > 0 ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                    <div className="font-semibold">
                      ✅ Study Plan Updated: Added {studyTasksAddedList.length} targeted task(s) to your Study Plan to improve your understanding!
                    </div>
                    <ul className="list-disc list-inside text-emerald-200/90">
                      {studyTasksAddedList.map((t, i) => (
                        <li key={i}>{t.title}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  typeof finalReport.injectedReadinessTasksCount === "number" &&
                  finalReport.injectedReadinessTasksCount > 0 && (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300">
                      ✅ Agent automatically injected {finalReport.injectedReadinessTasksCount} remedial study tasks into your Readiness Plan based on this interview!
                    </div>
                  )
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D]">
                    <div className="font-semibold text-emerald-400 mb-2">Verified Strengths</div>
                    <ul className="list-disc list-inside space-y-1 text-[#A1A1AA]">
                      {(finalReport.strengths || []).map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D]">
                    <div className="font-semibold text-rose-400 mb-2">Identified Gaps</div>
                    <ul className="list-disc list-inside space-y-1 text-[#A1A1AA]">
                      {(finalReport.weaknesses || []).map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#1D1D1D] space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setActiveTab("verbal")}
                      className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        activeTab === "verbal"
                          ? "bg-indigo-600 text-white"
                          : "bg-[#121212] text-[#A1A1AA] border border-[#1D1D1D]"
                      }`}
                    >
                      Verbal / Text Answer
                    </button>
                    <button
                      onClick={() => setActiveTab("code")}
                      className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        activeTab === "code"
                          ? "bg-indigo-600 text-white"
                          : "bg-[#121212] text-[#A1A1AA] border border-[#1D1D1D]"
                      }`}
                    >
                      {"</>"} Code Scratchpad
                    </button>
                    <button
                      type="button"
                      onClick={requestSmallHintFromAgent}
                      disabled={isRequestingHint || isAgentThinking}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 disabled:opacity-40 cursor-pointer"
                    >
                      {isRequestingHint ? "Loading Hint..." : "💡 Ask for Hint"}
                    </button>
                  </div>

                  <button
                    onClick={toggleMicrophone}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      isRecording
                        ? "bg-rose-600 text-white animate-pulse"
                        : "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30"
                    }`}
                  >
                    {isRecording ? "⏹ Stop Speaking (Transcribe)" : "🎙️ Speak Answer"}
                  </button>
                </div>

                {activeTab === "verbal" ? (
                  <textarea
                    value={candidateInput}
                    onChange={(e) => {
                      setCandidateInput(e.target.value);
                      if (idleSeconds !== 0) setIdleSeconds(0);
                    }}
                    placeholder="Speak your answer using the mic or type your technical response here... (If you pause for 30s, the agent will offer a small hint)"
                    rows={4}
                    className="w-full rounded-xl bg-[#080808] border border-[#1D1D1D] p-3.5 text-sm text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#292929]"
                  />
                ) : (
                  <textarea
                    value={codeScratchpad}
                    onChange={(e) => {
                      setCodeScratchpad(e.target.value);
                      if (idleSeconds !== 0) setIdleSeconds(0);
                    }}
                    placeholder="// Write pseudo-code, SQL queries, or architecture snippets to accompany your verbal answer..."
                    rows={4}
                    className="w-full rounded-xl bg-[#080808] border border-[#1D1D1D] p-3.5 text-sm font-mono text-emerald-300 placeholder-[#52525B] focus:outline-none focus:border-[#292929]"
                  />
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-[#71717A]">
                    Gaps spotted during the interview are automatically added to your Study Plan.
                  </span>
                  <button
                    onClick={() => submitCandidateTurn(false)}
                    disabled={isAgentThinking || (!candidateInput.trim() && !codeScratchpad.trim())}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    {isAgentThinking ? "Agent Thinking..." : "Send Reply to Interviewer →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

