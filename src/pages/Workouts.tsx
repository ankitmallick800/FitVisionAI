import { useState } from "react";
import { Link } from "react-router-dom";
import { exerciseById } from "../domain/exercises";
import { WEEKDAYS } from "../domain/format";
import { buildWeek, todayPlan } from "../domain/plan";
import { useProfile, useSessions } from "../lib/storage";
import { Badge, Card, useTitle } from "../components/ui";
import { weekdayMon0 } from "../domain/format";

export function Workouts() {
  const profile = useProfile();
  const sessions = useSessions();
  const today = weekdayMon0();
  const [open, setOpen] = useState(today);
  useTitle("Workout plan");
  if (!profile) return null;
  const week = buildWeek(profile, sessions);
  const current = todayPlan(profile, sessions);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-semibold">This week</h1>
          <p className="mt-2 max-w-2xl text-sm text-mute">
            {profile.daysPerWeek} training days, about {profile.sessionMinutes} minutes. Beginners start with two sets. The plan changes when your saved sessions are consistently solid.
          </p>
        </div>
        {!current.rest ? (
          <Link to="/train/plan" className="rounded-full bg-lime px-5 py-3 text-sm font-semibold text-bg">
            Start today
          </Link>
        ) : null}
      </div>
      <div className="space-y-3">
        {week.map((day) => (
          <Card key={day.weekday} className={day.weekday === today ? "border-lime/40" : ""}>
            <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen(day.weekday)} aria-expanded={open === day.weekday}>
              <span>
                <span className="block text-xs uppercase tracking-[0.16em] text-mute">{WEEKDAYS[day.weekday]}</span>
                <span className="mt-1 block text-xl font-semibold">{day.title}</span>
              </span>
              <Badge tone={day.rest ? "mute" : "lime"}>{day.rest ? "Rest" : `${day.items.length} exercises`}</Badge>
            </button>
            {open === day.weekday ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm leading-6 text-mute">{day.note}</p>
                {day.items.map((item) => {
                  const exercise = exerciseById(item.exerciseId);
                  return (
                    <div key={item.exerciseId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
                      <div>
                        <p className="font-medium">{exercise?.name}</p>
                        <p className="text-sm text-mute">
                          {item.seconds != null ? `${item.sets} sets × ${item.seconds}s` : `${item.sets} sets × ${item.reps} reps`} · {item.restSec}s rest
                        </p>
                        {item.note ? <p className="mt-1 max-w-xl text-xs text-amber">{item.note}</p> : null}
                      </div>
                      <Link to={`/train/${item.exerciseId}`} className="rounded-full bg-lime px-3 py-2 text-sm font-semibold text-bg">
                        Start
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
