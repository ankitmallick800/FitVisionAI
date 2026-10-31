import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AudioLines, Camera, Pause, Play, RotateCcw, Square, Volume2, VolumeX } from "lucide-react";
import { exerciseById } from "../domain/exercises";
import { formatDuration, uid } from "../domain/format";
import { prescribeOne, todayPlan } from "../domain/plan";
import type { Depth, PlannedExercise, SessionLog, SetLog } from "../domain/types";
import { beep, unlockAudio } from "../features/trainer/audio";
import { EMPTY_CUE_MEMORY, nextCoachLine, type CueMemory } from "../features/trainer/voiceCue";
import { speakCoach, startVoiceKeepalive, stopVoice, unlockVoice, voiceSupported } from "../features/trainer/voice";
import { useCamera } from "../features/trainer/useCamera";
import { useCoach } from "../features/trainer/useCoach";
import { addSession, saveSettings, useProfile, useSessions, useSettings } from "../lib/storage";
import type { AnalyzerSummary } from "../pose/types";
import { Button, Dialog, Disclaimer, useTitle } from "../components/ui";

type Mode = "preview" | "live" | "rest" | "summary";
type After = "set" | "exercise" | "done";

function toLog(item: PlannedExercise, setIndex: number, summary: AnalyzerSummary, durationSec: number): SetLog {
  return {
    exerciseId: item.exerciseId,
    setIndex,
    targetReps: item.reps,
    targetSeconds: item.seconds,
    reps: summary.reps,
    goodReps: summary.goodReps,
    correctedReps: summary.correctedReps,
    holdSeconds: summary.holdSeconds,
    avgFormScore: summary.avgFormScore,
    durationSec,
    feedbackCounts: summary.feedbackCounts,
    leftReps: summary.leftReps,
    rightReps: summary.rightReps,
  };
}

export function TrainerPage() {
  const { exerciseId = "" } = useParams();
  const profile = useProfile();
  const sessions = useSessions();
  const settings = useSettings();
  const camera = useCamera();
  const [queue] = useState<PlannedExercise[]>(() => {
    if (!profile) return [];
    if (exerciseId === "plan") {
      const day = todayPlan(profile, sessions);
      return day.rest ? [] : day.items;
    }
    return exerciseById(exerciseId) ? [prescribeOne(exerciseId, profile, sessions)] : [];
  });
  const [index, setIndex] = useState(0);
  const [setNumber, setSetNumber] = useState(1);
  const [logs, setLogs] = useState<SetLog[]>([]);
  const [mode, setMode] = useState<Mode>("preview");
  const [paused, setPaused] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [after, setAfter] = useState<After>("set");
  const [elapsed, setElapsed] = useState(0);
  const [summary, setSummary] = useState<SessionLog | null>(null);
  const [askFinish, setAskFinish] = useState(false);
  const [askRestart, setAskRestart] = useState(false);
  const [restDay] = useState(() => (profile && exerciseId === "plan" ? todayPlan(profile, sessions).rest : false));
  const elapsedRef = useRef(0);
  const runStamp = useRef<number | null>(null);
  const setStamp = useRef(Date.now());
  const prevReps = useRef(0);
  const voiceMemory = useRef<CueMemory>(EMPTY_CUE_MEMORY);
  const wasPaused = useRef(false);
  const restAnnounce = useRef(0);
  restAnnounce.current = restLeft;
  const advancing = useRef(false);
  const saved = useRef(false);
  const afterRef = useRef<After>("set");
  const logsRef = useRef<SetLog[]>([]);
  afterRef.current = after;
  logsRef.current = logs;

  const current = queue[index];
  const exercise = current ? exerciseById(current.exerciseId) : undefined;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coach = useCoach({
    videoRef: camera.videoRef,
    canvasRef,
    exerciseId: current?.exerciseId ?? "push-ups",
    enabled: mode === "live" && !paused && camera.status === "live",
    calibration: settings.calibration,
  });
  useTitle(exercise?.name ?? "Trainer");

  useEffect(() => {
    if (coach.snap.reps > prevReps.current && settings.sound && mode === "live") {
      beep(coach.snap.tone === "warn" ? "warn" : "good");
    }
    prevReps.current = coach.snap.reps;
  }, [coach.snap.reps, coach.snap.tone, settings.sound, mode]);

  useEffect(() => {
    voiceMemory.current = EMPTY_CUE_MEMORY;
  }, [index, setNumber]);

  const voiceKey = `${coach.snap.reps}|${coach.snap.feedback}|${coach.snap.cues[0] ?? ""}|${Math.floor(coach.snap.holdMs / 1000)}`;
  useEffect(() => {
    if (!settings.voice || mode !== "live" || paused) return;
    const snap = coach.snap;
    const timed = current?.seconds != null;
    const timer = window.setTimeout(() => {
      const decision = nextCoachLine(
        {
          reps: snap.reps,
          feedback: snap.feedback,
          cue: snap.cues[0] ?? "",
          holdSeconds: Math.floor(snap.holdMs / 1000),
        },
        voiceMemory.current,
        timed,
      );
      if (!decision.line) {
        voiceMemory.current = decision.memory;
        return;
      }
      if (speakCoach(decision.line, { interrupt: decision.interrupt })) voiceMemory.current = decision.memory;
    }, 280);
    return () => window.clearTimeout(timer);
  }, [settings.voice, mode, paused, voiceKey, current?.seconds, coach.snap.reps, coach.snap.feedback, coach.snap.cues, coach.snap.holdMs]);

  useEffect(() => {
    if (!settings.voice || mode !== "rest") return;
    const seconds = restAnnounce.current;
    const upcoming = after === "exercise" ? exerciseById(queue[index + 1]?.exerciseId ?? "")?.name : exercise?.name;
    if (after === "done") speakCoach("Workout complete. Catch your breath. The summary opens next.", { interrupt: true });
    else if (after === "exercise") speakCoach(`Rest ${seconds} seconds. Next is ${upcoming ?? "the next exercise"}.`, { interrupt: true });
    else speakCoach(`Rest ${seconds} seconds. Then another set of ${upcoming ?? "this exercise"}.`, { interrupt: true });
  }, [settings.voice, mode, after, index, queue, exercise?.name]);

  useEffect(() => {
    const entered = paused && !wasPaused.current;
    const left = !paused && wasPaused.current;
    wasPaused.current = paused;
    if (!settings.voice || mode !== "live") return;
    if (entered) speakCoach("Paused.", { interrupt: true });
    if (left) {
      const line = coach.snap.feedback || "Continue.";
      if (speakCoach(line, { interrupt: true, force: true })) {
        voiceMemory.current = { ...voiceMemory.current, feedback: line };
      }
    }
  }, [paused, settings.voice, mode, coach.snap.feedback]);

  useEffect(() => {
    if (!settings.voice) {
      stopVoice();
      return;
    }
    if (mode !== "live" && mode !== "rest") return;
    return startVoiceKeepalive();
  }, [settings.voice, mode]);

  useEffect(() => () => stopVoice(), []);

  useEffect(() => {
    const running = (mode === "live" && !paused) || mode === "rest";
    if (!running) {
      if (runStamp.current != null) {
        elapsedRef.current += Date.now() - runStamp.current;
        runStamp.current = null;
        setElapsed(Math.floor(elapsedRef.current / 1000));
      }
      return;
    }
    runStamp.current = Date.now();
    const id = window.setInterval(() => {
      const extra = runStamp.current ? Date.now() - runStamp.current : 0;
      setElapsed(Math.floor((elapsedRef.current + extra) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [mode, paused]);

  useEffect(() => {
    setStamp.current = Date.now();
  }, [index, setNumber]);

  const finishSession = (extra?: SetLog) => {
    if (saved.current) return;
    const exercises = extra ? [...logsRef.current, extra] : logsRef.current;
    if (!exercises.length) {
      camera.stop();
      setMode("preview");
      return;
    }
    saved.current = true;
    const end = new Date();
    const session: SessionLog = {
      id: uid(),
      startedAt: new Date(end.getTime() - Math.max(elapsed, 1) * 1000).toISOString(),
      endedAt: end.toISOString(),
      durationSec: Math.max(elapsed, 1),
      mode: exerciseId === "plan" ? "plan" : "single",
      exercises,
    };
    addSession(session);
    camera.stop();
    setSummary(session);
    setMode("summary");
  };

  const advanceRef = useRef<() => void>(() => undefined);
  advanceRef.current = () => {
    if (advancing.current) return;
    advancing.current = true;
    const kind = afterRef.current;
    if (kind === "set") {
      setSetNumber((value) => value + 1);
      setMode("live");
    } else if (kind === "exercise") {
      setIndex((value) => value + 1);
      setSetNumber(1);
      setMode("live");
    } else {
      finishSession();
    }
  };

  useEffect(() => {
    if (mode === "live") advancing.current = false;
  }, [mode]);

  useEffect(() => {
    if (mode !== "rest") return;
    let fired = false;
    const id = window.setInterval(() => {
      setRestLeft((value) => {
        if (value <= 1) {
          if (!fired) {
            fired = true;
            window.setTimeout(() => advanceRef.current(), 0);
          }
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [mode]);

  const completeSet = () => {
    if (!current) return;
    const entry = toLog(current, setNumber, coach.summary(), Math.max(1, Math.round((Date.now() - setStamp.current) / 1000)));
    setLogs((prev) => [...prev, entry]);
    logsRef.current = [...logsRef.current, entry];
    coach.reset();
    prevReps.current = 0;
    const next: After = setNumber < current.sets ? "set" : index < queue.length - 1 ? "exercise" : "done";
    setAfter(next);
    afterRef.current = next;
    setRestLeft(next === "done" ? 8 : current.restSec);
    setPaused(false);
    setMode("rest");
  };

  const completeRef = useRef(completeSet);
  completeRef.current = completeSet;
  const armed = useRef(false);
  useEffect(() => {
    armed.current = false;
  }, [index, setNumber, mode]);
  useEffect(() => {
    if (mode !== "live" || paused || !current || armed.current) return;
    const reached =
      current.seconds != null ? coach.snap.holdMs / 1000 >= current.seconds : current.reps != null && coach.snap.reps >= current.reps;
    if (!reached) return;
    armed.current = true;
    completeRef.current();
  }, [coach.snap.reps, coach.snap.holdMs, mode, paused, current]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (event.key === " " && mode === "live") {
        event.preventDefault();
        setPaused((value) => !value);
      }
      if (event.key === "Escape" && (mode === "live" || mode === "rest")) setAskFinish(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  if (!profile) return null;
  const unsupported = typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof WebAssembly === "undefined";

  if (!queue.length) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg py-16">
          <h1 className="text-3xl font-semibold">{restDay ? "Recovery day" : "Exercise not found"}</h1>
          <p className="mt-3 text-sm leading-6 text-mute">
            {restDay
              ? "Today is a rest day in your plan. An easy walk is optional. You can still open any exercise in the library."
              : "That movement is not in the trainer."}
          </p>
          <Link to={restDay ? "/app/library" : "/app/workouts"} className="mt-6 inline-flex rounded-full bg-lime px-4 py-2 text-sm font-semibold text-bg">
            {restDay ? "Exercise library" : "Back to the plan"}
          </Link>
        </div>
      </Shell>
    );
  }

  if (mode === "summary" && summary) {
    return <SummaryView session={summary} />;
  }

  const snap = coach.snap;
  const primary = current.seconds != null ? Math.floor(snap.holdMs / 1000) : snap.reps;
  const target = current.seconds != null ? `${current.seconds}s` : String(current.reps ?? "—");
  const tone = snap.tone === "good" ? "text-lime" : snap.tone === "warn" ? "text-amber" : "text-ink";
  const showCanvas = camera.status === "live" && coach.modelState === "ready";

  const setDepth = (depth: Depth) => saveSettings({ ...settings, calibration: { ...settings.calibration, depth } });
  const steady = settings.calibration.stableFrames >= 3;

  return (
    <Shell>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="relative bg-black lg:sticky lg:top-0 lg:h-dvh">
          <video
            ref={camera.videoRef}
            className={
              showCanvas
                ? "pointer-events-none absolute inset-0 h-full w-full object-contain opacity-0"
                : "h-[42vh] w-full object-contain scale-x-[-1] sm:h-[52vh] lg:h-dvh"
            }
            playsInline
            muted
            autoPlay
          />
          <canvas ref={canvasRef} className={showCanvas ? "h-[42vh] w-full object-contain sm:h-[52vh] lg:h-dvh" : "hidden"} />
          {mode === "preview" ? (
            <div className="absolute inset-0 grid place-items-center bg-bg/80 p-6">
              <div className="max-w-md">
                <p className="text-xs uppercase tracking-[0.16em] text-lime">{exercise?.camera === "front" ? "Face the camera" : "Side view"}</p>
                <h1 className="mt-2 text-3xl font-semibold">{exercise?.name}</h1>
                <p className="mt-3 text-sm leading-6 text-mute">{exercise?.setup}</p>
                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-mute">
                  <li>Keep the joints for this exercise inside the frame.</li>
                  <li>Use even light. Avoid a bright window behind you.</li>
                  <li>Hold the camera upright, about hip to chest height.</li>
                  <li>The video is processed on this device and is not recorded.</li>
                  <li>Voice coaching speaks the next move, each counted rep, and the rest.</li>
                </ul>
                {!voiceSupported() ? <p className="mt-4 text-sm text-mute">This browser cannot speak aloud. The written cues still update.</p> : null}
                {unsupported ? <p className="mt-4 text-sm text-danger">This browser cannot open a camera or run the pose model.</p> : null}
                {camera.error ? <p className="mt-4 text-sm text-danger">{camera.error}</p> : null}
                {coach.modelState === "error" ? <p className="mt-4 text-sm text-danger">{coach.modelError}</p> : null}
                {coach.modelState === "loading" ? <p className="mt-4 text-sm text-mute">Preparing pose detection…</p> : null}
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button
                    disabled={unsupported || camera.status === "starting" || coach.modelState === "loading"}
                    onClick={() => {
                      unlockAudio();
                      unlockVoice();
                      if (settings.voice) speakCoach(`${exercise?.name ?? "Workout"}. I'll talk you through the movement.`, { interrupt: true });
                      void camera.start().then((ok) => {
                        if (ok) setMode("live");
                      });
                    }}
                  >
                    <Camera size={16} /> {camera.status === "error" ? "Try camera again" : "Enable camera"}
                  </Button>
                  {coach.modelState === "error" ? (
                    <Button variant="ghost" onClick={() => coach.retryModel()}>
                      Retry pose detection
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
          {paused && mode === "live" ? <div className="absolute left-4 top-4 rounded-full bg-bg/80 px-3 py-1 text-sm">Paused</div> : null}
          {mode === "rest" ? (
            <div className="absolute inset-0 grid place-items-center bg-bg/85 p-6 text-center">
              <div>
                <p className="text-sm text-mute">{after === "done" ? "Plan complete" : "Rest"}</p>
                <p className="mt-2 font-mono text-6xl">{restLeft}</p>
                <p className="mt-3 text-sm text-mute">{after === "done" ? "The session saves when rest ends." : after === "exercise" ? "Next exercise is next." : "Next set is next."}</p>
                <Button className="mt-6" onClick={() => advanceRef.current()}>
                  {after === "done" ? "View summary" : "Skip rest"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        <aside className="flex flex-col gap-4 border-l border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-mute">
                Set {setNumber} of {current.sets}
              </p>
              <h1 className="text-2xl font-semibold">{exercise?.name}</h1>
            </div>
            <p className="font-mono text-sm text-mute">{formatDuration(elapsed)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Readout label={current.seconds != null ? "Hold" : "Reps"} value={`${primary}`} detail={`Target ${target}`} />
            <Readout label="Clean reps" value={current.seconds != null ? "—" : String(snap.goodReps)} detail={`${snap.correctedReps} to clean up`} />
            <Readout label="Phase" value={snap.phaseLabel} detail={statusLabel(snap.status)} />
            <Readout label="Form" value={snap.formScore == null ? "—" : String(snap.formScore)} detail={snap.formScore == null ? "Unable to assess" : "Coaching score"} />
          </div>
          {camera.error ? <p className="text-sm text-danger">{camera.error}</p> : null}
          {coach.modelState === "error" ? (
            <p className="text-sm text-danger">
              {coach.modelError}{" "}
              <button className="underline" onClick={() => coach.retryModel()}>
                Retry
              </button>
            </p>
          ) : null}
          {coach.modelState === "loading" ? <p className="text-sm text-mute">Preparing pose detection…</p> : null}
          <p className={`min-h-12 text-lg font-medium ${tone}`} aria-live="polite">
            {mode === "live" ? snap.feedback : "Camera is ready when you enable it."}
          </p>
          {snap.cues[0] ? <p className="text-sm text-amber">{snap.cues[0]}</p> : null}
          <p className="text-xs text-mute">Landmark confidence {Math.round(snap.visibility * 100)}%. {snap.metrics.map((metric) => `${metric.label} ${metric.value}`).join(" · ")}</p>
          {current.exerciseId === "lunges" ? (
            <p className="text-sm text-mute">
              Left {snap.leftReps} · right {snap.rightReps}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setPaused((value) => !value)} disabled={mode !== "live"}>
              {paused ? <Play size={16} /> : <Pause size={16} />} {paused ? "Resume" : "Pause"}
            </Button>
            <Button variant="ghost" onClick={() => setAskRestart(true)} disabled={mode !== "live"}>
              <RotateCcw size={16} /> Restart set
            </Button>
            <Button variant="ghost" className={settings.sound ? "border-lime text-lime" : ""} aria-pressed={settings.sound} onClick={() => saveSettings({ ...settings, sound: !settings.sound })}>
              {settings.sound ? <Volume2 size={16} /> : <VolumeX size={16} />} Beeps
            </Button>
            <Button
              variant="ghost"
              className={settings.voice ? "border-lime text-lime" : ""}
              aria-pressed={settings.voice}
              disabled={!voiceSupported()}
              onClick={() => {
                const next = !settings.voice;
                saveSettings({ ...settings, voice: next });
                if (next) {
                  unlockVoice();
                  speakCoach("Voice coaching on.", { interrupt: true, force: true });
                } else stopVoice();
              }}
            >
              <AudioLines size={16} /> Voice
            </Button>
            <Button variant="danger" className="col-span-2" onClick={() => setAskFinish(true)}>
              <Square size={16} /> Finish
            </Button>
          </div>
          {camera.devices.length > 1 ? (
            <label className="text-sm text-mute">
              Camera
              <select
                className="mt-2 w-full rounded-2xl border border-line bg-bg px-3 py-2 text-ink"
                value={camera.deviceId}
                onChange={(event) => {
                  camera.setDeviceId(event.target.value);
                  void camera.start(event.target.value);
                }}
              >
                {camera.devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || "Camera"}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <details className="rounded-2xl border border-line p-3 text-sm">
            <summary className="cursor-pointer font-medium">Calibrate counting</summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["easier", "standard", "deeper"] as Depth[]).map((depth) => (
                <button key={depth} className={`rounded-full border px-3 py-1 capitalize ${settings.calibration.depth === depth ? "border-lime text-lime" : "border-line text-mute"}`} onClick={() => setDepth(depth)}>
                  {depth}
                </button>
              ))}
            </div>
            <button
              className="mt-3 text-mute"
              onClick={() =>
                saveSettings({
                  ...settings,
                  calibration: { ...settings.calibration, smoothAlpha: steady ? 0.65 : 0.35, stableFrames: steady ? 2 : 3 },
                })
              }
            >
              Response: {steady ? "Steady" : "Responsive"}
            </button>
          </details>
          {queue.length > 1 ? (
            <p className="text-xs text-mute">
              Exercise {index + 1} of {queue.length}
            </p>
          ) : null}
          <Disclaimer />
        </aside>
      </div>
      <Dialog
        open={askRestart}
        title="Restart this set?"
        body="The current counter goes back to zero. Sets you already finished in this session stay."
        confirmLabel="Restart set"
        onClose={() => setAskRestart(false)}
        onConfirm={() => {
          coach.reset();
          prevReps.current = 0;
          voiceMemory.current = EMPTY_CUE_MEMORY;
          wasPaused.current = false;
          setStamp.current = Date.now();
          setPaused(false);
          setAskRestart(false);
        }}
      />
      <Dialog
        open={askFinish}
        title="Finish the workout?"
        body={logs.length || snap.reps > 0 || snap.holdMs > 0 ? "Completed sets are saved. A set already in progress is included if it has reps or hold time." : "Nothing has been counted yet, so nothing will be saved."}
        confirmLabel="Finish"
        onClose={() => setAskFinish(false)}
        onConfirm={() => {
          setAskFinish(false);
          const summaryNow = coach.summary();
          const extra = current && (summaryNow.reps > 0 || summaryNow.holdSeconds > 0) ? toLog(current, setNumber, summaryNow, Math.max(1, Math.round((Date.now() - setStamp.current) / 1000))) : undefined;
          finishSession(extra);
        }}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-bg text-ink">{children}</div>;
}

function Readout({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-line bg-bg px-3 py-3">
      <p className="text-[11px] uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-1 font-mono text-xl leading-tight">{value}</p>
      <p className="text-xs text-mute">{detail}</p>
    </div>
  );
}

function statusLabel(status: string): string {
  if (status === "tracking") return "Tracking";
  if (status === "partial") return "Partial view";
  if (status === "low_confidence") return "Low confidence";
  return "Looking for you";
}

function SummaryView({ session }: { session: SessionLog }) {
  const reps = session.exercises.reduce((sum, set) => sum + set.reps, 0);
  const good = session.exercises.reduce((sum, set) => sum + set.goodReps, 0);
  const corrected = session.exercises.reduce((sum, set) => sum + set.correctedReps, 0);
  const scores = session.exercises.flatMap((set) => (set.avgFormScore == null ? [] : [set.avgFormScore]));
  const form = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
  const notes = new Map<string, number>();
  for (const set of session.exercises) {
    for (const [note, count] of Object.entries(set.feedbackCounts)) notes.set(note, (notes.get(note) ?? 0) + count);
  }
  const common = [...notes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const grouped = new Map<string, SetLog[]>();
  for (const set of session.exercises) {
    grouped.set(set.exerciseId, [...(grouped.get(set.exerciseId) ?? []), set]);
  }
  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <p className="text-xs uppercase tracking-[0.16em] text-lime">Saved on this device</p>
        <h1 className="text-4xl font-semibold">Session summary</h1>
        <div className="grid gap-3 sm:grid-cols-3">
          <Readout label="Reps" value={String(reps)} detail={`${good} clean · ${corrected} corrected`} />
          <Readout label="Time" value={formatDuration(session.durationSec)} detail={`${session.exercises.length} sets`} />
          <Readout label="Form" value={form == null ? "—" : String(form)} detail={form == null ? "Unable to assess" : "Average coaching score"} />
        </div>
        <section className="rounded-3xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Most common corrections</h2>
          {common.length ? (
            <ul className="mt-3 space-y-2 text-sm text-mute">
              {common.map(([note, count]) => (
                <li key={note}>
                  {note} · {count}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-mute">No repeated corrections were recorded.</p>
          )}
        </section>
        {[...grouped.entries()].map(([id, sets]) => (
          <section key={id} className="rounded-3xl border border-line bg-surface p-5">
            <h2 className="font-semibold">{exerciseById(id)?.name ?? id}</h2>
            <ul className="mt-3 space-y-2 text-sm text-mute">
              {sets.map((set) => (
                <li key={`${id}-${set.setIndex}`}>
                  Set {set.setIndex}: {set.reps === 0 && set.holdSeconds > 0 ? `${set.holdSeconds}s hold` : `${set.reps} reps (${set.goodReps} clean)`}
                  {set.avgFormScore == null ? "" : ` · form ${set.avgFormScore}`}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="flex flex-wrap gap-3">
          <Link to="/app" className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-bg">
            Dashboard
          </Link>
          <Link to="/app/history" className="rounded-full border border-line px-4 py-2 text-sm font-semibold">
            History
          </Link>
        </div>
        <Disclaimer />
      </div>
    </Shell>
  );
}
