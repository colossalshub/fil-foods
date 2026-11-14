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
}

export const TODAY_MENU: TodayMeal[] = [
  {
    id: 'sugar-free-ube-pandesal',
    slot: 'Breakfast',
    group: 'Pastries & Breads',
    name: 'Sugar-Free Ube Pandesal',
    calories: 190,
    protein: 6,
    price: 300,
    note: 'Diabetic-safe · 6g protein',
    badge: 'warm',
    badgeLabel: 'SF',
    catalogMealId: '5',
  },
  {
    id: 'traditional-pandesal',
    slot: 'Breakfast',
    group: 'Pastries & Breads',
    name: 'Traditional Pandesal',
    calories: 210,
    protein: 6,
    price: 300,
    note: 'Low-sodium · 6g protein',
    badge: 'neutral',
    badgeLabel: 'TP',
    catalogMealId: '6',
  },
  {
    id: 'whole-wheat-pandesal',
    slot: 'Breakfast',
    group: 'Pastries & Breads',
    name: 'Whole Wheat Pandesal',
    calories: 200,
    protein: 8,
    price: 300,
    note: 'High-fiber · 8g protein',
    badge: 'fresh',
    badgeLabel: 'WW',
    catalogMealId: '5',
  },
  {
    id: 'lunch-pinakbet',
    slot: 'Lunch',
    group: 'Vegetable Plates',
    name: 'Pinakbet Plate',
    calories: 285,
    protein: 12,
    price: 300,
    note: 'High-fiber · diabetic-safe',
    badge: 'fresh',
    badgeLabel: 'PB',
    customizable: true,
    catalogMealId: 'sample-ampalaya',
  },
  {
    id: 'lunch-chicken-sinigang',
    slot: 'Lunch',
    group: 'Soup Meals',
    name: 'Chicken Sinigang',
    calories: 320,
    protein: 28,
    price: 300,
    note: 'Low-sodium · 28g protein',
    badge: 'neutral',
    badgeLabel: 'SG',
    customizable: true,
    catalogMealId: 'sample-tinola',
  },
  {
    id: 'lunch-bangus',
    slot: 'Lunch',
    group: 'Grilled Fish',
    name: 'Grilled Bangus',
    calories: 390,
    protein: 28,
    price: 300,
    note: 'Omega-3 · low carb',
    badge: 'warm',
    badgeLabel: 'GB',
    customizable: true,
    catalogMealId: 'sample-bangus',
  },
  {
    id: 'dinner-adobo',
    slot: 'Dinner',
    group: 'Filipino Classics',
    name: 'Chicken Adobo Bowl',
    calories: 520,
    protein: 32,
    price: 300,
    note: 'High-protein',
    badge: 'neutral',
    badgeLabel: 'AD',
    customizable: true,
    catalogMealId: '1',
  },
  {
    id: 'dinner-hipon',
    slot: 'Dinner',
    group: 'Soup Meals',
    name: 'Sinigang na Hipon',
    calories: 380,
    protein: 28,
    price: 300,
    note: 'Low-carb',
    badge: 'fresh',
    badgeLabel: 'SH',
    customizable: true,
    catalogMealId: '2',
  },
];

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