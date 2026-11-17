import assert from 'node:assert/strict';
import test from 'node:test';
import { allergyCounts, preferredLevels } from './dietitian.js';
import type { DietaryInfo } from '../types.js';

const dietary = (allergies: string[], lowerSugar: boolean, supplied = true): DietaryInfo => ({
  allergies: allergies.map((value) => ({ value })),
  conditions: [],
  restrictions: [],
  nutrition: { supplied, lowerSugar, lowerCalories: false, lowerSodium: false, higherProtein: false },
});

test('DIT-11 allergy chips count customers, grouping the rest as Other', () => {
  const counts = allergyCounts([
    { allergies: [], dietary: dietary(['Peanuts', 'Shrimp'], true) },
    { allergies: [], dietary: dietary(['Peanut', 'Dairy'], false) },
    { allergies: ['Egg'], dietary: null },
  ]);
  assert.equal(counts.Peanuts, 2);
  assert.equal(counts.Dairy, 1);
  assert.equal(counts.Eggs, 1);
  assert.equal(counts.Other, 1);
});

test('DIT-12 preferred levels report how many customers chose each range', () => {
  const levels = preferredLevels([
    { dietary: dietary([], true) },
    { dietary: dietary([], false) },
    { dietary: dietary([], false, false) },
  ]);
  const sugar = levels.find((tile) => tile.key === 'sugar')!;
  assert.deepEqual([sugar.level, sugar.range, sugar.count, sugar.total], ['Low', '≤ 5g', 1, 2]);
  assert.equal(levels.find((tile) => tile.key === 'protein')!.level, 'No preference');
  assert.equal(preferredLevels([])[0].level, 'Not supplied');
});
