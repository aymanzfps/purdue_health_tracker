import type { DayMeal } from "../types";

export { DAY_MEALS } from "../types";

/** Breakfast until 10:30, lunch until 4, dinner after, on West Lafayette time. */
export function mealForNow(now = new Date()): DayMeal {
  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Indiana/Indianapolis",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  if (hm < "10:30") return "Breakfast";
  if (hm < "16:00") return "Lunch";
  return "Dinner";
}

/** "11:00:00" → "11am", "13:30:00" → "1:30pm". */
export function formatTime(hms: string): string {
  const [h, m] = hms.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

export function formatHours(hours: { start: string; end: string } | null): string | null {
  return hours ? `${formatTime(hours.start)}–${formatTime(hours.end)}` : null;
}

/** "2026-10-27" → "Tuesday, Oct 27". */
export function formatDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export const ALL_COURTS = "all";
export const ALL_COURTS_LABEL = "Best across all";

export function courtLabel(location: string): string {
  return location === ALL_COURTS ? ALL_COURTS_LABEL : location;
}

/** Today's date in West Lafayette as YYYY-MM-DD. */
export function todayInWestLafayette(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Indiana/Indianapolis" }).format(new Date());
}
