/**
 * USR-13: sodium is the sum of the values recorded for the meal's ingredients,
 * compared with the limit saved for the meal recipient.
 */
export const INGREDIENT_SODIUM_MG: Record<string, number> = {
  Flour: 2,
  'Whole wheat flour': 2,
  Ube: 4,
  Yeast: 4,
  Stevia: 0,
  Milk: 50,
  Egg: 70,
  Sugar: 1,
  Butter: 80,
  Salt: 240,
  Honey: 1,
  Muscovado: 2,
  Sesame: 5,
  Beef: 65,
  Pork: 62,
  Chicken: 70,
  Fish: 80,
  Garlic: 2,
  Onion: 4,
  Ginger: 1,
  Tomato: 5,
  Vegetables: 15,
  'Mixed vegetables': 20,
  Sitaw: 4,
  Eggplant: 2,
  Okra: 6,
  Ampalaya: 8,
  Bagoong: 420,
};

export function sodiumFromIngredients(ingredients: string[] | undefined) {
  if (!ingredients?.length) return null;
  let total = 0;
  let known = 0;
  for (const name of ingredients) {
    const mg = INGREDIENT_SODIUM_MG[name];
    if (mg == null) continue;
    known += 1;
    total += mg;
  }
  return known ? total : null;
}

export function mealSodiumMg(meal: { sodium?: number; ingredients?: string[] } | null | undefined) {
  if (!meal) return null;
  if (meal.sodium != null && Number.isFinite(meal.sodium)) return meal.sodium;
  return sodiumFromIngredients(meal.ingredients);
}

/** A recorded limit the meal is over. No limit means there is nothing to exceed. */
export function exceedsSodiumLimit(
  meal: { sodium?: number; ingredients?: string[] } | null | undefined,
  limit: number | null | undefined,
) {
  if (limit == null || !Number.isFinite(limit) || limit <= 0) return false;
  const mg = mealSodiumMg(meal);
  if (mg == null) return false;
  return mg > limit;
}
