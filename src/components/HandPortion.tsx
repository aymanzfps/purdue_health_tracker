import { useId } from "react";
import type { HandPortion as Hand, PortionVisual } from "@/lib/types";

const SHAPES: Record<Hand, { label: string; draw: React.ReactNode }> = {
  fist: {
    label: "fist",
    draw: (
      <>
        <rect x="4" y="6" width="16" height="13" rx="5" />
        <path d="M8.5 6v4M12 6v4M15.5 6v4" strokeWidth="1" />
      </>
    ),
  },
  palm: { label: "palm", draw: <rect x="5" y="3" width="14" height="18" rx="5" /> },
  thumb: { label: "thumb", draw: <rect x="8.5" y="3" width="7" height="18" rx="3.5" /> },
  cupped_hand: { label: "handful", draw: <path d="M3 9h18a9 9 0 0 1-18 0z" /> },
  piece: { label: "piece", draw: <circle cx="12" cy="12" r="7.5" /> },
};

/** One icon, filled up to `fill` (0–1) so ¾ of a fist reads as ¾. */
function Icon({ hand, fill }: { hand: Hand; fill: number }) {
  const id = useId();
  const shape = SHAPES[hand].draw;
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <rect x="0" y={24 * (1 - fill)} width="24" height="24" />
        </clipPath>
      </defs>
      <g fill="none" stroke="#5c5244" strokeWidth="1.5">{shape}</g>
      <g fill="#cfb991" stroke="#cfb991" strokeWidth="1.5" clipPath={`url(#${id})`}>{shape}</g>
    </svg>
  );
}

const MAX_ICONS = 4;

/** Hand-size comparison: e.g. 1½ fists drawn as one full and one half-filled fist. */
export function HandPortion({ portion }: { portion: PortionVisual }) {
  const { hand, handCount } = portion;
  const label = handLabel(portion);

  if (handCount > MAX_ICONS) {
    return (
      <span className="flex items-center gap-1 text-xs text-gold" aria-label={label}>
        <Icon hand={hand} fill={1} />×{formatCount(handCount)}
      </span>
    );
  }
  const icons = [];
  for (let left = handCount; left > 0; left -= 1) icons.push(Math.min(left, 1));
  return (
    <span className="flex items-center gap-0.5" role="img" aria-label={label}>
      {icons.map((fill, i) => (
        <Icon key={i} hand={hand} fill={fill} />
      ))}
    </span>
  );
}

/** "1½ fists", or the real count for countable foods ("3 eggs" beats "3 pieces"). */
export function handLabel(portion: PortionVisual): string {
  if (portion.hand === "piece") return portion.amountLabel;
  const name = SHAPES[portion.hand].label;
  return `${formatCount(portion.handCount)} ${portion.handCount > 1 ? `${name}s` : name}`;
}

function formatCount(n: number) {
  const whole = Math.floor(n);
  const frac = Math.round((n - whole) * 4) / 4;
  const glyph = frac === 0.25 ? "¼" : frac === 0.5 ? "½" : frac === 0.75 ? "¾" : "";
  return whole === 0 && glyph ? glyph : `${whole}${glyph}`;
}
