import type { Dispatch, SetStateAction } from "react";
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from "../../domain/body";
import {
  ACTIVITY_OPTIONS,
  DIET_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  LIMITATION_OPTIONS,
  PLACE_OPTIONS,
  SEX_OPTIONS,
  STAPLE_OPTIONS,
} from "../../domain/labels";
import type { Draft, FieldErrors } from "../../domain/profileDraft";
import type { Limitation, Units } from "../../domain/types";
import { Chip, controlClass, Field } from "../../components/ui";

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export function ProfileForm({
  draft,
  setDraft,
  errors,
  sections,
}: {
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft>>;
  errors: FieldErrors;
  sections: Array<"you" | "body" | "training" | "limits" | "food">;
}) {
  const setUnits = (units: Units) => {
    setDraft((current) => {
      if (current.units === units) return current;
      const heightCm =
        current.units === "metric"
          ? Number(current.heightCm)
          : ftInToCm(Number(current.heightFt) || 0, Number(current.heightIn) || 0);
      const weightKg = current.units === "metric" ? Number(current.weight) : lbToKg(Number(current.weight) || 0);
      if (units === "metric") {
        return {
          ...current,
          units,
          heightCm: heightCm ? String(Math.round(heightCm)) : current.heightCm,
          weight: weightKg ? String(Math.round(weightKg * 10) / 10) : current.weight,
        };
      }
      const imperial = cmToFtIn(heightCm || 0);
      return {
        ...current,
        units,
        heightFt: heightCm ? String(imperial.feet) : current.heightFt,
        heightIn: heightCm ? String(imperial.inches) : current.heightIn,
        weight: weightKg ? String(Math.round(kgToLb(weightKg) * 10) / 10) : current.weight,
      };
    });
  };

  return (
    <div className="space-y-8">
      {sections.includes("you") ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.name}>
            <input className={controlClass} value={draft.name} autoComplete="name" onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Field>
          <Field label="Age" hint="16 or older." error={errors.age}>
            <input className={controlClass} inputMode="numeric" value={draft.age} onChange={(event) => setDraft({ ...draft, age: event.target.value })} />
          </Field>
        </div>
      ) : null}

      {sections.includes("body") ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Units">
            <Chip selected={draft.units === "metric"} onClick={() => setUnits("metric")}>
              Centimeters and kilograms
            </Chip>
            <Chip selected={draft.units === "imperial"} onClick={() => setUnits("imperial")}>
              Feet and pounds
            </Chip>
          </div>
          {draft.units === "metric" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Height (cm)" error={errors.heightCm}>
                <input className={controlClass} inputMode="decimal" value={draft.heightCm} onChange={(event) => setDraft({ ...draft, heightCm: event.target.value })} />
              </Field>
              <Field label="Weight (kg)" error={errors.weight}>
                <input className={controlClass} inputMode="decimal" value={draft.weight} onChange={(event) => setDraft({ ...draft, weight: event.target.value })} />
              </Field>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Height (ft)" error={errors.heightFt}>
                <input className={controlClass} inputMode="numeric" value={draft.heightFt} onChange={(event) => setDraft({ ...draft, heightFt: event.target.value })} />
              </Field>
              <Field label="Height (in)" error={errors.heightIn}>
                <input className={controlClass} inputMode="numeric" value={draft.heightIn} onChange={(event) => setDraft({ ...draft, heightIn: event.target.value })} />
              </Field>
              <Field label="Weight (lb)" error={errors.weight}>
                <input className={controlClass} inputMode="decimal" value={draft.weight} onChange={(event) => setDraft({ ...draft, weight: event.target.value })} />
              </Field>
            </div>
          )}
          <fieldset>
            <legend className="text-sm font-medium">Biological sex, optional</legend>
            <p className="mt-1 text-xs text-mute">Used only if you want an estimated calorie range. Skip it if you prefer the plate guide.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SEX_OPTIONS.map((option) => (
                <Chip key={option.id} selected={draft.sex === option.id} onClick={() => setDraft({ ...draft, sex: option.id })}>
                  {option.label}
                </Chip>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={draft.trackWeight} onChange={(event) => setDraft({ ...draft, trackWeight: event.target.checked })} />
            Show optional weight tracking on Progress
          </label>
        </div>
      ) : null}

      {sections.includes("training") ? (
        <div className="space-y-5">
          <fieldset>
            <legend className="text-sm font-medium">Fitness goal</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {GOAL_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={draft.goal === option.id}
                  onClick={() => setDraft({ ...draft, goal: option.id })}
                  className={`rounded-2xl border px-4 py-3 text-left ${draft.goal === option.id ? "border-lime bg-lime/10" : "border-line"}`}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-1 block text-xs text-mute">{option.detail}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">Experience</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXPERIENCE_OPTIONS.map((option) => (
                <Chip key={option.id} selected={draft.experience === option.id} onClick={() => setDraft({ ...draft, experience: option.id })}>
                  {option.label}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">Workout location</legend>
            <div className="mt-3 flex gap-2">
              {PLACE_OPTIONS.map((option) => (
                <Chip key={option.id} selected={draft.place === option.id} onClick={() => setDraft({ ...draft, place: option.id })}>
                  {option.label}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">Equipment you have</legend>
            <p className="mt-1 text-xs text-mute">Bodyweight is always available.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((option) => (
                <Chip key={option.id} selected={draft.equipment.includes(option.id)} onClick={() => setDraft({ ...draft, equipment: toggle(draft.equipment, option.id) })}>
                  {option.label}
                </Chip>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Training days per week" error={errors.daysPerWeek}>
              <input className={controlClass} inputMode="numeric" value={draft.daysPerWeek} onChange={(event) => setDraft({ ...draft, daysPerWeek: event.target.value })} />
            </Field>
            <Field label="Typical session (minutes)" error={errors.sessionMinutes}>
              <input className={controlClass} inputMode="numeric" value={draft.sessionMinutes} onChange={(event) => setDraft({ ...draft, sessionMinutes: event.target.value })} />
            </Field>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Activity level, optional</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {ACTIVITY_OPTIONS.map((option) => (
                <Chip key={option.id} selected={draft.activity === option.id} onClick={() => setDraft({ ...draft, activity: option.id })}>
                  {option.label}
                </Chip>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}

      {sections.includes("limits") ? (
        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium">Movement limitations</legend>
            <p className="mt-1 text-xs text-mute">Leave this empty if nothing regularly bothers you. The plan will swap or soften those movements.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {LIMITATION_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  selected={draft.limitations.includes(option.id)}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      limitations: toggle(draft.limitations, option.id) as Limitation[],
                    })
                  }
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </fieldset>
          <Field label="Anything else the plan should respect" hint="Optional. Example: avoid deep knee bends." error={errors.limitationNotes}>
            <textarea className={controlClass} rows={3} value={draft.limitationNotes} onChange={(event) => setDraft({ ...draft, limitationNotes: event.target.value })} />
          </Field>
        </div>
      ) : null}

      {sections.includes("food") ? (
        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium">Dietary preference</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {DIET_OPTIONS.map((option) => (
                <Chip key={option.id} selected={draft.diet === option.id} onClick={() => setDraft({ ...draft, diet: option.id })}>
                  {option.label}
                </Chip>
              ))}
            </div>
          </fieldset>
          <Field label="Food allergies" hint="Example: peanuts, lactose. Leave blank if none." error={errors.allergies}>
            <input className={controlClass} value={draft.allergies} onChange={(event) => setDraft({ ...draft, allergies: event.target.value })} />
          </Field>
          <Field label="Other restrictions" hint="Example: no fried food, Jain, low spice." error={errors.restrictions}>
            <input className={controlClass} value={draft.restrictions} onChange={(event) => setDraft({ ...draft, restrictions: event.target.value })} />
          </Field>
          <label className="flex items-start gap-3 text-sm">
            <input className="mt-1" type="checkbox" checked={draft.skipNutrition} onChange={(event) => setDraft({ ...draft, skipNutrition: event.target.checked })} />
            <span>Skip meal suggestions. You can turn them back on later.</span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input className="mt-1" type="checkbox" checked={draft.limitPantry} onChange={(event) => setDraft({ ...draft, limitPantry: event.target.checked })} />
            <span>Only suggest meals from staples I select.</span>
          </label>
          {draft.limitPantry ? (
            <fieldset>
              <legend className="text-sm font-medium">Staples at home</legend>
              {errors.staples ? <p className="mt-1 text-xs text-danger">{errors.staples}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {STAPLE_OPTIONS.map((option) => (
                  <Chip key={option.id} selected={draft.staples.includes(option.id)} onClick={() => setDraft({ ...draft, staples: toggle(draft.staples, option.id) })}>
                    {option.label}
                  </Chip>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
