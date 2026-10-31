import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { bmiLabel, bmiValue, BMI_NOTE } from "../domain/body";
import { labelOf, GOAL_OPTIONS, EXPERIENCE_OPTIONS, DIET_OPTIONS } from "../domain/labels";
import { draftFromProfile, emptyDraft, errorsForStep, profileFromDraft, type Draft } from "../domain/profileDraft";
import { ProfileForm } from "../features/profile/ProfileForm";
import { saveProfile, useProfile } from "../lib/storage";
import { Button, Card, Disclaimer, useTitle } from "../components/ui";

const STEPS = [
  { id: "you", title: "What should we call you?" },
  { id: "body", title: "Height and weight" },
  { id: "training", title: "How do you want to train?" },
  { id: "limits", title: "Anything to work around?" },
  { id: "food", title: "How do you eat?" },
  { id: "review", title: "Review your profile" },
] as const;

export function Onboarding() {
  const existing = useProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => (existing ? draftFromProfile(existing) : emptyDraft()));
  const [errors, setErrors] = useState<ReturnType<typeof errorsForStep>>({});
  useTitle("Profile setup");
  if (existing) return <Navigate to="/app" replace />;

  const next = () => {
    const found = errorsForStep(draft, step);
    setErrors(found);
    if (Object.keys(found).length) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      setErrors({});
      return;
    }
    saveProfile(profileFromDraft(draft));
    navigate("/app");
  };

  const profilePreview = Object.keys(errorsForStep(draft, 5)).length === 0 ? profileFromDraft(draft) : null;
  const bmi = profilePreview ? bmiValue(profilePreview.weightKg, profilePreview.heightCm) : null;

  return (
    <div className="min-h-dvh bg-bg px-4 py-6 text-ink">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <Link to="/" className="text-sm text-mute">
          FitVision AI
        </Link>
        <p className="text-sm text-mute">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
      <div className="mx-auto mt-4 h-1 max-w-3xl overflow-hidden rounded-full bg-line">
        <div className="h-full bg-lime" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      <Card className="mx-auto mt-6 max-w-3xl">
        <h1 className="text-3xl font-semibold">{STEPS[step].title}</h1>
        <p className="mt-2 text-sm text-mute">
          {step === 1
            ? "These numbers personalize the dashboard and, if you ask for it, a calorie range. They do not set how hard the workouts are."
            : "You can edit every answer later."}
        </p>
        <div className="mt-6">
          {step < 5 ? (
            <ProfileForm
              draft={draft}
              setDraft={setDraft}
              errors={errors}
              sections={[STEPS[step].id as "you" | "body" | "training" | "limits" | "food"]}
            />
          ) : profilePreview && bmi != null ? (
            <div className="space-y-4 text-sm">
              <Review label="Name" value={profilePreview.name} />
              <Review label="Age" value={String(profilePreview.age)} />
              <Review label="Goal" value={labelOf(GOAL_OPTIONS, profilePreview.goal)} />
              <Review label="Experience" value={labelOf(EXPERIENCE_OPTIONS, profilePreview.experience)} />
              <Review label="Diet" value={profilePreview.skipNutrition ? "Skipped" : labelOf(DIET_OPTIONS, profilePreview.diet)} />
              <Review label="Schedule" value={`${profilePreview.daysPerWeek} days · ${profilePreview.sessionMinutes} min`} />
              <div className="rounded-2xl border border-line bg-bg p-4">
                <p className="font-medium">BMI {bmi.toFixed(1)}</p>
                <p className="mt-1 text-mute">{bmiLabel(bmi)}</p>
                <p className="mt-2 text-xs leading-5 text-mute">{BMI_NOTE}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-danger">Some answers still need a fix. Go back and check the highlighted fields.</p>
          )}
        </div>
        <div className="mt-8 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>
            Back
          </Button>
          <Button onClick={next}>{step === STEPS.length - 1 ? "Open my dashboard" : "Continue"}</Button>
        </div>
      </Card>
      <Disclaimer className="mx-auto mt-6 max-w-3xl" />
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-2">
      <span className="text-mute">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
