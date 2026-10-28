export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export type ItemRole =
  | "protein"
  | "carb"
  | "veg"
  | "fruit"
  | "dairy"
  | "sauce"
  | "dessert"
  | "other";

export interface FoodItem {
  id: string;
  name: string;
  station: string;
  isVegetarian: boolean;
  isVegan: boolean;
  /** Allergen names flagged true by Purdue (e.g. "Milk", "Gluten"). */
  allergens: string[];
  /** Serving size as printed by Purdue, e.g. "1/2 Cup". */
  servingSize: string | null;
  nutrition: Nutrition | null;
  role: ItemRole;
  /** Courts serving this item; set only on combined "best across all" menus. */
  locations?: string[];
}

export interface Meal {
  name: string;
  type: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  items: FoodItem[];
}

export interface DayMenu {
  location: string;
  date: string;
  isPublished: boolean;
  meals: Meal[];
}

export interface DiningLocation {
  id: string;
  name: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
}

export type Sex = "male" | "female";

export const DAY_MEALS = ["Breakfast", "Lunch", "Dinner"] as const;
export type DayMeal = (typeof DAY_MEALS)[number];

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very"
  | "extreme";

export type GoalId =
  | "lean_bulk"
  | "cut"
  | "recomp"
  | "maintain"
  | "strength"
  | "endurance"
  | "custom";

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Profile {
  /** Body weight in kilograms. */
  weightKg: number;
  /** Height in centimeters. */
  heightCm: number;
  age: number;
  sex: Sex;
  activity: ActivityLevel;
  goal: GoalId;
  /** Used only when goal is "custom". */
  custom?: MacroTargets;
  /** Dining court meals eaten on a normal day; the day's food is split across them. */
  diningMeals: DayMeal[];
  /** Snacks eaten outside the dining courts (0–3); each takes ~10% of the day. */
  snacksPerDay: number;
  isTrainingDay: boolean;
  vegetarian: boolean;
  vegan: boolean;
  /** Purdue allergen names to avoid, e.g. ["Peanuts", "Shellfish"]. */
  avoidAllergens: string[];
  /** Case-insensitive substrings; matching items are never recommended. */
  dislikes: string[];
  allowDessert: boolean;
  /** Active calories from a wearable (e.g. Apple Watch). Overrides the activity multiplier when set. */
  activeEnergyKcal?: number;
}

export type HandPortion = "fist" | "palm" | "thumb" | "cupped_hand" | "piece";

export interface PortionVisual {
  /** Total servings, in half-serving steps. */
  servings: number;
  /** Human-readable total amount, e.g. "1 cup" or "2 slices". */
  amountLabel: string;
  hand: HandPortion;
  /** How many of `hand` the portion equals, rounded to 0.25. */
  handCount: number;
}

export interface MealPick {
  item: FoodItem;
  servings: number;
  totals: Nutrition;
  portion: PortionVisual;
  /** Share of the meal's calories, 0–1 (used for plate sections). */
  plateShare: number;
}

export interface Recommendation {
  /** A court name, or "all" when items come from several courts. */
  location: string;
  date: string;
  meal: string;
  /** Serving hours ("HH:MM:SS"), when known for a single court. */
  hours: { start: string; end: string } | null;
  targets: MacroTargets;
  picks: MealPick[];
  totals: Nutrition;
  /** 0–100, how close the totals land to the targets. */
  fitScore: number;
}
