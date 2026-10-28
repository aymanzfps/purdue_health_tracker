import { ACTIVITY_MULTIPLIERS, GOALS } from "./targets";
import { DAY_MEALS, type ActivityLevel, type DayMeal, type GoalId, type MacroTargets, type Profile } from "./types";

export class ValidationError extends Error {}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(value: unknown, fallback: string): string {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || !DATE_RE.test(value)) {
    throw new ValidationError("date must look like YYYY-MM-DD");
  }
  return value;
}

export function parseIdList(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new ValidationError(`${field} must be a list of item IDs`);
  }
  return value;
}

export function parseProfile(raw: unknown): Profile {
  if (!raw || typeof raw !== "object") throw new ValidationError("profile is required");
  const p = raw as Record<string, unknown>;

  const goal = p.goal as GoalId;
  if (goal !== "custom" && !(goal in GOALS)) throw new ValidationError("unknown goal");
  const activity = p.activity as ActivityLevel;
  if (!(activity in ACTIVITY_MULTIPLIERS)) throw new ValidationError("unknown activity level");
  if (p.sex !== "male" && p.sex !== "female") throw new ValidationError("sex must be male or female");

  const profile: Profile = {
    weightKg: num(p.weightKg, "weightKg", 30, 300),
    heightCm: num(p.heightCm, "heightCm", 120, 250),
    age: num(p.age, "age", 14, 100),
    sex: p.sex,
    activity,
    goal,
    diningMeals: diningMeals(p.diningMeals),
    snacksPerDay: Math.round(num(p.snacksPerDay ?? 0, "snacksPerDay", 0, 3)),
    isTrainingDay: Boolean(p.isTrainingDay),
    vegetarian: Boolean(p.vegetarian),
    vegan: Boolean(p.vegan),
    avoidAllergens: strings(p.avoidAllergens, "avoidAllergens"),
    dislikes: strings(p.dislikes, "dislikes"),
    allowDessert: Boolean(p.allowDessert),
  };
  if (p.activeEnergyKcal !== undefined && p.activeEnergyKcal !== null) {
    profile.activeEnergyKcal = num(p.activeEnergyKcal, "activeEnergyKcal", 0, 6000);
  }
  if (goal === "custom") profile.custom = parseCustom(p.custom);
  return profile;
}

function diningMeals(value: unknown): DayMeal[] {
  if (value === undefined) return [...DAY_MEALS];
  if (!Array.isArray(value) || value.length === 0 || value.some((v) => !DAY_MEALS.includes(v))) {
    throw new ValidationError("diningMeals must list at least one of Breakfast, Lunch, Dinner");
  }
  // Keep the day's order and drop duplicates.
  return DAY_MEALS.filter((m) => value.includes(m));
}

function parseCustom(raw: unknown): MacroTargets {
  if (!raw || typeof raw !== "object") throw new ValidationError("custom goal needs custom targets");
  const c = raw as Record<string, unknown>;
  return {
    calories: num(c.calories, "custom.calories", 800, 8000),
    protein: num(c.protein, "custom.protein", 0, 500),
    carbs: num(c.carbs, "custom.carbs", 0, 1000),
    fat: num(c.fat, "custom.fat", 0, 400),
  };
}

function num(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new ValidationError(`${field} must be a number between ${min} and ${max}`);
  }
  return value;
}

function strings(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new ValidationError(`${field} must be a list of strings`);
  }
  return value;
}
