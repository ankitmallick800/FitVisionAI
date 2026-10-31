import type { Calibration } from "../domain/types";
import { LM, imagePoint, jointAngle, meanVis, minVis, torsoLeanDeg } from "./geometry";
import { MovementAnalyzer } from "./machine";
import type { PoseFrame } from "./types";

const ARMS = [
  { side: "left" as const, shoulder: LM.lShoulder, elbow: LM.lElbow, wrist: LM.lWrist, hip: LM.lHip },
  { side: "right" as const, shoulder: LM.rShoulder, elbow: LM.rElbow, wrist: LM.rWrist, hip: LM.rHip },
];

function curlEnd(depth: Calibration["depth"]): number {
  if (depth === "easier") return 78;
  if (depth === "deeper") return 45;
  return 58;
}

export class CurlAnalyzer extends MovementAnalyzer {
  private baseLean: number | null = null;
  private maxDev = 0;
  private leanKnown = false;

  constructor() {
    super("bicep-curls");
  }

  override reset(): void {
    super.reset();
    this.baseLean = null;
    this.maxDev = 0;
    this.leanKnown = false;
  }

  protected onFrame(frame: PoseFrame, cal: Calibration): void {
    const min = cal.minVisibility;
    const visible = ARMS.filter((arm) => minVis(frame, [arm.shoulder, arm.elbow, arm.wrist]) >= min);
    if (!visible.length) {
      this.markUnable(
        frame,
        "Camera cannot see an elbow and wrist. Face the camera and keep your arms in frame.",
        Math.max(...ARMS.map((arm) => meanVis(frame, [arm.shoulder, arm.elbow, arm.wrist]))),
        ["arms"],
      );
      return;
    }
    const angles = visible.flatMap((arm) => {
      const angle = jointAngle(frame, arm.shoulder, arm.elbow, arm.wrist, min);
      return angle == null ? [] : [angle];
    });
    if (!angles.length) {
      this.markUnable(frame, "Unable to assess the curl from these landmarks.", 0.4, ["elbow"]);
      return;
    }
    const elbow = this.smooth(
      "elbow",
      angles.reduce((sum, angle) => sum + angle, 0) / angles.length,
      cal.smoothAlpha,
    );
    const arm = visible[0];
    const hip = imagePoint(frame, arm.hip, min);
    const shoulder = imagePoint(frame, arm.shoulder, min);
    let lean: number | null = null;
    if (hip && shoulder) {
      const raw = torsoLeanDeg(hip, shoulder);
      if (Number.isFinite(raw)) lean = this.smooth("lean", raw, cal.smoothAlpha);
    }

    this.track(meanVis(frame, [arm.shoulder, arm.elbow, arm.wrist]), cal);
    if (visible.length === 1) this.cues.push("Only one arm is clear. That arm is being counted.");
    this.metrics.push({ label: "Elbow", value: `${Math.round(elbow)}°` });
    this.metrics.push({ label: "Torso", value: lean == null ? "Unable to assess" : `${Math.round(lean)}°` });

    const moving = this.cycle.phase === "toward" || this.cycle.phase === "end" || this.cycle.phase === "back";
    if (moving && lean != null && this.baseLean != null) {
      this.maxDev = Math.max(this.maxDev, Math.abs(lean - this.baseLean));
    }

    const end = curlEnd(cal.depth);
    const frames = cal.stableFrames;
    this.stepCycle({
      now: frame.timestamp,
      cal,
      atStart: this.latch("start", elbow >= 150, frames),
      leavingStart: this.latch("leaveStart", elbow <= 136, frames),
      atEnd: this.latch("end", elbow <= end, frames),
      leavingEnd: this.latch("leaveEnd", elbow >= end + 18, frames),
      labels: { start: "Long arm", toward: "Curling", end: "Top", back: "Lowering" },
      coaching: {
        setup: "Start with your arm long and your elbow near your side.",
        start: "Curl toward your shoulder.",
        toward: "Keep curling through a comfortable range.",
        end: "Lower with control to complete the repetition.",
        back: "Straighten the arm to complete the repetition.",
        partial: "That curl stopped short. Bring the hand a little higher, then lower it.",
      },
      onRepStart: () => {
        this.baseLean = lean;
        this.leanKnown = lean != null;
        this.maxDev = 0;
      },
      assess: () => {
        const issues: string[] = [];
        let score = 100;
        if (this.leanKnown && this.maxDev > 20) {
          score -= 20;
          issues.push("Reduce swinging your torso.");
        }
        const note = this.leanKnown ? undefined : "Torso movement was not assessed.";
        return { issues, score, note };
      },
    });
  }
}
