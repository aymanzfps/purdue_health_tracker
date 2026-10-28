"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card, Chips, SectionLabel, Toggle } from "@/components/ui";
import { DEFAULT_PROFILE, useProfile } from "@/lib/client/profile";
import { ACTIVITY_MULTIPLIERS, CM_PER_IN, dailyTargets, GOALS, LB_PER_KG, tdee } from "@/lib/targets";
import { DAY_MEALS, type ActivityLevel, type GoalId, type Profile } from "@/lib/types";

const ALLERGENS = ["Eggs", "Fish", "Gluten", "Milk", "Peanuts", "Sesame", "Shellfish", "Soy", "Tree Nuts", "Wheat", "Coconut"];

const GOAL_OPTIONS: { id: GoalId; label: string; description: string }[] = [
  ...Object.values(GOALS),
  { id: "custom", label: "Custom", description: "Set your own calories and macros." },
];

/** Form state keeps imperial units as typed so half-typed numbers don't get rounded away. */
interface FormState {
  weightLb: string;
  heightFt: string;
  heightIn: string;
  age: string;
  customCalories: string;
  customProtein: string;
  customCarbs: string;
  customFat: string;
  dislikes: string;
}

function toForm(p: Profile): FormState {
  const totalIn = p.heightCm / CM_PER_IN;
  return {
    weightLb: String(Math.round(p.weightKg * LB_PER_KG)),
    heightFt: String(Math.floor(totalIn / 12)),
    heightIn: String(Math.round(totalIn % 12)),
    age: String(p.age),
    customCalories: String(p.custom?.calories ?? 2500),
    customProtein: String(p.custom?.protein ?? 160),
    customCarbs: String(p.custom?.carbs ?? 280),
    customFat: String(p.custom?.fat ?? 75),
    dislikes: p.dislikes.join(", "),
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { profile: saved, ready, save } = useProfile();
  const [draft, setDraft] = useState<Profile>(DEFAULT_PROFILE);
  const [form, setForm] = useState<FormState>(toForm(DEFAULT_PROFILE));
  const [savedNote, setSavedNote] = useState(false);

  useEffect(() => {
    if (ready && saved) {
      setDraft(saved);
      setForm(toForm(saved));
    }
    // Only load once the saved profile has been read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setField = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Merge typed numbers into the profile; null when something is missing or out of range.
  const merged = useMemo<Profile | null>(() => {
    const n = (s: string) => (s.trim() === "" ? NaN : Number(s));
    const weightLb = n(form.weightLb);
    const heightIn = n(form.heightFt) * 12 + (n(form.heightIn) || 0);
    const age = n(form.age);
    if (!(weightLb >= 70 && weightLb <= 600) || !(heightIn >= 48 && heightIn <= 96) || !(age >= 14 && age <= 100)) {
      return null;
    }
    const p: Profile = {
      ...draft,
      weightKg: weightLb / LB_PER_KG,
      heightCm: heightIn * CM_PER_IN,
      age,
      dislikes: form.dislikes.split(",").map((s) => s.trim()).filter(Boolean),
    };
    if (draft.goal === "custom") {
      const custom = {
        calories: n(form.customCalories),
        protein: n(form.customProtein),
        carbs: n(form.customCarbs),
        fat: n(form.customFat),
      };
      if (!(custom.calories >= 800) || [custom.protein, custom.carbs, custom.fat].some((v) => !(v >= 0))) return null;
      p.custom = custom;
    }
    return p;
  }, [draft, form]);

  const targets = merged ? dailyTargets(merged) : null;
  const maintenance = merged ? Math.round(tdee(merged)) : null;

  function onSave() {
    if (!merged) return;
    const isFirstSave = !saved;
    save(merged);
    if (isFirstSave) router.push("/");
    else {
      setSavedNote(true);
      setTimeout(() => setSavedNote(false), 2000);
    }
  }

  const input =
    "w-full rounded-lg border border-line bg-card-hi px-3 py-2 text-sm text-cream outline-none focus:border-gold";

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-medium">Your goals</h1>
        <p className="text-sm text-muted">Used to size every plate. Saved in this browser only.</p>
      </header>

      <Card>
        <SectionLabel>Goal</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {GOAL_OPTIONS.map((g) => {
            const active = draft.goal === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => set("goal", g.id)}
                aria-pressed={active}
                className={`rounded-xl border p-3 text-left transition ${
                  active ? "border-gold bg-gold/10" : "border-line bg-card-hi hover:border-muted"
                }`}
              >
                <span className={`block text-sm font-medium ${active ? "text-gold" : ""}`}>{g.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">{g.description}</span>
              </button>
            );
          })}
        </div>
        {draft.goal === "custom" && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {(
              [
                ["customCalories", "kcal"],
                ["customProtein", "protein g"],
                ["customCarbs", "carbs g"],
                ["customFat", "fat g"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-xs text-muted">
                {label}
                <input inputMode="numeric" type="number" className={`${input} mt-1`} value={form[key]} onChange={(e) => setField(key, e.target.value)} />
              </label>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionLabel>Your stats</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-muted">
            Weight (lb)
            <input inputMode="numeric" type="number" className={`${input} mt-1`} value={form.weightLb} onChange={(e) => setField("weightLb", e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Height (ft, in)
            <span className="mt-1 flex gap-1">
              <input aria-label="Feet" placeholder="ft" inputMode="numeric" type="number" className={input} value={form.heightFt} onChange={(e) => setField("heightFt", e.target.value)} />
              <input aria-label="Inches" placeholder="in" inputMode="numeric" type="number" className={input} value={form.heightIn} onChange={(e) => setField("heightIn", e.target.value)} />
            </span>
          </label>
          <label className="text-xs text-muted">
            Age
            <input inputMode="numeric" type="number" className={`${input} mt-1`} value={form.age} onChange={(e) => setField("age", e.target.value)} />
          </label>
        </div>
        <div className="mt-3">
          <Chips
            label="Sex"
            value={draft.sex}
            onChange={(v) => set("sex", v)}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
          />
        </div>
        <label className="mt-3 block text-xs text-muted">
          Activity level
          <select
            className={`${input} mt-1`}
            value={draft.activity}
            onChange={(e) => set("activity", e.target.value as ActivityLevel)}
          >
            {Object.entries(ACTIVITY_MULTIPLIERS).map(([id, a]) => (
              <option key={id} value={id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        {!merged && <p className="mt-2 text-xs text-warn">Check your weight, height, and age.</p>}
      </Card>

      {targets && (
        <Card className="border border-gold/40">
          <SectionLabel>Your daily targets</SectionLabel>
          <div className="grid grid-cols-4 gap-2 text-center">
            {(
              [
                ["kcal", targets.calories],
                ["protein", `${targets.protein}g`],
                ["carbs", `${targets.carbs}g`],
                ["fat", `${targets.fat}g`],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg bg-card-hi py-2">
                <div className={`text-lg font-medium tabular-nums ${label === "protein" ? "text-gold" : ""}`}>{value}</div>
                <div className="text-[11px] text-muted">{label}</div>
              </div>
            ))}
          </div>
          {draft.goal !== "custom" && maintenance && (
            <p className="mt-2 text-xs text-muted">
              You burn about {maintenance.toLocaleString()} kcal a day.{" "}
              {draft.isTrainingDay ? "Training days add carbs." : "Rest days trim carbs."}
            </p>
          )}
        </Card>
      )}

      <Card>
        <SectionLabel>Your day</SectionLabel>
        <Toggle label="Training day" hint="More carbs on days you lift" checked={draft.isTrainingDay} onChange={(v) => set("isTrainingDay", v)} />
        <div className="py-2">
          <span className="mb-1.5 block text-sm">Dining court meals you eat</span>
          <div className="flex flex-wrap gap-1.5">
            {DAY_MEALS.map((meal) => {
              const on = draft.diningMeals.includes(meal);
              return (
                <button
                  key={meal}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    if (on && draft.diningMeals.length === 1) return; // keep at least one meal
                    set(
                      "diningMeals",
                      on ? draft.diningMeals.filter((m) => m !== meal) : DAY_MEALS.filter((m) => m === meal || draft.diningMeals.includes(m)),
                    );
                  }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs transition ${on ? "bg-gold text-ink" : "bg-card-hi text-muted hover:bg-line"}`}
                >
                  {meal}
                </button>
              );
            })}
          </div>
          <span className="mt-1 block text-xs text-muted">Your day&apos;s food is split across these.</span>
        </div>
        <div className="py-2">
          <span className="mb-1.5 block text-sm">Snacks outside the dining courts</span>
          <Chips
            label="Snacks per day"
            value={String(draft.snacksPerDay)}
            onChange={(v) => set("snacksPerDay", Number(v))}
            options={["0", "1", "2", "3"].map((v) => ({ value: v, label: v }))}
          />
          <span className="mt-1 block text-xs text-muted">Each snack sets aside about 10% of the day.</span>
        </div>
      </Card>

      <Card>
        <SectionLabel>Food preferences</SectionLabel>
        <Toggle label="Vegetarian" checked={draft.vegetarian} onChange={(v) => set("vegetarian", v)} />
        <Toggle label="Vegan" checked={draft.vegan} onChange={(v) => set("vegan", v)} />
        <Toggle label="Allow a dessert" hint="Up to one serving per meal" checked={draft.allowDessert} onChange={(v) => set("allowDessert", v)} />
        <div className="py-2">
          <span className="mb-1.5 block text-sm">Avoid allergens</span>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGENS.map((a) => {
              const on = draft.avoidAllergens.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    set("avoidAllergens", on ? draft.avoidAllergens.filter((x) => x !== a) : [...draft.avoidAllergens, a])
                  }
                  className={`rounded-lg px-2.5 py-1.5 text-xs transition ${on ? "bg-warn/20 text-warn" : "bg-card-hi hover:bg-line"}`}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>
        <label className="block py-2 text-sm">
          Foods you won&apos;t eat
          <input
            className={`${input} mt-1.5`}
            placeholder="mushrooms, tofu, olives"
            value={form.dislikes}
            onChange={(e) => setField("dislikes", e.target.value)}
          />
        </label>
      </Card>

      <div className="sticky bottom-20 sm:bottom-4">
        <button
          type="button"
          onClick={onSave}
          disabled={!merged}
          className="w-full rounded-xl bg-gold py-3 text-sm font-medium text-ink transition disabled:opacity-40"
        >
          {savedNote ? "Saved" : saved ? "Save changes" : "Save and see my plate"}
        </button>
      </div>
    </div>
  );
}
