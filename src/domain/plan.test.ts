import { describe, expect, it } from "vitest";
import { buildWeek } from "./plan";
import type { Profile } from "./types";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    name: "Asha",
    age: 29,
    sex: "unspecified",
    heightCm: 165,
    weightKg: 62,
    units: "metric",
    goal: "general",
    experience: "beginner",
    place: "home",
    equipment: [],
    diet: "vegetarian",
    allergies: "",
    restrictions: "",
    skipNutrition: false,
    staples: null,
    daysPerWeek: 3,
    sessionMinutes: 30,
    activity: "unspecified",
    limitations: [],
    limitationNotes: "",
    trackWeight: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("weekly plan", () => {
  it("gives a beginner three short training days and keeps knee-stressful moves out", () => {
    const week = buildWeek(profile({ limitations: ["knee"] }), []);
    const training = week.filter((day) => !day.rest);
    expect(training).toHaveLength(3);
    expect(week.filter((day) => day.rest)).toHaveLength(4);
    const ids = training.flatMap((day) => day.items.map((item) => item.exerciseId));
    expect(ids).not.toContain("jumping-jacks");
    expect(ids).not.toContain("lunges");
    expect(training[0].items.length).toBeGreaterThan(0);
    expect(training[0].items.every((item) => item.sets === 2)).toBe(true);
  });

  it("does not build the plan from body weight", () => {
    const light = buildWeek(profile({ weightKg: 48, heightCm: 160 }), []);
    const heavy = buildWeek(profile({ weightKg: 110, heightCm: 188 }), []);
    expect(light[0].items.map((item) => item.reps)).toEqual(heavy[0].items.map((item) => item.reps));
  });
});
