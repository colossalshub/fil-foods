import { MENU_CATALOG, customizedMenuMeal } from '../data/menuCatalog.js';
import type { Meal, MealCustomization } from '../types';

/** Finished lunch dishes for Home. Each one is already a protein and a cooking style. */
const READY_LUNCH = [
  { protein: 'Beef', style: 'Pinoy Steak', catalogId: 'menu-lunch-beef' },
  { protein: 'Fish', style: 'Pinoy Steak', catalogId: 'menu-lunch-fish' },
  { protein: 'Pork', style: 'Adobo', catalogId: 'menu-lunch-pork' },
  { protein: 'Chicken', style: 'Tinola', catalogId: 'menu-lunch-chicken' },
] as const;

export type ReadyLunchMeal = Meal & {
  readyChoice: MealCustomization & { catalogId: string };
};

export function readyLunchMeals(): ReadyLunchMeal[] {
  const meals: ReadyLunchMeal[] = [];
  for (const preset of READY_LUNCH) {
    const item = MENU_CATALOG.find((entry) => entry.id === preset.catalogId);
    if (!item?.available) continue;
    const plate = customizedMenuMeal(item, { meatProtein: preset.protein });
    const name = `${preset.protein} ${preset.style}`;
    meals.push({
      ...plate,
      id: `ready-${preset.protein}-${preset.style}`.toLowerCase().replace(/\s+/g, '-'),
      name,
      description: name,
      category: 'Lunch',
      readyChoice: {
        meatProtein: preset.protein,
        cookingStyle: preset.style,
        catalogId: preset.catalogId,
      },
    });
  }
  return meals;
}

export function readyLunchChoice(meal: Meal) {
  return readyLunchMeals().find((entry) => entry.id === meal.id)?.readyChoice;
}

/** Home dishes use a display name (`Pork Adobo`). Orders must use the catalog plate (`plate-lunch-pork` / `Pork`). */
export function orderCatalogIdentity(meal: Meal): { mealId: string; mealName: string } {
  const preset = READY_LUNCH.find((entry) => {
    const id = `ready-${entry.protein}-${entry.style}`.toLowerCase().replace(/\s+/g, '-');
    return id === meal.id;
  });
  if (preset) {
    const item = MENU_CATALOG.find((entry) => entry.id === preset.catalogId);
    if (item) return { mealId: item.mealId || item.id, mealName: item.name };
  }
  return { mealId: meal.id, mealName: meal.name };
}
