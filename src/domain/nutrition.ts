import type { DayMeals, Diet, Profile } from "./types";
import { MEALS, SLOT_ORDER, type Meal, type MealSlot } from "./meals";

const ALLERGEN_WORDS: { tag: string; words: string[] }[] = [
  { tag: "dairy", words: ["dairy", "milk", "lactose", "cheese", "paneer", "curd", "yogurt", "yoghurt", "ghee", "butter"] },
  { tag: "nuts", words: ["nut", "peanut", "almond", "cashew", "walnut"] },
  { tag: "gluten", words: ["gluten", "wheat"] },
  { tag: "soy", words: ["soy", "soya", "tofu"] },
  { tag: "egg", words: ["egg"] },
  { tag: "fish", words: ["fish", "seafood", "prawn", "shrimp"] },
  { tag: "meat", words: ["meat", "chicken", "mutton"] },
];

export function avoidedTags(profile: Pick<Profile, "allergies" | "restrictions">): Set<string> {
  const text = `${profile.allergies} ${profile.restrictions}`.toLowerCase();
  const tags = new Set<string>();
  for (const entry of ALLERGEN_WORDS) {
    if (entry.words.some((word) => text.includes(word))) tags.add(entry.tag);
  }
  return tags;
}

function dietAllows(meal: Meal, diet: Diet): boolean {
  if (diet === "non_vegetarian") return true;
  if (diet === "eggetarian") return meal.diets.some((item) => item === "vegan" || item === "vegetarian" || item === "eggetarian");
  if (diet === "vegetarian") return meal.diets.some((item) => item === "vegan" || item === "vegetarian");
  return meal.diets.includes("vegan");
}

export function mealsFor(profile: Profile, slot: MealSlot): Meal[] {
  const blocked = avoidedTags(profile);
  return MEALS.filter((meal) => {
    if (meal.slot !== slot || !dietAllows(meal, profile.diet)) return false;
    if (meal.allergens.some((tag) => blocked.has(tag))) return false;
    if (profile.staples && meal.needs.some((need) => !profile.staples!.includes(need))) return false;
    return true;
  });
}

export interface ResolvedMeal {
  slot: MealSlot;
  meal: Meal | null;
  done: boolean;
  options: Meal[];
}

export function resolveMeals(profile: Profile, saved: DayMeals | undefined): ResolvedMeal[] {
  return SLOT_ORDER.map((slot) => {
    const options = mealsFor(profile, slot);
    const chosenId = saved?.slots[slot]?.mealId;
    const meal = options.find((item) => item.id === chosenId) ?? options[0] ?? null;
    return {
      slot,
      meal,
      done: Boolean(meal && saved?.slots[slot]?.mealId === meal.id && saved.slots[slot]?.done),
      options,
    };
  });
}

export function macroTotals(meals: ResolvedMeal[]): { kcal: number; protein: number; carbs: number; fat: number } | null {
  const chosen = meals.flatMap((item) => (item.meal ? [item.meal] : []));
  if (!chosen.length) return null;
  return chosen.reduce(
    (sum, meal) => ({
      kcal: sum.kcal + meal.kcal,
      protein: sum.protein + meal.protein,
      carbs: sum.carbs + meal.carbs,
      fat: sum.fat + meal.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
