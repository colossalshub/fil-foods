import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBackendMealId } from './backendOrderService.js';

const catalog = [
  { id: 'uuid-lunch-beef', name: 'Beef', category: 'Lunch', client_meal_key: 'plate-lunch-beef' },
  { id: 'uuid-dinner-beef', name: 'Beef', category: 'Dinner', client_meal_key: 'plate-dinner-beef' },
  { id: 'uuid-bread', name: 'Monay', category: 'Breakfast', client_meal_key: 'menu-monay' },
  { id: 'uuid-tinola', name: 'Chicken Tinola', category: 'Lunch', client_meal_key: 'sample-tinola' },
];

test('resolveBackendMealId prefers client_meal_key', () => {
  assert.equal(
    resolveBackendMealId({ mealId: 'plate-dinner-beef', mealName: 'Beef', mealCategory: 'Lunch', quantity: 1 }, catalog),
    'uuid-dinner-beef',
  );
});

test('resolveBackendMealId disambiguates duplicate names by category', () => {
  assert.equal(
    resolveBackendMealId({ mealName: 'Beef', mealCategory: 'Lunch', quantity: 1 }, catalog),
    'uuid-lunch-beef',
  );
});

test('resolveBackendMealId falls back to unique name match', () => {
  assert.equal(
    resolveBackendMealId({ mealName: 'Monay', quantity: 1 }, catalog),
    'uuid-bread',
  );
});