import { useState } from "react";
import { Link } from "react-router-dom";
import { exerciseById } from "../domain/exercises";
import { formatDuration, formatWhen } from "../domain/format";
import { deleteSession, useSessions } from "../lib/storage";
import { Card, Dialog, Empty, useTitle } from "../components/ui";

export function History() {
  const sessions = useSessions();
  const [open, setOpen] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  useTitle("History");
  const ordered = [...sessions].reverse();

  if (!ordered.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-semibold">History</h1>
        <Empty title="No workouts yet" body="Finish a live session and the reps, form notes, and time will be stored in this browser." action={<Link to="/app/workouts" className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-bg">See the plan</Link>} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-4xl font-semibold">History</h1>
      {ordered.map((session) => {
        const reps = session.exercises.reduce((sum, set) => sum + set.reps, 0);
        const good = session.exercises.reduce((sum, set) => sum + set.goodReps, 0);
        const corrected = session.exercises.reduce((sum, set) => sum + set.correctedReps, 0);
        const scores = session.exercises.flatMap((set) => (set.avgFormScore == null ? [] : [set.avgFormScore]));
        const form = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
        return (
          <Card key={session.id}>
            <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen(open === session.id ? null : session.id)}>
              <span>
                <span className="block font-semibold">{formatWhen(session.endedAt)}</span>
                <span className="mt-1 block text-sm text-mute">
                  {reps} reps · {good} clean · {corrected} to clean up · {formatDuration(session.durationSec)}
                </span>
              </span>
              <span className="text-sm text-mute">{form == null ? "Form n/a" : `Form ${form}`}</span>
            </button>
            {open === session.id ? (
              <div className="mt-4 space-y-3">
                {session.exercises.map((set, index) => (
                  <div key={`${set.exerciseId}-${index}`} className="rounded-2xl border border-line px-4 py-3 text-sm">
                    <p className="font-medium">
                      {exerciseById(set.exerciseId)?.name} · set {set.setIndex}
                    </p>
                    <p className="mt-1 text-mute">
                      {set.holdSeconds > 0 && set.reps === 0
                        ? `${set.holdSeconds}s hold`
                        : `${set.reps} reps, ${set.goodReps} clean, ${set.correctedReps} corrected`}
                      {set.avgFormScore == null ? " · form unable to assess" : ` · form ${set.avgFormScore}`}
                    </p>
                    {set.leftReps || set.rightReps ? (
                      <p className="text-mute">
                        Left {set.leftReps} · right {set.rightReps}
                      </p>
                    ) : null}
                  </div>
                ))}
                <button className="text-sm text-danger" onClick={() => setRemoveId(session.id)}>
                  Delete session
                </button>
              </div>
            ) : null}
          </Card>
        );
      })}
      <Dialog
        open={removeId != null}
        title="Delete this workout?"
        body="This removes the session from this browser. It does not change anything else."
        confirmLabel="Delete"
        danger
        onClose={() => setRemoveId(null)}
        onConfirm={() => {
          if (removeId) deleteSession(removeId);
          setRemoveId(null);
        }}
      />
    </div>
  );
}
