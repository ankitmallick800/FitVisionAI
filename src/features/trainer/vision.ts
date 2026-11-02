interface PosePoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface PoseResult {
  landmarks?: PosePoint[][];
  worldLandmarks?: PosePoint[][];
}

export interface PoseDetector {
  detectForVideo: (video: HTMLVideoElement, timestamp: number) => PoseResult;
}

let pending: Promise<PoseDetector> | null = null;

export function loadPoseLandmarker(): Promise<PoseDetector> {
  if (!pending) {
    pending = createDetector().catch((error: unknown) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

async function createDetector(): Promise<PoseDetector> {
  if (typeof WebAssembly === "undefined") {
    throw new Error("This browser does not support WebAssembly, which on-device pose detection needs.");
  }
  const { PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const origin = window.location.origin;
  // MediaPipe appends "/vision_wasm_internal.js". A trailing slash becomes a double
  // slash: jsDelivr returns 400 and the script never runs.
  const wasmBase = (url: string) => url.replace(/\/+$/, "");
  const attempts = [
    { wasm: wasmBase(`${origin}/mediapipe`), model: `${origin}/models/pose_landmarker_lite.task` },
    {
      wasm: wasmBase("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm"),
      model: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
    },
  ];
  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      const vision = await FilesetResolver.forVisionTasks(attempt.wasm);
      try {
        return await PoseLandmarker.createFromOptions(vision, options(attempt.model, "GPU"));
      } catch (gpuError) {
        errors.push(gpuError instanceof Error ? gpuError.message : String(gpuError));
        return await PoseLandmarker.createFromOptions(vision, options(attempt.model, "CPU"));
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(errors.at(-1) || "The pose model could not be loaded.");
}

function options(modelAssetPath: string, delegate: "GPU" | "CPU") {
  return {
    baseOptions: { modelAssetPath, delegate },
    runningMode: "VIDEO" as const,
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };
}
