import { Link, useParams } from "react-router-dom";
import { exerciseById, EXERCISES } from "../domain/exercises";
import { prescribeOne } from "../domain/plan";
import { useProfile, useSessions } from "../lib/storage";
import { Figure } from "../components/Figure";
import { Badge, Card, useTitle } from "../components/ui";

export function Library() {
  useTitle("Exercise library");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold">Exercise library</h1>
        <p className="mt-2 max-w-2xl text-sm text-mute">Eight movements the live trainer can score. Open one for the setup, the common misses, and a start button.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {EXERCISES.map((exercise) => (
          <Link key={exercise.id} to={`/app/library/${exercise.id}`} className="rounded-3xl border border-line bg-surface p-3 hover:border-lime/40">
            <Figure exerciseId={exercise.id} className="h-36 w-full" />
            <div className="px-2 pb-2 pt-3">
              <h2 className="font-semibold">{exercise.name}</h2>
              <p className="mt-1 text-xs text-mute">{exercise.muscles.join(" · ")}</p>
              <div className="mt-3 flex gap-2">
                <Badge>{exercise.difficulty}</Badge>
                <Badge tone="lime">{exercise.camera} view</Badge>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ExerciseDetail() {
  const { id = "" } = useParams();
  const exercise = exerciseById(id);
  const profile = useProfile();
  const sessions = useSessions();
  useTitle(exercise?.name ?? "Exercise");
  if (!exercise || !profile) {
    return <p className="text-mute">That exercise is not in the library.</p>;
  }
  const plan = prescribeOne(exercise.id, profile, sessions);
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Figure exerciseId={exercise.id} className="h-56 w-full" />
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-lime">{exercise.muscles.join(" · ")}</p>
          <h1 className="mt-2 text-4xl font-semibold">{exercise.name}</h1>
          <p className="mt-2 text-sm text-mute">{exercise.equipment}</p>
        </div>
        <Card>
          <h2 className="font-semibold">Your current target</h2>
          <p className="mt-2 text-sm text-mute">
            {plan.seconds != null ? `${plan.sets} × ${plan.seconds} seconds` : `${plan.sets} × ${plan.reps} reps`}, {plan.restSec}s rest.
          </p>
          {plan.note ? <p className="mt-2 text-sm text-amber">{plan.note}</p> : null}
          <Link to={`/train/${exercise.id}`} className="mt-4 inline-flex rounded-full bg-lime px-4 py-2 text-sm font-semibold text-bg">
            Start workout
          </Link>
        </Card>
        <Block title="How to do it" items={exercise.instructions} />
        <Block title="Posture" items={exercise.posture} />
        <Block title="Common mistakes" items={exercise.mistakes} />
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="font-semibold">Easier</h2>
            <p className="mt-2 text-sm text-mute">{exercise.easier}</p>
          </Card>
          <Card>
            <h2 className="font-semibold">Harder</h2>
            <p className="mt-2 text-sm text-mute">{exercise.harder}</p>
          </Card>
        </div>
        <p className="text-sm text-mute">Camera guide: {exercise.setup}</p>
      </div>
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <h2 className="font-semibold">{title}</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-mute">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </Card>
  );
}
