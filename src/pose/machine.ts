import type { Calibration } from "../domain/types";
import type {
  AnalysisSnapshot,
  AnalyzerSummary,
  CyclePhase,
  DetectStatus,
  PoseFrame,
  Tone,
} from "./types";

export interface CycleCoach {
  now: number;
  cal: Calibration;
  atStart: boolean;
  atEnd: boolean;
  leavingStart: boolean;
  leavingEnd: boolean;
  labels: { start: string; toward: string; end: string; back: string };
  coaching: {
    setup: string;
    start: string;
    toward: string;
    end: string;
    back: string;
    partial: string;
  };
  onRepStart?: () => void;
  assess: () => { issues: string[]; score: number; note?: string };
}

export abstract class MovementAnalyzer {
  readonly id: string;
  protected phase = "setup";
  protected phaseLabel = "Ready";
  protected reps = 0;
  protected goodReps = 0;
  protected correctedReps = 0;
  protected scores: number[] = [];
  protected feedbackCounts: Record<string, number> = {};
  protected feedback = "Enable the camera and step into frame.";
  protected tone: Tone = "neutral";
  protected status: DetectStatus = "searching";
  protected visibility = 0;
  protected cues: string[] = [];
  protected metrics: { label: string; value: string }[] = [];
  protected unableReasons: string[] = [];
  protected leftReps = 0;
  protected rightReps = 0;
  protected holdMs = 0;
  protected lastRepAt = -Infinity;
  protected gapStart: number | null = null;
  protected holds = new Map<string, number>();
  protected ema = new Map<string, number>();
  protected cycle: { phase: CyclePhase; endLatched: boolean; startedAt: number } = {
    phase: "setup",
    endLatched: false,
    startedAt: 0,
  };
  private flashUntil = -Infinity;
  private flashFeedback = "";
  private flashTone: Tone = "good";

  constructor(id: string) {
    this.id = id;
  }

  protected abstract onFrame(frame: PoseFrame, cal: Calibration): void;

  reset(): void {
    this.phase = "setup";
    this.phaseLabel = "Ready";
    this.reps = 0;
    this.goodReps = 0;
    this.correctedReps = 0;
    this.scores = [];
    this.feedbackCounts = {};
    this.feedback = "Step into frame. Reps are counted only from a full movement.";
    this.tone = "neutral";
    this.status = "searching";
    this.visibility = 0;
    this.cues = [];
    this.metrics = [];
    this.unableReasons = [];
    this.leftReps = 0;
    this.rightReps = 0;
    this.holdMs = 0;
    this.lastRepAt = -Infinity;
    this.gapStart = null;
    this.holds.clear();
    this.ema.clear();
    this.cycle = { phase: "setup", endLatched: false, startedAt: 0 };
    this.flashUntil = -Infinity;
    this.flashFeedback = "";
    this.flashTone = "good";
  }

  update(frame: PoseFrame, cal: Calibration): AnalysisSnapshot {
    this.cues = [];
    this.metrics = [];
    this.unableReasons = [];
    if (frame.brightness != null && frame.brightness < 32) {
      this.cues.push("Lighting looks low. Face a lamp or window so your outline is clearer.");
    } else if (frame.brightness != null && frame.brightness > 240) {
      this.cues.push("The frame looks washed out. Turn so a bright window is not behind you.");
    }
    if (!frame.landmarks || frame.landmarks.length < 33) {
      this.markUnable(frame, "No person detected. Step into the camera view.", 0, ["body"]);
      return this.snapshot();
    }
    this.onFrame(frame, cal);
    if (this.tone !== "unable" && frame.timestamp <= this.flashUntil) {
      this.feedback = this.flashFeedback;
      this.tone = this.flashTone;
    }
    return this.snapshot();
  }

  summary(): AnalyzerSummary {
    return {
      reps: this.reps,
      goodReps: this.goodReps,
      correctedReps: this.correctedReps,
      avgFormScore: this.formScore(),
      feedbackCounts: { ...this.feedbackCounts },
      holdSeconds: Math.round(this.holdMs / 1000),
      leftReps: this.leftReps,
      rightReps: this.rightReps,
    };
  }

  snapshot(): AnalysisSnapshot {
    return {
      exerciseId: this.id,
      phase: this.phase,
      phaseLabel: this.phaseLabel,
      reps: this.reps,
      goodReps: this.goodReps,
      correctedReps: this.correctedReps,
      formScore: this.formScore(),
      feedback: this.feedback,
      tone: this.tone,
      visibility: this.visibility,
      status: this.status,
      cues: [...this.cues],
      metrics: this.metrics.map((metric) => ({ ...metric })),
      leftReps: this.leftReps,
      rightReps: this.rightReps,
      holdMs: this.holdMs,
      unableReasons: [...this.unableReasons],
    };
  }

  protected formScore(): number | null {
    if (!this.scores.length) return null;
    const total = this.scores.reduce((sum, score) => sum + score, 0);
    return Math.round(total / this.scores.length);
  }

  protected smooth(key: string, value: number, alpha: number): number {
    if (!Number.isFinite(value)) return this.ema.get(key) ?? value;
    const prev = this.ema.get(key);
    const next = prev == null || !Number.isFinite(prev) ? value : prev + alpha * (value - prev);
    this.ema.set(key, next);
    return next;
  }

  /** True once `ok` has held for the required number of frames. Resets when `ok` drops. */
  protected latch(key: string, ok: boolean, frames: number): boolean {
    if (!ok) {
      this.holds.set(key, 0);
      return false;
    }
    const next = (this.holds.get(key) ?? 0) + 1;
    this.holds.set(key, next);
    return next >= Math.max(1, frames);
  }

  protected markSeen(): void {
    this.gapStart = null;
  }

  protected markUnable(frame: PoseFrame, message: string, visibility: number, reasons: string[]): void {
    this.feedback = message;
    this.tone = "unable";
    this.status = visibility > 0.2 ? "partial" : "searching";
    this.visibility = visibility;
    this.phaseLabel = "Unable to assess";
    this.phase = "unable";
    this.unableReasons = reasons;
    if (this.gapStart == null) this.gapStart = frame.timestamp;
    else if (frame.timestamp - this.gapStart > 1200) {
      this.cycle.phase = "setup";
      this.cycle.endLatched = false;
      this.holds.clear();
      this.ema.clear();
    }
  }

  private flash(now: number): void {
    this.flashUntil = now + 800;
    this.flashFeedback = this.feedback;
    this.flashTone = this.tone;
  }

  protected track(visibility: number, cal: Calibration): void {
    this.visibility = visibility;
    this.status = visibility < cal.minVisibility + 0.08 ? "low_confidence" : "tracking";
    this.markSeen();
  }

  protected registerRep(
    now: number,
    cal: Calibration,
    good: boolean,
    score: number | null,
    issues: string[],
  ): boolean {
    if (now - this.lastRepAt < cal.repCooldownMs) return false;
    this.lastRepAt = now;
    this.reps += 1;
    if (good) this.goodReps += 1;
    else this.correctedReps += 1;
    if (score != null && Number.isFinite(score)) {
      this.scores.push(Math.max(0, Math.min(100, Math.round(score))));
    }
    for (const issue of issues) {
      this.feedbackCounts[issue] = (this.feedbackCounts[issue] ?? 0) + 1;
    }
    return true;
  }

  /**
   * Counts one repetition only after a latched start, a latched end, and a return to the start.
   * Callers pass booleans that already include smoothing and hysteresis.
   */
  protected stepCycle(opts: CycleCoach): "counted" | "partial" | "none" {
    const cycle = this.cycle;
    if (cycle.phase === "setup") {
      this.phase = "setup";
      this.phaseLabel = "Get ready";
      this.feedback = opts.coaching.setup;
      this.tone = "neutral";
      if (opts.atStart) cycle.phase = "start";
      return "none";
    }

    if (cycle.phase === "start") {
      this.phase = "start";
      this.phaseLabel = opts.labels.start;
      this.feedback = opts.coaching.start;
      this.tone = "neutral";
      if (opts.leavingStart) {
        cycle.phase = "toward";
        cycle.endLatched = false;
        cycle.startedAt = opts.now;
        opts.onRepStart?.();
      }
      return "none";
    }

    if (cycle.phase === "toward") {
      this.phase = "toward";
      this.phaseLabel = opts.labels.toward;
      if (opts.atEnd) {
        cycle.phase = "end";
        cycle.endLatched = true;
        this.feedback = opts.coaching.end;
        this.tone = "good";
        return "none";
      }
      if (opts.atStart) {
        cycle.phase = "start";
        this.feedback = opts.coaching.partial;
        this.tone = "warn";
        this.flash(opts.now);
        return "partial";
      }
      this.feedback = opts.coaching.toward;
      this.tone = "warn";
      return "none";
    }

    if (cycle.phase === "end") {
      this.phase = "end";
      this.phaseLabel = opts.labels.end;
      this.feedback = opts.coaching.end;
      this.tone = "neutral";
      if (opts.leavingEnd) cycle.phase = "back";
      return "none";
    }

    this.phase = "back";
    this.phaseLabel = opts.labels.back;
    this.feedback = opts.coaching.back;
    this.tone = "neutral";
    if (opts.atEnd) {
      cycle.phase = "end";
      return "none";
    }
    if (opts.atStart && cycle.endLatched) {
      const assessment = opts.assess();
      const good = assessment.issues.length === 0;
      const counted = this.registerRep(opts.now, opts.cal, good, assessment.score, assessment.issues);
      if (!counted) {
        this.feedback = "Hold the finish position for a moment.";
        return "none";
      }
      this.feedback = good
        ? assessment.note
          ? `Rep counted. ${assessment.note}`
          : "Rep counted."
        : assessment.issues[0];
      this.tone = good ? "good" : "warn";
      if (assessment.note) this.cues.push(assessment.note);
      this.flash(opts.now);
      cycle.phase = "start";
      cycle.endLatched = false;
      return "counted";
    }
    return "none";
  }
}
