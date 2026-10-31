import type { Activity, Diet, Experience, Goal, Limitation, Place, Sex } from "./types";

export const GOAL_OPTIONS: { id: Goal; label: string; detail: string }[] = [
  { id: "weight_loss", label: "Weight loss", detail: "More movement, shorter rests, no crash volume." },
  { id: "muscle_gain", label: "Muscle gain", detail: "Moderate reps and enough rest to repeat good form." },
  { id: "strength", label: "Strength", detail: "Fewer reps, longer rests, controlled tempo." },
  { id: "endurance", label: "Endurance", detail: "Higher reps and shorter rests when the movement stays clean." },
  { id: "general", label: "General fitness", detail: "A balanced mix of strength and conditioning." },
];

export const EXPERIENCE_OPTIONS: { id: Experience; label: string; detail: string }[] = [
  { id: "beginner", label: "Beginner", detail: "Two sets and a shallower default range." },
  { id: "intermediate", label: "Intermediate", detail: "Three sets and a standard range." },
  { id: "advanced", label: "Advanced", detail: "More sets when the session is long enough." },
];

export const SEX_OPTIONS: { id: Sex; label: string }[] = [
  { id: "unspecified", label: "Skip" },
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
];

export const DIET_OPTIONS: { id: Diet; label: string }[] = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "eggetarian", label: "Eggetarian" },
  { id: "non_vegetarian", label: "Non-vegetarian" },
];

export const ACTIVITY_OPTIONS: { id: Activity; label: string }[] = [
  { id: "unspecified", label: "Skip" },
  { id: "sedentary", label: "Mostly seated" },
  { id: "light", label: "Light" },
  { id: "moderate", label: "Moderate" },
  { id: "active", label: "Active" },
];

export const PLACE_OPTIONS: { id: Place; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "gym", label: "Gym" },
];

export const LIMITATION_OPTIONS: { id: Limitation; label: string }[] = [
  { id: "knee", label: "Knees" },
  { id: "back", label: "Back" },
  { id: "shoulder", label: "Shoulders" },
  { id: "wrist", label: "Wrists" },
  { id: "ankle", label: "Ankles" },
];

export const EQUIPMENT_OPTIONS = [
  { id: "dumbbells", label: "Dumbbells" },
  { id: "bands", label: "Bands" },
  { id: "mat", label: "Mat" },
  { id: "bench", label: "Bench" },
  { id: "kettlebell", label: "Kettlebell" },
];

export const STAPLE_OPTIONS = [
  { id: "oats", label: "Oats" },
  { id: "rice", label: "Rice" },
  { id: "roti", label: "Roti" },
  { id: "dal", label: "Dal" },
  { id: "eggs", label: "Eggs" },
  { id: "dairy", label: "Dairy" },
  { id: "chicken", label: "Chicken" },
  { id: "fish", label: "Fish" },
  { id: "fruit", label: "Fruit" },
  { id: "tofu", label: "Tofu" },
  { id: "veg", label: "Vegetables" },
];

export function labelOf<T extends string>(options: { id: T; label: string }[], id: T): string {
  return options.find((option) => option.id === id)?.label ?? id;
}
