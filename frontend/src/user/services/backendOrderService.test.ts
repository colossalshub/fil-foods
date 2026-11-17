import assert from 'node:assert/strict';
import test from 'node:test';
import { backendOrderErrorMessage, resolveBackendMealId } from './backendOrderService.js';

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
test('place_order error codes use the user-facing wording', () => {
  assert.equal(backendOrderErrorMessage({ message: 'one_meal_per_time' }), 'You can choose only one meal for that meal time.');
  assert.equal(backendOrderErrorMessage({ message: 'max_meals_per_day' }), 'You can choose a maximum of three meals per day.');
  assert.equal(backendOrderErrorMessage({ message: 'plan_unavailable' }), 'The selected plan is not available. Please choose another plan.');
  assert.match(backendOrderErrorMessage({ message: 'allergen_conflict:Shellfish' }), /contains Shellfish/);
  assert.equal(backendOrderErrorMessage({ message: 'Something else' }), 'Something else');
  assert.equal(backendOrderErrorMessage(null), 'Unable to place order.');
});
