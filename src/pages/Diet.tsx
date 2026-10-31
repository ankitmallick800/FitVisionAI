import { Link } from "react-router-dom";
import { calorieRange, hydrationCopy } from "../domain/body";
import { isoDate } from "../domain/format";
import { SLOT_LABEL } from "../domain/meals";
import { macroTotals, resolveMeals } from "../domain/nutrition";
import type { DayMeals } from "../domain/types";
import { mealDay, saveMealDay, useMealLog, useProfile } from "../lib/storage";
import { Badge, Card, Disclaimer, useTitle } from "../components/ui";

export function Diet() {
  const profile = useProfile();
  const meals = useMealLog();
  useTitle("Diet");
  if (!profile) return null;
  const date = isoDate();
  const saved = meals.find((day) => day.date === date) ?? mealDay(date);
  const resolved = resolveMeals(profile, saved);
  const totals = macroTotals(resolved);
  const calories = calorieRange(profile);

  const update = (slot: string, mealId: string, done: boolean) => {
    const next: DayMeals = {
      date,
      slots: { ...(saved?.slots ?? {}) },
    };
    for (const item of resolved) {
      if (!next.slots[item.slot] && item.meal) next.slots[item.slot] = { mealId: item.meal.id, done: item.done };
    }
    next.slots[slot] = { mealId, done };
    saveMealDay(next);
  };

  if (profile.skipNutrition) {
    return (
      <div className="space-y-4">
        <h1 className="text-4xl font-semibold">Diet</h1>
        <Card>
          <p>Meal suggestions are off for this profile.</p>
          <Link to="/app/profile" className="mt-4 inline-flex text-sm text-lime">
            Turn them on in profile
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold">Today’s meals</h1>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Ideas use common Indian home-cooking patterns and your diet, allergies, and staples. Portions are a starting plate, not a prescription. Swap anything you will not eat.
        </p>
        {profile.allergies || profile.restrictions ? (
          <p className="mt-2 text-sm text-amber">
            Meals that match{" "}
            {[profile.allergies ? `allergies (${profile.allergies})` : "", profile.restrictions ? `restrictions (${profile.restrictions})` : ""]
              .filter(Boolean)
              .join(" or ")}{" "}
            are left out of the list.
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          {resolved.map((item) => (
            <Card key={item.slot}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{SLOT_LABEL[item.slot]}</h2>
                {item.meal ? <Badge>{item.meal.time}</Badge> : null}
              </div>
              {item.meal ? (
                <>
                  <label className="mt-3 block text-sm text-mute">
                    Replace meal
                    <select
                      className="mt-2 w-full rounded-2xl border border-line bg-bg px-3 py-3 text-ink"
                      value={item.meal.id}
                      onChange={(event) => update(item.slot, event.target.value, false)}
                    >
                      {item.options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-mute">
                    {item.meal.items.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-mute">
                    About {item.meal.kcal} kcal · {item.meal.protein} g protein · {item.meal.carbs} g carbs · {item.meal.fat} g fat. These are rough kitchen estimates.
                  </p>
                  <button
                    className={`mt-4 rounded-full px-4 py-2 text-sm font-semibold ${item.done ? "bg-lime text-bg" : "border border-line"}`}
                    onClick={() => update(item.slot, item.meal!.id, !item.done)}
                  >
                    {item.done ? "Completed" : "Mark completed"}
                  </button>
                </>
              ) : (
                <p className="mt-3 text-sm text-mute">
                  Nothing in the built-in list matches this slot. Use a simple plate you tolerate: vegetables, a protein, and a starch. Or relax the pantry filter in your profile.
                </p>
              )}
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold">Estimated day</h2>
            {totals ? (
              <p className="mt-3 text-sm leading-6 text-mute">
                The selected meals add up to about {totals.kcal} kcal, {totals.protein} g protein, {totals.carbs} g carbohydrates, and {totals.fat} g fat. Treat the total as a rough estimate.
              </p>
            ) : (
              <p className="mt-3 text-sm text-mute">Add a meal above to see a total.</p>
            )}
            {"missing" in calories ? (
              <p className="mt-3 text-sm text-mute">{calories.missing}</p>
            ) : (
              <p className="mt-3 text-sm text-mute">
                A broad intake range for your profile is about {calories.low}–{calories.high} kcal. {calories.detail}
              </p>
            )}
          </Card>
          <Card>
            <h2 className="text-lg font-semibold">Hydration</h2>
            <p className="mt-2 text-sm leading-6 text-mute">{hydrationCopy(profile.weightKg)}</p>
          </Card>
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
