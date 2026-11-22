import assert from 'node:assert/strict';
import test from 'node:test';
import { destinationFor, shortestPath } from './routeGraph.js';
import { sodiumCheck } from '../../admin/domain/deliveryCheck.js';

test('Juan’s shortest path is Hub → West → Juan, 2.5 km', () => {
  assert.equal(destinationFor('Juan'), 'Juan');
  const route = shortestPath('Hub', 'Juan');
  assert.deepEqual(route?.path, ['Hub', 'West', 'Juan']);
  assert.equal(route?.km, 2.5);
});

test('Ana’s address uses South, and the direct Hub–Juan edge is not shorter', () => {
  assert.equal(destinationFor('Ana'), 'South');
  const route = shortestPath('Hub', 'South');
  assert.deepEqual(route?.path, ['Hub', 'West', 'Juan', 'South']);
  assert.equal(route?.km, 3.7);
});

test('sodium check flags a meal over the recipient limit', () => {
  const within = sodiumCheck('Pork Pinoy Steak', {
    allergies: [],
    conditions: [],
    restrictions: [],
    nutrition: { supplied: true, lowerCalories: false, higherProtein: false, lowerSodium: true, lowerSugar: false },
  });
  assert.equal(within?.mg, 83);
  assert.equal(within?.limit, 400);
  assert.equal(within?.above, false);

  const over = sodiumCheck('Pinakbet', {
    allergies: [],
    conditions: [],
    restrictions: [],
    nutrition: { supplied: true, lowerCalories: false, higherProtein: false, lowerSodium: true, lowerSugar: false },
  });
  assert.equal(over?.above, true);
});
