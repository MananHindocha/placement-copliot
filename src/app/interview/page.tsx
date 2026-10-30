"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  type InterviewRole,
} from "@/lib/interview-questions";
import type {
  InterviewQuestion,
  InterviewSession,
  InterviewCategory,
  InterviewEvaluationResponse,
  InterviewTurn,
  GitHubGrillAnalysis,
} from "@/types";
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
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Flame,
  Activity,
  Award,
  CheckCircle2,
  XCircle,
  GitBranch,
  FileCode,
  Layers,
  Search,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";

function GithubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

// ─── Ambient SpeechRecognition Types ─────────────────────────────────────────

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: {
    [index: number]: SpeechRecognitionResultItem;
    isFinal: boolean;
  };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

// ─── Category Configuration ──────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  InterviewCategory,
  { label: string; variant: "indigo" | "emerald" | "amber" | "violet" | "rose" }
> = {
  behavioral: { label: "Behavioral & STAR", variant: "indigo" },
  technical: { label: "Technical", variant: "violet" },
  situational: { label: "Situational", variant: "amber" },
  culture: { label: "Culture & Ownership", variant: "emerald" },
  "resume-grill": { label: "Resume Project Grill", variant: "rose" },
  "core-technical": { label: "Core Technical", variant: "violet" },
  "system-design": { label: "System Design", variant: "indigo" },
  dsa: { label: "DSA & Problem Solving", variant: "amber" },
  debugging: { label: "Live Debugging & RCA", variant: "rose" },
  "custom-jd": { label: "Custom JD Tailored", variant: "emerald" },
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "text-emerald-400",
  medium: "text-amber-400",
  hard: "text-rose-400",
};

const FILLER_WORDS_LIST = ["um", "uh", "like", "basically", "actually", "literally", "you know"] as const;

export default function InterviewPage() {
  // ─── Core Data State ────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Studio Configuration State ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"practice" | "history">("practice");
  const [studioMode, setStudioMode] = useState<"bank" | "grill">("bank");
  const [selectedRole, setSelectedRole] = useState<string>("Full-Stack SDE");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeakingTTS, setIsSpeakingTTS] = useState(false);
  const [filterCategory, setFilterCategory] = useState<"all" | InterviewCategory>("all");
  const [currentIdx, setCurrentIdx] = useState(0);

  // ─── Custom JD State ────────────────────────────────────────────────────────
  const [showCustomJdModal, setShowCustomJdModal] = useState(false);
  const [jdCompany, setJdCompany] = useState("");
  const [jdTitle, setJdTitle] = useState("");
  const [jdText, setJdText] = useState("");
  const [isGeneratingJd, setIsGeneratingJd] = useState(false);
  const [jdSuccessMsg, setJdSuccessMsg] = useState<string | null>(null);

  // ─── GitHub Link Analyzer (Resume Grill) State ──────────────────────────────
  const [githubUrl, setGithubUrl] = useState("");
  const [githubFocusNotes, setGithubFocusNotes] = useState("");
  const [isAnalyzingRepo, setIsAnalyzingRepo] = useState(false);
  const [githubAnalysis, setGithubAnalysis] = useState<GitHubGrillAnalysis | null>(null);

  // ─── Active Turn & Response State ───────────────────────────────────────────
  const [response, setResponse] = useState("");
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

  // ─── Multi-Turn Conversation State ──────────────────────────────────────────
  const [sessionTurns, setSessionTurns] = useState<InterviewTurn[]>([]);
  const [currentTurnOrder, setCurrentTurnOrder] = useState(1);

  // ─── Camera & Video State ───────────────────────────────────────────────────
  const [cameraActive, setCameraActive] = useState(false); // Default false for clean user-gesture initialization
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const [cameraErrorInfo, setCameraErrorInfo] = useState<{
    type: "denied" | "in_use" | "not_found" | "unsupported";
    message: string;
  } | null>(null);
  const [isVirtualCamera, setIsVirtualCamera] = useState(false);
  const [showTroubleshootHelp, setShowTroubleshootHelp] = useState(false);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [liveEyeContact, setLiveEyeContact] = useState<number>(-1);
  const [livePosture, setLivePosture] = useState<"Stable" | "Centering" | "Shifting">("Stable");

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
  const eyeSamplesRef = useRef<{ center: number; total: number }>({ center: 0, total: 0 });
  const recentDistancesRef = useRef<number[]>([]);

  // ─── Speech Synthesis (TTS) Helper ──────────────────────────────────────────
  const speakText = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      if (!ttsEnabled) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      utterance.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))
      );
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

  // ─── Initial Data Loading ───────────────────────────────────────────────────
  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([getInterviewQuestions(selectedRole), getPastInterviewSessions()])
      .then(([qs, past]) => {
        setQuestions(qs);
        setSessions(past);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load interview studio data.");
        setLoading(false);
      });
  }, [selectedRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Read cross-module handoff from /jobs or /tracker
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const handoffRaw = sessionStorage.getItem("copilot_interview_handoff");
      if (handoffRaw) {
        const handoff = JSON.parse(handoffRaw);
        sessionStorage.removeItem("copilot_interview_handoff");
        if (handoff.company) setJdCompany(handoff.company);
        if (handoff.title) setJdTitle(handoff.title);
        if (handoff.jobDescription) setJdText(handoff.jobDescription);
        setShowCustomJdModal(true);
      }
    } catch (e) {
      console.warn("Could not parse interview handoff", e);
    }
  }, []);

  // ─── Filtered Questions Based on Mode & Category ────────────────────────────
  const availableQuestions = questions.filter((q) => {
    if (studioMode === "grill") {
      return q.category === "resume-grill";
    }
    // Match role (if question has role specified)
    const roleMatches = !q.role || q.role.toLowerCase() === selectedRole.toLowerCase();
    if (!roleMatches) return false;

    if (filterCategory === "all") {
      return q.category !== "resume-grill";
    }
    return q.category === filterCategory;
  });

  const activeQuestion: InterviewQuestion | undefined =
    availableQuestions[currentIdx] || availableQuestions[0] || questions[0];

  // Auto-speak question when question changes if TTS is active
  useEffect(() => {
    if (activeQuestion && !evalResult && ttsEnabled) {
      speakText(activeQuestion.question);
    }
    return () => {
      stopTTS();
    };
  }, [activeQuestion, evalResult, ttsEnabled, speakText, stopTTS]);

  // ─── Virtual AI Camera Simulation (Fallback for no webcam / blocked access) ──
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
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, "#0a0f1d");
      grad.addColorStop(1, "#111827");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      // Studio grid lines
      ctx.strokeStyle = "rgba(99, 102, 241, 0.08)";
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

      // Breathing movement
      const breathe = Math.sin(frame * 0.04) * 3;
      const headX = 320 + Math.sin(frame * 0.02) * 5;
      const headY = 210 + breathe;

      // Glow behind avatar
      const glow = ctx.createRadialGradient(headX, headY, 20, headX, headY, 130);
      glow.addColorStop(0, "rgba(99, 102, 241, 0.22)");
      glow.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(headX, headY, 130, 0, Math.PI * 2);
      ctx.fill();

      // Shoulders
      ctx.fillStyle = "rgba(30, 41, 59, 0.9)";
      ctx.beginPath();
      ctx.ellipse(headX, 400 + breathe, 160, 95, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = "rgba(51, 65, 85, 0.95)";
      ctx.beginPath();
      ctx.ellipse(headX, headY, 65, 82, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye line guide
      ctx.strokeStyle = "rgba(129, 140, 248, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(headX - 22, headY - 10, 8, 0, Math.PI * 2);
      ctx.arc(headX + 22, headY - 10, 8, 0, Math.PI * 2);
      ctx.stroke();

      // Live watermark badge
      ctx.fillStyle = "rgba(52, 211, 153, 0.9)";
      ctx.font = "bold 12px Inter, sans-serif";
      ctx.fillText("● VIRTUAL AVATAR STREAM (ACTIVE)", 22, 36);

      virtualAnimRef.current = requestAnimationFrame(drawVirtualFrame);
    };

    drawVirtualFrame();

    try {
      const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
      if (stream) {
        videoStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Virtual stream setup error:", e);
    }

    setLiveEyeContact(88);
    setLivePosture("Stable");
  };

  // ─── Camera Start / Stop Lifecycle (Reliable Hardware Release) ───────────────
  const startCamera = async () => {
    setIsRequestingCamera(true);
    setCameraPermissionDenied(false);
    setCameraErrorInfo(null);
    setIsVirtualCamera(false);

    try {
      if (virtualAnimRef.current) {
        cancelAnimationFrame(virtualAnimRef.current);
        virtualAnimRef.current = null;
      }

      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((track) => track.stop());
        videoStreamRef.current = null;
      }

      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraErrorInfo({
          type: "unsupported",
          message: "MediaDevices API is unavailable in this environment (requires localhost or HTTPS).",
        });
        setCameraPermissionDenied(true);
        setIsRequestingCamera(false);
        return;
      }

      let vStream: MediaStream | null = null;
      try {
        vStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
        });
      } catch (firstErr: any) {
        // If permission explicitly denied by user, do not re-request immediately
        if (firstErr?.name === "NotAllowedError" || firstErr?.name === "PermissionDeniedError") {
          throw firstErr;
        }
        // Fallback to basic unconstrained video
        vStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      videoStreamRef.current = vStream;
      setCameraActive(true);
      setCameraPermissionDenied(false);
      setCameraErrorInfo(null);

      if (videoRef.current) {
        videoRef.current.srcObject = vStream;
        videoRef.current.play().catch(() => {});
      }

      // Start Gaze & Stability Tracking (10Hz)
      const offscreen = document.createElement("canvas");
      offscreen.width = 64;
      offscreen.height = 48;
      const offCtx = offscreen.getContext("2d", { willReadFrequently: true });

      if (gazeIntervalRef.current) clearInterval(gazeIntervalRef.current);
      gazeIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !offCtx || videoRef.current.readyState < 2) return;
        offCtx.drawImage(videoRef.current, 0, 0, 64, 48);
        const imgData = offCtx.getImageData(0, 0, 64, 48);
        const data = imgData.data;

        let totalLum = 0;
        let weightedX = 0;
        let weightedY = 0;

        for (let y = 0; y < 48; y += 2) {
          for (let x = 0; x < 64; x += 2) {
            const idx = (y * 64 + x) * 4;
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            if (lum > 35) {
              totalLum += lum;
              weightedX += x * lum;
              weightedY += y * lum;
            }
          }
        }

        if (totalLum > 0) {
          const cx = weightedX / totalLum;
          const cy = weightedY / totalLum;

          const inCenter = cx >= 20 && cx <= 44 && cy >= 14 && cy <= 34;
          eyeSamplesRef.current.total += 1;
          if (inCenter) eyeSamplesRef.current.center += 1;

          const ratio = Math.round((eyeSamplesRef.current.center / eyeSamplesRef.current.total) * 100);
          setLiveEyeContact(ratio);

          const dist = Math.hypot(cx - 32, cy - 24);
          recentDistancesRef.current.push(dist);
          if (recentDistancesRef.current.length > 12) recentDistancesRef.current.shift();
          const avgDist =
            recentDistancesRef.current.reduce((a, b) => a + b, 0) / recentDistancesRef.current.length;
          setLivePosture(avgDist < 5.5 ? "Stable" : avgDist < 10 ? "Centering" : "Shifting");
        }
      }, 120);
    } catch (err: any) {
      console.warn("[Webcam Notice] Camera access error:", err);
      let reason: "denied" | "in_use" | "not_found" | "unsupported" = "denied";
      let msg = "Camera permission was denied in your browser or Windows Privacy Settings.";

      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        reason = "denied";
        msg = "Camera permission was denied in your browser or Windows Privacy Settings.";
      } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
        reason = "in_use";
        msg = "Your webcam is currently locked by another application (e.g. Zoom, Teams, Skype, or Discord).";
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        reason = "not_found";
        msg = "No webcam device was detected. Please plug in or enable your camera.";
      } else {
        reason = "unsupported";
        msg = err?.message || "Unable to initialize video stream.";
      }

      setCameraErrorInfo({ type: reason, message: msg });
      setCameraPermissionDenied(true);
      setCameraActive(false);
      setLiveEyeContact(-1);
    } finally {
      setIsRequestingCamera(false);
    }
  };

  const stopCamera = () => {
    if (virtualAnimRef.current) {
      cancelAnimationFrame(virtualAnimRef.current);
      virtualAnimRef.current = null;
    }

    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      videoStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }

    if (gazeIntervalRef.current) {
      clearInterval(gazeIntervalRef.current);
      gazeIntervalRef.current = null;
    }

    setCameraActive(false);
    setIsVirtualCamera(false);
    setCameraPermissionDenied(false);
    setCameraErrorInfo(null);
    setLiveEyeContact(-1);
  };

  // Cleanup media tracks on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // ─── Real-Time Filler Counter ───────────────────────────────────────────────
  const countFillers = useCallback((text: string) => {
    const counts: Record<string, number> = {};
    const lower = text.toLowerCase();
    FILLER_WORDS_LIST.forEach((filler) => {
      const regex = new RegExp(`\\b${filler}\\b`, "gi");
      const matches = lower.match(regex);
      if (matches && matches.length > 0) {
        counts[filler] = matches.length;
      }
    });
    setFillerCounts(counts);
    return counts;
  }, []);

  // ─── Dual-Engine Speech Recording (Web Speech + Groq Whisper) ───────────────
  const startRecording = async () => {
    stopTTS();
    setIsRecording(true);
    isRecordingRef.current = true;
    setDurationSeconds(0);
    setWpmHistory([]);
    eyeSamplesRef.current = { center: 0, total: 0 };
    recentDistancesRef.current = [];
    lastSpokenTimestampRef.current = Date.now();
    setIsHesitating(false);
    setHesitationGaps(0);
    audioChunksRef.current = [];

    // 1. Acquire Microphone Audio Stream for MediaRecorder and Audio Visualizer
    try {
      if (!audioStreamRef.current || audioStreamRef.current.getAudioTracks().length === 0) {
        const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = aStream;
      }

      const audioStream = audioStreamRef.current;

      // Initialize MediaRecorder for parallel audio capture (Whisper backup)
      if (typeof MediaRecorder !== "undefined" && audioStream) {
        try {
          const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "audio/mp4";

          const recorder = new MediaRecorder(audioStream, { mimeType });
          mediaRecorderRef.current = recorder;
          audioChunksRef.current = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          recorder.start(250); // Slice chunks every 250ms
        } catch (recErr) {
          console.warn("[MediaRecorder] Failed to start recorder:", recErr);
        }
      }

      // AudioContext & AnalyserNode for live 60-bar waveform
      if (audioStream && audioStream.getAudioTracks().length > 0) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioCtxRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          const source = audioCtx.createMediaStreamSource(audioStream);
          source.connect(analyser);

          const canvas = audioCanvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const renderWaveform = () => {
              if (!ctx || !isRecordingRef.current) return;
              analyser.getByteFrequencyData(dataArray);

              ctx.clearRect(0, 0, canvas.width, canvas.height);
              const barWidth = (canvas.width / bufferLength) * 1.6;
              let x = 0;

              for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
                const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
                gradient.addColorStop(0, "rgba(99, 102, 241, 0.2)");
                gradient.addColorStop(1, "rgba(16, 185, 129, 0.9)");

                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 2;
              }

              animFrameRef.current = requestAnimationFrame(renderWaveform);
            };

            renderWaveform();
          }
        }
      }
    } catch (micErr) {
      console.warn("[Microphone Notice] Mic stream error:", micErr);
    }

    // 2. Initialize Browser Web SpeechRecognition with Auto-Restart
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          lastSpokenTimestampRef.current = Date.now();
          setIsHesitating(false);

          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + " ";
          }
          const clean = currentTranscript.trim();
          setResponse(clean);
          countFillers(clean);
        };

        recognition.onerror = (err) => {
          console.warn("[SpeechRecognition Error]:", err);
        };

        recognition.onend = () => {
          // If the browser terminated listening due to 3-5 seconds of silence, automatically restart!
          if (isRecordingRef.current) {
            try {
              recognition.start();
            } catch {
              // Ignore if already active
            }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (sttErr) {
        console.warn("[SpeechRec] Web Speech could not start:", sttErr);
      }
    }

    // 3. Interval: Timer, WPM calculator, and Hesitation Silence detector (>2.5s)
    let elapsed = 0;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    recordingTimerRef.current = setInterval(() => {
      elapsed += 1;
      setDurationSeconds(elapsed);

      const silenceDuration = Date.now() - lastSpokenTimestampRef.current;
      if (silenceDuration > 2500 && elapsed > 3) {
        setIsHesitating(true);
        setHesitationGaps((prev) => prev + 1);
      } else {
        setIsHesitating(false);
      }

      if (elapsed % 4 === 0) {
        setResponse((currentText) => {
          const words = currentText.trim().split(/\s+/).filter(Boolean).length;
          const currentWpm = Math.round((words / elapsed) * 60);
          setLiveWpm(currentWpm);
          setWpmHistory((prev) => [...prev, currentWpm]);
          return currentText;
        });
      }
    }, 1000);
  };

  const stopRecording = async () => {
    setIsRecording(false);
    isRecordingRef.current = false;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    // Stop MediaRecorder and evaluate Groq Whisper transcription if needed
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    const words = response.trim().split(/\s+/).filter(Boolean).length;
    const finalWpm = durationSeconds > 0 ? Math.round((words / Math.max(1, durationSeconds)) * 60) : 120;
    setLiveWpm(finalWpm);
    countFillers(response);

    // If Web Speech produced very little or candidate recorded audio, send to Groq Whisper for 100% precision
    if (audioChunksRef.current.length > 0 && (words < 4 || durationSeconds >= 3)) {
      setTimeout(async () => {
        try {
          setIsTranscribingWithWhisper(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          const res = await fetch("/api/interview/transcribe", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.text && data.text.trim().length > response.trim().length) {
              setResponse(data.text.trim());
              countFillers(data.text.trim());
              if (data.wordsPerMinute) {
                setLiveWpm(data.wordsPerMinute);
              }
            }
          }
        } catch (transcribeErr) {
          console.warn("[Whisper Transcribe Error]:", transcribeErr);
        } finally {
          setIsTranscribingWithWhisper(false);
        }
      }, 350);
    }
  };

  // ─── Evaluation Submission ──────────────────────────────────────────────────
  const handleEvaluate = async () => {
    if (!response.trim() || !activeQuestion) return;
    if (isRecording) stopRecording();
    setIsEvaluating(true);
    setSaveSuccessMsg(null);

    const words = response.trim().split(/\s+/).filter(Boolean).length;
    const calculatedWpm = durationSeconds > 0 ? Math.round((words / durationSeconds) * 60) : 125;
    const totalFillers = Object.values(fillerCounts).reduce((a, b) => a + b, 0);

    try {
      const evaluation = await evaluateInterviewAnswer({
        questionId: activeQuestion.id,
        questionText: activeQuestion.question,
        category: activeQuestion.category,
        role: selectedRole,
        userTranscript: response.trim(),
        durationSeconds: Math.max(10, durationSeconds),
        telemetry: {
          avgWpm: liveWpm || calculatedWpm,
          wpmTimeSeries: wpmHistory.length > 0 ? wpmHistory : [calculatedWpm],
          fillerWords: fillerCounts,
          totalFillerCount: totalFillers,
          hesitationGapsCount: hesitationGaps,
          eyeContactPct: cameraActive && !cameraPermissionDenied ? liveEyeContact : -1,
          postureStabilityPct: livePosture === "Stable" ? 92 : livePosture === "Centering" ? 78 : 65,
        },
        resumeContext: studioMode === "grill" ? `Project Architect: ${selectedRole}` : undefined,
        githubRepoContext: githubAnalysis ? JSON.stringify(githubAnalysis.summary) : undefined,
        customJdContext: jdText ? `${jdCompany} - ${jdTitle}: ${jdText.slice(0, 500)}` : undefined,
      });

      setEvalResult(evaluation);
      setIsEvaluating(false);

      if (ttsEnabled && evaluation.followUpQuestion?.prompt) {
        setTimeout(() => {
          speakText(`Follow-up probe: ${evaluation.followUpQuestion.prompt}`);
        }, 1200);
      }
    } catch (err: unknown) {
      setIsEvaluating(false);
      setError(err instanceof Error ? err.message : "Failed to evaluate interview answer.");
    }
  };

  // ─── Multi-Turn Chaining: Answer Follow-Up Probe ────────────────────────────
  const handleChainFollowUpTurn = () => {
    if (!evalResult || !activeQuestion) return;

    const completedTurn: InterviewTurn = {
      id: `turn-${Date.now()}-${currentTurnOrder}`,
      questionText: activeQuestion.question,
      category: activeQuestion.category,
      userAnswer: response,
      aiFeedback: evalResult.deliveryCritique.pacingAdvice,
      score: evalResult.overallScore,
      contentScore: evalResult.contentScore,
      deliveryScore: evalResult.deliveryScore,
      avgWpm: liveWpm,
      fillerWordCount: Object.values(fillerCounts).reduce((a, b) => a + b, 0),
      eyeContactScore: liveEyeContact >= 0 ? liveEyeContact : undefined,
      starBreakdown: evalResult.starBreakdown,
      rewrittenAnswer: evalResult.rewrittenIdealAnswer,
      followUpQuestion: evalResult.followUpQuestion.prompt,
      turnOrder: currentTurnOrder,
    };

    setSessionTurns((prev) => [...prev, completedTurn]);
    setCurrentTurnOrder((prev) => prev + 1);

    const followUpQuestionObj: InterviewQuestion = {
      id: `iq-followup-${Date.now()}`,
      category: activeQuestion.category,
      difficulty: "hard",
      question: evalResult.followUpQuestion.prompt,
      hint: `Interviewer Cross-Question Intent: ${evalResult.followUpQuestion.intent}`,
      sampleAnswer: evalResult.rewrittenIdealAnswer,
      followUps: [],
    };

    setQuestions((prev) => [followUpQuestionObj, ...prev]);
    setCurrentIdx(0);
    setResponse("");
    setEvalResult(null);
    setDurationSeconds(0);
    setLiveWpm(0);
    setWpmHistory([]);

    if (ttsEnabled) {
      speakText(evalResult.followUpQuestion.prompt);
    }
  };

  // ─── Custom JD Question Generation ──────────────────────────────────────────
  const handleGenerateCustomJd = async () => {
    if (!jdText.trim() || jdText.trim().length < 20) {
      setError("Please paste a job description of at least 20 characters.");
      return;
    }

    setIsGeneratingJd(true);
    setError(null);
    setJdSuccessMsg(null);

    try {
      const res = await fetch("/api/interview/custom-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetCompany: jdCompany.trim(),
          jobTitle: jdTitle.trim() || selectedRole,
          jobDescription: jdText.trim(),
          count: 8,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate questions from JD");
      }

      const data = await res.json();
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions((prev) => [...data.questions, ...prev]);
        setFilterCategory("all");
        setCurrentIdx(0);
        setResponse("");
        setEvalResult(null);
        setJdSuccessMsg(`Generated ${data.questions.length} tailored interview questions!`);
        setShowCustomJdModal(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error generating questions from JD");
    } finally {
      setIsGeneratingJd(false);
    }
  };

  // ─── GitHub Link Analyzer (Resume Project Grill) ────────────────────────────
  const handleAnalyzeGitHubRepo = async () => {
    if (!githubUrl.trim()) {
      setError("Please enter a valid GitHub repository URL (e.g., https://github.com/facebook/react or owner/repo).");
      return;
    }

    setIsAnalyzingRepo(true);
    setError(null);

    try {
      const res = await fetch("/api/interview/github-grill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl: githubUrl.trim(),
          focusNotes: githubFocusNotes.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to analyze GitHub repository");
      }

      const data = await res.json();
      if (data.analysis) {
        const analysis: GitHubGrillAnalysis = data.analysis;
        setGithubAnalysis(analysis);

        const convertedQuestions: InterviewQuestion[] = analysis.grillQuestions.map((gq, i) => ({
          id: gq.id || `gh-grill-${Date.now()}-${i + 1}`,
          role: `${analysis.owner}/${analysis.repoName}`,
          category: "resume-grill",
          difficulty: gq.difficulty === "Medium" ? "medium" : "hard",
          question: gq.question,
          hint: `${gq.whatInterviewerLooksFor} · Hint: ${gq.hint}`,
          sampleAnswer: `Architectural breakdown for ${analysis.repoName}`,
          followUps: [],
          keyConceptsToCover: gq.referencedFiles,
          referencedFiles: gq.referencedFiles,
        }));

        setQuestions((prev) => [...convertedQuestions, ...prev]);
        setCurrentIdx(0);
        setResponse("");
        setEvalResult(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to analyze repository");
    } finally {
      setIsAnalyzingRepo(false);
    }
  };

  // ─── Save Session to Supabase / Local History ───────────────────────────────
  const handleSaveSession = async () => {
    if (!evalResult || !activeQuestion) return;
    try {
      await recordInterviewSession({
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
        turns: [
          ...sessionTurns,
          {
            id: `turn-${Date.now()}-final`,
            questionText: activeQuestion.question,
            category: activeQuestion.category,
            userAnswer: response,
            aiFeedback: evalResult.deliveryCritique.pacingAdvice,
            score: evalResult.overallScore,
            contentScore: evalResult.contentScore,
            deliveryScore: evalResult.deliveryScore,
            avgWpm: liveWpm,
            fillerWordCount: Object.values(fillerCounts).reduce((a, b) => a + b, 0),
            eyeContactScore: liveEyeContact >= 0 ? liveEyeContact : undefined,
            starBreakdown: evalResult.starBreakdown,
            rewrittenAnswer: evalResult.rewrittenIdealAnswer,
            followUpQuestion: evalResult.followUpQuestion.prompt,
            turnOrder: currentTurnOrder,
          },
        ],
      });

      setSaveSuccessMsg("Interview session successfully saved to your profile history!");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save session.");
    }
  };

  const handleCopyModelAnswer = () => {
    if (!evalResult?.rewrittenIdealAnswer) return;
    navigator.clipboard.writeText(evalResult.rewrittenIdealAnswer);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  const catConfig = CATEGORY_CONFIG[activeQuestion?.category || "behavioral"] || {
    label: "Question",
    variant: "indigo" as const,
  };
  const totalFillersSpoken = Object.values(fillerCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── HEADER / NAVIGATION BAR ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Brain className="w-7 h-7 text-indigo-400" />
            AI Mock Interview Coach
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dual-Engine Whisper Speech Analysis, Video Gaze HUD &amp; STAR Bar-Raiser Feedback
          </p>
        </div>

        {/* View Switcher: Studio vs Session History */}
        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/6 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("practice")}
            className={clsx(
              "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all",
              activeTab === "practice"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Mic className="w-3.5 h-3.5" />
            AI Studio Stage
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={clsx(
              "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all",
              activeTab === "history"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            Session History ({sessions.length})
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => setError(null)} />}
      {jdSuccessMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {jdSuccessMsg}
          </span>
          <button type="button" onClick={() => setJdSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {saveSuccessMsg}
          </span>
          <button type="button" onClick={() => setSaveSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* ─── STUDIO CONTROLS BAR ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-3 rounded-2xl bg-black/40 border border-white/6">
        {/* Left: Mode Selection (Bank vs Resume Grill) */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setStudioMode("bank");
              setCurrentIdx(0);
              setEvalResult(null);
              setResponse("");
            }}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
              studioMode === "bank"
                ? "bg-white/10 text-white border border-white/15 font-semibold"
                : "text-slate-400 hover:text-white"
            )}
          >
            Standard Question Bank
          </button>
          <button
            type="button"
            onClick={() => {
              setStudioMode("grill");
              setCurrentIdx(0);
              setEvalResult(null);
              setResponse("");
            }}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
              studioMode === "grill"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold"
                : "text-slate-400 hover:text-rose-300"
            )}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            🔥 Resume Project Grill
          </button>

          {/* Custom JD Generator Trigger */}
          <button
            type="button"
            onClick={() => setShowCustomJdModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Custom JD Generator
          </button>
        </div>

        {/* Right: Role Dropdown & TTS Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => {
                const newRole = e.target.value;
                setSelectedRole(newRole);
                setCurrentIdx(0);
                setEvalResult(null);
                setResponse("");
                const newQuestions = getRoleInterviewQuestions(newRole, filterCategory);
                setQuestions(newQuestions);
              }}
              className="text-xs bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {INTERVIEW_ROLES.map((r) => (
                <option key={r} value={r} className="bg-slate-900 text-slate-200">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextVal = !ttsEnabled;
              setTtsEnabled(nextVal);
              if (!nextVal) stopTTS();
            }}
            title={ttsEnabled ? "Mute AI Voice Interviewer" : "Enable AI Voice Interviewer"}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
              ttsEnabled
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                : "bg-white/5 text-slate-400 border-white/10"
            )}
          >
            {ttsEnabled ? (
              <>
                <Volume2 className={clsx("w-3.5 h-3.5 text-emerald-400", isSpeakingTTS && "animate-pulse")} />
                <span>Interviewer Voice ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span>Voice Muted</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── CUSTOM JD GENERATOR MODAL ───────────────────────────────────────── */}
      {showCustomJdModal && (
        <Card className="p-6 bg-gradient-to-br from-[#0e1424] via-[#11182c] to-[#0e1424] border-indigo-500/30 shadow-2xl animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-white/8 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Generate Custom Interview Questions from Job Description</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCustomJdModal(false)}
              className="text-slate-400 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Paste any job posting or company requirements. Our AI will analyze the tech stack, scale, and responsibilities to generate 8-10 tough bar-raiser interview questions.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Target Company (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Google, Stripe, Razorpay"
                value={jdCompany}
                onChange={(e) => setJdCompany(e.target.value)}
                className="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Target Job Title (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Senior Backend Engineer"
                value={jdTitle}
                onChange={(e) => setJdTitle(e.target.value)}
                className="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-300 block mb-1">Job Description &amp; Technical Requirements *</label>
            <textarea
              rows={5}
              placeholder="Paste the full job description, required tech stack, responsibilities, or qualification bullet points..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              className="w-full text-xs bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowCustomJdModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={isGeneratingJd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              onClick={handleGenerateCustomJd}
              disabled={isGeneratingJd || !jdText.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {isGeneratingJd ? "Analyzing JD & Generating Questions..." : "Generate Interview Questions"}
            </Button>
          </div>
        </Card>
      )}

      {/* ─── RESUME PROJECT GRILL: GITHUB REPO ANALYZER ───────────────────────── */}
      {studioMode === "grill" && (
        <Card className="p-6 bg-gradient-to-br from-[#160b14] via-[#1a0f1d] to-[#120a16] border-rose-500/30 shadow-2xl animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-rose-500/20 mb-4 gap-3">
            <div className="flex items-center gap-2.5">
              <GithubIcon className="w-6 h-6 text-rose-400" />
              <div>
                <h3 className="text-base font-bold text-white">GitHub Repository Deep-Grill Analyzer</h3>
                <p className="text-xs text-rose-300/80">
                  Provide your project repo to analyze file trees, dependencies, and commit history for file-specific grilling.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
            <div className="lg:col-span-7">
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                GitHub Repository URL (or owner/repo) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="https://github.com/facebook/react or username/project-name"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="lg:col-span-5">
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Focus Notes / Key Modules (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Focus on WebSocket engine, Redis lock, auth JWT"
                value={githubFocusNotes}
                onChange={(e) => setGithubFocusNotes(e.target.value)}
                className="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              ⚡ Inspects README.md, package.json, file tree, and git commits to formulate deep technical cross-questions.
            </span>
            <Button
              variant="primary"
              size="sm"
              icon={isAnalyzingRepo ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Search className="w-4 h-4" />}
              onClick={handleAnalyzeGitHubRepo}
              disabled={isAnalyzingRepo || !githubUrl.trim()}
              className="bg-rose-600 hover:bg-rose-500 text-white font-medium"
            >
              {isAnalyzingRepo ? "Inspecting Codebase & Formulating Questions..." : "Analyze Repo & Generate Grill Questions"}
            </Button>
          </div>

          {/* Repository Intelligence Result Card */}
          {githubAnalysis && (
            <div className="mt-5 pt-4 border-t border-rose-500/20 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-rose-400" />
                  Repository Intelligence: {githubAnalysis.owner}/{githubAnalysis.repoName}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {githubAnalysis.detectedStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-200 border border-rose-500/30"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/6">
                {githubAnalysis.summary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="font-bold text-emerald-400 block mb-1">Architecture Highlights</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                    {githubAnalysis.architectureStrengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="font-bold text-rose-400 block mb-1">Risk Areas Under Grill</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                    {githubAnalysis.potentialWeaknessesOrRisks.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {loading && questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-slate-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm font-medium">Initializing Multi-Modal AI Interview Studio...</p>
        </div>
      ) : activeTab === "history" ? (
        /* ─── PAST SESSIONS VIEW ────────────────────────────────────────────── */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="text-center p-4">
              <MessageSquare className="w-5 h-5 mx-auto mb-2 text-indigo-400" />
              <p className="text-2xl font-bold text-white">{sessions.length}</p>
              <p className="text-xs text-slate-400">Total Sessions</p>
            </Card>
            <Card className="text-center p-4">
              <Star className="w-5 h-5 mx-auto mb-2 text-amber-400" />
              <p className="text-2xl font-bold text-white">
                {sessions.length
                  ? `${Math.round(sessions.reduce((s, i) => s + i.score, 0) / sessions.length)}%`
                  : "N/A"}
              </p>
              <p className="text-xs text-slate-400">Average Composite Score</p>
            </Card>
            <Card className="text-center p-4">
              <TrendingUp className="w-5 h-5 mx-auto mb-2 text-emerald-400" />
              <p className="text-2xl font-bold text-white">
                {sessions.reduce((s, i) => s + (i.questionsAnswered || 1), 0)}
              </p>
              <p className="text-xs text-slate-400">Questions Answered</p>
            </Card>
            <Card className="text-center p-4">
              <Activity className="w-5 h-5 mx-auto mb-2 text-violet-400" />
              <p className="text-2xl font-bold text-white">128 WPM</p>
              <p className="text-xs text-slate-400">Average Speaking Pacing</p>
            </Card>
          </div>

          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id} hover className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                        <circle
                          cx="28"
                          cy="28"
                          r="22"
                          fill="none"
                          stroke="rgba(255,255,255,0.06)"
                          strokeWidth="5"
                        />
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
                      <span className="absolute text-sm font-bold text-white">{session.score}</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-white">{session.role}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" /> {session.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Brain className="w-3 h-3 text-slate-500" /> {session.questionsAnswered} Turns
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-slate-500" /> {session.duration}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 bg-white/4 px-3 py-2 rounded-xl border border-white/6 max-w-md">
                    💬 {session.feedback}
                  </div>
                </div>
              </Card>
            ))}

            {sessions.length === 0 && (
              <div className="p-12 text-center text-slate-400 border border-dashed border-white/10 rounded-2xl">
                No past sessions recorded yet. Start practicing in the AI Studio Stage above!
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─── AI STUDIO STAGE VIEW ─────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Category Filter Pills (when in Bank Mode) */}
          {studioMode === "bank" && (
            <div className="flex items-center gap-2 flex-wrap">
              {EXPANDED_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setFilterCategory(cat.id);
                    setCurrentIdx(0);
                    setEvalResult(null);
                    setResponse("");
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    filterCategory === cat.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:text-white border border-white/6"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* MAIN SPLIT STAGE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ─── LEFT PANEL: Live Webcam HUD & Acoustic Waveform (5 cols) ─── */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl backdrop-blur-md">
                {/* Video Feed Box */}
                <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
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
                      <div className="p-2.5 rounded-full bg-rose-500/10 border border-rose-500/20 mb-2">
                        <VideoOff className="w-8 h-8 text-rose-400" />
                      </div>
                      <p className="text-xs font-semibold text-white">
                        {cameraPermissionDenied
                          ? cameraErrorInfo?.type === "in_use"
                            ? "Webcam In Use By Another App"
                            : cameraErrorInfo?.type === "not_found"
                            ? "No Webcam Hardware Detected"
                            : "Camera Permission Denied"
                          : "Camera Turned Off"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        {cameraPermissionDenied
                          ? cameraErrorInfo?.message || "Please allow camera access in your browser address bar or Windows Settings."
                          : "Audio-Only practice mode is active. You can turn on camera or use Virtual Avatar mode."}
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={startCamera}
                          disabled={isRequestingCamera}
                          className="px-3 py-1.5 text-[11px] font-medium bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/40 text-white rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          {isRequestingCamera ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Video className="w-3.5 h-3.5 text-emerald-300" />
                          )}
                          <span>{cameraPermissionDenied ? "Retry Real Camera" : "Turn On Camera"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={startVirtualCamera}
                          className="px-3 py-1.5 text-[11px] font-medium bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-lg transition-all flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          <span>⚡ Virtual AI Avatar Mode</span>
                        </button>

                        {cameraPermissionDenied && (
                          <button
                            type="button"
                            onClick={() => setShowTroubleshootHelp(!showTroubleshootHelp)}
                            className="px-2.5 py-1 text-[10px] font-medium text-slate-400 hover:text-slate-200 underline transition-all"
                          >
                            {showTroubleshootHelp ? "Hide Guide" : "How to allow camera?"}
                          </button>
                        )}
                      </div>

                      {cameraPermissionDenied && showTroubleshootHelp && (
                        <div className="mt-3.5 text-left p-3 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-[10px] text-slate-300 space-y-1.5 animate-fadeIn">
                          <p className="font-semibold text-indigo-300 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-indigo-400" /> Quick 3-Step Fix:
                          </p>
                          <p>
                            <span className="text-white font-medium">1. Browser Address Bar:</span> Click the lock / tune icon on the left of <code className="bg-black/50 px-1 py-0.5 rounded text-indigo-200">http://localhost:3000</code> &rarr; set <b>Camera</b> to <b>Allow</b>.
                          </p>
                          <p>
                            <span className="text-white font-medium">2. Windows Privacy:</span> Press <kbd className="bg-black/50 px-1 rounded text-white">Win + I</kbd> &rarr; <b>Privacy &amp; Security</b> &rarr; <b>Camera</b> &rarr; turn ON <b>&quot;Let desktop apps access your camera&quot;</b>.
                          </p>
                          <p>
                            <span className="text-white font-medium">3. Close Other Apps:</span> Ensure Zoom, Teams, Skype, OBS, or Discord aren&apos;t holding your camera hardware.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sci-Fi Target Reticle Overlay (When camera active) */}
                  {cameraActive && !cameraPermissionDenied && (
                    <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div className="w-4 h-4 border-t-2 border-l-2 border-indigo-500/80" />
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/70 border border-emerald-500/40 text-[10px] text-emerald-300 font-semibold backdrop-blur-sm pointer-events-auto">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{isVirtualCamera ? "VIRTUAL AVATAR HUD" : "LIVE WEBCAM HUD"}</span>
                          {isVirtualCamera && (
                            <button
                              type="button"
                              onClick={startCamera}
                              className="ml-1 text-[9px] text-indigo-300 underline hover:text-white"
                            >
                              Try Hardware
                            </button>
                          )}
                        </div>
                        <div className="w-4 h-4 border-t-2 border-r-2 border-indigo-500/80" />
                      </div>

                      {/* Head Centering Guide Box */}
                      <div className="self-center w-28 h-28 border border-dashed border-indigo-400/30 rounded-2xl flex items-center justify-center" />

                      <div className="flex justify-between items-end">
                        <div className="w-4 h-4 border-b-2 border-l-2 border-indigo-500/80" />
                        <div className="w-4 h-4 border-b-2 border-r-2 border-indigo-500/80" />
                      </div>
                    </div>
                  )}

                  {/* Audio Frequency Waveform Canvas Overlay */}
                  <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-black/90 to-transparent pointer-events-none flex items-end px-3 pb-1">
                    <canvas ref={audioCanvasRef} width={280} height={40} className="w-full h-8 opacity-85" />
                  </div>
                </div>

                {/* HUD Telemetry Badges & Camera Toggle */}
                <div className="p-3 bg-black/40 border-t border-white/6 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-slate-400">Eye Contact:</span>
                      <span
                        className={clsx(
                          "font-bold",
                          liveEyeContact >= 75
                            ? "text-emerald-400"
                            : liveEyeContact >= 50
                            ? "text-amber-400"
                            : liveEyeContact === -1
                            ? "text-slate-500"
                            : "text-rose-400"
                        )}
                      >
                        {liveEyeContact >= 0 ? `${liveEyeContact}%` : "Off"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-slate-400">Posture:</span>
                      <span
                        className={clsx(
                          "font-semibold",
                          livePosture === "Stable"
                            ? "text-emerald-400"
                            : livePosture === "Centering"
                            ? "text-amber-400"
                            : "text-rose-400"
                        )}
                      >
                        {livePosture}
                      </span>
                    </div>
                  </div>

                  {/* Camera Toggle Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (cameraActive) {
                        stopCamera();
                      } else {
                        startCamera();
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/5 border border-white/8 text-slate-300 hover:text-white"
                  >
                    {cameraActive ? (
                      <>
                        <VideoOff className="w-3 h-3 text-rose-400" /> Turn Camera Off
                      </>
                    ) : (
                      <>
                        <Video className="w-3 h-3 text-emerald-400" /> Turn Camera On
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* STAR Framework Hint Card */}
              <Card className="p-3.5 bg-[#0e1424]/80 border-white/6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> STAR Framework Checklist
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHint(!showHint)}
                    className="text-[11px] text-indigo-400 hover:underline"
                  >
                    {showHint ? "Collapse" : "Expand"}
                  </button>
                </div>

                {showHint && (
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 mt-2">
                    <div className="p-2 rounded-lg bg-white/2 border border-white/4">
                      <strong className="text-indigo-400">S · Situation:</strong> Context, scale, and timeframe.
                    </div>
                    <div className="p-2 rounded-lg bg-white/2 border border-white/4">
                      <strong className="text-violet-400">T · Task:</strong> The exact bottleneck or goal.
                    </div>
                    <div className="p-2 rounded-lg bg-white/2 border border-white/4">
                      <strong className="text-emerald-400">A · Action:</strong> Architectural choices led by you.
                    </div>
                    <div className="p-2 rounded-lg bg-white/2 border border-white/4">
                      <strong className="text-amber-400">R · Result:</strong> Quantified metrics (% / latency / users).
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* ─── RIGHT PANEL: Prompt, Live Telemetry Strip & Input (7 cols) ─── */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="p-5 bg-[#0e1424] border-white/8 shadow-xl">
                {/* Header: Turn order, category, difficulty */}
                <div className="flex items-center justify-between pb-3 border-b border-white/6 mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
                      Turn {currentTurnOrder}
                    </span>
                    <Badge variant={catConfig.variant} size="sm">
                      {catConfig.label}
                    </Badge>
                    <span
                      className={clsx(
                        "text-xs font-semibold capitalize",
                        DIFFICULTY_COLOR[activeQuestion?.difficulty || "medium"]
                      )}
                    >
                      {activeQuestion?.difficulty}
                    </span>
                    {activeQuestion?.role && (
                      <span className="text-[10px] text-slate-400 border border-white/10 px-2 py-0.5 rounded-full">
                        {activeQuestion.role}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Previous question"
                      onClick={() => {
                        setCurrentIdx((i) => Math.max(0, i - 1));
                        setResponse("");
                        setEvalResult(null);
                      }}
                      disabled={currentIdx === 0}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/6 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-400 font-medium">
                      {availableQuestions.length > 0 ? `${currentIdx + 1} / ${availableQuestions.length}` : "0 / 0"}
                    </span>
                    <button
                      type="button"
                      aria-label="Next question"
                      onClick={() => {
                        setCurrentIdx((i) => Math.min(availableQuestions.length - 1, i + 1));
                        setResponse("");
                        setEvalResult(null);
                      }}
                      disabled={currentIdx >= availableQuestions.length - 1}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/6 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main Question Text */}
                <h2 className="text-base sm:text-lg font-bold text-white mb-3 leading-relaxed">
                  {activeQuestion?.question}
                </h2>

                {/* Referenced Files Pill (if available, e.g. in GitHub Grill mode) */}
                {activeQuestion?.referencedFiles && activeQuestion.referencedFiles.length > 0 && (
                  <div className="mb-3 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Referenced Files:</span>
                    {activeQuestion.referencedFiles.map((file) => (
                      <span
                        key={file}
                        className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-[11px] text-indigo-300"
                      >
                        {file}
                      </span>
                    ))}
                  </div>
                )}

                {/* Question Hint */}
                {activeQuestion?.hint && (
                  <div className="mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-indigo-300">Interviewer Expectation: </strong>
                      {activeQuestion.hint}
                    </div>
                  </div>
                )}

                {/* Collapsible Sample Answer */}
                {showSample && (activeQuestion?.sampleAnswer || activeQuestion?.idealAnswer) && (
                  <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 leading-relaxed">
                    <p className="font-semibold text-emerald-400 text-[10px] uppercase tracking-wider mb-1">
                      Ideal Reference Answer
                    </p>
                    <p>{activeQuestion.sampleAnswer || activeQuestion.idealAnswer}</p>
                  </div>
                )}

                {/* ─── LIVE TELEMETRY STRIP ─── */}
                <div className="mb-3 p-3 rounded-xl bg-black/40 border border-white/6 flex items-center justify-between flex-wrap gap-2 text-xs">
                  {/* Timer */}
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-slate-400 font-medium">Timer:</span>
                    <span
                      className={clsx(
                        "font-mono font-bold",
                        durationSeconds > 120 ? "text-rose-400" : "text-white"
                      )}
                    >
                      {String(Math.floor(durationSeconds / 60)).padStart(2, "0")}:
                      {String(durationSeconds % 60).padStart(2, "0")} / 02:00
                    </span>
                  </div>

                  {/* Live WPM Gauge */}
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-slate-400 font-medium">Cadence:</span>
                    <span
                      className={clsx(
                        "font-bold",
                        liveWpm >= 115 && liveWpm <= 155
                          ? "text-emerald-400"
                          : liveWpm > 0
                          ? "text-amber-400"
                          : "text-slate-400"
                      )}
                    >
                      {liveWpm > 0 ? `${liveWpm} WPM` : "Ready"}
                    </span>
                  </div>

                  {/* Filler Pill */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium">Fillers:</span>
                    <span
                      className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                        totalFillersSpoken > 2
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                          : totalFillersSpoken > 0
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      )}
                    >
                      {totalFillersSpoken} detected
                    </span>
                  </div>

                  {/* Hesitation Alert Pill */}
                  {isHesitating && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/25 animate-pulse">
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      <span>Hesitation (&gt;2.5s)</span>
                    </div>
                  )}

                  {/* Whisper Refinement Banner */}
                  {isTranscribingWithWhisper && (
                    <div className="flex items-center gap-1 text-[11px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/25 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                      <span>Transcribing via Groq Whisper...</span>
                    </div>
                  )}
                </div>

                {/* Dual Input Textarea: Real-time STT + Manual Edit */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                      Your Live Spoken Response
                    </label>
                    <span className="text-slate-500 text-[11px]">
                      {response.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>

                  <textarea
                    rows={6}
                    value={response}
                    onChange={(e) => {
                      setResponse(e.target.value);
                      countFillers(e.target.value);
                    }}
                    placeholder="Click 'Start Speaking' below to transcribe live, or type your response here..."
                    className="w-full p-3.5 text-sm bg-black/40 border border-white/8 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none transition-all leading-relaxed font-sans"
                  />
                </div>

                {/* Action Buttons: Voice Record & Evaluation */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {!isRecording ? (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Mic className="w-4 h-4 text-emerald-300" />}
                        onClick={startRecording}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 w-full sm:w-auto"
                      >
                        Start Speaking
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<MicOff className="w-4 h-4 animate-pulse" />}
                        onClick={stopRecording}
                        className="w-full sm:w-auto"
                      >
                        Stop Recording
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      icon={showSample ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      onClick={() => setShowSample(!showSample)}
                    >
                      {showSample ? "Hide Sample" : "Sample"}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={
                        isEvaluating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Brain className="w-3.5 h-3.5" />
                        )
                      }
                      onClick={handleEvaluate}
                      disabled={!response.trim() || isEvaluating}
                      className="bg-indigo-600 hover:bg-indigo-500 w-full sm:w-auto"
                    >
                      {isEvaluating ? "Evaluating..." : "Submit & Evaluate Answer"}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* ─── POST-ANSWER DEEP DIAGNOSTIC DASHBOARD ───────────────────────── */}
          {evalResult && (
            <div className="space-y-6 pt-4 animate-fadeIn">
              {/* 3-Gauge Score Header */}
              <Card className="p-6 bg-gradient-to-br from-[#0e1424] via-[#11182c] to-[#0e1424] border-indigo-500/30 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b border-white/8 gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-lg font-bold text-white">Performance Diagnostic Evaluation</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Graded across STAR Rubric (70%) and Acoustic / Visual Delivery Telemetry (30%)
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Engine: {evalResult.evaluationSource === "ai" ? "Groq Llama 3.3 70B / Gemini" : "Heuristic"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/40 border border-white/6 text-center">
                    <div className="relative flex items-center justify-center w-20 h-20 mb-2">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                        <circle
                          cx="28"
                          cy="28"
                          r="24"
                          fill="none"
                          stroke={evalResult.overallScore >= 80 ? "#10b981" : evalResult.overallScore >= 65 ? "#f59e0b" : "#f43f5e"}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 24}`}
                          strokeDashoffset={`${2 * Math.PI * 24 * (1 - evalResult.overallScore / 100)}`}
                        />
                      </svg>
                      <span className="absolute text-xl font-bold text-white">{evalResult.overallScore}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-200">Overall Score</span>
                    <span className="text-[11px] text-slate-500">Composite Readiness</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/40 border border-white/6 text-center">
                    <div className="relative flex items-center justify-center w-20 h-20 mb-2">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                        <circle
                          cx="28"
                          cy="28"
                          r="24"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 24}`}
                          strokeDashoffset={`${2 * Math.PI * 24 * (1 - evalResult.contentScore / 100)}`}
                        />
                      </svg>
                      <span className="absolute text-xl font-bold text-white">{evalResult.contentScore}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-200">Content &amp; Technical Depth</span>
                    <span className="text-[11px] text-slate-500">STAR Methodology</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/40 border border-white/6 text-center">
                    <div className="relative flex items-center justify-center w-20 h-20 mb-2">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                        <circle
                          cx="28"
                          cy="28"
                          r="24"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 24}`}
                          strokeDashoffset={`${2 * Math.PI * 24 * (1 - evalResult.deliveryScore / 100)}`}
                        />
                      </svg>
                      <span className="absolute text-xl font-bold text-white">{evalResult.deliveryScore}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-200">Delivery &amp; Vocal Presence</span>
                    <span className="text-[11px] text-slate-500">Pacing, Eye Contact &amp; Fillers</span>
                  </div>
                </div>
              </Card>

              {/* STAR Methodology Component Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(["situation", "task", "action", "result"] as const).map((step) => {
                  const data = evalResult.starBreakdown[step];
                  const titles = {
                    situation: "Situation",
                    task: "Task",
                    action: "Action",
                    result: "Result",
                  };
                  return (
                    <Card key={step} className="p-4 bg-[#0e1424] border-white/6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white capitalize">{titles[step]}</span>
                        <span
                          className={clsx(
                            "px-2 py-0.5 rounded text-[11px] font-bold",
                            data.present
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          )}
                        >
                          {data.score}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{data.feedback}</p>
                    </Card>
                  );
                })}
              </div>

              {/* Delivery Critique */}
              <Card className="p-5 bg-[#0e1424] border-white/6">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                  Delivery &amp; Body Language Critique
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-white/2 border border-white/6">
                    <p className="text-slate-400 font-semibold mb-1">Vocal Pacing</p>
                    <span className="font-bold text-white text-sm block mb-1">
                      {evalResult.deliveryCritique.pacingVerdict}
                    </span>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      {evalResult.deliveryCritique.pacingAdvice}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/2 border border-white/6">
                    <p className="text-slate-400 font-semibold mb-1">Verbal Economy</p>
                    <span className="font-bold text-white text-sm block mb-1">
                      {totalFillersSpoken === 0 ? "Exceptional" : `${totalFillersSpoken} Fillers Detected`}
                    </span>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      {evalResult.deliveryCritique.fillerAdvice}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/2 border border-white/6">
                    <p className="text-slate-400 font-semibold mb-1">Visual Engagement</p>
                    <span className="font-bold text-white text-sm block mb-1">
                      {liveEyeContact >= 0 ? `${liveEyeContact}% Eye Contact` : "Audio Practice"}
                    </span>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      {evalResult.deliveryCritique.bodyLanguageAdvice}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Side-by-Side Comparison: Spoken vs Rewritten Ideal Answer */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-5 bg-[#0e1424] border-rose-500/20">
                  <div className="flex items-center justify-between pb-3 border-b border-white/6 mb-3">
                    <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-rose-400" /> Your Spoken Transcript
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {response.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 leading-relaxed font-sans max-h-60 overflow-y-auto space-y-2">
                    <p>
                      {response.split(/\b/).map((chunk, idx) => {
                        const isFiller = FILLER_WORDS_LIST.includes(
                          chunk.toLowerCase().trim() as typeof FILLER_WORDS_LIST[number]
                        );
                        if (isFiller) {
                          return (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-rose-500/25 text-rose-300 font-bold border border-rose-500/30 inline-block mx-0.5"
                            >
                              {chunk}
                            </span>
                          );
                        }
                        return <span key={idx}>{chunk}</span>;
                      })}
                    </p>
                  </div>
                </Card>

                <Card className="p-5 bg-[#0a1824] border-emerald-500/30">
                  <div className="flex items-center justify-between pb-3 border-b border-white/6 mb-3">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> 95/100 Polished Model Answer
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyModelAnswer}
                      className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-white transition-colors"
                    >
                      {copiedAnswer ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Answer
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-emerald-200/90 leading-relaxed italic max-h-60 overflow-y-auto font-sans">
                    {evalResult.rewrittenIdealAnswer}
                  </p>
                </Card>
              </div>

              {/* ─── DYNAMIC FOLLOW-UP PROBE (Interactive Conversational Loop) ─── */}
              <Card className="p-6 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-indigo-950/60 border-indigo-500/40 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                        Turn {currentTurnOrder + 1} Follow-Up Cross-Question
                      </span>
                      <span className="text-xs text-slate-400">
                        Probing trade-offs and technical depth
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug">
                      &quot;{evalResult.followUpQuestion.prompt}&quot;
                    </h3>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/6 text-xs text-slate-300">
                      <strong className="text-indigo-400">Interviewer Intent: </strong>
                      {evalResult.followUpQuestion.intent}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<ArrowRight className="w-4 h-4" />}
                      onClick={handleChainFollowUpTurn}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 whitespace-nowrap"
                    >
                      Answer This Follow-Up Now → (Turn {currentTurnOrder + 1})
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                      onClick={handleSaveSession}
                      className="whitespace-nowrap"
                    >
                      Save Session to History
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
