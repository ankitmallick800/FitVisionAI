import type { Profile } from "./types";

export function lbToKg(pounds: number): number {
  return pounds * 0.45359237;
}

export function kgToLb(kg: number): number {
  return kg / 0.45359237;
}

export function ftInToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const total = Math.round(cm / 2.54);
  const feet = Math.floor(total / 12);
  const inches = total - feet * 12;
  return { feet, inches };
}

export function bmiValue(weightKg: number, heightCm: number): number {
  const meters = heightCm / 100;
  return weightKg / (meters * meters);
}

export function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return "Underweight screening range";
  if (bmi < 25) return "Healthy weight screening range";
  if (bmi < 30) return "Overweight screening range";
  return "Obesity screening range";
}

export const BMI_NOTE =
  "BMI is a rough screening measure from height and weight. It is not a measure of body fat, fitness, or health, and it does not decide how hard you should train.";

export interface CalorieRange {
  low: number;
  high: number;
  detail: string;
}

export function calorieRange(profile: Profile): CalorieRange | { missing: string } {
  if (profile.sex === "unspecified") {
    return {
      missing:
        "Biological sex is optional. It is used only for a Mifflin–St Jeor calorie estimate. Add it in your profile if you want a range. Until then, use the plate pattern instead of a single calorie target.",
    };
  }
  const sexOffset = profile.sex === "male" ? 5 : -161;
  const bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexOffset;
  const bands: Record<Profile["activity"], [number, number]> = {
    sedentary: [1.2, 1.35],
    light: [1.35, 1.5],
    moderate: [1.5, 1.7],
    active: [1.65, 1.9],
    unspecified: [1.3, 1.7],
  };
  const [lowMult, highMult] = bands[profile.activity];
  let low = bmr * lowMult;
  let high = bmr * highMult;
  if (profile.goal === "weight_loss") {
    low -= 400;
    high -= 250;
  } else if (profile.goal === "muscle_gain") {
    low += 200;
    high += 400;
  }
  const floor = profile.sex === "male" ? 1600 : 1400;
  low = Math.max(floor, Math.round(low / 50) * 50);
  high = Math.max(low + 150, Math.round(high / 50) * 50);
  const activityNote =
    profile.activity === "unspecified"
      ? "Activity level was not set, so this range is wider."
      : "The range adjusts slightly for your logged goal and activity.";
  return {
    low,
    high,
    detail: `${activityNote} It is an estimate, not a prescription, and it is not a crash-diet target.`,
  };
}

export function hydrationCopy(weightKg: number): string {
  const low = Math.round(weightKg * 0.03 * 10) / 10;
  const high = Math.round(weightKg * 0.035 * 10) / 10;
  return `Sip through the day, and drink more around training, heat, or heavy sweating. A loose adult reference is about 30–35 ml per kg of body weight from all fluids — roughly ${low}–${high} L at your logged weight — before those adjustments. Thirst and how you feel matter more than a fixed target. This is not a medical recommendation.`;
}
