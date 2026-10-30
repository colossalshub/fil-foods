import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AppButton from './AppButton';
import AppInput from './AppInput';
import { MEALS } from '../data/meals';
import { ORDER_MSG, profileAllergensInMeal, hasDislikedIngredient, hasRestrictionConflict, isMealAvailable } from '../services/orderService';
import { NUTRITION_MSG, solveNutritionPlan } from '../services/nutritionService';
import { colors, font, radius, spacing } from '../theme/theme';

function eligibleMeals(profile) {
  return MEALS.filter((meal) => {
    if (!isMealAvailable(meal)) return false;
    if (!profile) return true;
    if (profileAllergensInMeal(meal, profile).length) return false;
    if (hasDislikedIngredient(meal, profile)) return false;
    if (hasRestrictionConflict(meal, profile)) return false;
    return true;
  });
}

export default function NutritionDayPanel({ profile, targets, onSaveTargets }) {
  const [calories, setCalories] = useState(String(targets?.calories || ''));
  const [protein, setProtein] = useState(String(targets?.protein || ''));
  const [fat, setFat] = useState(String(targets?.fat || ''));
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);

  const canSolve = Number(calories) > 0 || Number(protein) > 0 || Number(fat) > 0;

  const solve = () => {
    const target = {
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      fat: Number(fat) || 0,
    };
    onSaveTargets?.(target);
    const plan = solveNutritionPlan(eligibleMeals(profile), target);
    setResult(plan);
  };

  const totalsLine = useMemo(() => {
    if (!result?.meals?.length) return '';
    const t = result.totals;
    return `Totals: ${t.calories} kcal, ${t.protein} g protein, ${t.fat} g fat, ${t.carbs} g carbs.`;
  }, [result]);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={styles.head}
      >
        <Text style={styles.title}>Daily nutrition targets</Text>
        <Text style={styles.toggle}>{open ? 'Hide' : 'Show'}</Text>
      </Pressable>
      {open ? null : (
        <Text style={styles.hint}>Open this after you look through the meals.</Text>
      )}
      {open ? (
        <>
      <Text style={styles.body}>
        Optional. A suggested breakfast, lunch, and dinner stays inside your allergy and diet limits.
      </Text>
      <AppInput label="Calories" value={calories} onChangeText={setCalories} keyboardType="number-pad" accessibilityLabel="Daily calorie target" />
      <AppInput label="Protein (g)" value={protein} onChangeText={setProtein} keyboardType="number-pad" accessibilityLabel="Daily protein target in grams" />
      <AppInput label="Fat limit (g)" value={fat} onChangeText={setFat} keyboardType="number-pad" accessibilityLabel="Daily fat limit in grams" />
      <AppButton title="Suggest a day of meals" onPress={solve} disabled={!canSolve} />
      {result ? (
        <View style={styles.result}>
          <Text style={styles.body}>{result.reason || NUTRITION_MSG.noExact}</Text>
          {result.meals.map((meal) => (
            <Text key={meal.id} style={styles.meal}>
              {`${meal.category || 'Meal'}: ${meal.name}`}
            </Text>
          ))}
          {totalsLine ? <Text style={styles.body}>{totalsLine}</Text> : null}
          {!result.exactMatch ? (
            <Text style={styles.body}>This is not claimed as an exact match to every target.</Text>
          ) : null}
        </View>
      ) : null}
      <Text style={styles.disclaimer}>{ORDER_MSG.recommendationsDisclaimer}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  title: { fontSize: font.body, fontWeight: '700', color: colors.primary, flex: 1 },
  toggle: { fontSize: font.body, fontWeight: '700', color: colors.primary },
  hint: { fontSize: font.sm, color: colors.muted, marginTop: spacing.xs },
  body: { fontSize: font.body, lineHeight: 24, color: colors.text, marginBottom: spacing.sm },
  meal: { fontSize: font.body, lineHeight: 24, color: colors.text },
  result: { marginTop: spacing.md },
  disclaimer: { fontSize: font.body, lineHeight: 24, color: colors.muted, marginTop: spacing.sm },
});
