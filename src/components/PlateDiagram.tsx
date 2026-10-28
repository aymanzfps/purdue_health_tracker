import type { MealPick } from "@/lib/types";

/** Gold-to-bronze ramp, one color per item on the plate (also used for list swatches). */
export const PLATE_COLORS = ["#cfb991", "#8e6f3e", "#a8915f", "#5c5244", "#e8dcc0"];

/** A plate split into wedges sized by each item's share of the meal's calories. */
export function PlateDiagram({ picks, size = 120 }: { picks: MealPick[]; size?: number }) {
  const c = 50;
  const r = 41;
  let angle = -Math.PI / 2;

  const wedges = picks.map((pick, i) => {
    const sweep = pick.plateShare * Math.PI * 2;
    const start = angle;
    angle += sweep;
    const color = PLATE_COLORS[i % PLATE_COLORS.length];
    if (pick.plateShare >= 0.999) return <circle key={pick.item.id} cx={c} cy={c} r={r} fill={color} />;
    const x1 = c + r * Math.cos(start);
    const y1 = c + r * Math.sin(start);
    const x2 = c + r * Math.cos(angle);
    const y2 = c + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    return (
      <path
        key={pick.item.id}
        d={`M${c} ${c} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
        fill={color}
        stroke="#1a1a1a"
        strokeWidth="1.2"
      />
    );
  });

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`Plate: ${picks.map((p) => `${p.item.name} ${Math.round(p.plateShare * 100)}%`).join(", ")}`}
      className="shrink-0"
    >
      <circle cx={c} cy={c} r={48} fill="#141414" stroke="#cfb991" strokeWidth="1.5" />
      <circle cx={c} cy={c} r={44} fill="none" stroke="#2a2a2a" strokeWidth="1" />
      {wedges}
    </svg>
  );
}
