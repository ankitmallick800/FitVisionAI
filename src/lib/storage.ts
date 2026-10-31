import { useSyncExternalStore } from "react";
import { defaultCalibrationFor, DEFAULT_CALIBRATION, type Profile, type SessionLog, type Settings, type WeightEntry, type DayMeals } from "../domain/types";

const KEYS = {
  profile: "fitvision.profile.v1",
  sessions: "fitvision.sessions.v1",
  weights: "fitvision.weights.v1",
  settings: "fitvision.settings.v1",
  meals: "fitvision.meals.v1",
} as const;

type Listener = () => void;

function browser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function createStore<T>(key: string, fallback: T) {
  let cache: { raw: string | null; value: T } | null = null;
  const listeners = new Set<Listener>();

  const read = (): T => {
    if (!browser()) return fallback;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      raw = null;
    }
    if (cache && cache.raw === raw) return cache.value;
    let value = fallback;
    if (raw) {
      try {
        value = JSON.parse(raw) as T;
      } catch {
        value = fallback;
      }
    }
    cache = { raw, value };
    return value;
  };

  const write = (value: T) => {
    if (!browser()) return;
    const raw = JSON.stringify(value);
    localStorage.setItem(key, raw);
    cache = { raw, value };
    listeners.forEach((listener) => listener());
  };

  const clear = () => {
    if (!browser()) return;
    localStorage.removeItem(key);
    cache = { raw: null, value: fallback };
    listeners.forEach((listener) => listener());
  };

  const invalidate = () => {
    cache = null;
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { read, write, clear, invalidate, subscribe };
}

const EMPTY_SESSIONS: SessionLog[] = [];
const EMPTY_WEIGHTS: WeightEntry[] = [];
const EMPTY_MEALS: DayMeals[] = [];

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  voice: true,
  calibration: { ...DEFAULT_CALIBRATION },
};

const profileStore = createStore<Profile | null>(KEYS.profile, null);
const sessionStore = createStore<SessionLog[]>(KEYS.sessions, EMPTY_SESSIONS);
const weightStore = createStore<WeightEntry[]>(KEYS.weights, EMPTY_WEIGHTS);
const settingsStore = createStore<Settings>(KEYS.settings, DEFAULT_SETTINGS);
const mealStore = createStore<DayMeals[]>(KEYS.meals, EMPTY_MEALS);

if (browser()) {
  window.addEventListener("storage", () => {
    profileStore.invalidate();
    sessionStore.invalidate();
    weightStore.invalidate();
    settingsStore.invalidate();
    mealStore.invalidate();
  });
}

function useStore<T>(store: { subscribe: (listener: Listener) => () => void; read: () => T }): T {
  return useSyncExternalStore(store.subscribe, store.read, store.read);
}

export function useProfile(): Profile | null {
  return useStore(profileStore);
}

export function useSessions(): SessionLog[] {
  return useStore(sessionStore);
}

export function useWeights(): WeightEntry[] {
  return useStore(weightStore);
}

export function useSettings(): Settings {
  const settings = useStore(settingsStore);
  return {
    sound: settings.sound ?? true,
    voice: settings.voice ?? true,
    calibration: { ...DEFAULT_CALIBRATION, ...settings.calibration },
  };
}

export function useMealLog(): DayMeals[] {
  return useStore(mealStore);
}

export function saveProfile(profile: Profile): void {
  const previous = profileStore.read();
  profileStore.write(profile);
  if (!previous) {
    const settings = settingsStore.read();
    settingsStore.write({ ...settings, calibration: defaultCalibrationFor(profile) });
  }
}

export function saveSettings(settings: Settings): void {
  settingsStore.write(settings);
}

export function addSession(session: SessionLog): void {
  sessionStore.write([...sessionStore.read(), session]);
}

export function deleteSession(id: string): void {
  sessionStore.write(sessionStore.read().filter((session) => session.id !== id));
}

export function addWeight(entry: WeightEntry): void {
  const rest = weightStore.read().filter((item) => item.date !== entry.date);
  weightStore.write([...rest, entry].sort((a, b) => a.date.localeCompare(b.date)));
}

export function saveMealDay(day: DayMeals): void {
  const rest = mealStore.read().filter((item) => item.date !== day.date);
  mealStore.write([...rest, day]);
}

export function mealDay(date: string): DayMeals | undefined {
  return mealStore.read().find((item) => item.date === date);
}

export function exportPayload(): string {
  return JSON.stringify(
    {
      profile: profileStore.read(),
      sessions: sessionStore.read(),
      weights: weightStore.read(),
      settings: settingsStore.read(),
      meals: mealStore.read(),
    },
    null,
    2,
  );
}

export function clearAllData(): void {
  profileStore.clear();
  sessionStore.clear();
  weightStore.clear();
  settingsStore.clear();
  mealStore.clear();
}
