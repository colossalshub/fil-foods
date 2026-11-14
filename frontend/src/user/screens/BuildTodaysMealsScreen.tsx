import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppPageShell from '../components/AppPageShell';
import {
  DAY_SLOTS,
  mealsForSlot,
  nextSlot,
  type DaySlot,
  type TodayMeal,
} from '../data/todayMenu';
import { useAuth } from '../context/AuthContext';
import { useMealProfile } from '../hooks/useMealProfile';
import { MEALS } from '../data/meals';
import { useCart } from '../context/CartContext';
import { colors, font, radius, spacing } from '../theme/theme';

const BADGE = {
  warm: { background: '#F6E7B4', text: '#8A6A12' },
  neutral: { background: '#E4E7E3', text: '#5E675F' },
  fresh: { background: '#DCEAD8', text: '#2F6A45' },
};

function MealChoice({ meal, selected, onPress }: {
  meal: TodayMeal;
  selected: boolean;
  onPress: () => void;
}) {
  const badge = BADGE[meal.badge];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${meal.name}, ${meal.calories} Kcal, ${meal.price} pesos`}
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={[styles.badge, { backgroundColor: badge.background }]}>
        <Text style={[styles.badgeText, { color: badge.text }]}>{meal.badgeLabel}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.mealName}>{meal.name}</Text>
        <Text style={styles.mealMeta}>{meal.calories} Kcal · ₱{meal.price}</Text>
        <Text style={styles.available}>Available</Text>
        <Text style={styles.note}>{meal.note}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected ? <Ionicons name="checkmark" size={18} color={colors.white} /> : null}
      </View>
    </Pressable>
  );
}

export default function BuildTodaysMealsScreen({ navigation }: {
  navigation: {
    navigate: (name: string, params?: object) => void;
    setParams?: (params: object) => void;
    getParent?: () => { navigate: (name: string, params?: object) => void } | undefined;
  };
}) {
  const route = useRoute() as { params?: { advanceFromSlot?: DaySlot } };
  const { user } = useAuth();
  const { items, addItem } = useCart();
  const { profile } = useMealProfile(user);
  const [slot, setSlot] = useState<DaySlot>('Breakfast');

  const chosen = useMemo(() => {
    const map: Partial<Record<DaySlot, string>> = {};
    for (const row of items) {
      if (row.daySlot && row.todayMealId) {
        map[row.daySlot] = row.todayMealId;
      }
    }
    return map;
  }, [items]);

  useFocusEffect(useCallback(() => {
    const advanceFrom = route.params?.advanceFromSlot;
    if (!advanceFrom) return;
    setSlot(nextSlot(advanceFrom));
    navigation.setParams?.({ advanceFromSlot: undefined });
  }, [navigation, route.params?.advanceFromSlot]));

  const meals = mealsForSlot(slot);
  const group = meals[0]?.group;
  const chosenCount = DAY_SLOTS.filter((item) => chosen[item]).length;
  const chosenMeals = useMemo(
    () => DAY_SLOTS.map((item) => {
      const id = chosen[item];
      return id ? mealsForSlot(item).find((meal) => meal.id === id) : undefined;
    }).filter((meal): meal is TodayMeal => Boolean(meal)),
    [chosen],
  );
  const calories = chosenMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const upcoming = nextSlot(slot);
  const allChosen = chosenCount === DAY_SLOTS.length;
  const allergyNote = (profile?.allergies || []).length
    ? `Check ingredients against your ${(profile?.allergies || []).join(' + ')} allergies before submitting.`
  : 'Check ingredients against your allergies before submitting.';

  const selectMeal = (meal: TodayMeal) => {
    if (meal.customizable) {
      navigation.navigate('BuildMealCustomize', { todayMealId: meal.id, slot: meal.slot });
      return;
    }
    const catalog = meal.catalogMealId ? MEALS.find((item) => item.id === meal.catalogMealId) : undefined;
    if (catalog) {
      const error = addItem(catalog, 1, undefined, { daySlot: meal.slot, todayMealId: meal.id });
      if (error) {
        Alert.alert('Could not add meal', error);
      }
    }
  };

  const onPrimaryAction = () => {
    if (allChosen) {
      navigation.navigate('ChoosePlan');
      return;
    }
    if (!chosen[slot]) {
      return;
    }
    setSlot(upcoming);
  };

  const primaryLabel = allChosen
    ? 'Continue to Checkout'
    : chosen[slot]
      ? `Next · Choose ${upcoming} →`
      : `Choose a ${slot.toLowerCase()} meal`;

  return (
    <AppPageShell edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} accessibilityRole="header">{`Build Today's Meals`}</Text>
        <Text style={styles.lead}>Choose each meal. Your dietitian checks it against your profile.</Text>

        <View style={styles.slots}>
          {DAY_SLOTS.map((item) => {
            const active = item === slot;
            const done = Boolean(chosen[item]);
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSlot(item)}
                style={[
                  styles.slot,
                  active ? styles.slotOn : done ? styles.slotDone : styles.slotOff,
                ]}
              >
                <Text style={[styles.slotLabel, active && styles.slotLabelOn]}>{item}</Text>
                {done && !active ? (
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={styles.slotCheck} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.progressLabel}>{`Meals chosen today: ${chosenCount} of 3`}</Text>
        <View style={styles.progressRow} accessibilityRole="progressbar">
          {DAY_SLOTS.map((item) => (
            <View
              key={item}
              style={[styles.progressSegment, chosen[item] ? styles.progressSegmentOn : null]}
            />
          ))}
        </View>

        <Text style={styles.group} accessibilityRole="header">
          {group ? `${slot} · ${group}` : slot}
        </Text>
        <Text style={styles.rule}>One meal per meal time. Maximum 3 meals per day.</Text>

        {meals.map((meal) => (
          <MealChoice
            key={meal.id}
            meal={meal}
            selected={chosen[slot] === meal.id}
            onPress={() => selectMeal(meal)}
          />
        ))}

        <View style={styles.summaryCard}>
          <Text style={styles.nutritionLabel}>{`TODAY'S NUTRITION`}</Text>
          <Text style={styles.calories}>{calories} Kcal today</Text>
          <Text style={styles.reviewTitle}>Subject to Dietitian review</Text>
          <Text style={styles.reviewBody}>Final suitability requires Dietitian review.</Text>
        </View>

        <Text style={styles.allergy}>{allergyNote}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          onPress={onPrimaryAction}
          style={[styles.next, (!chosen[slot] && !allChosen) && styles.nextDisabled]}
          disabled={!chosen[slot] && !allChosen}
        >
          <Text style={styles.nextLabel}>{primaryLabel}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('MealBrowse')}
          style={styles.browseLink}
        >
          <Text style={styles.browseLinkLabel}>Browse all meals</Text>
        </Pressable>
      </ScrollView>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: '#1C3B2E' },
  lead: { marginTop: spacing.sm, fontSize: font.body, lineHeight: 22, color: '#4E5B52', maxWidth: 320 },
  slots: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  slot: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  slotOn: { backgroundColor: '#1E4D38' },
  slotOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#E1E6DE' },
  slotDone: { backgroundColor: colors.white, borderWidth: 2, borderColor: '#1E4D38' },
  slotLabel: { fontSize: font.body, fontWeight: '700', color: '#24312A' },
  slotLabelOn: { color: colors.white },
  slotCheck: { marginLeft: 4 },
  progressLabel: { marginTop: spacing.lg, fontSize: font.body, fontWeight: '700', color: '#4E5B52' },
  progressRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  progressSegment: { flex: 1, height: 6, borderRadius: 4, backgroundColor: '#DCE4DB' },
  progressSegmentOn: { backgroundColor: '#1E4D38' },
  group: { marginTop: spacing.lg, fontSize: font.lg, lineHeight: 24, fontWeight: '800', color: '#1C3B2E' },
  rule: { marginTop: 4, marginBottom: spacing.md, fontSize: font.body, lineHeight: 22, color: '#5C675F' },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4EAE2',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardSelected: { borderColor: '#1E4D38', borderWidth: 2 },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: font.body, fontWeight: '800' },
  cardBody: { flex: 1 },
  mealName: { fontSize: font.body, lineHeight: 22, fontWeight: '800', color: '#1C3B2E' },
  mealMeta: { marginTop: 2, fontSize: font.body, lineHeight: 22, color: '#66706A' },
  available: { marginTop: 2, fontSize: font.body, lineHeight: 22, fontWeight: '700', color: '#1E7A45' },
  note: { marginTop: 2, fontSize: font.body, lineHeight: 22, fontWeight: '700', color: '#1F6B45' },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#C5CEC4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  radioOn: { backgroundColor: '#1E4D38', borderColor: '#1E4D38' },
  summaryCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C8DCC8',
    padding: spacing.lg,
  },
  nutritionLabel: {
    fontSize: font.body,
    letterSpacing: 1.1,
    fontWeight: '800',
    color: '#7E8B7A',
  },
  calories: { marginTop: spacing.sm, fontSize: 28, lineHeight: 34, fontWeight: '800', color: '#1C3B2E' },
  reviewTitle: { marginTop: spacing.sm, fontSize: font.body, lineHeight: 22, fontWeight: '700', color: '#1F6B45' },
  reviewBody: { marginTop: 2, fontSize: font.body, lineHeight: 22, color: '#66706A' },
  allergy: { marginTop: spacing.lg, fontSize: font.body, lineHeight: 22, color: '#24312A' },
  next: {
    marginTop: spacing.lg,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#1E4D38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextDisabled: { opacity: 0.45 },
  nextLabel: { fontSize: font.body, fontWeight: '700', color: colors.white },
  browseLink: { marginTop: spacing.lg, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  browseLinkLabel: { fontSize: font.body, fontWeight: '700', color: colors.primary },
});