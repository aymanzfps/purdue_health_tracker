"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MacroBars } from "./MacroBars";
import { PickRow } from "./PickRow";
import { CourtPicker, MealPicker } from "./Pickers";
import { PlateDiagram } from "./PlateDiagram";
import { Card, ErrorNote, FitBadge, SetupPrompt, Spinner } from "./ui";
import { api, type MenuResponse } from "@/lib/client/api";
import {
  ALL_COURTS,
  courtLabel,
  DAY_MEALS,
  formatDay,
  formatHours,
  mealForNow,
  todayInWestLafayette,
} from "@/lib/client/meals";
import { useProfile } from "@/lib/client/profile";
import { DINING_COURTS } from "@/lib/courts";
import { GOALS } from "@/lib/targets";
import type { Recommendation } from "@/lib/types";

const LAST_COURT_KEY = "boilerplate.court";
const isCourt = (c: string | null): c is string => !!c && (c === ALL_COURTS || DINING_COURTS.includes(c));

function rememberedCourt(): string {
  try {
    const saved = localStorage.getItem(LAST_COURT_KEY);
    if (isCourt(saved)) return saved;
  } catch {}
  return "Wiley";
}

export function TodayView() {
  const router = useRouter();
  const params = useSearchParams();
  const { profile, ready, save } = useProfile();

  const [court, setCourt] = useState<string | null>(null);
  const [meal, setMeal] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [scores, setScores] = useState<Record<string, number | undefined>>({});
  const [exclude, setExclude] = useState<string[]>([]);
  const [lock, setLock] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const isAll = court === ALL_COURTS;

  // Court comes from the link (Compare / Day plan) or the last one used.
  useEffect(() => {
    const fromUrl = params.get("court");
    setCourt(isCourt(fromUrl) ? fromUrl : rememberedCourt());
  }, [params]);

  // A single court's menu tells us which meals it serves today and when.
  useEffect(() => {
    if (!court) return;
    setError(null);
    setMenu(null);
    const wanted = params.get("meal");
    if (court === ALL_COURTS) {
      setMeal((current) => {
        const preferred = wanted ?? current;
        return preferred && (DAY_MEALS as readonly string[]).includes(preferred) ? preferred : mealForNow();
      });
      return;
    }
    const ctl = new AbortController();
    api
      .menu(court, ctl.signal)
      .then((m) => {
        setMenu(m);
        const open = m.meals.filter((x) => x.status === "Open").map((x) => x.name);
        setMeal((current) => {
          const preferred = wanted ?? current;
          return preferred && open.includes(preferred) ? preferred : (m.currentMeal ?? open[0] ?? null);
        });
      })
      .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    return () => ctl.abort();
    // `params` only matters on first load; later meal changes go through setMeal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [court, retry]);

  // The recommendation for the chosen court (or all courts) and meal.
  useEffect(() => {
    if (!profile || !court || !meal || (!isAll && !menu)) return;
    const ctl = new AbortController();
    setRec(null);
    api
      .recommend({ profile, location: court, meal, exclude, lock }, ctl.signal)
      .then(setRec)
      .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    return () => ctl.abort();
  }, [profile, court, isAll, meal, menu, exclude, lock]);

  // Fit scores for every court tile, plus the "best across all" tile.
  useEffect(() => {
    if (!profile || !meal) return;
    const ctl = new AbortController();
    setScores({});
    api
      .compare({ profile, meal }, ctl.signal)
      .then((r) =>
        setScores((s) => ({
          ...s,
          ...Object.fromEntries(r.courts.map((c) => [c.location, c.recommendation?.fitScore])),
        })),
      )
      .catch(() => {});
    api
      .recommend({ profile, location: ALL_COURTS, meal }, ctl.signal)
      .then((r) => setScores((s) => ({ ...s, [ALL_COURTS]: r.fitScore })))
      .catch(() => {});
    return () => ctl.abort();
  }, [profile, meal]);

  const chooseCourt = useCallback(
    (next: string) => {
      try {
        localStorage.setItem(LAST_COURT_KEY, next);
      } catch {}
      setExclude([]);
      setLock([]);
      setCourt(next);
      router.replace(`/?court=${encodeURIComponent(next)}${meal ? `&meal=${encodeURIComponent(meal)}` : ""}`, { scroll: false });
    },
    [meal, router],
  );

  const chooseMeal = (next: string) => {
    setExclude([]);
    setLock([]);
    setMeal(next);
  };

  if (!ready) return <Spinner label="Loading" />;
  if (!profile) return <SetupPrompt />;

  const goalLabel = profile.goal === "custom" ? "Custom" : GOALS[profile.goal].label;
  const meals = isAll
    ? DAY_MEALS.map((name) => ({ name, hours: null }))
    : (menu?.meals ?? [])
        .filter((m) => m.status === "Open")
        .map((m) => ({ name: m.name, hours: formatHours(m.startTime && m.endTime ? { start: m.startTime, end: m.endTime } : null) }));
  const noMeals = !isAll && menu && meals.length === 0;

  // Single-court tiles with scores, for the "rather one stop?" hint.
  const bestSingle = DINING_COURTS.map((c) => ({ court: c, score: scores[c] }))
    .filter((c): c is { court: string; score: number } => c.score !== undefined)
    .sort((a, b) => b.score - a.score)[0];
  const stops = rec && isAll ? [...new Set(rec.picks.map((p) => p.item.locations?.[0]).filter(Boolean))] : [];

  return (
    <div className="space-y-5">
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted">{formatDay(rec?.date ?? todayInWestLafayette())}</p>
          <button
            type="button"
            onClick={() => save({ ...profile, isTrainingDay: !profile.isTrainingDay })}
            className="shrink-0 rounded-lg bg-card px-2 py-1 text-xs text-muted hover:text-cream"
            title="Switch training day or rest day"
          >
            {goalLabel} · <span className="text-gold">{profile.isTrainingDay ? "training day" : "rest day"}</span>
          </button>
        </div>
        <h1 className="-mt-2 text-2xl font-medium">
          {court ? courtLabel(court) : "…"}
          {meal && <span className="text-muted"> · {meal}</span>}
        </h1>
        <CourtPicker courts={DINING_COURTS} value={court} scores={scores} onChange={chooseCourt} />
        {meals.length > 0 && <MealPicker meals={meals} value={meal} onChange={chooseMeal} />}
      </header>

      {error && <ErrorNote message={error} onRetry={() => setRetry((n) => n + 1)} />}
      {!error && noMeals && (
        <Card className="text-sm text-muted">{court} isn&apos;t serving any meals today. Try another court.</Card>
      )}
      {!error && !noMeals && !rec && <Spinner label={isAll ? "Searching every dining court" : "Building your plate"} />}

      {rec && (
        <>
          {isAll && stops.length > 0 && (
            <Card className="border border-gold/30 text-sm">
              {stops.length === 1 ? (
                <p>
                  Mixing courts doesn&apos;t beat one stop today: everything comes from{" "}
                  <span className="text-gold">{stops[0]}</span>.
                </p>
              ) : (
                <p>
                  Mixes items from <span className="text-gold">{stops.join(", ")}</span>.
                </p>
              )}
              {bestSingle && stops.length > 1 && (
                <button
                  type="button"
                  onClick={() => chooseCourt(bestSingle.court)}
                  className="mt-1 text-xs text-muted underline-offset-2 hover:text-cream hover:underline"
                >
                  Rather make one stop? {bestSingle.court} scores {bestSingle.score} →
                </button>
              )}
            </Card>
          )}

          <Card>
            <div className="flex items-center gap-4">
              <PlateDiagram picks={rec.picks} size={128} />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted">protein</div>
                <div className="text-3xl leading-tight font-medium text-gold tabular-nums">{rec.totals.protein}g</div>
                <div className="mt-1 text-xs text-muted tabular-nums">
                  {rec.totals.calories} / {rec.targets.calories} kcal
                </div>
                <FitBadge score={rec.fitScore} className="mt-2" />
              </div>
            </div>
            <div className="mt-4">
              <MacroBars totals={rec.totals} targets={rec.targets} />
            </div>
          </Card>

          <Card className="py-1">
            {rec.picks.length === 0 ? (
              <p className="py-3 text-sm text-muted">Nothing here fits your filters. Try another court or loosen your food preferences.</p>
            ) : (
              <ul>
                {rec.picks.map((pick, i) => (
                  <PickRow
                    key={pick.item.id}
                    pick={pick}
                    index={i}
                    locked={lock.includes(pick.item.id)}
                    onToggleLock={() =>
                      setLock((l) => (l.includes(pick.item.id) ? l.filter((x) => x !== pick.item.id) : [...l, pick.item.id]))
                    }
                    onSwap={() => {
                      setLock((l) => l.filter((x) => x !== pick.item.id));
                      setExclude((x) => [...x, pick.item.id]);
                    }}
                  />
                ))}
              </ul>
            )}
            {exclude.length > 0 && (
              <button type="button" onClick={() => setExclude([])} className="mb-2 text-xs text-muted underline underline-offset-2">
                Bring back {exclude.length} swapped item{exclude.length > 1 ? "s" : ""}
              </button>
            )}
          </Card>
          <p className="px-1 text-[11px] text-muted">
            Fist ≈ 1 cup, palm ≈ 3 oz of meat, thumb ≈ 1 tbsp. Portions are estimates from Purdue&apos;s listed serving sizes.
          </p>
        </>
      )}
    </div>
  );
}
