import assert from 'node:assert/strict';
import test from 'node:test';
import type { Meal } from '../types';
import { greedyEqualShareSelection, solveNutritionPlan } from './nutritionService.js';

function meal(id: string, category: string, calories: number, protein: number, fat: number): Meal {
  return { id, name: id, category, calories, protein, fat, carbs: 0, price: 100 } as Meal;
}

// Greedy picks each slot's meal closest to 600 kcal / 30 g protein / 20 g fat
// on its own. Together those picks go over the 1,800 kcal ceiling; the
// exhaustive solver finds a combination that stays under it.
const FIXTURE: Meal[] = [
  meal('b-share', 'Breakfast', 610, 30, 21),
  meal('b-light', 'Breakfast', 420, 28, 12),
  meal('l-share', 'Lunch', 615, 31, 21),
  meal('l-light', 'Lunch', 520, 34, 16),
  meal('d-share', 'Dinner', 620, 30, 22),
  meal('d-light', 'Dinner', 560, 40, 18),
];
const TARGET = { calories: 1800, protein: 90, fat: 60 };

test('greedy equal-share picks the meal closest to an equal share in each slot', () => {
  const result = greedyEqualShareSelection(FIXTURE, TARGET);
  assert.deepEqual(result.meals.map((m) => m.id), ['b-share', 'l-share', 'd-share']);
  assert.equal(result.totals.calories, 1845);
  assert.equal(result.ok, false, 'greedy breaks the calorie ceiling');
  assert.equal(result.exactMatch, false);
});

test('greedy reports a missing slot like the solver', () => {
  const result = greedyEqualShareSelection(FIXTURE.filter((m) => m.category !== 'Dinner'), TARGET);
  assert.equal(result.ok, false);
  assert.deepEqual(result.meals, []);
});

test('exhaustive solver is never worse than greedy on the fixture', () => {
  const greedy = greedyEqualShareSelection(FIXTURE, TARGET);
  const exhaustive = solveNutritionPlan(FIXTURE, TARGET);
  assert.equal(exhaustive.ok, true);
  assert.ok(exhaustive.totals.calories <= TARGET.calories);
  assert.ok(exhaustive.totals.fat <= TARGET.fat);
  // Feasibility first: greedy is infeasible here, exhaustive is feasible.
  assert.ok(Number(exhaustive.ok) >= Number(greedy.ok));
});

test('exhaustive score is never above greedy when greedy is feasible', () => {
  const targets = [
    { calories: 2000, protein: 80, fat: 70 },
    { calories: 1800, protein: 90, fat: 60 },
    { calories: 1600, protein: 100, fat: 55 },
    { calories: 2200, protein: 60, fat: 80 },
  ];
  let compared = 0;
  for (const target of targets) {
    const greedy = greedyEqualShareSelection(FIXTURE, target);
    const exhaustive = solveNutritionPlan(FIXTURE, target);
    if (greedy.ok) {
      assert.equal(exhaustive.ok, true);
      assert.ok(Number(exhaustive.score) <= Number(greedy.score), JSON.stringify(target));
      compared += 1;
    }
  }
  assert.ok(compared > 0, 'at least one target where greedy is feasible');
});
