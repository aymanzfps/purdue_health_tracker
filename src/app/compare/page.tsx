"use client";

import { useEffect, useState } from "react";
import { CourtCard } from "@/components/CourtCard";
import { DatePicker } from "@/components/DatePicker";
import { Chips, ErrorNote, NotReleased, SetupPrompt, Spinner } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useSelectedDate } from "@/lib/client/date";
import { DAY_MEALS, formatDay, mealForNow, todayInWestLafayette } from "@/lib/client/meals";
import { useProfile } from "@/lib/client/profile";
import type { CourtComparison } from "@/lib/recommend";

export default function ComparePage() {
  const { profile, ready } = useProfile();
  const { date, setDate } = useSelectedDate();
  const [meal, setMeal] = useState<string>(() => mealForNow());
  const [courts, setCourts] = useState<CourtComparison[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!profile) return;
    const ctl = new AbortController();
    setCourts(null);
    setError(null);
    api
      .compare({ profile, meal, date }, ctl.signal)
      .then((r) => setCourts(r.courts))
      .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    return () => ctl.abort();
  }, [profile, meal, date, retry]);

  if (!ready) return <Spinner label="Loading" />;
  if (!profile) return <SetupPrompt />;

  const open = courts?.filter((c) => c.status === "ok" && c.recommendation) ?? [];
  const closed = courts?.filter((c) => c.status === "closed") ?? [];
  const notReleased = !!courts && courts.length > 0 && courts.every((c) => c.status === "not_released");

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <DatePicker date={date} onChange={setDate} />
        <div>
          <h1 className="text-xl font-medium">Compare courts</h1>
          <p className="text-sm text-muted">Every dining court, ranked by how well the day&apos;s menu fits your goal.</p>
        </div>
        <Chips label="Meal" value={meal} onChange={setMeal} options={DAY_MEALS.map((m) => ({ value: m, label: m }))} />
      </header>

      {error && <ErrorNote message={error} onRetry={() => setRetry((n) => n + 1)} />}
      {!error && !courts && <Spinner label="Checking all five courts" />}
      {notReleased && <NotReleased date={formatDay(date)} onToday={() => setDate(todayInWestLafayette())} />}
      {courts && !notReleased && open.length === 0 && <p className="text-sm text-muted">No dining court is serving {meal.toLowerCase()} today.</p>}

      <div className="space-y-3">
        {open.map((c, i) => (
          <CourtCard key={c.location} rec={c.recommendation!} rank={i + 1} />
        ))}
      </div>

      {closed.length > 0 && (
        <p className="text-xs text-muted">
          Not serving {meal.toLowerCase()} today: {closed.map((c) => c.location).join(", ")}
        </p>
      )}
    </div>
  );
}
