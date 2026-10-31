import type { Calibration } from "../domain/types";
import { LM, imagePoint, jointAngle, meanVis, minVis, torsoLeanDeg } from "./geometry";
import { MovementAnalyzer } from "./machine";
import type { Landmark, PoseFrame } from "./types";

const ARMS = [
  { shoulder: LM.lShoulder, elbow: LM.lElbow, wrist: LM.lWrist, hip: LM.lHip },
  { shoulder: LM.rShoulder, elbow: LM.rElbow, wrist: LM.rWrist, hip: LM.rHip },
];

function lockAngle(depth: Calibration["depth"]): number {
  if (depth === "easier") return 145;
  if (depth === "deeper") return 165;
  return 156;
}

interface VisibleArm {
  elbow: number;
  wrist: number;
  shoulder: number;
  hip: number;
  angle: number;
  shoulderPt: Landmark;
  wristPt: Landmark;
  hipPt: Landmark | null;
}

export class PressAnalyzer extends MovementAnalyzer {
  private baseLean: number | null = null;
  private maxDev = 0;
  private leanKnown = false;

  constructor() {
    super("shoulder-press");
  }

  override reset(): void {
    super.reset();
    this.baseLean = null;
    this.maxDev = 0;
    this.leanKnown = false;
  }

  protected onFrame(frame: PoseFrame, cal: Calibration): void {
    const min = cal.minVisibility;
    const visible: VisibleArm[] = [];
    for (const arm of ARMS) {
      if (minVis(frame, [arm.shoulder, arm.elbow, arm.wrist]) < min) continue;
      const angle = jointAngle(frame, arm.shoulder, arm.elbow, arm.wrist, min);
      const shoulderPt = imagePoint(frame, arm.shoulder, min);
      const wristPt = imagePoint(frame, arm.wrist, min);
      if (angle == null || !shoulderPt || !wristPt) continue;
      visible.push({
        ...arm,
        angle,
        shoulderPt,
        wristPt,
        hipPt: imagePoint(frame, arm.hip, min),
      });
    }
    if (!visible.length) {
      this.markUnable(
        frame,
        "Camera cannot see your shoulders and hands. Face the camera with your arms in frame.",
        Math.max(...ARMS.map((arm) => meanVis(frame, [arm.shoulder, arm.elbow, arm.wrist]))),
        ["arms"],
      );
      return;
    }

    const elbow = this.smooth(
      "elbow",
      visible.reduce((sum, arm) => sum + arm.angle, 0) / visible.length,
      cal.smoothAlpha,
    );
    const wristsAbove = visible.every((arm) => arm.wristPt.y < arm.shoulderPt.y - 0.08);
    const wristsLow = visible.every((arm) => arm.wristPt.y > arm.shoulderPt.y - 0.02);
    const sample = visible[0];
    let lean: number | null = null;
    if (sample.hipPt) {
      const raw = torsoLeanDeg(sample.hipPt, sample.shoulderPt);
      if (Number.isFinite(raw)) lean = this.smooth("lean", raw, cal.smoothAlpha);
    }

    this.track(
      meanVis(
        frame,
        visible.flatMap((arm) => [arm.shoulder, arm.elbow, arm.wrist]),
      ),
      cal,
    );
    if (visible.length === 1) this.cues.push("Only one arm is clear. That arm is being counted.");
    this.metrics.push({ label: "Elbow", value: `${Math.round(elbow)}°` });
    this.metrics.push({ label: "Hands", value: wristsAbove ? "Overhead" : wristsLow ? "At shoulders" : "Moving" });

    const moving = this.cycle.phase === "toward" || this.cycle.phase === "end" || this.cycle.phase === "back";
    if (moving && lean != null && this.baseLean != null) {
      this.maxDev = Math.max(this.maxDev, Math.abs(lean - this.baseLean));
    }

    const lock = lockAngle(cal.depth);
    const frames = cal.stableFrames;
    const rising = visible.some((arm) => arm.wristPt.y < arm.shoulderPt.y - 0.05);
    this.stepCycle({
      now: frame.timestamp,
      cal,
      atStart: this.latch("start", elbow <= 118 && wristsLow, frames),
      leavingStart: this.latch("leaveStart", elbow >= 132 || rising, frames),
      atEnd: this.latch("end", elbow >= lock && wristsAbove, frames),
      leavingEnd: this.latch("leaveEnd", elbow <= lock - 14 || !wristsAbove, frames),
      labels: { start: "Rack", toward: "Pressing", end: "Overhead", back: "Lowering" },
      coaching: {
        setup: "Start with your hands near your shoulders.",
        start: "Press your hands up.",
        toward: "Finish with your hands above your shoulders.",
        end: "Lower the hands to your shoulders to complete the repetition.",
        back: "Bring the hands back to shoulder height.",
        partial: "Finish with your hands above your shoulders, then lower them.",
      },
      onRepStart: () => {
        this.baseLean = lean;
        this.leanKnown = lean != null;
        this.maxDev = 0;
      },
      assess: () => {
        const issues: string[] = [];
        let score = 100;
        if (this.leanKnown && this.maxDev > 22) {
          score -= 18;
          issues.push("Try to press without leaning the torso back.");
        }
        const note = this.leanKnown ? undefined : "Torso movement was not assessed.";
        return { issues, score, note };
      },
    });
  }
}
