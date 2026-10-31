import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Camera, Shield, Sparkles } from "lucide-react";
import { useProfile } from "../lib/storage";
import { Disclaimer, useTitle } from "../components/ui";

export function Landing() {
  const profile = useProfile();
  useTitle("Personal trainer");
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-lime font-mono text-sm text-bg">FV</span>
          FitVision AI
        </div>
        <Link to={profile ? "/app" : "/onboarding"} className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-bg">
          {profile ? "Open dashboard" : "Start"}
        </Link>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-lime">On-device pose coaching</p>
          <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-[1.05] sm:text-6xl">Train with a camera that counts the reps you actually finish.</h1>
          <p className="mt-5 max-w-xl text-lg text-mute">
            FitVision AI builds a workout and a practical meal pattern from your profile, then uses your webcam to track push-ups, squats, and six other movements. Video stays in the browser.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/onboarding" className="rounded-full bg-lime px-5 py-3 text-sm font-semibold text-bg">
              Build my plan
            </Link>
            <Link to={profile ? "/app/library" : "/onboarding"} className="rounded-full border border-line px-5 py-3 text-sm font-semibold">
              Exercise library
            </Link>
          </div>
          <Disclaimer className="mt-8 max-w-xl" />
        </div>
        <div className="rounded-[32px] border border-line bg-surface p-5 shadow-card">
          <div className="aspect-[4/5] rounded-[24px] bg-[#101418] p-5 sm:aspect-video lg:aspect-[4/5]">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-mute">
                <span>Live trainer</span>
                <span className="text-lime">Tracking</span>
              </div>
              <svg viewBox="0 0 200 260" className="mx-auto w-40" aria-hidden>
                <circle cx="100" cy="36" r="16" fill="none" stroke="#B8FF3B" strokeWidth="4" />
                <path d="M100 52 V110 M70 78 H130 M100 110 L72 168 L70 214 M100 110 L132 168 L136 214 M78 78 L60 120 M122 78 L146 112" fill="none" stroke="#B8FF3B" strokeWidth="4" strokeLinecap="round" />
              </svg>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat k="Phase" v="Lowering" />
                <Stat k="Reps" v="0" />
                <Stat k="Form" v="—" />
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-mute">Illustration only. The live screen draws landmarks on your real camera image.</p>
        </div>
      </main>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 md:grid-cols-3">
        <Info icon={<Sparkles size={18} />} title="A plan from your answers" body="Experience, goal, equipment, schedule, and limitations shape the sets. Height and weight do not set the intensity." />
        <Info icon={<Camera size={18} />} title="Reps from movement" body="A state machine counts a rep after a full lowering and return. Missing landmarks show “unable to assess” instead of a fake count." />
        <Info icon={<Shield size={18} />} title="Private by default" body="Pose detection runs locally. The app does not record or upload the camera. Workouts stay in this browser." />
      </section>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-surface px-2 py-3">
      <div className="text-[10px] uppercase tracking-wider text-mute">{k}</div>
      <div className="mt-1 font-mono text-sm">{v}</div>
    </div>
  );
}

function Info({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <article className="rounded-3xl border border-line bg-surface p-5">
      <div className="text-lime">{icon}</div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-mute">{body}</p>
    </article>
  );
}
