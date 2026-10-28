import solver, { type Model, type Solution } from "javascript-lp-solver";
import { portionVisual } from "./portion";
import type {
  FoodItem,
  ItemRole,
  MacroTargets,
  Nutrition,
  MealPick,
  Profile,
} from "./types";

// Picks how many half-servings of each menu item to eat so the meal lands on
// the macro targets. It's a small mixed-integer program: one integer per item
// (half-servings) plus a yes/no per item so we can cap how many things go on
// the plate and require a protein and a vegetable.

export interface OptimizeOptions {
  /** Item IDs the user swapped out. */
  exclude?: string[];
  /** Item IDs the user wants kept on the plate. */
  lock?: string[];
}

export interface OptimizeResult {
  picks: MealPick[];
  totals: Nutrition;
  fitScore: number;
}

const MIN_ITEMS = 2;
const MAX_ITEMS = 5;
const MAX_HALF_SERVINGS = 6; // 3 servings of any one thing
const MAX_SHARE_OF_MEAL = 0.6; // no single item over 60% of the meal's calories

/** Penalty per gram (or kcal) of missing/overshooting a target. Protein shortfall hurts most. */
const WEIGHTS = {
  proteinUnder: 3,
  proteinOver: 0.4,
  calories: 0.1,
  carbs: 0.5,
  fat: 0.8,
  /** Per gram, so a 1½-cup bowl of applesauce loses to a vegetable. */
  sugar: 0.15,
};

/** Plain bread on the side (buns, rolls, toast): fine to add, odd to pile up. */
const SIDE_BREAD = /\b(buns?|rolls?|bread|toast|breadsticks?|tortillas?|biscuits?|crackers?|english muffin)\b/i;

/** Small cost for each item picked so the plate stays simple; treats cost more. */
const PICK_COST: Partial<Record<ItemRole, number>> & { default: number } = {
  default: 1,
  fruit: 1.5,
  sauce: 3,
  dessert: 10,
};

/** How many candidates of each role go into the solver, to keep it fast. */
const CANDIDATES_PER_ROLE: Record<ItemRole, number> = {
  protein: 7,
  carb: 5,
  veg: 4,
  fruit: 3,
  dairy: 2,
  sauce: 2,
  dessert: 2,
  other: 3,
};

const ROLE_LIMITS: Partial<Record<ItemRole, number>> = { protein: 2, carb: 2, sauce: 1, dessert: 1 };

/** Garnishes (green onions, pico) don't count as the meal's vegetable. */
const MIN_PRODUCE_KCAL = 15;
const ROLE_MAX_HALF_SERVINGS: Partial<Record<ItemRole, number>> = { fruit: 4, sauce: 2, dessert: 2 };

export function filterForProfile(items: FoodItem[], profile: Profile, opts: OptimizeOptions = {}): FoodItem[] {
  const exclude = new Set(opts.exclude ?? []);
  const lock = new Set(opts.lock ?? []);
  const avoid = new Set(profile.avoidAllergens.map((a) => a.toLowerCase()));
  const dislikes = profile.dislikes.map((d) => d.trim().toLowerCase()).filter(Boolean);

  return items.filter((item) => {
    if (!item.nutrition || item.nutrition.calories <= 0) return false;
    if (exclude.has(item.id) && !lock.has(item.id)) return false;
    if (profile.vegan && !item.isVegan) return false;
    if (profile.vegetarian && !item.isVegetarian && !item.isVegan) return false;
    if (item.allergens.some((a) => avoid.has(a.toLowerCase()))) return false;
    if (dislikes.some((d) => item.name.toLowerCase().includes(d))) return false;
    if (item.role === "dessert" && !profile.allowDessert && !lock.has(item.id)) return false;
    // "By Request" is the allergy/diet counter (GF buns, veggie patties): only suggest it to
    // people whose diet needs it, so everyone else gets what's on the line.
    const needsRequestCounter = profile.vegan || profile.vegetarian || profile.avoidAllergens.length > 0;
    if (/by request/i.test(item.station) && !needsRequestCounter && !lock.has(item.id)) return false;
    return true;
  });
}

export function optimizeMeal(
  items: FoodItem[],
  targets: MacroTargets,
  profile: Profile,
  opts: OptimizeOptions = {},
): OptimizeResult {
  const lock = new Set(opts.lock ?? []);
  let candidates = shortlist(filterForProfile(items, profile, opts), lock);
  if (candidates.length === 0) return { picks: [], totals: emptyNutrition(), fitScore: 0 };

  let solution = solver.Solve(buildModel(candidates, targets, lock));
  if (!isUsable(solution, candidates.length)) {
    // Big menus (like every court pooled) can hit the timeout with a half-finished,
    // fractional answer. Keep the items it leaned on most and solve again on just those.
    const leaned = candidates
      .map((item, i) => ({ item, weight: lock.has(item.id) ? Infinity : Number(solution[`x${i}`]) || 0 }))
      .filter((c) => c.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, MAX_ITEMS + 2)
      .map((c) => c.item);
    if (leaned.length > 0) {
      candidates = leaned;
      solution = solver.Solve(buildModel(candidates, targets, lock));
    }
  }

  const halves = new Map<string, number>();
  if (isUsable(solution, candidates.length)) {
    candidates.forEach((item, i) => {
      const v = solution[`x${i}`];
      if (typeof v === "number" && v >= 0.5) halves.set(item.id, Math.round(v));
    });
  }

  const picks: MealPick[] = candidates
    .filter((item) => halves.has(item.id))
    .map((item) => {
      const servings = halves.get(item.id)! / 2;
      return {
        item,
        servings,
        totals: scale(item.nutrition!, servings),
        portion: portionVisual(item, servings),
        plateShare: 0,
      };
    });

  const totals = sumNutrition(picks.map((p) => p.totals));
  for (const p of picks) p.plateShare = totals.calories > 0 ? p.totals.calories / totals.calories : 0;
  picks.sort((a, b) => ROLE_ORDER.indexOf(a.item.role) - ROLE_ORDER.indexOf(b.item.role));

  return { picks, totals: roundNutrition(totals), fitScore: fitScore(totals, targets) };
}

/** Feasible, whole half-servings, and within the item cap (a timed-out solve can break any of these). */
function isUsable(solution: Solution, itemCount: number): boolean {
  if (!solution.feasible) return false;
  let picked = 0;
  for (let i = 0; i < itemCount; i++) {
    const x = solution[`x${i}`];
    if (typeof x !== "number" || x < 0.5) continue;
    if (Math.abs(x - Math.round(x)) > 0.01) return false;
    picked++;
  }
  return picked <= MAX_ITEMS;
}

const ROLE_ORDER: ItemRole[] = ["protein", "carb", "veg", "fruit", "dairy", "other", "sauce", "dessert"];

/** Keeps the most useful few items of each role (plus anything locked). */
function shortlist(items: FoodItem[], lock: Set<string>): FoodItem[] {
  const byRole = new Map<ItemRole, FoodItem[]>();
  for (const item of items) {
    const list = byRole.get(item.role) ?? [];
    list.push(item);
    byRole.set(item.role, list);
  }

  const result: FoodItem[] = items.filter((i) => lock.has(i.id));
  for (const [role, list] of byRole) {
    const ranked = [...list].sort((a, b) => usefulness(b) - usefulness(a));
    for (const item of ranked.slice(0, CANDIDATES_PER_ROLE[role])) {
      if (!lock.has(item.id)) result.push(item);
    }
  }
  return result;
}

/** Higher is better: protein and fiber per calorie, with a nudge against sugar and sodium. */
function usefulness(item: FoodItem): number {
  const n = item.nutrition!;
  const kcal = Math.max(n.calories, 1);
  return (n.protein * 4 + n.fiber * 8 - n.sugar * 2) / kcal - n.sodium / (kcal * 50);
}

function buildModel(items: FoodItem[], t: MacroTargets, lock: Set<string>): Model {
  const constraints: Model["constraints"] = {
    calories: { equal: t.calories },
    protein: { equal: t.protein },
    carbs: { equal: t.carbs },
    fat: { equal: t.fat },
    count: { min: Math.min(MIN_ITEMS, items.length), max: MAX_ITEMS },
  };
  const variables: Model["variables"] = {
    calUnder: { calories: 1, cost: WEIGHTS.calories },
    calOver: { calories: -1, cost: WEIGHTS.calories },
    proUnder: { protein: 1, cost: WEIGHTS.proteinUnder },
    proOver: { protein: -1, cost: WEIGHTS.proteinOver },
    carbUnder: { carbs: 1, cost: WEIGHTS.carbs },
    carbOver: { carbs: -1, cost: WEIGHTS.carbs },
    fatUnder: { fat: 1, cost: WEIGHTS.fat },
    fatOver: { fat: -1, cost: WEIGHTS.fat },
  };
  const ints: Model["ints"] = {};

  const roles = new Set(items.map((i) => i.role));
  if (roles.has("protein")) constraints.hasProtein = { min: 1 };
  const isProduce = (i: FoodItem) =>
    (i.role === "veg" || i.role === "fruit") && i.nutrition!.calories >= MIN_PRODUCE_KCAL;
  if (items.some(isProduce)) constraints.hasProduce = { min: 1 };
  for (const [role, max] of Object.entries(ROLE_LIMITS)) constraints[`limit_${role}`] = { max };

  items.forEach((item, i) => {
    const n = item.nutrition!;
    const halfKcal = n.calories / 2;
    const isSideBread = SIDE_BREAD.test(item.name);
    // A garnish-sized spoon of vegetables doesn't count as eating your vegetables.
    const minHalves = item.role === "veg" ? 2 : 1;
    const maxHalves = Math.max(
      1,
      Math.min(
        isSideBread ? 2 : (ROLE_MAX_HALF_SERVINGS[item.role] ?? MAX_HALF_SERVINGS),
        Math.floor((t.calories * MAX_SHARE_OF_MEAL) / halfKcal),
      ),
    );

    // x = half-servings eaten; y = 1 when the item is on the plate.
    constraints[`link${i}`] = { max: 0 }; // x ≤ maxHalves·y
    constraints[`lo${i}`] = { min: 0 }; // x ≥ minHalves·y
    constraints[`bin${i}`] = { max: 1 };
    if (lock.has(item.id)) constraints[`lock${i}`] = { min: 1 };

    variables[`x${i}`] = {
      calories: halfKcal,
      protein: n.protein / 2,
      carbs: n.carbs / 2,
      fat: n.fat / 2,
      [`link${i}`]: 1,
      [`lo${i}`]: 1,
      cost: (n.sugar / 2) * WEIGHTS.sugar,
    };
    const y: Record<string, number> = {
      [`link${i}`]: -maxHalves,
      [`lo${i}`]: -minHalves,
      [`bin${i}`]: 1,
      count: 1,
      cost:
        (PICK_COST[item.role] ?? PICK_COST.default) +
        (isSideBread ? 2 : 0),
    };
    if (item.role === "protein") y.hasProtein = 1;
    if (isProduce(item)) y.hasProduce = 1;
    if (item.role in ROLE_LIMITS) y[`limit_${item.role}`] = 1;
    if (lock.has(item.id)) y[`lock${i}`] = 1;
    variables[`y${i}`] = y;

    ints[`x${i}`] = 1;
    ints[`y${i}`] = 1;
  });

  return {
    optimize: "cost",
    opType: "min",
    constraints,
    variables,
    ints,
    options: { timeout: 1200, tolerance: 0.02 },
  };
}

/** 0–100: how close the meal lands to its targets. Extra protein is only lightly penalized. */
export function fitScore(totals: Nutrition, t: MacroTargets): number {
  const rel = (actual: number, target: number) => (target > 0 ? Math.abs(actual - target) / target : 0);
  const proteinErr =
    totals.protein >= t.protein ? rel(totals.protein, t.protein) * 0.25 : rel(totals.protein, t.protein);
  const err =
    0.35 * rel(totals.calories, t.calories) +
    0.35 * proteinErr +
    0.15 * rel(totals.carbs, t.carbs) +
    0.15 * rel(totals.fat, t.fat);
  return Math.max(0, Math.round(100 * (1 - err)));
}

function scale(n: Nutrition, by: number): Nutrition {
  return {
    calories: n.calories * by,
    protein: n.protein * by,
    carbs: n.carbs * by,
    fat: n.fat * by,
    fiber: n.fiber * by,
    sugar: n.sugar * by,
    sodium: n.sodium * by,
  };
}

function emptyNutrition(): Nutrition {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
}

function sumNutrition(list: Nutrition[]): Nutrition {
  return list.reduce(
    (acc, n) => ({
      calories: acc.calories + n.calories,
      protein: acc.protein + n.protein,
      carbs: acc.carbs + n.carbs,
      fat: acc.fat + n.fat,
      fiber: acc.fiber + n.fiber,
      sugar: acc.sugar + n.sugar,
      sodium: acc.sodium + n.sodium,
    }),
    emptyNutrition(),
  );
}

function roundNutrition(n: Nutrition): Nutrition {
  return {
    calories: Math.round(n.calories),
    protein: Math.round(n.protein),
    carbs: Math.round(n.carbs),
    fat: Math.round(n.fat),
    fiber: Math.round(n.fiber),
    sugar: Math.round(n.sugar),
    sodium: Math.round(n.sodium),
  };
}
