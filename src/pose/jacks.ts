import type { Calibration } from "../domain/types";
import { LM, dist2, imagePoint, isFrontal, meanVis, minVis } from "./geometry";
import { MovementAnalyzer } from "./machine";
import type { PoseFrame } from "./types";

const NEEDED = [LM.lShoulder, LM.rShoulder, LM.lWrist, LM.rWrist, LM.lAnkle, LM.rAnkle, LM.lHip, LM.rHip];

export class JackAnalyzer extends MovementAnalyzer {
  constructor() {
    super("jumping-jacks");
  }

  protected onFrame(frame: PoseFrame, cal: Calibration): void {
    const min = cal.minVisibility;
    if (minVis(frame, NEEDED) < min) {
      this.markUnable(
        frame,
        "Camera cannot see your full body. Face the camera and include both hands and both feet.",
        meanVis(frame, NEEDED),
        ["hands and feet"],
      );
      return;
    }
    if (isFrontal(frame, min) === false) {
      this.markUnable(
        frame,
        "Face the camera for jumping jacks so the open and closed positions are visible.",
        meanVis(frame, NEEDED),
        ["front view"],
      );
      return;
    }
    const ls = imagePoint(frame, LM.lShoulder, min)!;
    const rs = imagePoint(frame, LM.rShoulder, min)!;
    const lw = imagePoint(frame, LM.lWrist, min)!;
    const rw = imagePoint(frame, LM.rWrist, min)!;
    const la = imagePoint(frame, LM.lAnkle, min)!;
    const ra = imagePoint(frame, LM.rAnkle, min)!;
    const shoulderWidth = Math.max(0.08, dist2(ls, rs));
    const ankleSpread = dist2(la, ra) / shoulderWidth;
    const wristSpread = dist2(lw, rw) / shoulderWidth;
    const wristsAbove = lw.y < ls.y && rw.y < rs.y;
    const wristsDown = lw.y > ls.y && rw.y > rs.y;
    const open = ankleSpread > 1.65 && wristSpread > 1.55 && wristsAbove;
    const closed = ankleSpread < 1.2 && wristSpread < 1.9 && wristsDown;

    this.track(meanVis(frame, NEEDED), cal);
    this.metrics.push({ label: "Feet", value: ankleSpread.toFixed(1) + "× shoulders" });
    this.metrics.push({ label: "Arms", value: wristsAbove ? "Up" : wristsDown ? "Down" : "Mid" });
    if (!open && !closed && (this.cycle.phase === "toward" || this.cycle.phase === "back")) {
      this.cues.push("Open the arms and the feet together, then return to the start.");
    }

    const frames = cal.stableFrames;
    this.stepCycle({
      now: frame.timestamp,
      cal,
      atStart: this.latch("start", closed, frames),
      leavingStart: this.latch("leaveStart", !closed && (ankleSpread > 1.35 || wristsAbove), frames),
      atEnd: this.latch("end", open, frames),
      leavingEnd: this.latch("leaveEnd", !open, frames),
      labels: { start: "Closed", toward: "Opening", end: "Open", back: "Returning" },
      coaching: {
        setup: "Stand tall, feet together, arms down, facing the camera.",
        start: "Open the arms and the feet together.",
        toward: "Reach the open position with hands up and feet apart.",
        end: "Come back to the start to finish the repetition.",
        back: "Bring your feet together and your arms down.",
        partial: "That one did not fully open. Spread the feet and raise both arms.",
      },
      assess: () => ({ issues: [], score: 100 }),
    });
  }
}
