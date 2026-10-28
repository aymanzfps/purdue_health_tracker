import { classifyItem } from "./classify";
import type { DayMenu, DiningLocation, FoodItem, Meal, Nutrition } from "./types";

const BASE = "https://api.hfs.purdue.edu/menus/v2";
const MENU_TTL_MS = 60 * 60 * 1000; // menus can change during the day
const ITEM_TTL_MS = 7 * 24 * 60 * 60 * 1000; // nutrition facts rarely change
const LOCATIONS_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CONCURRENT_ITEM_FETCHES = 8;

export const DINING_COURTS = ["Earhart", "Ford", "Hillenbrand", "Wiley", "Windsor"];

// ---- Purdue API response shapes (only the fields we use) ----

interface RawAllergen {
  Name: string;
  Value: boolean;
}

interface RawItem {
  ID: string;
  Name: string;
  IsVegetarian: boolean;
  NutritionReady: boolean;
  Allergens?: RawAllergen[];
}

interface RawMeal {
  Name: string;
  Type: string;
  Status: string;
  Hours?: { StartTime: string; EndTime: string } | null;
  Stations?: { Name: string; Items: RawItem[] }[] | null;
}

interface RawDayMenu {
  Location: string;
  Date: string;
  IsPublished: boolean;
  Meals?: RawMeal[] | null;
}

interface RawNutritionRow {
  Name: string;
  Value?: number | null;
  LabelValue?: string | null;
}

interface RawItemDetail {
  Nutrition?: RawNutritionRow[] | null;
}

interface RawLocations {
  Location: {
    LocationId: string;
    Name: string;
    Type?: string;
    LocationType?: string;
    Latitude?: number;
    Longitude?: number;
  }[];
}

// ---- Cache shared across requests (kept on globalThis so dev hot-reloads keep it) ----

interface CacheEntry<T> {
  expires: number;
  value: Promise<T>;
}

const globalCache = globalThis as unknown as { __purdueCache?: Map<string, CacheEntry<unknown>> };
const cache = (globalCache.__purdueCache ??= new Map());

function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = load();
  cache.set(key, { expires: Date.now() + ttlMs, value });
  // Failed loads must not stay cached.
  value.catch(() => cache.delete(key));
  return value;
}

export class NotFoundError extends Error {}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (res.status === 404 || res.status === 400) throw new NotFoundError(`Purdue Dining has nothing at ${path}`);
  if (!res.ok) throw new Error(`Purdue API ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

// ---- Public API ----

/** Today's date in West Lafayette as YYYY-MM-DD. */
export function todayInWestLafayette(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Indiana/Indianapolis",
  }).format(new Date());
}

export function getLocations(): Promise<DiningLocation[]> {
  return cached("locations", LOCATIONS_TTL_MS, async () => {
    const raw = await getJson<RawLocations>("/locations");
    return raw.Location.map((l) => ({
      id: l.LocationId,
      name: l.Name,
      type: l.Type ?? l.LocationType ?? "Other",
      latitude: l.Latitude ?? null,
      longitude: l.Longitude ?? null,
    }));
  });
}

export function getItemNutrition(
  id: string,
): Promise<{ servingSize: string | null; nutrition: Nutrition | null }> {
  return cached(`item:${id}`, ITEM_TTL_MS, async () => {
    const raw = await getJson<RawItemDetail>(`/items/${id}`);
    return parseNutrition(raw.Nutrition ?? []);
  });
}

/** Full menu for one location and date, with nutrition attached to every item that has it. */
export async function getDayMenu(requested: string, date: string): Promise<DayMenu> {
  // Purdue answers unknown locations with a 500, so check the name ourselves first.
  const known = (await getLocations()).find((l) => l.name.toLowerCase() === requested.trim().toLowerCase());
  if (!known) throw new NotFoundError(`There's no Purdue dining location called "${requested}"`);
  const location = known.name;

  return cached(`menu:${location}:${date}`, MENU_TTL_MS, async () => {
    const raw = await getJson<RawDayMenu>(
      `/locations/${encodeURIComponent(location)}/${date}`,
    );
    const rawMeals = raw.Meals ?? [];

    // Items repeat across meals and stations; fetch each one's nutrition once.
    const ids = new Set<string>();
    for (const meal of rawMeals)
      for (const station of meal.Stations ?? [])
        for (const item of station.Items) if (item.NutritionReady) ids.add(item.ID);

    const details = new Map<string, Awaited<ReturnType<typeof getItemNutrition>>>();
    await mapWithConcurrency([...ids], MAX_CONCURRENT_ITEM_FETCHES, async (id) => {
      try {
        details.set(id, await getItemNutrition(id));
      } catch {
        // One broken item shouldn't sink the whole menu.
      }
    });

    const meals: Meal[] = rawMeals.map((meal) => {
      const items: FoodItem[] = [];
      const seen = new Set<string>();
      for (const station of meal.Stations ?? []) {
        for (const rawItem of station.Items) {
          if (seen.has(rawItem.ID)) continue;
          seen.add(rawItem.ID);
          items.push(toFoodItem(rawItem, station.Name, details.get(rawItem.ID)));
        }
      }
      return {
        name: meal.Name,
        type: meal.Type,
        status: meal.Status,
        startTime: meal.Hours?.StartTime ?? null,
        endTime: meal.Hours?.EndTime ?? null,
        items,
      };
    });

    return { location: raw.Location, date, isPublished: raw.IsPublished, meals };
  });
}

// ---- Helpers ----

function toFoodItem(
  raw: RawItem,
  station: string,
  detail: Awaited<ReturnType<typeof getItemNutrition>> | undefined,
): FoodItem {
  const flags = new Map((raw.Allergens ?? []).map((a) => [a.Name, a.Value]));
  const allergens = [...flags]
    .filter(([name, value]) => value && name !== "Vegetarian" && name !== "Vegan")
    .map(([name]) => name);
  const base = {
    id: raw.ID,
    name: raw.Name,
    station,
    isVegetarian: raw.IsVegetarian || flags.get("Vegetarian") === true,
    isVegan: flags.get("Vegan") === true,
    allergens,
    servingSize: detail?.servingSize ?? null,
    nutrition: detail?.nutrition ?? null,
  };
  return { ...base, role: classifyItem(base) };
}

function parseNutrition(rows: RawNutritionRow[]): {
  servingSize: string | null;
  nutrition: Nutrition | null;
} {
  const byName = new Map(rows.map((r) => [r.Name.toLowerCase(), r]));
  const num = (name: string) => {
    const v = byName.get(name)?.Value;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  const servingSize = byName.get("serving size")?.LabelValue?.trim() || null;
  const calories = num("calories");
  if (calories === null) return { servingSize, nutrition: null };
  return {
    servingSize,
    nutrition: {
      calories,
      protein: num("protein") ?? 0,
      carbs: num("total carbohydrate") ?? 0,
      fat: num("total fat") ?? 0,
      fiber: num("dietary fiber") ?? 0,
      sugar: num("sugar") ?? 0,
      sodium: num("sodium") ?? 0,
    },
  };
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]);
  });
  await Promise.all(workers);
}
