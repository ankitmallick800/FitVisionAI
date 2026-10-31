import type { Calibration } from "../domain/types";
import { LM, clipped, hipDrop, imagePoint, jointAngle, meanVis, minVis, torsoLeanDeg } from "./geometry";
import { MovementAnalyzer } from "./machine";
import type { PoseFrame } from "./types";

const LEFT = [LM.lShoulder, LM.lElbow, LM.lWrist, LM.lHip, LM.lKnee, LM.lAnkle];
const RIGHT = [LM.rShoulder, LM.rElbow, LM.rWrist, LM.rHip, LM.rKnee, LM.rAnkle];

function bands(depth: Calibration["depth"]) {
  if (depth === "easier") return { start: 148, end: 125, band: 12 };
  if (depth === "deeper") return { start: 160, end: 82, band: 14 };
  return { start: 156, end: 102, band: 14 };
}

export class PushupAnalyzer extends MovementAnalyzer {
  private worstAlign: number | null = null;
  private alignKnown = false;
  private kneeling = false;

  constructor() {
    super("push-ups");
  }

  override reset(): void {
    super.reset();
    this.worstAlign = null;
    this.alignKnown = false;
    this.kneeling = false;
  }

  protected onFrame(frame: PoseFrame, cal: Calibration): void {
    const min = cal.minVisibility;
    const leftArm = [LM.lShoulder, LM.lElbow, LM.lWrist];
    const rightArm = [LM.rShoulder, LM.rElbow, LM.rWrist];
    const leftOk = minVis(frame, leftArm) >= min;
    const rightOk = minVis(frame, rightArm) >= min;
    if (!leftOk && !rightOk) {
      this.markUnable(
        frame,
        "Camera cannot see your full body. Turn sideways and include your shoulders, elbows, and hands.",
        Math.max(meanVis(frame, leftArm), meanVis(frame, rightArm)),
        ["arms"],
      );
      return;
    }
    const useLeft = leftOk && (!rightOk || meanVis(frame, leftArm) >= meanVis(frame, rightArm));
    const side = useLeft ? LEFT : RIGHT;
    const [shoulder, elbow, wrist, hip, knee, ankle] = side;
    const elbowAngle = jointAngle(frame, shoulder, elbow, wrist, min);
    if (elbowAngle == null) {
      this.markUnable(frame, "Camera cannot see your full body.", meanVis(frame, side.slice(0, 3)), ["arm"]);
      return;
    }
    const elbowSmooth = this.smooth("elbow", elbowAngle, cal.smoothAlpha);
    const { start, end, band } = bands(cal.depth);
    const frames = cal.stableFrames;

    let align: number | null = null;
    const kneeAngle = jointAngle(frame, hip, knee, ankle, min);
    const horizontal = (() => {
      const s = imagePoint(frame, shoulder, min);
      const h = imagePoint(frame, hip, min);
      if (!s || !h) return false;
      const lean = torsoLeanDeg(h, s);
      return Number.isFinite(lean) && lean > 50;
    })();
    if (kneeAngle != null && kneeAngle < 130 && horizontal) {
      align = jointAngle(frame, shoulder, hip, knee, min);
      this.kneeling = true;
    } else {
      align = jointAngle(frame, shoulder, hip, ankle, min);
      if (kneeAngle != null && kneeAngle > 155) this.kneeling = false;
    }
    if (align != null) align = this.smooth("align", align, cal.smoothAlpha);

    this.track(meanVis(frame, [shoulder, elbow, wrist]), cal);
    if (clipped(frame, [shoulder, elbow, wrist, hip], min)) {
      this.cues.push("Step back so your shoulders, hands, and hips stay inside the frame.");
    }
    if (this.kneeling) this.cues.push("Knee push-up variation detected. It still counts when the range is complete.");

    this.metrics.push({ label: "Elbow", value: `${Math.round(elbowSmooth)}°` });
    this.metrics.push({
      label: "Body line",
      value: align == null ? "Unable to assess" : `${Math.round(align)}°`,
    });

    const moving =
      this.cycle.phase === "toward" || this.cycle.phase === "end" || this.cycle.phase === "back";
    if (moving && align != null) {
      this.alignKnown = true;
      this.worstAlign = this.worstAlign == null ? align : Math.min(this.worstAlign, align);
    }

    const atStart = this.latch("start", elbowSmooth >= start, frames);
    const leavingStart = this.latch("leaveStart", elbowSmooth <= start - band, frames);
    const atEnd = this.latch("end", elbowSmooth <= end, frames);
    const leavingEnd = this.latch("leaveEnd", elbowSmooth >= end + band, frames);

    this.stepCycle({
      now: frame.timestamp,
      cal,
      atStart,
      atEnd,
      leavingStart,
      leavingEnd,
      labels: { start: "Top", toward: "Lowering", end: "Bottom", back: "Pressing" },
      coaching: {
        setup: "Start in a straight plank with your arms extended.",
        start: "Lower yourself with control.",
        toward: "Lower yourself a little further.",
        end: "Push back up to complete the repetition.",
        back: "Push back up to complete the repetition.",
        partial: "Lower yourself a little further.",
      },
      onRepStart: () => {
        this.worstAlign = align;
        this.alignKnown = align != null;
      },
      assess: () => {
        const issues: string[] = [];
        let score = 100;
        const line = this.worstAlign;
        if (this.alignKnown && line != null && line < 155) {
          score -= line < 140 ? 35 : 22;
          issues.push("Keep your body in a straight line.");
        }
        const tempo = frame.timestamp - this.cycle.startedAt;
        if (tempo > 0 && tempo < 380) {
          score -= 12;
          issues.push("Slow the movement slightly.");
        }
        const note = this.alignKnown ? undefined : "Body line was not visible, so it was not judged.";
        return { issues, score, note };
      },
    });

    if (align != null && align < 155 && (this.cycle.phase === "start" || this.cycle.phase === "end")) {
      this.feedback = "Keep your body in a straight line.";
      this.tone = "warn";
      const s = imagePoint(frame, shoulder, min);
      const h = imagePoint(frame, hip, min);
      const a = imagePoint(frame, ankle, min);
      if (s && h && a) {
        const drop = hipDrop(s, h, a);
        if (drop != null && drop > 0.045) this.cues.push("Your hips look lower than your shoulders and ankles.");
        if (drop != null && drop < -0.045) this.cues.push("Your hips look raised higher than a straight line.");
      }
    }
  }
}
