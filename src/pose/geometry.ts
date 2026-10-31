import type { Landmark, PoseFrame } from "./types";

export const LM = {
  nose: 0,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lHip: 23,
  rHip: 24,
  lKnee: 25,
  rKnee: 26,
  lAnkle: 27,
  rAnkle: 28,
} as const;

/** Angle in degrees at point b, using x/y/z. 180 is straight. */
export function angleAt(a: Landmark, b: Landmark, c: Landmark): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v1z = (a.z ?? 0) - (b.z ?? 0);
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const v2z = (c.z ?? 0) - (b.z ?? 0);
  const dot = v1x * v2x + v1y * v2y + v1z * v2z;
  const m1 = Math.hypot(v1x, v1y, v1z);
  const m2 = Math.hypot(v2x, v2y, v2z);
  if (m1 < 1e-5 || m2 < 1e-5) return Number.NaN;
  const cos = Math.min(1, Math.max(-1, dot / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function dist2(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 0 means the shoulder is directly above the hip in the image. Assumes an upright camera. */
export function torsoLeanDeg(hip: Landmark, shoulder: Landmark): number {
  const vx = shoulder.x - hip.x;
  const vy = shoulder.y - hip.y;
  const mag = Math.hypot(vx, vy);
  if (mag < 1e-5) return Number.NaN;
  const cos = Math.min(1, Math.max(-1, -vy / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function visibility(frame: PoseFrame, index: number): number {
  return frame.landmarks[index]?.visibility ?? 0;
}

export function meanVis(frame: PoseFrame, indices: number[]): number {
  if (!indices.length) return 0;
  return indices.reduce((sum, index) => sum + visibility(frame, index), 0) / indices.length;
}

export function minVis(frame: PoseFrame, indices: number[]): number {
  if (!indices.length) return 0;
  return Math.min(...indices.map((index) => visibility(frame, index)));
}

export function imagePoint(frame: PoseFrame, index: number, minVis: number): Landmark | null {
  const point = frame.landmarks[index];
  if (!point || (point.visibility ?? 0) < minVis) return null;
  return point;
}

/** World landmarks when every joint is present; otherwise the image landmarks. */
export function jointAngle(frame: PoseFrame, i: number, j: number, k: number, minVis: number): number | null {
  if ([i, j, k].some((index) => visibility(frame, index) < minVis)) return null;
  const worldReady = frame.world && [i, j, k].every((index) => frame.world?.[index]);
  const src = worldReady ? frame.world! : frame.landmarks;
  const deg = angleAt(src[i], src[j], src[k]);
  return Number.isFinite(deg) ? deg : null;
}

export function clipped(frame: PoseFrame, indices: number[], minVis: number): boolean {
  return indices.some((index) => {
    const point = frame.landmarks[index];
    if (!point || (point.visibility ?? 0) < minVis) return false;
    return point.x < 0.025 || point.x > 0.975 || point.y < 0.025 || point.y > 0.975;
  });
}

/**
 * Positive when the hip sits below the shoulder–ankle line in the image.
 * Returns null when the body is not mostly horizontal, because the sign is then unreliable.
 */
export function hipDrop(shoulder: Landmark, hip: Landmark, ankle: Landmark): number | null {
  const dx = ankle.x - shoulder.x;
  const dy = ankle.y - shoulder.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-6) return null;
  if (Math.abs(dx) < Math.abs(dy) * 1.2) return null;
  const t = ((hip.x - shoulder.x) * dx + (hip.y - shoulder.y) * dy) / len2;
  const projectedY = shoulder.y + t * dy;
  return hip.y - projectedY;
}

/** True when both shoulders are separated across the frame. Null if they are not visible. */
export function isFrontal(frame: PoseFrame, minVis: number): boolean | null {
  const left = imagePoint(frame, LM.lShoulder, minVis);
  const right = imagePoint(frame, LM.rShoulder, minVis);
  if (!left || !right) return null;
  const shoulderWidth = Math.abs(left.x - right.x);
  const leftHip = imagePoint(frame, LM.lHip, minVis);
  const rightHip = imagePoint(frame, LM.rHip, minVis);
  const shoulderY = (left.y + right.y) / 2;
  const hipY = leftHip && rightHip ? (leftHip.y + rightHip.y) / 2 : shoulderY + 0.2;
  const torso = Math.max(0.05, Math.abs(hipY - shoulderY));
  return shoulderWidth > Math.max(0.1, torso * 0.72);
}
