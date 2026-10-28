const DEFAULT_SLOTS = ['Breakfast', 'Lunch', 'Dinner'];

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

/**
 * Finds one meal per requested slot while respecting hard calorie/fat ceilings.
 * The finite catalog makes exhaustive search more reliable than rounding a
 * continuous LP solution back to discrete meals.
 */
export function solveNutritionPlan(meals, target, slots = DEFAULT_SLOTS) {
  const eligible = meals.filter((meal) => meal.available !== false);
  const bySlot = slots.map((slot) => eligible
    .filter((meal) => !meal.category || meal.category === slot)
    .sort((a, b) => candidateScore(a, target) - candidateScore(b, target)));
  if (bySlot.some((choices) => choices.length === 0)) {
    return { ok: false, meals: [], totals: totals([]), reason: 'No meal is available for every requested slot.' };
  }

  let best = null;
  function visit(index, selected) {
    if (index === bySlot.length) {
      const summary = totals(selected);
      const calorieLimit = number(target.calories);
      const fatLimit = number(target.fat);
      if (calorieLimit > 0 && summary.calories > calorieLimit) return;
      if (fatLimit > 0 && summary.fat > fatLimit) return;
      const score = distance(summary.calories, target.calories)
        + distance(summary.protein, target.protein) * 4
        + distance(summary.fat, target.fat) * 2;
      if (!best || score < best.score) best = { selected: [...selected], summary, score };
      return;
    }
    for (const meal of bySlot[index]) visit(index + 1, [...selected, meal]);
  }
  visit(0, []);
  if (!best) return { ok: false, meals: [], totals: totals([]), reason: 'No plan satisfies the nutrient ceilings.' };
  return { ok: true, meals: best.selected, totals: best.summary, score: best.score };
}
