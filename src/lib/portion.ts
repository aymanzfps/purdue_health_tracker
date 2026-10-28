import type { FoodItem, HandPortion, PortionVisual } from "./types";

// Turns Purdue's printed serving sizes ("1/2 Cup Serving", "4 oz Portion",
// "Bun", "12 Cut Serving") into a total amount plus a hand-size comparison:
// fist ≈ 1 cup, palm ≈ 3 oz of meat, thumb ≈ 1 tbsp, cupped hand ≈ 1 oz of snacks.

type Unit = "cup" | "oz" | "floz" | "tbsp" | "tsp" | "piece";

interface ParsedServing {
  quantity: number;
  unit: Unit;
  /** Singular noun for piece units, e.g. "bun", "slice". */
  noun: string;
}

const FILLER = /\b(serving|servings|portion|portions)\b/gi;

export function parseServingSize(raw: string | null): ParsedServing {
  if (!raw) return { quantity: 1, unit: "piece", noun: "serving" };
  const text = raw.replace(FILLER, "").replace(/\s+/g, " ").trim().toLowerCase();

  // "8x10 cut" is a pan-cut count, not a quantity: one piece.
  if (/^\d+\s*x\s*\d+/.test(text)) return { quantity: 1, unit: "piece", noun: "piece" };

  const match = text.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)?\s*(.*)$/);
  const quantity = match?.[1] ? parseQuantity(match[1]) : 1;
  const rest = (match?.[2] ?? "").trim();

  if (/^fl\.? ?oz/.test(rest) || /^fluid ounce/.test(rest)) return { quantity, unit: "floz", noun: "" };
  if (/^(cups?|c)\b/.test(rest)) return { quantity, unit: "cup", noun: "" };
  if (/^(oz|ounces?)\b/.test(rest)) return { quantity, unit: "oz", noun: "" };
  if (/^(tbsp|tablespoons?|tbs)\b/.test(rest)) return { quantity, unit: "tbsp", noun: "" };
  if (/^(tsp|teaspoons?)\b/.test(rest)) return { quantity, unit: "tsp", noun: "" };

  // "12 Cut" means the pan is cut into 12: one serving is one slice.
  if (/^cut\b/.test(rest)) return { quantity: 1, unit: "piece", noun: "slice" };
  if (!rest || /^(each|ea|piece|pieces|pc)\b/.test(rest)) return { quantity, unit: "piece", noun: "piece" };
  return { quantity, unit: "piece", noun: singular(rest.split(" ")[0]) };
}

export function portionVisual(item: FoodItem, servings: number): PortionVisual {
  const parsed = parseServingSize(item.servingSize);
  const total = parsed.quantity * servings;
  const isSauce = item.role === "sauce";
  const isSnack = /\bchips\b/i.test(item.name);

  let hand: HandPortion;
  let handCount: number;
  switch (parsed.unit) {
    case "cup":
      // Up to ¼ cup is a dressing-sized amount; more (a ladle of marinara) reads better as fists.
      if (isSauce && total < 0.25) [hand, handCount] = ["thumb", total * 16];
      else [hand, handCount] = ["fist", total];
      break;
    case "floz":
      [hand, handCount] = isSauce ? ["thumb", total * 2] : ["fist", total / 8];
      break;
    case "oz":
      if (item.role === "protein") [hand, handCount] = ["palm", total / 3];
      else if (isSauce) [hand, handCount] = ["thumb", total * 2];
      else if (isSnack) [hand, handCount] = ["cupped_hand", total];
      else [hand, handCount] = ["fist", total / 4];
      break;
    case "tbsp":
      [hand, handCount] = ["thumb", total];
      break;
    case "tsp":
      [hand, handCount] = ["thumb", total / 3];
      break;
    default:
      [hand, handCount] = ["piece", total];
  }

  return {
    servings,
    amountLabel: amountLabel(total, parsed),
    hand,
    handCount: Math.max(0.25, Math.round(handCount * 4) / 4),
  };
}

function amountLabel(total: number, p: ParsedServing): string {
  const qty = formatQuantity(total);
  const plural = total > 1;
  switch (p.unit) {
    case "cup":
      return `${qty} ${plural ? "cups" : "cup"}`;
    case "floz":
      return `${qty} fl oz`;
    case "oz":
      return `${qty} oz`;
    case "tbsp":
      return `${qty} tbsp`;
    case "tsp":
      return `${qty} tsp`;
    default:
      return `${qty} ${plural ? pluralize(p.noun) : p.noun}`;
  }
}

function parseQuantity(s: string): number {
  return s
    .trim()
    .split(/\s+/)
    .reduce((sum, part) => {
      const [num, den] = part.split("/").map(Number);
      return sum + (den ? num / den : num);
    }, 0);
}

const FRACTIONS: [number, string][] = [
  [0.25, "¼"],
  [1 / 3, "⅓"],
  [0.5, "½"],
  [2 / 3, "⅔"],
  [0.75, "¾"],
];

export function formatQuantity(n: number): string {
  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;
  if (frac < 0.05) return String(whole);
  const [, glyph] = FRACTIONS.reduce((best, f) =>
    Math.abs(f[0] - frac) < Math.abs(best[0] - frac) ? f : best,
  );
  return whole ? `${whole}${glyph}` : glyph;
}

function singular(word: string): string {
  if (/ies$/.test(word)) return word.slice(0, -3) + "y";
  if (/(ches|shes|xes)$/.test(word)) return word.slice(0, -2);
  if (/s$/.test(word) && !/ss$/.test(word)) return word.slice(0, -1);
  return word;
}

function pluralize(word: string): string {
  if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + "ies";
  if (/(ch|sh|x|s)$/.test(word)) return word + "es";
  return word + "s";
}
