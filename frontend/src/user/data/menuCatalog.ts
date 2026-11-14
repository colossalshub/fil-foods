import type { Meal } from '../types';
import { STANDARD_MEAL_PRICE } from '../services/orderService.js';

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
  {
    id: 'menu-lunch-beef',
    name: 'Beef',
    subtitle: 'Lean beef cuts',
    available: true,
    initials: 'BF',
    mealId: 'plate-lunch-beef',
    category: 'Lunch',
    price: STANDARD_MEAL_PRICE,
    calories: 450,
    protein: 32,
    description: 'Beef lunch plate with Filipino cooking style and vegetable side.',
    ingredients: ['Beef', 'Garlic', 'Onion', 'Vegetables'],
  },
  {
    id: 'menu-lunch-pork',
    name: 'Pork',
    subtitle: 'Lean pork cuts',
    available: true,
    initials: 'PK',
    mealId: 'plate-lunch-pork',
    category: 'Lunch',
    price: STANDARD_MEAL_PRICE,
    calories: 420,
    protein: 30,
    description: 'Pork lunch plate with Filipino cooking style and vegetable side.',
    ingredients: ['Pork', 'Garlic', 'Onion', 'Vegetables'],
  },
  {
    id: 'menu-lunch-chicken',
    name: 'Chicken',
    subtitle: 'Skinless chicken portions',
    available: true,
    initials: 'CH',
    mealId: 'plate-lunch-chicken',
    category: 'Lunch',
    price: STANDARD_MEAL_PRICE,
    calories: 320,
    protein: 28,
    description: 'Chicken lunch plate with Filipino cooking style and vegetable side.',
    ingredients: ['Chicken', 'Garlic', 'Ginger', 'Vegetables'],
  },
  {
    id: 'menu-lunch-fish',
    name: 'Fish',
    subtitle: 'Bangus or tilapia',
    available: true,
    initials: 'FS',
    mealId: 'plate-lunch-fish',
    category: 'Lunch',
    price: STANDARD_MEAL_PRICE,
    calories: 390,
    protein: 28,
    description: 'Fish lunch plate with Filipino cooking style and vegetable side.',
    ingredients: ['Fish', 'Tomato', 'Vegetables'],
  },
]);

const LUNCH_VEG = choiceItems('Lunch', 'Vegetable choices', [
  {
    id: 'menu-lunch-steamed',
    name: 'Steamed',
    subtitle: 'Steamed mixed vegetables',
    available: true,
    initials: 'ST',
    mealId: 'plate-lunch-veg-steamed',
    category: 'Lunch',
    price: STANDARD_MEAL_PRICE,
    calories: 220,
    protein: 8,
    description: 'Steamed vegetable plate with optional protein.',
    ingredients: ['Mixed vegetables', 'Garlic'],
  },
  {
    id: 'menu-lunch-stir-fried',
    name: 'Stir-fried',
    subtitle: 'Stir-fried mixed vegetables',
    available: true,
    initials: 'SF',
    mealId: 'plate-lunch-veg-stir-fried',
    category: 'Lunch',
    price: STANDARD_MEAL_PRICE,
    calories: 260,
    protein: 10,
    description: 'Stir-fried vegetable plate with optional protein.',
    ingredients: ['Mixed vegetables', 'Garlic', 'Onion'],
  },
  {
    id: 'menu-lunch-pinakbet',
    name: 'Pinakbet',
    subtitle: 'Mixed vegetables with bagoong',
    available: true,
    initials: 'PB',
    mealId: 'plate-lunch-veg-pinakbet',
    category: 'Lunch',
    price: STANDARD_MEAL_PRICE,
    calories: 285,
    protein: 12,
    description: 'Pinakbet vegetable plate with optional protein.',
    ingredients: ['Sitaw', 'Eggplant', 'Okra', 'Ampalaya', 'Bagoong'],
    allergens: ['Shellfish'],
  },
]);

function mirrorDinnerChoices(items: MenuCatalogItem[]): MenuCatalogItem[] {
  return items.map((item) => ({
    ...item,
    id: item.id.replace('lunch', 'dinner'),
    slot: 'Dinner',
    category: 'Dinner',
    mealId: item.mealId?.replace('plate-lunch', 'plate-dinner'),
  }));
}

const DINNER_MEAT = mirrorDinnerChoices(LUNCH_MEAT);
const DINNER_VEG = mirrorDinnerChoices(LUNCH_VEG);

export const MENU_CATALOG: MenuCatalogItem[] = [
  ...BREADS,
  ...LUNCH_MEAT,
  ...LUNCH_VEG,
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

export function resolveMenuMeal(item: MenuCatalogItem): Meal {
  return {
    id: item.mealId || item.id,
    name: item.name,
    category: item.category || item.slot,
    cuisine: 'Filipino',
    calories: item.calories ?? 300,
    protein: item.protein ?? 10,
    sodium: 450,
    price: item.price ?? STANDARD_MEAL_PRICE,
    emoji: '🍽️',
    diets: [],
    allergens: item.allergens ?? [],
    ingredients: item.ingredients ?? [],
    mealCategories: [],
    dietaryTags: [],
    portion: '1 serving',
    available: item.available,
    description: item.description,
  } as Meal & { description?: string };
}