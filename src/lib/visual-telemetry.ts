/**
 * Real-Time Visual Telemetry & Gaze / Posture Tracking Engine
 *
 * Runs client-side at ~10 FPS against HTMLVideoElement:
 * 1. Face Presence & Segmentation (Skin-tone / Foreground Luminance)
 * 2. Head Yaw (Bilateral Symmetry - Left/Right turn)
 * 3. Head Pitch (Vertical balance - Looking down at notes/phone)
 * 4. Posture Stability (Rolling 15-frame window centroid variance)
 * 5. Smooth Eye Contact EMA with live HUD guidance toasts & reticle state
 */

export type VisualPostureState =
  | "Calibrating..."
  | "Stable"
  | "Off-Center"
  | "Shifting"
  | "No Face Detected";

export interface VisualTelemetryFrame {
  faceDetected: boolean;
  instantEyeScore: number;
  smoothEyeContactPct: number;
  posture: VisualPostureState;
  yawScore: number;
  pitchScore: number;
  symmetryScore: number;
  centroid: { x: number; y: number };
  hudToast: string | null;
  hudStatusColor: "green" | "amber" | "rose";
}

function clamp(val: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(val)));
}

export class VisualTelemetryAnalyzer {
  private offscreen: HTMLCanvasElement | null = null;
  private offCtx: CanvasRenderingContext2D | null = null;
  private centroidHistory: Array<{ x: number; y: number }> = [];
  private frameCount = 0;
  private smoothEyeContact = 85;
  private readonly maxHistory = 15;
  private readonly width = 64;
  private readonly height = 48;

  constructor() {
    if (typeof document !== "undefined") {
      this.offscreen = document.createElement("canvas");
      this.offscreen.width = this.width;
      this.offscreen.height = this.height;
      this.offCtx = this.offscreen.getContext("2d", { willReadFrequently: true });
    }
  }

  public reset(): void {
    this.centroidHistory = [];
    this.frameCount = 0;
    this.smoothEyeContact = 85;
  }

  public analyzeFrame(video: HTMLVideoElement | null): VisualTelemetryFrame {
    if (!video || !this.offCtx || !this.offscreen || video.readyState < 2) {
      return {
        faceDetected: false,
        instantEyeScore: 0,
        smoothEyeContactPct: clamp(this.smoothEyeContact * 0.9),
        posture: "No Face Detected",
        yawScore: 0,
        pitchScore: 0,
        symmetryScore: 0,
        centroid: { x: 0.5, y: 0.5 },
        hudToast: "Camera feed initializing...",
        hudStatusColor: "rose",
      };
    }

    const { width, height } = this;
    this.offCtx.drawImage(video, 0, 0, width, height);
    const frame = this.offCtx.getImageData(0, 0, width, height);
    const data = frame.data;

    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    // Segment human skin/facial foreground
    // RGB rules: R > 45, G > 30, B > 20, R > G, R > B, R - G > 10, luminance in 35..235
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        const isSkinTone =
          r > 45 &&
          g > 30 &&
          b > 20 &&
          r > g &&
          r > b &&
          r - g > 10 &&
          Math.abs(r - g) > 12 &&
          lum > 35 &&
          lum < 235;

        if (isSkinTone) {
          const weight = lum;
          totalWeight += weight;
          weightedX += x * weight;
          weightedY += y * weight;

          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Zero or near-zero face pixels detected
    if (totalWeight < 600 || maxX <= minX || maxY <= minY) {
      this.frameCount++;
      // Actively decay eye contact EMA toward 0
      this.smoothEyeContact = clamp(Math.round(this.smoothEyeContact * 0.70));
      if (this.smoothEyeContact < 6) this.smoothEyeContact = 0;

      return {
        faceDetected: false,
        instantEyeScore: 0,
        smoothEyeContactPct: this.smoothEyeContact,
        posture: "No Face Detected",
        yawScore: 0,
        pitchScore: 0,
        symmetryScore: 0,
        centroid: { x: 0.5, y: 0.5 },
        hudToast: "⚠️ Position face in frame",
        hudStatusColor: "rose",
      };
    }

    this.frameCount++;

    // Normalized centroid [0..1]
    const rawCx = weightedX / totalWeight;
    const rawCy = weightedY / totalWeight;
    const cx = rawCx / width;
    const cy = rawCy / height;

    // Bilateral Symmetry (Head Yaw: Left vs Right turn)
    let leftMass = 0;
    let rightMass = 0;
    for (let y = minY; y <= maxY; y += 2) {
      for (let x = minX; x <= maxX; x += 2) {
        const idx = (y * width + x) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (lum > 35) {
          if (x < rawCx) leftMass += lum;
          else rightMass += lum;
        }
      }
    }

    const totalBilateral = leftMass + rightMass;
    const asymmetry = totalBilateral > 0 ? Math.abs(leftMass - rightMass) / totalBilateral : 0;
    const symmetryScore = clamp(100 - asymmetry * 220);

    // Yaw score: drops when user looks left or right away from lens
    const yawScore = clamp(100 - asymmetry * 260);

    // Pitch score: drops when user tilts head down (looking at phone/notes) or back
    // Target vertical center is typically ~0.40 - 0.55
    const pitchDeviation = Math.abs(cy - 0.46);
    const pitchScore = clamp(100 - pitchDeviation * 230);

    // Instant Eye Score (looking straight at camera yields 90-100)
    let instantEyeScore = clamp(
      yawScore * 0.55 + pitchScore * 0.30 + symmetryScore * 0.15
    );

    // Off-center penalty
    if (cx < 0.28 || cx > 0.72) {
      instantEyeScore = clamp(instantEyeScore - 25);
    }
    if (cy < 0.22 || cy > 0.78) {
      instantEyeScore = clamp(instantEyeScore - 20);
    }

    // Heavy penalty if head turned away (yawScore < 45)
    if (yawScore < 45) {
      instantEyeScore = Math.min(instantEyeScore, 30);
    }

    // 12-Frame Rolling Exponential Moving Average: ema = 0.78 * prev + 0.22 * currentFrameScore
    if (this.frameCount <= 2) {
      this.smoothEyeContact = instantEyeScore;
    } else {
      this.smoothEyeContact = clamp(
        Math.round(this.smoothEyeContact * 0.78 + instantEyeScore * 0.22)
      );
    }

    // Posture state & history
    this.centroidHistory.push({ x: cx, y: cy });
    if (this.centroidHistory.length > this.maxHistory) {
      this.centroidHistory.shift();
    }

    let posture: VisualPostureState = "Stable";
    if (this.frameCount <= 5) {
      posture = "Calibrating...";
    } else if (cx < 0.28 || cx > 0.72 || cy < 0.22 || cy > 0.78) {
      posture = "Off-Center";
    } else {
      // Calculate variance / motion standard deviation across centroid history
      const n = this.centroidHistory.length;
      if (n >= 6) {
        const meanX = this.centroidHistory.reduce((acc, p) => acc + p.x, 0) / n;
        const meanY = this.centroidHistory.reduce((acc, p) => acc + p.y, 0) / n;
        let variance = 0;
        for (const p of this.centroidHistory) {
          variance += Math.hypot(p.x - meanX, p.y - meanY) ** 2;
        }
        const stdDev = Math.sqrt(variance / n);
        if (stdDev > 0.042) {
          posture = "Shifting";
        } else {
          posture = "Stable";
        }
      }
    }

    // HUD Status Color & Toast
    let hudStatusColor: "green" | "amber" | "rose" = "green";
    let hudToast: string | null = null;

    if (posture === "Off-Center") {
      hudStatusColor = "amber";
      hudToast = "⚠️ Center yourself in frame";
    } else if (posture === "Shifting") {
      hudStatusColor = "amber";
      hudToast = "⚠️ Keep your posture steady";
    } else if (this.smoothEyeContact < 55) {
      hudStatusColor = "amber";
      hudToast = "⚠️ Look toward the camera lens";
    } else {
      hudStatusColor = "green";
      hudToast = "✓ Good Eye Contact & Framing";
    }

    return {
      faceDetected: true,
      instantEyeScore,
      smoothEyeContactPct: this.smoothEyeContact,
      posture,
      yawScore,
      pitchScore,
      symmetryScore,
      centroid: { x: cx, y: cy },
      hudToast,
      hudStatusColor,
    };
  }
}

