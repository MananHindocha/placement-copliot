"use client";

import React, { useState, useEffect, useRef } from "react";

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
    label: "💡 Agent Action: Providing Architectural Nudge",
    color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  },
  NEXT_TOPIC_AND_LOG_EVIDENCE: {
    label: "✅ Agent Action: Logged Skill Evidence & Switching Topic",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  CONCLUDE_INTERVIEW: {
    label: "🏁 Agent Action: Interview Concluded & Readiness Synced",
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const voiceEnabledRef = useRef<boolean>(voiceEnabled);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isAgentThinking]);

  function speakText(text: string) {
    if (!voiceEnabledRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.03;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsAgentSpeaking(true);
    utterance.onend = () => setIsAgentSpeaking(false);
    utterance.onerror = () => setIsAgentSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

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
  }, [jobDescription, targetCompany, targetRole, userId]);

  async function submitCandidateTurn(forceConclude = false) {
    const combinedAnswer = [
      candidateInput.trim(),
      codeScratchpad.trim() ? `\n[Code Scratchpad]:\n\`\`\`\n${codeScratchpad.trim()}\n\`\`\`` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (!combinedAnswer && !forceConclude) return;

    setIsAgentThinking(true);
    setErrorBanner(null);
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
        finalReport?: FinalReport | null;
        spokenResponse?: string;
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

      if (data.skillMatrixMutation) {
        const mutation = data.skillMatrixMutation;
        setSkillMutations((prev) => [mutation, ...prev]);
      }

      if (data.finalReport) {
        setFinalReport(data.finalReport);
      }

      if (data.spokenResponse) {
        speakText(data.spokenResponse);
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
    <div className="min-h-screen bg-[#07090e] text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            {onExit && (
              <button
                onClick={onExit}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                ← Exit Room
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Live Autonomous AI Interviewer
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {targetRole} {targetCompany ? `@ ${targetCompany}` : ""}
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Multi-turn adaptive cross-examination • Grounded in Supabase Resume &amp; Skill Evidence Matrix
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
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
                  : "bg-slate-900 text-slate-400 border-slate-800"
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
          {/* Left Column: Live AI Agent Persona + Real-time Skill Evidence Feed (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl bg-[#0d111a] border border-slate-800/90 flex flex-col items-center text-center space-y-4">
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isAgentThinking
                    ? "border-amber-400 bg-amber-500/10 animate-pulse"
                    : isAgentSpeaking
                    ? "border-indigo-400 bg-indigo-500/20 shadow-[0_0_35px_rgba(99,102,241,0.45)]"
                    : "border-slate-700 bg-slate-900"
                }`}
              >
                <span className="text-3xl">{isAgentThinking ? "🧠" : isAgentSpeaking ? "🎙️" : "🤖"}</span>
              </div>

              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${badgeMeta.color}`}>
                {badgeMeta.label}
              </div>

              <div className="w-full text-left p-4 rounded-xl bg-slate-950/90 border border-slate-800/80">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                  Current Interviewer Prompt
                </div>
                <p className="text-sm text-slate-100 leading-relaxed">
                  {isAgentThinking
                    ? "Analyzing your response, checking resume claims, and deciding next interviewer action..."
                    : latestInterviewerTurn?.content || "Initializing interview session..."}
                </p>
              </div>
            </div>

            {/* Live Skill Evidence Matrix Mutations Logged During This Interview */}
            <div className="p-5 rounded-2xl bg-[#0d111a] border border-slate-800/90 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Live Supabase Skill Matrix Updates
                </h3>
                <span className="text-xs text-indigo-400">{skillMutations.length} logged</span>
              </div>

              {skillMutations.length === 0 ? (
                <p className="text-xs text-slate-500">
                  As you answer technical questions, the agent will log verified confidence changes and bluff-risk flags here in real time.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {skillMutations.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-white">{m.skillName}</span>
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
                      <p className="text-slate-400">{m.citation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Back-and-Forth Dialogue Transcript & Candidate Response Box (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Scrollable Multi-Turn Conversation History */}
            <div className="p-5 rounded-2xl bg-[#0d111a] border border-slate-800/90 h-[360px] overflow-y-auto space-y-4">
              {history.map((turn, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    turn.role === "candidate" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="text-[11px] text-slate-500 mb-1 px-1">
                    {turn.role === "interviewer" ? "AI Bar-Raiser Agent" : "You (Candidate)"}
                    {turn.interviewerAction ? ` • ${turn.interviewerAction}` : ""}
                  </div>
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      turn.role === "interviewer"
                        ? "bg-slate-900 border border-slate-800 text-slate-100"
                        : "bg-indigo-600/25 border border-indigo-500/40 text-indigo-100"
                    }`}
                  >
                    {turn.content}
                  </div>
                </div>
              ))}
              {isAgentThinking && (
                <div className="text-xs text-amber-300 animate-pulse">
                  🤖 AI Interviewer is evaluating your answer &amp; formulating next action...
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Candidate Input Area OR Final Executive Debrief */}
            {finalReport ? (
              <div className="p-6 rounded-2xl bg-[#0d111a] border border-indigo-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">
                    🏁 Interview Executive Debrief
                  </h2>
                  <span className="px-3 py-1 rounded-full text-sm font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Overall Score: {finalReport.overallScore}/100
                  </span>
                </div>

                {typeof finalReport.injectedReadinessTasksCount === "number" &&
                  finalReport.injectedReadinessTasksCount > 0 && (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300">
                      ✅ Agent automatically injected {finalReport.injectedReadinessTasksCount} remedial study tasks into your Supabase Readiness Plan based on this interview!
                    </div>
                  )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="font-semibold text-emerald-400 mb-2">Verified Strengths</div>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      {(finalReport.strengths || []).map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="font-semibold text-rose-400 mb-2">Identified Gaps</div>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      {(finalReport.weaknesses || []).map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-[#0d111a] border border-slate-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("verbal")}
                      className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        activeTab === "verbal"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-900 text-slate-400"
                      }`}
                    >
                      Verbal / Text Answer
                    </button>
                    <button
                      onClick={() => setActiveTab("code")}
                      className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        activeTab === "code"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-900 text-slate-400"
                      }`}
                    >
                      {"</>"} Code Scratchpad
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
                    onChange={(e) => setCandidateInput(e.target.value)}
                    placeholder="Speak your answer using the mic or type your technical response here... The AI Interviewer will dynamically probe your answer or challenge your resume claims."
                    rows={4}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <textarea
                    value={codeScratchpad}
                    onChange={(e) => setCodeScratchpad(e.target.value)}
                    placeholder="// Write pseudo-code, SQL queries, or architecture snippets to accompany your verbal answer..."
                    rows={4}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-sm font-mono text-emerald-300 focus:outline-none focus:border-indigo-500"
                  />
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">
                    The interviewer decides whether to probe deeper, give a hint, or advance topics.
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

