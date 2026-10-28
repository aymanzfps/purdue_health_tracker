"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MacroBars } from "./MacroBars";
import { PickRow } from "./PickRow";
import { PlateDiagram } from "./PlateDiagram";
import { Card, Chips, ErrorNote, FitBadge, SectionLabel, SetupPrompt, Spinner } from "./ui";
import { api, type MenuResponse } from "@/lib/client/api";
import { useProfile } from "@/lib/client/profile";
import { DINING_COURTS } from "@/lib/courts";
import { GOALS } from "@/lib/targets";
import type { Recommendation } from "@/lib/types";
import type { CourtComparison } from "@/lib/recommend";

const LAST_COURT_KEY = "boilerplate.court";

function rememberedCourt(): string {
  try {
    const saved = localStorage.getItem(LAST_COURT_KEY);
    if (saved && DINING_COURTS.includes(saved)) return saved;
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
  const [courts, setCourts] = useState<CourtComparison[] | null>(null);
  const [exclude, setExclude] = useState<string[]>([]);
  const [lock, setLock] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  // Court comes from the link (Compare page) or the last one used.
  useEffect(() => {
    const fromUrl = params.get("court");
    setCourt(fromUrl && DINING_COURTS.includes(fromUrl) ? fromUrl : rememberedCourt());
  }, [params]);

  // Load the court's menu to know which meals it serves today.
  useEffect(() => {
    if (!court) return;
    const ctl = new AbortController();
    setMenu(null);
    setError(null);
    api
      .menu(court, ctl.signal)
      .then((m) => {
        setMenu(m);
        const open = m.meals.filter((x) => x.status === "Open").map((x) => x.name);
        const wanted = params.get("meal");
        setMeal((current) => {
          const preferred = wanted ?? current;
          return preferred && open.includes(preferred) ? preferred : (m.currentMeal ?? open[0] ?? null);
        });
      })
      .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    return () => ctl.abort();
    // `params` only matters on first load; meal changes are handled by setMeal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [court, retry]);

  // The recommendation for the chosen court and meal.
  useEffect(() => {
    if (!profile || !court || !meal || !menu) return;
    const ctl = new AbortController();
    setRec(null);
    api
      .recommend({ profile, location: court, meal, exclude, lock }, ctl.signal)
      .then(setRec)
      .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    return () => ctl.abort();
  }, [profile, court, meal, menu, exclude, lock]);

  // Fit at every court for the same meal, for the ranking chips.
  useEffect(() => {
    if (!profile || !meal) return;
    const ctl = new AbortController();
    setCourts(null);
    api
      .compare({ profile, meal }, ctl.signal)
      .then((r) => setCourts(r.courts))
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
  const openMeals = menu?.meals.filter((m) => m.status === "Open") ?? [];

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-xl font-medium">
            {court ?? "…"}
            {meal && <span className="text-muted"> · {meal}</span>}
          </h1>
          <button
            type="button"
            onClick={() => save({ ...profile, isTrainingDay: !profile.isTrainingDay })}
            className="shrink-0 rounded-lg bg-card px-2 py-1 text-xs text-muted hover:text-cream"
            title="Switch training day or rest day"
          >
            {goalLabel} · <span className="text-gold">{profile.isTrainingDay ? "training day" : "rest day"}</span>
          </button>
        </div>
        <Chips
          label="Dining court"
          value={court}
          onChange={chooseCourt}
          options={DINING_COURTS.map((c) => ({ value: c, label: c }))}
        />
        {openMeals.length > 0 && (
          <Chips
            label="Meal"
            value={meal}
            onChange={chooseMeal}
            options={openMeals.map((m) => ({ value: m.name, label: m.name }))}
          />
        )}
      </header>

      {error && <ErrorNote message={error} onRetry={() => setRetry((n) => n + 1)} />}
      {!error && menu && openMeals.length === 0 && (
        <Card className="text-sm text-muted">{court} isn&apos;t serving any meals today. Try another court.</Card>
      )}
      {!error && (!menu || (openMeals.length > 0 && !rec)) && <Spinner label="Building your plate" />}

      {rec && (
        <>
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

      {meal && (
        <section>
          <SectionLabel>Best courts for {meal.toLowerCase()} right now</SectionLabel>
          {!courts ? (
            <div className="h-8 animate-pulse rounded-lg bg-card" />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {courts
                .filter((c) => c.status === "ok")
                .map((c) => (
                  <button
                    key={c.location}
                    type="button"
                    onClick={() => chooseCourt(c.location)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs ${c.location === court ? "bg-gold/15 ring-1 ring-gold" : "bg-card hover:bg-card-hi"}`}
                  >
                    {c.location}{" "}
                    <span className={`tabular-nums ${(c.recommendation?.fitScore ?? 0) >= 85 ? "text-gold" : "text-warn"}`}>
                      {c.recommendation?.fitScore}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
