"use client";

import { useEffect, useState } from "react";
import { CourtCard } from "@/components/CourtCard";
import { Chips, ErrorNote, SetupPrompt, Spinner } from "@/components/ui";
import { api } from "@/lib/client/api";
import { DAY_MEALS, mealForNow } from "@/lib/client/meals";
import { useProfile } from "@/lib/client/profile";
import type { CourtComparison } from "@/lib/recommend";

export default function ComparePage() {
  const { profile, ready } = useProfile();
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
      .compare({ profile, meal }, ctl.signal)
      .then((r) => setCourts(r.courts))
      .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    return () => ctl.abort();
  }, [profile, meal, retry]);

  if (!ready) return <Spinner label="Loading" />;
  if (!profile) return <SetupPrompt />;

  const open = courts?.filter((c) => c.status === "ok" && c.recommendation) ?? [];
  const closed = courts?.filter((c) => c.status === "closed") ?? [];

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <div>
          <h1 className="text-xl font-medium">Compare courts</h1>
          <p className="text-sm text-muted">Every dining court, ranked by how well today&apos;s menu fits your goal.</p>
        </div>
        <Chips label="Meal" value={meal} onChange={setMeal} options={DAY_MEALS.map((m) => ({ value: m, label: m }))} />
      </header>

      {error && <ErrorNote message={error} onRetry={() => setRetry((n) => n + 1)} />}
      {!error && !courts && <Spinner label="Checking all five courts" />}
      {courts && open.length === 0 && <p className="text-sm text-muted">No dining court is serving {meal.toLowerCase()} today.</p>}

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
