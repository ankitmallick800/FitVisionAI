import { useEffect, useRef, useState, type RefObject } from "react";
import type { Calibration } from "../../domain/types";
import { createAnalyzer } from "../../pose";
import type { AnalysisSnapshot } from "../../pose/types";
import { drawPose } from "./draw";
import { loadPoseLandmarker, type PoseDetector } from "./vision";

interface Point {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

function toPoint(point: Point): Point {
  return { x: point.x, y: point.y, z: point.z, visibility: point.visibility ?? 0 };
}

export function useCoach(options: {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  exerciseId: string;
  enabled: boolean;
  calibration: Calibration;
}) {
  const analyzerRef = useRef(createAnalyzer(options.exerciseId));
  const landmarkerRef = useRef<PoseDetector | null>(null);
  const calibrationRef = useRef(options.calibration);
  calibrationRef.current = options.calibration;
  const [snap, setSnap] = useState<AnalysisSnapshot>(() => analyzerRef.current.snapshot());
  const [modelState, setModelState] = useState<"loading" | "ready" | "error">("loading");
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelAttempt, setModelAttempt] = useState(0);

  useEffect(() => {
    analyzerRef.current = createAnalyzer(options.exerciseId);
    setSnap(analyzerRef.current.snapshot());
  }, [options.exerciseId]);

  useEffect(() => {
    let cancel = false;
    loadPoseLandmarker()
      .then((detector) => {
        if (cancel) return;
        landmarkerRef.current = detector;
        setModelState("ready");
      })
      .catch((error: unknown) => {
        if (cancel) return;
        setModelState("error");
        setModelError(error instanceof Error ? error.message : "Pose detection failed to start.");
      });
    return () => {
      cancel = true;
    };
  }, [modelAttempt]);

  useEffect(() => {
    if (!options.enabled || modelState !== "ready") return;
    let frame = 0;
    let lastStamp = -1;
    let lastUi = 0;
    let lastKey = "";
    let brightness: number | undefined;
    const sample = document.createElement("canvas");
    sample.width = 16;
    sample.height = 16;
    const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
    let ticks = 0;

    const loop = () => {
      frame = requestAnimationFrame(loop);
      const video = options.videoRef.current;
      const canvas = options.canvasRef.current;
      const detector = landmarkerRef.current;
      if (!video || !canvas || !detector || video.readyState < 2 || document.hidden) return;
      let now = performance.now();
      if (now <= lastStamp) now = lastStamp + 1;
      lastStamp = now;
      let result;
      try {
        result = detector.detectForVideo(video, now);
      } catch {
        return;
      }
      ticks += 1;
      if (sampleCtx && ticks % 12 === 0) {
        try {
          sampleCtx.drawImage(video, 0, 0, 16, 16);
          const pixels = sampleCtx.getImageData(0, 0, 16, 16).data;
          let sum = 0;
          for (let index = 0; index < pixels.length; index += 4) {
            sum += 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
          }
          brightness = sum / (pixels.length / 4);
        } catch {
          brightness = undefined;
        }
      }
      const raw = result.landmarks?.[0];
      const world = result.worldLandmarks?.[0];
      drawPose(canvas, video, raw);
      const next = analyzerRef.current.update(
        {
          timestamp: now,
          landmarks: raw?.map(toPoint) ?? [],
          world: world?.map(toPoint),
          brightness,
        },
        calibrationRef.current,
      );
      const key = `${next.reps}|${next.phase}|${next.feedback}|${next.phaseLabel}|${Math.floor(next.holdMs / 200)}`;
      if (now - lastUi > 100 || key !== lastKey) {
        lastUi = now;
        lastKey = key;
        setSnap(next);
      }
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [options.enabled, options.exerciseId, modelState, options.videoRef, options.canvasRef]);

  return {
    snap,
    modelState,
    modelError,
    reset() {
      analyzerRef.current.reset();
      setSnap(analyzerRef.current.snapshot());
    },
    summary: () => analyzerRef.current.summary(),
    retryModel() {
      setModelState("loading");
      setModelError(null);
      setModelAttempt((attempt) => attempt + 1);
    },
  };
}
