import { CurlAnalyzer } from "./curl";
import { JackAnalyzer } from "./jacks";
import { LungeAnalyzer } from "./lunge";
import { MovementAnalyzer } from "./machine";
import { PlankAnalyzer } from "./plank";
import { PressAnalyzer } from "./press";
import { PushupAnalyzer } from "./pushup";
import { SitupAnalyzer } from "./situp";
import { SquatAnalyzer } from "./squat";

export { MovementAnalyzer } from "./machine";

const FACTORIES: Record<string, () => MovementAnalyzer> = {
  "push-ups": () => new PushupAnalyzer(),
  squats: () => new SquatAnalyzer(),
  "sit-ups": () => new SitupAnalyzer(),
  lunges: () => new LungeAnalyzer(),
  "bicep-curls": () => new CurlAnalyzer(),
  "shoulder-press": () => new PressAnalyzer(),
  planks: () => new PlankAnalyzer(),
  "jumping-jacks": () => new JackAnalyzer(),
};

export const ANALYZER_IDS = Object.keys(FACTORIES);

export function createAnalyzer(id: string): MovementAnalyzer {
  const factory = FACTORIES[id];
  if (!factory) throw new Error(`No pose analyzer for ${id}`);
  return factory();
}
