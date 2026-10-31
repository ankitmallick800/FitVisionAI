import { addDays, dayKey, dayKeyFromIso, startOfWeek, WEEKDAYS_SHORT } from "./format";
import type { DayPlan, SessionLog } from "./types";

export function activeDayKeys(sessions: SessionLog[]): Set<string> {
  return new Set(sessions.map((session) => dayKeyFromIso(session.endedAt)));
}

export function dayStreak(sessions: SessionLog[], now = new Date()): number {
  const days = activeDayKeys(sessions);
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function daysInWeek(days: Set<string>, weekStart: Date): number {
  let count = 0;
  for (let index = 0; index < 7; index += 1) {
    if (days.has(dayKey(addDays(weekStart, index)))) count += 1;
  }
  return count;
}

/** Consecutive weeks, including this one once the weekly goal is already met, with at least `goalDays` training days. */
export function weekStreak(sessions: SessionLog[], goalDays: number, now = new Date()): number {
  const days = activeDayKeys(sessions);
  let week = startOfWeek(now);
  if (daysInWeek(days, week) < goalDays) week = addDays(week, -7);
  let streak = 0;
  while (daysInWeek(days, week) >= goalDays && streak < 260) {
    streak += 1;
    week = addDays(week, -7);
  }
  return streak;
}

export function totalReps(sessions: SessionLog[]): number {
  return sessions.reduce((sum, session) => sum + session.exercises.reduce((inner, set) => inner + set.reps, 0), 0);
}

export function secondsBetween(sessions: SessionLog[], start: Date, end: Date): number {
  const from = start.getTime();
  const to = end.getTime();
  return sessions
    .filter((session) => {
      const time = new Date(session.endedAt).getTime();
      return time >= from && time <= to;
    })
    .reduce((sum, session) => sum + session.durationSec, 0);
}

export function todayCompletion(plan: DayPlan, sessions: SessionLog[], now = new Date()): number | null {
  if (plan.rest || plan.items.length === 0) return null;
  const planned = plan.items.reduce((sum, item) => sum + item.sets, 0);
  if (planned <= 0) return null;
  const key = dayKey(now);
  const ids = new Set(plan.items.map((item) => item.exerciseId));
  const done = sessions
    .filter((session) => dayKeyFromIso(session.endedAt) === key)
    .flatMap((session) => session.exercises)
    .filter((set) => ids.has(set.exerciseId)).length;
  return Math.min(100, Math.round((done / planned) * 100));
}

export interface WeekBar {
  name: string;
  sessions: number;
  minutes: number;
}

export function weekBars(sessions: SessionLog[], now = new Date()): WeekBar[] {
  const start = startOfWeek(now);
  return WEEKDAYS_SHORT.map((name, index) => {
    const key = dayKey(addDays(start, index));
    const list = sessions.filter((session) => dayKeyFromIso(session.endedAt) === key);
    return {
      name,
      sessions: list.length,
      minutes: Math.round(list.reduce((sum, session) => sum + session.durationSec, 0) / 60),
    };
  });
}

export interface TrendPoint {
  label: string;
  correct: number;
  minutes: number;
}

export function sessionTrend(sessions: SessionLog[]): TrendPoint[] {
  return sessions.slice(-12).map((session) => {
    const reps = session.exercises.reduce((sum, set) => sum + set.reps, 0);
    const good = session.exercises.reduce((sum, set) => sum + set.goodReps, 0);
    return {
      label: new Date(session.endedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      correct: reps === 0 ? 0 : Math.round((good / reps) * 100),
      minutes: Math.max(1, Math.round(session.durationSec / 60)),
    };
  });
}

export interface Records {
  bestReps: { exerciseId: string; reps: number }[];
  bestPlank: number;
  bestForm: number | null;
  longestSec: number;
}

export function records(sessions: SessionLog[]): Records {
  const best = new Map<string, number>();
  let bestPlank = 0;
  let bestForm: number | null = null;
  let longestSec = 0;
  for (const session of sessions) {
    longestSec = Math.max(longestSec, session.durationSec);
    for (const set of session.exercises) {
      best.set(set.exerciseId, Math.max(best.get(set.exerciseId) ?? 0, set.reps));
      bestPlank = Math.max(bestPlank, set.holdSeconds);
      if (set.avgFormScore != null) bestForm = bestForm == null ? set.avgFormScore : Math.max(bestForm, set.avgFormScore);
    }
  }
  return {
    bestReps: [...best.entries()]
      .filter(([, reps]) => reps > 0)
      .map(([exerciseId, reps]) => ({ exerciseId, reps }))
      .sort((a, b) => b.reps - a.reps),
    bestPlank,
    bestForm,
    longestSec,
  };
}

export const SAMPLE_WEEK: WeekBar[] = [
  { name: "Mon", sessions: 1, minutes: 28 },
  { name: "Tue", sessions: 0, minutes: 0 },
  { name: "Wed", sessions: 1, minutes: 32 },
  { name: "Thu", sessions: 0, minutes: 0 },
  { name: "Fri", sessions: 1, minutes: 24 },
  { name: "Sat", sessions: 0, minutes: 0 },
  { name: "Sun", sessions: 0, minutes: 0 },
];
