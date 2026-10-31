import { useState } from "react";
import { Link } from "react-router-dom";
import { exerciseById } from "../domain/exercises";
import { formatDuration, isoDate, shortDate } from "../domain/format";
import { records, SAMPLE_WEEK, sessionTrend, weekBars } from "../domain/stats";
import { kgToLb, lbToKg } from "../domain/body";
import { addWeight, useProfile, useSessions, useWeights } from "../lib/storage";
import { MinuteBars, TrendLines, WeightLine } from "../components/Charts";
import { Badge, Card, useTitle } from "../components/ui";

export function ProgressPage() {
  const profile = useProfile();
  const sessions = useSessions();
  const weights = useWeights();
  const [weight, setWeight] = useState("");
  const [message, setMessage] = useState("");
  useTitle("Progress");
  if (!profile) return null;
  const bars = weekBars(sessions);
  const trend = sessionTrend(sessions);
  const best = records(sessions);
  const hasWork = sessions.length > 0;

  const saveWeight = () => {
    const raw = Number(weight);
    if (!Number.isFinite(raw)) {
      setMessage("Enter a number.");
      return;
    }
    const kg = profile.units === "metric" ? raw : lbToKg(raw);
    if (kg < 35 || kg > 250) {
      setMessage(profile.units === "metric" ? "Enter 35–250 kg." : "Enter a weight between about 77 and 550 lb.");
      return;
    }
    addWeight({ date: isoDate(), weightKg: Math.round(kg * 10) / 10 });
    setWeight("");
    setMessage("Saved for today.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold">Progress</h1>
        <p className="mt-2 max-w-2xl text-sm text-mute">Charts use saved workouts only. FitVision does not invent a calorie burn or a streak.</p>
      </div>
      <Card>
        <h2 className="text-lg font-semibold">This week</h2>
        <p className="mt-1 text-sm text-mute">Minutes from workouts you finished. Empty days are real zeros.</p>
        <MinuteBars data={bars} />
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Correct-rep percentage and duration</h2>
        {trend.length >= 2 ? (
          <>
            <p className="mt-1 text-sm text-mute">Green is the share of counted reps marked clean. Amber is session minutes.</p>
            <TrendLines data={trend} />
          </>
        ) : (
          <p className="mt-3 text-sm text-mute">A trend line appears after two saved workouts. You have {sessions.length}.</p>
        )}
      </Card>
      {!hasWork ? (
        <Card className="border-dashed">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sample preview</h2>
            <Badge tone="amber">Not your data</Badge>
          </div>
          <p className="mt-2 text-sm text-mute">An example of how a week of minutes can look. These bars are not stored.</p>
          <MinuteBars data={SAMPLE_WEEK} />
        </Card>
      ) : null}
      <Card>
        <h2 className="text-lg font-semibold">Personal records</h2>
        {!hasWork ? (
          <p className="mt-3 text-sm text-mute">Records appear after a saved session.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {best.bestReps.map((item) => (
              <li key={item.exerciseId} className="flex justify-between border-b border-line py-2">
                <span>{exerciseById(item.exerciseId)?.name}</span>
                <span className="text-mute">{item.reps} reps in a set</span>
              </li>
            ))}
            {best.bestPlank > 0 ? (
              <li className="flex justify-between border-b border-line py-2">
                <span>Longest plank</span>
                <span className="text-mute">{best.bestPlank}s</span>
              </li>
            ) : null}
            <li className="flex justify-between py-2">
              <span>Longest session</span>
              <span className="text-mute">{formatDuration(best.longestSec)}</span>
            </li>
            {best.bestForm != null ? <li className="text-mute">Best average form score in a set: {best.bestForm}. This is a coaching score, not an injury assessment.</li> : null}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Weight</h2>
        {profile.trackWeight ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                className="rounded-2xl border border-line bg-bg px-4 py-3"
                inputMode="decimal"
                value={weight}
                placeholder={profile.units === "metric" ? "kg" : "lb"}
                aria-label="Weight"
                onChange={(event) => setWeight(event.target.value)}
              />
              <button className="rounded-full bg-lime px-4 py-3 text-sm font-semibold text-bg" onClick={saveWeight}>
                Log today
              </button>
            </div>
            {message ? <p className="mt-2 text-sm text-mute">{message}</p> : null}
            {weights.length ? (
              <WeightLine
                unit={profile.units === "metric" ? "kg" : "lb"}
                data={weights.map((entry) => ({
                  label: shortDate(`${entry.date}T12:00:00`),
                  weight: profile.units === "metric" ? entry.weightKg : Math.round(kgToLb(entry.weightKg) * 10) / 10,
                }))}
              />
            ) : (
              <p className="mt-3 text-sm text-mute">No weights logged.</p>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-mute">
            Weight tracking is off. <Link to="/app/profile" className="text-lime">Enable it in profile</Link> if you want a chart.
          </p>
        )}
      </Card>
    </div>
  );
}
