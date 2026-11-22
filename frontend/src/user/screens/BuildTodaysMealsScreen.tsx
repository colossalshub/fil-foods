import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  Image, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '../components/PageHeader';
import AppPageShell from '../components/AppPageShell';
import {
  DAY_SLOTS,
  mealsForSlot,
  nextSlot,
  openDaySlots,
  slotWindowLabel,
  todayMealById,
  type DaySlot,
  type TodayMeal,
} from '../data/todayMenu';
import { useAuth } from '../context/AuthContext';
import { useMealProfile } from '../hooks/useMealProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { floatingTabBottomInset } from '../navigation/floatingTabBar';
import { MENU_CATALOG, resolveMenuMeal } from '../data/menuCatalog';
import { useCart } from '../context/CartContext';
import { recipientDisplayName, warningRecipientName } from '../domain/audience';
import { mealFitLine } from '../domain/homePresentation';
import { ORDER_MSG, formatPeso, profileAllergensInMeal, recommendationReason } from '../services/orderService';
import { MEAL_DAY_COPY, SPECIAL_REQUEST_COPY } from '../data/messages';
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

function MealChoice({ meal, selected, warnings, fit, request, allergies, onPress, onRemove, onRequest }: {
  meal: TodayMeal;
  selected: boolean;
  warnings: string[];
  fit?: string;
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
        accessibilityLabel={`${meal.name}, ${formatPeso(meal.price)}${fit ? `. ${fit}` : ''}${warnings.length ? `. ${warnings.join(' ')}` : ''}`}
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
          {fit ? <Text style={styles.fitLine}>{fit}</Text> : <Text style={styles.note}>{meal.note}</Text>}
          <Text style={styles.mealMeta}>{`${formatPeso(meal.price)} · ${meal.calories} Kcal`}</Text>
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
  const route = useRoute() as { params?: { advanceFromSlot?: DaySlot; openSummary?: boolean } };
  const { user } = useAuth();
  const { items, removeSlot, setSpecialRequest } = useCart();
  const { profile } = useMealProfile(user);
  const tabInset = floatingTabBottomInset(useSafeAreaInsets());
  const [slot, setSlot] = useState<DaySlot>('Breakfast');
  const [requestError, setRequestError] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollViewport = useRef(0);
  const scrollContent = useRef(0);
  const choicesOffset = useRef(0);
  const mealAnchors = useRef(new Map<string, View>());
  const [scrollRequest, setScrollRequest] = useState(0);
  // USR-18: opening a meal time that already has a meal lands on that meal.
  const showSlot = (next: DaySlot) => {
    setRequestError('');
    setSlot(next);
    setScrollRequest((count) => count + 1);
  };

  const chosen = useMemo(() => {
    const map: Partial<Record<DaySlot, string>> = {};
    for (const row of items) {
      if (row.daySlot && row.todayMealId) {
        map[row.daySlot] = row.todayMealId;
      }
    }
    return map;
  }, [items]);

  useEffect(() => {
    if (!scrollRequest) return undefined;
    const frame = requestAnimationFrame(() => {
      const scroller = scrollRef.current;
      if (!scroller) return;
      const chosenId = chosen[slot];
      const anchor = chosenId ? mealAnchors.current.get(chosenId) : undefined;
      const toChoices = () => scroller.scrollTo({ y: Math.max(choicesOffset.current - 12, 0), animated: true });
      if (!anchor) {
        toChoices();
        return;
      }
      anchor.measureLayout(
        scroller as unknown as View,
        (_x, y, _width, height) => {
          const room = Math.max(scrollViewport.current - height, 0);
          const centered = y - room / 2;
          const limit = scrollContent.current > scrollViewport.current
            ? scrollContent.current - scrollViewport.current
            : centered;
          scroller.scrollTo({
            y: Math.min(Math.max(centered, 0), limit),
            animated: true,
          });
        },
        toChoices,
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollRequest, slot, chosen]);

  useFocusEffect(useCallback(() => {
    const advanceFrom = route.params?.advanceFromSlot;
    const openSummary = route.params?.openSummary;
    if (!advanceFrom && !openSummary) return;
    if (advanceFrom) {
      // Move to the next meal time that still needs a meal; stay put when all three are chosen.
      const filled = new Set(items.map((row) => row.daySlot).filter(Boolean));
      const pending = openDaySlots().filter((item) => !filled.has(item));
      const preferred = nextSlot(advanceFrom);
      setSlot(pending.length ? (pending.includes(preferred) ? preferred : pending[0]) : advanceFrom);
    }
    if (openSummary && items.some((row) => row.daySlot)) setSummaryOpen(true);
    navigation.setParams?.({ advanceFromSlot: undefined, openSummary: undefined });
  }, [navigation, route.params?.advanceFromSlot, route.params?.openSummary, items]));

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
  const summaryRows = useMemo(() => DAY_SLOTS.flatMap((item) => {
    const row = items.find((entry) => entry.daySlot === item);
    if (!row) return [];
    const todayMeal = row.todayMealId ? todayMealById(row.todayMealId) : undefined;
    const lineCalories = row.meal.calories ?? todayMeal?.calories ?? 0;
    const fee = feeForSpecialRequest(row.specialRequest);
    const linePrice = (row.meal.price ?? todayMeal?.price ?? 0) * row.quantity + fee;
    const words = row.meal.name.split(/\s+/).filter(Boolean);
    const initials = todayMeal?.badgeLabel
      || (words.length > 1 ? `${words[0][0]}${words[1][0]}` : row.meal.name.slice(0, 2)).toUpperCase();
    const photo = MEAL_PHOTOS[row.meal.name]
      || MEAL_PHOTOS[String(row.meal.id)]
      || MEAL_PHOTOS[row.todayMealId || '']
      || (typeof row.meal.image === 'number' ? row.meal.image : undefined);
    return [{
      slot: item,
      name: row.meal.name,
      calories: lineCalories,
      price: linePrice,
      initials,
      photo,
    }];
  }), [items]);
  const summaryCalories = summaryRows.reduce((sum, row) => sum + row.calories, 0);
  const summaryPrice = summaryRows.reduce((sum, row) => sum + row.price, 0);
  const recipientName = warningRecipientName(user);
  const holderName = user?.firstName?.trim()
    || recipientDisplayName(user)
    || '';
  const forWhom = user?.accountFor === 'family' && recipientName
    ? MEAL_DAY_COPY.forName(recipientName)
    : MEAL_DAY_COPY.forYou(holderName);
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
    const catalogItem = MENU_CATALOG.find((item) => item.id === meal.id);
    const catalog = catalogItem ? resolveMenuMeal(catalogItem) : undefined;
    if (!catalog) return;
    navigation.navigate('MealDetail', { meal: catalog, initials: meal.badgeLabel });
  };

  // One, two or three meals can go to checkout; nothing has to be chosen in order.
  const canCheckout = chosenCount > 0 && !requestError;
  const onPrimaryAction = () => {
    if (canCheckout) navigation.navigate('FulfillmentChoice');
  };
  const fitFor = (meal: TodayMeal) => {
    const catalogItem = MENU_CATALOG.find((item) => item.id === meal.id);
    if (!catalogItem || !profile) return '';
    const resolved = resolveMenuMeal(catalogItem);
    return mealFitLine(recommendationReason(resolved, profile), profile, recipientName);
  };
  const choiceGroups = DAY_SLOTS.includes(slot)
    ? mealGroups
      .map((group) => ({ title: group.title, meals: group.meals.filter((meal) => warningsFor(meal).length === 0) }))
      .filter((group) => group.meals.length > 0)
    : [];

  return (
    <AppPageShell edges={['top']}>
      <View style={styles.pageBody}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { paddingBottom: tabInset + spacing.lg }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!summaryOpen}
        onLayout={(event) => { scrollViewport.current = event.nativeEvent.layout.height; }}
        onContentSizeChange={(_width, height) => { scrollContent.current = height; }}
      >
        <PageHeader
          title={MEAL_DAY_COPY.screenTitle}
          subtitle={forWhom}
          caption={MEAL_DAY_COPY.chosenCount(chosenCount)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={MEAL_DAY_COPY.search}
          accessibilityHint="Opens the menu with search"
          onPress={() => navigation.navigate('MealBrowse')}
          style={styles.searchBtn}
        >
          <Ionicons name="search" size={18} color={colors.primary} />
          <Text style={styles.searchBtnLabel}>{MEAL_DAY_COPY.search}</Text>
        </Pressable>

        <View style={styles.orderNote}>
          <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
          <View style={styles.orderNoteCopy}>
            <Text style={styles.orderNoteKicker}>{MEAL_DAY_COPY.beforeYouOrder}</Text>
            <Text style={styles.orderNoteTitle}>{MEAL_DAY_COPY.oneMealTimeTitle}</Text>
            <Text style={styles.orderNoteBody}>{MEAL_DAY_COPY.oneMealTimeBody}</Text>
          </View>
        </View>

        <View style={styles.dayList}>
          {DAY_SLOTS.map((item) => {
            const active = item === slot;
            const row = items.find((entry) => entry.daySlot === item);
            const photo = row
              ? MEAL_PHOTOS[row.meal.name] || MEAL_PHOTOS[String(row.meal.id)] || MEAL_PHOTOS[row.todayMealId || '']
              : undefined;
            const todayMeal = row?.todayMealId ? todayMealById(row.todayMealId) : undefined;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={row ? `${item}, ${row.meal.name}` : `${item}, ${MEAL_DAY_COPY.notChosen}`}
                accessibilityHint="Shows meals for this time"
                onPress={() => showSlot(item)}
                style={({ pressed }) => [
                  styles.dayRow,
                  active && styles.dayRowOn,
                  pressed && styles.dayRowPressed,
                ]}
              >
                {photo ? (
                  <Image source={photo} style={styles.dayPhoto} resizeMode="cover" accessible={false} />
                ) : (
                  <View style={styles.dayPhotoEmpty} />
                )}
                <View style={styles.dayCopy}>
                  <Text style={[styles.daySlot, active && styles.daySlotOn]}>{item}</Text>
                  <Text style={styles.dayName}>{row ? row.meal.name : MEAL_DAY_COPY.notChosen}</Text>
                  <View style={styles.deadlineRow}>
                    <Ionicons name="time-outline" size={14} color={colors.primary} />
                    <Text style={styles.deadline}>{slotWindowLabel(item)}</Text>
                  </View>
                </View>
                {row ? (
                  <View style={styles.dayActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${MEAL_DAY_COPY.change} ${row.meal.name}`}
                      onPress={(event) => {
                        event.stopPropagation();
                        if (todayMeal?.customizable && row.todayMealId) {
                          navigation.navigate('BuildMealCustomize', {
                            todayMealId: row.todayMealId,
                            slot: item,
                            meatProtein: row.customization?.meatProtein,
                            cookingStyle: row.customization?.cookingStyle,
                          });
                          return;
                        }
                        showSlot(item);
                      }}
                      style={styles.dayAction}
                    >
                      <Text style={styles.dayActionLabel}>{MEAL_DAY_COPY.change}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${MEAL_DAY_COPY.remove} ${row.meal.name} from ${item}`}
                      onPress={(event) => {
                        event.stopPropagation();
                        setRequestError('');
                        removeSlot(item);
                      }}
                      style={styles.dayAction}
                    >
                      <Text style={styles.dayRemoveLabel}>{MEAL_DAY_COPY.remove}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.openPill}>
                    <Text style={styles.openPillLabel}>{MEAL_DAY_COPY.open}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {chosenCount > 0 ? (
          <View style={styles.reviewNote}>
            <Text style={styles.reviewKcal}>{MEAL_DAY_COPY.kcalToday(calories.toLocaleString('en-PH'))}</Text>
            <Text style={styles.reviewBody}>{`${MEAL_DAY_COPY.reviewTitle}. ${MEAL_DAY_COPY.reviewBody}`}</Text>
          </View>
        ) : null}

        {canCheckout ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${MEAL_DAY_COPY.review}, ${MEAL_DAY_COPY.chosenCount(chosenCount)}`}
            onPress={() => setSummaryOpen(true)}
            style={[styles.next, styles.reviewButton]}
          >
            <Text style={styles.nextLabel}>{MEAL_DAY_COPY.review}</Text>
          </Pressable>
        ) : null}

        <View onLayout={(event) => { choicesOffset.current = event.nativeEvent.layout.y; }}>
          {choiceGroups.length ? choiceGroups.map(({ title, meals }) => (
            <View key={title}>
              <Text style={styles.group} accessibilityRole="header">{`${slot} · ${title}`}</Text>
              {meals.map((meal) => {
                const chosenRow = items.find((row) => row.daySlot === meal.slot && row.todayMealId === meal.id);
                return (
                  <View
                    key={meal.id}
                    ref={(node) => {
                      if (node) mealAnchors.current.set(meal.id, node);
                      else mealAnchors.current.delete(meal.id);
                    }}
                  >
                    <MealChoice
                      meal={meal}
                      selected={chosen[slot] === meal.id}
                      warnings={[]}
                      fit={fitFor(meal)}
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
                  </View>
                );
              })}
            </View>
          )) : (
            <Text style={styles.rule}>{MEAL_DAY_COPY.noMealsInSlot}</Text>
          )}
        </View>

        <Text style={styles.allergy}>{allergyNote}</Text>
      </ScrollView>
      {summaryOpen ? (
          <View style={[styles.summaryScrim, { paddingBottom: tabInset + spacing.md }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close order summary"
              onPress={() => setSummaryOpen(false)}
              style={styles.summaryScrimHit}
            />
            <View style={styles.summaryFrame}>
            <View style={styles.summarySheet} accessibilityViewIsModal>
              <View style={styles.summaryHead}>
                <View style={styles.summaryHeadCopy}>
                  <Text style={styles.summaryTitle} accessibilityRole="header">Order Summary</Text>
                  <Text style={styles.summaryLead}>
                    {`Your meals for today · ${chosenCount} of 3 chosen`}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close order summary"
                  onPress={() => setSummaryOpen(false)}
                  hitSlop={8}
                  style={styles.summaryClose}
                >
                  <Ionicons name="close" size={22} color={colors.heading} />
                </Pressable>
              </View>

              <View style={styles.summaryScroll}>
                {summaryRows.map((row) => (
                  <View key={row.slot} style={styles.summaryMeal}>
                    {row.photo ? (
                      <Image
                        source={row.photo}
                        style={styles.summaryPhoto}
                        resizeMode="cover"
                        accessibilityLabel={`${row.name} photo`}
                      />
                    ) : (
                      <View style={styles.summaryBadge}>
                        <Text style={styles.summaryBadgeText}>{row.initials}</Text>
                      </View>
                    )}
                    <View style={styles.summaryMealBody}>
                      <Text style={styles.summarySlot}>{row.slot.toUpperCase()}</Text>
                      <Text style={styles.summaryMealName} numberOfLines={1}>{row.name}</Text>
                      <Text style={styles.summaryMealMeta} numberOfLines={1}>
                        {`${row.calories.toLocaleString('en-PH')} Kcal · ${formatPeso(row.price)}`}
                      </Text>
                    </View>
                  </View>
                ))}

                <View style={styles.summaryTotals}>
                  <View style={styles.summaryTotalRow}>
                    <Text style={styles.summaryTotalLabel}>Total calories</Text>
                    <Text style={styles.summaryTotalValue}>
                      {`${summaryCalories.toLocaleString('en-PH')} Kcal`}
                    </Text>
                  </View>
                  <View style={styles.summaryTotalRow}>
                    <Text style={styles.summaryTotalLabel}>Total price</Text>
                    <Text style={styles.summaryTotalValue}>{formatPeso(summaryPrice)}</Text>
                  </View>
                </View>

                <Text style={styles.summaryReview} numberOfLines={2}>
                  Subject to Dietitian review. Final suitability requires Dietitian review.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Continue to Checkout with ${chosenCount} of 3 meals`}
                  onPress={() => {
                    setSummaryOpen(false);
                    onPrimaryAction();
                  }}
                  style={styles.next}
                >
                  <Text style={styles.nextLabel}>Continue to Checkout →</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit meals"
                  onPress={() => setSummaryOpen(false)}
                  style={styles.summaryEdit}
                >
                  <Text style={styles.summaryEditLabel}>Edit meals</Text>
                </Pressable>
              </View>
            </View>
            </View>
          </View>
      ) : null}
      </View>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  pageBody: { flex: 1 },
  orderActions: { marginTop: spacing.md, gap: spacing.sm },
  summaryScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(16, 56, 43, 0.46)',
    zIndex: 2,
  },
  summaryScrimHit: { ...StyleSheet.absoluteFill },
  summaryFrame: {
    flex: 1,
    zIndex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  summarySheet: {
    position: 'relative',
    zIndex: 2,
    maxHeight: '100%',
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: spacing.lg,
    shadowColor: '#102016',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  summaryHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  summaryHeadCopy: { flex: 1 },
  summaryTitle: { fontFamily: fonts.bold, fontSize: font.xl, lineHeight: 28, color: colors.heading },
  summaryLead: { fontFamily: fonts.regular, marginTop: 2, fontSize: font.body, lineHeight: 22, color: colors.muted },
  summaryClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
    marginRight: -8,
  },
  summaryScroll: { marginTop: spacing.md, flexGrow: 0 },
  summaryMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.mint,
    borderRadius: 18,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryPhoto: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  summaryBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBadgeText: { fontFamily: fonts.bold, fontSize: font.body, color: colors.heading },
  summaryMealBody: { flex: 1 },
  summarySlot: {
    fontFamily: fonts.semibold,
    fontSize: font.body,
    lineHeight: 20,
    letterSpacing: 0.4,
    color: colors.muted,
  },
  summaryMealName: { fontFamily: fonts.bold, fontSize: font.lg, lineHeight: 24, color: colors.heading },
  summaryMealMeta: { fontFamily: fonts.regular, marginTop: 2, fontSize: font.body, lineHeight: 22, color: colors.muted },
  summaryTotals: {
    marginTop: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  summaryTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  summaryTotalLabel: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 22, color: colors.muted },
  summaryTotalValue: { fontFamily: fonts.bold, fontSize: font.lg, lineHeight: 24, color: colors.heading },
  summaryReview: {
    fontFamily: fonts.regular,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    fontSize: font.body,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.muted,
  },
  summaryEdit: {
    minHeight: 52,
    marginTop: spacing.sm,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  summaryEditLabel: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.heading },
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
  chosenPhoto: {
    alignSelf: 'stretch',
    height: 88,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chosenPhotoOpen: { opacity: 0.72 },
  chosenPhotoImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  chosenPhotoHit: { ...StyleSheet.absoluteFill },
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
  progressRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'stretch' },
  progressCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  progressColOn: { backgroundColor: colors.mint, borderColor: colors.primary },
  progressColPressed: { backgroundColor: colors.soft },
  progressSlot: { fontFamily: fonts.bold, fontSize: font.body, lineHeight: 22, color: colors.text, textAlign: 'center' },
  progressSlotOn: { color: colors.primary },
  progressPlaceholder: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  progressPlaceholderOn: { backgroundColor: colors.mintStrong, borderColor: colors.mintStrong },
  progressEmpty: { fontFamily: fonts.semibold, fontSize: font.body, lineHeight: 22, color: colors.muted, textAlign: 'center' },
  progressSegment: { width: '100%', height: 8, marginTop: spacing.xs, borderRadius: 4, backgroundColor: colors.soft },
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
  fitLine: { fontFamily: fonts.regular, marginTop: 2, fontSize: font.body, lineHeight: 22, color: colors.text },
  mealMeta: { fontFamily: fonts.regular, marginTop: 2, fontSize: font.body, lineHeight: 24, color: colors.heading },
  searchBtn: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    paddingRight: spacing.sm,
  },
  searchBtnLabel: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.primary },
  orderNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#FFF4D6',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  orderNoteCopy: { flex: 1, minWidth: 0 },
  orderNoteKicker: { fontFamily: fonts.semibold, fontSize: font.sm, lineHeight: 20, color: colors.warning },
  orderNoteTitle: { fontFamily: fonts.bold, fontSize: font.body, lineHeight: 22, color: colors.heading, marginTop: 2 },
  orderNoteBody: { fontFamily: fonts.regular, fontSize: font.sm, lineHeight: 20, color: colors.text, marginTop: 2 },
  dayList: { gap: spacing.sm },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  deadline: { fontFamily: fonts.regular, fontSize: font.sm, lineHeight: 20, color: colors.primary },
  openPill: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openPillLabel: { fontFamily: fonts.semibold, fontSize: font.sm, color: colors.primary },
  dayRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.white,
    padding: spacing.sm,
  },
  dayRowOn: { borderColor: colors.primary, backgroundColor: colors.mint },
  dayRowPressed: { backgroundColor: colors.soft },
  dayPhoto: { width: 48, height: 48, borderRadius: 12 },
  dayPhotoEmpty: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.soft,
  },
  dayCopy: { flex: 1, minWidth: 0 },
  daySlot: { fontFamily: fonts.bold, fontSize: font.body, lineHeight: 22, color: colors.heading },
  daySlotOn: { color: colors.primary },
  dayName: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 22, color: colors.text },
  dayActions: { alignItems: 'flex-end' },
  dayAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  dayActionLabel: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.primary },
  dayRemoveLabel: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.danger },
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
    marginTop: spacing.lg,
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
  reviewNote: { marginTop: spacing.md, gap: 2 },
  reviewKcal: { fontFamily: fonts.semibold, fontSize: font.body, lineHeight: 24, color: colors.heading },
  reviewBody: { fontFamily: fonts.regular, marginTop: 2, fontSize: font.body, lineHeight: 22, color: colors.text },
  allergy: { fontFamily: fonts.regular, marginTop: spacing.lg, fontSize: font.body, lineHeight: 22, color: colors.text },
  next: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewButton: { marginTop: spacing.md },
  nextLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.white },
});