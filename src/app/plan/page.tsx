"use client";

import { useEffect, useState } from "react";
import { CourtCard } from "@/components/CourtCard";
import { MacroBars } from "@/components/MacroBars";
import { Card, ErrorNote, SectionLabel, SetupPrompt, Spinner } from "@/components/ui";
import { api } from "@/lib/client/api";
import { DAY_MEALS } from "@/lib/client/meals";
import { useProfile } from "@/lib/client/profile";
import { dailyTargets, mealShare } from "@/lib/targets";
import type { MacroTargets, Recommendation } from "@/lib/types";

type DayPlan = { meal: string; rec: Recommendation | null }[];

export default function PlanPage() {
  const { profile, ready } = useProfile();
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  // Best court for each meal of the day.
  useEffect(() => {
    if (!profile) return;
    const ctl = new AbortController();
    setPlan(null);
    setError(null);
    Promise.all(
      DAY_MEALS.map(async (meal) => {
        const { courts } = await api.compare({ profile, meal }, ctl.signal);
        return { meal, rec: courts.find((c) => c.recommendation)?.recommendation ?? null };
      }),
    )
      .then(setPlan)
      .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    return () => ctl.abort();
  }, [profile, retry]);

  if (!ready) return <Spinner label="Loading" />;
  if (!profile) return <SetupPrompt />;

  const daily = dailyTargets(profile);
  const recs = plan?.flatMap((p) => (p.rec ? [p.rec] : [])) ?? [];
  const totals = recs.reduce(
    (acc, r) => ({
      calories: acc.calories + r.totals.calories,
      protein: acc.protein + r.totals.protein,
      carbs: acc.carbs + r.totals.carbs,
      fat: acc.fat + r.totals.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 } as MacroTargets,
  );
  // With more than three meals a day, part of the day is snacks outside the dining courts.
  const snackShare = 1 - DAY_MEALS.reduce((sum, m) => sum + mealShare(m, profile.mealsPerDay), 0);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-medium">Day plan</h1>
        <p className="text-sm text-muted">The best court for each meal today, adding up to your daily targets.</p>
      </header>

      {error && <ErrorNote message={error} onRetry={() => setRetry((n) => n + 1)} />}
      {!error && !plan && <Spinner label="Planning breakfast, lunch, and dinner" />}

      {plan && (
        <>
          <Card>
            <div className="mb-3 flex items-baseline justify-between">
              <SectionLabel>Today&apos;s total</SectionLabel>
              <span className="text-xs text-muted tabular-nums">
                <span className="text-lg font-medium text-cream">{totals.calories.toLocaleString()}</span> / {daily.calories.toLocaleString()} kcal
              </span>
            </div>
            <MacroBars totals={totals} targets={daily} />
            {snackShare > 0.01 && (
              <p className="mt-3 text-xs text-muted">
                About {Math.round(snackShare * 100)}% of your day is left for snacks outside the dining courts.
              </p>
            )}
          </Card>
          <div className="space-y-3">
            {plan.map(({ meal, rec }) =>
              rec ? (
                <CourtCard key={meal} rec={rec} title={`${meal} · ${rec.location}`} />
              ) : (
                <Card key={meal} className="text-sm text-muted">
                  No dining court is serving {meal.toLowerCase()} today.
                </Card>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}
