import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BackHeader from '../components/BackHeader';
import AppPageShell from '../components/AppPageShell';
import { DAY_SLOTS, todayMealById, nextSlot, type DaySlot } from '../data/todayMenu';
import { MENU_CATALOG, resolveMenuMeal } from '../data/menuCatalog';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMealProfile } from '../hooks/useMealProfile';
import { recipientDisplayName } from '../domain/audience';
import {
  COOKING_STYLES,
  MEAT_PROTEINS,
  ORDER_MSG,
  VEGETABLE_STYLES,
  profileAllergensInMeal,
} from '../services/orderService';
import { colors, font, radius, spacing, fonts } from '../theme/theme';

const DIETITIAN_NOTES: Record<string, string> = {
  Steamed: 'Steamed vegetables keep sodium lower and preserve texture.',
  'Stir-fried': 'Stir-fried vegetables add flavor—balance with lean protein.',
  Pinakbet: 'Pinakbet is a fiber-rich, vegetable-forward choice.',
  Adobo: 'Adobo packs more flavor—watch sodium if that is on your plan.',
  Tinola: 'Tinola is a lighter, balanced choice.',
  Sinigang: 'Sinigang is a lighter, balanced choice.',
  Kaldereta: 'Kaldereta is hearty—confirm tomato and sodium fit your plan.',
  'Pinoy Steak': 'Pinoy steak adds protein—pair with steamed vegetables when possible.',
};

function ChoiceRow({ title, options, value, onChange }: {
  title: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.choiceSection}>
      <Text style={styles.choiceTitle}>{title}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const active = value === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(option)}
              style={[styles.choicePill, active && styles.choicePillOn]}
            >
              <Text style={[styles.choiceText, active && styles.choiceTextOn]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function BuildMealCustomizeScreen({ route, navigation }: {
  route: { params?: { todayMealId?: string; slot?: DaySlot } };
  navigation: { goBack: () => void; navigate: (name: string, params?: object) => void };
}) {
  const todayMeal = todayMealById(route.params?.todayMealId || '');
  const slot = route.params?.slot || todayMeal?.slot || 'Lunch';
  const { user } = useAuth();
  const { profile } = useMealProfile(user);
  const { addItem, items } = useCart();
  const [vegetableStyle, setVegetableStyle] = useState(
    () => todayMeal?.defaultVegetableStyle || VEGETABLE_STYLES[0],
  );
  const [meatProtein, setMeatProtein] = useState(
    () => todayMeal?.defaultMeatProtein || MEAT_PROTEINS[2],
  );
  const [cookingStyle, setCookingStyle] = useState(COOKING_STYLES[2]);

  const catalogMeal = useMemo(() => {
    if (!todayMeal) return undefined;
    const catalogItem = MENU_CATALOG.find((item) => item.id === todayMeal.id);
    return catalogItem ? resolveMenuMeal(catalogItem) : undefined;
  }, [todayMeal]);

  if (!todayMeal || !catalogMeal) {
    return (
      <AppPageShell edges={['top', 'bottom']}>
        <View style={styles.missing}>
          <Text style={styles.missingText}>Meal not found.</Text>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={styles.backLink}>Go back</Text>
          </Pressable>
        </View>
      </AppPageShell>
    );
  }

  const displayName = `${meatProtein} ${cookingStyle} · ${vegetableStyle} vegetables`;
  const calories = todayMeal.calories + (meatProtein === 'Pork' ? 290 : meatProtein === 'Fish' ? 25 : 0);
  const highCalorie = calories >= 600;
  const allergens = profile ? profileAllergensInMeal(catalogMeal, profile) : [];
  const dietitianNote = DIETITIAN_NOTES[cookingStyle] || DIETITIAN_NOTES[vegetableStyle];
  // Point the user at the next meal time that still needs a meal, or to the review once all three are set.
  const filledSlots = new Set(items.map((row) => row.daySlot).filter(Boolean));
  const remaining = DAY_SLOTS.filter((item) => item !== slot && !filledSlots.has(item));
  const upcoming = remaining.length ? (remaining.includes(nextSlot(slot)) ? nextSlot(slot) : remaining[0]) : null;
  const nextLabel = upcoming ? `Next · Choose ${upcoming} →` : 'Save · Review today\'s meals';

  const onSave = () => {
    const veg = VEGETABLE_STYLES.includes(vegetableStyle as typeof VEGETABLE_STYLES[number])
      ? vegetableStyle
      : 'Pinakbet';
    const meat = MEAT_PROTEINS.includes(meatProtein as typeof MEAT_PROTEINS[number])
      ? meatProtein
      : 'Chicken';
    const cook = COOKING_STYLES.includes(cookingStyle as typeof COOKING_STYLES[number])
      ? cookingStyle
      : 'Sinigang';
    const error = addItem(
      catalogMeal,
      1,
      {
        vegetableStyle: veg,
        meatProtein: meat,
        cookingStyle: cook,
      },
      { daySlot: slot, todayMealId: todayMeal.id },
    );
    if (error) {
      Alert.alert('Could not add meal', error);
      return;
    }
    navigation.navigate({
      name: 'MealsList',
      params: { advanceFromSlot: slot },
      merge: true,
    } as never);
  };

  return (
    <AppPageShell edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackHeader
          title={`Build Your ${slot}`}
          backLabel="Today's meals"
          backAccessibilityLabel="Go back"
          onBack={() => navigation.goBack()}
        />
        <ChoiceRow title="Vegetables" options={[...VEGETABLE_STYLES]} value={vegetableStyle} onChange={setVegetableStyle} />
        <ChoiceRow title="Meat Option" options={[...MEAT_PROTEINS]} value={meatProtein} onChange={setMeatProtein} />
        <ChoiceRow title="Pinoy Cooking Style" options={[...COOKING_STYLES]} value={cookingStyle} onChange={setCookingStyle} />

        <View style={[styles.summaryCard, allergens.length > 0 && styles.summaryWarn]}>
          <Text style={styles.summaryLabel}>{`Your ${slot}`}</Text>
          <Text style={styles.summaryName}>{displayName}</Text>
          <Text style={styles.summaryMeta}>
            {calories} Kcal · {todayMeal.protein}g protein · ₱{todayMeal.price}
          </Text>
          {allergens.length ? (
            <Text style={styles.conflict}>Allergy conflict</Text>
          ) : null}
        </View>

        {highCalorie ? (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>{`${calories} Kcal – Review recommended`}</Text>
            <Text style={styles.alertBody}>This combination is higher in calories than your usual lunch.</Text>
          </View>
        ) : null}

        {allergens.length ? (
          <View style={styles.allergyBox}>
            <Ionicons name="alert-circle" size={22} color={colors.danger} />
            <View style={styles.allergyCopy}>
              <Text style={styles.allergyTitle}>Allergy check</Text>
              {allergens.map((item) => (
                <Text key={item} style={styles.allergyText}>
                  {ORDER_MSG.mealAllergen(
                    item,
                    user?.accountFor === 'family' ? recipientDisplayName(user?.mealRecipient) : null,
                  )}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        <Text style={styles.dietitianTitle}>Dietitian note</Text>
        <Text style={styles.dietitianBody}>{dietitianNote}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={upcoming ? `Next, choose ${upcoming}` : 'Save and review today\'s meals'}
          onPress={onSave}
          style={styles.next}
        >
          <Text style={styles.nextLabel}>{nextLabel}</Text>
        </Pressable>
      </ScrollView>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  choiceSection: { marginBottom: spacing.lg },
  choiceTitle: { fontFamily: fonts.bold, fontSize: font.body, color: colors.heading, marginBottom: spacing.sm },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choicePill: {
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  choicePillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { fontFamily: fonts.bold, fontSize: font.body, color: colors.text },
  choiceTextOn: { color: colors.white },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#9BBF9A',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryWarn: { borderColor: colors.danger },
  summaryLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.muted },
  summaryName: { fontFamily: fonts.bold, marginTop: 4, fontSize: font.lg, color: colors.heading },
  summaryMeta: { fontFamily: fonts.regular, marginTop: 4, fontSize: font.body, color: colors.muted },
  conflict: { fontFamily: fonts.bold, marginTop: spacing.sm, fontSize: font.body, color: colors.danger },
  alertBox: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    backgroundColor: '#FFF5F4',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  alertTitle: { fontFamily: fonts.bold, fontSize: font.body, color: colors.danger },
  alertBody: { fontFamily: fonts.regular, marginTop: 4, fontSize: font.body, color: '#5C3D3A', lineHeight: 22 },
  allergyBox: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#FFF0EE',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  allergyCopy: { flex: 1 },
  allergyTitle: { fontFamily: fonts.bold, fontSize: font.body, color: colors.danger },
  allergyText: { fontFamily: fonts.regular, marginTop: 4, fontSize: font.body, color: '#5C3D3A', lineHeight: 22 },
  dietitianTitle: { fontFamily: fonts.bold, marginTop: spacing.sm, fontSize: font.body, color: colors.heading },
  dietitianBody: { fontFamily: fonts.regular, marginTop: 4, fontSize: font.body, lineHeight: 22, color: colors.muted },
  next: {
    marginTop: spacing.xl,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.white },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  missingText: { fontFamily: fonts.regular, fontSize: font.body, color: colors.muted },
  backLink: { fontFamily: fonts.bold, marginTop: spacing.md, color: colors.primary },
});