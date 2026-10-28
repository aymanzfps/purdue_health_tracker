import { optimizeMeal, type OptimizeOptions } from "./optimizer";
import { DINING_COURTS, getDayMenu, NotFoundError } from "./purdue";
import { dailyTargets, mealTargets } from "./targets";
import type { DayMenu, Meal, Profile, Recommendation } from "./types";

export { NotFoundError };

export function findMeal(menu: DayMenu, mealName: string): Meal | undefined {
  const wanted = mealName.trim().toLowerCase();
  return (
    menu.meals.find((m) => m.name.toLowerCase() === wanted) ??
    menu.meals.find((m) => m.type.toLowerCase() === wanted)
  );
}

/** The meal being served now, else the next one today, else the last one. */
export function currentMealName(menu: DayMenu, now = westLafayetteClock()): string | null {
  const open = menu.meals.filter((m) => m.status === "Open" && m.startTime && m.endTime);
  if (open.length === 0) return menu.meals[0]?.name ?? null;
  const serving = open.find((m) => m.startTime! <= now && now < m.endTime!);
  if (serving) return serving.name;
  const next = open.find((m) => m.startTime! > now);
  return (next ?? open[open.length - 1]).name;
}

export async function recommend(
  profile: Profile,
  location: string,
  date: string,
  mealName: string | undefined,
  opts: OptimizeOptions = {},
): Promise<Recommendation> {
  const menu = await getDayMenu(location, date);
  const name = mealName ?? currentMealName(menu);
  const meal = name ? findMeal(menu, name) : undefined;
  if (!meal || meal.status !== "Open" || meal.items.length === 0) {
    throw new NotFoundError(`${location} isn't serving ${name ?? "a meal"} on ${date}`);
  }

  const targets = mealTargets(dailyTargets(profile), meal.name, profile.mealsPerDay);
  const result = optimizeMeal(meal.items, targets, profile, opts);
  return { location: menu.location, date, meal: meal.name, targets, ...result };
}

export interface CourtComparison {
  location: string;
  status: "ok" | "closed";
  recommendation?: Recommendation;
}

/** Runs the optimizer at every dining court for the same meal and ranks them by fit. */
export async function compareCourts(
  profile: Profile,
  date: string,
  mealName: string,
): Promise<CourtComparison[]> {
  const results = await Promise.all(
    DINING_COURTS.map(async (location): Promise<CourtComparison> => {
      try {
        return { location, status: "ok", recommendation: await recommend(profile, location, date, mealName) };
      } catch (err) {
        if (err instanceof NotFoundError) return { location, status: "closed" };
        throw err;
      }
    }),
  );
  return results.sort(
    (a, b) => (b.recommendation?.fitScore ?? -1) - (a.recommendation?.fitScore ?? -1),
  );
}

function westLafayetteClock(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Indiana/Indianapolis",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}
