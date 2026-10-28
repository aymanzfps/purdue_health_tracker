import { optimizeMeal, type OptimizeOptions } from "./optimizer";
import { DINING_COURTS, getDayMenu, NotFoundError, NotReleasedError } from "./purdue";
import { dailyTargets, mealTargets } from "./targets";
import type { DayMenu, FoodItem, Meal, Profile, Recommendation } from "./types";

export { NotFoundError, NotReleasedError };

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
  if (!menu.isPublished) throw new NotReleasedError(`${location}'s menu for ${date} hasn't been released yet`);
  const name = mealName ?? currentMealName(menu);
  const meal = name ? findMeal(menu, name) : undefined;
  if (!meal || meal.status !== "Open" || meal.items.length === 0) {
    throw new NotFoundError(`${location} isn't serving ${name ?? "a meal"} on ${date}`);
  }

  const targets = mealTargets(dailyTargets(profile), meal.name, profile);
  const result = optimizeMeal(meal.items, targets, profile, opts);
  const hours = meal.startTime && meal.endTime ? { start: meal.startTime, end: meal.endTime } : null;
  return { location: menu.location, date, meal: meal.name, hours, targets, ...result };
}

/** Location value meaning "pool every dining court's menu". */
export const ALL_COURTS = "all";

/**
 * The best plate if you could take items from any dining court serving this
 * meal. Each item lists the courts it's served at.
 */
export async function recommendAcrossCourts(
  profile: Profile,
  date: string,
  mealName: string,
  opts: OptimizeOptions = {},
): Promise<Recommendation> {
  const menus = await Promise.all(DINING_COURTS.map((court) => getDayMenu(court, date)));
  if (!menus.some((m) => m.isPublished)) throw new NotReleasedError(`Menus for ${date} haven't been released yet`);

  const pooled = new Map<string, FoodItem>();
  const perCourt: FoodItem[][] = [];
  for (const menu of menus) {
    const meal = findMeal(menu, mealName);
    if (!meal || meal.status !== "Open") continue;
    const courtItems: FoodItem[] = [];
    for (const item of meal.items) {
      const existing = pooled.get(item.id);
      if (existing) existing.locations!.push(menu.location);
      else pooled.set(item.id, { ...item, locations: [menu.location] });
      courtItems.push(pooled.get(item.id)!);
    }
    perCourt.push(courtItems);
  }
  if (pooled.size === 0) throw new NotFoundError(`No dining court is serving ${mealName} on ${date}`);

  // The pooled menu is big, so the solver only sees a shortlist of it and can
  // miss a plate one court alone would find. Try each court too and keep the best.
  const targets = mealTargets(dailyTargets(profile), mealName, profile);
  // Single courts go first so the mix has to strictly beat them (one stop wins ties).
  const results = [...perCourt, [...pooled.values()]].map((items) => optimizeMeal(items, targets, profile, opts));
  const best = results.reduce((a, b) => (b.fitScore > a.fitScore ? b : a));
  return { location: ALL_COURTS, date, meal: mealName, hours: null, targets, ...best };
}

export interface CourtComparison {
  location: string;
  status: "ok" | "closed" | "not_released";
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
        if (err instanceof NotReleasedError) return { location, status: "not_released" };
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
