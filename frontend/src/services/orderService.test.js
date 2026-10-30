import assert from 'node:assert/strict';
import test from 'node:test';
import { getDb, resetStore } from '../data/mockStore.js';
import { MEALS } from '../data/meals.js';
import { ROLES } from './securityService.js';
import {
  ORDER_MSG,
  __testResetConfirmState,
  applyMealFilters,
  calculateTotals,
  confirmOrder,
  formatPhp,
  fuzzySearchMeals,
  getKitchenOrderView,
  getRecommendedMeals,
  parseQuantityInput,
  profileAllergensInMeal,
  validateSchedule,
} from './orderService.js';
import { NUTRITION_MSG, solveNutritionPlan } from './nutritionService.js';

const SAMPLE_NOW = new Date('2026-10-12T09:00:00');

test('formatPhp uses the specification currency format', () => {
  assert.equal(formatPhp(240), 'PHP 240.00');
  assert.equal(formatPhp(Number.NaN), 'PHP 0.00');
});

test('fuzzy search ranks Chicken Tinola for common typos and partial names', () => {
  const tinola = MEALS.find((m) => m.name === 'Chicken Tinola');
  assert.ok(tinola);

  for (const query of ['Chiken Tinola', 'tinula', 'CHICKEN']) {
    const results = fuzzySearchMeals(MEALS, query);
    assert.ok(results.length > 0, query);
    assert.equal(results[0].name, 'Chicken Tinola', query);
  }

  for (const query of ['Pizzaa', 'xyz123']) {
    const results = fuzzySearchMeals(MEALS, query);
    assert.equal(results.length, 0, query);
  }
});

test('search finds catalog text and filters soup, low-sodium, and peanut-free meals', () => {
  assert.equal(ORDER_MSG.noMeals, 'No meals found.');
  const papaya = fuzzySearchMeals(MEALS, 'Papaya');
  assert.equal(papaya[0].name, 'Chicken Tinola');

  const soup = applyMealFilters(MEALS, { category: 'Soup', diets: ['Low-sodium'], excludeAllergens: ['Peanuts'] });
  assert.ok(soup.some((meal) => meal.name === 'Chicken Tinola'));
  assert.equal(soup.some((meal) => meal.name === 'Chicken Satay'), false);

  const sauceOnly = {
    id: 'sauce',
    name: 'Peanut Bowl',
    allergens: [],
    ingredients: ['Peanut sauce'],
    category: 'Lunch',
    diets: [],
    dietaryTags: [],
    mealCategories: [],
  };
  const hidden = applyMealFilters([sauceOnly], { excludeAllergens: ['Peanuts'] });
  assert.equal(hidden.length, 0);
});

test('recommendations explain the match in plain language', () => {
  const profile = {
    mealPreferences: { preferredCategories: ['Soup'], dislikedIngredients: ['Ampalaya'] },
    dietaryRestrictions: ['Low-sodium'],
    allergies: [{ name: 'Peanuts' }],
  };
  const result = getRecommendedMeals(MEALS, profile, 5);
  const tinola = result.items.find((row) => row.meal.name === 'Chicken Tinola');
  assert.equal(tinola.reason, 'Matches your preference for soup');
  assert.equal(result.items.some((row) => row.meal.name === 'Chicken Satay'), false);
  assert.equal(result.items.some((row) => row.meal.name === 'Ampalaya Stir-fry'), false);
});

test('nutrition solver keeps an exact day and reports the closest set when targets cannot be met', () => {
  const exact = solveNutritionPlan([
    { id: 'breakfast', category: 'Breakfast', calories: 400, protein: 25, fat: 10 },
    { id: 'lunch', category: 'Lunch', calories: 600, protein: 40, fat: 15 },
    { id: 'dinner', category: 'Dinner', calories: 700, protein: 55, fat: 20 },
  ], { calories: 1800, protein: 120, fat: 50 });
  assert.equal(exact.ok, true);
  assert.equal(exact.exactMatch, true);

  const closest = solveNutritionPlan([
    { id: 'breakfast', category: 'Breakfast', calories: 900, protein: 20, fat: 40 },
    { id: 'lunch', category: 'Lunch', calories: 900, protein: 20, fat: 40 },
    { id: 'dinner', category: 'Dinner', calories: 900, protein: 20, fat: 40 },
  ], { calories: 1800, protein: 120, fat: 50 });
  assert.equal(closest.ok, false);
  assert.equal(closest.exactMatch, false);
  assert.equal(closest.meals.length, 3);
  assert.match(closest.reason, /No exact match/);
  assert.equal(NUTRITION_MSG.noExact.includes('No exact match'), true);
});

test('kitchen staff can read health details on an order and a client cannot', () => {
  resetStore();
  __testResetConfirmState();
  const meal = MEALS.find((m) => m.name === 'Chicken Tinola');
  const placed = confirmOrder('user-maria', {
    items: [{ meal, quantity: 1 }],
    fulfillment: { type: 'pickup', scheduledAt: new Date('2026-10-13T10:00:00'), instructions: '' },
    now: SAMPLE_NOW,
  });
  assert.equal(placed.ok, true);
  assert.throws(
    () => getKitchenOrderView({ id: 'user-maria', roleMask: ROLES.CLIENT }, placed.order.id),
    { code: 'FORBIDDEN' },
  );
  const staffView = getKitchenOrderView({ id: 'staff-1', roleMask: ROLES.STAFF }, placed.order.id);
  assert.ok(staffView.healthConditions.includes('Hypertension'));
  assert.equal(staffView.allergies[0].name, 'Peanuts');
});

test('profileAllergensInMeal detects peanut sauce without allergen tag', () => {
  const meal = {
    id: 'test-satay',
    name: 'Chicken Satay',
    allergens: [],
    ingredients: ['Chicken', 'Peanut sauce'],
  };
  const hits = profileAllergensInMeal(meal, { allergies: [{ name: 'Peanuts' }] });
  assert.deepEqual(hits, ['Peanuts']);
});

test('parseQuantityInput rejects zero, negative, decimal, and non-numeric values', () => {
  assert.equal(parseQuantityInput(0).ok, false);
  assert.equal(parseQuantityInput(-1).ok, false);
  assert.equal(parseQuantityInput('1.5').ok, false);
  assert.equal(parseQuantityInput('abc').ok, false);
  assert.equal(parseQuantityInput('2').ok, true);
  assert.equal(parseQuantityInput('2').value, 2);
  assert.equal(parseQuantityInput(0).message, ORDER_MSG.quantityInvalid);
});

test('validateSchedule enforces lead time and kitchen hours', () => {
  const sameDay = validateSchedule(new Date('2026-10-12T12:00:00'), SAMPLE_NOW);
  assert.equal(sameDay.ok, false);
  assert.equal(sameDay.message, ORDER_MSG.scheduleLead);

  const nextDay = validateSchedule(new Date('2026-10-13T09:00:00'), SAMPLE_NOW);
  assert.equal(nextDay.ok, true);

  const early = validateSchedule(new Date('2026-10-13T06:00:00'), SAMPLE_NOW);
  assert.equal(early.ok, false);
  assert.equal(early.message, ORDER_MSG.kitchenClosed);

  const late = validateSchedule(new Date('2026-10-13T19:00:00'), SAMPLE_NOW);
  assert.equal(late.ok, false);
  assert.equal(late.message, ORDER_MSG.kitchenClosed);

  const sunday = validateSchedule(new Date('2026-10-18T10:00:00'), SAMPLE_NOW);
  assert.equal(sunday.ok, false);
  assert.equal(sunday.message, ORDER_MSG.kitchenClosed);
});

test('calculateTotals applies active plan discount rate', () => {
  const meal = MEALS.find((m) => m.name === 'Chicken Tinola');
  const lines = [{ meal, quantity: 2 }];
  const plain = calculateTotals(lines, {});
  assert.equal(plain.subtotal, 240);
  assert.equal(plain.discountAmount, 0);
  assert.equal(plain.total, 240);

  const discounted = calculateTotals(lines, { plan: { status: 'active', discountRate: 0.1 } });
  assert.equal(discounted.discountRate, 0.1);
  assert.equal(discounted.discountAmount, 24);
  assert.equal(discounted.total, 216);
});

test('confirmOrder is idempotent for the same cart and fulfillment', () => {
  resetStore();
  __testResetConfirmState();
  const meal = MEALS.find((m) => m.name === 'Chicken Tinola');
  const payload = {
    items: [{ meal, quantity: 1 }],
    fulfillment: {
      type: 'pickup',
      scheduledAt: new Date('2026-10-13T10:00:00'),
      instructions: '',
    },
    now: SAMPLE_NOW,
    allergenAcknowledged: false,
  };

  const first = confirmOrder('user-maria', payload);
  assert.equal(first.ok, true);
  assert.match(first.order.trackingNumber, /^TRK-2026-\d{4}$/);
  assert.equal(first.order.status, 'Confirmed');
  assert.equal(first.message, ORDER_MSG.orderSuccess);

  const countAfter = getDb().orders.length;
  const second = confirmOrder('user-maria', payload);
  assert.equal(second.ok, true);
  assert.equal(second.order.trackingNumber, first.order.trackingNumber);
  assert.equal(getDb().orders.length, countAfter);
});
