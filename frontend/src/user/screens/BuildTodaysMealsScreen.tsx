import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '../components/PageHeader';
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
import { MENU_CATALOG, resolveMenuMeal } from '../data/menuCatalog';
import { useCart } from '../context/CartContext';
import { warningRecipientName } from '../domain/audience';
import { ORDER_MSG, profileAllergensInMeal } from '../services/orderService';
import { colors, font, radius, spacing, fonts } from '../theme/theme';

const BADGE = {
  warm: { background: '#F6E7B4', text: '#8A6A12' },
  neutral: { background: '#E4E7E3', text: '#5E675F' },
  fresh: { background: colors.mintStrong, text: '#2F6A45' },
};

function MealChoice({ meal, selected, warnings, onPress, onRemove }: {
  meal: TodayMeal;
  selected: boolean;
  warnings: string[];
  onPress: () => void;
  onRemove: () => void;
}) {
  const badge = BADGE[meal.badge];
  return (
    <View style={[styles.card, selected && styles.cardSelected, warnings.length > 0 && styles.cardWarn]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${meal.name}, ${meal.calories} Kcal, ${meal.price} pesos${warnings.length ? `, ${warnings.join(' ')}` : ''}`}
        onPress={onPress}
        style={styles.cardPress}
      >
        <View style={[styles.badge, { backgroundColor: badge.background }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{meal.badgeLabel}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealMeta}>{meal.calories} Kcal · ₱{meal.price}</Text>
          <Text style={styles.available}>Available</Text>
          <Text style={styles.note}>{meal.note}</Text>
          {warnings.map((text) => (
            <Text key={text} style={styles.warning}>{text}</Text>
          ))}
        </View>
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected ? <Ionicons name="checkmark" size={18} color={colors.white} /> : null}
        </View>
      </Pressable>
      {selected ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${meal.name} from ${meal.slot}`}
          onPress={onRemove}
          hitSlop={8}
          style={styles.removeBtn}
        >
          <Text style={styles.removeLabel}>Remove</Text>
        </Pressable>
      ) : null}
    </View>
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
  const { items, addItem, removeSlot } = useCart();
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
    // Move to the next meal time that still needs a meal; stay put when all three are chosen.
    const filled = new Set(items.map((row) => row.daySlot).filter(Boolean));
    const pending = DAY_SLOTS.filter((item) => !filled.has(item));
    const preferred = nextSlot(advanceFrom);
    setSlot(pending.length ? (pending.includes(preferred) ? preferred : pending[0]) : advanceFrom);
    navigation.setParams?.({ advanceFromSlot: undefined });
  }, [navigation, route.params?.advanceFromSlot, items]));

  const mealGroups = useMemo(() => {
    const list = mealsForSlot(slot);
    const order: string[] = [];
    const map = new Map<string, TodayMeal[]>();
    for (const meal of list) {
      const key = meal.group || slot;
      if (!map.has(key)) {
        order.push(key);
        map.set(key, []);
      }
      map.get(key)!.push(meal);
    }
    return order.map((title) => ({ title, meals: map.get(title)! }));
  }, [slot]);
  const chosenCount = DAY_SLOTS.filter((item) => chosen[item]).length;
  const chosenMeals = useMemo(
    () => DAY_SLOTS.map((item) => {
      const id = chosen[item];
      return id ? mealsForSlot(item).find((meal) => meal.id === id) : undefined;
    }).filter((meal): meal is TodayMeal => Boolean(meal)),
    [chosen],
  );
  const calories = chosenMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const allChosen = chosenCount === DAY_SLOTS.length;
  // Every meal time is optional (USR-18): suggest the next empty one without forcing it.
  const pendingSlots = DAY_SLOTS.filter((item) => !chosen[item]);
  const preferredNext = nextSlot(slot);
  const suggestedSlot = pendingSlots.filter((item) => item !== slot).includes(preferredNext)
    ? preferredNext
    : pendingSlots.find((item) => item !== slot);
  const recipientName = warningRecipientName(user);
  const allergyNames = (profile?.allergies || []).map((item) => (typeof item === 'string' ? item : item.name));
  const allergyOwner = recipientName ? `${recipientName}'s` : 'your';
  const allergyNote = allergyNames.length
    ? `Check ingredients against ${allergyOwner} ${allergyNames.join(' + ')} allergies before submitting.`
    : `Check ingredients against ${allergyOwner} allergies before submitting.`;

  const warningsFor = (meal: TodayMeal) => {
    const catalogItem = MENU_CATALOG.find((item) => item.id === meal.id);
    if (!catalogItem || !profile) return [];
    return profileAllergensInMeal(resolveMenuMeal(catalogItem), profile)
      .map((allergen) => ORDER_MSG.mealAllergen(allergen, recipientName));
  };

  const selectMeal = (meal: TodayMeal) => {
    if (meal.customizable) {
      navigation.navigate('BuildMealCustomize', { todayMealId: meal.id, slot: meal.slot });
      return;
    }
    const catalogItem = MENU_CATALOG.find((item) => item.id === meal.id);
    const catalog = catalogItem ? resolveMenuMeal(catalogItem) : undefined;
    if (catalog) {
      const error = addItem(catalog, 1, undefined, { daySlot: meal.slot, todayMealId: meal.id });
      if (error) {
        Alert.alert('Could not add meal', error);
      }
    }
  };

  // One, two or three meals can go to checkout; nothing has to be chosen in order.
  const canCheckout = chosenCount > 0;
  const primaryLabel = canCheckout ? 'Continue to Checkout' : `Choose a ${slot.toLowerCase()} meal`;
  const onPrimaryAction = () => {
    if (canCheckout) navigation.navigate('FulfillmentChoice');
  };
  const showNextSlot = canCheckout && !allChosen && Boolean(suggestedSlot) && Boolean(chosen[slot]);

  return (
    <AppPageShell edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <PageHeader
          title="Build Today's Meals"
          subtitle="Choose each meal. Your dietitian checks it against your profile."
        />

        {/* USR-37: the Meal tab opens the meal catalog and its search tools. */}
        <Pressable
          accessibilityRole="search"
          accessibilityLabel="Search meals"
          accessibilityHint="Opens the menu with search"
          onPress={() => navigation.navigate('MealBrowse')}
          style={styles.searchEntry}
        >
          <Ionicons name="search" size={22} color={colors.primary} />
          <Text style={styles.searchEntryText}>Search meals</Text>
        </Pressable>

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

        <Text style={styles.rule}>
          One meal per meal time. Maximum 3 meals per day. You can order one, two or all three meal times.
        </Text>

        {mealGroups.map(({ title, meals }) => (
          <View key={title}>
            <Text style={styles.group} accessibilityRole="header">{`${slot} · ${title}`}</Text>
            {meals.map((meal) => (
              <MealChoice
                key={meal.id}
                meal={meal}
                selected={chosen[slot] === meal.id}
                warnings={warningsFor(meal)}
                onPress={() => selectMeal(meal)}
                onRemove={() => removeSlot(meal.slot)}
              />
            ))}
          </View>
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
          onPress={() => navigation.navigate('MealBrowse')}
          style={styles.browseLink}
        >
          <Text style={styles.browseLinkLabel}>Browse all meals</Text>
        </Pressable>
      </ScrollView>
      {/* Sticky action so the next step is always visible, however long the meal list is. */}
      <View style={styles.footer}>
        {showNextSlot && suggestedSlot ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Next, choose ${suggestedSlot}`}
            onPress={() => setSlot(suggestedSlot)}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryLabel}>{`Next · Choose ${suggestedSlot} →`}</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={canCheckout ? `Continue to Checkout with ${chosenCount} of 3 meals` : primaryLabel}
          accessibilityState={{ disabled: !canCheckout }}
          onPress={onPrimaryAction}
          style={[styles.next, styles.footerButton, !canCheckout && styles.nextDisabled]}
          disabled={!canCheckout}
        >
          <Text style={styles.nextLabel}>{primaryLabel}</Text>
        </Pressable>
      </View>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.authPage,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  footerButton: { marginTop: 0 },
  searchEntry: {
    marginTop: spacing.lg,
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  searchEntryText: { fontFamily: fonts.regular, fontSize: font.body, color: colors.muted },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
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
  slotOn: { backgroundColor: colors.primary },
  slotOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#E1E6DE' },
  slotDone: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.primary },
  slotLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.text },
  slotLabelOn: { color: colors.white },
  slotCheck: { marginLeft: 4 },
  progressLabel: { fontFamily: fonts.bold, marginTop: spacing.lg, fontSize: font.body, color: colors.muted },
  progressRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  progressSegment: { flex: 1, height: 6, borderRadius: 4, backgroundColor: '#DCE4DB' },
  progressSegmentOn: { backgroundColor: colors.primary },
  group: { fontFamily: fonts.bold, marginTop: spacing.lg, fontSize: font.lg, lineHeight: 24, color: colors.heading },
  rule: { fontFamily: fonts.regular, marginTop: 4, marginBottom: spacing.md, fontSize: font.body, lineHeight: 22, color: colors.muted },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardSelected: { borderColor: colors.primary, borderWidth: 2 },
  cardWarn: { borderColor: colors.danger },
  cardPress: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, flex: 1 },
  warning: { fontFamily: fonts.semibold, marginTop: spacing.xs, fontSize: font.body, lineHeight: 22, color: colors.danger },
  removeBtn: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  removeLabel: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.danger },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  secondaryLabel: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.primary },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bold, fontSize: font.body },
  cardBody: { flex: 1 },
  mealName: { fontFamily: fonts.bold, fontSize: font.body, lineHeight: 22, color: colors.heading },
  mealMeta: { fontFamily: fonts.regular, marginTop: 2, fontSize: font.body, lineHeight: 22, color: colors.muted },
  available: { fontFamily: fonts.bold, marginTop: 2, fontSize: font.body, lineHeight: 22, color: '#1E7A45' },
  note: { fontFamily: fonts.bold, marginTop: 2, fontSize: font.body, lineHeight: 22, color: '#1F6B45' },
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
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  summaryCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C8DCC8',
    padding: spacing.lg,
  },
  nutritionLabel: {
    fontFamily: fonts.bold,
    fontSize: font.body,
    letterSpacing: 1.1,
    color: '#7E8B7A',
  },
  calories: { fontFamily: fonts.bold, marginTop: spacing.sm, fontSize: 28, lineHeight: 34, color: colors.heading },
  reviewTitle: { fontFamily: fonts.bold, marginTop: spacing.sm, fontSize: font.body, lineHeight: 22, color: '#1F6B45' },
  reviewBody: { fontFamily: fonts.regular, marginTop: 2, fontSize: font.body, lineHeight: 22, color: colors.muted },
  allergy: { fontFamily: fonts.regular, marginTop: spacing.lg, fontSize: font.body, lineHeight: 22, color: colors.text },
  next: {
    marginTop: spacing.lg,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextDisabled: { opacity: 0.45 },
  nextLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.white },
  browseLink: { marginTop: spacing.lg, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  browseLinkLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.primary },
});