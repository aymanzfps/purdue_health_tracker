"use client";

import { useEffect, useRef, useState } from "react";
import { HandPortion, handLabel } from "./HandPortion";
import type { MealPick, Nutrition } from "@/lib/types";

// FDA daily values for a 2,000 kcal label, used only for the % column.
const DAILY_VALUE: Partial<Record<keyof Nutrition, number>> = {
  carbs: 275,
  fat: 78,
  fiber: 28,
  sodium: 2300,
};

const MACROS = [
  { key: "protein", label: "Protein", kcalPerGram: 4, color: "var(--color-gold)" },
  { key: "carbs", label: "Carbs", kcalPerGram: 4, color: "var(--color-gold-deep)" },
  { key: "fat", label: "Fat", kcalPerGram: 9, color: "var(--color-bronze)" },
] as const;

type Basis = "portion" | "serving";

/** Full nutrition facts for one plate item, as a bottom sheet on phones and a modal on desktop. */
export function NutritionSheet({ pick, onClose }: { pick: MealPick | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [basis, setBasis] = useState<Basis>("portion");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (pick && !dialog.open) {
      setBasis("portion");
      dialog.showModal();
    } else if (!pick && dialog.open) dialog.close();
  }, [pick]);

  const item = pick?.item;
  const n: Nutrition | null = pick ? (basis === "portion" ? pick.totals : item!.nutrition) : null;
  const macroKcal = n ? MACROS.map((m) => n[m.key] * m.kcalPerGram) : [];
  const macroSum = macroKcal.reduce((a, b) => a + b, 0) || 1;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="nutrition-title"
      className="m-0 mt-auto max-h-[90dvh] w-full max-w-none rounded-t-2xl bg-card p-0 text-cream backdrop:bg-black/70 sm:m-auto sm:max-w-md sm:rounded-2xl"
    >
      {pick && item && n && (
        <div className="p-5">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
          <header className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 id="nutrition-title" className="text-lg leading-snug font-medium">
                {item.name}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {item.locations && <span className="text-gold-mid">{item.locations.join(" / ")} · </span>}
                {item.station}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-m-1 rounded-md p-1 text-muted hover:text-cream"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          <div role="radiogroup" aria-label="Show nutrition for" className="mt-4 grid grid-cols-2 rounded-lg bg-ink p-1 text-xs">
            {(
              [
                ["portion", `Your portion · ${pick.portion.amountLabel}`],
                ["serving", `1 serving${item.servingSize ? ` · ${item.servingSize}` : ""}`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={basis === value}
                onClick={() => setBasis(value)}
                className={`truncate rounded-md px-2 py-1.5 transition ${
                  basis === value ? "bg-gold text-ink" : "text-muted hover:text-cream"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <div className="text-xs text-muted">calories</div>
              <div className="text-4xl leading-none font-medium text-gold tabular-nums">{Math.round(n.calories)}</div>
            </div>
            {basis === "portion" && (
              <div className="flex flex-col items-end gap-0.5">
                <HandPortion portion={pick.portion} />
                <span className="text-[11px] text-gold">{handLabel(pick.portion)}</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
            {MACROS.map((m, i) => (
              <span key={m.key} style={{ width: `${(macroKcal[i] / macroSum) * 100}%`, background: m.color }} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {MACROS.map((m, i) => (
              <div key={m.key} className="rounded-xl bg-ink px-3 py-2">
                <div className="flex items-center gap-1.5 text-[11px] text-muted">
                  <span className="h-2 w-2 rounded-sm" style={{ background: m.color }} aria-hidden="true" />
                  {m.label}
                </div>
                <div className="text-lg font-medium tabular-nums">{fmt(n[m.key])}g</div>
                <div className="text-[11px] text-muted tabular-nums">{Math.round((macroKcal[i] / macroSum) * 100)}% of kcal</div>
              </div>
            ))}
          </div>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-[11px] text-muted">
                <th className="pb-1 text-left font-normal">Nutrient</th>
                <th className="pb-1 text-right font-normal">Amount</th>
                <th className="w-14 pb-1 text-right font-normal">Daily</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <Row label="Protein" value={n.protein} unit="g" />
              <Row label="Total carbs" field="carbs" value={n.carbs} unit="g" />
              <Row label="Fiber" field="fiber" value={n.fiber} unit="g" sub />
              <Row label="Sugar" value={n.sugar} unit="g" sub />
              <Row label="Total fat" field="fat" value={n.fat} unit="g" />
              <Row label="Sodium" field="sodium" value={n.sodium} unit="mg" />
            </tbody>
          </table>
          <p className="mt-1 text-[11px] text-muted">Daily % is based on a 2,000 kcal diet, not your own targets.</p>

          {(item.isVegan || item.isVegetarian || item.allergens.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
              {item.isVegan ? (
                <span className="rounded-md bg-gold/15 px-2 py-0.5 text-gold">Vegan</span>
              ) : (
                item.isVegetarian && <span className="rounded-md bg-gold/15 px-2 py-0.5 text-gold">Vegetarian</span>
              )}
              {item.allergens.map((a) => (
                <span key={a} className="rounded-md bg-warn/15 px-2 py-0.5 text-warn">
                  Contains {a.toLowerCase()}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

function Row({
  label,
  value,
  unit,
  field,
  sub,
}: {
  label: string;
  value: number;
  unit: string;
  field?: keyof Nutrition;
  sub?: boolean;
}) {
  const dv = field && DAILY_VALUE[field];
  return (
    <tr className="border-t border-line">
      <td className={`py-1.5 ${sub ? "pl-4 text-muted" : ""}`}>{label}</td>
      <td className="py-1.5 text-right">
        {unit === "mg" ? Math.round(value) : fmt(value)}
        {unit}
      </td>
      <td className="py-1.5 text-right text-muted">{dv ? `${Math.round((value / dv) * 100)}%` : ""}</td>
    </tr>
  );
}

const fmt = (g: number) => (g < 10 ? Math.round(g * 10) / 10 : Math.round(g)).toString();
