"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  FileCode,
  Search,
  Plus,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { VisualTelemetryAnalyzer, type VisualPostureState } from "@/lib/visual-telemetry";

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

export interface StudioQuestion extends InterviewQuestion {
  isCustom?: boolean;
}

interface RawResumeProject {
  title?: string;
  subtitle?: string;
  bullets?: Array<string | { text?: string }>;
}

interface RawResumeExperience {
  title?: string;
  subtitle?: string;
  bullets?: Array<string | { text?: string }>;
}

function getQuestionExpectedConcepts(question?: StudioQuestion): string[] {
  if (!question) return [];
  if (Array.isArray(question.keyConceptsToCover) && question.keyConceptsToCover.length > 0) {
    return question.keyConceptsToCover;
  }
  if (question.hint) {
    const hintClean = question.hint.replace(/^Interviewer Expectations?:\s*/i, "");
    const parts = hintClean
      .split(/[,;•|]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && s.length < 35);
    if (parts.length >= 2) return parts.slice(0, 5);
  }
  const words = question.question
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  return Array.from(new Set(words)).slice(0, 4);
}

function isConceptCovered(concept: string, text: string, code: string): boolean {
  if (!concept) return false;
  const combined = `${text} ${code}`.toLowerCase().replace(/[^a-z0-9]/g, " ");
  const normalizedConcept = concept
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalizedConcept && combined.includes(normalizedConcept)) return true;

  const tokens = concept
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[\s\-_/]+/)
    .filter((t) => t.length > 2);
  if (tokens.length === 0) return false;

  const significant = tokens.filter(
    (t) =>
      ![
        "the",
        "and",
        "for",
        "with",
        "from",
        "using",
        "state",
        "pattern",
        "handling",
        "model",
        "approach",
        "strategy",
      ].includes(t)
  );
  const toCheck = significant.length > 0 ? significant : tokens;

  return toCheck.some((token) => {
    const stem = token.length > 5 ? token.slice(0, token.length - 2) : token;
    return combined.includes(token) || combined.includes(stem);
  });
}

export default function InterviewPage() {
  // ─── Core Data State ────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<StudioQuestion[]>([]);
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
  const [jdSuccessMsg, setJdSuccessMsg] = useState<string | null>(null);

  // ─── GitHub Link Analyzer (Resume Grill) State ──────────────────────────────
  const [githubUrl, setGithubUrl] = useState("");
  const [githubFocusNotes, setGithubFocusNotes] = useState("");
  const [isAnalyzingRepo, setIsAnalyzingRepo] = useState(false);
  const [githubAnalysis, setGithubAnalysis] = useState<GitHubGrillAnalysis | null>(null);

  // ─── Active Turn & Response State ───────────────────────────────────────────
  const [response, setResponse] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [showScratchpad, setShowScratchpad] = useState(false);
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
  const [livePosture, setLivePosture] = useState<VisualPostureState>("Stable");
  const [reticleColor, setReticleColor] = useState<"green" | "amber" | "rose">("green");
  const [visualToast, setVisualToast] = useState<string | null>(null);

  // ─── Custom Resume + JD Question Generator State ─────────────────────────────
  const [showCustomizerPanel, setShowCustomizerPanel] = useState(false);
  const [customRole, setCustomRole] = useState("Full-Stack SDE");
  const [customCompany, setCustomCompany] = useState("");
  const [customJdText, setCustomJdText] = useState("");
  const [customDifficulty, setCustomDifficulty] = useState<"Easy" | "Medium" | "Hard" | "Mixed">("Mixed");
  const [customFocusCategories, setCustomFocusCategories] = useState<string[]>([
    "core-technical",
    "resume-grill",
    "system-design",
    "behavioral",
    "debugging",
  ]);
  const [includeResumeContext, setIncludeResumeContext] = useState(true);
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const [customSuccessMsg, setCustomSuccessMsg] = useState<string | null>(null);

  // ─── LocalStorage Resume Detection ──────────────────────────────────────────
  const [detectedResume, setDetectedResume] = useState<{
    fileName: string;
    candidateName?: string;
    skills: string[];
    projects: Array<{ title: string; subtitle?: string; bullets: string[] }>;
    experience: Array<{ title: string; subtitle?: string; bullets: string[] }>;
  } | null>(null);

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
  const maxAudioRmsRef = useRef<number>(0);
  const lastSpokenTimestampRef = useRef<number>(0);
  const eyeSamplesRef = useRef<{ center: number; total: number }>({ center: 0, total: 0 });
  const recentDistancesRef = useRef<number[]>([]);
  const evaluationRef = useRef<HTMLDivElement | null>(null);

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

  // Read resume from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      try {
        const raw = window.localStorage.getItem("copilot_latest_resume_analysis");
        if (raw) {
          const workspace = JSON.parse(raw);
          const skills: string[] = (
            workspace.editableResume?.skills?.length
              ? (workspace.editableResume.skills as string[])
              : (workspace.analysis?.skills as string[]) || []
          );
          const rawProjects = (workspace.editableResume?.projects as RawResumeProject[] | undefined) || [];
          const projects: Array<{ title: string; subtitle?: string; bullets: string[] }> = rawProjects.map((p) => ({
            title: p.title || "Project",
            subtitle: p.subtitle,
            bullets: Array.isArray(p.bullets)
              ? p.bullets.map((b) => (typeof b === "string" ? b : b?.text || ""))
              : [],
          }));
          const rawExperience = (workspace.editableResume?.experience as RawResumeExperience[] | undefined) || [];
          const experience: Array<{ title: string; subtitle?: string; bullets: string[] }> = rawExperience.map((e) => ({
            title: e.title || "Experience",
            subtitle: e.subtitle,
            bullets: Array.isArray(e.bullets)
              ? e.bullets.map((b) => (typeof b === "string" ? b : b?.text || ""))
              : [],
          }));
          const candidateName = workspace.editableResume?.contactInfo?.fullName || "Candidate";
          const fileName = workspace.fileName || "Uploaded Resume.pdf";

          setDetectedResume({
            fileName,
            candidateName,
            skills,
            projects,
            experience,
          });
        }
      } catch (e) {
        console.warn("Could not read resume analysis from localStorage:", e);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Read cross-module handoff from /jobs or /tracker
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      try {
        const handoffRaw = sessionStorage.getItem("copilot_interview_handoff");
        if (handoffRaw) {
          const handoff = JSON.parse(handoffRaw);
          sessionStorage.removeItem("copilot_interview_handoff");
          if (handoff.company) {
            setJdCompany(handoff.company);
            setCustomCompany(handoff.company);
          }
          if (handoff.title) {
            setJdTitle(handoff.title);
            setCustomRole(handoff.title);
          }
          if (handoff.jobDescription) {
            setJdText(handoff.jobDescription);
            setCustomJdText(handoff.jobDescription);
          }
          setShowCustomizerPanel(true);
        }
      } catch (e) {
        console.warn("Could not parse interview handoff", e);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // ─── Filtered Questions Based on Mode & Category ────────────────────────────
  const availableQuestions = questions.filter((q) => {
    if (studioMode === "grill") {
      return q.category === "resume-grill";
    }
    // Match role (if question has role specified or is custom tagged)
    const roleMatches =
      q.isCustom ||
      !q.role ||
      q.role.toLowerCase() === selectedRole.toLowerCase();
    if (!roleMatches) return false;

    if (filterCategory === "all") {
      return q.isCustom || q.category !== "resume-grill";
    }
    return q.category === filterCategory;
  });

  const activeQuestion: StudioQuestion | undefined =
    availableQuestions[currentIdx] || availableQuestions[0] || questions[0];

  const activeExpectedConcepts = useMemo<string[]>(() => {
    return getQuestionExpectedConcepts(activeQuestion);
  }, [activeQuestion]);

  const coveredConceptsCount = useMemo(() => {
    return activeExpectedConcepts.filter((c: string) => isConceptCovered(c, response, codeSnippet)).length;
  }, [activeExpectedConcepts, response, codeSnippet]);

  const allRoundTurns: InterviewTurn[] = useMemo(() => {
    const list: InterviewTurn[] = [...sessionTurns];
    if (evalResult && activeQuestion) {
      const alreadyPresent = list.some((t) => t.questionText === activeQuestion.question);
      if (!alreadyPresent) {
        list.push({
          id: `eval-current-${activeQuestion.id || "turn"}`,
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
          coveredConcepts: evalResult.coveredConcepts,
          missedConcepts: evalResult.missedConcepts,
          codeSnippet: codeSnippet.trim() || undefined,
        });
      }
    }
    return list;
  }, [
    sessionTurns,
    evalResult,
    activeQuestion,
    response,
    liveWpm,
    fillerCounts,
    liveEyeContact,
    currentTurnOrder,
    codeSnippet,
  ]);

  const scorecardStats = useMemo(() => {
    const turnsCount = allRoundTurns.length;
    if (turnsCount === 0) {
      return {
        turnsCount: 0,
        avgScore: 0,
        avgContent: 0,
        avgDelivery: 0,
        avgWpm: 0,
        totalFillers: 0,
        avgEyeContact: -1,
        verdict: "Needs Practice",
        verdictVariant: "rose" as const,
        verdictDescription: "Start answering questions to generate your round performance scorecard.",
        missedConcepts: [] as string[],
      };
    }

    const avgScore = Math.round(
      allRoundTurns.reduce((acc, t) => acc + (t.score || 0), 0) / turnsCount
    );
    const avgContent = Math.round(
      allRoundTurns.reduce((acc, t) => acc + (t.contentScore || 0), 0) / turnsCount
    );
    const avgDelivery = Math.round(
      allRoundTurns.reduce((acc, t) => acc + (t.deliveryScore || 0), 0) / turnsCount
    );
    const avgWpm = Math.round(
      allRoundTurns.reduce((acc, t) => acc + (t.avgWpm || 120), 0) / turnsCount
    );
    const totalFillers = allRoundTurns.reduce((acc, t) => acc + (t.fillerWordCount || 0), 0);
    const validEye = allRoundTurns.filter(
      (t) => typeof t.eyeContactScore === "number" && t.eyeContactScore >= 0
    );
    const avgEyeContact =
      validEye.length > 0
        ? Math.round(validEye.reduce((acc, t) => acc + (t.eyeContactScore || 0), 0) / validEye.length)
        : -1;

    let verdict: string;
    let verdictVariant: "emerald" | "blue" | "amber" | "rose";
    let verdictDescription: string;

    if (avgScore >= 85) {
      verdict = "Strong Hire";
      verdictVariant = "emerald";
      verdictDescription =
        "Exceptional technical depth, structured STAR articulation, and commanding executive delivery. Strong candidate recommendation for L4/L5 engineering loops.";
    } else if (avgScore >= 72) {
      verdict = "Hire";
      verdictVariant = "blue";
      verdictDescription =
        "Solid production engineering intuition, clean communication, and reliable problem-solving. Meets the bar for production software engineering.";
    } else if (avgScore >= 60) {
      verdict = "Leaning Hire";
      verdictVariant = "amber";
      verdictDescription =
        "Shows foundational domain grasp, but lacked quantified impact metrics in STAR results or missed critical edge-case architecture nuances.";
    } else {
      verdict = "Needs Practice";
      verdictVariant = "rose";
      verdictDescription =
        "Responses were either too brief or missed core architectural concepts. Review the missed concept checklist below before real interview loops.";
    }

    const missed = Array.from(
      new Set(allRoundTurns.flatMap((t) => t.missedConcepts || []))
    );

    return {
      turnsCount,
      avgScore,
      avgContent,
      avgDelivery,
      avgWpm,
      totalFillers,
      avgEyeContact,
      verdict,
      verdictVariant,
      verdictDescription,
      missedConcepts: missed,
    };
  }, [allRoundTurns]);

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
      const canvasEl = canvas as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream };
      const stream = canvasEl.captureStream ? canvasEl.captureStream(30) : null;
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
    setReticleColor("green");
    setVisualToast("Avatar Stream Active (Calibrated)");
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
      } catch (firstErr: unknown) {
        const firstErrName = (firstErr as { name?: string })?.name;
        // If permission explicitly denied by user, do not re-request immediately
        if (firstErrName === "NotAllowedError" || firstErrName === "PermissionDeniedError") {
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

      // Start Real-Time Computer-Vision Telemetry Tracking (100ms / 10 FPS)
      if (visualAnalyzerRef.current) {
        visualAnalyzerRef.current.reset();
      } else {
        visualAnalyzerRef.current = new VisualTelemetryAnalyzer();
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
      console.warn("[Webcam Notice] Camera access error:", err);
      let reason: "denied" | "in_use" | "not_found" | "unsupported" = "denied";
      let msg = "Camera permission was denied in your browser or Windows Privacy Settings.";
      const errorObj = err as { name?: string; message?: string };

      if (errorObj?.name === "NotAllowedError" || errorObj?.name === "PermissionDeniedError") {
        reason = "denied";
        msg = "Camera permission was denied in your browser or Windows Privacy Settings.";
      } else if (errorObj?.name === "NotReadableError" || errorObj?.name === "TrackStartError") {
        reason = "in_use";
        msg = "Your webcam is currently locked by another application (e.g. Zoom, Teams, Skype, or Discord).";
      } else if (errorObj?.name === "NotFoundError" || errorObj?.name === "DevicesNotFoundError") {
        reason = "not_found";
        msg = "No webcam device was detected. Please plug in or enable your camera.";
      } else {
        reason = "unsupported";
        msg = errorObj?.message || "Unable to initialize video stream.";
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

    if (visualAnalyzerRef.current) {
      visualAnalyzerRef.current.reset();
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
    setLivePosture("Stable");
    setReticleColor("green");
    setVisualToast(null);
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
    setError(null);
    setIsRecording(true);
    isRecordingRef.current = true;
    setRecordingStatusBadge(null);
    setMicActiveLevel(0);
    setDurationSeconds(0);
    setWpmHistory([]);
    eyeSamplesRef.current = { center: 0, total: 0 };
    recentDistancesRef.current = [];
    lastSpokenTimestampRef.current = Date.now();
    setIsHesitating(false);
    setHesitationGaps(0);
    audioChunksRef.current = [];
    maxAudioRmsRef.current = 0;

    // 1. Acquire Single Clean Microphone Audio Stream
    let audioStream: MediaStream;
    try {
      if (audioStreamRef.current && audioStreamRef.current.getAudioTracks().length > 0) {
        audioStream = audioStreamRef.current;
      } else {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        audioStreamRef.current = audioStream;
      }
    } catch (micErr) {
      console.warn("[Microphone Notice] Mic stream error:", micErr);
      setIsRecording(false);
      isRecordingRef.current = false;
      setError("Microphone permission denied or hardware unavailable. Please allow microphone access.");
      return;
    }

    // 2. Initialize MediaRecorder for parallel audio capture (Whisper backup)
    if (typeof MediaRecorder !== "undefined" && audioStream) {
      try {
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

        const recorder = new MediaRecorder(audioStream, {
          mimeType,
          audioBitsPerSecond: 32000,
        });
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

    // 3. AudioContext & AnalyserNode for live volume meter & waveform
    try {
      if (audioStream && audioStream.getAudioTracks().length > 0) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          if (audioCtx.state === "suspended") {
            await audioCtx.resume();
          }
          audioCtxRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          const source = audioCtx.createMediaStreamSource(audioStream);
          source.connect(analyser);

          const canvas = audioCanvasRef.current;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const renderWaveform = () => {
            if (!isRecordingRef.current) return;
            analyser.getByteFrequencyData(dataArray);

            // Compute live average volume for meter and peak volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const avg = sum / (bufferLength || 1);
            setMicActiveLevel(Math.min(100, Math.round((avg / 128) * 100)));
            if (avg > maxAudioRmsRef.current) {
              maxAudioRmsRef.current = avg;
            }

            if (canvas) {
              const ctx = canvas.getContext("2d");
              if (ctx) {
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
              }
            }

            animFrameRef.current = requestAnimationFrame(renderWaveform);
          };

          renderWaveform();
        }
      }
    } catch (ctxErr) {
      console.warn("[AudioContext] Waveform setup error:", ctxErr);
    }

    // 4. Non-Blocking Browser Web SpeechRecognition
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
          if (clean) {
            setResponse(clean);
            countFillers(clean);
          }
        };

        recognition.onerror = (err) => {
          console.warn("[SpeechRecognition Non-Blocking Error]:", err);
          setRecordingStatusBadge("● Recording Audio (Groq Whisper AI will transcribe on Stop)...");
        };

        recognition.onend = () => {
          if (isRecordingRef.current && !recordingStatusBadge) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (sttErr) {
        console.warn("[SpeechRec] Web Speech could not start:", sttErr);
        setRecordingStatusBadge("● Recording Audio (Groq Whisper AI will transcribe on Stop)...");
      }
    } else {
      setRecordingStatusBadge("● Recording Audio (Groq Whisper AI will transcribe on Stop)...");
    }

    // 5. Interval: Timer, WPM calculator, and Hesitation Silence detector (>2.5s)
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

      if (elapsed % 3 === 0) {
        setResponse((currentText) => {
          const words = currentText.trim().split(/\s+/).filter(Boolean).length;
          const currentWpm = Math.round((words / Math.max(elapsed, 3)) * 60);
          setLiveWpm(currentWpm);
          setWpmHistory((prev) => [...prev, currentWpm]);
          return currentText;
        });
      }
    }, 1000);
  };

  const stopRecording = async (): Promise<string> => {
    setIsRecording(false);
    isRecordingRef.current = false;
    setRecordingStatusBadge(null);
    setMicActiveLevel(0);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    // Stop audio context
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }

    // Flush & stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      await new Promise<void>((resolve) => {
        if (!mediaRecorderRef.current) return resolve();
        mediaRecorderRef.current.onstop = () => resolve();
        try {
          mediaRecorderRef.current.stop();
        } catch {
          resolve();
        }
      });
    }

    // Release microphone tracks to turn off hardware LED
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    let audioBlob: Blob | null = null;
    if (audioChunksRef.current.length > 0) {
      const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
      audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    }

    let currentTranscript = response.trim();

    // Send audio blob to Groq Whisper if available and vocal energy detected (Silence Guard)
    const detectedVoice = maxAudioRmsRef.current > 2.0;

    if (audioBlob && audioBlob.size > 0) {
      if (!detectedVoice && !currentTranscript) {
        setError("No vocal audio detected. Please check your microphone volume and speak clearly.");
      } else {
        setIsTranscribingWithWhisper(true);
        try {
          const formData = new FormData();
          const ext = audioBlob.type.includes("mp4") ? "mp4" : "webm";
          formData.append("audio", audioBlob, `recording.${ext}`);
          formData.append("role", selectedRole);
          const questionContext = [
            activeQuestion?.question || "",
            activeQuestion?.hint || "",
            (activeQuestion?.keyConceptsToCover || []).join(", "),
          ]
            .filter(Boolean)
            .join(" ");
          formData.append("questionContext", questionContext);

          const res = await fetch("/api/interview/transcribe", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = (await res.json()) as { ok?: boolean; text?: string; wordsPerMinute?: number };
            if (data.ok && data.text && data.text.trim()) {
              currentTranscript = data.text.trim();
              setResponse(currentTranscript);
              countFillers(currentTranscript);
              if (data.wordsPerMinute) {
                setLiveWpm(data.wordsPerMinute);
              }
            }
          }
        } catch (whisperErr) {
          console.warn("[Groq Whisper Transcription error]:", whisperErr);
        } finally {
          setIsTranscribingWithWhisper(false);
        }
      }
    }

    // Final calculations
    const words = currentTranscript.split(/\s+/).filter(Boolean).length;
    const finalWpm = Math.round((words / Math.max(durationSeconds, 5)) * 60);
    setLiveWpm(finalWpm || 120);
    countFillers(currentTranscript);

    return currentTranscript;
  };

  // ─── 1-Click Sample Answer Loader ───────────────────────────────────────────
  const handleApplySampleAnswer = () => {
    const sample =
      activeQuestion?.sampleAnswer ||
      activeQuestion?.idealAnswer ||
      "In my previous engineering project, we faced critical latency spikes under peak load. As the primary backend engineer, I profiled database bottlenecks, indexed foreign keys in PostgreSQL, and introduced a Redis caching tier for session data. This reduced p99 query latency from 850ms down to 42ms and successfully handled 10x traffic during product launch.";
    setResponse(sample);
    setDurationSeconds(42);
    setLiveWpm(128);
    setWpmHistory([120, 125, 130, 128]);
    countFillers(sample);
    setShowSample(true);
  };

  // ─── Evaluation Submission ──────────────────────────────────────────────────
  const handleEvaluate = async () => {
    if (!activeQuestion) return;

    let textToEvaluate = response.trim();

    // If currently recording, stop recording and await Whisper transcript!
    if (isRecording || isRecordingRef.current) {
      textToEvaluate = await stopRecording();
    }

    if (!textToEvaluate) {
      setError("No answer transcript found. Please record or type your response first.");
      return;
    }

    setIsEvaluating(true);
    setError(null);
    setSaveSuccessMsg(null);

    const words = textToEvaluate.split(/\s+/).filter(Boolean).length;
    const calculatedWpm = durationSeconds > 0 ? Math.round((words / durationSeconds) * 60) : 125;
    const totalFillers = Object.values(fillerCounts).reduce((a, b) => a + b, 0);

    try {
      const evaluation = await evaluateInterviewAnswer({
        questionId: activeQuestion.id,
        questionText: activeQuestion.question,
        category: activeQuestion.category,
        role: selectedRole,
        userTranscript: textToEvaluate,
        durationSeconds: Math.max(10, durationSeconds),
        codeSnippet: codeSnippet.trim() || undefined,
        keyConceptsToCover: activeExpectedConcepts.length > 0 ? activeExpectedConcepts : undefined,
        telemetry: {
          avgWpm: liveWpm || calculatedWpm,
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
              : livePosture === "Shifting"
              ? 62
              : 45,
        },
        resumeContext:
          detectedResume
            ? `Candidate: ${detectedResume.candidateName || "Candidate"}. Skills: ${detectedResume.skills.slice(0, 8).join(", ")}. Projects: ${detectedResume.projects.map((p) => p.title).join(", ")}`
            : studioMode === "grill"
            ? `Project Architect: ${selectedRole}`
            : undefined,
        githubRepoContext: githubAnalysis ? JSON.stringify(githubAnalysis.summary) : undefined,
        customJdContext: customJdText
          ? `${customCompany} - ${customRole}: ${customJdText.slice(0, 500)}`
          : jdText
          ? `${jdCompany} - ${jdTitle}: ${jdText.slice(0, 500)}`
          : undefined,
      });

      setEvalResult(evaluation);
      setIsEvaluating(false);

      // Auto-scroll to evaluation report smoothly
      setTimeout(() => {
        evaluationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);

      if (ttsEnabled && evaluation.followUpQuestion?.prompt) {
        setTimeout(() => {
          speakText(
            `Evaluation complete. Score: ${evaluation.overallScore} out of 100. Follow-up cross question: ${evaluation.followUpQuestion.prompt}`
          );
        }, 1000);
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
      coveredConcepts: evalResult.coveredConcepts,
      missedConcepts: evalResult.missedConcepts,
      codeSnippet: codeSnippet.trim() || undefined,
    };

    setSessionTurns((prev) => [...prev, completedTurn]);
    setCurrentTurnOrder((prev) => prev + 1);

    const followUpQuestionObj: StudioQuestion = {
      id: `iq-followup-${Date.now()}`,
      category: activeQuestion.category,
      difficulty: "hard",
      question: evalResult.followUpQuestion.prompt,
      hint: `Interviewer Cross-Question Intent: ${evalResult.followUpQuestion.intent}`,
      sampleAnswer: evalResult.rewrittenIdealAnswer,
      keyConceptsToCover: evalResult.followUpQuestion.keyConcepts || activeExpectedConcepts.slice(0, 3),
      followUps: [],
    };

    setQuestions((prev) => [followUpQuestionObj, ...prev]);
    setCurrentIdx(0);
    setResponse("");
    setCodeSnippet("");
    setEvalResult(null);
    setDurationSeconds(0);
    setLiveWpm(0);
    setWpmHistory([]);

    if (ttsEnabled) {
      speakText(evalResult.followUpQuestion.prompt);
    }
  };

  // ─── Dual-Synthesizer Custom Question Generation (Resume + JD) ─────────────
  const handleGenerateCustomQuestions = async (appendMode: boolean = false) => {
    const role = customRole || selectedRole;
    const requirement = customJdText.trim() || `${role} engineering competencies, clean architecture, and production scale`;

    setIsGeneratingCustom(true);
    setError(null);
    setCustomSuccessMsg(null);

    try {
      const payload = {
        targetRole: role,
        targetCompany: customCompany.trim() || undefined,
        jobRequirement: requirement,
        resumeContext: (includeResumeContext && detectedResume) ? {
          candidateName: detectedResume.candidateName,
          skills: detectedResume.skills,
          projects: detectedResume.projects,
          experience: detectedResume.experience,
        } : undefined,
        focusCategories: customFocusCategories,
        difficulty: customDifficulty,
        count: appendMode ? 10 : 12,
      };

      const res = await fetch("/api/interview/custom-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate tailored interview questions.");
      }

      const data = await res.json();
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        const taggedQuestions: InterviewQuestion[] = data.questions.map((q: InterviewQuestion) => ({
          ...q,
          isCustom: true,
        }));

        if (appendMode) {
          setQuestions((prev) => [...prev, ...taggedQuestions]);
          setCustomSuccessMsg(`Added ${taggedQuestions.length} more custom questions to queue! (${data.source || "AI engine"})`);
        } else {
          setQuestions((prev) => [...taggedQuestions, ...prev]);
          setFilterCategory("all");
          setCurrentIdx(0);
          setResponse("");
          setEvalResult(null);
          setCustomSuccessMsg(`Generated ${taggedQuestions.length} questions tailored to your resume & requirements! (${data.source || "AI engine"})`);
        }
      } else {
        throw new Error("No interview questions were generated. Please refine your requirements.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error generating tailored questions.");
    } finally {
      setIsGeneratingCustom(false);
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
      const allMissed = Array.from(
        new Set([
          ...sessionTurns.flatMap((t) => t.missedConcepts || []),
          ...(evalResult.missedConcepts || []),
        ])
      );

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
        missedConcepts: allMissed.length > 0 ? allMissed : undefined,
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
            coveredConcepts: evalResult.coveredConcepts,
            missedConcepts: evalResult.missedConcepts,
            codeSnippet: codeSnippet.trim() || undefined,
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
          <button
            type="button"
            onClick={() => setShowScorecardModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all shadow-sm"
            title="View Round Scorecard and Hiring Verdict"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Scorecard ({allRoundTurns.length})</span>
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

          {/* Custom Resume + JD Generator Trigger */}
          <button
            type="button"
            onClick={() => setShowCustomizerPanel((prev) => !prev)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
              showCustomizerPanel
                ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30"
                : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>🎯 Customize by Resume &amp; JD</span>
            {detectedResume && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Resume Loaded" />
            )}
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
                setCustomRole(newRole);
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

      {/* ─── RESUME DETECTION QUICK BADGE (WHEN PANEL IS COLLAPSED) ─────────── */}
      {detectedResume && !showCustomizerPanel && !showCustomJdModal && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/25 text-xs animate-fadeIn">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              Loaded Resume: <strong className="text-white font-mono">{detectedResume.fileName}</strong> ({detectedResume.projects.length} Projects, {detectedResume.skills.length} Skills detected)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowCustomizerPanel(true)}
            className="text-[11px] font-medium text-indigo-300 hover:text-white underline self-start sm:self-auto"
          >
            Customize Questions for Target Job &rarr;
          </button>
        </div>
      )}

      {/* ─── CUSTOM RESUME + JOB REQUIREMENT PANEL ───────────────────────── */}
      {(showCustomizerPanel || showCustomJdModal) && (
        <Card className="p-5 md:p-6 bg-gradient-to-br from-[#0c1222] via-[#0f172a] to-[#0c1222] border-indigo-500/40 shadow-2xl rounded-2xl animate-fadeIn space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-white/8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  🎯 Customize Questions by Resume &amp; Job Requirement
                </h3>
                <Badge variant="indigo" size="sm">Dual-Synthesizer AI</Badge>
              </div>
              <p className="text-xs text-slate-400">
                Synthesizes your uploaded resume projects &amp; skills with target company requirements to generate tailored, bar-raiser interview questions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCustomizerPanel(false);
                setShowCustomJdModal(false);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm"
            >
              ✕
            </button>
          </div>

          {/* Resume Integration Status Card */}
          <div className={clsx(
            "p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all",
            detectedResume
              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
              : "bg-slate-900/60 border-white/8 text-slate-400"
          )}>
            <div className="flex items-center gap-2.5">
              {detectedResume ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              )}
              <div>
                {detectedResume ? (
                  <p className="font-semibold text-emerald-300">
                    ✓ Loaded Resume: <span className="text-white font-mono">{detectedResume.fileName}</span>
                    <span className="text-emerald-400/80 font-normal ml-1.5">
                      ({detectedResume.projects.length} Projects, {detectedResume.skills.length} Skills detected)
                    </span>
                  </p>
                ) : (
                  <p>
                    No uploaded resume found in workspace. Using target role defaults, or upload your resume in the{" "}
                    <a href="/resume" className="text-indigo-400 underline hover:text-indigo-300 font-medium">Resume Screener</a>.
                  </p>
                )}
              </div>
            </div>

            {detectedResume && (
              <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-slate-300 hover:text-white bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/10">
                <input
                  type="checkbox"
                  checked={includeResumeContext}
                  onChange={(e) => setIncludeResumeContext(e.target.checked)}
                  className="rounded border-slate-600 text-indigo-500 focus:ring-indigo-400"
                />
                <span>Include Resume in AI Prompt</span>
              </label>
            )}
          </div>

          {/* Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Target Role */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Target Role <span className="text-indigo-400">*</span>
              </label>
              <select
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                {INTERVIEW_ROLES.map((r) => (
                  <option key={r} value={r} className="bg-slate-900 text-slate-200">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Company */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Target Company (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Google, Stripe, Zepto, Swiggy"
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
                className="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Difficulty Bar
              </label>
              <select
                value={customDifficulty}
                onChange={(e) => setCustomDifficulty(e.target.value as "Easy" | "Medium" | "Hard" | "Mixed")}
                className="w-full text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Mixed" className="bg-slate-900">Mixed (Bar-Raiser &amp; Core)</option>
                <option value="Hard" className="bg-slate-900">Hard (Senior / Staff)</option>
                <option value="Medium" className="bg-slate-900">Medium (Mid-Level SDE)</option>
                <option value="Easy" className="bg-slate-900">Easy (Foundational)</option>
              </select>
            </div>
          </div>

          {/* Question Mix Focus Categories */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Target Question Focus Areas
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "core-technical", label: "Core Technical & Architecture" },
                { id: "resume-grill", label: "Resume Project Grill" },
                { id: "system-design", label: "Distributed System Design" },
                { id: "behavioral", label: "STAR Leadership & Ownership" },
                { id: "debugging", label: "Live Debugging & RCA" },
                { id: "dsa", label: "DSA & Algorithmic Problem Solving" },
              ].map((area) => {
                const selected = customFocusCategories.includes(area.id);
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => {
                      if (selected) {
                        if (customFocusCategories.length > 1) {
                          setCustomFocusCategories((prev) => prev.filter((id) => id !== area.id));
                        }
                      } else {
                        setCustomFocusCategories((prev) => [...prev, area.id]);
                      }
                    }}
                    className={clsx(
                      "px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all select-none",
                      selected
                        ? "bg-indigo-600/30 border-indigo-500/60 text-indigo-200 font-semibold"
                        : "bg-white/5 border-white/8 text-slate-400 hover:text-white"
                    )}
                  >
                    {selected ? "✓ " : "+ "}{area.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Job Description & Requirements Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Job Description &amp; Technical Requirements <span className="text-indigo-400">*</span>
              </label>
              <span className="text-[10px] text-slate-500">
                Paste responsibilities, required stack, or key qualifications
              </span>
            </div>
            <textarea
              rows={4}
              placeholder="Paste target Job Description, required competencies, or tech stack expectations (e.g. 'Must have experience with Next.js, Kafka, microservices, and high-concurrency database indexing')..."
              value={customJdText}
              onChange={(e) => setCustomJdText(e.target.value)}
              className="w-full text-xs bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
            />
          </div>

          {/* Success / Info Feedback */}
          {customSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{customSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setCustomSuccessMsg(null)}
                className="text-emerald-400/70 hover:text-white text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCustomizerPanel(false);
                setShowCustomJdModal(false);
              }}
              className="text-slate-400 hover:text-white text-xs"
            >
              Close Customizer
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              {/* + Generate 10 More Questions button */}
              <Button
                variant="secondary"
                size="sm"
                icon={isGeneratingCustom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 text-indigo-400" />}
                onClick={() => handleGenerateCustomQuestions(true)}
                disabled={isGeneratingCustom || (!customJdText.trim() && !customRole)}
                className="text-xs border border-indigo-500/30 hover:border-indigo-500/60"
              >
                + Generate 10 More Questions
              </Button>

              {/* Generate 12 Custom Questions (Primary) */}
              <Button
                variant="primary"
                size="sm"
                icon={isGeneratingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                onClick={() => handleGenerateCustomQuestions(false)}
                disabled={isGeneratingCustom || (!customJdText.trim() && !customRole)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
              >
                {isGeneratingCustom ? "Analyzing Profile & Generating..." : "⚡ Generate Tailored Questions (12)"}
              </Button>
            </div>
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
                        <div
                          className={clsx(
                            "w-4 h-4 border-t-2 border-l-2 transition-colors duration-300",
                            reticleColor === "green"
                              ? "border-emerald-500/80"
                              : reticleColor === "amber"
                              ? "border-amber-500/80"
                              : "border-rose-500/80"
                          )}
                        />
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/70 border border-white/10 text-[10px] text-emerald-300 font-semibold backdrop-blur-sm pointer-events-auto">
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
                        <div
                          className={clsx(
                            "w-4 h-4 border-t-2 border-r-2 transition-colors duration-300",
                            reticleColor === "green"
                              ? "border-emerald-500/80"
                              : reticleColor === "amber"
                              ? "border-amber-500/80"
                              : "border-rose-500/80"
                          )}
                        />
                      </div>

                      {/* Head Centering Guide Box & HUD Guidance Toast */}
                      <div className="self-center flex flex-col items-center gap-2">
                        <div
                          className={clsx(
                            "w-28 h-28 border border-dashed rounded-2xl flex items-center justify-center transition-all duration-300",
                            reticleColor === "green"
                              ? "border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                              : reticleColor === "amber"
                              ? "border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                              : "border-rose-400/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                          )}
                        >
                          <div
                            className={clsx(
                              "w-2 h-2 rounded-full transition-colors duration-300",
                              reticleColor === "green"
                                ? "bg-emerald-400/70"
                                : reticleColor === "amber"
                                ? "bg-amber-400/70"
                                : "bg-rose-400/70"
                            )}
                          />
                        </div>
                        {visualToast && (
                          <div
                            className={clsx(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-black/85 backdrop-blur-md border shadow-md transition-all animate-fadeIn",
                              reticleColor === "green"
                                ? "border-emerald-500/40 text-emerald-300"
                                : reticleColor === "amber"
                                ? "border-amber-500/40 text-amber-300"
                                : "border-rose-500/40 text-rose-300"
                            )}
                          >
                            {visualToast}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-end">
                        <div
                          className={clsx(
                            "w-4 h-4 border-b-2 border-l-2 transition-colors duration-300",
                            reticleColor === "green"
                              ? "border-emerald-500/80"
                              : reticleColor === "amber"
                              ? "border-amber-500/80"
                              : "border-rose-500/80"
                          )}
                        />
                        <div
                          className={clsx(
                            "w-4 h-4 border-b-2 border-r-2 transition-colors duration-300",
                            reticleColor === "green"
                              ? "border-emerald-500/80"
                              : reticleColor === "amber"
                              ? "border-amber-500/80"
                              : "border-rose-500/80"
                          )}
                        />
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
                            : livePosture === "Calibrating..."
                            ? "text-blue-400"
                            : livePosture === "Off-Center"
                            ? "text-amber-400"
                            : livePosture === "Shifting"
                            ? "text-rose-400"
                            : "text-slate-500"
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

                  {/* Real-time Mic Volume / Audio Activity Meter */}
                  {isRecording && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25">
                      <div className="flex items-center gap-0.5 h-3.5">
                        {[1, 2, 3, 4, 5].map((bar) => (
                          <span
                            key={bar}
                            className={clsx(
                              "w-1 rounded-full transition-all duration-75",
                              micActiveLevel >= bar * 18
                                ? "bg-emerald-400"
                                : "bg-emerald-950/40"
                            )}
                            style={{
                              height: micActiveLevel >= bar * 18 ? `${Math.max(4, bar * 3)}px` : "3px",
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-300">
                        {micActiveLevel > 15 ? "Mic Active" : "Listening..."}
                      </span>
                    </div>
                  )}

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

                  {/* Non-Blocking Speech Recognition Fallback Badge */}
                  {recordingStatusBadge && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/25 animate-pulse">
                      <span>{recordingStatusBadge}</span>
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

                {/* Live "Expected Concepts" Checklist Pills */}
                {activeExpectedConcepts.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/8 mb-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                        <Target className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="uppercase tracking-wider text-[11px]">Key Rubric Concepts</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({coveredConceptsCount} of {activeExpectedConcepts.length} covered live)
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-medium">
                        Lights up green as you speak
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {activeExpectedConcepts.map((concept: string, idx: number) => {
                        const covered = isConceptCovered(concept, response, codeSnippet);
                        return (
                          <span
                            key={idx}
                            className={clsx(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all duration-200",
                              covered
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold shadow-sm shadow-emerald-500/10"
                                : "bg-black/30 text-slate-400 border border-white/6 hover:border-white/12"
                            )}
                          >
                            {covered ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                            )}
                            <span>{concept}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dual Input Textarea: Real-time STT + Manual Edit */}
                <div className="space-y-2 mb-3">
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

                {/* Collapsible Technical Code / Architecture Scratchpad */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowScratchpad((prev) => !prev)}
                    className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/4 hover:bg-white/8 border border-white/8 transition-all"
                  >
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      {showScratchpad
                        ? "Hide Technical Scratchpad"
                        : "💻 Open Technical Scratchpad (Code / Schema / SQL)"}
                    </span>
                    {codeSnippet.trim() && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                        {codeSnippet.trim().split("\n").length} lines attached
                      </span>
                    )}
                  </button>

                  {showScratchpad && (
                    <div className="mt-2.5 p-3 rounded-xl bg-black/70 border border-indigo-500/30 space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">
                          Code / Pseudocode / SQL Schema / Big-O Analysis
                        </span>
                        <span className="text-[10px] text-indigo-400">
                          Evaluated concurrently with your verbal response
                        </span>
                      </div>
                      <textarea
                        rows={5}
                        value={codeSnippet}
                        onChange={(e) => setCodeSnippet(e.target.value)}
                        placeholder={`// Write technical code, schema, SQL, or complexity analysis here...\nfunction handleOptimisticUpdate(state, action) {\n  // Instant state update with rollback fallback\n}`}
                        className="w-full p-3 text-xs font-mono bg-black/90 border border-white/10 rounded-lg text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-y leading-relaxed"
                      />
                    </div>
                  )}
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
                      icon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                      onClick={handleApplySampleAnswer}
                      title="Load realistic 90-word STAR answer to test evaluation"
                    >
                      Sample
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={
                        isEvaluating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isTranscribingWithWhisper ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                        ) : (
                          <Brain className="w-3.5 h-3.5" />
                        )
                      }
                      onClick={handleEvaluate}
                      disabled={
                        (!response.trim() && !codeSnippet.trim() && !isRecording) ||
                        isEvaluating ||
                        isTranscribingWithWhisper
                      }
                      className="bg-indigo-600 hover:bg-indigo-500 w-full sm:w-auto"
                    >
                      {isEvaluating
                        ? "Evaluating..."
                        : isTranscribingWithWhisper
                        ? "Transcribing Voice..."
                        : isRecording
                        ? "Stop & Evaluate Answer"
                        : "Submit & Evaluate Answer"}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* ─── POST-ANSWER DEEP DIAGNOSTIC DASHBOARD ───────────────────────── */}
          {evalResult && (
            <div ref={evaluationRef} className="space-y-6 pt-4 animate-fadeIn">
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

              {/* Rubric Concept Coverage Audit */}
              {((evalResult.coveredConcepts && evalResult.coveredConcepts.length > 0) ||
                (evalResult.missedConcepts && evalResult.missedConcepts.length > 0)) && (
                <Card className="p-5 bg-[#0e1424] border-white/6">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-400" />
                    Rubric Concept Coverage Audit
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/25">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Covered Concepts ({evalResult.coveredConcepts?.length || 0})</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {evalResult.coveredConcepts && evalResult.coveredConcepts.length > 0 ? (
                          evalResult.coveredConcepts.map((concept, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 text-[11px] font-medium"
                            >
                              ✓ {concept}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            No rubric concepts fully matched in transcript.
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/25">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300 mb-2">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>Missed Concepts ({evalResult.missedConcepts?.length || 0})</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {evalResult.missedConcepts && evalResult.missedConcepts.length > 0 ? (
                          evalResult.missedConcepts.map((concept, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-200 border border-rose-500/30 text-[11px] font-medium"
                            >
                              ✕ {concept}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-emerald-400 italic">
                            Flawless! All key rubric concepts were addressed.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Technical Scratchpad & Code Review Critique */}
              {evalResult.codeReviewCritique && (
                <Card className="p-5 bg-[#0a1220] border-indigo-500/30">
                  <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-400" />
                    Technical Scratchpad &amp; Code Review Critique
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {evalResult.codeReviewCritique}
                  </p>
                </Card>
              )}

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
                      icon={<Trophy className="w-3.5 h-3.5 text-amber-400" />}
                      onClick={() => setShowScorecardModal(true)}
                      className="whitespace-nowrap border-amber-500/30 hover:border-amber-500/50 text-amber-200"
                    >
                      Round Scorecard ({allRoundTurns.length})
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

      {/* ─── ROUND SCORECARD & HIRING VERDICT MODAL ───────────────────────── */}
      {showScorecardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-[#0c101d] via-[#101528] to-[#0c101d] border border-indigo-500/30 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/8">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  <h2 className="text-xl font-bold text-white">
                    Round Composite Scorecard &amp; Hiring Verdict
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Aggregated performance across {scorecardStats.turnsCount}{" "}
                  {scorecardStats.turnsCount === 1 ? "question" : "questions"} for{" "}
                  <span className="text-indigo-300 font-semibold">{selectedRole}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowScorecardModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hiring Verdict Banner */}
            <div
              className={clsx(
                "p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4",
                scorecardStats.verdictVariant === "emerald"
                  ? "bg-emerald-950/30 border-emerald-500/40"
                  : scorecardStats.verdictVariant === "blue"
                  ? "bg-blue-950/30 border-blue-500/40"
                  : scorecardStats.verdictVariant === "amber"
                  ? "bg-amber-950/30 border-amber-500/40"
                  : "bg-rose-950/30 border-rose-500/40"
              )}
            >
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                    Composite Hiring Verdict:
                  </span>
                  <span
                    className={clsx(
                      "px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide border",
                      scorecardStats.verdictVariant === "emerald"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : scorecardStats.verdictVariant === "blue"
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                        : scorecardStats.verdictVariant === "amber"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    )}
                  >
                    {scorecardStats.verdict}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                  {scorecardStats.verdictDescription}
                </p>
              </div>

              <div className="text-center px-4 py-2 rounded-xl bg-black/40 border border-white/8 shrink-0">
                <span className="text-3xl font-extrabold text-white block">
                  {scorecardStats.avgScore}
                  <span className="text-base font-normal text-slate-400">/100</span>
                </span>
                <span className="text-[11px] text-slate-400">Round Average</span>
              </div>
            </div>

            {/* 4-Axis Competency Breakdown */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                4-Axis Competency Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-black/40 border border-white/6 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Technical Depth</span>
                    <span className="font-bold text-indigo-300">{scorecardStats.avgContent}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full"
                      style={{ width: `${scorecardStats.avgContent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">STAR Content &amp; Precision</span>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/6 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Delivery &amp; Flow</span>
                    <span className="font-bold text-emerald-300">{scorecardStats.avgDelivery}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${scorecardStats.avgDelivery}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">Vocal presence &amp; poise</span>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/6 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Vocal Pace</span>
                    <span className="font-bold text-white">{scorecardStats.avgWpm} WPM</span>
                  </div>
                  <span className="text-[11px] text-slate-300 block">
                    {scorecardStats.totalFillers} fillers total
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {scorecardStats.avgWpm >= 115 && scorecardStats.avgWpm <= 165
                      ? "Optimal cadence"
                      : "Adjust conversational pace"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/6 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Eye Contact</span>
                    <span className="font-bold text-amber-300">
                      {scorecardStats.avgEyeContact >= 0 ? `${scorecardStats.avgEyeContact}%` : "Audio"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-300 block">
                    {scorecardStats.avgEyeContact >= 70
                      ? "Direct camera presence"
                      : scorecardStats.avgEyeContact >= 0
                      ? "Room for more gaze"
                      : "Audio-only practice"}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Facial visual telemetry</span>
                </div>
              </div>
            </div>

            {/* Aggregated Missed Concepts Checklist */}
            <div className="p-4 rounded-2xl bg-[#0a1220] border border-white/8 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <Target className="w-4 h-4 text-rose-400" />
                  <span>Actionable Missed Concepts Checklist</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {scorecardStats.missedConcepts.length} concepts to review
                </span>
              </div>

              {scorecardStats.missedConcepts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {scorecardStats.missedConcepts.map((concept: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-rose-200 font-medium leading-tight">
                        {concept}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    Impressive! You addressed all expected technical concepts across every question in this round.
                  </span>
                </div>
              )}
            </div>

            {/* Turn-by-Turn Questions History */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Turn-by-Turn Questions in this Round ({allRoundTurns.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {allRoundTurns.map((turn, idx) => (
                  <div
                    key={turn.id || idx}
                    className="p-3 rounded-xl bg-black/40 border border-white/6 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-white/6 text-slate-300 text-[10px] font-bold">
                          Q{idx + 1}
                        </span>
                        {turn.category && (
                          <span className="text-[10px] text-indigo-400 uppercase font-semibold">
                            {turn.category}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-200 font-medium leading-snug">
                        {turn.questionText}
                      </p>
                      {turn.userAnswer && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                          &quot;{turn.userAnswer}&quot;
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={clsx(
                          "px-2.5 py-1 rounded-lg text-xs font-extrabold inline-block",
                          (turn.score || 0) >= 80
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : (turn.score || 0) >= 65
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        )}
                      >
                        {turn.score || 0}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-white/8">
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => {
                  handleSaveSession();
                  setShowScorecardModal(false);
                }}
              >
                Save Round to History
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowScorecardModal(false)}
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                Close Scorecard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
