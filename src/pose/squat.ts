import type { Calibration } from "../domain/types";
import { LM, clipped, imagePoint, isFrontal, jointAngle, meanVis, minVis, torsoLeanDeg } from "./geometry";
import { MovementAnalyzer } from "./machine";
import type { PoseFrame } from "./types";

function bands(depth: Calibration["depth"]) {
  if (depth === "easier") return { start: 150, end: 132, band: 10 };
  if (depth === "deeper") return { start: 162, end: 96, band: 14 };
  return { start: 158, end: 114, band: 13 };
}

export class SquatAnalyzer extends MovementAnalyzer {
  private maxLean: number | null = null;
  private leanKnown = false;
  private worstDrift = 0;
  private driftKnown = false;

  constructor() {
    super("squats");
  }

  override reset(): void {
    super.reset();
    this.maxLean = null;
    this.leanKnown = false;
    this.worstDrift = 0;
    this.driftKnown = false;
  }

  protected onFrame(frame: PoseFrame, cal: Calibration): void {
    const min = cal.minVisibility;
    const left = [LM.lHip, LM.lKnee, LM.lAnkle];
    const right = [LM.rHip, LM.rKnee, LM.rAnkle];
    const leftOk = minVis(frame, left) >= min;
    const rightOk = minVis(frame, right) >= min;
    if (!leftOk && !rightOk) {
      this.markUnable(
        frame,
        "Camera cannot see your hips, knees, and ankles. Step back and turn slightly sideways.",
        Math.max(meanVis(frame, left), meanVis(frame, right)),
        ["legs"],
      );
      return;
    }
    const useLeft = leftOk && (!rightOk || meanVis(frame, left) >= meanVis(frame, right));
    const [hip, knee, ankle] = useLeft ? left : right;
    const shoulder = useLeft ? LM.lShoulder : LM.rShoulder;
    const kneeAngle = jointAngle(frame, hip, knee, ankle, min);
    if (kneeAngle == null) {
      this.markUnable(frame, "Camera cannot see your full body.", meanVis(frame, [hip, knee, ankle]), ["leg"]);
      return;
    }
    const kneeSmooth = this.smooth("knee", kneeAngle, cal.smoothAlpha);
    const hipPoint = imagePoint(frame, hip, min);
    const shoulderPoint = imagePoint(frame, shoulder, min);
    let lean: number | null = null;
    if (hipPoint && shoulderPoint) {
      const raw = torsoLeanDeg(hipPoint, shoulderPoint);
      if (Number.isFinite(raw)) lean = this.smooth("lean", raw, cal.smoothAlpha);
    }

    let drift: number | null = null;
    const frontal = isFrontal(frame, min);
    if (frontal) {
      const pairs: [number, number][] = [
        [LM.lKnee, LM.lAnkle],
        [LM.rKnee, LM.rAnkle],
      ];
      const offsets = pairs.flatMap(([k, a]) => {
        const kp = imagePoint(frame, k, min);
        const ap = imagePoint(frame, a, min);
        return kp && ap ? [Math.abs(kp.x - ap.x)] : [];
      });
      if (offsets.length === 2) drift = Math.max(...offsets);
    }

    this.track(meanVis(frame, [hip, knee, ankle]), cal);
    if (clipped(frame, [hip, knee, ankle, shoulder], min)) {
      this.cues.push("Step back so your head and feet stay in frame.");
    }
    this.metrics.push({ label: "Knee", value: `${Math.round(kneeSmooth)}°` });
    this.metrics.push({ label: "Torso", value: lean == null ? "Unable to assess" : `${Math.round(lean)}°` });
    if (frontal === false) this.cues.push("A side or three-quarter view reads squat depth more reliably.");

    const moving = this.cycle.phase === "toward" || this.cycle.phase === "end" || this.cycle.phase === "back";
    if (moving) {
      if (lean != null) {
        this.leanKnown = true;
        this.maxLean = this.maxLean == null ? lean : Math.max(this.maxLean, lean);
      }
      if (drift != null) {
        this.driftKnown = true;
        this.worstDrift = Math.max(this.worstDrift, drift);
      }
    }

    if (drift != null && drift > 0.08 && (this.cycle.phase === "toward" || this.cycle.phase === "end")) {
      this.cues.push("Knees appear to drift off the ankles. One camera can only estimate this.");
    }

    const { start, end, band } = bands(cal.depth);
    const frames = cal.stableFrames;
    this.stepCycle({
      now: frame.timestamp,
      cal,
      atStart: this.latch("start", kneeSmooth >= start, frames),
      leavingStart: this.latch("leaveStart", kneeSmooth <= start - band, frames),
      atEnd: this.latch("end", kneeSmooth <= end, frames),
      leavingEnd: this.latch("leaveEnd", kneeSmooth >= end + band, frames),
      labels: { start: "Standing", toward: "Descending", end: "Bottom", back: "Ascending" },
      coaching: {
        setup: "Stand where the camera can see your hips and feet.",
        start: "Begin lowering into your squat.",
        toward: "Reach your target depth comfortably.",
        end: "Stand up fully to complete the repetition.",
        back: "Stand up fully to complete the repetition.",
        partial: "Reach your target depth comfortably.",
      },
      onRepStart: () => {
        this.maxLean = lean;
        this.leanKnown = lean != null;
        this.worstDrift = drift ?? 0;
        this.driftKnown = drift != null;
      },
      assess: () => {
        const issues: string[] = [];
        let score = 100;
        if (this.leanKnown && this.maxLean != null && this.maxLean > 58) {
          score -= 15;
          issues.push("Your chest folded forward. Stay as tall as is comfortable.");
        }
        if (this.driftKnown && this.worstDrift > 0.11) {
          score -= 18;
          issues.push("Keep your knees aligned with your feet.");
        }
        const tempo = frame.timestamp - this.cycle.startedAt;
        if (tempo > 0 && tempo < 400) {
          score -= 10;
          issues.push("Slow the movement slightly.");
        }
        const note = this.driftKnown ? undefined : "Knee alignment was not assessed from this angle.";
        return { issues, score, note };
      },
    });
  }
}
