"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Video,
  VideoOff,
  FileCode,
  ChevronDown,
  ChevronUp,
  Loader2,
  Flame,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { clsx } from "clsx";
import { VisualTelemetryAnalyzer, type VisualPostureState } from "@/lib/visual-telemetry";
import {
  getStoredReadinessMilestones,
  setStoredReadinessMilestones,
  logActivity,
} from "@/lib/storage-sync";
import { handleEditorKeyDown, type StudioQuestion } from "./interview-common";
import type { InterviewRoleMeta } from "@/lib/interview-roles";
import type { GitHubGrillAnalysis, ReadinessMilestone } from "@/types";

export interface RepoSummaryInfo {
  fullName: string;
  htmlUrl?: string;
  primaryLanguage?: string;
  filesCount?: number;
  inspectedFiles?: string[];
  architectureSummary?: string;
}

interface GrillTurnCoaching {
  score: number;
  targetFile: string;
  exactFunctionOrStruct?: string;
  strengths: string[];
  howToImproveYourAnswer: string[];
  idealRewrittenAnswer: string;
  addressedConcepts: string[];
  missedConcepts: string[];
}

export interface ProjectGrillTurn {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: string;
  interviewerAction?: string;
  targetFile?: string;
  exactFunctionOrStruct?: string;
  codeExcerpt?: string;
  coaching?: GrillTurnCoaching;
}

interface SkillMatrixEntry {
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
  description: string;
}

interface GrillDebriefReport {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  filesEvaluated: Array<{
    targetFile: string;
    symbol?: string;
    score: number;
    addressedCount: number;
    missedCount: number;
  }>;
  injectedReadinessTasksCount: number;
}

interface LiveProjectGrillRoomProps {
  roleMeta: InterviewRoleMeta;
  githubUrl: string;
  githubAnalysis: GitHubGrillAnalysis | null;
  repoSummary: RepoSummaryInfo | null;
  questions: StudioQuestion[];
  isAnalyzingRepo: boolean;
  langGraphTrace?: string[];
  backHref?: string;
  headerSlot?: React.ReactNode;
}

const ACTION_BADGE_STYLES: Record<string, { label: string; color: string }> = {
  OPENING_QUESTION: {
    label: "⚡ Agent Action: Cross-Examining Repository Code",
    color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  },
  PROBE_CODE_EDGE_CASE: {
    label: "🔍 Agent Action: Probing Code Edge Case & Trade-offs",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  CLARIFY_IMPLEMENTATION: {
    label: "🔥 Agent Action: Challenging Implementation Claims",
    color: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  },
  LEVEL_UP_NEXT_FILE: {
    label: "✅ Agent Action: Verified Code Ownership • Advancing File",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  GIVE_HINT: {
    label: "💡 Agent Action: Providing Directional Code Hint",
    color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  },
  CONCLUDE_INTERVIEW: {
    label: "🏁 Agent Action: Project Grill Concluded & Debrief Ready",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  },
};

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
  if (normalized === "RESUME") return "resume";
  if (normalized === "NETWORK") return "network";
  if (normalized === "APPLICATIONS") return "applications";
  return "interview";
}

function mapTaskPriority(rawPriority?: string): ReadinessMilestone["priority"] {
  const lower = (rawPriority || "").trim().toLowerCase();
  if (lower === "low" || lower === "medium" || lower === "high") return lower;
  return "high";
}

function syncProjectTasksToLocalStorage(newTasks: StudyPlanTaskItem[]) {
  if (typeof window === "undefined" || newTasks.length === 0) return;
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
        id: t.id || `grill-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: t.title,
        category: mapTaskCategoryToMilestone(t.category),
        priority: mapTaskPriority(t.priority),
        description: t.description || "Identified code gap from Project Grill Agent",
        completed: false,
        dueDate: "In 3 days",
      });
    }

    if (formattedNew.length > 0) {
      setStoredReadinessMilestones([...formattedNew, ...existingList]);
      logActivity({
        type: "readiness",
        message: `Project Grill Agent added ${formattedNew.length} study task(s): ${formattedNew
          .map((t) => t.title)
          .join(", ")}`,
      });
    }
  } catch {
    // Ignore localStorage quota failures cleanly
  }
}

function extractRepoDisplayName(
  repoSummary: RepoSummaryInfo | null,
  githubAnalysis: GitHubGrillAnalysis | null,
  githubUrl: string
): string {
  if (repoSummary?.fullName) return repoSummary.fullName;
  if (githubAnalysis?.owner && githubAnalysis?.repoName) {
    return `${githubAnalysis.owner}/${githubAnalysis.repoName}`;
  }
  const cleaned = githubUrl
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
  return cleaned || "GitHub Repository";
}

export default function LiveProjectGrillRoom({
  roleMeta,
  githubUrl,
  githubAnalysis,
  repoSummary,
  questions,
  isAnalyzingRepo,
  langGraphTrace = [],
  backHref = "/interview/resume-grill",
  headerSlot,
}: LiveProjectGrillRoomProps) {
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [followUpDepth, setFollowUpDepth] = useState(0);
  const [candidateLevel, setCandidateLevel] = useState<1 | 2 | 3>(1);
  const [turnNumber, setTurnNumber] = useState(1);

  const [history, setHistory] = useState<ProjectGrillTurn[]>([]);
  const [currentAction, setCurrentAction] = useState("OPENING_QUESTION");
  const [engineNodes, setEngineNodes] = useState<string[]>(langGraphTrace);
  const [storageMode, setStorageMode] = useState<string>("local_file");

  const [candidateInput, setCandidateInput] = useState("");
  const [codeScratchpad, setCodeScratchpad] = useState("");
  const [activeTab, setActiveTab] = useState<"verbal" | "code">("verbal");

  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Code snippet drawer + collapsible ideal defense map
  const [codeSnippetExpanded, setCodeSnippetExpanded] = useState(true);
  const [expandedIdealTurns, setExpandedIdealTurns] = useState<Record<number, boolean>>({});

  // Live Skill Matrix & Study Plan sync
  const [skillMatrix, setSkillMatrix] = useState<SkillMatrixEntry[]>([]);
  const [studyTasksAddedList, setStudyTasksAddedList] = useState<StudyPlanTaskItem[]>([]);
  const [studyPlanNotification, setStudyPlanNotification] = useState<string | null>(null);
  const [evalHistory, setEvalHistory] = useState<
    Array<{
      targetFile: string;
      symbol?: string;
      score: number;
      strengths: string[];
      weaknesses: string[];
    }>
  >([]);
  const [finalReport, setFinalReport] = useState<GrillDebriefReport | null>(null);

  // 30s Proactive Idle Hint Agent
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [showHintOfferPrompt, setShowHintOfferPrompt] = useState(false);
  const [hintOfferedForTurn, setHintOfferedForTurn] = useState(false);
  const [isRequestingHint, setIsRequestingHint] = useState(false);
  const [activeHintBox, setActiveHintBox] = useState<{
    spokenHint: string;
    clueKeywords: string[];
  } | null>(null);

  // Camera & Posture Coach state
  const [cameraActive, setCameraActive] = useState(false);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [liveEyeContact, setLiveEyeContact] = useState<number>(-1);
  const [livePosture, setLivePosture] = useState<VisualPostureState>("Calibrating...");
  const [reticleColor, setReticleColor] = useState<"green" | "amber" | "rose">("green");
  const [visualToast, setVisualToast] = useState<string | null>(null);

  // Refs
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const voiceEnabledRef = useRef(voiceEnabled);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const visualAnalyzerRef = useRef<VisualTelemetryAnalyzer | null>(null);
  const gazeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isAgentThinking, activeHintBox]);

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsAgentSpeaking(false);
  }, []);

  const speakText = useCallback((text: string) => {
    if (!voiceEnabledRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.03;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsAgentSpeaking(true);
    utterance.onend = () => setIsAgentSpeaking(false);
    utterance.onerror = () => setIsAgentSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopCamera = useCallback(() => {
    if (gazeIntervalRef.current) {
      clearInterval(gazeIntervalRef.current);
      gazeIntervalRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
      videoStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (visualAnalyzerRef.current) {
      visualAnalyzerRef.current.reset();
    }
    setCameraActive(false);
    setLiveEyeContact(-1);
    setLivePosture("Calibrating...");
    setVisualToast(null);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setIsRequestingCamera(true);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Webcam access is unavailable in this browser context.");
      setIsRequestingCamera(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      videoStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      if (!visualAnalyzerRef.current) {
        visualAnalyzerRef.current = new VisualTelemetryAnalyzer();
      } else {
        visualAnalyzerRef.current.reset();
      }

      setCameraActive(true);
      gazeIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !visualAnalyzerRef.current) return;
        const frame = visualAnalyzerRef.current.analyzeFrame(videoRef.current);
        setLiveEyeContact(frame.smoothEyeContactPct);
        setLivePosture(frame.posture);
        setReticleColor(frame.hudStatusColor);
        setVisualToast(frame.hudToast);
      }, 100);
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e?.name === "NotReadableError" || e?.name === "TrackStartError") {
        setCameraError("Camera is currently in use by another application.");
      } else if (e?.name === "NotFoundError" || e?.name === "DevicesNotFoundError") {
        setCameraError("No webcam hardware detected on this device.");
      } else {
        setCameraError("Camera permission denied. You can continue cleanly in audio/text mode.");
      }
    } finally {
      setIsRequestingCamera(false);
    }
  }, [stopCamera]);

  // Clean up hardware streams & TTS strictly on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (gazeIntervalRef.current) {
        clearInterval(gazeIntervalRef.current);
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const currentQuestion = questions[currentQIdx] || questions[0];
  const activeTargetFile =
    currentQuestion?.referencedFiles?.[0] ||
    repoSummary?.inspectedFiles?.[0] ||
    "Repository Module";
  const repoDisplayName = extractRepoDisplayName(repoSummary, githubAnalysis, githubUrl);

  // 30-second proactive idle hint timer
  const hasStartedAnswering =
    Boolean(candidateInput.trim()) ||
    Boolean(codeScratchpad.trim()) ||
    isRecording ||
    isTranscribing;
  const shouldTrackIdle =
    interviewStarted &&
    !isAgentThinking &&
    !isAgentSpeaking &&
    !isRequestingHint &&
    !finalReport &&
    history.length > 0 &&
    !hasStartedAnswering &&
    !hintOfferedForTurn;

  useEffect(() => {
    if (!shouldTrackIdle) return;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.min(30, Math.floor((Date.now() - startedAt) / 1000));
      setIdleSeconds(elapsed);
      if (elapsed >= 30) {
        clearInterval(interval);
        setHintOfferedForTurn(true);
        setShowHintOfferPrompt(true);
        speakText(
          "I notice you are taking a moment to inspect the code. Would you like a small directional hint for this module?"
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [shouldTrackIdle, speakText]);

  const startLiveInterview = () => {
    if (!currentQuestion) return;
    const firstFile =
      currentQuestion.referencedFiles?.[0] ||
      repoSummary?.inspectedFiles?.[0] ||
      "Repository Module";

    const openingText = `Let's examine your real implementation in ${firstFile}${
      currentQuestion.exactFunctionOrStruct ? ` (${currentQuestion.exactFunctionOrStruct})` : ""
    }.\n\n${currentQuestion.question}`;

    setInterviewStarted(true);
    setCurrentQIdx(0);
    setFollowUpDepth(0);
    setCandidateLevel(1);
    setTurnNumber(1);
    setCurrentAction("OPENING_QUESTION");
    setEngineNodes(
      langGraphTrace.length > 0
        ? langGraphTrace
        : ["github_source_fetcher", "code_grounding_grill", "live_cross_examiner"]
    );
    setSkillMatrix([]);
    setStudyTasksAddedList([]);
    setStudyPlanNotification(null);
    setEvalHistory([]);
    setFinalReport(null);
    setErrorBanner(null);
    setCandidateInput("");
    setCodeScratchpad("");
    setIdleSeconds(0);
    setShowHintOfferPrompt(false);
    setHintOfferedForTurn(false);
    setActiveHintBox(null);
    setCodeSnippetExpanded(true);
    setExpandedIdealTurns({});

    setHistory([
      {
        role: "interviewer",
        content: openingText,
        timestamp: new Date().toISOString(),
        interviewerAction: "OPENING_QUESTION",
        targetFile: firstFile,
        exactFunctionOrStruct: currentQuestion.exactFunctionOrStruct,
        codeExcerpt: currentQuestion.codeExcerpt,
      },
    ]);

    speakText(
      `Welcome to your ${roleMeta.title} Project Grill on ${repoDisplayName}. Let's start with ${firstFile}. ${currentQuestion.question}`
    );
  };

  const exitLiveRoom = () => {
    stopSpeech();
    stopCamera();
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setInterviewStarted(false);
  };

  const requestSmallHintFromAgent = async () => {
    if (!currentQuestion || isRequestingHint) return;
    setIsRequestingHint(true);
    setShowHintOfferPrompt(false);
    setHintOfferedForTurn(true);
    setIdleSeconds(0);
    setErrorBanner(null);

    try {
      const res = await fetch("/api/interview/github-grill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "REQUEST_PROJECT_HINT",
          targetRole: roleMeta.title,
          currentQuestion: {
            id: currentQuestion.id,
            question: currentQuestion.question,
            targetFile: activeTargetFile,
            referencedFiles: currentQuestion.referencedFiles,
            exactFunctionOrStruct: currentQuestion.exactFunctionOrStruct,
            codeExcerpt: currentQuestion.codeExcerpt,
            hint: currentQuestion.hint,
            keyConceptsToCover: currentQuestion.keyConceptsToCover,
          },
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        storageMode?: string;
        spokenHint?: string;
        clueKeywords?: string[];
      };

      if (!res.ok || !data.success) {
        setErrorBanner(data.error || "Could not generate a directional hint right now.");
        return;
      }

      if (data.storageMode) setStorageMode(data.storageMode);
      const hintText =
        data.spokenHint ||
        currentQuestion.hint ||
        `Trace error propagation, state ownership, and failure bounds inside ${activeTargetFile}.`;
      const clues =
        Array.isArray(data.clueKeywords) && data.clueKeywords.length > 0
          ? data.clueKeywords
          : (currentQuestion.keyConceptsToCover || []).slice(0, 3);

      setCurrentAction("GIVE_HINT");
      setActiveHintBox({ spokenHint: hintText, clueKeywords: clues });
      speakText(`Here is a small directional hint: ${hintText}`);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Network error requesting hint.");
    } finally {
      setIsRequestingHint(false);
    }
  };

  const buildExecutiveDebrief = (
    records: Array<{
      targetFile: string;
      symbol?: string;
      score: number;
      strengths: string[];
      weaknesses: string[];
    }>,
    tasksCount: number
  ): GrillDebriefReport => {
    const scores = records.map((r) => r.score);
    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const strengthSet = Array.from(
      new Set(records.flatMap((r) => r.strengths).filter(Boolean))
    ).slice(0, 6);
    const weaknessSet = Array.from(
      new Set(records.flatMap((r) => r.weaknesses).filter(Boolean))
    ).slice(0, 6);

    return {
      overallScore: avgScore,
      strengths:
        strengthSet.length > 0
          ? strengthSet
          : ["Explained core repository structure and walked through module responsibilities."],
      weaknesses:
        weaknessSet.length > 0
          ? weaknessSet
          : ["Continue stress-testing failure bounds, concurrency edge cases, and recovery paths."],
      filesEvaluated: records.map((r) => ({
        targetFile: r.targetFile,
        symbol: r.symbol,
        score: r.score,
        addressedCount: r.strengths.length,
        missedCount: r.weaknesses.length,
      })),
      injectedReadinessTasksCount: tasksCount,
    };
  };

  const submitCandidateTurn = async (isEndRequested = false) => {
    if (!currentQuestion || isAgentThinking) return;

    const combinedText = [
      candidateInput.trim(),
      codeScratchpad.trim() ? `\n[Code Explanation]:\n${codeScratchpad.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n")
      .trim();

    // Handle concluding immediately when candidate clicks End & Generate Debrief with no pending input
    if (isEndRequested && !combinedText) {
      if (evalHistory.length === 0) {
        setErrorBanner("Submit at least one project defense answer before generating a debrief.");
        return;
      }
      const report = buildExecutiveDebrief(evalHistory, studyTasksAddedList.length);
      setFinalReport(report);
      setCurrentAction("CONCLUDE_INTERVIEW");
      setShowHintOfferPrompt(false);
      setActiveHintBox(null);
      setIdleSeconds(0);
      speakText(
        `Project grill concluded with an overall defense score of ${report.overallScore} out of 100.`
      );
      return;
    }

    if (!combinedText) return;

    // Auto-handle answering "yes" when the 30-second hint offer banner is open
    const normalizedInput = candidateInput.trim().toLowerCase();
    const isAcceptingHintOffer =
      showHintOfferPrompt &&
      !codeScratchpad.trim() &&
      [
        "yes",
        "yes please",
        "yeah",
        "sure",
        "hint",
        "yes hint",
        "give me a hint",
        "i want a hint",
      ].includes(normalizedInput.replace(/[.!?]/g, ""));

    if (isAcceptingHintOffer) {
      setCandidateInput("");
      await requestSmallHintFromAgent();
      return;
    }

    setErrorBanner(null);
    setShowHintOfferPrompt(false);
    setActiveHintBox(null);
    setIdleSeconds(0);

    const candidateTurn: ProjectGrillTurn = {
      role: "candidate",
      content: combinedText,
      timestamp: new Date().toISOString(),
      targetFile: activeTargetFile,
    };

    const nextHistory = [...history, candidateTurn];
    setHistory(nextHistory);
    setCandidateInput("");
    setCodeScratchpad("");
    setIsAgentThinking(true);

    try {
      const res = await fetch("/api/interview/github-grill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "EVALUATE_AND_PROBE_TURN",
          targetRole: roleMeta.title,
          candidateLevel,
          candidateAnswer: combinedText,
          conversationHistory: nextHistory.slice(-6).map((t) => ({
            role: t.role,
            content: t.content,
          })),
          currentQuestion: {
            id: currentQuestion.id,
            question: currentQuestion.question,
            targetFile: activeTargetFile,
            referencedFiles: currentQuestion.referencedFiles,
            exactFunctionOrStruct: currentQuestion.exactFunctionOrStruct,
            codeExcerpt: currentQuestion.codeExcerpt,
            hint: currentQuestion.hint,
            keyConceptsToCover: currentQuestion.keyConceptsToCover,
          },
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        storageMode?: string;
        langGraphTrace?: string[];
        overallScore?: number;
        agentAction?: string;
        nextLevel?: 1 | 2 | 3;
        spokenInterviewerReaction?: string;
        followUpProbeQuestion?: string;
        strengths?: string[];
        howToImproveYourAnswer?: string[];
        idealRewrittenAnswer?: string;
        addressedConcepts?: string[];
        missedConcepts?: string[];
        studyPlanTask?: {
          shouldAdd?: boolean;
          title?: string;
          category?: string;
          priority?: string;
          description?: string;
        };
      };

      if (!res.ok || !data.success) {
        setErrorBanner(data.error || `Evaluation failed (HTTP ${res.status})`);
        setHistory(history);
        setCandidateInput(candidateTurn.content);
        return;
      }

      if (data.storageMode) setStorageMode(data.storageMode);
      if (Array.isArray(data.langGraphTrace) && data.langGraphTrace.length > 0) {
        setEngineNodes(data.langGraphTrace);
      }

      const normalizedScore = normalizeDisplayScore(data.overallScore, 60);
      const rawAction = data.agentAction || "PROBE_CODE_EDGE_CASE";
      const strengths = Array.isArray(data.strengths) ? data.strengths : [];
      const howToImprove = Array.isArray(data.howToImproveYourAnswer)
        ? data.howToImproveYourAnswer
        : [];
      const idealAnswer =
        data.idealRewrittenAnswer ||
        `In ${activeTargetFile}, highlight exact invariants, bounds, and error recovery guarantees around ${
          currentQuestion.exactFunctionOrStruct || "the inspected implementation"
        }.`;
      const addressedConcepts = Array.isArray(data.addressedConcepts) ? data.addressedConcepts : [];
      const missedConcepts = Array.isArray(data.missedConcepts) ? data.missedConcepts : [];

      const reaction =
        data.spokenInterviewerReaction ||
        `Scored ${normalizedScore}/100 on your explanation of ${activeTargetFile}.`;

      // Record Skill Matrix Evidence transition
      const nextTier =
        normalizedScore >= 75 ? "HIGH" : normalizedScore >= 50 ? "MEDIUM" : "LOW";
      setSkillMatrix((prev) => [
        {
          skillName: `${activeTargetFile}${
            currentQuestion.exactFunctionOrStruct ? ` • ${currentQuestion.exactFunctionOrStruct}` : ""
          }`,
          previousTier: followUpDepth === 0 ? "UNVERIFIED" : "PROBING",
          nextTier,
          bluffRisk: normalizedScore < 50,
          verdict: normalizedScore >= 60 ? "POSITIVE" : "NEGATIVE",
          turnScore: normalizedScore,
          citation:
            missedConcepts.length > 0
              ? `Missed: ${missedConcepts.slice(0, 2).join(", ")}`
              : addressedConcepts.length > 0
              ? `Covered: ${addressedConcepts.slice(0, 2).join(", ")}`
              : reaction,
        },
        ...prev,
      ]);

      // Auto-sync gap tasks to localStorage + UI notification
      let updatedTasksCount = studyTasksAddedList.length;
      let addedTaskTitle: string | null = null;
      const shouldAddGapTask = Boolean(data.studyPlanTask?.shouldAdd) || normalizedScore < 72;
      if (shouldAddGapTask && (data.studyPlanTask?.title || missedConcepts.length > 0)) {
        const newTask: StudyPlanTaskItem = {
          id: `grill-gap-${Date.now()}`,
          title:
            data.studyPlanTask?.title?.trim() ||
            `Strengthen ${activeTargetFile}: ${missedConcepts[0] || "Edge-Case Handling"}`,
          category: data.studyPlanTask?.category || "PROJECT_DEEP_DIVE",
          priority:
            data.studyPlanTask?.priority || (normalizedScore < 50 ? "HIGH" : "MEDIUM"),
          description:
            data.studyPlanTask?.description?.trim() ||
            `Review error handling, state ownership, and failure paths inside ${activeTargetFile}.`,
        };
        syncProjectTasksToLocalStorage([newTask]);
        setStudyTasksAddedList((prev) => {
          if (prev.some((t) => t.title.toLowerCase() === newTask.title.toLowerCase())) {
            return prev;
          }
          updatedTasksCount = prev.length + 1;
          return [newTask, ...prev];
        });
        addedTaskTitle = newTask.title;
        setStudyPlanNotification(
          `Study Plan Updated: Added remedial task "${newTask.title}" based on your ${activeTargetFile} defense (${normalizedScore}/100).`
        );
      }

      const updatedEvalRecords = [
        ...evalHistory,
        {
          targetFile: activeTargetFile,
          symbol: currentQuestion.exactFunctionOrStruct,
          score: normalizedScore,
          strengths,
          weaknesses: missedConcepts.length > 0 ? missedConcepts : howToImprove.slice(0, 2),
        },
      ];
      setEvalHistory(updatedEvalRecords);

      if (data.nextLevel === 1 || data.nextLevel === 2 || data.nextLevel === 3) {
        setCandidateLevel(data.nextLevel);
      }

      // Decide next conversational turn: probe deeper on same file once OR advance to next file OR conclude
      const shouldProbeSameFile =
        !isEndRequested &&
        followUpDepth < 1 &&
        (normalizedScore < 75 || rawAction !== "LEVEL_UP_NEXT_FILE");

      const hasNextFile = !isEndRequested && currentQIdx + 1 < questions.length;
      const coachingPayload: GrillTurnCoaching = {
        score: normalizedScore,
        targetFile: activeTargetFile,
        exactFunctionOrStruct: currentQuestion.exactFunctionOrStruct,
        strengths,
        howToImproveYourAnswer: howToImprove,
        idealRewrittenAnswer: idealAnswer,
        addressedConcepts,
        missedConcepts,
      };

      if (shouldProbeSameFile) {
        const probeQ =
          data.followUpProbeQuestion ||
          `Let's stay in ${activeTargetFile}: walk me through what breaks first under concurrency or partial failure here.`;
        const interviewerTurn: ProjectGrillTurn = {
          role: "interviewer",
          content: `${reaction}\n\n${probeQ}`,
          timestamp: new Date().toISOString(),
          interviewerAction: rawAction,
          targetFile: activeTargetFile,
          exactFunctionOrStruct: currentQuestion.exactFunctionOrStruct,
          codeExcerpt: currentQuestion.codeExcerpt,
          coaching: coachingPayload,
        };
        setHistory([...nextHistory, interviewerTurn]);
        setCurrentAction(rawAction);
        setFollowUpDepth(1);
        setTurnNumber((prev) => prev + 1);
        setHintOfferedForTurn(false);
        const speechMsg = addedTaskTitle
          ? `${reaction} Also, I added a task to your Study Plan for ${addedTaskTitle}. ${probeQ}`
          : `${reaction} ${probeQ}`;
        speakText(speechMsg);
      } else if (hasNextFile) {
        const nextIdx = currentQIdx + 1;
        const nextQ = questions[nextIdx];
        const nextFile =
          nextQ.referencedFiles?.[0] || repoSummary?.inspectedFiles?.[nextIdx] || "Next Module";
        const transitionPrompt = `${reaction}\n\nMoving to ${nextFile}${
          nextQ.exactFunctionOrStruct ? ` (${nextQ.exactFunctionOrStruct})` : ""
        }:\n${nextQ.question}`;

        const interviewerTurn: ProjectGrillTurn = {
          role: "interviewer",
          content: transitionPrompt,
          timestamp: new Date().toISOString(),
          interviewerAction: "LEVEL_UP_NEXT_FILE",
          targetFile: nextFile,
          exactFunctionOrStruct: nextQ.exactFunctionOrStruct,
          codeExcerpt: nextQ.codeExcerpt,
          coaching: coachingPayload,
        };
        setHistory([...nextHistory, interviewerTurn]);
        setCurrentQIdx(nextIdx);
        setFollowUpDepth(0);
        setCurrentAction("LEVEL_UP_NEXT_FILE");
        setTurnNumber((prev) => prev + 1);
        setHintOfferedForTurn(false);
        setCodeSnippetExpanded(true);
        const speechMsg = addedTaskTitle
          ? `${reaction} I also added ${addedTaskTitle} to your Study Plan. Moving to ${nextFile}. ${nextQ.question}`
          : `${reaction} Now let's examine ${nextFile}. ${nextQ.question}`;
        speakText(speechMsg);
      } else {
        const conclusionTurn: ProjectGrillTurn = {
          role: "interviewer",
          content: `${reaction}\n\nThat concludes our deep code-level defense across your inspected repository files. Your Executive Debrief is ready below.`,
          timestamp: new Date().toISOString(),
          interviewerAction: "CONCLUDE_INTERVIEW",
          targetFile: activeTargetFile,
          coaching: coachingPayload,
        };
        const report = buildExecutiveDebrief(updatedEvalRecords, updatedTasksCount);
        setHistory([...nextHistory, conclusionTurn]);
        setCurrentAction("CONCLUDE_INTERVIEW");
        setTurnNumber((prev) => prev + 1);
        setFinalReport(report);
        speakText(
          `${reaction} That wraps up your Project Grill with an overall score of ${report.overallScore} out of 100.`
        );
      }
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : "Network error communicating with Project Grill agent."
      );
      setHistory(history);
      setCandidateInput(candidateTurn.content);
    } finally {
      setIsAgentThinking(false);
    }
  };

  const toggleMicrophone = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    setErrorBanner(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorBanner("Microphone recording is unavailable in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
        if (audioChunksRef.current.length === 0) return;

        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", audioBlob, "project-defense.webm");
        formData.append("role", roleMeta.title);
        if (currentQuestion?.question) {
          formData.append("questionContext", currentQuestion.question.slice(0, 300));
        }
        if (currentQuestion?.keyConceptsToCover?.length) {
          formData.append("keyConcepts", currentQuestion.keyConceptsToCover.join(", "));
        }

        try {
          const res = await fetch("/api/interview/transcribe", {
            method: "POST",
            body: formData,
          });
          const data = (await res.json()) as {
            transcript?: string;
            text?: string;
            error?: string;
          };
          const transcribed = (data.transcript || data.text || "").trim();
          if (transcribed) {
            setCandidateInput((prev) => (prev ? `${prev} ${transcribed}` : transcribed));
            setIdleSeconds(0);
          } else if (data.error) {
            setErrorBanner(`Transcription error: ${data.error}`);
          }
        } catch (err: unknown) {
          setErrorBanner(
            `Transcription failed: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setIdleSeconds(0);
    } catch (err: unknown) {
      setErrorBanner(
        `Microphone access unavailable: ${err instanceof Error ? err.message : "Permission denied"}`
      );
    }
  };

  // ─── GATE 1 & GATE 2: Pre-Interview Header + Strict GitHub Gate / Launch Card ───
  if (!interviewStarted) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#F5F5F5] p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1D1D1D] pb-4">
            <div className="flex items-center gap-3">
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121212] border border-[#292929] text-xs text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change Role
              </Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-[#F5F5F5]">
                    {roleMeta.title} Project Grill
                  </h1>
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    🔥 Deep Grill Mode
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA]">
                  Real repository source-code inspection • Live conversational AI defense • Auto Study-Plan sync
                </p>
              </div>
            </div>
          </div>

          {/* GitHub Repository Deep-Grill Analyzer Header Slot */}
          {headerSlot}

          {/* Gate: Require Repo Scan Before Launching Interview */}
          {isAnalyzingRepo && questions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#0D0D0D] border border-[#1D1D1D] text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#A78BFA] animate-spin mx-auto" />
              <h2 className="text-base font-bold text-[#F5F5F5]">
                Downloading Real Repository Files &amp; Grounding Grill Questions...
              </h2>
              <p className="text-xs text-[#A1A1AA] max-w-lg mx-auto">
                Selecting core C/C++/TypeScript/Python modules (excluding noise/test files) and extracting exact functions &amp; code excerpts.
              </p>
            </div>
          ) : questions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#0D0D0D] border border-[#1D1D1D] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#121212] border border-[#292929] flex items-center justify-center mx-auto text-xl">
                🔒
              </div>
              <h2 className="text-base font-bold text-[#F5F5F5]">
                Upload Your GitHub Repository Link Above to Begin
              </h2>
              <p className="text-xs text-[#A1A1AA] max-w-lg mx-auto leading-relaxed">
                No generic or hallucinated questions will be loaded. Paste any public GitHub URL above (such as <span className="font-mono text-[#F5F5F5]">dawdameet/july</span> or your own project) and click <span className="font-semibold text-[#F5F5F5]">Generate Resume Project Grill Questions</span> to launch the Live Autonomous Interviewer.
              </p>
            </div>
          ) : (
            <div className="p-7 rounded-2xl bg-[#0D0D0D] border border-indigo-500/35 space-y-5 shadow-[0_0_40px_rgba(99,102,241,0.08)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300">
                    <Flame className="w-4 h-4" />
                    <span>Code-Grounded Autonomous Room Prepared</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#F5F5F5]">
                    Ready for Your Technical Grill?
                  </h2>
                  <p className="text-xs text-[#A1A1AA] max-w-2xl leading-relaxed">
                    Your AI Bar-Raiser Agent is armed with <span className="font-semibold text-[#F5F5F5]">{questions.length} verified source-code challenges</span> across <span className="font-mono text-emerald-300">{repoDisplayName}</span> and will dynamically probe edge cases, evaluate your explanations line-by-line, and sync missed gaps to your Study Plan.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={startLiveInterview}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-500/25 cursor-pointer shrink-0"
                >
                  Start Live Autonomous Project Interview →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] text-xs">
                  <div className="text-[#71717A] text-[10px] uppercase font-semibold">Transcript Loop</div>
                  <div className="text-[#F5F5F5] font-medium mt-0.5">Live Multi-Turn Probe</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] text-xs">
                  <div className="text-[#71717A] text-[10px] uppercase font-semibold">Camera &amp; Framing</div>
                  <div className="text-[#F5F5F5] font-medium mt-0.5">Optional Posture Coach</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] text-xs">
                  <div className="text-[#71717A] text-[10px] uppercase font-semibold">Stuck Safeguard</div>
                  <div className="text-[#F5F5F5] font-medium mt-0.5">30s Proactive Hint Agent</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] text-xs">
                  <div className="text-[#71717A] text-[10px] uppercase font-semibold">Remediation</div>
                  <div className="text-[#F5F5F5] font-medium mt-0.5">Auto Study-Plan Sync</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── ACTIVE LIVE CONVERSATIONAL PROJECT INTERVIEWER ROOM ───
  const latestInterviewerTurn = [...history].reverse().find((m) => m.role === "interviewer");
  const badgeMeta = ACTION_BADGE_STYLES[currentAction] || ACTION_BADGE_STYLES.OPENING_QUESTION;

  return (
    <div className="min-h-screen bg-[#000000] text-[#F5F5F5] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1D1D1D] pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={exitLiveRoom}
              className="px-3 py-1.5 rounded-lg bg-[#121212] border border-[#292929] text-xs text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] cursor-pointer transition-colors"
            >
              ← Exit Room
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#F5F5F5] flex items-center gap-2 flex-wrap">
                Live Autonomous Project Interviewer
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {roleMeta.title}
                </span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  🐙 {repoDisplayName}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#121212] text-[#A78BFA] border border-[#292929]">
                  LangChain.js Code-Grounded Agent
                </span>
              </h1>
              <p className="text-xs text-[#A1A1AA]">
                Real source-code cross-examination • Posture Coach • 30s Proactive Hint • Auto Study-Plan Sync ({storageMode === "supabase" ? "Supabase" : "Local Store"})
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
              Turn {turnNumber} • File {currentQIdx + 1}/{questions.length}
            </span>
            <button
              type="button"
              onClick={() => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                if (!next) stopSpeech();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                voiceEnabled
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                  : "bg-[#121212] text-[#A1A1AA] border-[#292929]"
              }`}
            >
              {voiceEnabled ? "🔊 Interviewer Voice ON" : "🔇 Voice Muted"}
            </button>
            {!finalReport && evalHistory.length > 0 && (
              <button
                type="button"
                onClick={() => submitCandidateTurn(true)}
                disabled={isAgentThinking}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 disabled:opacity-40 cursor-pointer"
              >
                End &amp; Generate Debrief
              </button>
            )}
          </div>
        </div>

        {/* Live Study Plan Notification Toast */}
        {studyPlanNotification && (
          <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="text-base">✅</span>
              <span className="font-medium leading-relaxed">{studyPlanNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setStudyPlanNotification(null)}
              className="shrink-0 px-2.5 py-1 rounded bg-emerald-900/60 text-emerald-300 hover:text-white text-[11px] cursor-pointer"
            >
              Got it
            </button>
          </div>
        )}

        {/* Honest Error Banner */}
        {errorBanner && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-sm flex items-center justify-between gap-3">
            <span>⚠️ {errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-xs underline text-rose-300 hover:text-white cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main 2-Column Conversational Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ─── LEFT COLUMN (5 cols): Persona/Webcam Coach + Active Prompt + Real Code Snippet + Live Matrix ─── */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#1D1D1D] flex flex-col items-center text-center space-y-4">
              {/* Camera & Posture Coach Header Controls */}
              <div className="w-full flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  {cameraActive ? "Live Camera & Posture Coach" : "AI Interviewer Presence"}
                </span>
                <button
                  type="button"
                  onClick={cameraActive ? stopCamera : startCamera}
                  disabled={isRequestingCamera}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium border inline-flex items-center gap-1.5 cursor-pointer transition-colors",
                    cameraActive
                      ? "bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25"
                      : "bg-[#121212] text-[#F5F5F5] border-[#292929] hover:bg-[#1A1A1A]"
                  )}
                >
                  {isRequestingCamera ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : cameraActive ? (
                    <VideoOff className="w-3.5 h-3.5" />
                  ) : (
                    <Video className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>
                    {cameraActive ? "Turn Off Camera" : "Turn On Camera (Posture Coach)"}
                  </span>
                </button>
              </div>

              {cameraError && (
                <div className="w-full text-left px-3 py-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200">
                  {cameraError}
                </div>
              )}

              {/* Webcam Video Box OR AI Persona Orb */}
              <div className={clsx("w-full", cameraActive ? "block" : "hidden")}>
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-[#050505] border border-[#292929]">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover -scale-x-100"
                  />

                  <div className="absolute top-2 inset-x-2 flex items-center justify-between text-[10px] font-mono pointer-events-none">
                    <div className="flex items-center gap-1.5 bg-[#050505]/90 px-2 py-0.5 rounded-full border border-[#292929] text-[#F5F5F5]">
                      <span
                        className={clsx(
                          "w-1.5 h-1.5 rounded-full",
                          reticleColor === "green"
                            ? "bg-emerald-400 animate-pulse"
                            : reticleColor === "amber"
                            ? "bg-amber-400"
                            : "bg-rose-400 animate-ping"
                        )}
                      />
                      <span>
                        Eye Contact: {liveEyeContact >= 0 ? `${liveEyeContact}%` : "Scanning..."}
                      </span>
                    </div>
                    <div className="bg-[#050505]/90 px-2 py-0.5 rounded-full border border-[#292929] text-[#F5F5F5]">
                      Posture: {livePosture}
                    </div>
                  </div>

                  {/* Center Eye-Line Guide Box */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div
                      className={clsx(
                        "w-32 h-28 rounded-2xl border border-dashed flex flex-col items-center pt-4 transition-colors",
                        reticleColor === "green"
                          ? "border-emerald-400/50"
                          : reticleColor === "amber"
                          ? "border-amber-400/60"
                          : "border-rose-400/60"
                      )}
                    >
                      <div className="w-16 border-t border-cyan-400/50 text-[8px] font-mono uppercase tracking-wider text-cyan-300/80 text-center pt-0.5">
                        Eye Line
                      </div>
                    </div>
                  </div>

                  {visualToast && (
                    <div className="absolute bottom-2 left-2 right-2 pointer-events-none text-left">
                      <span className="inline-block max-w-full truncate px-2 py-0.5 rounded bg-[#050505]/90 border border-[#292929] text-[10px] text-[#E4E4E7]">
                        {visualToast}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {!cameraActive && (
                <div className="py-2 flex flex-col items-center space-y-2">
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
                </div>
              )}

              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${badgeMeta.color}`}>
                {badgeMeta.label}
              </div>

              {engineNodes.length > 0 && (
                <div className="w-full text-left px-3 py-2 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#A78BFA]">
                    Agent Execution Trace
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {engineNodes.map((node, idx) => (
                      <span key={`${node}-${idx}`} className="inline-flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-[#121212] border border-[#292929] text-[10px] font-mono text-[#F5F5F5]">
                          {node}
                        </span>
                        {idx < engineNodes.length - 1 && (
                          <span className="text-[10px] text-[#52525B] font-mono">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Prompt */}
              <div className="w-full text-left p-4 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D]">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-[#71717A]">
                    Current Interviewer Prompt
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                    {activeTargetFile}
                  </span>
                </div>
                <p className="text-sm text-[#F5F5F5] leading-relaxed">
                  {isAgentThinking
                    ? `Evaluating your defense against actual code in ${activeTargetFile}...`
                    : latestInterviewerTurn?.content || currentQuestion?.question}
                </p>
              </div>

              {/* Collapsible Real Repository Code Snippet Box */}
              {currentQuestion?.codeExcerpt && (
                <div className="w-full text-left rounded-xl bg-[#080808] border border-emerald-500/30 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCodeSnippetExpanded((prev) => !prev)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 bg-emerald-950/25 hover:bg-emerald-950/35 text-xs transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-mono text-emerald-300 truncate">
                      <FileCode className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Code Inspected in {activeTargetFile}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {currentQuestion.exactFunctionOrStruct && (
                        <span className="px-2 py-0.5 rounded bg-[#121212] border border-[#292929] text-[10px] font-mono text-amber-300">
                          {currentQuestion.exactFunctionOrStruct}
                        </span>
                      )}
                      {codeSnippetExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#A1A1AA]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#A1A1AA]" />
                      )}
                    </span>
                  </button>
                  {codeSnippetExpanded && (
                    <pre className="p-3.5 text-[11px] font-mono text-[#E4E4E7] overflow-x-auto max-h-52 leading-relaxed border-t border-[#1D1D1D]">
                      <code>{currentQuestion.codeExcerpt}</code>
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Live Skill Matrix & Study Plan Updates */}
            <div className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#1D1D1D] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Live Skill Matrix &amp; Study Plan Updates
                </h3>
                <span className="text-xs text-[#A78BFA] font-mono">
                  {skillMatrix.length} skills • {studyTasksAddedList.length} tasks
                </span>
              </div>

              {skillMatrix.length === 0 && studyTasksAddedList.length === 0 ? (
                <p className="text-xs text-[#71717A]">
                  As you defend each module, the agent verifies code-level mastery and automatically adds remedial tasks to your Study Plan whenever gaps appear.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {studyTasksAddedList.map((task) => (
                    <div
                      key={task.id}
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

                  {skillMatrix.map((m, idx) => (
                    <div
                      key={`skill-${idx}`}
                      className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold gap-2">
                        <span className="text-[#F5F5F5] truncate font-mono text-[11px]">
                          {m.skillName}
                        </span>
                        <span
                          className={
                            m.verdict === "POSITIVE" ? "text-emerald-400 shrink-0" : "text-rose-400 shrink-0"
                          }
                        >
                          {m.previousTier} → {m.nextTier} ({m.turnScore}/100)
                        </span>
                      </div>
                      {m.bluffRisk && (
                        <div className="text-[11px] text-amber-400 font-medium">
                          ⚠️ Code Gap Flagged — Review edge cases &amp; real implementation details
                        </div>
                      )}
                      <p className="text-[#A1A1AA]">{m.citation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT COLUMN (7 cols): Scrollable Chat Transcript + 30s Hint Offer + Composer / Debrief ─── */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Multi-Turn Conversational Transcript */}
            <div className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#1D1D1D] h-[400px] overflow-y-auto space-y-4">
              {history.map((turn, i) => {
                const isIdealOpen = Boolean(expandedIdealTurns[i]);
                return (
                  <div
                    key={i}
                    className={`flex flex-col ${
                      turn.role === "candidate" ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="text-[11px] text-[#71717A] mb-1 px-1 flex items-center gap-1.5 flex-wrap">
                      <span>
                        {turn.role === "interviewer" ? "AI Bar-Raiser Agent" : "You (Candidate)"}
                      </span>
                      {turn.targetFile && (
                        <span className="font-mono text-[10px] text-emerald-400">
                          • {turn.targetFile}
                        </span>
                      )}
                      {turn.interviewerAction && (
                        <span className="text-[10px] text-[#A1A1AA]">
                          • {turn.interviewerAction}
                        </span>
                      )}
                    </div>

                    <div
                      className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-3 ${
                        turn.role === "interviewer"
                          ? "bg-[#121212] border border-[#1D1D1D] text-[#F5F5F5]"
                          : "bg-indigo-600/20 border border-indigo-500/40 text-indigo-100"
                      }`}
                    >
                      {/* Inline Code-Grounded Coaching Card Inside Evaluated Interviewer Turns */}
                      {turn.coaching && (
                        <div className="p-3 rounded-xl bg-[#080808] border border-[#292929] space-y-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-semibold text-[#F5F5F5]">
                              📊 Previous Answer Score:{" "}
                              <span
                                className={
                                  turn.coaching.score >= 75
                                    ? "text-emerald-400"
                                    : turn.coaching.score >= 50
                                    ? "text-amber-400"
                                    : "text-rose-400"
                                }
                              >
                                {turn.coaching.score}/100
                              </span>
                            </span>
                            <span className="font-mono text-[10px] text-[#A1A1AA]">
                              {turn.coaching.targetFile}
                            </span>
                          </div>

                          {turn.coaching.howToImproveYourAnswer.length > 0 && (
                            <div className="space-y-1">
                              <div className="font-semibold text-amber-300 text-[11px]">
                                🛠️ How to Improve Your Previous Answer
                              </div>
                              <ul className="list-disc list-inside space-y-0.5 text-[#D4D4D8] text-[11px]">
                                {turn.coaching.howToImproveYourAnswer.map((tip, tipIdx) => (
                                  <li key={tipIdx}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {(turn.coaching.addressedConcepts.length > 0 ||
                            turn.coaching.missedConcepts.length > 0) && (
                            <div className="flex flex-wrap gap-1.5">
                              {turn.coaching.addressedConcepts.slice(0, 3).map((c, idx) => (
                                <span
                                  key={`ok-${idx}`}
                                  className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                >
                                  ✓ {c}
                                </span>
                              ))}
                              {turn.coaching.missedConcepts.slice(0, 3).map((c, idx) => (
                                <span
                                  key={`miss-${idx}`}
                                  className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                >
                                  ✕ Missed: {c}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedIdealTurns((prev) => ({
                                  ...prev,
                                  [i]: !prev[i],
                                }))
                              }
                              className="text-[11px] font-medium text-indigo-300 hover:text-indigo-200 underline cursor-pointer"
                            >
                              {isIdealOpen
                                ? "Hide 95/100 Model Project Defense"
                                : "✨ View 95/100 Model Project Defense"}
                            </button>
                            {isIdealOpen && (
                              <p className="mt-1.5 p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-[11px] text-indigo-100 leading-relaxed whitespace-pre-wrap">
                                {turn.coaching.idealRewrittenAnswer}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="whitespace-pre-wrap">{turn.content}</div>
                    </div>
                  </div>
                );
              })}

              {isAgentThinking && (
                <div className="text-xs text-amber-300 animate-pulse flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    AI Bar-Raiser is grading your defense against actual code in {activeTargetFile} &amp; preparing follow-up...
                  </span>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* 30-Second Proactive Hint Offer Prompt */}
            {showHintOfferPrompt && !finalReport && (
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/50 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-cyan-300">
                    💡 30s Thinking Pause Detected — Need a Small Hint?
                  </div>
                  <p className="text-xs text-[#A1A1AA]">
                    Want a directional nudge inside <span className="font-mono text-[#F5F5F5]">{activeTargetFile}</span>? (Click Yes or type &ldquo;Yes&rdquo;)
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

            {/* Active Small Hint Box */}
            {activeHintBox && !finalReport && (
              <div className="p-4 rounded-2xl bg-[#0D0D0D] border border-cyan-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-300">
                    💡 Directional Code Hint ({activeTargetFile})
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

            {/* Composer Box OR Final Executive Debrief */}
            {finalReport ? (
              <div className="p-6 rounded-2xl bg-[#0D0D0D] border border-indigo-500/40 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#F5F5F5]">
                      🏁 Project Defense Executive Debrief
                    </h2>
                    <p className="text-xs text-[#A1A1AA]">
                      Repository: <span className="font-mono text-emerald-300">{repoDisplayName}</span>
                    </p>
                  </div>
                  <span className="px-3.5 py-1 rounded-full text-sm font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Overall Score: {finalReport.overallScore}/100
                  </span>
                </div>

                {studyTasksAddedList.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                    <div className="font-semibold">
                      ✅ Study Plan Updated: Added {studyTasksAddedList.length} targeted task(s) from this Project Grill
                    </div>
                    <ul className="list-disc list-inside text-emerald-200/90">
                      {studyTasksAddedList.map((t) => (
                        <li key={t.id}>{t.title}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {finalReport.filesEvaluated.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {finalReport.filesEvaluated.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-mono text-[#F5F5F5] truncate">{f.targetFile}</div>
                          {f.symbol && (
                            <div className="text-[10px] font-mono text-[#A78BFA] truncate">
                              {f.symbol}
                            </div>
                          )}
                        </div>
                        <span
                          className={`font-bold shrink-0 ${
                            f.score >= 75
                              ? "text-emerald-400"
                              : f.score >= 50
                              ? "text-amber-400"
                              : "text-rose-400"
                          }`}
                        >
                          {f.score}/100
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D]">
                    <div className="font-semibold text-emerald-400 mb-2">Verified Strengths</div>
                    <ul className="list-disc list-inside space-y-1 text-[#A1A1AA]">
                      {finalReport.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D]">
                    <div className="font-semibold text-rose-400 mb-2">Identified Code Gaps</div>
                    <ul className="list-disc list-inside space-y-1 text-[#A1A1AA]">
                      {finalReport.weaknesses.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={exitLiveRoom}
                    className="px-4 py-2 rounded-xl bg-[#121212] border border-[#292929] text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] cursor-pointer"
                  >
                    Switch Repository
                  </button>
                  <button
                    type="button"
                    onClick={startLiveInterview}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restart Project Grill
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#1D1D1D] space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
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
                      type="button"
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
                    type="button"
                    onClick={toggleMicrophone}
                    disabled={isTranscribing}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      isRecording
                        ? "bg-rose-600 text-white animate-pulse"
                        : isTranscribing
                        ? "bg-amber-600/20 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30"
                    }`}
                  >
                    {isTranscribing
                      ? "⏳ Transcribing Voice..."
                      : isRecording
                      ? "⏹ Stop Speaking (Transcribe)"
                      : "🎙️ Speak Answer"}
                  </button>
                </div>

                {activeTab === "verbal" ? (
                  <textarea
                    value={candidateInput}
                    onChange={(e) => {
                      setCandidateInput(e.target.value);
                      if (idleSeconds !== 0) setIdleSeconds(0);
                    }}
                    placeholder={`Defend your design in ${activeTargetFile} — explain invariants, edge cases, and trade-offs (or use 🎙️ Speak Answer)...`}
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
                    onKeyDown={(e) => handleEditorKeyDown(e, codeScratchpad, setCodeScratchpad)}
                    placeholder={`// Refactor or trace logic from ${activeTargetFile} (${currentQuestion?.exactFunctionOrStruct || "core module"})...`}
                    rows={5}
                    className="w-full rounded-xl bg-[#080808] border border-[#1D1D1D] p-3.5 text-sm font-mono text-emerald-300 placeholder-[#52525B] focus:outline-none focus:border-[#292929]"
                  />
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-[#71717A]">
                    Weak concepts spotted during code cross-examination automatically sync to your Study Plan.
                  </span>
                  <button
                    type="button"
                    onClick={() => submitCandidateTurn(false)}
                    disabled={
                      isAgentThinking ||
                      isTranscribing ||
                      (!candidateInput.trim() && !codeScratchpad.trim())
                    }
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    {isAgentThinking ? "Agent Grading Code Defense..." : "Send Reply to Interviewer →"}
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

