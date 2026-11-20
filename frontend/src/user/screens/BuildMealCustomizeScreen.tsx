import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BackHeader from '../components/BackHeader';
import AppPageShell from '../components/AppPageShell';
import { DAY_SLOTS, todayMealById, nextSlot, type DaySlot } from '../data/todayMenu';
import { MENU_CATALOG, customizedMenuMeal, resolveMenuMeal } from '../data/menuCatalog';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMealProfile } from '../hooks/useMealProfile';
import { warningRecipientName } from '../domain/audience';
import {
  COOKING_STYLES,
  MEAT_PROTEINS,
  ORDER_MSG,
  VEGETABLE_STYLES,
  customizationConflict,
  formatPeso,
  profileAllergensInMeal,
} from '../services/orderService';
import { SPECIAL_REQUEST_COPY } from '../data/messages';
import SpecialRequestEditor from '../components/SpecialRequestEditor';
import {
  feeForSpecialRequest,
  snapshotSpecialRequest,
  specialRequestLabel,
  validateSpecialRequest,
  type SpecialRequestDraft,
} from '../domain/specialRequest';
import MealPhoto from '../components/MealPhoto';
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

function ChoiceRow({ title, options, value, onChange, photoName }: {
  title: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
  photoName?: (option: string) => string;
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
              accessibilityLabel={option}
              onPress={() => onChange(option)}
              style={[styles.choiceCard, active && styles.choiceCardOn]}
            >
              <View style={styles.choicePhoto}>
                <MealPhoto meal={{ name: photoName ? photoName(option) : option }} fill decorative />
              </View>
              <Text style={[styles.choiceText, active && styles.choiceTextOn]} numberOfLines={2}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function BuildMealCustomizeScreen({ route, navigation }: {
  route: { params?: { todayMealId?: string; slot?: DaySlot; meatProtein?: string; cookingStyle?: string } };
  navigation: { goBack: () => void; navigate: (name: string, params?: object) => void };
}) {
  const todayMeal = todayMealById(route.params?.todayMealId || '');
  const slot = route.params?.slot || todayMeal?.slot || 'Lunch';
  const presetProtein = route.params?.meatProtein;
  const presetStyle = route.params?.cookingStyle;
  const { user } = useAuth();
  const { profile } = useMealProfile(user);
  const { addItem, items } = useCart();
  const [vegetableStyle, setVegetableStyle] = useState(
    () => todayMeal?.defaultVegetableStyle || VEGETABLE_STYLES[0],
  );
  const [meatProtein, setMeatProtein] = useState(
    () => presetProtein || todayMeal?.defaultMeatProtein || MEAT_PROTEINS[2],
  );
  const [cookingStyle, setCookingStyle] = useState(
    () => presetStyle || COOKING_STYLES[2],
  );
  const savedRequest = items.find((row) => row.daySlot === slot)?.specialRequest;
  const [requestMealId, setRequestMealId] = useState(route.params?.todayMealId || '');
  const [requestOpen, setRequestOpen] = useState(() => Boolean(savedRequest?.options.length || savedRequest?.note));
  const [request, setRequest] = useState<SpecialRequestDraft>(() => ({
    options: savedRequest?.options || [],
    note: savedRequest?.note || '',
  }));
  if ((route.params?.todayMealId || '') !== requestMealId) {
    setRequestMealId(route.params?.todayMealId || '');
    setRequestOpen(Boolean(savedRequest?.options.length || savedRequest?.note));
    setRequest({ options: savedRequest?.options || [], note: savedRequest?.note || '' });
    if (presetProtein) setMeatProtein(presetProtein);
    if (presetStyle) setCookingStyle(presetStyle);
  }

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

  // USR-18: a Lunch or Dinner choice is either vegetables (steamed, stir-fried or
  // Pinakbet) or meat (Beef, Pork, Chicken or Fish) with a Filipino cooking style.
  const isVegetableChoice = todayMeal.group === 'Vegetable choices';
  const chosenItem = MENU_CATALOG.find((item) => item.slot === slot && item.name === (isVegetableChoice ? vegetableStyle : meatProtein)
    && item.section === (isVegetableChoice ? 'Vegetable choices' : 'Meat choices'));
  const displayName = isVegetableChoice
    ? (vegetableStyle === 'Pinakbet' ? 'Pinakbet' : `${vegetableStyle} vegetables`)
    : `${meatProtein} ${cookingStyle}`;
  const calories = chosenItem?.calories ?? todayMeal.calories;
  const protein = chosenItem?.protein ?? todayMeal.protein;
  const highCalorie = calories >= 600;
  const baseItem = chosenItem || MENU_CATALOG.find((item) => item.id === todayMeal.id);
  const plate = baseItem
    ? customizedMenuMeal(baseItem, isVegetableChoice ? { vegetableStyle } : { meatProtein })
    : catalogMeal;
  const customization = isVegetableChoice
    ? { vegetableStyle }
    : { meatProtein, cookingStyle };
  const recipientName = warningRecipientName(user);
  const allergens = profile ? profileAllergensInMeal(plate, profile) : [];
  const restrictionConflict = profile ? customizationConflict(customization, profile) : '';
  const dietitianNote = isVegetableChoice ? DIETITIAN_NOTES[vegetableStyle] : DIETITIAN_NOTES[cookingStyle];
  // Point the user at the next meal time that still needs a meal, or to the review once all three are set.
  const filledSlots = new Set(items.map((row) => row.daySlot).filter(Boolean));
  const remaining = DAY_SLOTS.filter((item) => item !== slot && !filledSlots.has(item));
  const upcoming = remaining.length ? (remaining.includes(nextSlot(slot)) ? nextSlot(slot) : remaining[0]) : null;
  const nextLabel = upcoming ? `Next · Choose ${upcoming} →` : 'Save · Review today\'s meals';
  const draft = requestOpen ? request : { options: [], note: '' };
  const requestCheck = validateSpecialRequest(draft, profile?.allergies || []);
  const requestFee = requestCheck.ok ? feeForSpecialRequest(draft) : 0;
  const requestText = requestCheck.ok ? specialRequestLabel(draft) : '';

  const blocked = allergens.length > 0 || !requestCheck.ok;

  const saveMeal = () => {
    if (blocked) return false;
    const targetItem = chosenItem || MENU_CATALOG.find((item) => item.id === todayMeal.id);
    const mealForCart = targetItem ? resolveMenuMeal(targetItem) : catalogMeal;
    const cartMeal = { ...mealForCart, name: displayName, allergens: plate.allergens, ingredients: plate.ingredients };
    const error = addItem(
      cartMeal,
      1,
      customization,
      {
        daySlot: slot,
        todayMealId: targetItem?.id || todayMeal.id,
        specialRequest: snapshotSpecialRequest(draft),
      },
    );
    if (error) {
      Alert.alert('Could not add meal', error);
      return false;
    }
    return true;
  };

  const onSave = () => {
    if (!saveMeal()) return;
    navigation.navigate({
      name: 'MealsList',
      params: { advanceFromSlot: slot },
      merge: true,
    } as never);
  };

  const onCheckout = () => {
    if (!saveMeal()) return;
    navigation.navigate({
      name: 'MealsList',
      params: { openSummary: true },
      merge: true,
    } as never);
  };

  return (
    <AppPageShell edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackHeader
          title={`Build Your ${slot}`}
          backLabel="Today's meals"
          backAccessibilityLabel="Go back"
          onBack={() => navigation.goBack()}
        />
        {isVegetableChoice ? (
          <ChoiceRow title="Vegetables" options={[...VEGETABLE_STYLES]} value={vegetableStyle} onChange={setVegetableStyle} />
        ) : (
          <>
            <ChoiceRow title="Meat Option" options={[...MEAT_PROTEINS]} value={meatProtein} onChange={setMeatProtein} />
            <ChoiceRow
              title="Pinoy Cooking Style"
              options={[...COOKING_STYLES]}
              value={cookingStyle}
              onChange={setCookingStyle}
              photoName={(option) => `${meatProtein} ${option}`}
            />
          </>
        )}
        {requestOpen ? (
          <>
            <SpecialRequestEditor
              value={request}
              onChange={setRequest}
              allergies={profile?.allergies || []}
              mealPrice={todayMeal.price}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={SPECIAL_REQUEST_COPY.remove}
              onPress={() => {
                setRequest({ options: [], note: '' });
                setRequestOpen(false);
              }}
              style={styles.removeRequest}
            >
              <Text style={styles.removeRequestLabel}>{SPECIAL_REQUEST_COPY.remove}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={SPECIAL_REQUEST_COPY.add}
            onPress={() => setRequestOpen(true)}
            style={styles.addRequest}
          >
            <Text style={styles.addRequestLabel}>{SPECIAL_REQUEST_COPY.add}</Text>
          </Pressable>
        )}
        <Text style={styles.availabilityNote}>Subject to availability and Dietitian approval.</Text>

        <View style={[styles.summaryCard, allergens.length > 0 && styles.summaryWarn]}>
          <View style={styles.summaryPhoto}>
            <MealPhoto meal={{ name: displayName }} fill decorative />
          </View>
          <Text style={styles.summaryLabel}>{`Your ${slot}`}</Text>
          <Text style={styles.summaryName}>{displayName}</Text>
          <Text style={styles.summaryMeta}>
            {`${calories} Kcal · ${protein}g protein · ${formatPeso(todayMeal.price)}`}
          </Text>
          {requestText ? <Text style={styles.requestLine}>{requestText}</Text> : null}
          {requestFee ? (
            <Text style={styles.requestLine}>{`${SPECIAL_REQUEST_COPY.feeLabel} ${formatPeso(requestFee)}`}</Text>
          ) : null}
          {requestFee ? (
            <Text style={styles.requestTotal}>
              {`${SPECIAL_REQUEST_COPY.mealTotal} ${formatPeso(todayMeal.price + requestFee)}`}
            </Text>
          ) : null}
          {allergens.length ? (
            <Text style={styles.conflict}>Allergy conflict</Text>
          ) : null}
          {restrictionConflict ? <Text style={styles.conflict}>{restrictionConflict}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={upcoming ? `Next, choose ${upcoming}` : 'Save and review today\'s meals'}
            onPress={onSave}
            disabled={blocked}
            accessibilityState={{ disabled: blocked }}
            style={[styles.next, blocked && styles.nextDisabled]}
          >
            <Text style={[styles.nextText, blocked && styles.nextLabelDisabled]}>{nextLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue to Checkout"
            onPress={onCheckout}
            disabled={blocked}
            accessibilityState={{ disabled: blocked }}
            style={[styles.checkout, blocked && styles.nextDisabled]}
          >
            <Text style={[styles.nextLabel, blocked && styles.nextLabelDisabled]}>Continue to Checkout</Text>
          </Pressable>
        </View>

        {highCalorie ? (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>{`${calories} Kcal – Review recommended`}</Text>
            <Text style={styles.alertBody}>{`This combination is higher in calories than your usual ${slot.toLowerCase()}.`}</Text>
          </View>
        ) : null}

        {allergens.length ? (
          <View style={styles.allergyBox}>
            <Ionicons name="alert-circle" size={22} color={colors.danger} />
            <View style={styles.allergyCopy}>
              <Text style={styles.allergyTitle}>Allergy check</Text>
              {allergens.map((item) => (
                <Text key={item} style={styles.allergyText}>
                  {ORDER_MSG.mealAllergenBlocked(item, recipientName)}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        <Text style={styles.dietitianTitle}>Dietitian note</Text>
        <Text style={styles.dietitianBody}>{dietitianNote}</Text>
      </ScrollView>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  actions: { marginTop: spacing.md, gap: spacing.sm },
  choiceSection: { marginBottom: spacing.lg },
  addRequest: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  addRequestLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.primary },
  removeRequest: { minHeight: 48, justifyContent: 'center', marginTop: -spacing.sm, marginBottom: spacing.md },
  removeRequestLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.danger },
  availabilityNote: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 22, color: colors.muted, marginBottom: spacing.md },
  requestLine: { fontFamily: fonts.regular, marginTop: spacing.sm, fontSize: font.body, lineHeight: 24, color: colors.text },
  requestTotal: { fontFamily: fonts.bold, marginTop: spacing.xs, fontSize: font.body, color: colors.heading },
  choiceTitle: { fontFamily: fonts.bold, fontSize: font.body, color: colors.heading, marginBottom: spacing.sm },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choiceCard: {
    width: 112,
    minHeight: 156,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  choiceCardOn: { borderWidth: 2, borderColor: colors.primary },
  choicePhoto: {
    height: 96,
    backgroundColor: colors.mint,
    overflow: 'hidden',
  },
  choiceText: {
    fontFamily: fonts.bold,
    fontSize: font.body,
    lineHeight: 22,
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  choiceTextOn: { color: colors.primary },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryPhoto: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.mint,
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
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  alertTitle: { fontFamily: fonts.bold, fontSize: font.body, color: colors.danger },
  alertBody: { fontFamily: fonts.regular, marginTop: 4, fontSize: font.body, color: colors.text, lineHeight: 24 },
  allergyBox: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  allergyCopy: { flex: 1 },
  allergyTitle: { fontFamily: fonts.bold, fontSize: font.body, color: colors.danger },
  allergyText: { fontFamily: fonts.regular, marginTop: 4, fontSize: font.body, color: colors.text, lineHeight: 24 },
  dietitianTitle: { fontFamily: fonts.bold, marginTop: spacing.sm, fontSize: font.body, color: colors.heading },
  dietitianBody: { fontFamily: fonts.regular, marginTop: 4, fontSize: font.body, lineHeight: 22, color: colors.muted },
  next: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { fontFamily: fonts.bold, fontSize: font.body, color: colors.primary },
  checkout: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextDisabled: { backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border },
  nextLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.white },
  nextLabelDisabled: { color: colors.heading },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  missingText: { fontFamily: fonts.regular, fontSize: font.body, color: colors.muted },
  backLink: { fontFamily: fonts.bold, marginTop: spacing.md, color: colors.primary },
});