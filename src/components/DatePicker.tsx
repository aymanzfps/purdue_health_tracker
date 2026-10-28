"use client";

import { useRef } from "react";
import { shiftDate } from "@/lib/client/date";
import { formatDay, todayInWestLafayette } from "@/lib/client/meals";

const CHEVRON_LEFT = "M15 6l-6 6l6 6";
const CHEVRON_RIGHT = "M9 6l6 6l-6 6";

/** Day switcher: previous/next arrows, the date (opens a calendar), and a jump back to today. */
export function DatePicker({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const today = todayInWestLafayette();
  const offset = Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
  const relative = offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : offset === -1 ? "Yesterday" : null;

  const arrow = (d: string, label: string, days: number) => (
    <button
      type="button"
      aria-label={label}
      onClick={() => onChange(shiftDate(date, days))}
      className="rounded-md p-1 text-muted hover:bg-card-hi hover:text-cream"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    </button>
  );

  return (
    <div className="-ml-1 flex items-center gap-1 whitespace-nowrap">
      {arrow(CHEVRON_LEFT, "Previous day", -1)}
      <label className="relative cursor-pointer rounded-md px-1.5 py-0.5 text-xs hover:bg-card-hi">
        <span className={offset === 0 ? "text-muted" : "text-gold"}>
          {relative ? `${relative} · ` : ""}
          {formatDay(date)}
        </span>
        <input
          ref={input}
          type="date"
          aria-label="Choose a date"
          value={date}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          onClick={() => input.current?.showPicker?.()}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      {arrow(CHEVRON_RIGHT, "Next day", 1)}
      {offset !== 0 && (
        <button type="button" onClick={() => onChange(today)} className="ml-auto rounded-md bg-card px-2 py-0.5 text-[11px] text-muted hover:text-cream">
          Back to today
        </button>
      )}
    </div>
  );
}
