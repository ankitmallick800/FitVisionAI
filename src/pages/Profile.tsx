import { useState, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { bmiLabel, bmiValue, BMI_NOTE } from "../domain/body";
import { draftFromProfile, errorsForStep, profileFromDraft, type Draft } from "../domain/profileDraft";
import type { Depth } from "../domain/types";
import { ProfileForm } from "../features/profile/ProfileForm";
import { clearAllData, exportPayload, saveProfile, saveSettings, useProfile, useSettings } from "../lib/storage";
import { Button, Card, Dialog, Disclaimer, useTitle } from "../components/ui";

export function ProfilePage() {
  const profile = useProfile();
  const settings = useSettings();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<ReturnType<typeof errorsForStep>>({});
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useTitle("Profile");
  if (!profile) return null;
  const form = draft ?? draftFromProfile(profile);
  const updateDraft: Dispatch<SetStateAction<Draft>> = (action) => {
    setDraft((current) => {
      const base = current ?? draftFromProfile(profile);
      return typeof action === "function" ? action(base) : action;
    });
  };
  const bmi = bmiValue(profile.weightKg, profile.heightCm);

  const save = () => {
    const found = errorsForStep(form, 5);
    setErrors(found);
    if (Object.keys(found).length) return;
    saveProfile(profileFromDraft(form, profile));
    setDraft(null);
    setSaved(true);
  };

  const setDepth = (depth: Depth) => {
    saveSettings({ ...settings, calibration: { ...settings.calibration, depth } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold">Profile</h1>
        <p className="mt-2 text-sm text-mute">Saved in this browser. The camera is never part of this profile.</p>
      </div>
      <Card>
        <p className="text-sm text-mute">
          BMI {bmi.toFixed(1)} · {bmiLabel(bmi)}
        </p>
        <p className="mt-2 text-xs leading-5 text-mute">{BMI_NOTE}</p>
      </Card>
      <Card>
        <ProfileForm draft={form} setDraft={updateDraft} errors={errors} sections={["you", "body", "training", "limits", "food"]} />
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={save}>Save profile</Button>
          {saved ? <span className="text-sm text-lime">Saved</span> : null}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Counting sensitivity</h2>
        <p className="mt-2 text-sm text-mute">Easier asks for less range before a rep counts. Deeper waits for more. Steady ignores brief jitters. Responsive counts faster movements.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["easier", "standard", "deeper"] as Depth[]).map((depth) => (
            <button key={depth} className={`rounded-full border px-3 py-2 text-sm capitalize ${settings.calibration.depth === depth ? "border-lime text-lime" : "border-line text-mute"}`} onClick={() => setDepth(depth)}>
              {depth}
            </button>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.sound}
            onChange={(event) => saveSettings({ ...settings, sound: event.target.checked })}
          />
          Beep when a rep counts
        </label>
        <label className="mt-3 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.voice}
            onChange={(event) => saveSettings({ ...settings, voice: event.target.checked })}
          />
          Speak the next move, each rep, and the rest during a workout
        </label>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Privacy</h2>
        <p className="mt-2 text-sm leading-6 text-mute">
          Camera frames are processed in the browser and are not saved. Profile, meals, and workouts live in local storage on this device. No account is created.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              const blob = new Blob([exportPayload()], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "fitvision-data.json";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export data
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete everything
          </Button>
        </div>
      </Card>
      <Disclaimer />
      <Dialog
        open={confirmDelete}
        title="Delete all FitVision data?"
        body="This removes your profile, workouts, meals, and settings from this browser."
        confirmLabel="Delete"
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          clearAllData();
          navigate("/");
        }}
      />
    </div>
  );
}
