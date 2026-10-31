export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface PoseFrame {
  timestamp: number;
  /** Empty when the detector finds nobody. Indices match MediaPipe Pose (33). */
  landmarks: Landmark[];
  world?: Landmark[];
  /** Average frame luminance, 0–255, when the camera loop sampled it. */
  brightness?: number;
}

export type Tone = "good" | "warn" | "neutral" | "unable";
export type DetectStatus = "tracking" | "partial" | "searching" | "low_confidence";

export interface Metric {
  label: string;
  value: string;
}

export interface AnalysisSnapshot {
  exerciseId: string;
  phase: string;
  phaseLabel: string;
  reps: number;
  goodReps: number;
  correctedReps: number;
  formScore: number | null;
  feedback: string;
  tone: Tone;
  visibility: number;
  status: DetectStatus;
  cues: string[];
  metrics: Metric[];
  leftReps: number;
  rightReps: number;
  holdMs: number;
  unableReasons: string[];
}

export interface AnalyzerSummary {
  reps: number;
  goodReps: number;
  correctedReps: number;
  avgFormScore: number | null;
  feedbackCounts: Record<string, number>;
  holdSeconds: number;
  leftReps: number;
  rightReps: number;
}

export type CyclePhase = "setup" | "start" | "toward" | "end" | "back";
