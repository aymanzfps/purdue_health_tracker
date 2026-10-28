import { HandPortion, handLabel } from "./HandPortion";
import { PLATE_COLORS } from "./PlateDiagram";
import type { MealPick } from "@/lib/types";

export function PickRow({
  pick,
  index,
  locked,
  onSwap,
  onToggleLock,
}: {
  pick: MealPick;
  index: number;
  locked?: boolean;
  onSwap?: () => void;
  onToggleLock?: () => void;
}) {
  const { item, totals, portion } = pick;
  return (
    <li className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
      <span
        className="h-3 w-3 shrink-0 rounded-sm"
        style={{ background: PLATE_COLORS[index % PLATE_COLORS.length] }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{item.name}</div>
        <div className="text-xs text-muted">
          {portion.amountLabel} · {Math.round(totals.protein)}g protein · {Math.round(totals.calories)} kcal
        </div>
        <div className="truncate text-[11px] text-muted/70">
          {item.locations && <span className="text-gold-mid">{item.locations.join(" / ")} · </span>}
          {item.station}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <HandPortion portion={portion} />
        <span className="text-[11px] text-gold">{handLabel(portion)}</span>
      </div>
      {(onSwap || onToggleLock) && (
        <div className="flex shrink-0 flex-col gap-1">
          {onToggleLock && (
            <button
              type="button"
              onClick={onToggleLock}
              aria-pressed={locked}
              aria-label={locked ? `Unpin ${item.name}` : `Keep ${item.name} on the plate`}
              title={locked ? "Pinned" : "Keep this"}
              className={`rounded-md p-1 ${locked ? "text-gold" : "text-muted hover:text-cream"}`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill={locked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M9 4h6l-1 5 3 3v2H7v-2l3-3zM12 14v6" />
              </svg>
            </button>
          )}
          {onSwap && (
            <button
              type="button"
              onClick={onSwap}
              aria-label={`Swap out ${item.name}`}
              title="Swap"
              className="rounded-md p-1 text-muted hover:text-cream"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8h13l-3-3M20 16H7l3 3" />
              </svg>
            </button>
          )}
        </div>
      )}
    </li>
  );
}
