import type { Meal } from '../types';
import { MENU_CATALOG, applyRemoteMenu, offeredCatalogItems, resolveMenuMeal, type RemoteMenuRow } from './menuCatalog.js';
import { STANDARD_MEAL_PRICE } from '../services/orderService.js';

/** Browse and filter labels aligned with USR-16 meal times only. */
export const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner'];
export const FILTER_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner'];
export const DIETS = ['Vegetarian', 'Vegan', 'Low-carb', 'High-protein'];
export const FILTER_RESTRICTIONS = ['Low-sodium', 'Low-sugar', 'Soft diet', 'Vegetarian', 'Vegan', 'Low-carb', 'High-protein'];
export const ALLERGENS = ['Peanuts', 'Shellfish', 'Dairy', 'Gluten', 'Egg', 'Soy'];

/** Legacy catalog rows used by search and recommendation tests; not offered in the browse menu. */
const SEARCH_FIXTURE_MEALS: Meal[] = [
  {
    id: 'sample-bangus',
    name: 'Grilled Bangus',
    cuisine: 'Filipino',
    category: 'Dinner',
    diets: ['High-protein'],
    allergens: [],
    calories: 390,
    protein: 28,
    carbs: 8,
    fat: 18,
    sodium: 450,
    price: STANDARD_MEAL_PRICE,
    emoji: '🐟',
    mealCategories: ['Fish'],
    dietaryTags: ['Low-sodium'],
    ingredients: ['Bangus', 'Tomato'],
  },
  {
    id: 'sample-tinola',
    name: 'Chicken Tinola',
    cuisine: 'Filipino',
    category: 'Lunch',
    diets: ['High-protein'],
    allergens: [],
    calories: 320,
    protein: 28,
    carbs: 12,
    fat: 15,
    sodium: 480,
    price: STANDARD_MEAL_PRICE,
    portion: '1 bowl (350 g)',
    emoji: '🍲',
    mealCategories: ['Soup'],
    dietaryTags: ['Low-sodium'],
    ingredients: ['Chicken', 'Papaya', 'Ginger'],
  },
  {
    id: 'sample-satay',
    name: 'Chicken Satay',
    cuisine: 'Filipino',
    category: 'Dinner',
    diets: ['High-protein'],
    allergens: ['Peanuts'],
    calories: 480,
    protein: 32,
    sodium: 560,
    price: STANDARD_MEAL_PRICE,
    emoji: '🍢',
    mealCategories: [],
    dietaryTags: [],
    ingredients: ['Chicken', 'Peanut sauce'],
  },
  {
    id: 'sample-ampalaya',
    name: 'Ampalaya Stir-fry',
    cuisine: 'Filipino',
    category: 'Lunch',
    diets: ['Vegetarian'],
    allergens: [],
    calories: 180,
    protein: 8,
    sodium: 320,
    price: STANDARD_MEAL_PRICE,
    emoji: '🥬',
    mealCategories: [],
    dietaryTags: ['Vegetarian'],
    ingredients: ['Ampalaya', 'Egg'],
  },
];

const menuMeals = MENU_CATALOG.filter((item) => item.available).map(resolveMenuMeal);
const menuIds = new Set(menuMeals.map((meal) => meal.id));

/** Full catalog for cart, search, and nutrition tools (includes Dinner slot rows). */
export const MEALS: Meal[] = [
  ...menuMeals,
  ...SEARCH_FIXTURE_MEALS.filter((meal) => !menuIds.has(meal.id)),
];

/**
 * USR-35 / USR-39: recommendations use the five food items offered today (USR-16).
 */
export const RECOMMENDATION_MEALS: Meal[] = offeredCatalogItems().map(resolveMenuMeal);
/**
 * Refreshes the meal lists after the live menu loads, keeping the same
 * array objects so every importer sees the change.
 */
export function syncMealsWithRemoteMenu(rows: RemoteMenuRow[]) {
  const changed = applyRemoteMenu(rows);
  if (!changed) return 0;
  const available = MENU_CATALOG.filter((item) => item.available).map(resolveMenuMeal);
  const ids = new Set(available.map((meal) => meal.id));
  MEALS.splice(0, MEALS.length, ...available, ...SEARCH_FIXTURE_MEALS.filter((meal) => !ids.has(meal.id)));
  RECOMMENDATION_MEALS.splice(0, RECOMMENDATION_MEALS.length, ...offeredCatalogItems().map(resolveMenuMeal));
  return changed;
}
