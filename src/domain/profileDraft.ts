import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from "./body";
import type { Activity, Diet, Experience, Goal, Limitation, Place, Profile, Sex, Units } from "./types";

export interface Draft {
  name: string;
  age: string;
  sex: Sex;
  units: Units;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  goal: Goal;
  experience: Experience;
  place: Place;
  equipment: string[];
  daysPerWeek: string;
  sessionMinutes: string;
  diet: Diet;
  allergies: string;
  restrictions: string;
  skipNutrition: boolean;
  limitPantry: boolean;
  staples: string[];
  activity: Activity;
  limitations: Limitation[];
  limitationNotes: string;
  trackWeight: boolean;
}

export type FieldErrors = Partial<Record<keyof Draft, string>>;

export function emptyDraft(): Draft {
  return {
    name: "",
    age: "",
    sex: "unspecified",
    units: "metric",
    heightCm: "",
    heightFt: "",
    heightIn: "",
    weight: "",
    goal: "general",
    experience: "beginner",
    place: "home",
    equipment: [],
    daysPerWeek: "3",
    sessionMinutes: "30",
    diet: "vegetarian",
    allergies: "",
    restrictions: "",
    skipNutrition: false,
    limitPantry: false,
    staples: [],
    activity: "unspecified",
    limitations: [],
    limitationNotes: "",
    trackWeight: false,
  };
}

export function draftFromProfile(profile: Profile): Draft {
  const imperial = cmToFtIn(profile.heightCm);
  return {
    name: profile.name,
    age: String(profile.age),
    sex: profile.sex,
    units: profile.units,
    heightCm: String(Math.round(profile.heightCm)),
    heightFt: String(imperial.feet),
    heightIn: String(imperial.inches),
    weight: profile.units === "metric" ? String(Math.round(profile.weightKg * 10) / 10) : String(Math.round(kgToLb(profile.weightKg) * 10) / 10),
    goal: profile.goal,
    experience: profile.experience,
    place: profile.place,
    equipment: [...profile.equipment],
    daysPerWeek: String(profile.daysPerWeek),
    sessionMinutes: String(profile.sessionMinutes),
    diet: profile.diet,
    allergies: profile.allergies,
    restrictions: profile.restrictions,
    skipNutrition: profile.skipNutrition,
    limitPantry: profile.staples != null,
    staples: profile.staples ? [...profile.staples] : [],
    activity: profile.activity,
    limitations: [...profile.limitations],
    limitationNotes: profile.limitationNotes,
    trackWeight: profile.trackWeight,
  };
}

function numberIn(value: string, min: number, max: number): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

export function errorsForStep(draft: Draft, step: number): FieldErrors {
  const errors: FieldErrors = {};
  if (step === 0 || step === 5) {
    if (draft.name.trim().length < 2) errors.name = "Enter the name you want on the dashboard.";
    const age = numberIn(draft.age, 16, 90);
    if (age == null) errors.age = "Enter an age from 16 to 90. This app is for adults and older teens.";
  }
  if (step === 1 || step === 5) {
    if (draft.units === "metric") {
      if (numberIn(draft.heightCm, 120, 230) == null) errors.heightCm = "Enter height from 120 to 230 cm.";
    } else {
      const feet = numberIn(draft.heightFt, 4, 7);
      const inches = numberIn(draft.heightIn, 0, 11);
      if (feet == null) errors.heightFt = "Enter feet from 4 to 7.";
      if (inches == null) errors.heightIn = "Enter inches from 0 to 11.";
      if (feet != null && inches != null) {
        const cm = ftInToCm(feet, inches);
        if (cm < 120 || cm > 230) errors.heightFt = "That height is outside 120–230 cm.";
      }
    }
    const weight = Number(draft.weight);
    if (!Number.isFinite(weight) || weight <= 0) errors.weight = "Enter your weight.";
    else if (draft.units === "metric" && (weight < 35 || weight > 250)) errors.weight = "Enter weight from 35 to 250 kg.";
    else if (draft.units === "imperial" && (weight < 77 || weight > 550)) errors.weight = "Enter weight from 77 to 550 lb.";
  }
  if (step === 2 || step === 5) {
    if (numberIn(draft.daysPerWeek, 2, 6) == null) errors.daysPerWeek = "Choose 2 to 6 training days.";
    if (numberIn(draft.sessionMinutes, 15, 90) == null) errors.sessionMinutes = "Choose a session from 15 to 90 minutes.";
  }
  if (step === 4 || step === 5) {
    if (draft.allergies.length > 200) errors.allergies = "Keep allergies under 200 characters.";
    if (draft.restrictions.length > 240) errors.restrictions = "Keep restrictions under 240 characters.";
    if (draft.limitPantry && draft.staples.length === 0) errors.staples = "Pick at least one staple, or turn the pantry filter off.";
  }
  if ((step === 3 || step === 5) && draft.limitationNotes.length > 300) {
    errors.limitationNotes = "Keep the note under 300 characters.";
  }
  return errors;
}

export function profileFromDraft(draft: Draft, existing?: Profile): Profile {
  const heightCm =
    draft.units === "metric"
      ? Number(draft.heightCm)
      : ftInToCm(Number(draft.heightFt), Number(draft.heightIn));
  const weightKg = draft.units === "metric" ? Number(draft.weight) : lbToKg(Number(draft.weight));
  const now = new Date().toISOString();
  return {
    name: draft.name.trim(),
    age: Math.round(Number(draft.age)),
    sex: draft.sex,
    heightCm: Math.round(heightCm * 10) / 10,
    weightKg: Math.round(weightKg * 10) / 10,
    units: draft.units,
    goal: draft.goal,
    experience: draft.experience,
    place: draft.place,
    equipment: [...draft.equipment],
    diet: draft.diet,
    allergies: draft.allergies.trim(),
    restrictions: draft.restrictions.trim(),
    skipNutrition: draft.skipNutrition,
    staples: draft.limitPantry ? [...draft.staples] : null,
    daysPerWeek: Math.round(Number(draft.daysPerWeek)),
    sessionMinutes: Math.round(Number(draft.sessionMinutes)),
    activity: draft.activity,
    limitations: [...draft.limitations],
    limitationNotes: draft.limitationNotes.trim(),
    trackWeight: draft.trackWeight,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}
