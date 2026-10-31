import type { Calibration } from "../domain/types";
import { LM, clipped, imagePoint, isFrontal, jointAngle, meanVis, minVis, torsoLeanDeg } from "./geometry";
import { MovementAnalyzer } from "./machine";
import type { PoseFrame } from "./types";

function topLean(depth: Calibration["depth"]): number {
  if (depth === "easier") return 58;
  if (depth === "deeper") return 34;
  return 45;
}

export class SitupAnalyzer extends MovementAnalyzer {
  private bestUp = 90;

  constructor() {
    super("sit-ups");
  }

  override reset(): void {
    super.reset();
    this.bestUp = 90;
  }

  protected onFrame(frame: PoseFrame, cal: Calibration): void {
    const min = cal.minVisibility;
    const chains = [
      [LM.lShoulder, LM.lHip, LM.lKnee],
      [LM.rShoulder, LM.rHip, LM.rKnee],
    ];
    const scored = chains
      .map((ids) => ({ ids, ok: minVis(frame, ids) >= min, mean: meanVis(frame, ids) }))
      .sort((a, b) => b.mean - a.mean);
    const chosen = scored.find((item) => item.ok);
    if (!chosen) {
      this.markUnable(
        frame,
        "Camera cannot see your shoulder, hip, and knee. Lie sideways to the camera.",
        scored[0]?.mean ?? 0,
        ["trunk"],
      );
      return;
    }
    const [shoulder, hip, knee] = chosen.ids;
    const hipPoint = imagePoint(frame, hip, min);
    const shoulderPoint = imagePoint(frame, shoulder, min);
    if (!hipPoint || !shoulderPoint) {
      this.markUnable(frame, "Camera cannot see your full body.", chosen.mean, ["trunk"]);
      return;
    }
    const leanRaw = torsoLeanDeg(hipPoint, shoulderPoint);
    if (!Number.isFinite(leanRaw)) {
      this.markUnable(frame, "Unable to assess the sit-up from this frame.", chosen.mean, ["trunk"]);
      return;
    }
    const lean = this.smooth("lean", leanRaw, cal.smoothAlpha);
    const ankle = shoulder === LM.lShoulder ? LM.lAnkle : LM.rAnkle;
    const kneeAngle = jointAngle(frame, hip, knee, ankle, min);
    this.track(chosen.mean, cal);
    if (clipped(frame, [shoulder, hip, knee], min)) this.cues.push("Move back so your knees and shoulders stay in frame.");
    if (isFrontal(frame, min) === true) {
      this.cues.push("Turn onto your side. A front view hides how far the trunk actually moves.");
    }
    const idle = this.cycle.phase === "setup" || this.cycle.phase === "start";
    if (idle && lean < 25 && kneeAngle != null && kneeAngle > 160) {
      this.feedback = "Lie on your back with your knees bent and your side toward the camera.";
      this.tone = "neutral";
      this.phaseLabel = "Set up";
      this.metrics.push({ label: "Trunk", value: `${Math.round(lean)}° from upright` });
      return;
    }

    this.metrics.push({ label: "Trunk", value: `${Math.round(lean)}° from upright` });
    const moving = this.cycle.phase === "toward" || this.cycle.phase === "end" || this.cycle.phase === "back";
    if (moving) this.bestUp = Math.min(this.bestUp, lean);

    const up = topLean(cal.depth);
    const frames = cal.stableFrames;
    // Lying is a large lean. Sitting up is a smaller lean. The cycle's "end" is the raised position.
    this.stepCycle({
      now: frame.timestamp,
      cal,
      atStart: this.latch("start", lean >= 74, frames),
      leavingStart: this.latch("leaveStart", lean <= 66, frames),
      atEnd: this.latch("end", lean <= up, frames),
      leavingEnd: this.latch("leaveEnd", lean >= up + 12, frames),
      labels: { start: "Down", toward: "Rising", end: "Up", back: "Lowering" },
      coaching: {
        setup: "Lie back until your trunk is down and the camera sees a side view.",
        start: "Begin the upward movement.",
        toward: "Move through a comfortable range of motion.",
        end: "Return to your starting position.",
        back: "Return to your starting position.",
        partial: "Move through a comfortable range of motion.",
      },
      onRepStart: () => {
        this.bestUp = lean;
      },
      assess: () => {
        const issues: string[] = [];
        let score = 100;
        if (this.bestUp > up + 8) {
          score -= 20;
          issues.push("Move through a comfortable range of motion.");
        }
        return { issues, score };
      },
    });
  }
}
