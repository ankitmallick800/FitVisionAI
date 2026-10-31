import { Link } from "react-router-dom";
import { bmiLabel, bmiValue, BMI_NOTE, hydrationCopy } from "../domain/body";
import { exerciseById } from "../domain/exercises";
import { WEEKDAYS, formatDuration, greeting, shortDate } from "../domain/format";
import { labelOf, GOAL_OPTIONS } from "../domain/labels";
import { todayPlan } from "../domain/plan";
import { dayStreak, SAMPLE_WEEK, secondsBetween, todayCompletion, totalReps, weekStreak } from "../domain/stats";
import { addDays, startOfWeek } from "../domain/format";
import { useProfile, useSessions, useWeights } from "../lib/storage";
import { MinuteBars } from "../components/Charts";
import { Badge, Card, Disclaimer, Ring, useTitle } from "../components/ui";

export function Dashboard() {
  const profile = useProfile();
  const sessions = useSessions();
  const weights = useWeights();
  useTitle("Dashboard");
  if (!profile) return null;
  const plan = todayPlan(profile, sessions);
  const completion = todayCompletion(plan, sessions);
  const weekStart = startOfWeek();
  const weekSeconds = secondsBetween(sessions, weekStart, addDays(weekStart, 7));
  const bmi = bmiValue(profile.weightKg, profile.heightCm);
  const latestWeight = weights.at(-1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-mute">{labelOf(GOAL_OPTIONS, profile.goal)}</p>
          <h1 className="mt-1 text-4xl font-semibold">{greeting(profile.name)}</h1>
        </div>
        <Link to={plan.rest ? "/app/library" : "/train/plan"} className="rounded-full bg-lime px-5 py-3 text-sm font-semibold text-bg">
          {plan.rest ? "Browse exercises" : "Start workout"}
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-center gap-4">
          {completion == null ? (
            <div>
              <p className="text-sm text-mute">Today</p>
              <p className="mt-1 text-2xl font-semibold">Recovery</p>
            </div>
          ) : (
            <>
              <Ring value={completion} label="Today" />
              <div>
                <p className="text-sm text-mute">Workout completion</p>
                <p className="mt-1 text-sm">Sets saved today against the plan.</p>
              </div>
            </>
          )}
        </Card>
        <Metric label="Weekly streak" value={String(weekStreak(sessions, profile.daysPerWeek))} detail={`${profile.daysPerWeek} training days counts as a week`} />
        <Metric label="Day streak" value={String(dayStreak(sessions))} detail="Consecutive days with a saved workout" />
        <Metric label="Recorded reps" value={String(totalReps(sessions))} detail="Counted in saved sessions only" />
        <Metric label="This week" value={formatDuration(weekSeconds)} detail="Time in saved workouts" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-lime">{WEEKDAYS[plan.weekday]}</p>
              <h2 className="mt-1 text-2xl font-semibold">{plan.title}</h2>
            </div>
            <Badge tone={plan.rest ? "mute" : "lime"}>{plan.rest ? "Rest" : "Training"}</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-mute">{plan.note}</p>
          <ul className="mt-4 space-y-3">
            {plan.items.map((item) => {
              const exercise = exerciseById(item.exerciseId);
              return (
                <li key={item.exerciseId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
                  <div>
                    <p className="font-medium">{exercise?.name ?? item.exerciseId}</p>
                    <p className="text-sm text-mute">
                      {item.seconds != null ? `${item.sets} × ${item.seconds}s` : `${item.sets} × ${item.reps}`} · rest {item.restSec}s
                    </p>
                    {item.note ? <p className="mt-1 text-xs text-amber">{item.note}</p> : null}
                  </div>
                  <Link to={`/train/${item.exerciseId}`} className="rounded-full border border-line px-3 py-2 text-sm">
                    Start
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold">Hydration</h2>
            <p className="mt-2 text-sm leading-6 text-mute">{hydrationCopy(profile.weightKg)}</p>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold">BMI {bmi.toFixed(1)}</h2>
            <p className="mt-1 text-sm text-mute">{bmiLabel(bmi)}</p>
            <p className="mt-2 text-xs leading-5 text-mute">{BMI_NOTE}</p>
            {profile.trackWeight ? (
              <p className="mt-3 text-sm">{latestWeight ? `Last logged weight ${latestWeight.weightKg} kg on ${latestWeight.date}.` : "Weight tracking is on. Log a value in Progress."}</p>
            ) : null}
          </Card>
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Recent sessions</h2>
        {sessions.length === 0 ? (
          <p className="mt-3 text-sm text-mute">No workouts saved yet. The numbers above stay at zero until you finish a live session.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {sessions.slice(-4).reverse().map((session) => {
              const reps = session.exercises.reduce((sum, set) => sum + set.reps, 0);
              return (
                <li key={session.id} className="flex items-center justify-between py-3 text-sm">
                  <span>{shortDate(session.endedAt)}</span>
                  <span className="text-mute">
                    {reps} reps · {formatDuration(session.durationSec)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {sessions.length === 0 ? (
        <Card className="border-dashed">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Sample preview</h2>
            <Badge tone="amber">Not your data</Badge>
          </div>
          <p className="mt-2 text-sm text-mute">This is an example of the weekly minutes chart. It is not saved and it is not your progress.</p>
          <MinuteBars data={SAMPLE_WEEK} />
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <Quick to="/train/plan" label="Start workout" />
        <Quick to="/app/diet" label="Diet plan" />
        <Quick to="/app/library" label="Exercise library" />
        <Quick to="/app/progress" label="Progress" />
      </div>
      <Disclaimer />
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card>
      <p className="text-sm text-mute">{label}</p>
      <p className="mt-2 font-mono text-3xl">{value}</p>
      <p className="mt-2 text-xs text-mute">{detail}</p>
    </Card>
  );
}

function Quick({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="rounded-2xl border border-line bg-surface px-4 py-4 text-sm font-semibold hover:border-lime/50">
      {label}
    </Link>
  );
}
