import type { FoodItem, ItemRole } from "./types";

// Purdue doesn't tag what kind of food an item is, so we infer it from the
// name first (most reliable) and fall back to its macro split.

const DESSERT =
  /\b(cookies?|cake|coffee ?cake|brownies?|cheesecake|crisp|muffins?|pie|sundae|italian ice|dessert|donuts?|doughnuts?|pastry|fudge|pudding|cobbler|cinnamon roll|cupcakes?|ice cream|blondies?|danish|scones?|churros?|macarons?)\b/i;

// Matched against the LAST word so "Meatballs with Spaghetti Sauce" isn't a sauce.
const SAUCE_LAST_WORD =
  /^(sauce|dressing|dip|salsa|gravy|syrup|butter|cream|ketchup|mustard|mayo|mayonnaise|hummus|queso|gallo|pepper|aioli|glaze|relish|jam|jelly|vinaigrette|ranch|topping|toppings|seasoning|croutons|sprinkles)$/i;
const TOPPING = /\b(parmesan cheese|shredded .*cheese|sour cream|whipped cream|granola|seed'?nola)\b/i;

const CARB =
  /\b(buns?|bread|breadsticks?|rolls?|tortillas?|rice|pasta|rotini|penne|spaghetti|noodles?|potato(es)?|fries|toast|bagels?|oatmeal|cereal|pancakes?|waffles?|quinoa|crackers?|chips|taco shells?|biscuits?|couscous|grits|hash ?browns?|tater tots?|tortellini|ravioli|cavatini|macaroni|mac & cheese|pizza|bowtie|lo mein|garlic bread|cornbread|pretzel)\b/i;

const PROTEIN =
  /\b(chicken|beef|pork|turkey|fish|salmon|tilapia|cod|tuna|shrimp|eggs?|tofu|tempeh|sausage|bacon|ham|meatballs?|burgers?|patty|steak|ribs?|brisket|barbacoa|carnitas|drumsticks?|thighs?|wings?|nuggets?|lentils?|seitan|gyro|kielbasa|bratwurst|hot dog|carne asada|pulled|edamame|black beans?|pinto beans?|chickpeas?)\b/i;

const VEG =
  /\b(broccoli|carrots?|peas|pea pods|corn|green beans|zucchini|brussels sprouts|spinach|salad|vegetables?|veggies|cauliflower|celery|asparagus|squash|kale|cabbage|mushrooms?|tomato(es)?|cucumbers?|onions?|peppers|esquite|okra|beets?|collard|greens|eggplant)\b/i;

const FRUIT =
  /\b(apples?|applesauce|bananas?|oranges?|berry|berries|melon|honeydew|cantaloupe|pineapple|grapes?|peach(es)?|pears?|mandarin|fruit|blueberries|strawberries|raspberries|watermelon|kiwi|mango)\b/i;

const DAIRY = /\b(milk|yogurt|cottage cheese|string cheese|kefir)\b/i;

type Classifiable = Pick<FoodItem, "name" | "nutrition">;

export function classifyItem(item: Classifiable): ItemRole {
  // "Yellow Chicken Curry with Potatoes" is a chicken dish: judge by what comes before "with".
  const name = item.name.trim().split(/\s+with\s+/i)[0];
  const lastWord = name.split(/\s+/).pop() ?? "";
  const n = item.nutrition;

  if (DESSERT.test(name)) return "dessert";
  if (SAUCE_LAST_WORD.test(lastWord) || TOPPING.test(name)) return "sauce";
  // "Hamburger Bun" and "Pineapple Fried Rice" are carbs, so check carbs before protein/fruit.
  if (CARB.test(name) && !/\b(veg(etarian|gie)? burger|patty)\b/i.test(name)) return "carb";
  if (PROTEIN.test(name)) return "protein";
  if (VEG.test(name) && !/pasta salad|macaroni/i.test(name)) return "veg";
  if (FRUIT.test(name)) return "fruit";
  if (DAIRY.test(name)) return "dairy";

  if (!n || n.calories <= 0) return "other";
  const proteinShare = (n.protein * 4) / n.calories;
  const carbShare = (n.carbs * 4) / n.calories;
  if (proteinShare >= 0.3) return "protein";
  if (carbShare >= 0.5) return "carb";
  if (n.calories < 40) return "sauce";
  return "other";
}
