import { describe, expect, it } from "vitest";
import { EMPTY_CUE_MEMORY, nextCoachLine, type CueMemory } from "./voiceCue";

function step(memory: CueMemory, patch: Partial<Parameters<typeof nextCoachLine>[0]>, timed = false) {
  return nextCoachLine(
    { reps: 0, feedback: "", cue: "", holdSeconds: 0, ...patch },
    memory,
    timed,
  );
}

describe("nextCoachLine", () => {
  it("speaks a new instruction once", () => {
    const first = step(EMPTY_CUE_MEMORY, { feedback: "Lower yourself with control." });
    expect(first.line).toBe("Lower yourself with control.");
    expect(first.interrupt).toBe(true);
    const again = step(first.memory, { feedback: "Lower yourself with control." });
    expect(again.line).toBeNull();
  });

  it("counts a clean rep and a corrected rep", () => {
    const ready = step(EMPTY_CUE_MEMORY, { feedback: "Lower yourself with control." });
    const clean = step(ready.memory, { reps: 1, feedback: "Rep counted." });
    expect(clean.line).toBe("1.");
    const corrected = step(clean.memory, { reps: 2, feedback: "Keep your body in a straight line." });
    expect(corrected.line).toBe("2. Keep your body in a straight line.");
  });

  it("keeps a rep note that follows the counted phrase", () => {
    const spoken = step(EMPTY_CUE_MEMORY, { reps: 3, feedback: "Rep counted. Knee alignment was not assessed from this angle." });
    expect(spoken.line).toBe("3. Knee alignment was not assessed from this angle.");
  });

  it("does not invent a rep when the counter resets", () => {
    const counted = step(EMPTY_CUE_MEMORY, { reps: 4, feedback: "Rep counted." });
    const reset = step(counted.memory, { reps: 0, feedback: "Start in a straight plank with your arms extended." });
    expect(reset.line).toBeNull();
    const next = step(reset.memory, { feedback: "Lower yourself with control." });
    expect(next.line).toBe("Lower yourself with control.");
  });

  it("adds a cue only when it is new information", () => {
    const started = step(EMPTY_CUE_MEMORY, { feedback: "Push back up to complete the repetition." });
    const extra = step(started.memory, {
      feedback: "Push back up to complete the repetition.",
      cue: "Your hips look raised higher than a straight line.",
    });
    expect(extra.line).toBe("Your hips look raised higher than a straight line.");
    const folded = step(EMPTY_CUE_MEMORY, {
      feedback: "Lower yourself a little further.",
      cue: "Step back so your shoulders stay in frame.",
    });
    expect(folded.line).toBe("Lower yourself a little further. Step back so your shoulders stay in frame.");
  });

  it("announces plank time on ten-second marks", () => {
    const setup = step(EMPTY_CUE_MEMORY, { feedback: "Holding. Stay long through the body.", holdSeconds: 4 }, true);
    expect(setup.line).toBe("Holding. Stay long through the body.");
    const early = step(setup.memory, { feedback: "Holding. Stay long through the body.", holdSeconds: 9 }, true);
    expect(early.line).toBeNull();
    const ten = step(early.memory, { feedback: "Holding. Stay long through the body.", holdSeconds: 10 }, true);
    expect(ten.line).toBe("10 seconds. Holding. Stay long through the body.");
    const still = step(ten.memory, { feedback: "Holding. Stay long through the body.", holdSeconds: 18 }, true);
    expect(still.line).toBeNull();
    const twenty = step(still.memory, { feedback: "Holding. Stay long through the body.", holdSeconds: 20 }, true);
    expect(twenty.line).toBe("20 seconds. Holding. Stay long through the body.");
  });
});
