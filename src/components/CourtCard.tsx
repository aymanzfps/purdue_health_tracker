import Link from "next/link";
import { handLabel } from "./HandPortion";
import { PLATE_COLORS, PlateDiagram } from "./PlateDiagram";
import { FitBadge } from "./ui";
import { courtLabel } from "@/lib/client/meals";
import type { Recommendation } from "@/lib/types";

/** Compact summary of one court's best plate, used on Compare and Day plan. */
export function CourtCard({
  rec,
  title,
  rank,
  bare,
}: {
  rec: Recommendation;
  title?: string;
  rank?: number;
  /** Drop the card frame and header when embedding in another card. */
  bare?: boolean;
}) {
  const href = `/?court=${encodeURIComponent(rec.location)}&meal=${encodeURIComponent(rec.meal)}`;
  return (
    <article className={bare ? "" : "rounded-2xl bg-card p-4"}>
      <div className={`mb-3 flex items-center justify-between gap-2 ${bare ? "hidden" : ""}`}>
        <h3 className="text-sm font-medium">
          {rank !== undefined && <span className="mr-1.5 text-muted tabular-nums">{rank}</span>}
          {title ?? courtLabel(rec.location)}
        </h3>
        <FitBadge score={rec.fitScore} />
      </div>
      <div className="flex gap-3">
        <PlateDiagram picks={rec.picks} size={64} />
        <ul className="min-w-0 flex-1 space-y-1 text-xs">
          {rec.picks.map((p, i) => (
            <li key={p.item.id} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: PLATE_COLORS[i % PLATE_COLORS.length] }} aria-hidden="true" />
                <span className="truncate">
                  {p.item.name}
                  {p.item.locations && <span className="text-muted"> · {p.item.locations[0]}</span>}
                </span>
              </span>
              <span className="shrink-0 text-gold">{handLabel(p.portion)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted tabular-nums">
          <span className="text-gold">{rec.totals.protein}g</span> protein · {rec.totals.calories} kcal
        </span>
        <Link href={href} className="text-gold underline-offset-2 hover:underline">
          Open plate →
        </Link>
      </div>
    </article>
  );
}
