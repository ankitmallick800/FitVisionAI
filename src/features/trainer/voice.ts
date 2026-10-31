let unlocked = false;
let lastLine = "";
let lastAt = 0;
let token = 0;
let pending = 0;
let keepalive = 0;

export function voiceSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function chooseVoice(): SpeechSynthesisVoice | null {
  if (!voiceSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const preferred = english.find((voice) => /natural|premium|enhanced|samantha|google uk english female|google us english/i.test(voice.name));
  return preferred ?? english.find((voice) => voice.localService) ?? english[0] ?? null;
}

/** Call from the camera button so later cues are allowed to play. */
export function unlockVoice(): void {
  if (!voiceSupported()) return;
  unlocked = true;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.resume();
}

export function stopVoice(): void {
  if (!voiceSupported()) return;
  token += 1;
  window.clearTimeout(pending);
  window.speechSynthesis.cancel();
  lastLine = "";
}

export function startVoiceKeepalive(): () => void {
  if (!voiceSupported()) return () => undefined;
  window.clearInterval(keepalive);
  keepalive = window.setInterval(() => {
    if (!window.speechSynthesis.speaking) return;
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
  }, 10000);
  return () => window.clearInterval(keepalive);
}

export function speakCoach(text: string, options?: { interrupt?: boolean; force?: boolean }): boolean {
  if (!unlocked || !voiceSupported()) return false;
  const line = text.replace(/\s+/g, " ").trim();
  if (!line) return false;
  const now = Date.now();
  if (!options?.force && line === lastLine && now - lastAt < 900) return false;
  if (!options?.interrupt && window.speechSynthesis.speaking) return false;
  lastLine = line;
  lastAt = now;
  const id = ++token;
  const utter = new SpeechSynthesisUtterance(line);
  const voice = chooseVoice();
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  } else {
    utter.lang = "en-US";
  }
  utter.rate = 1.04;
  utter.pitch = 1;
  utter.volume = 1;
  const say = () => {
    if (id !== token) return;
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utter);
  };
  if (options?.interrupt && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    pending = window.setTimeout(say, 60);
  } else {
    say();
  }
  return true;
}
