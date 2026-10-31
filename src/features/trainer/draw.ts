import { POSE_EDGES } from "../../pose/connections";

interface Point {
  x: number;
  y: number;
  visibility?: number;
}

export function drawPose(canvas: HTMLCanvasElement, video: HTMLVideoElement, landmarks?: Point[]): void {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  if (landmarks?.length) {
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(3, width / 220);
    for (const [start, end] of POSE_EDGES) {
      const a = landmarks[start];
      const b = landmarks[end];
      if (!a || !b) continue;
      const visibility = Math.min(a.visibility ?? 0, b.visibility ?? 0);
      if (visibility < 0.35) continue;
      ctx.strokeStyle = visibility > 0.6 ? "rgba(184,255,59,0.95)" : "rgba(245,193,108,0.85)";
      ctx.beginPath();
      ctx.moveTo(a.x * width, a.y * height);
      ctx.lineTo(b.x * width, b.y * height);
      ctx.stroke();
    }
    for (const point of landmarks) {
      if ((point.visibility ?? 0) < 0.45) continue;
      ctx.fillStyle = "#F5F7FA";
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, Math.max(3.5, width / 170), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
