const POSES: Record<string, string> = {
  "push-ups": "M18 58 H78 M78 58 L104 86 M78 44 a8 8 0 1 0 0.1 0 M104 86 L132 90",
  squats: "M80 22 a8 8 0 1 0 0.1 0 M80 30 V52 L58 86 M80 52 L104 86 M58 86 V112 M104 86 V112 M62 48 H98",
  "sit-ups": "M28 78 H92 L118 48 M92 40 a8 8 0 1 0 0.1 0 M92 78 L118 96 L120 112",
  lunges: "M78 20 a8 8 0 1 0 0.1 0 M78 28 V54 L48 96 L46 116 M78 54 L112 92 L128 96 M58 46 H96",
  "bicep-curls": "M80 22 a8 8 0 1 0 0.1 0 M80 30 V78 M80 46 L58 62 L64 40 M80 46 L102 62 L96 40",
  "shoulder-press": "M80 28 a8 8 0 1 0 0.1 0 M80 36 V84 M62 48 H98 M70 48 L58 24 M90 48 L102 24",
  planks: "M24 64 H96 M96 50 a8 8 0 1 0 0.1 0 M96 64 L124 92 M36 64 L28 90",
  "jumping-jacks": "M80 20 a8 8 0 1 0 0.1 0 M80 28 V58 M80 40 L52 22 M80 40 L108 22 M80 58 L52 100 M80 58 L108 100",
};

export function Figure({ exerciseId, className = "" }: { exerciseId: string; className?: string }) {
  const d = POSES[exerciseId] ?? POSES["push-ups"];
  return (
    <svg viewBox="0 0 150 130" className={className} aria-hidden="true">
      <rect width="150" height="130" rx="24" fill="#101418" />
      <path d={d} fill="none" stroke="#B8FF3B" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
