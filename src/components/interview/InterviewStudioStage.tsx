"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import {
  getInterviewQuestions,
  getPastInterviewSessions,
  evaluateInterviewAnswer,
  recordInterviewSession,
} from "@/lib/services/interview.service";
import {
  INTERVIEW_ROLES,
  EXPANDED_CATEGORIES,
  getRoleInterviewQuestions,
} from "@/lib/interview-questions";
import { getBaselineAsStudioQuestions } from "@/lib/interview/role-baseline-questions";
import type {
  InterviewQuestion,
  InterviewSession,
  InterviewCategory,
  InterviewEvaluationResponse,
  InterviewTurn,
  ReadinessMilestone,
} from "@/types";
import {
  getStoredReadinessMilestones,
  setStoredReadinessMilestones,
  logActivity,
} from "@/lib/storage-sync";
import {
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  Mic,
  MicOff,
  Star,
  Clock,
  TrendingUp,
  Brain,
  Loader2,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Target,
  Trophy,
  X,
  Code2,
  ArrowLeft,
  Award,
  CheckCircle2,
  AlertCircle,
  Activity,
  FileCode,
  ArrowRight,
  BrainCircuit,
  Flame,
  ShieldAlert,
  Zap,
  Rocket,
  Lock,
} from "lucide-react";
import { clsx } from "clsx";
import { useAgent } from "@/context/AgentProvider";
import { VisualTelemetryAnalyzer, type VisualPostureState } from "@/lib/visual-telemetry";
import {
  type StudioQuestion,
  type SpeechRecognitionLike,
  type SpeechRecognitionConstructor,
  CATEGORY_CONFIG,
  DIFFICULTY_COLOR,
  FILLER_WORDS_LIST,
  getQuestionExpectedConcepts,
  CODE_LANGUAGES,
  isConceptCovered,
  handleEditorKeyDown,
} from "./interview-common";

interface GrillThreadTurn {
  role: "interviewer" | "candidate";
  content: string;
  actionBadge?: string;
}

function mapGrillTaskCategory(rawCategory?: string): ReadinessMilestone["category"] {
  const upper = (rawCategory || "").trim().toUpperCase();
  if (upper.includes("PROJECT") || upper.includes("SYSTEM")) return "skills";
  if (upper.includes("RESUME")) return "resume";
  return "interview";
}

function mapGrillTaskPriority(rawPriority?: string): ReadinessMilestone["priority"] {
  const lower = (rawPriority || "").trim().toLowerCase();
  if (lower === "low" || lower === "medium" || lower === "high") return lower;
  return "high";
}

function syncGrillStudyPlanGapTask(task: {
  title?: string;
  category?: string;
  priority?: string;
  description?: string;
}): boolean {
  if (typeof window === "undefined" || !task?.title) return false;
  try {
    const existingList = getStoredReadinessMilestones();
    const normalizedTitle = task.title.trim().toLowerCase();
    if (existingList.some((item) => item.title.trim().toLowerCase() === normalizedTitle)) {
      return false;
    }
    const newItem: ReadinessMilestone = {
      id: `grill-gap-${Date.now()}`,
      title: task.title.trim(),
      category: mapGrillTaskCategory(task.category),
      priority: mapGrillTaskPriority(task.priority),
      description: task.description || "Identified during GitHub Project Deep-Grill",
      completed: false,
      dueDate: "In 3 days",
    };
    setStoredReadinessMilestones([newItem, ...existingList]);
    logActivity({
      type: "readiness",
      message: `Project Grill Agent added study task: ${newItem.title}`,
    });
    return true;
  } catch {
    return false;
  }
}

interface InterviewStudioStageProps {
  mode: "bank" | "grill" | "custom";
  initialRole?: string;
  initialCategory?: "all" | InterviewCategory;
  initialQuestions?: StudioQuestion[];
  backHref?: string;
  pageTitle: string;
  pageSubtitle: string;
  badgeLabel?: string;
  badgeVariant?: "indigo" | "amber" | "emerald" | "violet" | "rose";
  headerSlot?: React.ReactNode;
  showRoleSelector?: boolean;
  showCategoryFilters?: boolean;
  requireManualStart?: boolean;
  startCardIcon?: "brain" | "flame";
  startCardTitle?: string;
  startCardDescription?: string;
  startCardIndicators?: Array<{ label: string; dotColor: string }>;
  onQuestionsChange?: (questions: StudioQuestion[]) => void;
}

export default function InterviewStudioStage({
  mode,
  initialRole = "Full-Stack SDE",
  initialCategory = "all",
  initialQuestions,
  backHref = "/interview",
  pageTitle,
  pageSubtitle,
  badgeLabel,
  badgeVariant = "indigo",
  headerSlot,
  showRoleSelector = true,
  showCategoryFilters = true,
  requireManualStart = false,
  startCardIcon,
  startCardTitle,
  startCardDescription,
  startCardIndicators,
  onQuestionsChange,
}: InterviewStudioStageProps) {
  // ─── Core Data State ────────────────────────────────────────────────────────
  const buildRoleQuestionPool = useCallback(
    (roleTitle: string, targetMode: "bank" | "grill" | "custom"): StudioQuestion[] => {
      if (targetMode === "grill") {
        return getBaselineAsStudioQuestions(roleTitle, "grill");
      }
      if (targetMode === "custom") {
        return [];
      }
      const baseline = getBaselineAsStudioQuestions(roleTitle, "bank");
      const curated = getRoleInterviewQuestions(roleTitle, "all");
      const seenIds = new Set(baseline.map((q) => q.id));
      return [...baseline, ...curated.filter((q) => !seenIds.has(q.id))];
    },
    []
  );

  const [questions, setQuestions] = useState<StudioQuestion[]>(() => {
    if (initialQuestions && initialQuestions.length > 0) return initialQuestions;
    if (mode === "grill") return [];
    if (mode === "custom") return [];
    const baseline = getBaselineAsStudioQuestions(initialRole, "bank");
    const curated = getRoleInterviewQuestions(initialRole, "all");
    const seenIds = new Set(baseline.map((q) => q.id));
    return [...baseline, ...curated.filter((q) => !seenIds.has(q.id))];
  });
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Adaptive Difficulty State ──────────────────────────────────────────────
  const [candidateLevel, setCandidateLevel] = useState<1 | 2 | 3>(1);
  const [levelUpBanner, setLevelUpBanner] = useState<{
    decision: "LEVEL_UP_HARDER_QUESTION" | "PROBE_CURRENT_LEVEL" | "CALIBRATE_FOUNDATION";
    score: number;
    previousLevel: 1 | 2 | 3;
    nextLevel: 1 | 2 | 3;
    reaction?: string;
    hasNextQuestion: boolean;
  } | null>(null);

  // ─── Studio Configuration State ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"practice" | "history">("practice");
  const [selectedRole, setSelectedRole] = useState<string>(initialRole);
  const [interviewLifecycle, setInterviewLifecycle] = useState<"preparing" | "initializing" | "active" | "completed">(
    requireManualStart ? "preparing" : "active"
  );
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeakingTTS, setIsSpeakingTTS] = useState(false);
  const [filterCategory, setFilterCategory] = useState<"all" | InterviewCategory>(initialCategory);
  const [currentIdx, setCurrentIdx] = useState(0);

  // ─── Non-DSA Workspace Tab (Verbal vs Code IDE) ─────────────────────────────
  const [nonDsaWorkspaceTab, setNonDsaWorkspaceTab] = useState<"verbal" | "ide">("verbal");

  // ─── Active Turn & Response State ───────────────────────────────────────────
  const { digitalTwin, bluffRiskCount, triggerAgent } = useAgent();
  const [response, setResponse] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribingWithWhisper, setIsTranscribingWithWhisper] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [liveWpm, setLiveWpm] = useState(0);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);
  const [fillerCounts, setFillerCounts] = useState<Record<string, number>>({});
  const [isHesitating, setIsHesitating] = useState(false);
  const [hesitationGaps, setHesitationGaps] = useState(0);
  const [recordingStatusBadge, setRecordingStatusBadge] = useState<string | null>(null);
  const [micActiveLevel, setMicActiveLevel] = useState<number>(0);
  const [isRecordingPaused, setIsRecordingPaused] = useState<boolean>(false);
  const [scratchpadLang, setScratchpadLang] = useState<string>("typescript");

  // ─── Multi-Turn & Codebase Grill Agent State ─────────────────────────────────
  const [sessionTurns, setSessionTurns] = useState<InterviewTurn[]>([]);
  const [currentTurnOrder, setCurrentTurnOrder] = useState(1);
  const [showCodeExcerpt, setShowCodeExcerpt] = useState<boolean>(true);
  const [grillThread, setGrillThread] = useState<GrillThreadTurn[]>([]);
  const [agentActionLabel, setAgentActionLabel] = useState<string>(
    "⚡ Agent Action: Cross-Examining Repo File"
  );
  const [idleSeconds, setIdleSeconds] = useState<number>(0);
  const [showIdleHintOffer, setShowIdleHintOffer] = useState<boolean>(false);
  const [hintOfferedThisQuestion, setHintOfferedThisQuestion] = useState<boolean>(false);
  const [isLoadingAgentHint, setIsLoadingAgentHint] = useState<boolean>(false);
  const [agentHintCard, setAgentHintCard] = useState<{
    spokenHint: string;
    clueKeywords: string[];
  } | null>(null);
  const [studyPlanToast, setStudyPlanToast] = useState<string | null>(null);

  // ─── Camera & Video State ───────────────────────────────────────────────────
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const [cameraErrorInfo, setCameraErrorInfo] = useState<{
    type: "denied" | "in_use" | "not_found" | "unsupported";
    message: string;
  } | null>(null);
  const [isVirtualCamera, setIsVirtualCamera] = useState(false);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [liveEyeContact, setLiveEyeContact] = useState<number>(-1);
  const [livePosture, setLivePosture] = useState<VisualPostureState>("Stable");
  const [reticleColor, setReticleColor] = useState<"green" | "amber" | "rose">("green");
  const [visualToast, setVisualToast] = useState<string | null>(null);

  // ─── Evaluation State ───────────────────────────────────────────────────────
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<InterviewEvaluationResponse | null>(null);
  const [copiedAnswer, setCopiedAnswer] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // ─── Refs for Audio/Video/Telemetry Streams ─────────────────────────────────
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const virtualAnimRef = useRef<number | null>(null);
  const visualAnalyzerRef = useRef<VisualTelemetryAnalyzer | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const gazeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const lastSpokenTimestampRef = useRef<number>(0);
  const evaluationRef = useRef<HTMLDivElement | null>(null);

  // Synchronize when external questions change without cascading effects
  const [prevInitialQuestions, setPrevInitialQuestions] = useState(initialQuestions);
  if (initialQuestions !== prevInitialQuestions) {
    setPrevInitialQuestions(initialQuestions);
    if (initialQuestions && initialQuestions.length > 0) {
      setQuestions(initialQuestions);
      setCurrentIdx(0);
      setCandidateLevel(1);
      setEvalResult(null);
      setLevelUpBanner(null);
      setResponse("");
      setGrillThread([]);
      setShowIdleHintOffer(false);
      setHintOfferedThisQuestion(false);
      setAgentHintCard(null);
      setIdleSeconds(0);
      setAgentActionLabel("⚡ Agent Action: Cross-Examining Repo File");
      if (requireManualStart) setInterviewLifecycle("preparing");
    } else if (mode === "grill") {
      setQuestions([]);
      setCurrentIdx(0);
      setEvalResult(null);
      setLevelUpBanner(null);
      setResponse("");
      setGrillThread([]);
      setShowIdleHintOffer(false);
      setHintOfferedThisQuestion(false);
      setAgentHintCard(null);
      setIdleSeconds(0);
      if (requireManualStart) setInterviewLifecycle("preparing");
    }
  }

  // Load past sessions
  useEffect(() => {
    getPastInterviewSessions()
      .then((s) => setSessions(s))
      .catch(() => {});
  }, []);

  // ─── Speech Synthesis (TTS) Helper ──────────────────────────────────────────
  const speakText = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      if (!ttsEnabled) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.03;
      utterance.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const enVoice =
        voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google"))) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (enVoice) utterance.voice = enVoice;

      utterance.onstart = () => setIsSpeakingTTS(true);
      utterance.onend = () => setIsSpeakingTTS(false);
      utterance.onerror = () => setIsSpeakingTTS(false);

      window.speechSynthesis.speak(utterance);
    },
    [ttsEnabled]
  );

  const stopTTS = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingTTS(false);
    }
  }, []);

  // Filtered Questions
  const availableQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (mode === "grill") {
        return q.category === "resume-grill" || q.isCustom || q.isAiEscalated || q.level !== undefined;
      }
      if (mode === "custom") {
        return true;
      }
      const roleMatches =
        q.isCustom || q.isAiEscalated || !q.role || q.role.toLowerCase() === selectedRole.toLowerCase();
      if (!roleMatches) return false;

      if (filterCategory === "all") {
        // Default Bank stage loads progressive 10-question role calibration (Level 1 -> 3) + dynamically escalated questions
        return (q.level !== undefined || q.isCustom || q.isAiEscalated) && q.category !== "resume-grill";
      }
      return q.category === filterCategory;
    });
  }, [questions, mode, selectedRole, filterCategory]);

  const activeQuestion: StudioQuestion | undefined =
    availableQuestions[currentIdx] || availableQuestions[0] || questions[0];

  const activeExpectedConcepts = useMemo<string[]>(() => {
    return getQuestionExpectedConcepts(activeQuestion);
  }, [activeQuestion]);

  const coveredConceptsCount = useMemo(() => {
    return activeExpectedConcepts.filter((c: string) => isConceptCovered(c, response, codeSnippet)).length;
  }, [activeExpectedConcepts, response, codeSnippet]);

  // Auto-speak question on question change
  useEffect(() => {
    if (requireManualStart && interviewLifecycle !== "active") return;
    if (activeQuestion && !evalResult && ttsEnabled) {
      speakText(activeQuestion.question);
    }
    return () => {
      stopTTS();
    };
  }, [activeQuestion, evalResult, ttsEnabled, speakText, stopTTS, requireManualStart, interviewLifecycle]);

  // Handle explicit manual start
  const handleStartInterview = useCallback(() => {
    setInterviewLifecycle("initializing");
    setTimeout(() => {
      setInterviewLifecycle("active");
      setIdleSeconds(0);
      setShowIdleHintOffer(false);
      setHintOfferedThisQuestion(false);
      setAgentHintCard(null);
      setAgentActionLabel(
        activeQuestion?.referencedFiles?.[0]
          ? `⚡ Agent Action: Cross-Examining ${activeQuestion.referencedFiles[0]}`
          : "⚡ Agent Action: Cross-Examining Repo File"
      );
      if (activeQuestion && ttsEnabled) {
        speakText(`Welcome to your ${selectedRole} interview. Let's begin with your first question: ${activeQuestion.question}`);
      }
    }, 200);
  }, [activeQuestion, ttsEnabled, selectedRole, speakText]);

  // Request on-demand directional hint for active repository file question
  const handleRequestProjectHint = useCallback(async () => {
    if (!activeQuestion) return;
    setIsLoadingAgentHint(true);
    setShowIdleHintOffer(false);
    try {
      const res = await fetch("/api/interview/github-grill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "REQUEST_PROJECT_HINT",
          targetRole: selectedRole,
          currentQuestion: {
            id: activeQuestion.id,
            question: activeQuestion.question,
            targetFile: activeQuestion.referencedFiles?.[0],
            referencedFiles: activeQuestion.referencedFiles,
            exactFunctionOrStruct: activeQuestion.exactFunctionOrStruct,
            codeExcerpt: activeQuestion.codeExcerpt,
            hint: activeQuestion.hint,
            keyConceptsToCover: activeExpectedConcepts,
          },
        }),
      });
      const data = await res.json();
      if (data?.success && data.spokenHint) {
        setAgentActionLabel("💡 Agent Action: Giving Code Hint");
        setAgentHintCard({
          spokenHint: data.spokenHint,
          clueKeywords: Array.isArray(data.clueKeywords) ? data.clueKeywords : [],
        });
        if (ttsEnabled) speakText(data.spokenHint);
      }
    } catch {
      if (activeQuestion.hint) {
        setAgentHintCard({
          spokenHint: activeQuestion.hint,
          clueKeywords: activeExpectedConcepts.slice(0, 3),
        });
      }
    } finally {
      setIsLoadingAgentHint(false);
    }
  }, [activeQuestion, selectedRole, activeExpectedConcepts, ttsEnabled, speakText]);

  // 30-second proactive idle hint timer for Project Grill
  useEffect(() => {
    const hasDraft = Boolean(response.trim()) || Boolean(codeSnippet.trim()) || isRecording;
    const activeGrill =
      mode === "grill" &&
      interviewLifecycle === "active" &&
      Boolean(activeQuestion) &&
      !isEvaluating &&
      !hasDraft &&
      !hintOfferedThisQuestion;

    if (!activeGrill || !activeQuestion) return;

    const timer = setInterval(() => {
      setIdleSeconds((prev) => {
        const next = prev + 1;
        if (next >= 30) {
          setHintOfferedThisQuestion(true);
          setShowIdleHintOffer(true);
          if (ttsEnabled) {
            speakText(
              `I notice you are taking a moment. Would you like a small hint regarding ${
                activeQuestion.exactFunctionOrStruct || activeQuestion.referencedFiles?.[0] || "this file"
              }?`
            );
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    mode,
    interviewLifecycle,
    activeQuestion,
    isEvaluating,
    response,
    codeSnippet,
    isRecording,
    hintOfferedThisQuestion,
    ttsEnabled,
    speakText,
  ]);

  // ─── Camera & Virtual Avatar Control ─────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (virtualAnimRef.current) {
      cancelAnimationFrame(virtualAnimRef.current);
      virtualAnimRef.current = null;
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
    if (gazeIntervalRef.current) {
      clearInterval(gazeIntervalRef.current);
      gazeIntervalRef.current = null;
    }
    setCameraActive(false);
    setIsVirtualCamera(false);
    setLiveEyeContact(-1);
    setLivePosture("Stable");
  }, []);

  const startCamera = async () => {
    stopCamera();
    setIsRequestingCamera(true);
    setCameraPermissionDenied(false);
    setCameraErrorInfo(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraPermissionDenied(true);
      setCameraErrorInfo({
        type: "unsupported",
        message: "Your browser does not support WebRTC webcam access. You can use Virtual AI Avatar Mode.",
      });
      setIsRequestingCamera(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      videoStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setIsVirtualCamera(false);
      setCameraPermissionDenied(false);

      if (!visualAnalyzerRef.current) {
        visualAnalyzerRef.current = new VisualTelemetryAnalyzer();
      } else {
        visualAnalyzerRef.current.reset();
      }

      if (gazeIntervalRef.current) clearInterval(gazeIntervalRef.current);
      gazeIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !visualAnalyzerRef.current) return;
        const frame = visualAnalyzerRef.current.analyzeFrame(videoRef.current);
        setLiveEyeContact(frame.smoothEyeContactPct);
        setLivePosture(frame.posture);
        setReticleColor(frame.hudStatusColor);
        setVisualToast(frame.hudToast);
      }, 100);
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      setCameraPermissionDenied(true);
      if (errorObj?.name === "NotReadableError" || errorObj?.name === "TrackStartError") {
        setCameraErrorInfo({
          type: "in_use",
          message: "Camera is currently locked or in use by another application.",
        });
      } else if (errorObj?.name === "NotFoundError" || errorObj?.name === "DevicesNotFoundError") {
        setCameraErrorInfo({
          type: "not_found",
          message: "No physical webcam was detected on this device.",
        });
      } else {
        setCameraErrorInfo({
          type: "denied",
          message: "Camera permission was denied in your browser settings.",
        });
      }
    } finally {
      setIsRequestingCamera(false);
    }
  };

  const startVirtualCamera = () => {
    stopCamera();
    setIsVirtualCamera(true);
    setCameraPermissionDenied(false);
    setCameraErrorInfo(null);
    setCameraActive(true);

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const drawVirtualFrame = () => {
      frame++;
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, "#0A0A0A");
      grad.addColorStop(1, "#000000");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      ctx.strokeStyle = "rgba(178, 147, 226, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < 640; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 480);
        ctx.stroke();
      }
      for (let y = 0; y < 480; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(640, y);
        ctx.stroke();
      }

      const breathe = Math.sin(frame * 0.04) * 3;
      const headX = 320 + Math.sin(frame * 0.02) * 5;
      const headY = 210 + breathe;

      ctx.fillStyle = "#171717";
      ctx.beginPath();
      ctx.ellipse(headX, headY, 65, 80, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(178, 147, 226, 0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();

      virtualAnimRef.current = requestAnimationFrame(drawVirtualFrame);
    };

    drawVirtualFrame();
    const stream = canvas.captureStream(30);
    videoStreamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }

    setLiveEyeContact(88);
    setLivePosture("Stable");
    setReticleColor("green");
  };

  // ─── Audio Analysis & Waveform ───────────────────────────────────────────────
  const startAudioAnalysis = async (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const canvas = audioCanvasRef.current;
      const canvasCtx = canvas?.getContext("2d");

      const drawWave = () => {
        if (!isRecordingRef.current) return;
        animFrameRef.current = requestAnimationFrame(drawWave);
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicActiveLevel(normalized);

        if (canvas && canvasCtx) {
          canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
          const barWidth = (canvas.width / bufferLength) * 2.5;
          let x = 0;
          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            canvasCtx.fillStyle = `rgba(99, 102, 241, ${Math.max(0.2, dataArray[i] / 255)})`;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
          }
        }
      };

      drawWave();
    } catch {
      // Audio fallback
    }
  };

  const stopAudioAnalysis = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setMicActiveLevel(0);
  };

  // ─── Speech Recognition ─────────────────────────────────────────────────────
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
    const minutes = Math.max(0.1, durationSeconds / 60);
    const calculatedWpm = Math.round(words / minutes);
    setLiveWpm(calculatedWpm);
    setWpmHistory((prev) => [...prev.slice(-15), calculatedWpm]);
  };

  const startSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecordingStatusBadge("Voice Backup Recording Active");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        lastSpokenTimestampRef.current = Date.now();
        setIsHesitating(false);
        let finalStr = "";
        for (let i = 0; i < event.results.length; i++) {
          finalStr += event.results[i][0].transcript + " ";
        }
        setResponse(finalStr.trim());
        countFillers(finalStr);
      };

      recognition.onerror = () => {};

      recognition.onend = () => {
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // Speech recognition fallback
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  // ─── Recording Handlers ─────────────────────────────────────────────────────
  const startRecording = async () => {
    setError(null);
    setResponse("");
    setDurationSeconds(0);
    setFillerCounts({});
    setLiveWpm(0);
    setHesitationGaps(0);
    audioChunksRef.current = [];
    isRecordingRef.current = true;
    setIsRecording(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      startAudioAnalysis(stream);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(250);
      startSpeechRecognition();

      recordingTimerRef.current = setInterval(() => {
        setDurationSeconds((s) => s + 1);
        if (Date.now() - lastSpokenTimestampRef.current > 3500 && lastSpokenTimestampRef.current > 0) {
          setIsHesitating(true);
        }
      }, 1000);
    } catch {
      setError("Microphone access was denied. Please check your browser audio permissions.");
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  };

  const stopRecording = async (): Promise<string> => {
    isRecordingRef.current = false;
    setIsRecording(false);
    stopAudioAnalysis();
    stopSpeechRecognition();

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    let finalTranscript = response.trim();

    // Whisper Fallback if transcript was empty
    if (!finalTranscript && audioChunksRef.current.length > 0) {
      setIsTranscribingWithWhisper(true);
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", audioBlob, "answer.webm");

        const res = await fetch("/api/interview/transcribe", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.transcript) {
            finalTranscript = data.transcript;
            setResponse(data.transcript);
            countFillers(data.transcript);
          }
        }
      } catch {
        // Whisper error
      } finally {
        setIsTranscribingWithWhisper(false);
      }
    }

    return finalTranscript;
  };

  // ─── Evaluation Submission ───────────────────────────────────────────────────
  const handleSubmitEvaluation = async () => {
    if (!activeQuestion) return;

    let textToEvaluate = response.trim();
    if (isRecording || isRecordingRef.current) {
      textToEvaluate = await stopRecording();
    }

    if (
      mode === "grill" &&
      showIdleHintOffer &&
      /^(yes|yeah|yep|sure|hint|give me a hint)$/i.test(textToEvaluate)
    ) {
      setResponse("");
      await handleRequestProjectHint();
      return;
    }

    if (!textToEvaluate && !codeSnippet.trim()) {
      setError("Please provide a verbal response or code snippet before submitting.");
      return;
    }

    setIsEvaluating(true);
    setError(null);
    setSaveSuccessMsg(null);
    setShowIdleHintOffer(false);
    setIdleSeconds(0);

    const words = textToEvaluate.split(/\s+/).filter(Boolean).length;
    const calculatedWpm = durationSeconds > 0 ? Math.round((words / durationSeconds) * 60) : 125;
    const totalFillers = Object.values(fillerCounts).reduce((a, b) => a + b, 0);
    const effectiveWpm = liveWpm || calculatedWpm;

    try {
      setLevelUpBanner(null);

      let evaluation: InterviewEvaluationResponse;

      if (mode === "grill") {
        const combinedDefense = [
          textToEvaluate,
          codeSnippet.trim() ? `\n[Code / Architecture Snippet]:\n${codeSnippet.trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const updatedThread: GrillThreadTurn[] = [
          ...(grillThread.length > 0
            ? grillThread
            : [{ role: "interviewer" as const, content: activeQuestion.question }]),
          { role: "candidate", content: combinedDefense },
        ];

        const grillRes = await fetch("/api/interview/github-grill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "EVALUATE_AND_PROBE_TURN",
            targetRole: selectedRole,
            candidateLevel,
            candidateAnswer: combinedDefense,
            conversationHistory: updatedThread,
            currentQuestion: {
              id: activeQuestion.id,
              question: activeQuestion.question,
              targetFile: activeQuestion.referencedFiles?.[0],
              referencedFiles: activeQuestion.referencedFiles,
              exactFunctionOrStruct: activeQuestion.exactFunctionOrStruct,
              codeExcerpt: activeQuestion.codeExcerpt,
              hint: activeQuestion.hint,
              keyConceptsToCover: activeExpectedConcepts,
            },
          }),
        });

        const grillData = await grillRes.json();
        if (!grillRes.ok || !grillData.success) {
          throw new Error(grillData.error || `Project evaluation failed (${grillRes.status})`);
        }

        const score = Number(grillData.overallScore ?? 65);
        const targetFileName = activeQuestion.referencedFiles?.[0] || "project implementation";
        const actionBadgeText =
          grillData.agentAction === "LEVEL_UP_NEXT_FILE"
            ? `🔥 Agent Action: Verified Code Defense in ${targetFileName} & Escalating Level`
            : grillData.agentAction === "PROBE_CODE_EDGE_CASE"
            ? `🔍 Agent Action: Challenging Edge Case in ${targetFileName}`
            : `🛠️ Agent Action: Clarifying Code Flow in ${targetFileName}`;
        setAgentActionLabel(actionBadgeText);

        const nextAgentReply = [
          grillData.spokenInterviewerReaction,
          grillData.followUpProbeQuestion ? `Follow-up Probe: "${grillData.followUpProbeQuestion}"` : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        setGrillThread([
          ...updatedThread,
          {
            role: "interviewer",
            content: nextAgentReply,
            actionBadge: grillData.agentAction,
          },
        ]);

        if (grillData.studyPlanTask?.shouldAdd && grillData.studyPlanTask?.title) {
          const added = syncGrillStudyPlanGapTask(grillData.studyPlanTask);
          if (added) {
            setStudyPlanToast(
              `Study Plan Updated: Added "${grillData.studyPlanTask.title}" to strengthen gaps spotted in ${targetFileName}.`
            );
          }
        }

        const pacingVerdict: InterviewEvaluationResponse["deliveryCritique"]["pacingVerdict"] =
          effectiveWpm < 100
            ? "Too Slow (<100 WPM)"
            : effectiveWpm > 160
            ? "Rushed (>160 WPM)"
            : "Optimal (115-155 WPM)";

        evaluation = {
          overallScore: score,
          contentScore: score,
          deliveryScore: Math.max(55, Math.min(100, score + (totalFillers <= 2 ? 6 : -5))),
          starBreakdown: {
            situation: {
              score: Math.min(100, score + 5),
              feedback: `Grounded context for ${targetFileName}.`,
              present: score >= 45,
            },
            task: {
              score,
              feedback: "Addressed module ownership and constraints.",
              present: score >= 50,
            },
            action: {
              score,
              feedback: "Code mechanics, invariants & edge-case reasoning.",
              present: score >= 50,
            },
            result: {
              score: Math.max(40, score - 4),
              feedback: "Quantify latency, throughput, or reliability trade-offs.",
              present: score >= 65,
            },
          },
          deliveryCritique: {
            pacingVerdict,
            pacingAdvice: `Measured pacing: ${effectiveWpm} WPM · ${totalFillers} filler words · File audited: ${targetFileName}.`,
            fillerAdvice:
              totalFillers > 3
                ? "Trim verbal fillers when walking through pointer/async ownership."
                : "Clean technical delivery.",
            bodyLanguageAdvice:
              cameraActive && !cameraPermissionDenied
                ? `Maintain eye line during follow-up probes (${livePosture}).`
                : "Audio-only mode active; turn on camera anytime for posture coaching.",
          },
          strengths: Array.isArray(grillData.strengths) ? grillData.strengths : [],
          improvements: Array.isArray(grillData.howToImproveYourAnswer)
            ? grillData.howToImproveYourAnswer
            : Array.isArray(grillData.improvements)
            ? grillData.improvements
            : [],
          rewrittenIdealAnswer: grillData.idealRewrittenAnswer || grillData.rewrittenIdealAnswer || "",
          interviewerReaction: grillData.spokenInterviewerReaction || grillData.interviewerReaction,
          followUpQuestion: grillData.followUpQuestion || {
            prompt: grillData.followUpProbeQuestion || "",
            intent: `Probing edge case & failure mode in ${targetFileName}`,
            keyConcepts: activeExpectedConcepts.slice(0, 3),
          },
          evaluationSource: "ai",
          coveredConcepts: grillData.coveredConcepts || grillData.addressedConcepts || [],
          missedConcepts: grillData.missedConcepts || [],
          adaptiveDecision: grillData.adaptiveDecision,
          nextLevel: grillData.nextLevel,
          engine: grillData.engine,
          storageMode: grillData.storageMode,
          langGraphTrace: grillData.langGraphTrace,
        };
      } else {
        evaluation = await evaluateInterviewAnswer({
          questionId: activeQuestion.id,
          questionText: activeQuestion.question,
          category: activeQuestion.category,
          role: selectedRole,
          userTranscript: textToEvaluate,
          durationSeconds: Math.max(10, durationSeconds),
          currentLevel: candidateLevel,
          codeSnippet: codeSnippet.trim() || undefined,
          keyConceptsToCover: activeExpectedConcepts.length > 0 ? activeExpectedConcepts : undefined,
          telemetry: {
            avgWpm: effectiveWpm,
            wpmTimeSeries: wpmHistory.length > 0 ? wpmHistory : [calculatedWpm],
            fillerWords: fillerCounts,
            totalFillerCount: totalFillers,
            hesitationGapsCount: hesitationGaps,
            eyeContactPct: cameraActive && !cameraPermissionDenied ? liveEyeContact : -1,
            postureStabilityPct:
              livePosture === "Stable"
                ? 92
                : livePosture === "Calibrating..."
                ? 85
                : livePosture === "Off-Center"
                ? 74
                : 50,
          },
        });
      }

      setEvalResult(evaluation);

      const previousLevel = candidateLevel;
      const resolvedNextLevel: 1 | 2 | 3 = evaluation.nextLevel || previousLevel;
      setCandidateLevel(resolvedNextLevel);

      let insertedAdaptive = false;
      if (evaluation.adaptiveNextQuestion?.question) {
        const adaptiveQ: StudioQuestion = {
          id: evaluation.adaptiveNextQuestion.id || `ai-escalated-${Date.now()}`,
          role: selectedRole,
          category:
            mode === "grill"
              ? "resume-grill"
              : evaluation.adaptiveNextQuestion.category || activeQuestion.category,
          difficulty: evaluation.adaptiveNextQuestion.difficulty || "hard",
          level: resolvedNextLevel,
          isAiEscalated: true,
          question: evaluation.adaptiveNextQuestion.question,
          hint: evaluation.adaptiveNextQuestion.hint,
          keyConceptsToCover:
            evaluation.adaptiveNextQuestion.keyConceptsToCover &&
            evaluation.adaptiveNextQuestion.keyConceptsToCover.length > 0
              ? evaluation.adaptiveNextQuestion.keyConceptsToCover
              : activeExpectedConcepts.slice(0, 3),
          isCustom: true,
        };

        setQuestions((prev) => {
          const activePos = prev.findIndex((item) => item.id === activeQuestion.id);
          if (activePos === -1) return [adaptiveQ, ...prev];
          const nextArr = [...prev];
          nextArr.splice(activePos + 1, 0, adaptiveQ);
          return nextArr;
        });
        insertedAdaptive = true;
      }

      setLevelUpBanner({
        decision:
          evaluation.adaptiveDecision ||
          (evaluation.overallScore >= 75
            ? "LEVEL_UP_HARDER_QUESTION"
            : evaluation.overallScore >= 50
            ? "PROBE_CURRENT_LEVEL"
            : "CALIBRATE_FOUNDATION"),
        score: evaluation.overallScore,
        previousLevel,
        nextLevel: resolvedNextLevel,
        reaction: evaluation.interviewerReaction,
        hasNextQuestion: insertedAdaptive,
      });

      // Record Turn
      const newTurn: InterviewTurn = {
        id: `turn-${Date.now()}-${currentTurnOrder}`,
        questionText: activeQuestion.question,
        category: activeQuestion.category,
        userAnswer: textToEvaluate,
        codeSnippet: codeSnippet.trim() || undefined,
        score: evaluation.overallScore,
        contentScore: evaluation.contentScore,
        deliveryScore: evaluation.deliveryScore,
        avgWpm: liveWpm || calculatedWpm,
        fillerWordCount: totalFillers,
        eyeContactScore: liveEyeContact >= 0 ? liveEyeContact : undefined,
        starBreakdown: evaluation.starBreakdown,
        rewrittenAnswer: evaluation.rewrittenIdealAnswer,
        followUpQuestion: evaluation.followUpQuestion?.prompt,
        turnOrder: currentTurnOrder,
        coveredConcepts: evaluation.coveredConcepts,
        missedConcepts: evaluation.missedConcepts,
      };

      setSessionTurns((prev) => [...prev, newTurn]);

      setTimeout(() => {
        evaluationRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 150);

      if (ttsEnabled) {
        const spokenReaction = evaluation.interviewerReaction
          ? `${evaluation.interviewerReaction} `
          : `Evaluation complete. Score: ${evaluation.overallScore} out of 100. `;
        const spokenEscalation =
          evaluation.overallScore >= 75 && evaluation.adaptiveNextQuestion?.question
            ? `Level up to Level ${resolvedNextLevel}. Escalated question ready.`
            : evaluation.followUpQuestion?.prompt
            ? `Follow-up: ${evaluation.followUpQuestion.prompt}`
            : "";
        if (spokenReaction || spokenEscalation) {
          setTimeout(() => {
            speakText(`${spokenReaction}${spokenEscalation}`);
          }, 900);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate evaluation feedback.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const resetPerQuestionAgentState = (nextQuestion?: StudioQuestion) => {
    setGrillThread([]);
    setIdleSeconds(0);
    setShowIdleHintOffer(false);
    setHintOfferedThisQuestion(false);
    setAgentHintCard(null);
    setAgentActionLabel(
      nextQuestion?.referencedFiles?.[0]
        ? `⚡ Agent Action: Cross-Examining ${nextQuestion.referencedFiles[0]}`
        : "⚡ Agent Action: Cross-Examining Repo File"
    );
  };

  const handleProceedToAdaptiveQuestion = () => {
    const nextPos = Math.min(Math.max(0, availableQuestions.length - 1), currentIdx + 1);
    setCurrentIdx(nextPos);
    setCurrentTurnOrder((prev) => prev + 1);
    setResponse("");
    setCodeSnippet("");
    setEvalResult(null);
    setLevelUpBanner(null);
    setDurationSeconds(0);
    setFillerCounts({});
    resetPerQuestionAgentState(availableQuestions[nextPos]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChainFollowUpTurn = () => {
    if (!evalResult?.followUpQuestion || !activeQuestion) return;
    const followUpQ: StudioQuestion = {
      id: `fu-${Date.now()}`,
      role: selectedRole,
      category: activeQuestion.category,
      difficulty: "hard",
      level: candidateLevel,
      isAiEscalated: true,
      question: evalResult.followUpQuestion.prompt,
      hint: `Interviewer Intent: ${evalResult.followUpQuestion.intent}`,
      keyConceptsToCover: evalResult.followUpQuestion.keyConcepts || activeExpectedConcepts.slice(0, 3),
      referencedFiles: activeQuestion.referencedFiles,
      exactFunctionOrStruct: activeQuestion.exactFunctionOrStruct,
      codeExcerpt: activeQuestion.codeExcerpt,
      isCustom: true,
    };

    setQuestions((prev) => [followUpQ, ...prev]);
    setCurrentIdx(0);
    setCurrentTurnOrder((prev) => prev + 1);
    setResponse("");
    setCodeSnippet("");
    setEvalResult(null);
    setLevelUpBanner(null);
    setDurationSeconds(0);
    setFillerCounts({});
    setIdleSeconds(0);
    setShowIdleHintOffer(false);
    setHintOfferedThisQuestion(false);
    setAgentHintCard(null);
    setAgentActionLabel(
      activeQuestion.referencedFiles?.[0]
        ? `🔍 Agent Action: Probing Follow-Up in ${activeQuestion.referencedFiles[0]}`
        : "🔍 Agent Action: Probing Code Edge Case"
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveSession = async () => {
    if (!evalResult || !activeQuestion) return;
    try {
      const allMissed = Array.from(
        new Set([
          ...sessionTurns.flatMap((t) => t.missedConcepts || []),
          ...(evalResult.missedConcepts || []),
        ])
      );

      await recordInterviewSession(
        {
          date: new Date().toISOString().split("T")[0],
          role: selectedRole,
          score: evalResult.overallScore,
          contentScore: evalResult.contentScore,
          deliveryScore: evalResult.deliveryScore,
          avgWpm: liveWpm,
          fillerWordCount: Object.values(fillerCounts).reduce((a, b) => a + b, 0),
          eyeContactScore: liveEyeContact >= 0 ? liveEyeContact : undefined,
          feedback: evalResult.deliveryCritique.pacingAdvice,
          questionsAnswered: sessionTurns.length + 1,
          duration: `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`,
          missedConcepts: allMissed.length > 0 ? allMissed : undefined,
        },
        sessionTurns
      );
      setSaveSuccessMsg("Session successfully recorded to your interview history!");
      const updated = await getPastInterviewSessions();
      setSessions(updated);
      setTimeout(() => setSaveSuccessMsg(null), 4000);

      // Autonomous Digital Twin update: Feed verified interview evidence to agent
      triggerAgent({
        triggerType: "MOCK_INTERVIEW_COMPLETED",
        entityId: activeQuestion.id || "interview-session",
        goalPrompt: `Update student digital twin skill evidence matrix based on ${selectedRole} interview performance (Score: ${evalResult.overallScore}/100).`,
        autoOpenDrawer: false,
      }).catch(console.error);
    } catch {
      setError("Failed to record interview session.");
    }
  };

  const handleCopyModelAnswer = async () => {
    if (evalResult?.rewrittenIdealAnswer && typeof navigator !== "undefined") {
      await navigator.clipboard.writeText(evalResult.rewrittenIdealAnswer);
      setCopiedAnswer(true);
      setTimeout(() => setCopiedAnswer(false), 2000);
    }
  };

  // Scorecard stats
  const allRoundTurns = sessionTurns.length > 0 ? sessionTurns : [];
  const scorecardAvgScore = allRoundTurns.length > 0
    ? Math.round(allRoundTurns.reduce((acc, t) => acc + (t.score ?? 0), 0) / allRoundTurns.length)
    : evalResult?.overallScore || 85;

  const totalFillersSpoken = Object.values(fillerCounts).reduce((a, b) => a + b, 0);

  const isGrillMode = mode === "grill" || startCardIcon === "flame";
  const isGrillLocked = mode === "grill" && availableQuestions.length === 0;
  const isPreStart =
    requireManualStart && interviewLifecycle === "preparing" && availableQuestions.length > 0;
  const activeStartCardTitle = startCardTitle || (isGrillMode ? "Ready for Your Technical Grill?" : "Ready to Begin Your Interview?");
  const activeStartCardDesc = startCardDescription || (isGrillMode ? "Your AI interviewer is ready to challenge your engineering decisions, architecture, and implementation choices." : "Your AI interviewer is ready. Make sure your camera and microphone are available before starting.");
  const activeStartCardIndicators = startCardIndicators || (isGrillMode ? [
    { label: "AI Technical Interviewer", dotColor: "bg-[#F59E0B]" },
    { label: "Repository-Aware Questions", dotColor: "bg-[#10B981]" },
    { label: "Voice & Video Analysis", dotColor: "bg-[#A78BFA]" },
    { label: "Architecture Trade-offs", dotColor: "bg-[#38BDF8]" },
  ] : [
    { label: "AI Interviewer (TTS)", dotColor: "bg-[#10B981]" },
    { label: "Voice & WPM Telemetry", dotColor: "bg-[#A78BFA]" },
    { label: "STAR AI Evaluation", dotColor: "bg-[#38BDF8]" },
    { label: "Visual Telemetry", dotColor: "bg-[#F59E0B]" },
  ]);

  return (
    <div className="max-w-7xl mx-auto pb-16 relative">
      {/* ─── HEADER BAR (Unblurred so navigation & history are always accessible) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1D1D1D] gap-4 mb-5">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors mb-2 group font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>
              {backHref.includes("customize")
                ? "Back to Configuration"
                : backHref.includes("question-bank") || backHref.includes("resume-grill")
                ? "Back to Role Selection"
                : "Back to Interview Modes"}
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-[#F5F5F5] flex items-center gap-2.5">
            <div className={clsx(
              "p-1.5 rounded-lg border",
              isGrillMode ? "bg-[#121212] text-[#F59E0B] border-[#292929]" : "bg-[#121212] text-[#A78BFA] border-[#292929]"
            )}>
              {isGrillMode ? <Flame className="w-6 h-6 text-[#F59E0B]" /> : <Brain className="w-6 h-6 text-[#A78BFA]" />}
            </div>
            <span>{pageTitle}</span>
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-1">{pageSubtitle}</p>
        </div>

        {/* View Switcher: Studio vs Session History */}
        <div className="flex items-center gap-1.5 bg-[#0A0A0A] p-1 rounded-xl border border-[#1D1D1D] self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("practice")}
            className={clsx(
              "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer",
              activeTab === "practice"
                ? "bg-[#121212] text-[#F5F5F5] border border-[#292929]"
                : "text-[#71717A] hover:text-[#F5F5F5]"
            )}
          >
            <Mic className="w-3.5 h-3.5 text-[#A78BFA]" />
            AI Studio Stage
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={clsx(
              "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer tabular-nums",
              activeTab === "history"
                ? "bg-[#121212] text-[#F5F5F5] border border-[#292929]"
                : "text-[#71717A] hover:text-[#F5F5F5]"
            )}
          >
            <Clock className="w-3.5 h-3.5 text-[#A1A1AA]" />
            Session History ({sessions.length})
          </button>
          <button
            type="button"
            onClick={() => setShowScorecardModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#121212] hover:bg-[#1A1A1A] text-[#F59E0B] border border-[#F59E0B]/25 transition-colors cursor-pointer tabular-nums"
            title="View Round Scorecard and Hiring Verdict"
          >
            <Trophy className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Scorecard ({allRoundTurns.length})</span>
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => setError(null)} />}
      {saveSuccessMsg && (
        <div className="mb-4 p-3 bg-[#10B981]/10 border border-[#10B981]/25 rounded-xl text-[#10B981] text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> {saveSuccessMsg}
          </span>
          <button type="button" onClick={() => setSaveSuccessMsg(null)} className="text-[#10B981] hover:text-[#F5F5F5] cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Optional Mode Header Slot (e.g. GitHub Analyzer - UNBLURRED so candidate can analyze repo before starting) */}
      {headerSlot && <div className="mb-6">{headerSlot}</div>}

      {/* Adaptive Targeting Alert if candidate has unverified bluff risks */}
      {bluffRiskCount > 0 && digitalTwin?.skills && digitalTwin.skills.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-[#F43F5E]/10 border border-[#F43F5E]/25 flex items-center gap-2.5 text-xs text-[#F43F5E]">
          <ShieldAlert className="w-4 h-4 text-[#F43F5E] shrink-0" />
          <div>
            <span className="font-bold text-[#F5F5F5]">Targeted Practice Active: </span>
            <span>
              {bluffRiskCount} skill{bluffRiskCount > 1 ? "s on your resume need" : " on your resume needs"} more practice. The interviewer will include questions to help you strengthen these topics.
            </span>
          </div>
        </div>
      )}

      {/* ─── MAIN INTERVIEW WORKSPACE (BLURRED DURING PRE-START) ─────────────── */}
      <div className="relative">
        <div
          className={clsx(
            "space-y-6 transition-all duration-300",
            isPreStart && "filter blur-md opacity-35 pointer-events-none select-none"
          )}
        >
          {/* ─── STUDIO CONTROLS BAR ─────────────────────────────────────────────── */}
      {!isGrillLocked && (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-3 rounded-xl bg-[#0D0D0D] border border-[#1D1D1D]">
        <div className="flex items-center gap-2 flex-wrap">
          {badgeLabel && (
            <Badge variant={badgeVariant} size="md">
              {badgeLabel}
            </Badge>
          )}

          {showRoleSelector ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#71717A] font-medium">Role:</span>
              <select
                value={selectedRole}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setSelectedRole(newRole);
                  setCurrentIdx(0);
                  setCandidateLevel(1);
                  setEvalResult(null);
                  setLevelUpBanner(null);
                  setResponse("");
                  const newQuestions = buildRoleQuestionPool(newRole, mode);
                  setQuestions(newQuestions);
                  onQuestionsChange?.(newQuestions);
                }}
                className="text-xs bg-[#080808] border border-[#1D1D1D] rounded-lg px-3 py-1.5 text-[#F5F5F5] focus:outline-none focus:border-[#292929] cursor-pointer"
              >
                {INTERVIEW_ROLES.map((r) => (
                  <option key={r} value={r} className="bg-[#0D0D0D] text-[#F5F5F5]">
                    {r}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#71717A] font-medium">Role:</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#121212] text-[#F5F5F5] border border-[#292929] font-mono">
                {selectedRole}
              </span>
            </div>
          )}

          {/* Difficulty Level Indicator */}
          <span
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-[#1D1D1D] bg-[#121212] text-[#A1A1AA] font-mono flex items-center gap-1.5"
            title="Difficulty scales automatically from your evaluation scores"
          >
            <Zap className="w-3 h-3 shrink-0 text-[#A78BFA]" />
            Level {candidateLevel} / 3 ·{" "}
            {candidateLevel === 3
              ? "Staff Bar-Raiser"
              : candidateLevel === 2
              ? "Production SDE"
              : "Foundational"}
          </span>
        </div>

        {/* Right: Thinking Timer & TTS Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {mode === "grill" && idleSeconds > 0 && !hintOfferedThisQuestion && (
            <span className="px-2.5 py-1 rounded-lg bg-[#121212] border border-[#292929] text-[11px] font-mono text-[#A1A1AA] tabular-nums">
              ⏱️ Thinking: {idleSeconds}s / 30s
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              const nextVal = !ttsEnabled;
              setTtsEnabled(nextVal);
              if (!nextVal) stopTTS();
            }}
            title={ttsEnabled ? "Mute AI Voice Interviewer" : "Enable AI Voice Interviewer"}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
              ttsEnabled
                ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25"
                : "bg-[#121212] text-[#A1A1AA] border-[#292929] hover:text-[#F5F5F5]"
            )}
          >
            {ttsEnabled ? (
              <>
                <Volume2 className={clsx("w-3.5 h-3.5 text-[#10B981]", isSpeakingTTS && "animate-pulse")} />
                <span>Interviewer Voice ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-[#71717A]" />
                <span>Voice Muted</span>
              </>
            )}
          </button>
        </div>
      </div>
      )}

      {loading && questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-[#71717A] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#A78BFA]" />
          <p className="text-sm font-medium">Initializing Multi-Modal AI Interview Studio...</p>
        </div>
      ) : activeTab === "history" ? (
        /* ─── PAST SESSIONS VIEW ────────────────────────────────────────────── */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="text-center p-4">
              <MessageSquare className="w-5 h-5 mx-auto mb-2 text-[#A78BFA]" />
              <p className="text-2xl font-bold text-[#F5F5F5] tabular-nums">{sessions.length}</p>
              <p className="text-xs text-[#71717A]">Total Sessions</p>
            </Card>
            <Card className="text-center p-4">
              <Star className="w-5 h-5 mx-auto mb-2 text-[#F59E0B]" />
              <p className="text-2xl font-bold text-[#F5F5F5] tabular-nums">
                {sessions.length
                  ? `${Math.round(sessions.reduce((s, i) => s + i.score, 0) / sessions.length)}%`
                  : "N/A"}
              </p>
              <p className="text-xs text-[#71717A]">Average Composite Score</p>
            </Card>
            <Card className="text-center p-4">
              <TrendingUp className="w-5 h-5 mx-auto mb-2 text-[#10B981]" />
              <p className="text-2xl font-bold text-[#F5F5F5] tabular-nums">
                {sessions.reduce((s, i) => s + (i.questionsAnswered || 1), 0)}
              </p>
              <p className="text-xs text-[#71717A]">Questions Answered</p>
            </Card>
            <Card className="text-center p-4">
              <Activity className="w-5 h-5 mx-auto mb-2 text-[#38BDF8]" />
              <p className="text-2xl font-bold text-[#F5F5F5] tabular-nums">128 WPM</p>
              <p className="text-xs text-[#71717A]">Average Speaking Pacing</p>
            </Card>
          </div>

          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id} hover className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="22" fill="none" stroke="#1D1D1D" strokeWidth="5" />
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
                      <span className="absolute text-sm font-bold text-[#F5F5F5] tabular-nums">{session.score}</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[#F5F5F5]">{session.role}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[#71717A] flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#71717A]" /> {session.date}
                        </span>
                        <span className="flex items-center gap-1 tabular-nums">
                          <Brain className="w-3 h-3 text-[#71717A]" /> {session.questionsAnswered} Turns
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-[#71717A]" /> {session.duration}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-[#A1A1AA] bg-[#0A0A0A] px-3 py-2 rounded-lg border border-[#1D1D1D] max-w-md">
                    💬 {session.feedback}
                  </div>
                </div>
              </Card>
            ))}

            {sessions.length === 0 && (
              <div className="p-12 text-center text-[#71717A] border border-dashed border-[#292929] rounded-xl">
                No past sessions recorded yet. Start practicing in the AI Studio Stage above!
              </div>
            )}
          </div>
        </div>
      ) : isGrillLocked ? (
        /* ─── REPOSITORY LOCK GATE (ZERO DEFAULT QUESTIONS BEFORE REPO UPLOAD) ─── */
        <Card className="max-w-2xl mx-auto p-10 bg-[#0D0D0D] border border-dashed border-[#292929] rounded-2xl text-center space-y-3 my-4">
          <div className="w-12 h-12 rounded-xl bg-[#121212] border border-[#292929] flex items-center justify-center mx-auto text-[#F59E0B]">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#F5F5F5]">
            Upload Your GitHub Repository Link Above to Begin
          </h3>
          <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-lg mx-auto">
            No default or generic questions are pre-loaded here. Paste your project&apos;s public GitHub repository URL above (or click a 1-click sample repo) and click{" "}
            <strong className="text-[#F5F5F5]">Generate Resume Project Grill Questions</strong> so the AI agent inspects your real source files, dependencies, and commits before unlocking your technical grill.
          </p>
        </Card>
      ) : (
        /* ─── AI STUDIO STAGE VIEW ─────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Study Plan Auto-Remediation Toast Notification */}
          {studyPlanToast && (
            <div className="p-3.5 rounded-xl bg-emerald-500/12 border border-emerald-500/35 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
              <span>✅ {studyPlanToast}</span>
              <button
                type="button"
                onClick={() => setStudyPlanToast(null)}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-[11px] shrink-0 cursor-pointer"
              >
                Got it
              </button>
            </div>
          )}

          {/* Category Filter Pills */}
          {showCategoryFilters && mode === "bank" && (
            <div className="flex items-center gap-2 flex-wrap">
              {EXPANDED_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setFilterCategory(cat.id);
                    setCurrentIdx(0);
                    setEvalResult(null);
                    setLevelUpBanner(null);
                    setResponse("");
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border",
                    filterCategory === cat.id
                      ? "bg-[#121212] text-[#F5F5F5] border-[#292929]"
                      : "bg-[#0D0D0D] text-[#71717A] hover:text-[#F5F5F5] border-[#1D1D1D]"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* ─── MAIN SPLIT STAGE ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ─── LEFT PANEL: Live Webcam HUD & Acoustic Waveform (5 cols) ─── */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-[#0D0D0D] border border-[#1D1D1D]">
                {/* Video Feed Box */}
                <div className="relative aspect-video w-full bg-[#050505] flex items-center justify-center overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={clsx(
                      "w-full h-full object-cover -scale-x-100",
                      cameraActive && !cameraPermissionDenied ? "block" : "hidden"
                    )}
                  />

                  {(!cameraActive || cameraPermissionDenied) && (
                    <div className="flex flex-col items-center justify-center p-5 text-center max-w-sm mx-auto">
                      <div className="p-2.5 rounded-full bg-[#F43F5E]/10 border border-[#F43F5E]/20 mb-2">
                        <VideoOff className="w-8 h-8 text-[#F43F5E]" />
                      </div>
                      <p className="text-xs font-semibold text-[#F5F5F5]">
                        {cameraPermissionDenied
                          ? cameraErrorInfo?.type === "in_use"
                            ? "Webcam In Use By Another App"
                            : cameraErrorInfo?.type === "not_found"
                            ? "No Webcam Hardware Detected"
                            : "Camera Permission Denied"
                          : "Camera Turned Off"}
                      </p>
                      <p className="text-[11px] text-[#71717A] mt-1 leading-snug">
                        {cameraPermissionDenied
                          ? cameraErrorInfo?.message || "Please allow camera access in your browser address bar."
                          : "Audio-Only practice mode is active. Turn on camera or use Virtual Avatar mode."}
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={startCamera}
                          disabled={isRequestingCamera}
                          className="px-3 py-1.5 text-[11px] font-semibold bg-[#F5F5F5] hover:bg-[#E4E4E7] text-[#000000] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          {isRequestingCamera ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Video className="w-3.5 h-3.5" />
                          )}
                          <span>{cameraPermissionDenied ? "Retry Real Camera" : "Turn On Camera"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={startVirtualCamera}
                          className="px-3 py-1.5 text-[11px] font-medium bg-[#121212] hover:bg-[#1A1A1A] border border-[#292929] text-[#F5F5F5] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
                          <span>⚡ Virtual AI Avatar Mode</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Top HUD Telemetry Bar & Centering Posture Framing Overlay */}
                  {cameraActive && !cameraPermissionDenied && (
                    <>
                      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between text-[11px] font-mono pointer-events-none">
                        <div className="flex items-center gap-1.5 bg-[#050505]/90 px-2.5 py-1 rounded-full border border-[#292929] text-[#F5F5F5]">
                          <span
                            className={clsx(
                              "w-2 h-2 rounded-full",
                              reticleColor === "green"
                                ? "bg-[#10B981] animate-pulse"
                                : reticleColor === "amber"
                                ? "bg-[#F59E0B]"
                                : "bg-[#F43F5E] animate-ping"
                            )}
                          />
                          <span>
                            {isVirtualCamera
                              ? "Virtual Studio HUD"
                              : `Eye Contact: ${liveEyeContact >= 0 ? `${liveEyeContact}%` : "Scanning..."}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-[#050505]/90 px-2.5 py-1 rounded-full border border-[#292929] text-[#F5F5F5]">
                          <span>Posture: {livePosture}</span>
                        </div>
                      </div>

                      {/* Head & Eye-Line Centering Guide Box */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div
                          className={clsx(
                            "w-36 h-32 rounded-2xl border border-dashed flex flex-col items-center pt-5 transition-colors",
                            reticleColor === "green"
                              ? "border-[#10B981]/50"
                              : reticleColor === "amber"
                              ? "border-[#F59E0B]/60"
                              : "border-[#F43F5E]/60"
                          )}
                        >
                          <div className="w-20 border-t border-cyan-400/50 text-[8px] font-mono uppercase tracking-wider text-cyan-300/80 text-center pt-0.5">
                            Eye Line
                          </div>
                        </div>
                      </div>

                      {/* Live Posture & Framing Coaching Tip */}
                      <div className="absolute bottom-2.5 left-2.5 right-12 pointer-events-none">
                        <div className="inline-flex items-center gap-1.5 max-w-full px-2.5 py-1 rounded-lg bg-[#050505]/90 border border-[#292929] text-[10px] text-[#E4E4E7] backdrop-blur-sm">
                          <span
                            className={clsx(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              reticleColor === "green"
                                ? "bg-[#10B981]"
                                : reticleColor === "amber"
                                ? "bg-[#F59E0B]"
                                : "bg-[#F43F5E]"
                            )}
                          />
                          <span className="truncate">
                            {visualToast ||
                              (livePosture === "Stable"
                                ? "Centered framing & steady eye contact — explain trade-offs clearly."
                                : "Keep shoulders level, center in the box, and align camera at eye line.")}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Camera Toggle Button */}
                  {cameraActive && (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-[#050505]/90 text-[#A1A1AA] hover:text-[#F5F5F5] border border-[#292929] text-xs cursor-pointer"
                      title="Turn off camera"
                    >
                      <VideoOff className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Acoustic Canvas Waveform Bar */}
                <div className="p-3 bg-[#080808] border-t border-[#1D1D1D] flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <canvas ref={audioCanvasRef} width={280} height={36} className="w-full h-9 rounded" />
                  </div>
                  <div className="text-[11px] font-mono text-[#71717A] shrink-0 tabular-nums">
                    {micActiveLevel > 0 ? `${micActiveLevel}% input` : "Mic idle"}
                  </div>
                </div>
              </div>

              {/* Speech Controls & Real-Time Verbal Telemetry */}
              <Card className="p-4 bg-[#0D0D0D] border-[#1D1D1D] space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {!isRecording ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={startRecording}
                        icon={<Mic className="w-4 h-4" />}
                        className="bg-[#10B981] hover:bg-emerald-500 text-black font-semibold text-xs"
                      >
                        Start Speaking
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={stopRecording}
                        icon={<MicOff className="w-4 h-4" />}
                        className="font-semibold text-xs"
                      >
                        Stop Recording
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-[#71717A] tabular-nums">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#71717A]" /> {durationSeconds}s
                    </span>
                    <span>•</span>
                    <span className="text-[#F5F5F5] font-semibold">{liveWpm} WPM</span>
                    <span>•</span>
                    <span className={totalFillersSpoken > 2 ? "text-[#F43F5E]" : "text-[#10B981]"}>
                      {totalFillersSpoken} fillers
                    </span>
                  </div>
                </div>

                {isTranscribingWithWhisper && (
                  <div className="p-2 rounded-lg bg-[#0A0A0A] border border-[#292929] text-xs text-[#A1A1AA] flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A78BFA]" />
                    <span>Transcribing audio response...</span>
                  </div>
                )}
              </Card>

              {/* Expected Rubric Concepts */}
              {activeExpectedConcepts.length > 0 && (
                <Card className="p-4 bg-[#0D0D0D] border-[#1D1D1D] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-[#A78BFA]" />
                      Key Expected Concepts
                    </span>
                    <span className="text-[11px] text-[#10B981] font-medium tabular-nums">
                      {coveredConceptsCount} of {activeExpectedConcepts.length} addressed
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeExpectedConcepts.map((concept, idx) => {
                      const covered = isConceptCovered(concept, response, codeSnippet);
                      return (
                        <span
                          key={idx}
                          className={clsx(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors",
                            covered
                              ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25"
                              : "bg-[#121212] text-[#A1A1AA] border-[#1D1D1D]"
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
                </Card>
              )}
            </div>

            {/* ─── RIGHT PANEL: Active Question Flashcard & Response Workspace (7 cols) ─── */}
            <div className="lg:col-span-7 space-y-5">
              {/* Question Flashcard */}
              <Card className="p-5 md:p-6 bg-[#0D0D0D] border-[#1D1D1D] rounded-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#1D1D1D]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={CATEGORY_CONFIG[activeQuestion?.category || "technical"]?.variant || "indigo"} size="sm">
                      {CATEGORY_CONFIG[activeQuestion?.category || "technical"]?.label || activeQuestion?.category}
                    </Badge>
                    <span className={clsx("text-xs font-semibold capitalize", DIFFICULTY_COLOR[activeQuestion?.difficulty || "medium"])}>
                      {activeQuestion?.difficulty}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#121212] text-[#A1A1AA] border border-[#1D1D1D]">
                      Level {activeQuestion?.level || candidateLevel}/3
                    </span>
                    {activeQuestion?.referencedFiles?.map((fp) => (
                      <span
                        key={fp}
                        className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/12 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                      >
                        <FileCode className="w-3 h-3 shrink-0" />
                        <span>{fp}</span>
                      </span>
                    ))}
                    {activeQuestion?.exactFunctionOrStruct && (
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#121212] text-[#A1A1AA] border border-[#292929]">
                        ƒ {activeQuestion.exactFunctionOrStruct}
                      </span>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const prevPos = Math.max(0, currentIdx - 1);
                        setCurrentIdx(prevPos);
                        setEvalResult(null);
                        setLevelUpBanner(null);
                        setResponse("");
                        resetPerQuestionAgentState(availableQuestions[prevPos]);
                      }}
                      disabled={currentIdx === 0}
                      className="p-1.5 rounded-lg bg-[#121212] border border-[#292929] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono tabular-nums text-[#A1A1AA]">
                      {availableQuestions.length > 0 ? currentIdx + 1 : 0} / {availableQuestions.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextPos = Math.min(availableQuestions.length - 1, currentIdx + 1);
                        setCurrentIdx(nextPos);
                        setEvalResult(null);
                        setLevelUpBanner(null);
                        setResponse("");
                        resetPerQuestionAgentState(availableQuestions[nextPos]);
                      }}
                      disabled={currentIdx >= availableQuestions.length - 1}
                      className="p-1.5 rounded-lg bg-[#121212] border border-[#292929] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {mode === "grill" && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/12 text-indigo-300 border border-indigo-500/30">
                    <span>{agentActionLabel}</span>
                  </div>
                )}

                <h2 className="text-base sm:text-lg font-semibold text-[#F5F5F5] leading-relaxed">
                  &ldquo;{activeQuestion?.question}&rdquo;
                </h2>

                {/* Verbatim Code Excerpt Inspected from Repository */}
                {activeQuestion?.codeExcerpt && (
                  <div className="rounded-xl bg-[#070707] border border-[#222222] overflow-hidden">
                    <div className="px-3.5 py-1.5 bg-[#111111] border-b border-[#1D1D1D] flex items-center justify-between text-[11px]">
                      <span className="font-mono text-amber-300 flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5" />
                        Code Inspected in {activeQuestion.referencedFiles?.[0] || "Repository"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCodeExcerpt((prev) => !prev)}
                        className="text-[#A1A1AA] hover:text-[#F5F5F5] cursor-pointer"
                      >
                        {showCodeExcerpt ? "Hide Snippet" : "Show Snippet"}
                      </button>
                    </div>
                    {showCodeExcerpt && (
                      <pre className="p-3.5 text-[11px] font-mono text-emerald-300/95 overflow-x-auto max-h-48 leading-relaxed">
                        {activeQuestion.codeExcerpt}
                      </pre>
                    )}
                  </div>
                )}

                {/* Multi-Turn Live Defense Log on Active Question */}
                {mode === "grill" && grillThread.length > 1 && (
                  <div className="p-3.5 rounded-xl bg-[#080808] border border-[#1D1D1D] space-y-2.5 max-h-52 overflow-y-auto">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                      Live Multi-Turn Defense Log ({activeQuestion?.referencedFiles?.[0] || "Repo"})
                    </div>
                    {grillThread.slice(1).map((turn, idx) => (
                      <div
                        key={idx}
                        className={clsx(
                          "p-2.5 rounded-lg text-xs leading-relaxed whitespace-pre-wrap",
                          turn.role === "candidate"
                            ? "bg-indigo-500/12 border border-indigo-500/25 text-indigo-100 ml-5"
                            : "bg-[#121212] border border-[#242424] text-[#E4E4E7] mr-5"
                        )}
                      >
                        <div className="text-[10px] font-bold text-[#A1A1AA] mb-0.5">
                          {turn.role === "candidate" ? "You (Candidate)" : "🤖 AI Project Bar-Raiser"}
                        </div>
                        {turn.content}
                      </div>
                    ))}
                  </div>
                )}

                {/* Collapsible Hint & Sample Answer Buttons */}
                <div className="flex items-center gap-4 pt-1 flex-wrap">
                  {activeQuestion?.hint && (
                    <button
                      type="button"
                      onClick={() => setShowHint(!showHint)}
                      className="text-xs text-[#A1A1AA] hover:text-[#F5F5F5] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      {showHint ? "Hide Hint" : "Interviewer Hint"}
                    </button>
                  )}

                  {activeQuestion?.sampleAnswer && (
                    <button
                      type="button"
                      onClick={() => setShowSample(!showSample)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {showSample ? "Hide Sample Answer" : "Sample STAR Answer"}
                    </button>
                  )}

                  {mode === "grill" && (
                    <button
                      type="button"
                      onClick={handleRequestProjectHint}
                      disabled={isLoadingAgentHint}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {isLoadingAgentHint ? "Generating Code Hint..." : "Ask Agent for Small Hint"}
                    </button>
                  )}
                </div>

                {showHint && activeQuestion?.hint && (
                  <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#292929] text-xs text-[#F5F5F5]/90 leading-relaxed font-sans animate-fadeIn space-y-2">
                    <div>
                      <strong className="text-[#A78BFA] block mb-1">Interviewer Expectations:</strong>
                      {activeQuestion.hint}
                    </div>
                    {activeQuestion.whyAskThis && activeQuestion.whyAskThis !== activeQuestion.hint && (
                      <p className="text-[11px] text-[#A1A1AA] pt-1 border-t border-[#1D1D1D]">
                        <strong className="text-[#F5F5F5]">Pro Tip:</strong> {activeQuestion.whyAskThis}
                      </p>
                    )}
                  </div>
                )}

                {showSample && activeQuestion?.sampleAnswer && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/25 text-xs text-emerald-200 leading-relaxed font-sans animate-fadeIn">
                    <strong className="text-emerald-400 block mb-1">STAR Model Response:</strong>
                    {activeQuestion.sampleAnswer}
                  </div>
                )}
              </Card>

              {/* 30-Second Proactive Idle Hint Offer Banner */}
              {mode === "grill" && showIdleHintOffer && (
                <div className="p-4 rounded-xl bg-cyan-950/45 border border-cyan-500/45 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
                  <div className="space-y-0.5 text-xs">
                    <div className="font-bold text-cyan-300">
                      💡 30s Thinking Pause Detected — Need a Small Code Hint?
                    </div>
                    <p className="text-[#D4D4D8]">
                      Want a directional nudge on {activeQuestion?.referencedFiles?.[0] || "this module"}?
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleRequestProjectHint}
                      disabled={isLoadingAgentHint}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs"
                    >
                      {isLoadingAgentHint ? "Loading Hint..." : "💡 Yes, Give Me a Hint"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowIdleHintOffer(false)}
                      className="text-xs"
                    >
                      No thanks
                    </Button>
                  </div>
                </div>
              )}

              {/* Active Directional Hint Box */}
              {mode === "grill" && agentHintCard && (
                <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/35 text-xs space-y-2 animate-fadeIn">
                  <div className="font-semibold text-cyan-300">💡 Agent Directional Hint:</div>
                  <p className="text-[#E4E4E7] leading-relaxed">{agentHintCard.spokenHint}</p>
                  {agentHintCard.clueKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {agentHintCard.clueKeywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 text-[11px] font-mono"
                        >
                          🔑 {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Response Workspace */}
              <Card className="p-5 bg-[#0D0D0D] border-[#1D1D1D] rounded-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1D1D1D]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNonDsaWorkspaceTab("verbal")}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                        nonDsaWorkspaceTab === "verbal"
                          ? "bg-[#121212] text-[#F5F5F5] border border-[#292929]"
                          : "text-[#71717A] hover:text-[#F5F5F5] border border-transparent"
                      )}
                    >
                      Verbal Response
                    </button>
                    <button
                      type="button"
                      onClick={() => setNonDsaWorkspaceTab("ide")}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer",
                        nonDsaWorkspaceTab === "ide"
                          ? "bg-[#121212] text-[#F5F5F5] border border-[#292929]"
                          : "text-[#71717A] hover:text-[#F5F5F5] border border-transparent"
                      )}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      Code Scratchpad
                    </button>
                  </div>

                  <span className="text-[11px] tabular-nums text-[#71717A]">
                    {response.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>

                {nonDsaWorkspaceTab === "verbal" ? (
                  <textarea
                    rows={6}
                    value={response}
                    onChange={(e) => {
                      setResponse(e.target.value);
                      countFillers(e.target.value);
                      if (idleSeconds !== 0) setIdleSeconds(0);
                    }}
                    placeholder="Speak your answer out loud (or type here). The live transcript will transcribe here..."
                    className="w-full p-3.5 text-xs bg-[#080808] border border-[#1D1D1D] rounded-xl text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#292929] leading-relaxed font-sans"
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <select
                        value={scratchpadLang}
                        onChange={(e) => setScratchpadLang(e.target.value)}
                        className="text-xs bg-[#080808] border border-[#1D1D1D] rounded-lg px-2.5 py-1.5 text-[#F5F5F5] focus:outline-none focus:border-[#292929]"
                      >
                        {CODE_LANGUAGES.map((lang) => (
                          <option key={lang.id} value={lang.id}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      rows={6}
                      value={codeSnippet}
                      onChange={(e) => {
                        setCodeSnippet(e.target.value);
                        if (idleSeconds !== 0) setIdleSeconds(0);
                      }}
                      onKeyDown={(e) => handleEditorKeyDown(e, codeSnippet, setCodeSnippet)}
                      placeholder="// Type architecture notes, pseudo-code, or SQL queries here..."
                      className="w-full p-3.5 text-xs bg-[#080808] border border-[#1D1D1D] rounded-xl text-emerald-300 font-mono placeholder-[#52525B] focus:outline-none focus:border-[#292929] leading-relaxed"
                      spellCheck={false}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-[#71717A]">
                    Evaluated against Amazon / Google Bar-Raiser rubric.
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSubmitEvaluation}
                    disabled={isEvaluating || (!response.trim() && !codeSnippet.trim())}
                    icon={isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    className="font-semibold text-xs cursor-pointer"
                  >
                    {isEvaluating ? "Evaluating Response..." : "Submit for Bar-Raiser AI Evaluation"}
                  </Button>
                </div>
              </Card>

              {/* ─── DETAILED EVALUATION & SCORECARD RESULT ─── */}
              {evalResult && (
                <div ref={evaluationRef} className="space-y-5 animate-fadeIn">
                  <Card className="p-6 bg-[#0D0D0D] border-[#1D1D1D] rounded-xl space-y-5">
                    {/* Overall Score Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1D1D1D] gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-amber-400" />
                          <h3 className="text-lg font-bold text-[#F5F5F5]">Bar-Raiser Evaluation Scorecard</h3>
                        </div>
                        <p className="text-xs text-[#A1A1AA] mt-1">{evalResult.deliveryCritique.pacingAdvice}</p>
                      </div>

                      <div className="text-center sm:text-right shrink-0">
                        <span className="text-3xl font-extrabold tabular-nums text-[#F5F5F5]">
                          {evalResult.overallScore}
                          <span className="text-sm font-normal text-[#71717A]">/100</span>
                        </span>
                        <span className="text-xs text-emerald-400 block font-semibold">
                          {evalResult.overallScore >= 85
                            ? "Strong Hire"
                            : evalResult.overallScore >= 70
                            ? "Hire"
                            : "Needs Improvement"}
                        </span>
                      </div>
                    </div>

                    {/* STAR Breakdown Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      {(["situation", "task", "action", "result"] as const).map((step) => {
                        const data = evalResult.starBreakdown[step];
                        const titles: Record<string, string> = {
                          situation: "Situation",
                          task: "Task",
                          action: "Action",
                          result: "Result",
                        };
                        return (
                          <div key={step} className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] space-y-1">
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-[#F5F5F5] capitalize">{titles[step]}</span>
                              <span className={clsx("tabular-nums", data.present ? "text-emerald-400" : "text-rose-400")}>
                                {data.score}%
                              </span>
                            </div>
                            <p className="text-[11px] text-[#A1A1AA] leading-snug">{data.feedback}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Interviewer Reaction + Detailed Answer Improvement Coaching */}
                    {evalResult.interviewerReaction && (
                      <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] text-xs text-[#E4E4E7] leading-relaxed">
                        <span className="font-semibold text-[#A78BFA]">Interviewer Feedback: </span>
                        {evalResult.interviewerReaction}
                      </div>
                    )}

                    {((evalResult.strengths && evalResult.strengths.length > 0) ||
                      (evalResult.improvements && evalResult.improvements.length > 0) ||
                      (evalResult.missedConcepts && evalResult.missedConcepts.length > 0)) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/25 space-y-2">
                          <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>What You Did Well</span>
                          </div>
                          {evalResult.strengths && evalResult.strengths.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1 text-[#D4D4D8] text-[11px] leading-relaxed">
                              {evalResult.strengths.map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[11px] text-[#A1A1AA]">
                              Clear explanation of core behavior. Add measurable trade-offs to elevate further.
                            </p>
                          )}
                        </div>

                        <div className="p-4 rounded-xl bg-amber-500/8 border border-amber-500/25 space-y-2">
                          <div className="font-bold text-amber-300 flex items-center gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                            <span>How to Improve Your Answer</span>
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-[#E4E4E7] text-[11px] leading-relaxed">
                            {(evalResult.improvements || []).map((imp, idx) => (
                              <li key={idx}>{imp}</li>
                            ))}
                            {(evalResult.missedConcepts || []).map((missed, idx) => (
                              <li key={`missed-${idx}`}>
                                Cover concept explicitly: <span className="font-mono text-amber-200">{missed}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Side-by-Side: Spoken vs Rewritten 95/100 Ideal Answer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-rose-500/8 border border-rose-500/25 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                          <span>Your Transcript</span>
                          <span className="text-[#71717A] text-[10px] tabular-nums">
                            {response.trim().split(/\s+/).filter(Boolean).length} words
                          </span>
                        </div>
                        <p className="text-xs text-[#F5F5F5]/90 leading-relaxed font-sans max-h-48 overflow-y-auto">
                          {response}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/25 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                          <span>95/100 Polished Model Answer</span>
                          <button
                            type="button"
                            onClick={handleCopyModelAnswer}
                            className="text-[10px] text-emerald-400 hover:text-[#F5F5F5] flex items-center gap-1 font-normal cursor-pointer transition-colors"
                          >
                            {copiedAnswer ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedAnswer ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                        <p className="text-xs text-emerald-200/90 leading-relaxed italic font-sans max-h-48 overflow-y-auto">
                          {evalResult.rewrittenIdealAnswer}
                        </p>
                      </div>
                    </div>

                    {/* Adaptive Difficulty Level-Up & Dynamic Escalation Card */}
                    {levelUpBanner && evalResult.adaptiveNextQuestion && (
                      <div
                        className={clsx(
                          "p-4 rounded-xl border flex flex-col sm:flex-row items-start justify-between gap-4 animate-fadeIn",
                          levelUpBanner.decision === "LEVEL_UP_HARDER_QUESTION"
                            ? "bg-gradient-to-r from-amber-950/50 via-orange-950/35 to-indigo-950/50 border-amber-400/50 shadow-lg shadow-amber-500/10"
                            : "bg-gradient-to-r from-indigo-950/50 to-slate-950/60 border-indigo-400/35"
                        )}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={clsx(
                                "text-[11px] uppercase font-extrabold tracking-wider flex items-center gap-1",
                                levelUpBanner.decision === "LEVEL_UP_HARDER_QUESTION"
                                  ? "text-amber-300"
                                  : "text-indigo-300"
                              )}
                            >
                              {levelUpBanner.decision === "LEVEL_UP_HARDER_QUESTION" ? (
                                <>
                                  <Rocket className="w-3.5 h-3.5 text-amber-400" />
                                  🔥 LEVEL UP (Score: {levelUpBanner.score}/100)! Promoted to Level {levelUpBanner.nextLevel}/3 Bar-Raiser Question
                                </>
                              ) : levelUpBanner.decision === "PROBE_CURRENT_LEVEL" ? (
                                <>
                                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                                  🎯 Adaptive Calibration (Score: {levelUpBanner.score}/100) — Level {levelUpBanner.nextLevel}/3 Targeted Probe Injected
                                </>
                              ) : (
                                <>
                                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                                  🛠️ Foundation Stepped to Level {levelUpBanner.nextLevel}/3 (Score: {levelUpBanner.score}/100)
                                </>
                              )}
                            </span>
                          </div>
                          {levelUpBanner.reaction && (
                            <p className="text-xs text-slate-300 italic">
                              Interviewer: &ldquo;{levelUpBanner.reaction}&rdquo;
                            </p>
                          )}
                          <p className="text-xs font-medium text-white/90 bg-black/35 px-3 py-2 rounded-lg border border-white/10">
                            Next Escalated Question: &ldquo;{evalResult.adaptiveNextQuestion.question}&rdquo;
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-center sm:self-start">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleProceedToAdaptiveQuestion}
                            className={clsx(
                              "text-xs font-bold shadow-lg",
                              levelUpBanner.decision === "LEVEL_UP_HARDER_QUESTION"
                                ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-600/25"
                                : "bg-[#1B1FB8] hover:bg-[#292EDB] text-white"
                            )}
                          >
                            Proceed to Escalated Level Question →
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Dynamic Follow-Up Turn Chain */}
                    {evalResult.followUpQuestion && (
                      <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#292929] flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <span className="text-[10px] uppercase font-bold text-[#A78BFA] tracking-wider">
                            Follow-Up Probe
                          </span>
                          <p className="text-sm font-semibold text-[#F5F5F5]">
                            &ldquo;{evalResult.followUpQuestion.prompt}&rdquo;
                          </p>
                          <p className="text-[11px] text-[#A1A1AA] italic">
                            Interviewer Intent: {evalResult.followUpQuestion.intent}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleChainFollowUpTurn}
                            className="text-xs font-semibold cursor-pointer"
                          >
                            Answer Follow-Up →
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleSaveSession}
                            className="text-xs cursor-pointer"
                          >
                            Save Session
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── ROUND SCORECARD MODAL ────────────────────────────────────────── */}
      {showScorecardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#0D0D0D] border border-[#292929] rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#1D1D1D]">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-[#F5F5F5]">Round Composite Scorecard</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScorecardModal(false)}
                className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#121212] cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#A1A1AA] block font-medium">Composite Round Verdict</span>
                <span className="text-lg font-bold text-emerald-400">
                  {scorecardAvgScore >= 85 ? "Strong Hire (Offer Recommended)" : scorecardAvgScore >= 70 ? "Hire" : "Needs Further Preparation"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold tabular-nums text-[#F5F5F5]">{scorecardAvgScore}</span>
                <span className="text-xs text-[#71717A]"> / 100</span>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allRoundTurns.map((turn, i) => (
                <div key={turn.id} className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-[#F5F5F5]">Q{i + 1}: {turn.questionText}</span>
                    <p className="text-[11px] text-[#A1A1AA] mt-0.5 truncate max-w-md">{turn.aiFeedback}</p>
                  </div>
                  <span className="font-mono tabular-nums font-bold text-[#F5F5F5] ml-2">{turn.score}%</span>
                </div>
              ))}
              {allRoundTurns.length === 0 && (
                <p className="text-xs text-[#71717A] text-center py-4">No completed turns yet this session.</p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#1D1D1D]">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowScorecardModal(false)}
                className="text-xs cursor-pointer"
              >
                Close Scorecard
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ─── PRE-INTERVIEW START OVERLAY ─────────────────────────────────────── */}
      {isPreStart && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 min-h-[480px] bg-black/80 animate-in fade-in duration-200">
          <Card className={clsx(
            "max-w-lg w-full bg-[#0D0D0D] rounded-2xl p-6 sm:p-8 text-center space-y-6 relative overflow-hidden border",
            isGrillMode ? "border-amber-500/35" : "border-[#1D1D1D]"
          )}>
            {/* Large BrainCircuit / Flame Icon */}
            <div className={clsx(
              "relative mx-auto w-16 h-16 rounded-2xl border flex items-center justify-center bg-[#121212]",
              isGrillMode
                ? "border-amber-500/35 text-amber-400"
                : "border-[#292929] text-[#A78BFA]"
            )}>
              {isGrillMode ? (
                <Flame className="w-8 h-8 text-amber-400" />
              ) : (
                <BrainCircuit className="w-8 h-8 text-[#A78BFA]" />
              )}
            </div>

            {/* Role Badge & Headings */}
            <div className="space-y-2">
              <div className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase font-mono border",
                isGrillMode
                  ? "bg-amber-500/12 border-amber-500/30 text-amber-300"
                  : "bg-[#121212] border-[#292929] text-[#F5F5F5]"
              )}>
                {isGrillMode ? <Flame className="w-3.5 h-3.5 text-amber-400" /> : <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />}
                <span>{selectedRole} Interview</span>
              </div>
              <h2 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">
                {activeStartCardTitle}
              </h2>
              <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-sm mx-auto leading-relaxed">
                {activeStartCardDesc}
              </p>
            </div>

            {/* Feature Indicators */}
            <div className="grid grid-cols-2 gap-2 text-left">
              {activeStartCardIndicators.map((ind, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] flex items-center gap-2">
                  <div className={clsx("w-2 h-2 rounded-full shrink-0", ind.dotColor)} />
                  <span className="text-[11px] text-[#F5F5F5]/90 font-medium">{ind.label}</span>
                </div>
              ))}
            </div>

            {/* Start Button & Note */}
            <div className="space-y-2.5 pt-1">
              <Button
                variant="primary"
                size="lg"
                onClick={handleStartInterview}
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full py-3.5 font-semibold text-sm rounded-xl justify-center cursor-pointer"
              >
                <span>Start Interview</span>
              </Button>
              <p className="text-[11px] text-[#71717A]">
                Camera and microphone access may be requested after starting.
              </p>
            </div>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}
