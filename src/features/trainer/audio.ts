let audio: AudioContext | null = null;

export function unlockAudio(): void {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  if (!audio) audio = new Ctx();
  if (audio.state === "suspended") void audio.resume();
}

export function beep(kind: "good" | "warn"): void {
  if (!audio || audio.state !== "running") return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = kind === "good" ? 880 : 494;
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.045, audio.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.14);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + 0.15);
}
