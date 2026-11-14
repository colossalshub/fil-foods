import type { Meal } from '../types';
import { MENU_CATALOG, resolveMenuMeal } from './menuCatalog.js';
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
 * USR-35 / USR-39: recommendations use only available admin-menu choices (USR-16).
 * Dinner mirrors Lunch with the same choice names — exclude Dinner rows here to avoid duplicate cards on Home.
 */
export const RECOMMENDATION_MEALS: Meal[] = MENU_CATALOG.filter(
  (item) => item.available && (item.slot === 'Breakfast' || item.slot === 'Lunch'),
).map(resolveMenuMeal);