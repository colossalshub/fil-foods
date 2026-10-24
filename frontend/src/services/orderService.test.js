import assert from 'node:assert/strict';
import test from 'node:test';
import { getDb, resetStore } from '../data/mockStore.js';
import { MEALS } from '../data/meals.js';
import {
  ORDER_MSG,
  __testResetConfirmState,
  calculateTotals,
  confirmOrder,
  fuzzySearchMeals,
  parseQuantityInput,
  profileAllergensInMeal,
  validateSchedule,
} from './orderService.js';

const SAMPLE_NOW = new Date('2026-10-12T09:00:00');

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
