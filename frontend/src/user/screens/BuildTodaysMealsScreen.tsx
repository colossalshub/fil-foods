import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  Alert, Image, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '../components/PageHeader';
import AppPageShell from '../components/AppPageShell';
import {
  DAY_SLOTS,
  mealsForSlot,
  nextSlot,
  todayMealById,
  type DaySlot,
  type TodayMeal,
} from '../data/todayMenu';
import { useAuth } from '../context/AuthContext';
import { useMealProfile } from '../hooks/useMealProfile';
import { MENU_CATALOG, resolveMenuMeal } from '../data/menuCatalog';
import { useCart } from '../context/CartContext';
import { warningRecipientName } from '../domain/audience';
import { ORDER_MSG, formatPeso, profileAllergensInMeal } from '../services/orderService';
import { SPECIAL_REQUEST_COPY } from '../data/messages';
import SpecialRequestEditor from '../components/SpecialRequestEditor';
import {
  feeForSpecialRequest,
  snapshotSpecialRequest,
  specialRequestLabel,
  validateSpecialRequest,
  type SpecialRequestDraft,
} from '../domain/specialRequest';
import type { SpecialRequest } from '../types';
import { MEAL_PHOTOS } from '../data/mealPhotos';
import { colors, font, radius, spacing, fonts } from '../theme/theme';

const BADGE = {
  warm: { background: colors.accent, text: colors.heading },
  neutral: { background: colors.soft, text: colors.text },
  fresh: { background: colors.soft, text: colors.primary },
};

function MealChoice({ meal, selected, warnings, request, allergies, onPress, onRemove, onRequest }: {
  meal: TodayMeal;
  selected: boolean;
  warnings: string[];
  request?: SpecialRequest | null;
  allergies: Array<{ name?: string }>;
  onPress: () => void;
  onRemove: () => void;
  onRequest: (next: SpecialRequest | null, issue: string) => void;
}) {
  const [draft, setDraft] = useState<SpecialRequestDraft>({
    options: request?.options || [],
    note: request?.note || '',
  });
  const [requestOpen, setRequestOpen] = useState(() => Boolean(request?.options.length || request?.note));
  const requestText = specialRequestLabel(request);
  const requestFee = request?.fee ?? feeForSpecialRequest(request);
  const badge = BADGE[meal.badge];
  const photo = MEAL_PHOTOS[meal.catalogMealId || ''] || MEAL_PHOTOS[meal.id];
  return (
    <View style={[styles.card, selected && styles.cardSelected, warnings.length > 0 && styles.cardWarn]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected, disabled: warnings.length > 0 }}
        disabled={warnings.length > 0}
        accessibilityLabel={`${meal.name}, ${meal.calories} Kcal, ${meal.price} pesos${warnings.length ? `, ${warnings.join(' ')}` : ''}`}
        onPress={onPress}
        style={styles.cardPress}
      >
        {photo ? (
          <Image source={photo} style={styles.photo} resizeMode="cover" accessibilityLabel={`${meal.name} photo`} />
        ) : (
          <View style={[styles.badge, { backgroundColor: badge.background }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{meal.badgeLabel}</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealMeta}>{meal.calories} Kcal · ₱{meal.price}</Text>
          <Text style={styles.note}>{meal.note}</Text>
          {warnings.map((text) => (
            <Text key={text} style={styles.warning}>{text}</Text>
          ))}
        </View>
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected ? <Ionicons name="checkmark" size={18} color={colors.white} /> : null}
        </View>
      </Pressable>
      {selected && meal.customizable && requestText ? (
        <View style={styles.requestBox}>
          <Text style={styles.requestText}>{requestText}</Text>
          {requestFee ? (
            <Text style={styles.requestText}>{`${SPECIAL_REQUEST_COPY.feeLabel} ${formatPeso(requestFee)}`}</Text>
          ) : null}
        </View>
      ) : null}
      {selected && !meal.customizable ? (
        <View style={styles.requestBox}>
          {requestOpen ? (
            <>
              <SpecialRequestEditor
                value={draft}
                allergies={allergies}
                mealPrice={meal.price}
                onChange={(next) => {
                  setDraft(next);
                  const check = validateSpecialRequest(next, allergies);
                  onRequest(check.ok ? snapshotSpecialRequest(next) || null : null, check.ok ? '' : check.message);
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={SPECIAL_REQUEST_COPY.remove}
                onPress={() => {
                  setDraft({ options: [], note: '' });
                  setRequestOpen(false);
                  onRequest(null, '');
                }}
              >
                <Text style={styles.removeLabel}>{SPECIAL_REQUEST_COPY.remove}</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={SPECIAL_REQUEST_COPY.add}
              onPress={() => setRequestOpen(true)}
            >
              <Text style={styles.addRequestLabel}>{SPECIAL_REQUEST_COPY.add}</Text>
            </Pressable>
          )}
        </View>
      ) : null}
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
  const { items, addItem, removeSlot, setSpecialRequest } = useCart();
  const { profile } = useMealProfile(user);
  const [slot, setSlot] = useState<DaySlot>('Breakfast');
  const [requestError, setRequestError] = useState('');
  const [openActions, setOpenActions] = useState<DaySlot | null>(null);

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
      .map((allergen) => ORDER_MSG.mealAllergenBlocked(allergen, recipientName));
  };

  const selectMeal = (meal: TodayMeal) => {
    if (warningsFor(meal).length) return;
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
  const canCheckout = chosenCount > 0 && !requestError;
  const onPrimaryAction = () => {
    if (canCheckout) navigation.navigate('FulfillmentChoice');
  };
  const showNextSlot = canCheckout && !allChosen && Boolean(suggestedSlot) && Boolean(chosen[slot]);

  return (
    <AppPageShell edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <PageHeader
          title="Today's meals"
          subtitle="Choose one meal for each time."
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
                onPress={() => {
                  setRequestError('');
                  setSlot(item);
                }}
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
          {DAY_SLOTS.map((item) => {
            const row = items.find((entry) => entry.daySlot === item);
            const photo = row
              ? MEAL_PHOTOS[row.meal.name] || MEAL_PHOTOS[String(row.meal.id)] || MEAL_PHOTOS[row.todayMealId || '']
              : undefined;
            const todayMeal = row?.todayMealId ? todayMealById(row.todayMealId) : undefined;
            return (
              <View key={item} style={styles.progressCol}>
                <View style={[styles.progressSegment, chosen[item] ? styles.progressSegmentOn : null]} />
                {row ? (
                  <>
                    <View style={[styles.chosenPhoto, openActions === item && styles.chosenPhotoOpen]}>
                      {photo ? (
                        <Image source={photo} style={styles.chosenPhotoImage} resizeMode="cover" accessible={false} />
                      ) : null}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={row.meal.name}
                        accessibilityHint="Shows edit and delete"
                        onPress={() => setOpenActions((current) => (current === item ? null : item))}
                        style={styles.chosenPhotoHit}
                      />
                      {openActions === item ? (
                        <View style={styles.chosenActions}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${row.meal.name}`}
                            onPress={() => {
                              if (todayMeal?.customizable && row.todayMealId) {
                                navigation.navigate('BuildMealCustomize', {
                                  todayMealId: row.todayMealId,
                                  slot: item,
                                  meatProtein: row.customization?.meatProtein,
                                  cookingStyle: row.customization?.cookingStyle,
                                });
                                return;
                              }
                              setSlot(item);
                            }}
                            style={({ pressed }) => [styles.chosenIcon, pressed && styles.chosenIconPressed]}
                          >
                            <Ionicons name="pencil" size={16} color={colors.heading} />
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${row.meal.name} from ${item}`}
                            onPress={() => {
                              setRequestError('');
                              setOpenActions(null);
                              removeSlot(item);
                            }}
                            style={({ pressed }) => [styles.chosenIcon, pressed && styles.chosenIconPressed]}
                          >
                            <Ionicons name="close" size={18} color={colors.heading} />
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.chosenLine} numberOfLines={2}>{row.meal.name}</Text>
                  </>
                ) : null}
              </View>
            );
          })}
        </View>

        {canCheckout ? (
          <View style={styles.orderActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Continue to Checkout with ${chosenCount} of 3 meals`}
              onPress={onPrimaryAction}
              style={styles.next}
            >
              <Text style={styles.nextLabel}>Continue to Checkout</Text>
            </Pressable>
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
          </View>
        ) : null}

        <Text style={styles.rule}>
          One meal per meal time. Maximum 3 meals per day. You can order one, two or all three meal times.
        </Text>

        {mealGroups.map(({ title, meals }) => (
          <View key={title}>
            <Text style={styles.group} accessibilityRole="header">{`${slot} · ${title}`}</Text>
            {meals.map((meal) => {
              const chosenRow = items.find((row) => row.daySlot === meal.slot && row.todayMealId === meal.id);
              return (
              <MealChoice
                key={meal.id}
                meal={meal}
                selected={chosen[slot] === meal.id}
                warnings={warningsFor(meal)}
                request={chosenRow?.specialRequest}
                allergies={profile?.allergies || []}
                onPress={() => selectMeal(meal)}
                onRemove={() => {
                  setRequestError('');
                  removeSlot(meal.slot);
                }}
                onRequest={(next, issue) => {
                  setRequestError(issue);
                  setSpecialRequest(meal.slot, next);
                }}
              />
              );
            })}
          </View>
        ))}

        <Text style={styles.allergy}>{allergyNote}</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.nutritionLabel}>{`TODAY'S NUTRITION`}</Text>
          <Text style={styles.calories}>{calories} Kcal today</Text>
          <Text style={styles.reviewTitle}>Subject to Dietitian review</Text>
          <Text style={styles.reviewBody}>Final suitability requires Dietitian review.</Text>
        </View>
      </ScrollView>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  orderActions: { marginTop: spacing.md, gap: spacing.sm },
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
  scroll: { paddingHorizontal: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  slots: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  slot: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  slotOn: { backgroundColor: colors.primary },
  slotOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  slotDone: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.primary },
  slotLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.text },
  slotLabelOn: { color: colors.white },
  slotCheck: { marginLeft: 4 },
  chosenPhoto: {
    width: '100%',
    height: 88,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chosenPhotoOpen: { opacity: 0.72 },
  chosenPhotoImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  chosenPhotoHit: { ...StyleSheet.absoluteFillObject },
  chosenActions: { flexDirection: 'row', gap: spacing.sm, zIndex: 1 },
  chosenIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  chosenIconPressed: { backgroundColor: colors.border },
  chosenLine: {
    fontFamily: fonts.semibold,
    marginTop: spacing.xs,
    minHeight: 44,
    width: '100%',
    textAlign: 'center',
    fontSize: font.body,
    lineHeight: 22,
    color: colors.heading,
  },
  progressLabel: { fontFamily: fonts.bold, marginTop: spacing.lg, fontSize: font.body, color: colors.muted },
  progressRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm, alignItems: 'flex-start' },
  progressCol: { flex: 1, alignItems: 'center' },
  progressSegment: { width: '100%', height: 6, borderRadius: 4, backgroundColor: colors.soft },
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
  requestBox: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  requestText: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.text, marginTop: spacing.xs },
  addRequestLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.primary, paddingVertical: spacing.sm },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  secondaryLabel: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.primary },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bold, fontSize: font.body },
  cardBody: { flex: 1 },
  mealName: { fontFamily: fonts.semibold, fontSize: font.lg, lineHeight: 24, color: colors.heading },
  mealMeta: { fontFamily: fonts.regular, marginTop: 2, fontSize: font.body, lineHeight: 24, color: colors.muted },
  note: { fontFamily: fonts.regular, marginTop: 2, fontSize: font.body, lineHeight: 24, color: colors.text },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
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
    borderColor: colors.border,
    padding: spacing.lg,
  },
  nutritionLabel: {
    fontFamily: fonts.semibold,
    fontSize: font.body,
    lineHeight: 24,
    color: colors.muted,
  },
  calories: { fontFamily: fonts.bold, marginTop: spacing.sm, fontSize: 28, lineHeight: 34, color: colors.heading },
  reviewTitle: { fontFamily: fonts.semibold, marginTop: spacing.sm, fontSize: font.body, lineHeight: 24, color: colors.heading },
  reviewBody: { fontFamily: fonts.regular, marginTop: 2, fontSize: font.body, lineHeight: 22, color: colors.muted },
  allergy: { fontFamily: fonts.regular, marginTop: spacing.lg, fontSize: font.body, lineHeight: 22, color: colors.text },
  next: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.white },
});