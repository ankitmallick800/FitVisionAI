import type { Experience } from "./types";

export interface ExerciseContent {
  id: string;
  name: string;
  muscles: string[];
  difficulty: Experience;
  equipment: string;
  hold: boolean;
  camera: "side" | "front";
  setup: string;
  instructions: string[];
  posture: string[];
  mistakes: string[];
  easier: string;
  harder: string;
}

export const EXERCISES: ExerciseContent[] = [
  {
    id: "push-ups",
    name: "Push-ups",
    muscles: ["Chest", "Shoulders", "Triceps", "Core"],
    difficulty: "beginner",
    equipment: "Bodyweight",
    hold: false,
    camera: "side",
    setup: "Turn sideways, step back, and keep your head and feet in frame.",
    instructions: [
      "Set your hands under your shoulders and step your feet back.",
      "Brace lightly so your body starts in one line.",
      "Bend the elbows and lower until the upper arms move well past the start.",
      "Press the floor away and finish with the arms extended.",
    ],
    posture: [
      "Wrists under shoulders, or slightly wider if that feels better.",
      "Ribs and hips move together.",
      "Look a little ahead of your hands rather than craning the neck.",
    ],
    mistakes: ["Hips sagging or piking while the arms bend.", "Only bending a few degrees and calling it a rep.", "Flaring the elbows until the shoulders feel pinched."],
    easier: "Hands on a bench, or knees down, as long as the body line stays long.",
    harder: "Elevate the feet, or slow the lowering to about three seconds.",
  },
  {
    id: "squats",
    name: "Bodyweight squats",
    muscles: ["Quads", "Glutes", "Core"],
    difficulty: "beginner",
    equipment: "Bodyweight",
    hold: false,
    camera: "side",
    setup: "A side or three-quarter view reads depth better than a straight-on view.",
    instructions: [
      "Stand with your feet about shoulder width and the whole body in frame.",
      "Sit the hips back and bend the knees together.",
      "Go to the depth you chose in calibration, then stand tall.",
      "Finish with the legs extended before the next rep.",
    ],
    posture: [
      "Heels stay down if that is comfortable.",
      "Knees can travel forward. A single camera cannot score that perfectly.",
      "Chest stays as tall as your hips allow.",
    ],
    mistakes: ["Bouncing out of the bottom.", "Stopping well above the selected depth.", "Letting the torso collapse if a taller posture is available."],
    easier: "Sit to a chair and stand up, using the easier depth setting.",
    harder: "Pause for a second at the bottom, or hold a light weight at your chest.",
  },
  {
    id: "sit-ups",
    name: "Sit-ups",
    muscles: ["Abdominals", "Hip flexors"],
    difficulty: "beginner",
    equipment: "Mat optional",
    hold: false,
    camera: "side",
    setup: "Lie with your side toward the camera, knees bent, shoulders and hips visible.",
    instructions: [
      "Start with the trunk down.",
      "Curl up through a comfortable range.",
      "Pause briefly if you like, then return until the trunk is down again.",
    ],
    posture: ["Move the ribs toward the pelvis rather than yanking the neck.", "Keep the feet relaxed. Anchor them only if you need the balance."],
    mistakes: ["A tiny rock that never changes the trunk angle.", "Using speed instead of range."],
    easier: "Raise only the shoulder blades, and use the easier range setting.",
    harder: "Slow the lowering, or reach the arms overhead if the neck stays comfortable.",
  },
  {
    id: "lunges",
    name: "Lunges",
    muscles: ["Quads", "Glutes", "Hamstrings"],
    difficulty: "intermediate",
    equipment: "Bodyweight",
    hold: false,
    camera: "side",
    setup: "Turn slightly so both knees are visible. Alternate the lead leg.",
    instructions: [
      "Stand tall.",
      "Step one foot forward and lower until the front knee reaches your depth setting.",
      "Push through the front foot and return to both legs straight.",
      "The counter tracks left and right separately.",
    ],
    posture: ["Torso stays tall enough that you are not folding onto the front thigh.", "The step should look clearly different from a squat."],
    mistakes: ["A short step that becomes a two-leg squat.", "Not returning to a full stand."],
    easier: "Hold a wall and use a shorter, higher range.",
    harder: "Pause at the bottom, or add a light weight.",
  },
  {
    id: "bicep-curls",
    name: "Bicep curls",
    muscles: ["Biceps", "Forearms"],
    difficulty: "beginner",
    equipment: "Dumbbells, bands, or water bottles",
    hold: false,
    camera: "front",
    setup: "Face the camera so the elbows and hands stay in frame.",
    instructions: [
      "Start with the arms long.",
      "Curl the hands toward the shoulders without swinging the trunk.",
      "Lower until the arms are long again.",
    ],
    posture: ["Elbows stay near the sides.", "The torso is a stable post, not a pendulum."],
    mistakes: ["Leaning back to finish the curl.", "Stopping halfway down."],
    easier: "Use a lighter bottle, or curl one arm at a time.",
    harder: "Slow the lowering to three seconds.",
  },
  {
    id: "shoulder-press",
    name: "Shoulder press",
    muscles: ["Shoulders", "Triceps"],
    difficulty: "intermediate",
    equipment: "Dumbbells, bands, or water bottles",
    hold: false,
    camera: "front",
    setup: "Face the camera. Start with your hands near shoulder height.",
    instructions: [
      "Press the hands up until they are clearly above the shoulders and the elbows extend.",
      "Lower back to shoulder height to finish the rep.",
    ],
    posture: ["Ribs stay stacked over the hips.", "Do not turn it into a deep back bend to get the hands up."],
    mistakes: ["Stopping with the hands still at eye level.", "Using the legs or a big lean to finish."],
    easier: "Press one arm at a time, seated, with a light load.",
    harder: "Pause overhead for a second, if the shoulders feel fine.",
  },
  {
    id: "planks",
    name: "Planks",
    muscles: ["Core", "Shoulders", "Glutes"],
    difficulty: "beginner",
    equipment: "Bodyweight",
    hold: true,
    camera: "side",
    setup: "Turn sideways. The timer starts only when a plank line is steady.",
    instructions: [
      "Set a high plank or a forearm plank.",
      "Hold the line. The timer pauses if the shape breaks or the camera loses you.",
      "This exercise is timed. It is never counted as repetitions.",
    ],
    posture: ["Shoulders over wrists or elbows.", "Hips neither hanging down nor piking up."],
    mistakes: ["Holding the breath.", "A very short hold that never settles into the shape."],
    easier: "Knees down, or hands on a bench.",
    harder: "Longer holds, or a slow shoulder tap if the hips stay level.",
  },
  {
    id: "jumping-jacks",
    name: "Jumping jacks",
    muscles: ["Calves", "Shoulders", "Heart and lungs"],
    difficulty: "beginner",
    equipment: "Bodyweight",
    hold: false,
    camera: "front",
    setup: "Face the camera with your hands and feet in frame. You can step instead of jump.",
    instructions: [
      "Start with feet together and arms down.",
      "Open the feet and raise both arms.",
      "Return to the closed position to count one rep.",
    ],
    posture: ["Land softly if you jump.", "A step-out counts when the open and closed shapes are both clear."],
    mistakes: ["Waving only the arms.", "A partial step that never spreads the feet."],
    easier: "Step one foot out at a time and raise the arms without jumping.",
    harder: "A steady pace for the higher endurance rep target.",
  },
];

export function exerciseById(id: string): ExerciseContent | undefined {
  return EXERCISES.find((exercise) => exercise.id === id);
}
