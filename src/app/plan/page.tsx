"use client";

import { useEffect, useMemo, useState } from "react";
import { CourtCard } from "@/components/CourtCard";
import { MacroBars } from "@/components/MacroBars";
import { Card, ErrorNote, FitBadge, SectionLabel, SetupPrompt, Spinner } from "@/components/ui";
import { api } from "@/lib/client/api";
import { ALL_COURTS, ALL_COURTS_LABEL, DAY_MEALS, formatDay, formatHours, todayInWestLafayette } from "@/lib/client/meals";
import { useProfile } from "@/lib/client/profile";
import { DINING_COURTS } from "@/lib/courts";
import type { CourtComparison } from "@/lib/recommend";
import { dailyTargets, SNACK_SHARE } from "@/lib/targets";
import type { DayMeal, MacroTargets, Profile, Recommendation } from "@/lib/types";

/** "best" = top single court, "all" = mix across courts, or a court name. */
type Source = string;
const BEST = "best";

interface MealOptions {
  courts: CourtComparison[];
  all: Recommendation | null;
}

const choicesKey = (date: string) => `boilerplate.plan.${date}`;

function loadChoices(date: string): Partial<Record<DayMeal, Source>> {
  try {
    return JSON.parse(localStorage.getItem(choicesKey(date)) ?? "{}");
  } catch {
    return {};
  }
}

function pickRec(options: MealOptions, source: Source): Recommendation | null {
  if (source === ALL_COURTS) return options.all;
  const open = options.courts.filter((c) => c.recommendation);
  if (source === BEST) return open[0]?.recommendation ?? null;
  return open.find((c) => c.location === source)?.recommendation ?? open[0]?.recommendation ?? null;
}

export default function PlanPage() {
  const { profile, ready, save } = useProfile();
  const date = todayInWestLafayette();
  const [options, setOptions] = useState<Partial<Record<DayMeal, MealOptions>>>({});
  const [choices, setChoices] = useState<Partial<Record<DayMeal, Source>>>({});
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => setChoices(loadChoices(date)), [date]);

  const meals = useMemo(() => profile?.diningMeals ?? [], [profile]);

  // For each meal you eat: every court's best plate, plus the mix across all courts.
  useEffect(() => {
    if (!profile) return;
    const ctl = new AbortController();
    setOptions({});
    setError(null);
    for (const meal of profile.diningMeals) {
      Promise.all([
        api.compare({ profile, meal }, ctl.signal),
        api.recommend({ profile, location: ALL_COURTS, meal }, ctl.signal).catch(() => null),
      ])
        .then(([cmp, all]) => setOptions((o) => ({ ...o, [meal]: { courts: cmp.courts, all } })))
        .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    }
    return () => ctl.abort();
  }, [profile, retry]);

  const choose = (meal: DayMeal, source: Source) => {
    const next = { ...choices, [meal]: source };
    setChoices(next);
    try {
      localStorage.setItem(choicesKey(date), JSON.stringify(next));
    } catch {}
  };

  const planned = useMemo(
    () =>
      meals.map((meal) => {
        const opts = options[meal];
        const source = choices[meal] ?? BEST;
        return { meal, source, opts, rec: opts ? pickRec(opts, source) : null };
      }),
    [meals, options, choices],
  );

  if (!ready) return <Spinner label="Loading" />;
  if (!profile) return <SetupPrompt />;

  const daily = dailyTargets(profile);
  const totals = planned.reduce(
    (acc, { rec }) =>
      rec
        ? {
            calories: acc.calories + rec.totals.calories,
            protein: acc.protein + rec.totals.protein,
            carbs: acc.carbs + rec.totals.carbs,
            fat: acc.fat + rec.totals.fat,
          }
        : acc,
    { calories: 0, protein: 0, carbs: 0, fat: 0 } as MacroTargets,
  );
  const loading = planned.some((p) => !p.opts);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs text-muted">{formatDay(date)}</p>
        <h1 className="text-2xl font-medium">Day plan</h1>
      </header>

      <MealSettings profile={profile} onChange={save} />

      {error && <ErrorNote message={error} onRetry={() => setRetry((n) => n + 1)} />}

      <DayTotals totals={totals} daily={daily} loading={loading} snacks={profile.snacksPerDay} />

      <ol className="relative space-y-4 border-l border-line pl-5">
        {planned.map(({ meal, source, opts, rec }) => (
          <li key={meal} className="relative">
            <span className="absolute top-1.5 -left-[26px] h-3 w-3 rounded-full border-2 border-gold bg-ink" aria-hidden="true" />
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="text-base font-medium">
                {meal}
                {rec?.hours && <span className="ml-2 text-xs font-normal text-muted">{formatHours(rec.hours)}</span>}
              </h2>
              {rec && <FitBadge score={rec.fitScore} />}
            </div>
            <Card>
              {!opts ? (
                <Spinner label={`Planning ${meal.toLowerCase()}`} />
              ) : (
                <>
                  <SourcePicker opts={opts} value={source} onChange={(s) => choose(meal, s)} />
                  <div className="mt-3">
                    {rec ? (
                      <CourtCard rec={rec} bare />
                    ) : (
                      <p className="text-sm text-muted">No dining court is serving {meal.toLowerCase()} today.</p>
                    )}
                  </div>
                </>
              )}
            </Card>
          </li>
        ))}
        {profile.snacksPerDay > 0 && (
          <li className="relative">
            <span className="absolute top-1.5 -left-[26px] h-3 w-3 rounded-full border-2 border-muted bg-ink" aria-hidden="true" />
            <h2 className="mb-2 text-base font-medium">
              Snack{profile.snacksPerDay > 1 ? `s ×${profile.snacksPerDay}` : ""}
            </h2>
            <SnackCard daily={daily} totals={totals} loading={loading} snacks={profile.snacksPerDay} />
          </li>
        )}
      </ol>
    </div>
  );
}

/** Which meals you eat at the dining courts, and how many snacks. Saves to your profile. */
function MealSettings({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const toggle = (meal: DayMeal) => {
    const on = profile.diningMeals.includes(meal);
    if (on && profile.diningMeals.length === 1) return; // keep at least one meal
    const next = on ? profile.diningMeals.filter((m) => m !== meal) : DAY_MEALS.filter((m) => m === meal || profile.diningMeals.includes(m));
    onChange({ ...profile, diningMeals: next });
  };
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted">Meals</span>
        {DAY_MEALS.map((meal) => {
          const on = profile.diningMeals.includes(meal);
          return (
            <button
              key={meal}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(meal)}
              className={`rounded-lg px-2.5 py-1 text-xs transition ${on ? "bg-gold text-ink" : "bg-card text-muted line-through hover:text-cream"}`}
            >
              {meal}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted">Snacks</span>
        <button
          type="button"
          aria-label="Fewer snacks"
          onClick={() => onChange({ ...profile, snacksPerDay: Math.max(0, profile.snacksPerDay - 1) })}
          className="h-6 w-6 rounded-md bg-card text-sm hover:bg-card-hi"
        >
          −
        </button>
        <span className="w-4 text-center text-sm tabular-nums">{profile.snacksPerDay}</span>
        <button
          type="button"
          aria-label="More snacks"
          onClick={() => onChange({ ...profile, snacksPerDay: Math.min(3, profile.snacksPerDay + 1) })}
          className="h-6 w-6 rounded-md bg-card text-sm hover:bg-card-hi"
        >
          +
        </button>
      </div>
    </div>
  );
}

function DayTotals({
  totals,
  daily,
  loading,
  snacks,
}: {
  totals: MacroTargets;
  daily: MacroTargets;
  loading: boolean;
  snacks: number;
}) {
  // Snacks are planned outside the dining courts, so the meals aim for the rest.
  const mealShare = 1 - snacks * SNACK_SHARE;
  const mealTargets: MacroTargets = {
    calories: Math.round(daily.calories * mealShare),
    protein: Math.round(daily.protein * mealShare),
    carbs: Math.round(daily.carbs * mealShare),
    fat: Math.round(daily.fat * mealShare),
  };
  const tiles = [
    { label: "kcal", value: totals.calories.toLocaleString(), target: mealTargets.calories.toLocaleString(), gold: false },
    { label: "protein", value: `${totals.protein}g`, target: `${mealTargets.protein}g`, gold: true },
    { label: "carbs", value: `${totals.carbs}g`, target: `${mealTargets.carbs}g`, gold: false },
    { label: "fat", value: `${totals.fat}g`, target: `${mealTargets.fat}g`, gold: false },
  ];
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between">
        <SectionLabel>{snacks > 0 ? "From the dining courts" : "Today's total"}</SectionLabel>
        {loading && <span className="text-[11px] text-muted">updating…</span>}
      </div>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg bg-card-hi px-2 py-2">
            <div className="text-[11px] text-muted">{t.label}</div>
            <div className={`text-base font-medium tabular-nums ${t.gold ? "text-gold" : ""}`}>{t.value}</div>
            <div className="text-[10px] text-muted tabular-nums">of {t.target}</div>
          </div>
        ))}
      </div>
      <MacroBars totals={totals} targets={mealTargets} />
    </Card>
  );
}

function SnackCard({
  daily,
  totals,
  loading,
  snacks,
}: {
  daily: MacroTargets;
  totals: MacroTargets;
  loading: boolean;
  snacks: number;
}) {
  if (loading) return <Card className="text-sm text-muted">Waiting for your meals…</Card>;
  const left = {
    calories: Math.max(0, daily.calories - totals.calories),
    protein: Math.max(0, daily.protein - totals.protein),
  };
  const each = { calories: Math.round(left.calories / snacks), protein: Math.round(left.protein / snacks) };
  return (
    <Card className="text-sm">
      <p>
        About <span className="text-gold">{each.calories} kcal</span> and{" "}
        <span className="text-gold">{each.protein}g protein</span>
        {snacks > 1 ? " per snack" : ""} left for the day.
      </p>
      <p className="mt-1 text-xs text-muted">A protein shake, Greek yogurt, or a turkey sandwich fits most goals.</p>
    </Card>
  );
}

function SourcePicker({ opts, value, onChange }: { opts: MealOptions; value: Source; onChange: (s: Source) => void }) {
  const open = opts.courts.filter((c) => c.recommendation);
  const top = open[0];
  const select = DINING_COURTS.includes(value) ? value : "";
  const btn = (active: boolean) =>
    `rounded-lg px-2.5 py-1.5 text-xs transition ${active ? "bg-gold text-ink" : "bg-card-hi hover:bg-line"}`;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" className={btn(value === BEST)} onClick={() => onChange(BEST)}>
        Best court{top ? ` · ${top.location}` : ""}
      </button>
      {opts.all && (
        <button type="button" className={btn(value === ALL_COURTS)} onClick={() => onChange(ALL_COURTS)}>
          {ALL_COURTS_LABEL} · {opts.all.fitScore}
        </button>
      )}
      <select
        aria-label="Pick a dining court"
        value={select}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className={`${btn(!!select)} appearance-none pr-2 outline-none`}
      >
        <option value="">Choose court…</option>
        {open.map((c) => (
          <option key={c.location} value={c.location}>
            {c.location} · {c.recommendation!.fitScore}
          </option>
        ))}
      </select>
    </div>
  );
}
