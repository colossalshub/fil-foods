import {
  offeredCatalogItems,
  type MenuCatalogItem,
} from './menuCatalog.js';
import { MEAL_DAY_COPY } from './messages.js';
import { STANDARD_MEAL_PRICE, MEAT_PROTEINS, VEGETABLE_STYLES } from '../services/orderService.js';

export const DAY_SLOTS = ['Breakfast', 'Lunch', 'Dinner'] as const;
export type DaySlot = (typeof DAY_SLOTS)[number];

/** Order cutoff for today. Breakfast ends at 9:00 AM; lunch and dinner stay open until their order time. */
const SLOT_ORDER_UNTIL: Record<DaySlot, { hour: number; label: string }> = {
  Breakfast: { hour: 9, label: '9:00 AM' },
  Lunch: { hour: 13, label: '1:00 PM' },
  Dinner: { hour: 17, label: '5:00 PM' },
};

export function slotWindowLabel(slot: DaySlot) {
  const until = SLOT_ORDER_UNTIL[slot];
  return slot === 'Breakfast' ? MEAL_DAY_COPY.endsAt(until.label) : MEAL_DAY_COPY.orderUntil(until.label);
}

/** A meal time is available while today is a kitchen day and the clock is still before its cutoff. */
export function slotIsOpen(slot: DaySlot, now = new Date()) {
  const day = now.getDay();
  if (day === 0) return false;
  const cutoff = new Date(now);
  cutoff.setHours(SLOT_ORDER_UNTIL[slot].hour, 0, 0, 0);
  return now.getTime() < cutoff.getTime();
}

export function openDaySlots(now = new Date()) {
  return DAY_SLOTS.filter((slot) => slotIsOpen(slot, now));
}

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

export function todayMenu() {
  return offeredCatalogItems().map(catalogToTodayMeal);
}

export function mealsForSlot(slot: DaySlot) {
  return todayMenu().filter((meal) => meal.slot === slot);
}

/** Names offered today for a meal time and group. USR-16: nothing else is selectable. */
export function offeredChoiceNames(slot: DaySlot, group: string) {
  return mealsForSlot(slot).filter((meal) => meal.group === group).map((meal) => meal.name);
}

export function nextSlot(slot: DaySlot): DaySlot {
  const index = DAY_SLOTS.indexOf(slot);
  return DAY_SLOTS[(index + 1) % DAY_SLOTS.length];
}

export function todayMealById(id: string) {
  return todayMenu().find((meal) => meal.id === id);
}