import { useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "starting" | "live" | "stopped" | "error";

function cameraMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera permission was blocked. Allow the camera for this site in the browser settings, then try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera was found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The camera is busy in another app or tab. Close it there and try again.";
  }
  if (name === "OverconstrainedError") {
    return "That camera could not be opened with the requested settings. Try another camera.";
  }
  return error instanceof Error ? error.message : "The camera could not be started.";
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");

  const stop = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus((current) => (current === "error" ? current : "stopped"));
  };

  const attach = async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    if (video.paused) await video.play();
  };

  const start = async (nextDeviceId?: string): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("This browser does not expose a camera API. Use a current version of Chrome, Edge, or Firefox.");
      return false;
    }
    setStatus("starting");
    setError(null);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    try {
      const chosen = nextDeviceId ?? deviceId;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          deviceId: chosen ? { exact: chosen } : undefined,
          facingMode: chosen ? undefined : "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      await attach(stream);
      const listed = await navigator.mediaDevices.enumerateDevices();
      setDevices(listed.filter((device) => device.kind === "videoinput"));
      const active = stream.getVideoTracks()[0]?.getSettings().deviceId;
      if (active) setDeviceId(active);
      setStatus("live");
      return true;
    } catch (caught) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStatus("error");
      setError(cameraMessage(caught));
      return false;
    }
  };

  useEffect(() => {
    const stream = streamRef.current;
    if (status === "live" && stream) {
      void attach(stream).catch(() => undefined);
    }
  }, [status]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { videoRef, status, error, devices, deviceId, setDeviceId, start, stop };
}
