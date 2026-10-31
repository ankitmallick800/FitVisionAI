export interface CueState {
  reps: number;
  feedback: string;
  cue: string;
  holdSeconds: number;
}

export interface CueMemory {
  reps: number;
  feedback: string;
  cue: string;
  holdMark: number;
}

export const EMPTY_CUE_MEMORY: CueMemory = { reps: 0, feedback: "", cue: "", holdMark: 0 };

export interface CoachSpeech {
  line: string | null;
  interrupt: boolean;
  memory: CueMemory;
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Decide the next spoken line from a pose snapshot. Same inputs never repeat a line. */
export function nextCoachLine(current: CueState, memory: CueMemory, timed: boolean): CoachSpeech {
  const feedback = clean(current.feedback);
  const cue = clean(current.cue);
  const base: CueMemory = {
    reps: current.reps,
    feedback,
    cue,
    holdMark: current.holdSeconds < memory.holdMark ? 0 : memory.holdMark,
  };

  if (current.reps < memory.reps) {
    return { line: null, interrupt: false, memory: { ...base, holdMark: 0 } };
  }

  if (current.reps > memory.reps) {
    const extra = feedback.replace(/^Rep counted\.?\s*/i, "");
    const line = extra && !/^rep counted\.?$/i.test(feedback) ? `${current.reps}. ${extra}` : `${current.reps}.`;
    return { line, interrupt: true, memory: base };
  }

  if (feedback && feedback !== memory.feedback) {
    const extra = cue && cue !== feedback && !feedback.includes(cue) ? ` ${cue}` : "";
    return { line: `${feedback}${extra}`, interrupt: true, memory: base };
  }

  if (cue && cue !== memory.cue && cue !== feedback && !feedback.includes(cue)) {
    return { line: cue, interrupt: false, memory: base };
  }

  if (timed) {
    const mark = Math.floor(current.holdSeconds / 10) * 10;
    if (mark >= 10 && mark > base.holdMark) {
      return {
        line: feedback ? `${mark} seconds. ${feedback}` : `${mark} seconds.`,
        interrupt: false,
        memory: { ...base, holdMark: mark },
      };
    }
  }

  return { line: null, interrupt: false, memory: base };
}
