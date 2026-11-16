import assert from 'node:assert/strict';
import test from 'node:test';
import { allMenuMeals, customizedMenuMeal, menuItemById } from './menuCatalog.js';
import {
  ORDER_MSG,
  calculateTotals,
  fuzzySearchMeals,
  validateOrderSelection,
} from '../services/orderService.js';

const mealFor = (id: string) => {
  const found = allMenuMeals().find(({ item }) => item.id === id);
  assert.ok(found, `menu item ${id} exists`);
  return found.meal;
};

test('USR-16: Breakfast offers only pastries and breads; Lunch/Dinner offer meat or vegetable choices', () => {
  const meals = allMenuMeals();
  const breakfast = meals.filter(({ item }) => item.slot === 'Breakfast');
  assert.ok(breakfast.length > 0);
  assert.ok(breakfast.every(({ meal }) => (meal.mealCategories || []).includes('Pastries and breads')));
  for (const slot of ['Lunch', 'Dinner']) {
    const names = meals.filter(({ item }) => item.slot === slot && item.section === 'Meat choices').map(({ item }) => item.name);
    assert.deepEqual([...names].sort(), ['Beef', 'Chicken', 'Fish', 'Pork']);
    assert.ok(meals.some(({ item }) => item.slot === slot && item.section === 'Vegetable choices'));
  }
  assert.ok(meals.every(({ meal }) => meal.price === 300), 'standard ₱300 per meal (USR-17)');
});

test('USR-18 / USR-20: one or two meals can be checked out; totals are ₱300 per meal', () => {
  const one = [{ meal: mealFor('menu-traditional-pandesal'), quantity: 1 }];
  assert.equal(validateOrderSelection(one).ok, true);
  assert.equal(calculateTotals(one, {}).total, 300);

  const two = [...one, { meal: mealFor('menu-lunch-chicken'), quantity: 1 }];
  assert.equal(validateOrderSelection(two).ok, true);
  assert.equal(calculateTotals(two, {}).total, 600);

  const dinnerOnly = [{ meal: mealFor('menu-dinner-pork'), quantity: 1 }];
  assert.equal(validateOrderSelection(dinnerOnly).ok, true, 'meal times need not be ordered in sequence');
});

test('USR-18: a second meal in the same meal time is refused', () => {
  const rows = [
    { meal: mealFor('menu-lunch-chicken'), quantity: 1 },
    { meal: mealFor('menu-lunch-beef'), quantity: 1 },
  ];
  assert.deepEqual(validateOrderSelection(rows), { ok: false, message: ORDER_MSG.oneMealPerTime });
});

test('USR-18 / USR-46: customized plates carry the chosen components\' allergens', () => {
  const base = menuItemById('menu-lunch-fish');
  assert.ok(base);
  const plate = customizedMenuMeal(base, { vegetableStyle: 'Pinakbet', meatProtein: 'Fish' });
  assert.ok(plate.allergens?.includes('Fish'));
  assert.ok(plate.allergens?.includes('Shellfish'), 'Pinakbet (bagoong) adds Shellfish');
  assert.ok(plate.ingredients?.includes('Bagoong'));
});

test('USR-28 / USR-37: meal search tolerates a typo across all meal times', () => {
  const meals = allMenuMeals().map(({ meal }) => meal);
  const results = fuzzySearchMeals(meals, 'pandesl');
  assert.ok(results.length > 0);
  assert.ok(results.every((meal) => /pandesal/i.test(meal.name)));
});
