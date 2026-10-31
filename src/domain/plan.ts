import { weekdayMon0, WEEKDAYS } from "./format";
import type { DayPlan, PlannedExercise, Profile, SessionLog } from "./types";

const TEMPLATES: { title: string; ids: string[] }[] = [
  { title: "Push and legs", ids: ["push-ups", "squats", "planks", "bicep-curls"] },
  { title: "Single-leg and core", ids: ["lunges", "sit-ups", "shoulder-press", "jumping-jacks"] },
  { title: "Full body", ids: ["squats", "push-ups", "bicep-curls", "planks"] },
  { title: "Conditioning", ids: ["jumping-jacks", "lunges", "sit-ups", "shoulder-press"] },
  { title: "Strength circuit", ids: ["push-ups", "lunges", "squats", "planks"] },
  { title: "Upper and core", ids: ["push-ups", "shoulder-press", "bicep-curls", "sit-ups"] },
];

const FALLBACK = ["push-ups", "squats", "planks", "bicep-curls", "sit-ups", "lunges", "shoulder-press", "jumping-jacks"];

const TRAINING_DAYS: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
};

function blocked(id: string, profile: Profile): boolean {
  const limits = new Set(profile.limitations);
  if (id === "jumping-jacks" && (limits.has("knee") || limits.has("ankle"))) return true;
  if (id === "lunges" && limits.has("knee")) return true;
  if (id === "sit-ups" && limits.has("back")) return true;
  if (id === "shoulder-press" && limits.has("shoulder")) return true;
  if (profile.age >= 65 && profile.experience === "beginner" && id === "jumping-jacks") return true;
  return false;
}

function slotsFor(minutes: number): number {
  if (minutes <= 20) return 3;
  if (minutes <= 35) return 4;
  if (minutes <= 50) return 5;
  return 6;
}

function coachingNote(id: string, profile: Profile): string {
  const limits = new Set(profile.limitations);
  if (id === "squats" && limits.has("knee")) {
    return "Use a shallow range and stop if the knee feels sharp. This is not a rehab plan.";
  }
  if (id === "push-ups" && limits.has("wrist")) return "Use an incline or your fists if flat wrists bother you.";
  if (id === "planks" && limits.has("wrist")) return "A forearm plank keeps weight off the wrists.";
  if ((id === "bicep-curls" || id === "shoulder-press") && !profile.equipment.includes("dumbbells") && !profile.equipment.includes("bands")) {
    return "No dumbbells or bands saved. Use light water bottles, or do the motion without added weight.";
  }
  if (id === "jumping-jacks" && profile.experience === "beginner") return "Step the feet out instead of jumping if you want less impact.";
  return "";
}

function progression(id: string, sessions: SessionLog[], reps: number | null, seconds: number | null): { reps: number; seconds: number; label: string } {
  const recent = sessions
    .flatMap((session) => session.exercises)
    .filter((set) => set.exerciseId === id)
    .slice(-2);
  if (recent.length < 2) return { reps: 0, seconds: 0, label: "" };
  const solid = recent.every((set) => {
    const formOk = set.avgFormScore == null || set.avgFormScore >= 75;
    if (seconds != null) return set.holdSeconds >= (set.targetSeconds ?? seconds) && formOk;
    if (!reps || set.reps === 0) return false;
    return set.goodReps / set.reps >= 0.75 && set.reps >= (set.targetReps ?? reps) && formOk;
  });
  if (!solid) return { reps: 0, seconds: 0, label: "" };
  if (seconds != null) return { reps: 0, seconds: 5, label: "Added 5 seconds from your last steady holds." };
  return { reps: 2, seconds: 0, label: "Added 2 reps from your recent sessions." };
}

function prescribe(id: string, profile: Profile, sessions: SessionLog[]): PlannedExercise {
  let sets = profile.experience === "beginner" ? 2 : profile.experience === "intermediate" ? 3 : profile.sessionMinutes >= 45 ? 4 : 3;
  if (profile.age >= 60) sets = Math.min(sets, 3);
  const hold = id === "planks";
  let reps: number | null = profile.experience === "beginner" ? 8 : profile.experience === "intermediate" ? 10 : 12;
  let seconds: number | null = null;
  let rest = profile.experience === "beginner" ? 70 : 60;
  if (hold) {
    reps = null;
    seconds = profile.experience === "beginner" ? 20 : profile.experience === "intermediate" ? 30 : 45;
    rest = 45;
  } else if (id === "jumping-jacks") {
    reps = profile.experience === "beginner" ? 15 : profile.experience === "intermediate" ? 25 : 35;
    rest = 40;
  }
  if (!hold && profile.goal === "endurance") {
    reps = (reps ?? 10) + (id === "jumping-jacks" ? 8 : 4);
    rest = Math.min(rest, 40);
  } else if (!hold && profile.goal === "strength" && id !== "jumping-jacks") {
    reps = profile.experience === "beginner" ? 6 : 5;
    rest = 90;
  } else if (!hold && profile.goal === "muscle_gain" && id !== "jumping-jacks") {
    reps = profile.experience === "beginner" ? 8 : 10;
    rest = 75;
  } else if (!hold && profile.goal === "weight_loss") {
    reps = (reps ?? 10) + 2;
    rest = 40;
  }
  if (profile.age >= 60 && reps != null && id !== "jumping-jacks") reps = Math.min(reps, 12);
  const bonus = progression(id, sessions, reps, seconds);
  if (reps != null) reps += bonus.reps;
  if (seconds != null) seconds += bonus.seconds;
  return {
    exerciseId: id,
    sets,
    reps,
    seconds,
    restSec: rest,
    note: [coachingNote(id, profile), bonus.label].filter(Boolean).join(" "),
  };
}

function estimateMinutes(items: PlannedExercise[]): number {
  const seconds = items.reduce((sum, item) => {
    const work = item.seconds ?? (item.reps ?? 10) * 3;
    return sum + item.sets * (work + item.restSec);
  }, 0);
  return seconds / 60;
}

function dayItems(templateIndex: number, profile: Profile, sessions: SessionLog[]): { title: string; items: PlannedExercise[] } {
  const template = TEMPLATES[templateIndex % TEMPLATES.length];
  const wanted = slotsFor(profile.sessionMinutes);
  const ids: string[] = [];
  for (const id of [...template.ids, ...FALLBACK]) {
    if (ids.includes(id) || blocked(id, profile)) continue;
    ids.push(id);
    if (ids.length >= wanted) break;
  }
  let items = ids.map((id) => prescribe(id, profile, sessions));
  while (items.length > 2 && estimateMinutes(items) > profile.sessionMinutes * 1.15) items = items.slice(0, -1);
  return { title: template.title, items };
}

export function buildWeek(profile: Profile, sessions: SessionLog[]): DayPlan[] {
  const training = new Set(TRAINING_DAYS[profile.daysPerWeek] ?? TRAINING_DAYS[3]);
  let cursor = 0;
  return WEEKDAYS.map((name, weekday) => {
    if (!training.has(weekday)) {
      return {
        weekday,
        title: "Recovery",
        rest: true,
        note: "Recovery is part of the plan. An easy walk is optional. Nothing here has to be intense.",
        items: [],
      };
    }
    const built = dayItems(cursor, profile, sessions);
    cursor += 1;
    return {
      weekday,
      title: built.title,
      rest: false,
      note: `${name} is a training day. Volume follows your experience, goal, and any limitations you listed — not your height or weight.`,
      items: built.items,
    };
  });
}

export function todayPlan(profile: Profile, sessions: SessionLog[], now = new Date()): DayPlan {
  return buildWeek(profile, sessions)[weekdayMon0(now)];
}

export function prescribeOne(exerciseId: string, profile: Profile, sessions: SessionLog[]): PlannedExercise {
  return prescribe(exerciseId, profile, sessions);
}
