import assert from 'node:assert/strict';
import test from 'node:test';
import { DAILY_FOOD_ITEM_LIMIT, allMenuMeals, customizedMenuMeal, dailyFoodItems, menuItemById, resolveMenuMeal } from './menuCatalog.js';
import { exceedsSodiumLimit } from '../domain/sodium.js';
import { addCartLine } from '../context/cartRules.js';
import {
  ORDER_MSG,
  calculateTotals,
  checkoutTotal,
  fuzzySearchMeals,
  validateOrderSelection,
} from '../services/orderService.js';

const mealFor = (id: string) => {
  const found = allMenuMeals().find(({ item }) => item.id === id);
  assert.ok(found, `menu item ${id} exists`);
  return found.meal;
};

test('USR-16: five foods a day; lunch and dinner share the meat and vegetable choices', () => {
  const daily = dailyFoodItems();
  assert.equal(daily.length, DAILY_FOOD_ITEM_LIMIT);
  assert.ok(daily.some((item) => item.slot === 'Breakfast' && item.section === 'Pastries and breads'));
  assert.ok(daily.some((item) => item.section === 'Meat choices'));
  assert.ok(daily.some((item) => item.section === 'Vegetable choices'));

  const offered = allMenuMeals();
  const names = (slot: string) => offered
    .filter(({ item }) => item.slot === slot)
    .map(({ item }) => item.name)
    .sort();
  assert.deepEqual(names('Lunch'), names('Dinner'));
  for (const meat of ['Beef', 'Pork', 'Chicken']) {
    assert.ok(names('Lunch').includes(meat), `${meat} is a lunch and dinner choice`);
  }
  assert.ok(names('Lunch').includes('Steamed'), 'lunch and dinner include a vegetable choice');
  assert.ok(offered.every(({ meal }) => meal.price === 300), 'standard ₱300 per meal (USR-17)');
});

test('USR-13: sodium is the sum of ingredient values and is compared with the recipient limit', () => {
  const chicken = menuItemById('menu-lunch-chicken');
  assert.ok(chicken);
  const meal = resolveMenuMeal(chicken);
  assert.equal(meal.sodium, 70 + 2 + 1 + 15);
  assert.equal(exceedsSodiumLimit(meal, 400), false);
  const pinakbet = menuItemById('menu-lunch-pinakbet');
  assert.ok(pinakbet);
  const vegetable = resolveMenuMeal(pinakbet);
  assert.ok((vegetable.sodium || 0) > 400);
  assert.equal(exceedsSodiumLimit(vegetable, 400), true);
  assert.equal(exceedsSodiumLimit(vegetable, 0), false);
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

test('USR-20 A: checkout defaults to Standard meal; choosing a plan uses the plan price', () => {
  const rows = [
    { meal: mealFor('menu-traditional-pandesal'), quantity: 1 },
    { meal: mealFor('menu-lunch-chicken'), quantity: 1 },
  ];
  const standard = checkoutTotal(rows, 'standard', {});
  assert.equal(standard.total, 600);
  assert.equal(standard.planId, 'standard');
  assert.equal(checkoutTotal(rows, undefined, {}).total, 600, 'no plan means Standard meal');
  assert.equal(checkoutTotal(rows, 'weekly', {}).total, 4999);
  assert.equal(checkoutTotal(rows, 'monthly', {}).total, 27899);
  assert.equal(checkoutTotal(rows, 'yearly', {}).total, 327999);
});

test('USR-18: a refused meal returns its message in the same call', () => {
  const first = addCartLine([], mealFor('menu-lunch-chicken'), 1, undefined, { daySlot: 'Lunch' });
  assert.equal(first.error, '');
  const second = addCartLine(first.items, mealFor('menu-lunch-beef'), 1);
  assert.equal(second.error, ORDER_MSG.oneMealPerTime);
  assert.equal(second.items, first.items, 'cart is unchanged');
  const replaced = addCartLine(first.items, mealFor('menu-lunch-beef'), 1, undefined, { daySlot: 'Lunch' });
  assert.equal(replaced.error, '', 'choosing again for the same meal time replaces the choice');
});

test('live menu rows update availability, price and allergens (ADM-17/18 → USR-16)', async () => {
  const { applyRemoteMenu, MENU_CATALOG } = await import('./menuCatalog.js');
  const snapshot = MENU_CATALOG.map((item) => ({ ...item }));
  try {
    const rows = MENU_CATALOG.map((item) => ({
      client_meal_key: item.mealId || item.id,
      price: item.price ?? 300,
      is_available: true,
      ingredients: item.ingredients ?? [],
      allergens: item.allergens ?? [],
    }));
    const target = rows[0];
    target.is_available = false;
    target.price = 320;
    target.allergens = [...target.allergens, 'Sesame'];
    rows.splice(1, 1);
    assert.ok(applyRemoteMenu(rows) >= 2);
    assert.equal(MENU_CATALOG[0].available, false);
    assert.equal(MENU_CATALOG[0].price, 320);
    assert.ok(MENU_CATALOG[0].allergens?.includes('Sesame'));
    assert.equal(MENU_CATALOG[1].available, false, 'a deleted meal row is no longer offered');
    assert.equal(applyRemoteMenu([]), 0, 'an empty response keeps the bundled menu');
  } finally {
    snapshot.forEach((item, index) => Object.assign(MENU_CATALOG[index], item));
  }
});
