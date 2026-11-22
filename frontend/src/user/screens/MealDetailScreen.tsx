import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Alert, Image,
} from 'react-native';
import BackHeader from '../components/BackHeader';
import AppPageShell from '../components/AppPageShell';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMealProfile } from '../hooks/useMealProfile';
import { recipientDisplayName } from '../domain/audience';
import { MEAL_DETAIL_COPY } from '../data/messages';
import {
  ORDER_MSG,
  formatPeso,
  isMealAvailable,
  parseQuantityInput,
  profileAllergensInMeal,
} from '../services/orderService';
import { MENU_CATALOG, mealInitials } from '../data/menuCatalog';
import { exceedsSodiumLimit, mealSodiumMg } from '../domain/sodium';
import { MEAL_PHOTOS } from '../data/mealPhotos';
import type { Meal } from '../types';
import { colors, font, radius, spacing, control, fonts } from '../theme/theme';

const MEAL_TIMES = new Set(['Breakfast', 'Lunch', 'Dinner']);

function mealTimeLabel(category?: string) {
  if (category && MEAL_TIMES.has(category)) return category;
  if (!category) return 'meal';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function profileReferenceLabel(accountFor: string | undefined, recipientName: string) {
  if (accountFor === 'family' && recipientName) return `${recipientName}'s profile`;
  return 'your profile';
}

function AllergenPill({ label, conflict }: { label: string; conflict: boolean }) {
  return (
    <View style={[styles.allergenPill, conflict ? styles.allergenPillWarn : styles.allergenPillNeutral]}>
      <Text style={[styles.allergenPillText, conflict && styles.allergenPillTextWarn]}>{label}</Text>
    </View>
  );
}

export default function MealDetailScreen({ route, navigation }: {
  route: { params?: { meal?: Meal; initials?: string } };
  navigation: {
    goBack: () => void;
    navigate: (name: string, params?: object, options?: { merge?: boolean }) => void;
    getParent?: () => { getParent?: () => { getParent?: () => { navigate: (name: string, params?: object) => void } | undefined } | undefined } | undefined;
  };
}) {
  const meal = route.params?.meal as Meal;
  const initialsOverride = route.params?.initials;
  const { user } = useAuth();
  const { addItem, items, removeItem } = useCart();
  const [qtyError, setQtyError] = useState('');
  const recipientName = user?.accountFor === 'family' ? recipientDisplayName(user.mealRecipient) : '';
  const warningRecipient = user?.accountFor === 'family' ? recipientName : '';

  const { profile } = useMealProfile(user);
  const available = isMealAvailable(meal);
  const allergens = useMemo(
    () => (profile ? profileAllergensInMeal(meal, profile) : []),
    [meal, profile],
  );
  const cartRow = items.find((row) => row.meal.id === meal.id);
  const listedAllergens = meal.allergens || [];
  const conflictSet = useMemo(() => new Set(allergens), [allergens]);
  const sodiumMg = mealSodiumMg(meal);
  const sodiumLimit = Number(profile?.nutritionTargets?.sodium) || 400;
  const sodiumOver = exceedsSodiumLimit(meal, sodiumLimit);

  const needsAccount = !user?.id || user.role === 'visitor';
  const menuItem = MENU_CATALOG.find((item) => (item.mealId || item.id) === meal.id);
  const isBreakfast = menuItem?.slot === 'Breakfast';
  const mealTime = mealTimeLabel(meal.category);
  const initials = mealInitials(meal.name, initialsOverride);
  const photo = meal?.id != null ? MEAL_PHOTOS[String(meal.id)] : undefined;
  const description = meal.description
    || `A ${meal.name.toLowerCase()} option from today's menu. Ingredients and allergen information are listed below.`;

  const onAdd = () => {
    if (needsAccount) {
      Alert.alert(MEAL_DETAIL_COPY.logInToOrderTitle, MEAL_DETAIL_COPY.logInToOrderBody, [
        { text: MEAL_DETAIL_COPY.notNow, style: 'cancel' },
        {
          text: MEAL_DETAIL_COPY.logIn,
          onPress: () => navigation.getParent?.()?.getParent?.()?.getParent?.()?.navigate('Login'),
        },
      ]);
      return;
    }
    if (!available || allergens.length) return;
    const result = parseQuantityInput('1');
    if (!result.ok) {
      setQtyError(result.message || '');
      return;
    }
    // Menu items go into the same one-per-meal-time order as Build Today's Meals (USR-18).
    if (menuItem && menuItem.slot !== 'Breakfast') {
      // Lunch and Dinner choices are customized first (vegetable style, or meat and cooking style).
      navigation.navigate('BuildMealCustomize', { todayMealId: menuItem.id, slot: menuItem.slot });
      return;
    }
    const error = menuItem
      ? addItem(meal, 1, undefined, { daySlot: menuItem.slot, todayMealId: menuItem.id })
      : addItem(meal, 1);
    if (error) {
      setQtyError(error);
      return;
    }
    Alert.alert(MEAL_DETAIL_COPY.addedToOrderTitle, MEAL_DETAIL_COPY.addedToOrderBody(meal.name), [
      { text: MEAL_DETAIL_COPY.keepBrowsing, style: 'cancel' },
      { text: MEAL_DETAIL_COPY.viewOrder, onPress: () => navigation.navigate('MealsList') },
    ]);
  };

  const onCheckout = () => {
    if (needsAccount) {
      onAdd();
      return;
    }
    if (!available || allergens.length) return;
    const alreadyChosen = menuItem
      ? items.some((row) => row.daySlot === menuItem.slot && row.meal.id === meal.id)
      : Boolean(cartRow);
    if (!alreadyChosen) {
      const result = parseQuantityInput('1');
      if (!result.ok) {
        setQtyError(result.message || '');
        return;
      }
      const error = menuItem
        ? addItem(meal, 1, undefined, { daySlot: menuItem.slot, todayMealId: menuItem.id })
        : addItem(meal, 1);
      if (error) {
        setQtyError(error);
        return;
      }
    }
    navigation.navigate('MealsList', { openSummary: true }, { merge: true });
  };

  const primaryLabel = !available
    ? MEAL_DETAIL_COPY.notAvailableCta
    : allergens.length
      ? MEAL_DETAIL_COPY.chooseAnotherMeal
      : MEAL_DETAIL_COPY.addToMealTime(mealTime);

  const onPrimary = () => {
    if (!available) return;
    if (allergens.length) {
      navigation.goBack();
      return;
    }
    onAdd();
  };

  const onRemove = () => {
    removeItem(meal.id);
    navigation.goBack();
  };

  const allergenWarningBody = allergens.length
    ? ORDER_MSG.mealAllergenBlocked(allergens.join(', '), warningRecipient || null)
    : '';

  const profileRef = profileReferenceLabel(user?.accountFor, recipientName);

  return (
    <AppPageShell edges={['top']} contentStyle={styles.screen}>
      <ScrollView
        style={styles.scrollFlex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <BackHeader
          title={MEAL_DETAIL_COPY.title}
          subtitle={MEAL_DETAIL_COPY.lead}
          backLabel={MEAL_DETAIL_COPY.backToMeals}
          backAccessibilityLabel={MEAL_DETAIL_COPY.backToMeals}
          onBack={() => navigation.goBack()}
        />

        {!available ? (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={22} color={colors.primary} />
            <View style={styles.bannerCopy}>
              <Text style={styles.infoBannerTitle}>{MEAL_DETAIL_COPY.unavailableTitle}</Text>
              <Text style={styles.infoBannerBody}>{MEAL_DETAIL_COPY.unavailableBody}</Text>
            </View>
          </View>
        ) : null}

        {allergens.length ? (
          <View style={styles.warnBanner}>
            <Ionicons name="alert-circle" size={22} color={colors.danger} />
            <View style={styles.bannerCopy}>
              <Text style={styles.warnBannerTitle}>{MEAL_DETAIL_COPY.allergenWarningTitle}</Text>
              <Text style={styles.warnBannerBody}>{allergenWarningBody}</Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.hero, !available && styles.heroUnavailable, photo ? styles.heroPhoto : null]}>
          {photo ? (
            <Image source={photo} style={styles.heroImage} resizeMode="cover" accessibilityLabel={`${meal.name} photo`} />
          ) : (
            <View style={[styles.heroCircle, !available && styles.heroCircleUnavailable]}>
              <Text style={[styles.heroInitials, !available && styles.heroInitialsMuted]}>{initials}</Text>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoTop}>
            <View style={styles.infoHeading}>
              <Text style={styles.mealName}>{meal.name}</Text>
              <View style={styles.metaRow}>
                {!available ? (
                  <View style={[styles.statusPill, styles.statusPillOff]}>
                    <Text style={[styles.statusPillText, styles.statusPillTextOff]}>
                      {MEAL_DETAIL_COPY.notAvailable}
                    </Text>
                  </View>
                ) : null}
                {meal.category ? (
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryPillText}>{mealTime}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Text style={styles.price}>{formatPeso(meal.price || 300)}</Text>
          </View>

          <Text style={styles.sectionLabel}>{MEAL_DETAIL_COPY.description}</Text>
          <Text style={styles.sectionBody}>{description}</Text>

          <Text style={styles.sectionLabel}>{MEAL_DETAIL_COPY.ingredients}</Text>
          <Text style={styles.sectionBody}>{(meal.ingredients || []).join(', ') || '—'}</Text>

          {sodiumMg != null ? (
            <>
              <Text style={styles.sectionLabel}>{MEAL_DETAIL_COPY.sodium}</Text>
              <Text style={styles.sectionBody}>{MEAL_DETAIL_COPY.sodiumAmount(sodiumMg)}</Text>
              {sodiumLimit > 0 ? (
                <Text style={sodiumOver ? styles.error : styles.sectionBody}>
                  {sodiumOver ? MEAL_DETAIL_COPY.sodiumAbove : MEAL_DETAIL_COPY.sodiumWithin}
                </Text>
              ) : null}
            </>
          ) : null}

          <Text style={styles.sectionLabel}>{MEAL_DETAIL_COPY.allergenInformation}</Text>
          <View style={styles.allergenRow}>
            {listedAllergens.length ? listedAllergens.map((label) => (
              <AllergenPill key={label} label={label} conflict={conflictSet.has(label)} />
            )) : (
              <Text style={styles.sectionBody}>{MEAL_DETAIL_COPY.noneListed}</Text>
            )}
          </View>

          <Text style={styles.profileNote}>
            {MEAL_DETAIL_COPY.listedAllergensProfileNote(profileRef)}
          </Text>
        </View>

        {qtyError ? <Text style={styles.error}>{qtyError}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        {cartRow ? (
          <Pressable accessibilityRole="button" onPress={onRemove} style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>{MEAL_DETAIL_COPY.removeFromOrder}</Text>
          </Pressable>
        ) : null}

        {isBreakfast && available && !allergens.length ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={MEAL_DETAIL_COPY.continueToCheckout}
            onPress={onCheckout}
            style={styles.primary}
          >
            <Text style={styles.primaryLabel}>{MEAL_DETAIL_COPY.continueToCheckout}</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          onPress={onPrimary}
          disabled={!available && !allergens.length}
          style={[
            styles.primary,
            isBreakfast && available && !allergens.length && styles.secondaryButton,
            !available && styles.primaryMuted,
          ]}
        >
          <Text style={[
            styles.primaryLabel,
            isBreakfast && available && !allergens.length && styles.secondaryButtonLabel,
            !available && styles.primaryLabelMuted,
          ]}
          >
            {primaryLabel}
          </Text>
        </Pressable>
      </View>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollFlex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: 0, paddingBottom: spacing.md },
  infoBanner: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.soft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoBannerTitle: { fontFamily: fonts.bold, fontSize: font.body, lineHeight: 24, color: colors.heading },
  infoBannerBody: { fontFamily: fonts.regular, marginTop: 4, fontSize: font.body, lineHeight: 24, color: colors.text },
  warnBanner: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warnBannerTitle: { fontFamily: fonts.bold, fontSize: font.body, lineHeight: 24, color: colors.danger },
  warnBannerBody: { fontFamily: fonts.regular, marginTop: 4, fontSize: font.body, lineHeight: 24, color: colors.text },
  bannerCopy: { flex: 1 },
  hero: {
    backgroundColor: colors.soft,
    borderRadius: radius.md,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  heroPhoto: { minHeight: 0 },
  heroImage: { width: '100%', height: 220 },
  heroUnavailable: { backgroundColor: colors.soft },
  heroCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCircleUnavailable: { backgroundColor: colors.white },
  heroInitials: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 36, color: colors.primary },
  heroInitialsMuted: { color: colors.inactive },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
  },
  infoTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  infoHeading: { flex: 1 },
  mealName: { fontFamily: fonts.semibold, fontSize: font.lg, color: colors.heading, lineHeight: 26 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  statusPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  statusPillOff: { borderColor: colors.border, backgroundColor: colors.soft },
  statusPillText: { fontFamily: fonts.semibold, fontSize: font.body, lineHeight: 24 },
  statusPillTextOff: { color: colors.text },
  categoryPill: {
    borderRadius: radius.pill,
    backgroundColor: colors.soft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  categoryPillText: { fontFamily: fonts.bold, fontSize: font.sm, color: colors.muted },
  price: { fontFamily: fonts.bold, fontSize: font.lg, color: colors.heading },
  sectionLabel: { fontFamily: fonts.bold, marginTop: spacing.lg, fontSize: font.body, color: colors.heading },
  sectionBody: { fontFamily: fonts.regular, marginTop: 6, fontSize: font.body, lineHeight: 24, color: colors.text },
  allergenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  allergenPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  allergenPillNeutral: { backgroundColor: colors.soft },
  allergenPillWarn: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.danger },
  allergenPillText: { fontFamily: fonts.semibold, fontSize: font.body, lineHeight: 24, color: colors.text },
  allergenPillTextWarn: { color: colors.danger },
  profileNote: { fontFamily: fonts.regular, marginTop: spacing.md, fontSize: font.body, lineHeight: 24, color: colors.muted },
  error: { fontFamily: fonts.regular, marginTop: spacing.md, color: colors.danger, fontSize: font.body },
  footer: {
    alignSelf: 'stretch',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.page,
  },
  secondaryAction: { marginBottom: spacing.sm, alignItems: 'center', minHeight: control.minHeight, justifyContent: 'center' },
  secondaryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonLabel: { color: colors.primary },
  secondaryActionText: { fontFamily: fonts.bold, fontSize: font.body, color: colors.primary },
  primary: {
    alignSelf: 'stretch',
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryMuted: { backgroundColor: colors.cardBorder },
  primaryLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.white },
  primaryLabelMuted: { color: colors.inactive },
});