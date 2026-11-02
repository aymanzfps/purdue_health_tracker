import type { FoodItem } from "./types";

// Purdue doesn't mark halal or kosher food, so these rules only hide what's
// clearly off-limits by name and allergen flags. They can't vouch for how meat
// was slaughtered or prepared.

const PORK =
  /\b(pork|bacon|ham|prosciutto|pancetta|pepperoni|salami|chorizo|carnitas|lard|kielbasa|bratwurst|brats?|hot dogs?(?! buns?| toppings)|spam|pulled pork|sausages?)\b/i;
// Sausage is usually pork; trust it only when the name says otherwise.
const NON_PORK_SAUSAGE = /\b(chicken|turkey|beef|veg(gie|etarian|an)?|plant|impossible|beyond)\b/i;
const GELATIN = /\b(gelatin|jell-?o|marshmallows?|gummy|gummies)\b/i;
const ALCOHOL =
  /\b(wine|beer|ale|rum|bourbon|vodka|whiskey|whisky|tequila|brandy|sherry|marsala|sake|mirin|liqueur|kahlua|amaretto|cognac|stout|lager)\b/i;
const SHELLFISH = /\b(shrimp|crab|lobster|clams?|mussels?|oysters?|scallops?|crawfish|calamari|squid|octopus)\b/i;
const MEAT =
  /\b(chicken|beef|turkey|lamb|veal|steak|burgers?|meatballs?|brisket|barbacoa|gyro|carne asada|duck|wings?|drumsticks?|thighs?|patty)\b/i;
const MEATLESS = /\b(veg(gie|etarian|an)?|plant|impossible|beyond|black bean|tofu)\b/i;

function hasPork(name: string): boolean {
  if (!PORK.test(name)) return false;
  // "Turkey Sausage" is fine; "Turkey Bacon" too.
  const match = name.match(PORK)![0].toLowerCase();
  if (/^(sausages?|bacon|hot dogs?|brats?|bratwurst|pepperoni|kielbasa)$/.test(match) && NON_PORK_SAUSAGE.test(name)) return false;
  return true;
}

export function isHalalFriendly(item: Pick<FoodItem, "name">): boolean {
  return !hasPork(item.name) && !GELATIN.test(item.name) && !ALCOHOL.test(item.name);
}

export function isKosherFriendly(item: Pick<FoodItem, "name" | "allergens">): boolean {
  if (!isHalalFriendly(item)) return false;
  if (item.allergens.includes("Shellfish") || SHELLFISH.test(item.name)) return false;
  // No meat cooked with dairy (cheeseburgers, chicken alfredo).
  const isMeat = MEAT.test(item.name) && !MEATLESS.test(item.name);
  return !(isMeat && item.allergens.includes("Milk"));
}
