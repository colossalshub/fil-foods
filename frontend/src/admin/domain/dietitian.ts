import { nutritionTiles } from './roleAccess.js';
import type { Customer } from '../types.js';

export const ALLERGY_CHIPS = ['Peanuts', 'Shellfish', 'Dairy', 'Eggs', 'Gluten'] as const;

/** Allergy counts across customers; anything outside the five chips counts as Other. */
export function allergyCounts(customers: Pick<Customer, 'allergies' | 'dietary'>[]) {
  const counts: Record<string, number> = { Peanuts: 0, Shellfish: 0, Dairy: 0, Eggs: 0, Gluten: 0, Other: 0 };
  for (const customer of customers) {
    const values = customer.dietary?.allergies.map((item) => item.value) ?? customer.allergies;
    const seen = new Set<string>();
    for (const value of values) {
      const lower = value.toLowerCase();
      const chip = ALLERGY_CHIPS.find((name) => lower.startsWith(name.toLowerCase().replace(/s$/, ''))) ?? 'Other';
      if (!seen.has(chip)) counts[chip] += 1;
      seen.add(chip);
    }
  }
  return counts;
}

/** For each nutrient, the level most customers asked for (DIT-12), with how many chose it. */
export function preferredLevels(customers: Pick<Customer, 'dietary'>[]) {
  const supplied = customers.filter((customer) => customer.dietary?.nutrition.supplied);
  const keys = ['sugar', 'calories', 'sodium', 'protein'] as const;
  return keys.map((key) => {
    const tiles = supplied.map((customer) => nutritionTiles(customer.dietary).find((tile) => tile.key === key)!);
    const chosen = tiles.filter((tile) => tile.range);
    const sample = chosen[0] ?? nutritionTiles(null).find((tile) => tile.key === key)!;
    return {
      key,
      label: sample.label,
      level: chosen.length ? sample.level : supplied.length ? 'No preference' : 'Not supplied',
      range: chosen.length ? sample.range : '',
      count: chosen.length,
      total: supplied.length,
    };
  });
}

