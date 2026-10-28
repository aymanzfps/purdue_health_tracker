import { ALL_COURTS, ALL_COURTS_LABEL } from "@/lib/client/meals";

const ALL = ALL_COURTS;

function Label({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] tracking-wide text-muted uppercase">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={icon} />
      </svg>
      {children}
    </div>
  );
}

const PIN = "M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11zM12 10m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0";
const CLOCK = "M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM12 7v5l3 2";
const SPARK = "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z";

/**
 * Where to eat: a row of tiles, each with that court's fit score, plus a
 * "Best across all" tile that mixes items from every court.
 */
export function CourtPicker({
  courts,
  value,
  scores,
  noScores,
  onChange,
}: {
  courts: string[];
  value: string | null;
  /** Fit score per court name (and "all"), once known. */
  scores: Record<string, number | undefined>;
  /** No menus to score (e.g. the day isn't released yet): show a dash instead of loading dots. */
  noScores?: boolean;
  onChange: (court: string) => void;
}) {
  const tiles = [ALL, ...courts];
  const best = Math.max(...courts.map((c) => scores[c] ?? -1));
  return (
    <div>
      <Label icon={PIN}>Dining court</Label>
      <div role="radiogroup" aria-label="Dining court" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {tiles.map((court) => {
          const active = court === value;
          const score = scores[court];
          const isAll = court === ALL;
          return (
            <button
              key={court}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(court)}
              className={`flex min-w-[84px] shrink-0 flex-col items-start rounded-xl border px-3 py-2 text-left transition ${
                active ? "border-gold bg-gold/10" : "border-line bg-card hover:border-muted"
              }`}
            >
              <span className={`flex items-center gap-1 text-sm ${active ? "text-gold" : ""}`}>
                {isAll && (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                    <path d={SPARK} />
                  </svg>
                )}
                {isAll ? ALL_COURTS_LABEL : court}
              </span>
              <span className="mt-0.5 text-[11px] text-muted tabular-nums">
                {noScores ? (
                  "—"
                ) : score === undefined ? (
                  "…"
                ) : (
                  <>
                    <span className={score >= 85 ? "text-gold" : "text-warn"}>{score}</span> fit
                    {!isAll && score === best && <span className="ml-1 text-gold">· top</span>}
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** When: a segmented bar of the meals being served, with their hours. */
export function MealPicker({
  meals,
  value,
  onChange,
}: {
  meals: { name: string; hours: string | null }[];
  value: string | null;
  onChange: (meal: string) => void;
}) {
  return (
    <div>
      <Label icon={CLOCK}>Meal</Label>
      <div role="tablist" aria-label="Meal" className="flex rounded-xl bg-card p-1">
        {meals.map((m) => {
          const active = m.name === value;
          return (
            <button
              key={m.name}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(m.name)}
              className={`flex flex-1 flex-col items-center rounded-lg px-2 py-1.5 transition ${
                active ? "bg-gold text-ink" : "text-cream hover:bg-card-hi"
              }`}
            >
              <span className="text-sm font-medium">{m.name}</span>
              {m.hours && <span className={`text-[10px] ${active ? "text-ink/70" : "text-muted"}`}>{m.hours}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
