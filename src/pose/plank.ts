import type { Calibration } from "../domain/types";
import { LM, jointAngle, meanVis, minVis, torsoLeanDeg, imagePoint } from "./geometry";
import { MovementAnalyzer } from "./machine";
import type { PoseFrame } from "./types";

function alignThreshold(depth: Calibration["depth"]): number {
  if (depth === "easier") return 146;
  if (depth === "deeper") return 168;
  return 158;
}

export class PlankAnalyzer extends MovementAnalyzer {
  private holding = false;
  private broke = false;
  private lastTs: number | null = null;
  private lastSample = 0;

  constructor() {
    super("planks");
  }

  override reset(): void {
    super.reset();
    this.holding = false;
    this.broke = false;
    this.lastTs = null;
    this.lastSample = 0;
  }

  protected onFrame(frame: PoseFrame, cal: Calibration): void {
    const min = cal.minVisibility;
    const sides = [
      [LM.lShoulder, LM.lElbow, LM.lWrist, LM.lHip, LM.lKnee, LM.lAnkle],
      [LM.rShoulder, LM.rElbow, LM.rWrist, LM.rHip, LM.rKnee, LM.rAnkle],
    ];
    const ranked = sides
      .map((ids) => ({ ids, mean: meanVis(frame, ids.slice(0, 4)), armOk: minVis(frame, ids.slice(0, 3)) >= min }))
      .sort((a, b) => b.mean - a.mean);
    const side = ranked.find((item) => item.armOk);
    if (!side) {
      this.pauseOrUnable(frame, "Camera cannot see your full body. Turn sideways and include your shoulders, hips, and feet.", ranked[0]?.mean ?? 0);
      return;
    }
    const [shoulder, elbow, wrist, hip, knee, ankle] = side.ids;
    const elbowAngle = jointAngle(frame, shoulder, elbow, wrist, min);
    const kneeAngle = jointAngle(frame, hip, knee, ankle, min);
    const align =
      kneeAngle != null && kneeAngle < 130
        ? jointAngle(frame, shoulder, hip, knee, min)
        : jointAngle(frame, shoulder, hip, ankle, min);
    const hipPt = imagePoint(frame, hip, min);
    const shoulderPt = imagePoint(frame, shoulder, min);
    const lean = hipPt && shoulderPt ? torsoLeanDeg(hipPt, shoulderPt) : Number.NaN;

    if (elbowAngle == null || align == null || !Number.isFinite(lean)) {
      this.pauseOrUnable(frame, "Camera cannot see your full body.", side.mean);
      return;
    }

    const elbowSmooth = this.smooth("elbow", elbowAngle, cal.smoothAlpha);
    const alignSmooth = this.smooth("align", align, cal.smoothAlpha);
    const straight = elbowSmooth >= 145;
    const forearm = elbowSmooth <= 115;
    const horizontal = lean >= 55;
    const aligned = alignSmooth >= alignThreshold(cal.depth);
    const stableShape = aligned && horizontal && (straight || forearm);

    this.track(side.mean, cal);
    this.metrics.push({ label: "Body line", value: `${Math.round(alignSmooth)}°` });
    this.metrics.push({ label: "Hold", value: `${Math.floor(this.holdMs / 1000)}s` });
    if (kneeAngle != null && kneeAngle < 130) this.cues.push("Knee plank variation. The timer runs when the line is steady.");

    if (stableShape) {
      this.broke = false;
      const ready = this.latch("plank", true, cal.stableFrames);
      if (!this.holding) {
        if (!ready) {
          this.feedback = "Hold a straight line to start the timer.";
          this.tone = "neutral";
          this.phase = "setup";
          this.phaseLabel = "Set up";
          this.lastTs = frame.timestamp;
          return;
        }
        this.holding = true;
        this.lastTs = frame.timestamp;
      }
      const dt = Math.min(500, Math.max(0, frame.timestamp - (this.lastTs ?? frame.timestamp)));
      this.holdMs += dt;
      this.lastTs = frame.timestamp;
      this.feedback = "Holding. Stay long through the body.";
      this.tone = "good";
      this.phase = "holding";
      this.phaseLabel = "Holding";
      if (this.holdMs - this.lastSample >= 1000) {
        this.lastSample = this.holdMs;
        const score = alignSmooth >= 170 ? 100 : alignSmooth >= 160 ? 88 : 74;
        this.scores.push(score);
      }
      return;
    }

    this.holds.set("plank", 0);
    this.lastTs = frame.timestamp;
    if (this.holding || this.broke) {
      this.holding = false;
      this.broke = true;
      this.feedback = aligned
        ? "Timer paused. Set the plank sideways to the camera to continue."
        : "Timer paused. Rebuild a straight line to continue.";
      this.tone = "warn";
      this.phase = "paused";
      this.phaseLabel = "Paused";
      return;
    }
    this.feedback = horizontal
      ? "Set your shoulders, hips, and ankles in one line."
      : "Turn sideways and hold a plank. Standing will not start the timer.";
    this.tone = "neutral";
    this.phase = "setup";
    this.phaseLabel = "Set up";
  }

  private pauseOrUnable(frame: PoseFrame, message: string, visibility: number): void {
    this.lastTs = frame.timestamp;
    if (this.holding) {
      this.holding = false;
      this.holds.set("plank", 0);
      this.feedback = `Timer paused. ${message}`;
      this.tone = "unable";
      this.phase = "paused";
      this.phaseLabel = "Unable to assess";
      this.visibility = visibility;
      this.status = "partial";
      this.unableReasons = ["body line"];
      return;
    }
    this.markUnable(frame, message, visibility, ["body line"]);
  }
}
