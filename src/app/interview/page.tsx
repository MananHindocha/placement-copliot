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
import type {
  InterviewQuestion,
  InterviewSession,
  InterviewCategory,
  InterviewEvaluationResponse,
  InterviewTurn,
  StarBreakdown,
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
} from "lucide-react";
import { clsx } from "clsx";

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

// ─── Category & Role Configurations ──────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  InterviewCategory,
  { label: string; variant: "indigo" | "emerald" | "amber" | "violet" | "rose" }
> = {
  behavioral: { label: "Behavioral", variant: "indigo" },
  technical: { label: "Technical", variant: "violet" },
  situational: { label: "Situational", variant: "amber" },
  culture: { label: "Culture", variant: "emerald" },
  "resume-grill": { label: "Resume Grill", variant: "rose" },
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "text-emerald-400",
  medium: "text-amber-400",
  hard: "text-rose-400",
};

const ROLES = [
  "Full-Stack SDE",
  "Frontend Developer",
  "Backend Engineer",
  "ML/Data Engineer",
  "DevOps Engineer",
] as const;

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

  // ─── Active Turn & Response State ───────────────────────────────────────────
  const [response, setResponse] = useState("");
  const [isRecording, setIsRecording] = useState(false);
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

  // ─── Visual & Acoustic Telemetry State ──────────────────────────────────────
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
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
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const gazeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
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
    Promise.all([getInterviewQuestions(), getPastInterviewSessions()])
      .then(([qs, past]) => {
        setQuestions(qs);
        setSessions(past);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load interview studio data.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Filtered Questions Based on Mode & Category ────────────────────────────
  const availableQuestions = questions.filter((q) => {
    if (studioMode === "grill") {
      return q.category === "resume-grill";
    }
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

  // ─── Media Stream Setup & Audio Visualizer ──────────────────────────────────
  const startCameraAndAudio = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraPermissionDenied(true);
        setLiveEyeContact(-1);
        return;
      }

      const combinedStream = new MediaStream();
      let videoAcquired = false;

      // 1. Acquire Video Stream (Unconstrained to avoid Windows OverconstrainedError on desktop webcams)
      if (cameraActive) {
        try {
          const vStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
          });
          vStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));
          videoAcquired = true;
          setCameraPermissionDenied(false);
        } catch {
          // Fallback to basic unconstrained video: true
          try {
            const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
            vStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));
            videoAcquired = true;
            setCameraPermissionDenied(false);
          } catch (camErr) {
            console.warn("[Webcam Notice] Camera could not be acquired:", camErr);
            videoAcquired = false;
            setCameraPermissionDenied(true);
            setLiveEyeContact(-1);
          }
        }
      } else {
        setCameraPermissionDenied(false);
        setLiveEyeContact(-1);
      }

      // 2. Acquire Audio Stream
      try {
        const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        aStream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
      } catch (audioErr) {
        console.warn("[Audio Notice] Microphone could not be acquired:", audioErr);
      }

      if (combinedStream.getTracks().length === 0) {
        setCameraPermissionDenied(true);
        setLiveEyeContact(-1);
        return;
      }

      streamRef.current = combinedStream;

      if (videoRef.current && videoAcquired) {
        videoRef.current.srcObject = combinedStream;
        videoRef.current.play().catch(() => {});
      }

      // AudioContext & AnalyserNode for live 60-bar waveform
      if (combinedStream.getAudioTracks().length > 0) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioCtxRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          const source = audioCtx.createMediaStreamSource(combinedStream);
          source.connect(analyser);

          const canvas = audioCanvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const renderWaveform = () => {
              if (!ctx) return;
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

      // Gaze & Stability Centroid Tracker (10Hz)
      if (videoAcquired) {
        const offscreen = document.createElement("canvas");
        offscreen.width = 64;
        offscreen.height = 48;
        const offCtx = offscreen.getContext("2d", { willReadFrequently: true });

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

            // Central gaze box
            const inCenter = cx >= 22 && cx <= 42 && cy >= 15 && cy <= 33;
            eyeSamplesRef.current.total += 1;
            if (inCenter) eyeSamplesRef.current.center += 1;

            const ratio = Math.round((eyeSamplesRef.current.center / eyeSamplesRef.current.total) * 100);
            setLiveEyeContact(ratio);

            // Stability deviation
            const dist = Math.hypot(cx - 32, cy - 24);
            recentDistancesRef.current.push(dist);
            if (recentDistancesRef.current.length > 12) recentDistancesRef.current.shift();
            const avgDist =
              recentDistancesRef.current.reduce((a, b) => a + b, 0) / recentDistancesRef.current.length;
            setLivePosture(avgDist < 5.5 ? "Stable" : avgDist < 10 ? "Centering" : "Shifting");
          }
        }, 120);
      }
    } catch (outerErr) {
      console.warn("[Media Setup Exception]:", outerErr);
      setCameraPermissionDenied(true);
      setLiveEyeContact(-1);
    }
  }, [cameraActive]);

  const stopCameraAndAudio = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (gazeIntervalRef.current) {
      clearInterval(gazeIntervalRef.current);
      gazeIntervalRef.current = null;
    }
  }, []);

  // Sync camera whenever cameraActive changes or on unmount
  useEffect(() => {
    startCameraAndAudio();
    return () => {
      stopCameraAndAudio();
    };
  }, [startCameraAndAudio, stopCameraAndAudio]);

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

  // ─── Speech Recognition (STT) Setup ─────────────────────────────────────────
  const startRecording = () => {
    stopTTS();
    setIsRecording(true);
    setDurationSeconds(0);
    setWpmHistory([]);
    eyeSamplesRef.current = { center: 0, total: 0 };
    recentDistancesRef.current = [];
    lastSpokenTimestampRef.current = Date.now();
    setIsHesitating(false);
    setHesitationGaps(0);

    // Initialize Web SpeechRecognition if supported
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

        recognition.onerror = () => {
          // Gracefully continue allowing manual typing
        };

        recognition.onend = () => {
          // Keep recording state consistent
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        // Fallback to manual text mode
      }
    }

    // Interval: Timer, WPM calculator, and Hesitation Silence detector (>2.5s)
    let elapsed = 0;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    recordingTimerRef.current = setInterval(() => {
      elapsed += 1;
      setDurationSeconds(elapsed);

      // Hesitation detector: silence > 2.5s after 3s of starting
      const silenceDuration = Date.now() - lastSpokenTimestampRef.current;
      if (silenceDuration > 2500 && elapsed > 3) {
        setIsHesitating(true);
        setHesitationGaps((prev) => prev + 1);
      } else {
        setIsHesitating(false);
      }

      // Sample WPM every 5 seconds
      if (elapsed % 5 === 0) {
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

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    // Calculate final WPM
    const words = response.trim().split(/\s+/).filter(Boolean).length;
    const finalWpm = durationSeconds > 0 ? Math.round((words / Math.max(1, durationSeconds)) * 60) : 120;
    setLiveWpm(finalWpm);
    countFillers(response);
  };

  // ─── Evaluation Submission ──────────────────────────────────────────────────
  const handleEvaluate = async () => {
    if (!response.trim() || !activeQuestion) return;
    stopRecording();
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
      });

      setEvalResult(evaluation);
      setIsEvaluating(false);

      // Auto-speak the follow-up question if TTS enabled
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

    // Record previous turn into conversation history
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

    // Create a dynamic follow-up question in the question list
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
    setFillerCounts({});
    setIsHesitating(false);
    setHesitationGaps(0);
    setShowHint(true);
    setShowSample(false);

    if (ttsEnabled) {
      speakText(followUpQuestionObj.question);
    }
  };

  // ─── Save Session to Supabase / Demo Store ──────────────────────────────────
  const handleSaveSession = async () => {
    if (!evalResult || !activeQuestion) return;

    try {
      const allTurns = [
        ...sessionTurns,
        {
          questionText: activeQuestion.question,
          category: activeQuestion.category,
          userAnswer: response,
          aiFeedback: evalResult.deliveryCritique.pacingAdvice,
          score: evalResult.overallScore,
          turnOrder: currentTurnOrder,
        },
      ];

      await recordInterviewSession(
        {
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          role: `${selectedRole} – ${activeQuestion.category.toUpperCase()}`,
          score: evalResult.overallScore,
          questionsAnswered: allTurns.length,
          duration: `${Math.max(1, Math.round(durationSeconds / 60))} min`,
          feedback: evalResult.deliveryCritique.pacingAdvice,
          avgWpm: liveWpm,
          fillerWordCount: Object.values(fillerCounts).reduce((a, b) => a + b, 0),
          eyeContactScore: liveEyeContact >= 0 ? liveEyeContact : undefined,
          deliveryScore: evalResult.deliveryScore,
          contentScore: evalResult.contentScore,
          starBreakdown: evalResult.starBreakdown,
          rewrittenAnswer: evalResult.rewrittenIdealAnswer,
          followUpQuestion: evalResult.followUpQuestion.prompt,
        },
        allTurns
      );

      setSaveSuccessMsg("Interview session & multi-turn telemetry saved successfully!");
      // Reload history
      const updatedSessions = await getPastInterviewSessions();
      setSessions(updatedSessions);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record interview session.");
    }
  };

  // ─── Copy Model Answer ──────────────────────────────────────────────────────
  const handleCopyModelAnswer = () => {
    if (!evalResult?.rewrittenIdealAnswer) return;
    navigator.clipboard.writeText(evalResult.rewrittenIdealAnswer);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  const totalFillersSpoken = Object.values(fillerCounts).reduce((a, b) => a + b, 0);
  const catConfig = activeQuestion
    ? CATEGORY_CONFIG[activeQuestion.category] || CATEGORY_CONFIG.behavioral
    : CATEGORY_CONFIG.behavioral;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Error state */}
      {error && (
        <ErrorBanner
          title="Interview Service Notice"
          message={error}
          onRetry={() => {
            setError(null);
            loadData();
          }}
        />
      )}

      {/* Save Success Toast */}
      {saveSuccessMsg && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Configuration & Mode Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-3 bg-[#0e1424] border border-white/8 rounded-2xl backdrop-blur-xl shadow-lg">
        {/* Left: View Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/6 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("practice")}
            className={clsx(
              "flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
              activeTab === "practice"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Mic className="w-3.5 h-3.5 text-indigo-300" />
            AI Studio Stage
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={clsx(
              "flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all",
              activeTab === "history"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Clock className="w-3.5 h-3.5 text-slate-300" />
            Session History ({sessions.length})
          </button>
        </div>

        {/* Center: Practice Modes */}
        {activeTab === "practice" && (
          <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/6 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setStudioMode("bank");
                setCurrentIdx(0);
                setEvalResult(null);
                setResponse("");
              }}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                studioMode === "bank"
                  ? "bg-white/10 text-white border border-white/10"
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
          </div>
        )}

        {/* Right: Role Dropdown & TTS Toggle */}
        <div className="flex items-center gap-3">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r} className="bg-slate-900 text-slate-200">
                {r}
              </option>
            ))}
          </select>

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
              {(["all", "behavioral", "technical", "situational", "culture"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setFilterCategory(cat);
                    setCurrentIdx(0);
                    setEvalResult(null);
                    setResponse("");
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",
                    filterCategory === cat
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white/5 text-slate-400 hover:text-white border border-white/6"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* MAIN SPLIT STAGE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ─── LEFT PANEL: Live Webcam HUD & Acoustic Waveform (5 cols) ─── */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl backdrop-blur-md">
                {/* Video Feed */}
                <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                  {cameraActive && !cameraPermissionDenied ? (
                    <video
                      ref={(el) => {
                        videoRef.current = el;
                        if (el && streamRef.current && streamRef.current.getVideoTracks().length > 0) {
                          if (el.srcObject !== streamRef.current) {
                            el.srcObject = streamRef.current;
                            el.play().catch(() => {});
                          }
                        }
                      }}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover -scale-x-100"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500">
                      <VideoOff className="w-10 h-10 mb-2 text-slate-600" />
                      <p className="text-xs font-semibold text-slate-300">
                        {cameraPermissionDenied ? "Camera Permission Denied" : "Camera HUD Disabled"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">Audio-Only practice mode active</p>
                      {cameraPermissionDenied && (
                        <button
                          type="button"
                          onClick={() => {
                            setCameraActive(true);
                            startCameraAndAudio();
                          }}
                          className="mt-3 px-3 py-1 text-[11px] font-medium bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 rounded-lg transition-all"
                        >
                          Retry Camera Access
                        </button>
                      )}
                    </div>
                  )}

                  {/* Sci-Fi Target Reticle Overlay (When camera active) */}
                  {cameraActive && !cameraPermissionDenied && (
                    <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div className="w-4 h-4 border-t-2 border-l-2 border-indigo-500/80" />
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/70 border border-emerald-500/40 text-[10px] text-emerald-300 font-semibold backdrop-blur-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>LIVE HUD</span>
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

                {/* HUD Telemetry Badges */}
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
                    onClick={() => setCameraActive(!cameraActive)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/5 border border-white/8 text-slate-300 hover:text-white"
                  >
                    {cameraActive ? (
                      <>
                        <VideoOff className="w-3 h-3 text-rose-400" /> Camera Off
                      </>
                    ) : (
                      <>
                        <Video className="w-3 h-3 text-emerald-400" /> Enable Camera
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
                  <div className="flex items-center gap-2">
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
                      {currentIdx + 1} / {availableQuestions.length}
                    </span>
                    <button
                      type="button"
                      aria-label="Next question"
                      onClick={() => {
                        setCurrentIdx((i) => Math.min(availableQuestions.length - 1, i + 1));
                        setResponse("");
                        setEvalResult(null);
                      }}
                      disabled={currentIdx === availableQuestions.length - 1}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/6 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main Question Text */}
                <h2 className="text-base sm:text-lg font-bold text-white mb-4 leading-relaxed">
                  {activeQuestion?.question}
                </h2>

                {/* Collapsible Sample Answer */}
                {showSample && activeQuestion?.sampleAnswer && (
                  <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 leading-relaxed">
                    <p className="font-semibold text-emerald-400 text-[10px] uppercase tracking-wider mb-1">
                      Ideal STAR Reference Answer
                    </p>
                    <p>{activeQuestion.sampleAnswer}</p>
                  </div>
                )}

                {/* ─── LIVE TELEMETRY STRIP (Visible during practice) ─── */}
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

          {/* ─── POST-ANSWER DEEP DIAGNOSTIC DASHBOARD ──────────────────────── */}
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
                    Source: {evalResult.evaluationSource === "ai" ? "Gemini 2.0 / Groq AI" : "Bar-Raiser Heuristic Engine"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                  {/* Gauge 1: Composite Score */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/6 flex flex-col items-center">
                    <div className="text-3xl font-extrabold text-white mb-1 flex items-baseline gap-1">
                      <span
                        className={
                          evalResult.overallScore >= 80
                            ? "text-emerald-400"
                            : evalResult.overallScore >= 65
                            ? "text-amber-400"
                            : "text-rose-400"
                        }
                      >
                        {evalResult.overallScore}
                      </span>
                      <span className="text-sm font-normal text-slate-500">/ 100</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      Overall Composite Score
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Bar-Raiser Hiring Benchmark</p>
                  </div>

                  {/* Gauge 2: Content Score */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/6 flex flex-col items-center">
                    <div className="text-3xl font-extrabold text-indigo-300 mb-1 flex items-baseline gap-1">
                      <span>{evalResult.contentScore}</span>
                      <span className="text-sm font-normal text-slate-500">/ 100</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      STAR Content Score
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Depth, Architecture & Metrics</p>
                  </div>

                  {/* Gauge 3: Delivery Score */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/6 flex flex-col items-center">
                    <div className="text-3xl font-extrabold text-emerald-400 mb-1 flex items-baseline gap-1">
                      <span>{evalResult.deliveryScore}</span>
                      <span className="text-sm font-normal text-slate-500">/ 100</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      Acoustic & Visual Delivery
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Pacing, Eye-Contact & Vocal Economy</p>
                  </div>
                </div>
              </Card>

              {/* STAR Rubric Breakdown (4 Cards) */}
              <div>
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400" /> STAR Rubric Component Breakdown
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(
                    [
                      { key: "situation", label: "Situation", color: "indigo", weight: "20%" },
                      { key: "task", label: "Task", color: "violet", weight: "20%" },
                      { key: "action", label: "Action", color: "emerald", weight: "35%" },
                      { key: "result", label: "Result", color: "amber", weight: "25%" },
                    ] as const
                  ).map((item) => {
                    const comp = evalResult.starBreakdown[item.key as keyof StarBreakdown];
                    return (
                      <Card key={item.key} className="p-4 bg-[#0e1424] border-white/6 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-white capitalize">{item.label}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Weight: {item.weight}</span>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={clsx(
                                "text-lg font-extrabold",
                                comp.score >= 80 ? "text-emerald-400" : comp.score >= 65 ? "text-amber-400" : "text-rose-400"
                              )}
                            >
                              {comp.score}%
                            </span>
                            {comp.present ? (
                              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Present
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] text-rose-400">
                                <XCircle className="w-3.5 h-3.5" /> Missing
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{comp.feedback}</p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Diagnostics Strip */}
              <Card className="p-5 bg-[#0e1424] border-white/6 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" /> Delivery & Telemetry Diagnostics
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

              {/* Side-by-Side Transcript Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User's Spoken Answer with Highlighted Fillers */}
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

                {/* AI 95/100 Rewritten Model Answer */}
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

              {/* ─── INTERVIEWER CROSS-QUESTION CARD (Turn Chaining) ──────────── */}
              <Card className="p-6 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-indigo-950/60 border-indigo-500/40 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                        Turn {currentTurnOrder + 1} Cross-Question
                      </span>
                      <span className="text-xs text-slate-400">
                        Targeting weakest STAR signal or project metric gap
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug">
                      &quot;{evalResult.followUpQuestion.prompt}&quot;
                    </h3>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/6 text-xs text-slate-300">
                      <strong className="text-indigo-400">Interviewer Intent:</strong>{" "}
                      {evalResult.followUpQuestion.intent}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<ArrowRight className="w-4 h-4" />}
                      onClick={handleChainFollowUpTurn}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 whitespace-nowrap"
                    >
                      Answer Follow-Up Probe (Turn {currentTurnOrder + 1})
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
