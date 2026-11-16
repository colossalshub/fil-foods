import type { DaySlot } from '../data/todayMenu';
import type { Meal, MealCustomization } from '../types';
import { customizationLabel, validateOrderSelection } from '../services/orderService.js';

export interface CartItem {
  meal: Meal;
  quantity: number;
  customization?: MealCustomization;
  customizationLabel?: string;
  /** Build-today flow: which meal time this line belongs to. */
  daySlot?: DaySlot;
  todayMealId?: string;
}

export interface AddCartItemOptions {
  daySlot?: DaySlot;
  todayMealId?: string;
}

/**
 * USR-18: add or replace one meal. A meal for a meal time replaces that meal
 * time's current choice. Returns the refusal message instead of new items when
 * the cart would break one meal per meal time or three meals per day.
 */
export function addCartLine(
  prev: CartItem[],
  meal: Meal,
  quantity: number,
  customization?: MealCustomization,
  options?: AddCartItemOptions,
): { items: CartItem[]; error: string } {
  const mealForCart = options?.daySlot ? { ...meal, category: options.daySlot } : meal;
  const next = prev.filter((row) => (options?.daySlot
    ? row.daySlot !== options.daySlot
    : row.meal.id !== mealForCart.id));
  next.push({
    meal: mealForCart,
    quantity,
    customization,
    customizationLabel: customizationLabel(customization),
    daySlot: options?.daySlot,
    todayMealId: options?.todayMealId,
  });
  const check = validateOrderSelection(next);
  if (!check.ok) return { items: prev, error: check.message || '' };
  return { items: next, error: '' };
}
