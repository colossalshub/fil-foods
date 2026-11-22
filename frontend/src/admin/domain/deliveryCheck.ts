import { MENU_CATALOG } from '../../user/data/menuCatalog.js';
import { sodiumFromIngredients } from '../../user/domain/sodium.js';
import type { DietaryInfo } from '../types';

/** Styled plates use the catalog protein's ingredients. Pinoy steak is pork plus the pork plate sides. */
const MEAL_INGREDIENTS: Record<string, string[]> = {
  'Pork Pinoy Steak': ['Pork', 'Garlic', 'Onion', 'Vegetables'],
  'Pork Adobo': ['Pork', 'Garlic', 'Onion', 'Vegetables'],
  'Beef Pinoy Steak': ['Beef', 'Garlic', 'Onion', 'Vegetables'],
  'Fish Pinoy Steak': ['Fish', 'Tomato', 'Vegetables'],
  'Chicken Tinola': ['Chicken', 'Garlic', 'Ginger', 'Vegetables'],
};

export interface SodiumCheck {
  mg: number;
  limit: number | null;
  above: boolean;
}

export function ingredientsForMeal(name: string) {
  return MEAL_INGREDIENTS[name] ?? MENU_CATALOG.find((item) => item.name === name)?.ingredients ?? null;
}

/** Sample sodium for a delivery order, compared with the recipient's 400 mg limit when they asked for lower sodium. */
export function sodiumCheck(mealName: string, dietary: DietaryInfo | null | undefined): SodiumCheck | null {
  const mg = sodiumFromIngredients(ingredientsForMeal(mealName) ?? undefined);
  if (mg == null) return null;
  const limit = dietary?.nutrition?.lowerSodium ? 400 : null;
  return { mg, limit, above: limit != null && mg > limit };
}
