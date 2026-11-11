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
  const [answerInputMode, setAnswerInputMode] = useState<"voice" | "text">("voice");
  const [isAgentThinking, setIsAgentThinking] = useState<boolean>(true);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [skillMutations, setSkillMutations] = useState<SkillMutation[]>([]);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [turnNumber, setTurnNumber] = useState<number>(0);
  const [langGraphNodesExecuted, setLangGraphNodesExecuted] = useState<string[]>([]);

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
  const roomRootRef = useRef<HTMLDivElement | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const voiceEnabledRef = useRef<boolean>(voiceEnabled);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    roomRootRef.current?.closest("main")?.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const container = transcriptContainerRef.current;
    if (container && container.scrollHeight > container.clientHeight) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
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

        setIsTranscribing(true);
        try {
          const res = await fetch("/api/interview/transcribe", {
            method: "POST",
            body: formData,
          });
          const data = (await res.json()) as { transcript?: string; text?: string; error?: string };
          const transcribedText = (data.transcript || data.text || "").trim();
          if (transcribedText) {
            setCandidateInput((prev) => (prev ? `${prev} ${transcribedText}` : transcribedText));
          } else if (data.error) {
            setErrorBanner(`Transcription error: ${data.error}`);
          }
        } catch (err: unknown) {
          setErrorBanner(
            `Transcription request failed: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setActiveTab("verbal");
      setAnswerInputMode("voice");
      setIsRecording(true);
    } catch (err: unknown) {
      setErrorBanner(
        `Microphone permission denied or unavailable: ${err instanceof Error ? err.message : ""}`
      );
    }
  }

  const latestInterviewerTurn = [...history].reverse().find((m) => m.role === "interviewer");

  return (
    <div ref={roomRootRef} className="min-h-screen bg-[#000000] text-[#F5F5F5] px-4 py-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1D1D1D] pb-4">
          <div className="flex items-center gap-3">
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="px-3 py-1.5 rounded-lg bg-[#121212] border border-[#292929] text-xs text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] cursor-pointer transition-colors"
              >
                ← Exit Room
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-[#F5F5F5] flex items-center gap-2.5 flex-wrap">
                <span>Live Autonomous AI Interviewer</span>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#121212] text-[#A1A1AA] border border-[#292929]">
                  {targetRole} {targetCompany ? `@ ${targetCompany}` : ""}
                </span>
              </h1>
              <p className="text-xs text-[#71717A] mt-0.5">
                Multi-turn adaptive cross-examination • Proactive hint coaching • Automatic Study-Plan sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {shouldTrackIdle && idleSeconds > 0 && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#121212] border border-[#292929] text-[#A1A1AA] font-mono tabular-nums">
                ⏱️ Thinking time: {idleSeconds}s / 30s
              </span>
            )}
            <span className="text-xs px-3 py-1.5 rounded-lg bg-[#121212] border border-[#1D1D1D] text-[#A1A1AA] font-mono tabular-nums">
              Turn {turnNumber} / 6
            </span>
            <button
              type="button"
              onClick={() => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
                  window.speechSynthesis.cancel();
                  setIsAgentSpeaking(false);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                voiceEnabled
                  ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25 hover:bg-[#10B981]/15"
                  : "bg-[#121212] text-[#A1A1AA] border-[#292929] hover:text-[#F5F5F5]"
              }`}
            >
              {voiceEnabled ? "🔊 Interviewer Voice ON" : "🔇 Voice Muted"}
            </button>
            {!finalReport && history.length > 1 && (
              <button
                type="button"
                onClick={() => submitCandidateTurn(true)}
                disabled={isAgentThinking}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30 hover:bg-[#F43F5E]/25 cursor-pointer transition-colors"
              >
                End &amp; Generate Debrief
              </button>
            )}
          </div>
        </div>

        {/* Live Study Plan Auto-Remediation Notification Banner */}
        {studyPlanNotification && (
          <div className="p-4 rounded-xl bg-[#10B981]/10 border border-[#10B981]/25 text-[#F5F5F5] text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-base">✅</span>
              <span className="font-medium leading-relaxed">{studyPlanNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setStudyPlanNotification(null)}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-[#121212] border border-[#292929] text-[#10B981] hover:text-[#F5F5F5] text-[11px] cursor-pointer transition-colors"
            >
              Got it
            </button>
          </div>
        )}

        {/* Honest Error Banner */}
        {errorBanner && (
          <div className="p-4 rounded-xl bg-[#F43F5E]/10 border border-[#F43F5E]/25 text-[#F5F5F5] text-xs flex items-center justify-between gap-3">
            <span>⚠️ {errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-xs underline text-[#A1A1AA] hover:text-[#F5F5F5] cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main 2-Column Agent Interview Workspace (approx 38% LHS / 62% RHS) */}
        <div className="grid grid-cols-1 lg:grid-cols-[38fr_62fr] gap-5 items-start">
          {/* LHS: Optional Camera Monitoring + Live Skill Matrix & Study Plan Updates + LangGraph Node Execution */}
          <div className="space-y-4">
            <VisionProctorStage variant="sidebar" autoStart={false} currentPromptText="" />

            {/* Live Skill Evidence Matrix & Study Plan Feed Logged During This Interview */}
            <div className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#1D1D1D] space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#F5F5F5] whitespace-nowrap">
                  Live Skill Matrix &amp; Study Plan Updates
                </h3>
                <span className="text-xs text-[#A78BFA] font-mono tabular-nums shrink-0 whitespace-nowrap">
                  {skillMutations.length} skills • {studyTasksAddedList.length} tasks
                </span>
              </div>

              {skillMutations.length === 0 && studyTasksAddedList.length === 0 ? (
                <p className="text-xs text-[#71717A] leading-relaxed">
                  As you answer technical questions, the agent logs verified skill confidence changes and automatically adds remedial tasks to your Study Plan whenever gaps are spotted.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {studyTasksAddedList.map((task, idx) => (
                    <div
                      key={`task-${idx}`}
                      className="p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/25 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold text-[#10B981]">
                        <span>Added to Study Plan</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#10B981]/15 border border-[#10B981]/25">
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
                      className="p-3 rounded-xl bg-[#080808] border border-[#1D1D1D] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-[#F5F5F5]">{m.skillName}</span>
                        <span
                          className={
                            m.verdict === "POSITIVE" ? "text-[#10B981]" : "text-[#F43F5E]"
                          }
                        >
                          {m.previousTier} → {m.nextTier} ({m.turnScore}/100)
                        </span>
                      </div>
                      {m.bluffRisk && (
                        <div className="text-[11px] text-[#F59E0B] font-medium">
                          Bluff Risk Flagged (Claimed HIGH on resume, scored LOW in live probe)
                        </div>
                      )}
                      <p className="text-[#A1A1AA]">{m.citation}</p>
                    </div>
                  ))}
                </div>
              )}

              {langGraphNodesExecuted.length > 0 && (
                <div className="pt-3 border-t border-[#1D1D1D] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A78BFA]">
                      LangGraph Node Execution
                    </span>
                    <span className="text-[10px] font-mono text-[#71717A] truncate">
                      {currentAction}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {langGraphNodesExecuted.map((node, idx) => (
                      <span key={`${node}-${idx}`} className="inline-flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded bg-[#121212] border border-[#1D1D1D] text-[10px] font-mono text-[#F5F5F5]">
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
            </div>
          </div>

          {/* RHS: Interview Conversation Container + Answer Controls */}
          <div className="flex flex-col space-y-4">
            {/* Interview Conversation Container */}
            <div className="rounded-2xl bg-[#0D0D0D] border border-[#1D1D1D] p-5 flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#1D1D1D]">
                <div className="flex items-center gap-2 text-xs text-[#71717A] font-medium">
                  {isAgentSpeaking && (
                    <span className="w-2 h-2 rounded-full bg-[#A78BFA] animate-pulse shrink-0" />
                  )}
                  <span>
                    AI Bar-Raiser Agent • <span className="font-mono text-[#A1A1AA]">{currentAction}</span>
                  </span>
                </div>
                {latestInterviewerTurn && (
                  <button
                    type="button"
                    onClick={() => speakText(latestInterviewerTurn.content, true)}
                    className="px-2.5 py-1 rounded-lg bg-[#121212] hover:bg-[#1A1A1A] border border-[#292929] text-[11px] text-[#A1A1AA] hover:text-[#F5F5F5] cursor-pointer transition-colors"
                  >
                    🔊 Replay
                  </button>
                )}
              </div>

              <div ref={transcriptContainerRef} className="flex-1 overflow-y-auto space-y-4 pt-4 max-h-[380px] pr-1">
                {history.length === 0 ? (
                  <div className="flex flex-col items-start">
                    <div className="max-w-[92%] rounded-xl px-4 py-3 text-sm leading-relaxed bg-[#121212] border border-[#1D1D1D] text-[#A1A1AA]">
                      {isAgentThinking
                        ? "Initializing interview session and calibrating opening question..."
                        : "Waiting for interview session..."}
                    </div>
                  </div>
                ) : (
                  history.map((turn, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${
                        turn.role === "candidate" ? "items-end" : "items-start"
                      }`}
                    >
                      {history.length > 1 && (
                        <div className="text-[11px] text-[#71717A] mb-1 px-1">
                          {turn.role === "interviewer" ? "AI Bar-Raiser Agent" : "You (Candidate)"}
                          {turn.interviewerAction ? ` • ${turn.interviewerAction}` : ""}
                        </div>
                      )}
                      <div
                        className={`max-w-[92%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                          turn.role === "interviewer"
                            ? "bg-[#121212] border border-[#1D1D1D] text-[#F5F5F5]"
                            : "bg-[#A78BFA]/12 border border-[#A78BFA]/25 text-[#F5F5F5]"
                        }`}
                      >
                        {turn.content}
                      </div>
                    </div>
                  ))
                )}

                {isAgentThinking && history.length > 0 && (
                  <div className="flex items-start">
                    <div className="rounded-xl px-4 py-2.5 text-xs bg-[#121212] border border-[#1D1D1D] text-[#F59E0B] animate-pulse">
                      Evaluating your answer &amp; preparing the next question...
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 30-Second Proactive Hint Offer Prompt */}
            {showHintOfferPrompt && !finalReport && (
              <div className="p-4 rounded-2xl bg-[#0D0D0D] border border-[#292929] flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[#F5F5F5]">
                    💡 30s Thinking Pause Detected — Need a Small Hint?
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
                    className="px-3.5 py-1.5 rounded-lg bg-[#F5F5F5] hover:bg-[#E4E4E7] text-[#000000] font-semibold text-xs transition-colors cursor-pointer"
                  >
                    {isRequestingHint ? "Generating Hint..." : "💡 Yes, Give Me a Hint"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowHintOfferPrompt(false);
                      setIdleSeconds(0);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#121212] border border-[#292929] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] text-xs cursor-pointer transition-colors"
                  >
                    No thanks, still thinking
                  </button>
                </div>
              </div>
            )}

            {/* Active Small Hint Card */}
            {activeHintBox && !finalReport && (
              <div className="p-4 rounded-2xl bg-[#0D0D0D] border border-[#292929] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#38BDF8]">
                    💡 Interviewer Small Hint
                  </span>
                  <button
                    type="button"
                    onClick={() => speakText(activeHintBox.spokenHint, true)}
                    className="text-[11px] text-[#A1A1AA] underline hover:text-[#F5F5F5] cursor-pointer"
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
                        className="px-2.5 py-0.5 rounded-md text-[11px] bg-[#121212] text-[#A1A1AA] border border-[#1D1D1D]"
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
              <div className="p-6 rounded-2xl bg-[#0D0D0D] border border-[#1D1D1D] space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-[#F5F5F5]">
                    Interview Executive Debrief
                  </h2>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#121212] text-[#A78BFA] border border-[#292929] tabular-nums">
                    Overall Score: {finalReport.overallScore}/100
                  </span>
                </div>

                {studyTasksAddedList.length > 0 ? (
                  <div className="p-3.5 rounded-xl bg-[#10B981]/10 border border-[#10B981]/25 text-xs text-[#10B981] space-y-1">
                    <div className="font-semibold">
                      Study Plan Updated: Added {studyTasksAddedList.length} targeted task(s) to your Study Plan
                    </div>
                    <ul className="list-disc list-inside text-[#A1A1AA]">
                      {studyTasksAddedList.map((t, i) => (
                        <li key={i}>{t.title}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  typeof finalReport.injectedReadinessTasksCount === "number" &&
                  finalReport.injectedReadinessTasksCount > 0 && (
                    <div className="p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/25 text-xs text-[#10B981]">
                      Added {finalReport.injectedReadinessTasksCount} study tasks into your Study Plan based on this interview.
                    </div>
                  )
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#080808] border border-[#1D1D1D]">
                    <div className="font-semibold text-[#10B981] mb-2">Verified Strengths</div>
                    <ul className="list-disc list-inside space-y-1 text-[#A1A1AA]">
                      {(finalReport.strengths || []).map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#080808] border border-[#1D1D1D]">
                    <div className="font-semibold text-[#F43F5E] mb-2">Identified Gaps</div>
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
                      type="button"
                      onClick={() => setActiveTab("verbal")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        activeTab === "verbal"
                          ? "bg-[#121212] text-[#F5F5F5] border-[#292929]"
                          : "bg-transparent text-[#A1A1AA] border-[#1D1D1D] hover:text-[#F5F5F5]"
                      }`}
                    >
                      Verbal / Text Answer
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("code")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        activeTab === "code"
                          ? "bg-[#121212] text-[#F5F5F5] border-[#292929]"
                          : "bg-transparent text-[#A1A1AA] border-[#1D1D1D] hover:text-[#F5F5F5]"
                      }`}
                    >
                      {"</>"} Code Scratchpad
                    </button>
                    <button
                      type="button"
                      onClick={requestSmallHintFromAgent}
                      disabled={isRequestingHint || isAgentThinking}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/25 hover:bg-[#38BDF8]/15 disabled:opacity-40 cursor-pointer transition-colors"
                    >
                      {isRequestingHint ? "Loading Hint..." : "💡 Ask for Hint"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={toggleMicrophone}
                    disabled={isTranscribing}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      isRecording
                        ? "bg-[#F43F5E] text-white animate-pulse"
                        : "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 hover:bg-[#10B981]/25"
                    }`}
                  >
                    {isTranscribing
                      ? "Transcribing..."
                      : isRecording
                      ? "⏹ Stop Speaking (Transcribe)"
                      : "🎙️ Speak Answer"}
                  </button>
                </div>

                {activeTab === "verbal" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 border-b border-[#1D1D1D] pb-2.5">
                      <button
                        type="button"
                        onClick={() => setAnswerInputMode("voice")}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          answerInputMode === "voice"
                            ? "bg-[#121212] text-[#F5F5F5] border border-[#292929]"
                            : "text-[#71717A] border border-transparent hover:text-[#F5F5F5]"
                        }`}
                      >
                        Voice Answer (Read-Only Transcript)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswerInputMode("text")}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          answerInputMode === "text"
                            ? "bg-[#121212] text-[#F5F5F5] border border-[#292929]"
                            : "text-[#71717A] border border-transparent hover:text-[#F5F5F5]"
                        }`}
                      >
                        Type Text Answer
                      </button>
                    </div>

                    {answerInputMode === "voice" ? (
                      <textarea
                        readOnly
                        value={candidateInput}
                        placeholder='Click "Speak Answer" to start talking — your words will appear here continuously as you speak...'
                        rows={4}
                        className="w-full rounded-xl bg-[#080808] border border-[#1D1D1D] p-3.5 text-sm text-[#F5F5F5] placeholder-[#52525B] focus:outline-none cursor-default resize-none"
                      />
                    ) : (
                      <textarea
                        value={candidateInput}
                        onChange={(e) => {
                          setCandidateInput(e.target.value);
                          if (idleSeconds !== 0) setIdleSeconds(0);
                        }}
                        placeholder="Type your technical response here... (If you pause for 30s, the agent will offer a small hint)"
                        rows={4}
                        className="w-full rounded-xl bg-[#080808] border border-[#1D1D1D] p-3.5 text-sm text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#292929]"
                      />
                    )}
                  </div>
                ) : (
                  <textarea
                    value={codeScratchpad}
                    onChange={(e) => {
                      setCodeScratchpad(e.target.value);
                      if (idleSeconds !== 0) setIdleSeconds(0);
                    }}
                    placeholder="// Write pseudo-code, SQL queries, or architecture snippets to accompany your verbal answer..."
                    rows={5}
                    className="w-full rounded-xl bg-[#080808] border border-[#1D1D1D] p-3.5 text-sm font-mono text-[#10B981] placeholder-[#52525B] focus:outline-none focus:border-[#292929]"
                  />
                )}

                <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                  <span className="text-xs text-[#71717A]">
                    Gaps spotted during the interview are automatically added to your Study Plan.
                  </span>
                  <button
                    type="button"
                    onClick={() => submitCandidateTurn(false)}
                    disabled={isAgentThinking || (!candidateInput.trim() && !codeScratchpad.trim())}
                    className="px-4 py-2 rounded-lg bg-[#F5F5F5] hover:bg-[#E4E4E7] disabled:bg-[#121212] disabled:text-[#52525B] disabled:border disabled:border-[#1D1D1D] text-xs font-semibold text-[#000000] transition-colors cursor-pointer shrink-0"
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

