export const DAY_MEALS = ["Breakfast", "Lunch", "Dinner"] as const;

/** Breakfast until 10:30, lunch until 4, dinner after, on West Lafayette time. */
export function mealForNow(now = new Date()): (typeof DAY_MEALS)[number] {
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
