import Link from "next/link";
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-card p-4 ${className}`}>{children}</section>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-xs text-muted">{children}</h2>;
}

/** Fit score: gold when the meal lands close to target, burnt orange when it doesn't. */
export function FitBadge({ score, className = "" }: { score: number; className?: string }) {
  const good = score >= 85;
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums ${
        good ? "bg-gold text-ink" : "bg-warn/20 text-warn"
      } ${className}`}
    >
      {score} fit
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-6 w-10 shrink-0 rounded-full bg-line transition peer-checked:bg-gold peer-focus-visible:ring-2 peer-focus-visible:ring-gold/60 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-cream after:transition peer-checked:after:translate-x-4 peer-checked:after:bg-ink" />
    </label>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; suffix?: ReactNode }[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`rounded-lg px-2.5 py-1.5 text-xs transition ${
              active ? "bg-gold text-ink" : "bg-card-hi text-cream hover:bg-line"
            }`}
          >
            {o.label}
            {o.suffix}
          </button>
        );
      })}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-gold" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
      {message}
      {onRetry && (
        <button type="button" onClick={onRetry} className="ml-2 underline underline-offset-2">
          Retry
        </button>
      )}
    </div>
  );
}

export function SetupPrompt() {
  return (
    <Card className="mt-8 text-center">
      <p className="text-lg font-medium text-gold">Set your goal first</p>
      <p className="mt-1 text-sm text-muted">
        Your stats and goal decide how much of each food goes on your plate.
      </p>
      <Link href="/profile" className="mt-4 inline-block rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink">
        Set up goals
      </Link>
    </Card>
  );
}

/** Purdue hasn't posted this day's menus yet. */
export function NotReleased({ date, onToday }: { date: string; onToday?: () => void }) {
  return (
    <Card className="text-center">
      <p className="text-base font-medium text-gold">Menus aren&apos;t out yet</p>
      <p className="mt-1 text-sm text-muted">Purdue Dining hasn&apos;t released the menus for {date}. Check back closer to the day.</p>
      {onToday && (
        <button type="button" onClick={onToday} className="mt-3 rounded-lg bg-card-hi px-3 py-1.5 text-xs hover:bg-line">
          Back to today
        </button>
      )}
    </Card>
  );
}
