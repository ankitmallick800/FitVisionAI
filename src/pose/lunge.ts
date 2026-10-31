import type { Calibration } from "../domain/types";
import { LM, imagePoint, jointAngle, meanVis, minVis, torsoLeanDeg } from "./geometry";
import { MovementAnalyzer } from "./machine";
import type { PoseFrame } from "./types";

function bands(depth: Calibration["depth"]) {
  if (depth === "easier") return { start: 150, end: 128, band: 10 };
  if (depth === "deeper") return { start: 162, end: 96, band: 14 };
  return { start: 158, end: 112, band: 12 };
}

export class LungeAnalyzer extends MovementAnalyzer {
  private lead: "left" | "right" | null = null;
  private maxLean: number | null = null;

  constructor() {
    super("lunges");
  }

  override reset(): void {
    super.reset();
    this.lead = null;
    this.maxLean = null;
  }

  protected onFrame(frame: PoseFrame, cal: Calibration): void {
    const min = cal.minVisibility;
    const leftIds = [LM.lHip, LM.lKnee, LM.lAnkle];
    const rightIds = [LM.rHip, LM.rKnee, LM.rAnkle];
    if (minVis(frame, leftIds) < min || minVis(frame, rightIds) < min) {
      this.markUnable(
        frame,
        "Camera cannot see both legs. Step back and turn slightly so each knee is visible.",
        Math.min(meanVis(frame, leftIds), meanVis(frame, rightIds)),
        ["both legs"],
      );
      return;
    }
    const left = jointAngle(frame, LM.lHip, LM.lKnee, LM.lAnkle, min);
    const right = jointAngle(frame, LM.rHip, LM.rKnee, LM.rAnkle, min);
    if (left == null || right == null) {
      this.markUnable(frame, "Unable to assess the lunge from these landmarks.", meanVis(frame, [...leftIds, ...rightIds]), ["knees"]);
      return;
    }
    const leftSmooth = this.smooth("lk", left, cal.smoothAlpha);
    const rightSmooth = this.smooth("rk", right, cal.smoothAlpha);
    const leadAngle = Math.min(leftSmooth, rightSmooth);
    const diff = Math.abs(leftSmooth - rightSmooth);
    const hip = imagePoint(frame, LM.lHip, min) ?? imagePoint(frame, LM.rHip, min);
    const shoulder = imagePoint(frame, LM.lShoulder, min) ?? imagePoint(frame, LM.rShoulder, min);
    let lean: number | null = null;
    if (hip && shoulder) {
      const raw = torsoLeanDeg(hip, shoulder);
      if (Number.isFinite(raw)) lean = this.smooth("lean", raw, cal.smoothAlpha);
    }

    this.track(meanVis(frame, [...leftIds, ...rightIds]), cal);
    this.metrics.push({ label: "Lead knee", value: `${Math.round(leadAngle)}°` });
    this.metrics.push({ label: "Knee difference", value: `${Math.round(diff)}°` });
    this.metrics.push({ label: "Left reps", value: String(this.leftReps) });
    this.metrics.push({ label: "Right reps", value: String(this.rightReps) });

    const moving = this.cycle.phase === "toward" || this.cycle.phase === "end" || this.cycle.phase === "back";
    if (moving && lean != null) this.maxLean = this.maxLean == null ? lean : Math.max(this.maxLean, lean);

    const { start, end, band } = bands(cal.depth);
    const frames = cal.stableFrames;
    const symmetric = diff < 16 && leadAngle < start - band;
    if (symmetric && this.cycle.phase === "toward") {
      this.cues.push("This looks symmetrical, more like a squat. Step one foot forward.");
    }

    const atEnd = this.latch("end", leadAngle <= end && diff >= 16, frames);
    if (atEnd && this.cycle.phase === "toward") {
      this.lead = leftSmooth <= rightSmooth ? "left" : "right";
    }

    const result = this.stepCycle({
      now: frame.timestamp,
      cal,
      atStart: this.latch("start", leftSmooth >= start && rightSmooth >= start, frames),
      leavingStart: this.latch("leaveStart", leadAngle <= start - band, frames),
      atEnd,
      leavingEnd: this.latch("leaveEnd", leadAngle >= end + band, frames),
      labels: { start: "Standing", toward: "Stepping", end: "Bottom", back: "Returning" },
      coaching: {
        setup: "Stand tall with both legs visible.",
        start: "Step one foot forward and lower with control.",
        toward: "Bend the front knee through a comfortable range.",
        end: "Push back to standing to complete the repetition.",
        back: "Stand tall on both legs to complete the repetition.",
        partial: "Lower a little further on one leg, then return to standing.",
      },
      onRepStart: () => {
        this.maxLean = lean;
        this.lead = null;
      },
      assess: () => {
        const issues: string[] = [];
        let score = 100;
        if (this.maxLean != null && this.maxLean > 48) {
          score -= 15;
          issues.push("Keep your torso tall if that is comfortable.");
        }
        return { issues, score };
      },
    });

    if (result === "counted" && this.lead) {
      if (this.lead === "left") this.leftReps += 1;
      else this.rightReps += 1;
    }
  }
}
