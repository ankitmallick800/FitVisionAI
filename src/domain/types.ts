export type Goal = "weight_loss" | "muscle_gain" | "strength" | "endurance" | "general";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Sex = "female" | "male" | "unspecified";
export type Place = "home" | "gym";
export type Diet = "vegetarian" | "vegan" | "eggetarian" | "non_vegetarian";
export type Units = "metric" | "imperial";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "unspecified";
export type Limitation = "knee" | "back" | "shoulder" | "wrist" | "ankle";
export type Depth = "easier" | "standard" | "deeper";

export interface Profile {
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  units: Units;
  goal: Goal;
  experience: Experience;
  place: Place;
  equipment: string[];
  diet: Diet;
  allergies: string;
  restrictions: string;
  skipNutrition: boolean;
  /** Null means "do not filter meals by what is at home". */
  staples: string[] | null;
  daysPerWeek: number;
  sessionMinutes: number;
  activity: Activity;
  limitations: Limitation[];
  limitationNotes: string;
  trackWeight: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Calibration {
  depth: Depth;
  /** 1 snaps to the raw angle. Lower values smooth more. */
  smoothAlpha: number;
  stableFrames: number;
  minVisibility: number;
  repCooldownMs: number;
}

export interface Settings {
  sound: boolean;
  /** Spoken coaching during a live set. */
  voice: boolean;
  calibration: Calibration;
}

export interface SetLog {
  exerciseId: string;
  setIndex: number;
  targetReps: number | null;
  targetSeconds: number | null;
  reps: number;
  goodReps: number;
  correctedReps: number;
  holdSeconds: number;
  avgFormScore: number | null;
  durationSec: number;
  feedbackCounts: Record<string, number>;
  leftReps: number;
  rightReps: number;
}

export interface SessionLog {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  mode: "plan" | "single";
  exercises: SetLog[];
}

export interface WeightEntry {
  date: string;
  weightKg: number;
}

export interface MealSlotState {
  mealId: string;
  done: boolean;
}

export interface DayMeals {
  date: string;
  slots: Record<string, MealSlotState>;
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  reps: number | null;
  seconds: number | null;
  restSec: number;
  note: string;
}

export interface DayPlan {
  weekday: number;
  title: string;
  rest: boolean;
  note: string;
  items: PlannedExercise[];
}

export const DEFAULT_CALIBRATION: Calibration = {
  depth: "standard",
  smoothAlpha: 0.65,
  stableFrames: 2,
  minVisibility: 0.5,
  repCooldownMs: 420,
};

export function defaultCalibrationFor(profile: Pick<Profile, "experience" | "limitations">): Calibration {
  const limited = profile.limitations.length > 0;
  const depth: Depth = profile.experience === "beginner" || limited ? "easier" : "standard";
  return { ...DEFAULT_CALIBRATION, depth };
}
