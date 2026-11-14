import {
  MENU_CATALOG,
  type MenuCatalogItem,
} from './menuCatalog.js';
import { STANDARD_MEAL_PRICE, MEAT_PROTEINS, VEGETABLE_STYLES } from '../services/orderService.js';

export const DAY_SLOTS = ['Breakfast', 'Lunch', 'Dinner'] as const;
export type DaySlot = (typeof DAY_SLOTS)[number];

export interface TodayMeal {
  id: string;
  slot: DaySlot;
  group: string;
  name: string;
  calories: number;
  protein: number;
  price: number;
  note: string;
  badge: 'warm' | 'neutral' | 'fresh';
  badgeLabel: string;
  customizable?: boolean;
  catalogMealId?: string;
  defaultMeatProtein?: string;
  defaultVegetableStyle?: string;
}

function badgeForItem(item: MenuCatalogItem): TodayMeal['badge'] {
  if (item.slot === 'Breakfast') return 'warm';
  if (item.section === 'Meat choices') return 'neutral';
  return 'fresh';
}

function catalogToTodayMeal(item: MenuCatalogItem): TodayMeal {
  const isBreakfast = item.slot === 'Breakfast';
  const isMeat = item.section === 'Meat choices';
  const isVeg = item.section === 'Vegetable choices';
  const meatDefault = isMeat && MEAT_PROTEINS.includes(item.name as (typeof MEAT_PROTEINS)[number])
    ? item.name
    : undefined;
  const vegDefault = isVeg && VEGETABLE_STYLES.includes(item.name as (typeof VEGETABLE_STYLES)[number])
    ? item.name
    : undefined;

  return {
    id: item.id,
    slot: item.slot,
    group: item.section,
    name: item.name,
    calories: item.calories ?? 300,
    protein: item.protein ?? 10,
    price: item.price ?? STANDARD_MEAL_PRICE,
    note: item.subtitle || (isBreakfast ? 'Pastries and breads' : 'Customize vegetables, meat, and cooking style'),
    badge: badgeForItem(item),
    badgeLabel: item.initials || item.name.slice(0, 2).toUpperCase(),
    customizable: !isBreakfast,
    catalogMealId: item.mealId || item.id,
    defaultMeatProtein: meatDefault,
    defaultVegetableStyle: vegDefault,
  };
}

export const TODAY_MENU: TodayMeal[] = MENU_CATALOG.filter((item) => item.available).map(catalogToTodayMeal);

export function mealsForSlot(slot: DaySlot) {
  return TODAY_MENU.filter((meal) => meal.slot === slot);
}

export function nextSlot(slot: DaySlot): DaySlot {
  const index = DAY_SLOTS.indexOf(slot);
  return DAY_SLOTS[(index + 1) % DAY_SLOTS.length];
}

export function todayMealById(id: string) {
  return TODAY_MENU.find((meal) => meal.id === id);
}