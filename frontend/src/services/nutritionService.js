const DEFAULT_SLOTS = ['Breakfast', 'Lunch', 'Dinner'];

export const NUTRITION_MSG = {
  noExact: 'No exact match is available. The closest eligible meals are shown with their totals.',
  closestWithin: 'No combination meets every target. The closest meals within the calorie and fat limits are shown with their totals.',
  incomplete: 'Nutrition data is incomplete for some meals, so this is not an exact target match.',
  exact: 'These meals stay within your calorie and fat limits and meet your protein target.',
  noSlots: 'No meal is available for every requested slot.',
  ceilings: 'No plan satisfies the nutrient ceilings.',
};

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function distance(value, target) {
  return Math.abs(number(value) - number(target));
}

function candidateScore(meal, target) {
  const calorieWeight = number(target.calories) > 0 ? 1 : 0;
  const proteinWeight = number(target.protein) > 0 ? 1 : 0;
  const fatWeight = number(target.fat) > 0 ? 1 : 0;
  return calorieWeight * distance(meal.calories, target.calories)
    + proteinWeight * distance(meal.protein, target.protein) * 4
    + fatWeight * distance(meal.fat, target.fat) * 2;
}

function totals(meals) {
  return meals.reduce((result, meal) => {
    result.calories += number(meal.calories);
    result.protein += number(meal.protein);
    result.fat += number(meal.fat);
    result.carbs += number(meal.carbs);
    return result;
  }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
}

function hasTrackedNutrition(meal, target) {
  if (number(target.calories) > 0 && !Number.isFinite(Number(meal.calories))) return false;
  if (number(target.protein) > 0 && !Number.isFinite(Number(meal.protein))) return false;
  if (number(target.fat) > 0 && !Number.isFinite(Number(meal.fat))) return false;
  return true;
}

function withinCeilings(summary, target) {
  const calorieLimit = number(target.calories);
  const fatLimit = number(target.fat);
  if (calorieLimit > 0 && summary.calories > calorieLimit) return false;
  if (fatLimit > 0 && summary.fat > fatLimit) return false;
  return true;
}

function meetsTargets(summary, target) {
  if (!withinCeilings(summary, target)) return false;
  const proteinTarget = number(target.protein);
  if (proteinTarget > 0 && summary.protein < proteinTarget) return false;
  return true;
}

function deviation(summary, target) {
  return distance(summary.calories, target.calories)
    + distance(summary.protein, target.protein) * 4
    + distance(summary.fat, target.fat) * 2;
}

/**
 * One meal per slot. Calorie and fat ceilings are hard limits for an exact match.
 * Allergy and diet exclusions are applied by the caller before this search.
 * When no combination meets the targets, the closest eligible set is returned
 * and is never described as an exact match.
 */
export function solveNutritionPlan(meals, target, slots = DEFAULT_SLOTS) {
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

  let bestWithin = null;
  let closest = null;
  function visit(index, selected) {
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

  const chosen = bestWithin || closest;
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
