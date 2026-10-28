import type { ActivityLevel, GoalId, MacroTargets, Profile } from "./types";

export interface GoalDefinition {
  id: GoalId;
  label: string;
  description: string;
  /** Multiplier applied to maintenance calories (TDEE). */
  calorieFactor: number;
  /** Grams of protein per kg of body weight. */
  proteinPerKg: number;
  /** Share of calories from fat; carbs fill whatever is left. */
  fatShare: number;
}

export const GOALS: Record<Exclude<GoalId, "custom">, GoalDefinition> = {
  lean_bulk: {
    id: "lean_bulk",
    label: "Lean bulk",
    description: "Build muscle slowly while keeping fat gain low.",
    calorieFactor: 1.1,
    proteinPerKg: 2.0,
    fatShare: 0.25,
  },
  cut: {
    id: "cut",
    label: "Cut",
    description: "Lose fat while keeping as much muscle as possible.",
    calorieFactor: 0.8,
    proteinPerKg: 2.4,
    fatShare: 0.25,
  },
  recomp: {
    id: "recomp",
    label: "Recomp",
    description: "Lose fat and gain muscle at the same time, eating at maintenance.",
    calorieFactor: 1.0,
    proteinPerKg: 2.2,
    fatShare: 0.25,
  },
  maintain: {
    id: "maintain",
    label: "Maintain",
    description: "Keep your current weight with balanced macros.",
    calorieFactor: 1.0,
    proteinPerKg: 1.6,
    fatShare: 0.3,
  },
  strength: {
    id: "strength",
    label: "Strength / powerlifting",
    description: "Fuel heavy lifting: a small surplus with plenty of carbs.",
    calorieFactor: 1.05,
    proteinPerKg: 2.0,
    fatShare: 0.25,
  },
  endurance: {
    id: "endurance",
    label: "Endurance",
    description: "Running, cycling, or swimming: high carb, moderate protein.",
    calorieFactor: 1.05,
    proteinPerKg: 1.6,
    fatShare: 0.2,
  },
};

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, { factor: number; label: string }> = {
  sedentary: { factor: 1.2, label: "Little or no exercise" },
  light: { factor: 1.375, label: "Exercise 1–3 days a week" },
  moderate: { factor: 1.55, label: "Exercise 3–5 days a week" },
  very: { factor: 1.725, label: "Hard exercise 6–7 days a week" },
  extreme: { factor: 1.9, label: "Twice-a-day training or a physical job" },
};

/** Training days get this many extra calories (as carbs); rest days lose the same amount. */
const TRAINING_DAY_SWING = 0.07;

/** Calories burned at rest (Mifflin-St Jeor). */
export function bmr(p: Pick<Profile, "weightKg" | "heightCm" | "age" | "sex">): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === "male" ? base + 5 : base - 161;
}

/** Maintenance calories for the day. Wearable active energy beats the activity estimate when present. */
export function tdee(p: Profile): number {
  if (p.activeEnergyKcal !== undefined && p.activeEnergyKcal >= 0) {
    // BMR × 1.2 covers daily movement outside tracked activity (NEAT).
    return bmr(p) * 1.2 + p.activeEnergyKcal;
  }
  return bmr(p) * ACTIVITY_MULTIPLIERS[p.activity].factor;
}

export function dailyTargets(p: Profile): MacroTargets {
  if (p.goal === "custom") {
    if (!p.custom) throw new Error("Custom goal needs custom targets");
    return roundTargets(p.custom);
  }
  const goal = GOALS[p.goal];
  const maintenance = tdee(p);
  // A wearable already reflects whether today was a training day.
  const swing =
    p.activeEnergyKcal !== undefined ? 0 : p.isTrainingDay ? TRAINING_DAY_SWING : -TRAINING_DAY_SWING;

  const baseCalories = maintenance * goal.calorieFactor;
  const calories = baseCalories * (1 + swing);
  const protein = goal.proteinPerKg * p.weightKg;
  // Fat stays at its share of the base day so the training swing lands on carbs.
  const fat = Math.max((baseCalories * goal.fatShare) / 9, 0.6 * p.weightKg);
  const carbs = Math.max((calories - protein * 4 - fat * 9) / 4, 50);

  return roundTargets({ calories, protein, carbs, fat });
}

/**
 * Share of the day's food for one dining court meal. Extra meals beyond three
 * are assumed to be snacks eaten elsewhere, so dining meals cover less.
 */
export function mealShare(mealName: string, mealsPerDay: number): number {
  const meal = mealName.toLowerCase();
  const snackShare = Math.max(0, mealsPerDay - 3) * 0.1;
  const diningShare = 1 - snackShare;

  if (mealsPerDay <= 2) {
    return meal.includes("breakfast") || meal.includes("brunch") ? 0.4 : 0.6;
  }
  const weights: Record<string, number> = { breakfast: 0.25, brunch: 0.35, lunch: 0.35, dinner: 0.4 };
  const key = Object.keys(weights).find((k) => meal.includes(k)) ?? "lunch";
  return weights[key] * diningShare;
}

export function mealTargets(daily: MacroTargets, mealName: string, mealsPerDay: number): MacroTargets {
  const share = mealShare(mealName, mealsPerDay);
  return roundTargets({
    calories: daily.calories * share,
    protein: daily.protein * share,
    carbs: daily.carbs * share,
    fat: daily.fat * share,
  });
}

function roundTargets(t: MacroTargets): MacroTargets {
  return {
    calories: Math.round(t.calories),
    protein: Math.round(t.protein),
    carbs: Math.round(t.carbs),
    fat: Math.round(t.fat),
  };
}

export const LB_PER_KG = 2.20462;
export const CM_PER_IN = 2.54;
export const lbToKg = (lb: number) => lb / LB_PER_KG;
export const inToCm = (inches: number) => inches * CM_PER_IN;
