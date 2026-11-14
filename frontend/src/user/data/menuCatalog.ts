import type { Meal } from '../types';
import { STANDARD_MEAL_PRICE } from '../services/orderService';
import { MEALS } from './meals';
import { TODAY_MENU } from './todayMenu';

export type MenuSlot = 'Breakfast' | 'Lunch' | 'Dinner';

export interface MenuCatalogItem {
  id: string;
  name: string;
  section: string;
  slot: MenuSlot;
  price?: number;
  available: boolean;
  subtitle?: string;
  initials?: string;
  mealId?: string;
  description?: string;
  ingredients?: string[];
  allergens?: string[];
  category?: MenuSlot;
  calories?: number;
  protein?: number;
}

const BREADS: MenuCatalogItem[] = [
  {
    id: 'menu-sf-ube-pandesal',
    name: 'Sugar Free Ube Pandesal',
    section: 'Pastries and breads',
    slot: 'Breakfast',
    price: 300,
    available: true,
    initials: 'SF',
    mealId: 'sugar-free-ube-pandesal',
    description: 'A ube-flavored pandesal sweetened without added sugar, suitable for diabetic-friendly plans.',
    ingredients: ['Whole wheat flour', 'Ube', 'Yeast', 'Stevia', 'Milk', 'Egg'],
    allergens: ['Wheat', 'Milk', 'Egg'],
    category: 'Breakfast',
    calories: 190,
    protein: 6,
  },
  {
    id: 'menu-traditional-pandesal',
    name: 'Traditional Pandesal',
    section: 'Pastries and breads',
    slot: 'Breakfast',
    price: 300,
    available: true,
    initials: 'TP',
    mealId: 'traditional-pandesal',
    description: 'Classic Filipino breakfast roll, baked fresh daily.',
    ingredients: ['Flour', 'Yeast', 'Sugar', 'Butter', 'Salt'],
    allergens: ['Wheat', 'Milk'],
    category: 'Breakfast',
    calories: 210,
    protein: 6,
  },
  {
    id: 'menu-whole-wheat-pandesal',
    name: 'Whole Wheat Pandesal',
    section: 'Pastries and breads',
    slot: 'Breakfast',
    price: 300,
    available: true,
    initials: 'WW',
    mealId: 'whole-wheat-pandesal',
    description: 'Higher-fiber pandesal for steady morning energy.',
    ingredients: ['Whole wheat flour', 'Yeast', 'Honey', 'Salt'],
    allergens: ['Wheat'],
    category: 'Breakfast',
    calories: 200,
    protein: 8,
  },
  {
    id: 'menu-monay',
    name: 'Monay',
    section: 'Pastries and breads',
    slot: 'Breakfast',
    price: 300,
    available: true,
    initials: 'MO',
    description: 'Dense, slightly sweet Filipino bread roll.',
    ingredients: ['Flour', 'Yeast', 'Sugar', 'Butter'],
    allergens: ['Wheat', 'Milk', 'Egg'],
    category: 'Breakfast',
    calories: 220,
    protein: 7,
  },
  {
    id: 'menu-spanish-bread',
    name: 'Spanish Bread',
    section: 'Pastries and breads',
    slot: 'Breakfast',
    price: 300,
    available: true,
    initials: 'SB',
    description: 'Soft roll filled with buttery sugar crumbs.',
    ingredients: ['Flour', 'Butter', 'Sugar', 'Milk', 'Egg'],
    allergens: ['Wheat', 'Milk', 'Egg'],
    category: 'Breakfast',
    calories: 240,
    protein: 6,
  },
  {
    id: 'menu-ensaymada',
    name: 'Ensaymada',
    section: 'Pastries and breads',
    slot: 'Breakfast',
    price: 300,
    available: true,
    initials: 'EN',
    description: 'Sweet brioche topped with butter, sugar, and grated cheese.',
    ingredients: ['Flour', 'Butter', 'Sugar', 'Cheese', 'Egg'],
    allergens: ['Wheat', 'Milk', 'Egg'],
    category: 'Breakfast',
    calories: 280,
    protein: 8,
  },
  {
    id: 'menu-cheese-bread',
    name: 'Cheese Bread',
    section: 'Pastries and breads',
    slot: 'Breakfast',
    price: 300,
    available: true,
    initials: 'CB',
    description: 'Baked bread with melted cheese filling.',
    ingredients: ['Flour', 'Cheese', 'Butter', 'Milk', 'Egg'],
    allergens: ['Wheat', 'Milk', 'Egg'],
    category: 'Breakfast',
    calories: 260,
    protein: 10,
  },
  {
    id: 'menu-piaya',
    name: 'Piaya',
    section: 'Pastries and breads',
    slot: 'Breakfast',
    price: 300,
    available: true,
    initials: 'PI',
    description: 'Flat muscovado-filled pastry from Negros.',
    ingredients: ['Flour', 'Muscovado', 'Butter', 'Sesame'],
    allergens: ['Wheat', 'Sesame'],
    category: 'Breakfast',
    calories: 230,
    protein: 4,
  },
];

function choiceItems(slot: MenuSlot, section: string, items: Array<Omit<MenuCatalogItem, 'slot' | 'section'>>): MenuCatalogItem[] {
  return items.map((item) => ({ ...item, slot, section }));
}

const LUNCH_MEAT = choiceItems('Lunch', 'Meat choices', [
  { id: 'menu-lunch-chicken', name: 'Chicken', subtitle: 'Skinless chicken portions', available: true, initials: 'CH', mealId: 'sample-tinola', category: 'Lunch', calories: 320, protein: 28 },
  { id: 'menu-lunch-pork', name: 'Pork', subtitle: 'Lean pork cuts', available: true, initials: 'PK', mealId: '1', category: 'Lunch', calories: 420, protein: 30 },
  { id: 'menu-lunch-beef', name: 'Beef', subtitle: 'Lean beef cuts', available: true, initials: 'BF', mealId: '1', category: 'Lunch', calories: 450, protein: 32 },
  { id: 'menu-lunch-fish', name: 'Fish', subtitle: 'Bangus or tilapia', available: true, initials: 'FS', mealId: 'sample-bangus', category: 'Lunch', calories: 390, protein: 28 },
  { id: 'menu-lunch-goat', name: 'Goat', subtitle: 'Goat meat portions', available: true, initials: 'GT', category: 'Lunch', calories: 400, protein: 30, description: 'Goat meat portion for Pinoy-style lunch plates.', ingredients: ['Goat meat', 'Garlic', 'Onion'] },
]);

const LUNCH_VEG = choiceItems('Lunch', 'Vegetable choices', [
  { id: 'menu-lunch-pinakbet', name: 'Pinakbet', subtitle: 'Mixed vegetables with bagoong', available: true, initials: 'PB', mealId: 'sample-ampalaya', category: 'Lunch' },
  { id: 'menu-lunch-ampalaya', name: 'Ampalaya', subtitle: 'Bitter gourd stir-fry or stuffed', available: true, initials: 'AM', mealId: 'sample-ampalaya', category: 'Lunch' },
  { id: 'menu-lunch-monggo', name: 'Monggo', subtitle: 'Mung bean stew', available: true, initials: 'MG', category: 'Lunch', description: 'Mung bean stew with vegetables.', ingredients: ['Mung beans', 'Spinach', 'Garlic'] },
  { id: 'menu-lunch-ginisang', name: 'Ginisang Gulay', subtitle: 'Sauteed mixed vegetables', available: true, initials: 'GG', mealId: '3', category: 'Lunch' },
  { id: 'menu-lunch-chopsuey', name: 'Chopsuey', subtitle: 'Stir-fried vegetables with light sauce', available: true, initials: 'CS', mealId: '3', category: 'Lunch' },
]);

function mirrorDinnerChoices(items: MenuCatalogItem[]): MenuCatalogItem[] {
  return items.map((item) => ({
    ...item,
    id: item.id.replace('lunch', 'dinner'),
    slot: 'Dinner',
    category: 'Dinner',
  }));
}

const DINNER_MEAT = mirrorDinnerChoices(LUNCH_MEAT);
const DINNER_VEG = mirrorDinnerChoices(LUNCH_VEG);

const EXTRA_LUNCH = choiceItems('Lunch', 'Filipino classics', [
  {
    id: 'menu-chicken-kare-kare',
    name: 'Chicken Kare-Kare',
    available: false,
    initials: 'CK',
    price: 300,
    description: 'Peanut stew with vegetables and chicken, served with bagoong on the side.',
    ingredients: ['Chicken', 'Peanut sauce', 'Sitaw', 'Eggplant', 'Bagoong'],
    allergens: ['Peanuts', 'Shellfish'],
    category: 'Lunch',
    calories: 480,
    protein: 30,
  },
]);

export const MENU_CATALOG: MenuCatalogItem[] = [
  ...BREADS,
  ...LUNCH_MEAT,
  ...LUNCH_VEG,
  ...EXTRA_LUNCH,
  ...DINNER_MEAT,
  ...DINNER_VEG,
];

export const MENU_SLOT_SUBTITLE: Record<MenuSlot, string> = {
  Breakfast: 'Pastries and breads available now',
  Lunch: 'Meat and vegetable choices for lunch',
  Dinner: 'Meat and vegetable choices for dinner',
};

export function menuItemsForSlot(slot: MenuSlot) {
  return MENU_CATALOG.filter((item) => item.slot === slot);
}

export function menuSectionsForSlot(slot: MenuSlot) {
  const items = menuItemsForSlot(slot);
  const sections = new Map<string, MenuCatalogItem[]>();
  items.forEach((item) => {
    const list = sections.get(item.section) || [];
    list.push(item);
    sections.set(item.section, list);
  });
  return [...sections.entries()].map(([title, sectionItems]) => ({
    title: title.toUpperCase(),
    items: sectionItems,
  }));
}

export function mealInitials(name: string, override?: string) {
  if (override) return override;
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function todayMealAsCatalog(id: string): Partial<Meal> | null {
  const row = TODAY_MENU.find((meal) => meal.id === id);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.slot,
    calories: row.calories,
    protein: row.protein,
    price: row.price,
    sodium: 400,
  };
}

export function resolveMenuMeal(item: MenuCatalogItem): Meal {
  const fromCatalog = item.mealId ? MEALS.find((meal: Meal) => meal.id === item.mealId) : undefined;
  const fromToday = item.mealId ? todayMealAsCatalog(item.mealId) : null;
  const base = fromCatalog || (fromToday as Meal | undefined);

  return {
    id: base?.id || item.id,
    name: item.name,
    category: item.category || item.slot,
    cuisine: base?.cuisine || 'Filipino',
    calories: item.calories ?? base?.calories ?? 300,
    protein: item.protein ?? base?.protein ?? 10,
    sodium: base?.sodium ?? 450,
    carbs: base?.carbs,
    fat: base?.fat,
    price: item.price ?? base?.price ?? STANDARD_MEAL_PRICE,
    emoji: base?.emoji || '🍽️',
    diets: base?.diets || [],
    allergens: item.allergens ?? base?.allergens ?? [],
    ingredients: item.ingredients ?? base?.ingredients ?? [],
    mealCategories: base?.mealCategories || [],
    dietaryTags: base?.dietaryTags || [],
    portion: base?.portion || '1 serving',
    available: item.available,
    description: item.description,
  } as Meal & { description?: string };
}