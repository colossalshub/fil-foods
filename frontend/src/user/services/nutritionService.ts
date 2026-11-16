import type { Meal, NutritionTarget, NutritionTotals } from '../types';

const DEFAULT_SLOTS = ['Breakfast', 'Lunch', 'Dinner'];

export const NUTRITION_MSG = {
  noExact: 'No exact match is available. The closest eligible meals are shown with their totals.',
  closestWithin: 'No combination meets every target. The closest meals within the calorie and fat limits are shown with their totals.',
  incomplete: 'Nutrition data is incomplete for some meals, so this is not an exact target match.',
  exact: 'These meals stay within your calorie and fat limits and meet your protein target.',
  noSlots: 'No meal is available for every requested slot.',
  ceilings: 'No plan satisfies the nutrient ceilings.',
};

function number(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function distance(value: unknown, target: unknown) {
  return Math.abs(number(value) - number(target));
}

function candidateScore(meal: Meal, target: NutritionTarget) {
  const calorieWeight = number(target.calories) > 0 ? 1 : 0;
  const proteinWeight = number(target.protein) > 0 ? 1 : 0;
  const fatWeight = number(target.fat) > 0 ? 1 : 0;
  return calorieWeight * distance(meal.calories, target.calories)
    + proteinWeight * distance(meal.protein, target.protein) * 4
    + fatWeight * distance(meal.fat, target.fat) * 2;
}

function totals(meals: Meal[]): NutritionTotals {
  return meals.reduce((result, meal) => {
    result.calories += number(meal.calories);
    result.protein += number(meal.protein);
    result.fat += number(meal.fat);
    result.carbs += number(meal.carbs);
    return result;
  }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
}

function hasTrackedNutrition(meal: Meal, target: NutritionTarget) {
  if (number(target.calories) > 0 && !Number.isFinite(Number(meal.calories))) return false;
  if (number(target.protein) > 0 && !Number.isFinite(Number(meal.protein))) return false;
  if (number(target.fat) > 0 && !Number.isFinite(Number(meal.fat))) return false;
  return true;
}

function withinCeilings(summary: NutritionTotals, target: NutritionTarget) {
  const calorieLimit = number(target.calories);
  const fatLimit = number(target.fat);
  if (calorieLimit > 0 && summary.calories > calorieLimit) return false;
  if (fatLimit > 0 && summary.fat > fatLimit) return false;
  return true;
}

function meetsTargets(summary: NutritionTotals, target: NutritionTarget) {
  if (!withinCeilings(summary, target)) return false;
  const proteinTarget = number(target.protein);
  if (proteinTarget > 0 && summary.protein < proteinTarget) return false;
  return true;
}

function deviation(summary: NutritionTotals, target: NutritionTarget) {
  return distance(summary.calories, target.calories)
    + distance(summary.protein, target.protein) * 4
    + distance(summary.fat, target.fat) * 2;
}

/**
 * Algorithm 5: exhaustive search (enumeration) - the solver the app uses.
 *
 * One meal per slot. Calorie and fat ceilings are hard limits for an exact match.
 * Allergy and diet exclusions are applied by the caller before this search.
 * When no combination meets the targets, the closest eligible set is returned
 * and is never described as an exact match.
 *
 * How: try every combination (one breakfast x one lunch x one dinner ...),
 * score each by weighted deviation from the daily targets, and keep the best
 * one inside the calorie and fat ceilings.
 *
 * Complexity: O(n_1 * n_2 * ... * n_s) combinations for n_i meals in slot i,
 * i.e. O(k^s) for k meals per slot and s slots (each combination costs O(s) to
 * total). Fine for a menu of tens of meals and 3 slots; grows fast with more.
 * It always finds the best feasible plan, so it is never worse than greedy.
 */
export function solveNutritionPlan(meals: Meal[], target: NutritionTarget | null | undefined, slots: string[] = DEFAULT_SLOTS) {
  const safeTarget = target || {};
  const available = meals.filter((meal) => meal.available !== false);
  const eligible = available.filter((meal) => hasTrackedNutrition(meal, safeTarget));
  const droppedIncomplete = available.length - eligible.length;
  const bySlot = slots.map((slot) => eligible
    .filter((meal) => !meal.category || meal.category === slot)
    .sort((a, b) => candidateScore(a, safeTarget) - candidateScore(b, safeTarget)));
  if (bySlot.some((choices) => choices.length === 0)) {
    return {
      ok: false,
      exactMatch: false,
      meals: [],
      totals: totals([]),
      incomplete: droppedIncomplete > 0,
      reason: NUTRITION_MSG.noSlots,
    };
  }

  let bestWithin: { selected: Meal[]; summary: NutritionTotals; score: number } | null = null;
  let closest: { selected: Meal[]; summary: NutritionTotals; score: number } | null = null;
  function visit(index: number, selected: Meal[]) {
    if (index === bySlot.length) {
      const summary = totals(selected);
      const score = deviation(summary, safeTarget);
      const row = { selected: [...selected], summary, score };
      if (!closest || score < closest.score) closest = row;
      if (withinCeilings(summary, safeTarget) && (!bestWithin || score < bestWithin.score)) {
        bestWithin = row;
      }
      return;
    }
    for (const meal of bySlot[index]) visit(index + 1, [...selected, meal]);
  }
  visit(0, []);

  const chosen = (bestWithin || closest) as { selected: Meal[]; summary: NutritionTotals; score: number } | null;
  if (!chosen) {
    return {
      ok: false,
      exactMatch: false,
      meals: [],
      totals: totals([]),
      incomplete: droppedIncomplete > 0,
      reason: NUTRITION_MSG.ceilings,
    };
  }

  const exactMatch = !!bestWithin && meetsTargets(chosen.summary, safeTarget);
  let reason = NUTRITION_MSG.exact;
  if (!exactMatch) {
    reason = bestWithin ? NUTRITION_MSG.closestWithin : NUTRITION_MSG.noExact;
  }
  if (droppedIncomplete > 0) reason = `${reason} ${NUTRITION_MSG.incomplete}`;
  return {
    ok: !!bestWithin,
    exactMatch,
    meals: chosen.selected,
    totals: chosen.summary,
    score: chosen.score,
    incomplete: droppedIncomplete > 0,
    reason,
  };
}

/**
 * Algorithm 4: greedy equal-share selection - baseline for benchmarking only.
 *
 * Splits the daily targets equally across the slots (e.g. 1,800 kcal / 3 =
 * 600 kcal per meal), then for each slot independently picks the meal closest
 * to that share using the same weights as the solver (calories x1, protein x4,
 * fat x2). It never looks at the other slots, so it can miss a better
 * combination or break a ceiling that the exhaustive solver would respect.
 *
 * Complexity: O(n) for n meals in total (each meal is scored once for its slot),
 * i.e. O(s * k) for k meals per slot and s slots.
 *
 * Returns the same shape as solveNutritionPlan so the two can be compared.
 * The app does not call this; solveNutritionPlan is the one in use.
 */
export function greedyEqualShareSelection(
  meals: Meal[],
  target: NutritionTarget | null | undefined,
  slots: string[] = DEFAULT_SLOTS,
) {
  const safeTarget = target || {};
  const share = slots.length || 1;
  const perSlot: NutritionTarget = {
    calories: number(safeTarget.calories) / share,
    protein: number(safeTarget.protein) / share,
    fat: number(safeTarget.fat) / share,
  };
  const available = meals.filter((meal) => meal.available !== false);
  const eligible = available.filter((meal) => hasTrackedNutrition(meal, safeTarget));
  const droppedIncomplete = available.length - eligible.length;

  const selected: Meal[] = [];
  for (const slot of slots) {
    let best: Meal | null = null;
    let bestScore = Infinity;
    for (const meal of eligible) {
      if (meal.category && meal.category !== slot) continue;
      const score = candidateScore(meal, perSlot);
      if (score < bestScore) {
        best = meal;
        bestScore = score;
      }
    }
    if (!best) {
      return {
        ok: false,
        exactMatch: false,
        meals: [],
        totals: totals([]),
        incomplete: droppedIncomplete > 0,
        reason: NUTRITION_MSG.noSlots,
      };
    }
    selected.push(best);
  }

  const summary = totals(selected);
  const ok = withinCeilings(summary, safeTarget);
  const exactMatch = ok && meetsTargets(summary, safeTarget);
  let reason = NUTRITION_MSG.exact;
  if (!exactMatch) reason = ok ? NUTRITION_MSG.closestWithin : NUTRITION_MSG.noExact;
  if (droppedIncomplete > 0) reason = `${reason} ${NUTRITION_MSG.incomplete}`;
  return {
    ok,
    exactMatch,
    meals: selected,
    totals: summary,
    score: deviation(summary, safeTarget),
    incomplete: droppedIncomplete > 0,
    reason,
  };
}
