import type { MacroTargets, Nutrition } from "@/lib/types";

const ROWS = [
  { key: "protein", label: "Protein", unit: "g", color: "bg-gold" },
  { key: "carbs", label: "Carbs", unit: "g", color: "bg-gold-mid" },
  { key: "fat", label: "Fat", unit: "g", color: "bg-gold-deep" },
] as const;

export function MacroBars({ totals, targets }: { totals: Pick<Nutrition, keyof MacroTargets>; targets: MacroTargets }) {
  return (
    <div className="space-y-2.5">
      {ROWS.map((row) => {
        const actual = totals[row.key];
        const target = targets[row.key];
        const ratio = target > 0 ? actual / target : 0;
        // Extra protein is fine; going well over on carbs or fat gets flagged.
        const over = row.key !== "protein" && ratio > 1.15;
        return (
          <div key={row.key}>
            <div className="flex justify-between text-xs">
              <span>{row.label}</span>
              <span className={`tabular-nums ${over ? "text-warn" : "text-muted"}`}>
                {actual}/{target}
                {row.unit}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-line" role="progressbar" aria-label={row.label} aria-valuenow={actual} aria-valuemax={target}>
              <div className={`h-full rounded-full ${over ? "bg-warn" : row.color}`} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
