"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FilesetResolver,
  FaceLandmarker,
  HandLandmarker,
} from "@mediapipe/tasks-vision";
import { clsx } from "clsx";

export interface CvTelemetrySnapshot {
  eyeContactScore: number;
  lookingAtCamera: boolean;
  gazeDirection:
    | "DIRECT_CAMERA"
    | "LOOKING_LEFT"
    | "LOOKING_RIGHT"
    | "LOOKING_DOWN"
    | "LOOKING_UP"
    | "NO_FACE";
  postureStatus:
    | "UPRIGHT_CENTERED"
    | "SLOUCHING_LOW"
    | "HEAD_TILTED"
    | "OFF_CENTER";
  handStatus:
    | "NO_HANDS_VISIBLE"
    | "CALM_COMPOSED"
    | "EXPRESSIVE_GESTURES"
    | "EXCESSIVE_FIDGETING"
    | "HAND_TOUCHING_FACE";
  lightingStatus: "OPTIMAL" | "DIM_LIGHT" | "OVEREXPOSED";
  lightingPct: number;
  handsDetectedCount: number;
}

interface VisionProctorStageProps {
  interviewerTitle?: string;
  targetFileBadge?: string;
  interviewerActionBadge?: string;
  currentPromptText: string;
  isAgentThinking?: boolean;
  isAgentSpeaking?: boolean;
  onSpeakPrompt?: () => void;
}

const MEDIAPIPE_WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm";
const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const HAND_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export default function VisionProctorStage({
  interviewerTitle = "AI Bar-Raiser Agent",
  targetFileBadge,
  interviewerActionBadge = "OPENING_QUESTION",
  currentPromptText,
  isAgentThinking = false,
  isAgentSpeaking = false,
  onSpeakPrompt,
}: VisionProctorStageProps) {
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [showLandmarksOverlay, setShowLandmarksOverlay] = useState<boolean>(true);
  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState<boolean>(true);

  const [telemetry, setTelemetry] = useState<CvTelemetrySnapshot>({
    eyeContactScore: 95,
    lookingAtCamera: true,
    gazeDirection: "DIRECT_CAMERA",
    postureStatus: "UPRIGHT_CENTERED",
    handStatus: "NO_HANDS_VISIBLE",
    lightingStatus: "OPTIMAL",
    lightingPct: 72,
    handsDetectedCount: 0,
  });

  const [eyeContactAlert, setEyeContactAlert] = useState<string | null>(null);
  const [handPostureAlert, setHandPostureAlert] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Sync live UI toggle flags cleanly into refs for the 60 FPS loop
  const showLandmarksRef = useRef<boolean>(showLandmarksOverlay);
  const audioAlertsRef = useRef<boolean>(audioAlertsEnabled);
  useEffect(() => {
    showLandmarksRef.current = showLandmarksOverlay;
  }, [showLandmarksOverlay]);
  useEffect(() => {
    audioAlertsRef.current = audioAlertsEnabled;
  }, [audioAlertsEnabled]);

  const lookAwayStartMsRef = useRef<number | null>(null);
  const lastAudioAlertMsRef = useRef<number>(0);
  const lastDetectTsRef = useRef<number>(0);
  const lastTelemetryCommitMsRef = useRef<number>(0);
  const lastLightingSampleMsRef = useRef<number>(0);
  const lightingSampleRef = useRef<{
    status: CvTelemetrySnapshot["lightingStatus"];
    pct: number;
  }>({ status: "OPTIMAL", pct: 72 });
  const prevWristRef = useRef<{ x: number; y: number; ts: number } | null>(null);
  const rollingEyeContactRef = useRef<number>(95);

  const playSubtleAlertBeep = useCallback(() => {
    if (!audioAlertsRef.current || typeof window === "undefined") return;
    const now = Date.now();
    if (now - lastAudioAlertMsRef.current < 6000) return;
    lastAudioAlertMsRef.current = now;

    try {
      const AudioCtx =
        window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      gain.gain.setValueAtTime(0.055, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
      osc.onended = () => {
        ctx.close().catch(() => {});
      };
    } catch {
      // Ignore browser AudioContext autoplay restrictions silently
    }
  }, []);

  const stopWebcamStream = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    const canvas = overlayCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    lookAwayStartMsRef.current = null;
    prevWristRef.current = null;
    setCameraEnabled(false);
    setEyeContactAlert(null);
    setHandPostureAlert(null);
  }, []);

  const sampleLighting = useCallback((video: HTMLVideoElement) => {
    const nowMs = performance.now();
    if (nowMs - lastLightingSampleMsRef.current < 550) {
      return lightingSampleRef.current;
    }
    lastLightingSampleMsRef.current = nowMs;

    try {
      if (!lightingCanvasRef.current && typeof document !== "undefined") {
        const tiny = document.createElement("canvas");
        tiny.width = 16;
        tiny.height = 12;
        lightingCanvasRef.current = tiny;
      }
      const tinyCanvas = lightingCanvasRef.current;
      const lCtx = tinyCanvas?.getContext("2d", { willReadFrequently: true });
      if (!tinyCanvas || !lCtx) return lightingSampleRef.current;

      lCtx.drawImage(video, 0, 0, 16, 12);
      const { data } = lCtx.getImageData(0, 0, 16, 12);
      let lumaSum = 0;
      const pixelCount = 16 * 12;
      for (let i = 0; i < data.length; i += 4) {
        lumaSum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const avgLuma = lumaSum / pixelCount;
      const pct = Math.min(100, Math.max(5, Math.round((avgLuma / 255) * 100)));
      const status: CvTelemetrySnapshot["lightingStatus"] =
        avgLuma < 52 ? "DIM_LIGHT" : avgLuma > 224 ? "OVEREXPOSED" : "OPTIMAL";

      lightingSampleRef.current = { status, pct };
      return lightingSampleRef.current;
    } catch {
      return lightingSampleRef.current;
    }
  }, []);

  const startCvDetectionLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    let lastVideoTime = -1;

    const renderLoop = () => {
      if (!isMountedRef.current) return;

      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;
      const faceLandmarker = faceLandmarkerRef.current;
      const handLandmarker = handLandmarkerRef.current;

      if (!video || !canvas || video.readyState < 2 || !streamRef.current) {
        rafIdRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const tsMs = Math.max(lastDetectTsRef.current + 1, Math.round(performance.now()));
        lastDetectTsRef.current = tsMs;

        const targetW = video.videoWidth || 640;
        const targetH = video.videoHeight || 480;
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);

        const lighting = sampleLighting(video);

        // If CV models are still loading or offline, keep video & lighting live without crashing
        if (!faceLandmarker || !handLandmarker) {
          const nowEpoch = Date.now();
          if (nowEpoch - lastTelemetryCommitMsRef.current > 200) {
            lastTelemetryCommitMsRef.current = nowEpoch;
            setTelemetry((prev) => ({
              ...prev,
              lightingStatus: lighting.status,
              lightingPct: lighting.pct,
            }));
          }
          rafIdRef.current = requestAnimationFrame(renderLoop);
          return;
        }

        try {
          const faceResult = faceLandmarker.detectForVideo(video, tsMs);
          const handResult = handLandmarker.detectForVideo(video, tsMs);

          // 1. Analyze 3D Face & Iris Landmarks
          let gazeDirection: CvTelemetrySnapshot["gazeDirection"] = "NO_FACE";
          let lookingAtCamera = false;
          let postureStatus: CvTelemetrySnapshot["postureStatus"] = "UPRIGHT_CENTERED";
          let faceTargetPos = { x: 0.5, y: 0.5 };

          if (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
            const lm = faceResult.faceLandmarks[0];
            const noseTip = lm[1];
            const leftEyeOuter = lm[33];
            const leftEyeInner = lm[133];
            const rightEyeInner = lm[362];
            const rightEyeOuter = lm[263];
            const forehead = lm[10];
            const chin = lm[152];
            const leftIris = lm.length > 468 ? lm[468] : leftEyeOuter;
            const rightIris = lm.length > 473 ? lm[473] : rightEyeOuter;

            faceTargetPos = { x: noseTip.x, y: noseTip.y };

            // Head Yaw + Pitch symmetry
            const distLeft = Math.hypot(noseTip.x - leftEyeOuter.x, noseTip.y - leftEyeOuter.y);
            const distRight = Math.hypot(noseTip.x - rightEyeOuter.x, noseTip.y - rightEyeOuter.y);
            const yawRatio = distLeft / (distRight + 0.0001);

            const distTop = Math.hypot(noseTip.x - forehead.x, noseTip.y - forehead.y);
            const distBottom = Math.hypot(noseTip.x - chin.x, noseTip.y - chin.y);
            const pitchRatio = distTop / (distBottom + 0.0001);

            // Eye iris normalized horizontal offset (catches glances even when head is still)
            let irisSideGlance = false;
            let irisOffset = 0.5;
            if (lm.length > 473 && leftEyeInner && rightEyeInner) {
              const leftSpan = leftEyeInner.x - leftEyeOuter.x;
              const rightSpan = rightEyeOuter.x - rightEyeInner.x;
              const leftOffset = Math.abs(leftSpan) > 0.004 ? (leftIris.x - leftEyeOuter.x) / leftSpan : 0.5;
              const rightOffset = Math.abs(rightSpan) > 0.004 ? (rightIris.x - rightEyeInner.x) / rightSpan : 0.5;
              irisOffset = (leftOffset + rightOffset) / 2;
              if (irisOffset < 0.24 || irisOffset > 0.76) {
                irisSideGlance = true;
              }
            }

            // Head Roll / Tilt angle
            const rollDeg =
              (Math.atan2(rightEyeOuter.y - leftEyeOuter.y, rightEyeOuter.x - leftEyeOuter.x) *
                180) /
              Math.PI;

            if (yawRatio < 0.68 || (irisSideGlance && irisOffset > 0.76)) {
              gazeDirection = "LOOKING_RIGHT";
            } else if (yawRatio > 1.45 || (irisSideGlance && irisOffset < 0.24)) {
              gazeDirection = "LOOKING_LEFT";
            } else if (pitchRatio > 1.38 || noseTip.y > 0.72) {
              gazeDirection = "LOOKING_DOWN";
            } else if (pitchRatio < 0.62) {
              gazeDirection = "LOOKING_UP";
            } else {
              gazeDirection = "DIRECT_CAMERA";
              lookingAtCamera = true;
            }

            if (noseTip.y > 0.68) {
              postureStatus = "SLOUCHING_LOW";
            } else if (Math.abs(rollDeg) > 13) {
              postureStatus = "HEAD_TILTED";
            } else if (noseTip.x < 0.24 || noseTip.x > 0.76) {
              postureStatus = "OFF_CENTER";
            } else {
              postureStatus = "UPRIGHT_CENTERED";
            }

            // Draw 3D Iris Reticles & Face Framing Target
            if (ctx && showLandmarksRef.current) {
              ctx.strokeStyle = lookingAtCamera
                ? "rgba(16, 185, 129, 0.85)"
                : "rgba(244, 63, 94, 0.9)";
              ctx.lineWidth = 2;

              [leftIris, rightIris].forEach((pt) => {
                ctx.beginPath();
                ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 5, 0, 2 * Math.PI);
                ctx.stroke();
              });

              const minX = Math.min(leftEyeOuter.x, rightEyeOuter.x) - 0.08;
              const maxX = Math.max(leftEyeOuter.x, rightEyeOuter.x) + 0.08;
              const minY = forehead.y - 0.06;
              const maxY = chin.y + 0.04;
              ctx.strokeRect(
                minX * canvas.width,
                minY * canvas.height,
                (maxX - minX) * canvas.width,
                (maxY - minY) * canvas.height
              );
            }
          }

          // 2. Analyze 3D Hand Landmarks (FPS-normalized wrist speed & face-touch guard)
          const handsCount = handResult.landmarks ? handResult.landmarks.length : 0;
          let handStatus: CvTelemetrySnapshot["handStatus"] = "NO_HANDS_VISIBLE";

          if (handsCount > 0 && handResult.landmarks) {
            const primaryHand = handResult.landmarks[0];
            const wrist = primaryHand[0];
            const thumbTip = primaryHand[4];
            const indexTip = primaryHand[8];
            const middleTip = primaryHand[12];

            const minFaceDist = Math.min(
              Math.hypot(indexTip.x - faceTargetPos.x, indexTip.y - faceTargetPos.y),
              Math.hypot(thumbTip.x - faceTargetPos.x, thumbTip.y - faceTargetPos.y),
              Math.hypot(middleTip.x - faceTargetPos.x, middleTip.y - faceTargetPos.y)
            );

            let speedPerSec = 0;
            const nowPerf = performance.now();
            if (prevWristRef.current) {
              const dtSec = Math.max(0.016, Math.min(0.25, (nowPerf - prevWristRef.current.ts) / 1000));
              const dist = Math.hypot(wrist.x - prevWristRef.current.x, wrist.y - prevWristRef.current.y);
              speedPerSec = dist / dtSec;
            }
            prevWristRef.current = { x: wrist.x, y: wrist.y, ts: nowPerf };

            if (minFaceDist < 0.13) {
              handStatus = "HAND_TOUCHING_FACE";
            } else if (speedPerSec > 1.35) {
              handStatus = "EXCESSIVE_FIDGETING";
            } else if (speedPerSec > 0.25) {
              handStatus = "EXPRESSIVE_GESTURES";
            } else {
              handStatus = "CALM_COMPOSED";
            }

            if (ctx && showLandmarksRef.current) {
              for (const hand of handResult.landmarks) {
                ctx.strokeStyle =
                  handStatus === "HAND_TOUCHING_FACE" || handStatus === "EXCESSIVE_FIDGETING"
                    ? "rgba(245, 158, 11, 0.9)"
                    : "rgba(34, 211, 238, 0.85)";
                ctx.lineWidth = 2;

                for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
                  const p1 = hand[startIdx];
                  const p2 = hand[endIdx];
                  if (!p1 || !p2) continue;
                  ctx.beginPath();
                  ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                  ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                  ctx.stroke();
                }

                for (const pt of hand) {
                  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
                  ctx.beginPath();
                  ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 3, 0, 2 * Math.PI);
                  ctx.fill();
                }
              }
            }
          } else {
            prevWristRef.current = null;
          }

          // 3. Eye-Contact Sustained Off-Camera Alert (> 2.2s)
          const nowEpoch = Date.now();
          let nextEyeAlert: string | null = null;
          if (!lookingAtCamera) {
            if (!lookAwayStartMsRef.current) {
              lookAwayStartMsRef.current = nowEpoch;
            } else if (nowEpoch - lookAwayStartMsRef.current > 2200) {
              const directionText =
                gazeDirection === "NO_FACE"
                  ? "Face not detected in frame"
                  : gazeDirection === "LOOKING_DOWN"
                  ? "You are looking down"
                  : gazeDirection === "LOOKING_LEFT" || gazeDirection === "LOOKING_RIGHT"
                  ? "You are looking away to the side"
                  : "Eye contact lost";
              nextEyeAlert = `🚨 EYE CONTACT ALERT (${directionText}): Please look directly into the camera lens!`;
              playSubtleAlertBeep();
            }
            rollingEyeContactRef.current = Math.max(0, rollingEyeContactRef.current - 0.55);
          } else {
            lookAwayStartMsRef.current = null;
            nextEyeAlert = null;
            rollingEyeContactRef.current = Math.min(100, rollingEyeContactRef.current + 0.45);
          }

          let nextHandPostureAlert: string | null = null;
          if (handStatus === "HAND_TOUCHING_FACE") {
            nextHandPostureAlert =
              "🖐️ Hand Alert: Avoid resting your hand on your face or covering your mouth while speaking.";
          } else if (handStatus === "EXCESSIVE_FIDGETING") {
            nextHandPostureAlert =
              "🖐️ Hand Alert: Rapid hand movements detected — keep hand gestures steady and deliberate.";
          } else if (postureStatus === "SLOUCHING_LOW") {
            nextHandPostureAlert =
              "🧍 Posture Alert: You are slouching low in the frame — sit upright with shoulders level.";
          } else if (postureStatus === "HEAD_TILTED") {
            nextHandPostureAlert =
              "🧍 Posture Alert: Keep your head level and aligned with the camera lens.";
          }

          // Throttle React state updates to ~7 Hz to keep text/code input typing instant
          if (nowEpoch - lastTelemetryCommitMsRef.current >= 140) {
            lastTelemetryCommitMsRef.current = nowEpoch;
            setEyeContactAlert(nextEyeAlert);
            setHandPostureAlert(nextHandPostureAlert);
            setTelemetry({
              eyeContactScore: Math.round(rollingEyeContactRef.current),
              lookingAtCamera,
              gazeDirection,
              postureStatus,
              handStatus,
              lightingStatus: lighting.status,
              lightingPct: lighting.pct,
              handsDetectedCount: handsCount,
            });
          }
        } catch {
          // Skip transient frame inference hiccups gracefully
        }
      }

      rafIdRef.current = requestAnimationFrame(renderLoop);
    };

    rafIdRef.current = requestAnimationFrame(renderLoop);
  }, [playSubtleAlertBeep, sampleLighting]);

  const startWebcamStream = useCallback(async () => {
    stopWebcamStream();

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraEnabled(false);
      setModelLoadError("Webcam access is unavailable in this browser context.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });

      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      setCameraEnabled(true);
      setModelLoadError((prev) =>
        prev && prev.startsWith("Camera permission") ? null : prev
      );

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadeddata = () => {
          video.play().catch(() => {});
          startCvDetectionLoop();
        };
        if (video.readyState >= 2) {
          video.play().catch(() => {});
          startCvDetectionLoop();
        }
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      setCameraEnabled(false);
      const errMsg = err instanceof Error ? err.message : "Allow webcam access";
      setModelLoadError(`Camera permission needed: ${errMsg}`);
    }
  }, [startCvDetectionLoop, stopWebcamStream]);

  // Initialize MediaPipe WASM + FaceLandmarker + HandLandmarker + Webcam once on mount
  useEffect(() => {
    isMountedRef.current = true;

    async function initMediaPipeAndCamera() {
      // Start camera immediately so video feed appears even while models finish downloading
      void startWebcamStream();

      try {
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE);
        if (!isMountedRef.current) return;

        const createModels = async (delegate: "GPU" | "CPU") =>
          Promise.all([
            FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: FACE_LANDMARKER_MODEL_URL,
                delegate,
              },
              runningMode: "VIDEO",
              numFaces: 1,
              outputFaceBlendshapes: false,
            }),
            HandLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: HAND_LANDMARKER_MODEL_URL,
                delegate,
              },
              runningMode: "VIDEO",
              numHands: 2,
            }),
          ]);

        let faceLandmarker: FaceLandmarker;
        let handLandmarker: HandLandmarker;
        try {
          [faceLandmarker, handLandmarker] = await createModels("GPU");
        } catch {
          [faceLandmarker, handLandmarker] = await createModels("CPU");
        }

        if (!isMountedRef.current) {
          faceLandmarker.close();
          handLandmarker.close();
          return;
        }

        faceLandmarkerRef.current = faceLandmarker;
        handLandmarkerRef.current = handLandmarker;
        setModelsLoaded(true);
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        setModelLoadError(
          err instanceof Error
            ? `MediaPipe CV unavailable (${err.message}); video camera remains active.`
            : "Could not load MediaPipe CV models."
        );
      }
    }

    void initMediaPipeAndCamera();

    return () => {
      isMountedRef.current = false;
      stopWebcamStream();
      faceLandmarkerRef.current?.close();
      faceLandmarkerRef.current = null;
      handLandmarkerRef.current?.close();
      handLandmarkerRef.current = null;
    };
  }, [startWebcamStream, stopWebcamStream]);

  return (
    <div className="rounded-2xl bg-[#0D0D0D] border border-[#1D1D1D] p-5 space-y-4">
      {/* Top Bar: CV Model Status + Camera & Overlay Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1D1D1D] pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={clsx(
              "w-2.5 h-2.5 rounded-full",
              cameraEnabled ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
            )}
          />
          <span className="text-xs font-bold text-[#F5F5F5]">
            Live Video Interview Stage &amp; MediaPipe CV Telemetry
          </span>
          <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-[10px] text-indigo-300 font-mono">
            {modelsLoaded ? "MediaPipe Face+Hand 3D Active" : "Loading CV Models..."}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowLandmarksOverlay((prev) => !prev)}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors",
              showLandmarksOverlay
                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
                : "bg-[#121212] text-[#A1A1AA] border-[#292929]"
            )}
          >
            {showLandmarksOverlay ? "🎯 3D CV Mesh: ON" : "🎯 3D CV Mesh: OFF"}
          </button>

          <button
            type="button"
            onClick={() => setAudioAlertsEnabled((prev) => !prev)}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors",
              audioAlertsEnabled
                ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                : "bg-[#121212] text-[#A1A1AA] border-[#292929]"
            )}
          >
            {audioAlertsEnabled ? "🔔 Gaze Beep: ON" : "🔕 Gaze Beep: OFF"}
          </button>

          <button
            type="button"
            onClick={() => (cameraEnabled ? stopWebcamStream() : void startWebcamStream())}
            className={clsx(
              "px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-colors",
              cameraEnabled
                ? "bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25"
                : "bg-emerald-500 text-slate-950 border-emerald-400 hover:bg-emerald-400"
            )}
          >
            {cameraEnabled ? "Turn Off Camera" : "📹 Turn On Camera"}
          </button>
        </div>
      </div>

      {/* Prominent Red Alert Banner When Candidate Looks Away > 2.2s */}
      {eyeContactAlert && cameraEnabled && modelsLoaded && (
        <div className="p-3.5 rounded-xl bg-rose-950/90 border-2 border-rose-500 text-rose-100 text-xs font-bold flex items-center justify-between gap-2 animate-pulse shadow-lg">
          <span>{eyeContactAlert}</span>
          <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] shrink-0">
            Gaze: {telemetry.gazeDirection}
          </span>
        </div>
      )}

      {/* Secondary Alert Banner for Slouching, Hand-on-Face, or Fidgeting */}
      {handPostureAlert && cameraEnabled && modelsLoaded && !eyeContactAlert && (
        <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/60 text-amber-200 text-xs font-medium flex items-center justify-between gap-2">
          <span>{handPostureAlert}</span>
          <span className="text-[10px] text-amber-300 font-mono shrink-0">
            {telemetry.postureStatus} • {telemetry.handStatus}
          </span>
        </div>
      )}

      {modelLoadError && (
        <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-center justify-between gap-2">
          <span>⚠️ {modelLoadError}</span>
          <button
            type="button"
            onClick={() => setModelLoadError(null)}
            className="text-[11px] underline text-rose-200 hover:text-white cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Side-by-Side Real Video Call Stage */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        {/* Live Camera + MediaPipe 3D Face/Hand Canvas (6 cols) */}
        <div className="md:col-span-6 relative rounded-2xl overflow-hidden bg-[#050505] border border-[#292929] aspect-video flex items-center justify-center">
          {/* Keep video & canvas mounted so re-enabling camera always binds cleanly */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={clsx(
              "w-full h-full object-cover -scale-x-100",
              cameraEnabled ? "block" : "hidden"
            )}
          />
          <canvas
            ref={overlayCanvasRef}
            className={clsx(
              "absolute inset-0 w-full h-full object-cover -scale-x-100 pointer-events-none",
              cameraEnabled ? "block" : "hidden"
            )}
          />

          {cameraEnabled ? (
            <>
              {/* Live HUD Corner Badges */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
                <span
                  className={clsx(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border truncate",
                    telemetry.lookingAtCamera
                      ? "bg-emerald-950/85 text-emerald-300 border-emerald-500/50"
                      : "bg-rose-950/90 text-rose-200 border-rose-500"
                  )}
                >
                  {telemetry.lookingAtCamera
                    ? "👁️ Eye Contact: LOCKED ON CAMERA"
                    : `⚠️ Gaze Off-Camera (${telemetry.gazeDirection})`}
                </span>

                <span className="px-2.5 py-1 rounded-full bg-[#050505]/85 border border-[#292929] text-[10px] text-[#F5F5F5] font-semibold shrink-0 tabular-nums">
                  Eye Score: {telemetry.eyeContactScore}%
                </span>
              </div>

              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
                <span
                  className={clsx(
                    "px-2 py-0.5 rounded text-[10px] font-semibold backdrop-blur-md border",
                    telemetry.postureStatus === "UPRIGHT_CENTERED"
                      ? "bg-[#050505]/85 text-emerald-300 border-emerald-500/40"
                      : "bg-amber-950/90 text-amber-300 border-amber-500/50"
                  )}
                >
                  🧍 Posture: {telemetry.postureStatus.replace(/_/g, " ")}
                </span>

                <span
                  className={clsx(
                    "px-2 py-0.5 rounded text-[10px] font-semibold backdrop-blur-md border",
                    telemetry.handStatus === "HAND_TOUCHING_FACE" ||
                      telemetry.handStatus === "EXCESSIVE_FIDGETING"
                      ? "bg-amber-950/90 text-amber-300 border-amber-500/50"
                      : "bg-[#050505]/85 text-cyan-300 border-cyan-500/40"
                  )}
                >
                  🖐️ Hands ({telemetry.handsDetectedCount}):{" "}
                  {telemetry.handStatus.replace(/_/g, " ")}
                </span>
              </div>
            </>
          ) : (
            <div className="text-center p-6 space-y-3">
              <div className="text-3xl">📷</div>
              <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto leading-relaxed">
                Camera is paused. Turn on your camera for live MediaPipe 3D eye-contact, posture, lighting, and hand-gesture tracking.
              </p>
              <button
                type="button"
                onClick={() => void startWebcamStream()}
                className="px-4 py-2 rounded-xl bg-[#F5F5F5] hover:bg-[#E4E4E7] text-[#000000] font-bold text-xs cursor-pointer transition-colors"
              >
                📹 Enable Live Camera
              </button>
            </div>
          )}
        </div>

        {/* AI Bar-Raiser Active Question Card + 4-Metric CV Telemetry Bar (6 cols) */}
        <div className="md:col-span-6 rounded-2xl bg-[#080808] border border-[#1D1D1D] p-5 flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span
                  className={clsx(
                    "font-semibold flex items-center gap-1.5",
                    isAgentSpeaking ? "text-indigo-300" : "text-[#E4E4E7]"
                  )}
                >
                  {isAgentSpeaking && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  )}
                  {interviewerTitle}
                </span>
                {targetFileBadge && (
                  <>
                    <span className="text-[#52525B]">•</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {targetFileBadge}
                    </span>
                  </>
                )}
                <span className="text-[#52525B]">•</span>
                <span className="text-[11px] font-mono text-[#A1A1AA]">
                  {interviewerActionBadge}
                </span>
              </div>

              {onSpeakPrompt && (
                <button
                  type="button"
                  onClick={onSpeakPrompt}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-[11px] text-indigo-300 cursor-pointer transition-colors"
                >
                  🔊 Replay Audio
                </button>
              )}
            </div>

            <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#1D1D1D] text-sm text-[#F5F5F5] leading-relaxed whitespace-pre-wrap max-h-44 overflow-y-auto">
              {isAgentThinking
                ? "🤖 AI Bar-Raiser Agent is evaluating your response, checking technical claims, and formulating the next probe..."
                : currentPromptText}
            </div>
          </div>

          {/* 4-Metric Real-Time Computer Vision Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#1D1D1D] text-[11px]">
            <div className="p-2 rounded-lg bg-[#0D0D0D] border border-[#1D1D1D]">
              <div className="text-[#71717A] text-[10px]">👁️ Eye Contact</div>
              <div
                className={clsx(
                  "font-bold truncate",
                  telemetry.lookingAtCamera ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {telemetry.lookingAtCamera ? "Direct" : "Off-Lens"} ({telemetry.eyeContactScore}%)
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#0D0D0D] border border-[#1D1D1D]">
              <div className="text-[#71717A] text-[10px]">🧍 Posture</div>
              <div
                className={clsx(
                  "font-bold truncate",
                  telemetry.postureStatus === "UPRIGHT_CENTERED"
                    ? "text-emerald-400"
                    : "text-amber-400"
                )}
              >
                {telemetry.postureStatus === "UPRIGHT_CENTERED"
                  ? "Upright"
                  : telemetry.postureStatus.replace(/_/g, " ")}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#0D0D0D] border border-[#1D1D1D]">
              <div className="text-[#71717A] text-[10px]">🖐️ Hands</div>
              <div
                className={clsx(
                  "font-bold truncate",
                  telemetry.handStatus === "HAND_TOUCHING_FACE" ||
                    telemetry.handStatus === "EXCESSIVE_FIDGETING"
                    ? "text-amber-400"
                    : "text-cyan-400"
                )}
              >
                {telemetry.handStatus === "NO_HANDS_VISIBLE"
                  ? "Calm / Down"
                  : telemetry.handStatus.replace(/_/g, " ")}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#0D0D0D] border border-[#1D1D1D]">
              <div className="text-[#71717A] text-[10px]">💡 Lighting</div>
              <div
                className={clsx(
                  "font-bold truncate",
                  telemetry.lightingStatus === "OPTIMAL"
                    ? "text-emerald-400"
                    : "text-amber-400"
                )}
              >
                {telemetry.lightingStatus === "OPTIMAL"
                  ? `Optimal (${telemetry.lightingPct}%)`
                  : telemetry.lightingStatus === "DIM_LIGHT"
                  ? `Low (${telemetry.lightingPct}%)`
                  : `Glare (${telemetry.lightingPct}%)`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

