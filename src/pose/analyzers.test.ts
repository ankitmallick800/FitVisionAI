import { describe, expect, it } from "vitest";
import type { Calibration } from "../domain/types";
import { angleAt, torsoLeanDeg } from "./geometry";
import { createAnalyzer, ANALYZER_IDS } from "./index";
import type { MovementAnalyzer } from "./machine";
import type { Landmark, PoseFrame } from "./types";

const CAL: Calibration = {
  depth: "standard",
  smoothAlpha: 1,
  stableFrames: 2,
  minVisibility: 0.5,
  repCooldownMs: 80,
};

function blank(): Landmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.05 }));
}

function put(landmarks: Landmark[], index: number, x: number, y: number, visibility = 0.98): void {
  landmarks[index] = { x, y, z: 0, visibility };
}

function frame(timestamp: number, paint: (landmarks: Landmark[]) => void): PoseFrame {
  const landmarks = blank();
  paint(landmarks);
  return { timestamp, landmarks };
}

function repeat(count: number, start: number, paint: (landmarks: Landmark[]) => void, step = 90): PoseFrame[] {
  return Array.from({ length: count }, (_, index) => frame(start + index * step, paint));
}

function run(analyzer: MovementAnalyzer, frames: PoseFrame[], cal: Calibration = CAL) {
  let snap = analyzer.snapshot();
  for (const item of frames) snap = analyzer.update(item, cal);
  return snap;
}

/** Parent is directly above the joint. The returned angle at the joint matches `degrees`. */
function bend(degrees: number, joint = { x: 0.55, y: 0.55 }, len = 0.16) {
  const rad = (degrees * Math.PI) / 180;
  return {
    parent: { x: joint.x, y: joint.y - len },
    joint,
    child: { x: joint.x + Math.sin(rad) * len, y: joint.y - Math.cos(rad) * len },
  };
}

function leanShoulder(degrees: number, hip = { x: 0.48, y: 0.58 }) {
  const rad = (degrees * Math.PI) / 180;
  return {
    hip,
    shoulder: { x: hip.x + Math.sin(rad) * 0.22, y: hip.y - Math.cos(rad) * 0.22 },
  };
}

describe("geometry", () => {
  it("measures a straight line as 180 and a right angle as 90", () => {
    const straight = bend(180);
    const right = bend(90);
    expect(angleAt(straight.parent, straight.joint, straight.child)).toBeCloseTo(180, 0);
    expect(angleAt(right.parent, right.joint, right.child)).toBeCloseTo(90, 0);
  });

  it("measures an upright torso as 0 and a horizontal trunk as 90", () => {
    const up = leanShoulder(0);
    const flat = leanShoulder(90);
    expect(torsoLeanDeg(up.hip, up.shoulder)).toBeCloseTo(0, 0);
    expect(torsoLeanDeg(flat.hip, flat.shoulder)).toBeCloseTo(90, 0);
  });
});

function paintPushup(landmarks: Landmark[], elbowAngle: number, sag = 0): void {
  const arm = bend(elbowAngle, { x: 0.64, y: 0.56 });
  const shoulder = arm.parent;
  const hip = { x: shoulder.x - 0.2, y: shoulder.y + sag };
  const ankle = { x: shoulder.x - 0.42, y: shoulder.y };
  const knee = { x: (hip.x + ankle.x) / 2, y: (hip.y + ankle.y) / 2 };
  put(landmarks, 11, shoulder.x, shoulder.y);
  put(landmarks, 13, arm.joint.x, arm.joint.y);
  put(landmarks, 15, arm.child.x, arm.child.y);
  put(landmarks, 23, hip.x, hip.y);
  put(landmarks, 25, knee.x, knee.y);
  put(landmarks, 27, ankle.x, ankle.y);
}

function paintLeg(landmarks: Landmark[], hipIndex: number, kneeIndex: number, ankleIndex: number, angle: number, hipX: number): void {
  const leg = bend(angle, { x: hipX, y: 0.64 });
  put(landmarks, hipIndex, leg.parent.x, leg.parent.y);
  put(landmarks, kneeIndex, leg.joint.x, leg.joint.y);
  put(landmarks, ankleIndex, leg.child.x, leg.child.y);
}

describe("push-ups", () => {
  it("counts a full lower-and-press and ignores a partial rep", () => {
    const analyzer = createAnalyzer("push-ups");
    const full = [
      ...repeat(4, 0, (lm) => paintPushup(lm, 175)),
      ...repeat(4, 400, (lm) => paintPushup(lm, 130)),
      ...repeat(4, 800, (lm) => paintPushup(lm, 85)),
      ...repeat(4, 1200, (lm) => paintPushup(lm, 130)),
      ...repeat(4, 1600, (lm) => paintPushup(lm, 175)),
    ];
    const snap = run(analyzer, full);
    expect(snap.reps).toBe(1);
    expect(snap.goodReps).toBe(1);
    expect(snap.correctedReps).toBe(0);
    expect(snap.tone).toBe("good");

    const partial = createAnalyzer("push-ups");
    const short = [
      ...repeat(4, 0, (lm) => paintPushup(lm, 175)),
      ...repeat(4, 400, (lm) => paintPushup(lm, 130)),
      ...repeat(4, 800, (lm) => paintPushup(lm, 175)),
    ];
    const missed = run(partial, short);
    expect(missed.reps).toBe(0);
    expect(missed.feedback.toLowerCase()).toContain("further");
  });

  it("does not count when the arm is not visible", () => {
    const analyzer = createAnalyzer("push-ups");
    const hidden = repeat(6, 0, (lm) => {
      paintPushup(lm, 85);
      lm[15].visibility = 0.1;
    });
    const snap = run(analyzer, hidden);
    expect(snap.reps).toBe(0);
    expect(snap.tone).toBe("unable");
    expect(snap.feedback.toLowerCase()).toContain("camera cannot see");
  });

  it("marks a sagging body line as a rep that needs correction", () => {
    const analyzer = createAnalyzer("push-ups");
    const frames = [
      ...repeat(4, 0, (lm) => paintPushup(lm, 175, 0.16)),
      ...repeat(4, 400, (lm) => paintPushup(lm, 130, 0.16)),
      ...repeat(4, 800, (lm) => paintPushup(lm, 85, 0.16)),
      ...repeat(4, 1200, (lm) => paintPushup(lm, 130, 0.16)),
      ...repeat(4, 1600, (lm) => paintPushup(lm, 175, 0.16)),
    ];
    const snap = run(analyzer, frames);
    expect(snap.reps).toBe(1);
    expect(snap.correctedReps).toBe(1);
    expect(snap.goodReps).toBe(0);
    expect(snap.feedback).toContain("straight line");
  });

  it("uses the easier depth setting for a shallower push-up", () => {
    const shallow = [
      ...repeat(4, 0, (lm) => paintPushup(lm, 175)),
      ...repeat(4, 400, (lm) => paintPushup(lm, 140)),
      ...repeat(4, 800, (lm) => paintPushup(lm, 120)),
      ...repeat(4, 1200, (lm) => paintPushup(lm, 140)),
      ...repeat(4, 1600, (lm) => paintPushup(lm, 175)),
    ];
    expect(run(createAnalyzer("push-ups"), shallow).reps).toBe(0);
    expect(run(createAnalyzer("push-ups"), shallow, { ...CAL, depth: "easier" }).reps).toBe(1);
  });

  it("does not invent a rep after the body disappears mid-set", () => {
    const analyzer = createAnalyzer("push-ups");
    const bottom = [
      ...repeat(4, 0, (lm) => paintPushup(lm, 175)),
      ...repeat(4, 400, (lm) => paintPushup(lm, 130)),
      ...repeat(4, 800, (lm) => paintPushup(lm, 85)),
    ];
    run(analyzer, bottom);
    run(analyzer, [frame(1000, () => undefined), frame(2600, () => undefined)]);
    const after = run(analyzer, repeat(4, 2800, (lm) => paintPushup(lm, 175)));
    expect(after.reps).toBe(0);
  });
});

describe("squats", () => {
  function paintSquat(landmarks: Landmark[], kneeAngle: number): void {
    paintLeg(landmarks, 23, 25, 27, kneeAngle, 0.46);
  }

  it("counts a squat only after standing, depth, and a full return", () => {
    const frames = [
      ...repeat(4, 0, (lm) => paintSquat(lm, 172)),
      ...repeat(4, 400, (lm) => paintSquat(lm, 140)),
      ...repeat(4, 800, (lm) => paintSquat(lm, 100)),
      ...repeat(4, 1200, (lm) => paintSquat(lm, 140)),
      ...repeat(4, 1600, (lm) => paintSquat(lm, 172)),
    ];
    const snap = run(createAnalyzer("squats"), frames);
    expect(snap.reps).toBe(1);
    expect(snap.goodReps).toBe(1);

    const partial = run(
      createAnalyzer("squats"),
      [
        ...repeat(4, 0, (lm) => paintSquat(lm, 172)),
        ...repeat(4, 400, (lm) => paintSquat(lm, 140)),
        ...repeat(4, 800, (lm) => paintSquat(lm, 172)),
      ],
    );
    expect(partial.reps).toBe(0);
    expect(partial.feedback.toLowerCase()).toContain("depth");
  });
});

describe("sit-ups", () => {
  function paintSitup(landmarks: Landmark[], lean: number): void {
    const pose = leanShoulder(lean, { x: 0.42, y: 0.62 });
    put(landmarks, 11, pose.shoulder.x, pose.shoulder.y);
    put(landmarks, 23, pose.hip.x, pose.hip.y);
    put(landmarks, 25, pose.hip.x + 0.16, pose.hip.y + 0.02);
    put(landmarks, 27, pose.hip.x + 0.16, pose.hip.y + 0.2);
  }

  it("counts one complete sit-up", () => {
    const frames = [
      ...repeat(4, 0, (lm) => paintSitup(lm, 88)),
      ...repeat(4, 400, (lm) => paintSitup(lm, 60)),
      ...repeat(4, 800, (lm) => paintSitup(lm, 30)),
      ...repeat(4, 1200, (lm) => paintSitup(lm, 60)),
      ...repeat(4, 1600, (lm) => paintSitup(lm, 88)),
    ];
    const snap = run(createAnalyzer("sit-ups"), frames);
    expect(snap.reps).toBe(1);
    expect(snap.goodReps).toBe(1);
  });
});

describe("lunges", () => {
  function paintLunge(landmarks: Landmark[], left: number, right: number): void {
    paintLeg(landmarks, 23, 25, 27, left, 0.4);
    paintLeg(landmarks, 24, 26, 28, right, 0.62);
  }

  it("counts a left-lead lunge and keeps the sides separate", () => {
    const frames = [
      ...repeat(4, 0, (lm) => paintLunge(lm, 172, 172)),
      ...repeat(4, 400, (lm) => paintLunge(lm, 140, 165)),
      ...repeat(4, 800, (lm) => paintLunge(lm, 100, 150)),
      ...repeat(4, 1200, (lm) => paintLunge(lm, 140, 165)),
      ...repeat(4, 1600, (lm) => paintLunge(lm, 172, 172)),
    ];
    const snap = run(createAnalyzer("lunges"), frames);
    expect(snap.reps).toBe(1);
    expect(snap.leftReps).toBe(1);
    expect(snap.rightReps).toBe(0);
  });
});

describe("curls and presses", () => {
  it("counts a curl from a straight arm to a flexed arm and back", () => {
    const paint = (angle: number) => (landmarks: Landmark[]) => {
      const arm = bend(angle, { x: 0.58, y: 0.58 });
      put(landmarks, 11, arm.parent.x, arm.parent.y);
      put(landmarks, 13, arm.joint.x, arm.joint.y);
      put(landmarks, 15, arm.child.x, arm.child.y);
      put(landmarks, 23, arm.parent.x, arm.parent.y + 0.24);
    };
    const frames = [
      ...repeat(4, 0, paint(170)),
      ...repeat(4, 400, paint(110)),
      ...repeat(4, 800, paint(40)),
      ...repeat(4, 1200, paint(110)),
      ...repeat(4, 1600, paint(170)),
    ];
    expect(run(createAnalyzer("bicep-curls"), frames).reps).toBe(1);
  });

  it("counts a shoulder press only when the hand travels overhead and returns", () => {
    const paint = (kind: "rack" | "overhead") => (landmarks: Landmark[]) => {
      if (kind === "rack") {
        put(landmarks, 11, 0.5, 0.42);
        put(landmarks, 13, 0.64, 0.5);
        put(landmarks, 15, 0.52, 0.58);
        put(landmarks, 23, 0.5, 0.7);
      } else {
        put(landmarks, 11, 0.5, 0.5);
        put(landmarks, 13, 0.5, 0.34);
        put(landmarks, 15, 0.5, 0.16);
        put(landmarks, 23, 0.5, 0.74);
      }
    };
    const frames = [
      ...repeat(4, 0, paint("rack")),
      ...repeat(4, 500, paint("overhead")),
      ...repeat(4, 1000, paint("rack")),
    ];
    const snap = run(createAnalyzer("shoulder-press"), frames);
    expect(snap.reps).toBe(1);
    expect(snap.goodReps).toBe(1);
  });
});

describe("planks and jumping jacks", () => {
  it("times a plank and never turns it into repetitions", () => {
    const analyzer = createAnalyzer("planks");
    const paint = (sag: number) => (landmarks: Landmark[]) => {
      put(landmarks, 11, 0.66, 0.48);
      put(landmarks, 13, 0.66, 0.64);
      put(landmarks, 15, 0.66, 0.8);
      put(landmarks, 23, 0.44, 0.48 + sag);
      put(landmarks, 25, 0.3, 0.48 + sag / 2);
      put(landmarks, 27, 0.16, 0.48);
    };
    const held = run(analyzer, [
      frame(0, paint(0)),
      frame(80, paint(0)),
      frame(400, paint(0)),
      frame(900, paint(0)),
      frame(1400, paint(0)),
    ]);
    expect(held.reps).toBe(0);
    expect(held.holdMs).toBeGreaterThan(800);
    const paused = run(analyzer, [frame(1800, paint(0.2)), frame(2100, paint(0.2))]);
    expect(paused.reps).toBe(0);
    expect(paused.holdMs).toBe(held.holdMs);
    expect(paused.phaseLabel).toBe("Paused");
  });

  it("counts one open-and-close jumping jack", () => {
    const paint = (open: boolean) => (landmarks: Landmark[]) => {
      put(landmarks, 11, 0.35, 0.35);
      put(landmarks, 12, 0.65, 0.35);
      put(landmarks, 23, 0.42, 0.55);
      put(landmarks, 24, 0.58, 0.55);
      if (open) {
        put(landmarks, 15, 0.1, 0.16);
        put(landmarks, 16, 0.9, 0.16);
        put(landmarks, 27, 0.12, 0.86);
        put(landmarks, 28, 0.88, 0.86);
      } else {
        put(landmarks, 15, 0.4, 0.6);
        put(landmarks, 16, 0.6, 0.6);
        put(landmarks, 27, 0.46, 0.86);
        put(landmarks, 28, 0.54, 0.86);
      }
    };
    const frames = [
      ...repeat(4, 0, paint(false)),
      ...repeat(4, 400, paint(true)),
      ...repeat(4, 800, paint(false)),
    ];
    const snap = run(createAnalyzer("jumping-jacks"), frames);
    expect(snap.reps).toBe(1);
    expect(snap.goodReps).toBe(1);
  });
});

describe("catalog", () => {
  it("has an analyzer for every supported exercise", () => {
    expect(ANALYZER_IDS).toEqual([
      "push-ups",
      "squats",
      "sit-ups",
      "lunges",
      "bicep-curls",
      "shoulder-press",
      "planks",
      "jumping-jacks",
    ]);
    for (const id of ANALYZER_IDS) expect(createAnalyzer(id).id).toBe(id);
  });
});
