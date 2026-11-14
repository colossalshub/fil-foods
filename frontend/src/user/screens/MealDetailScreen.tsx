import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Alert,
} from 'react-native';
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
import { mealInitials } from '../data/menuCatalog';
import type { Meal } from '../types';
import { colors, font, radius, spacing, control } from '../theme/theme';

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
    navigate: (name: string, params?: object) => void;
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

  const needsAccount = !user?.id || user.role === 'visitor';
  const mealTime = mealTimeLabel(meal.category);
  const initials = mealInitials(meal.name, initialsOverride);
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
    const error = addItem(meal, 1);
    if (error) {
      setQtyError(error);
      return;
    }
    Alert.alert(MEAL_DETAIL_COPY.addedToOrderTitle, MEAL_DETAIL_COPY.addedToOrderBody(meal.name), [
      { text: MEAL_DETAIL_COPY.keepBrowsing, style: 'cancel' },
      { text: MEAL_DETAIL_COPY.viewOrder, onPress: () => navigation.navigate('ChoosePlan') },
    ]);
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
    ? ORDER_MSG.mealAllergen(allergens.join(', '), warningRecipient || null)
    : '';

  const profileRef = profileReferenceLabel(user?.accountFor, recipientName);

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={styles.screen}>
      <ScrollView
        style={styles.scrollFlex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={MEAL_DETAIL_COPY.backToMeals}
          onPress={() => navigation.goBack()}
          style={styles.backRow}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={styles.backLabel}>{MEAL_DETAIL_COPY.backToMeals}</Text>
        </Pressable>

        <Text style={styles.title} accessibilityRole="header">{MEAL_DETAIL_COPY.title}</Text>
        <Text style={styles.lead}>{MEAL_DETAIL_COPY.lead}</Text>

        {!available ? (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={22} color="#2F6FA8" />
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

        <View style={[styles.hero, !available && styles.heroUnavailable]}>
          <View style={[styles.heroCircle, !available && styles.heroCircleUnavailable]}>
            <Text style={[styles.heroInitials, !available && styles.heroInitialsMuted]}>{initials}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoTop}>
            <View style={styles.infoHeading}>
              <Text style={styles.mealName}>{meal.name}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.statusPill, available ? styles.statusPillOn : styles.statusPillOff]}>
                  <Text style={[styles.statusPillText, available ? styles.statusPillTextOn : styles.statusPillTextOff]}>
                    {available ? MEAL_DETAIL_COPY.available : MEAL_DETAIL_COPY.notAvailable}
                  </Text>
                </View>
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          onPress={onPrimary}
          disabled={!available && !allergens.length}
          style={[styles.primary, !available && styles.primaryMuted]}
        >
          <Text style={[styles.primaryLabel, !available && styles.primaryLabelMuted]}>{primaryLabel}</Text>
        </Pressable>
      </View>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollFlex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: control.minHeight, marginBottom: spacing.sm },
  backLabel: { fontSize: font.body, fontWeight: '700', color: colors.primary },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: '#1C3B2E' },
  lead: { marginTop: spacing.xs, fontSize: font.body, lineHeight: 22, color: '#5C675F', marginBottom: spacing.md },
  infoBanner: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#E8F2FC',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoBannerTitle: { fontSize: font.body, fontWeight: '800', color: '#2F6FA8' },
  infoBannerBody: { marginTop: 4, fontSize: font.body, lineHeight: 22, color: '#3D5870' },
  warnBanner: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#FFF0EE',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warnBannerTitle: { fontSize: font.body, fontWeight: '800', color: colors.danger },
  warnBannerBody: { marginTop: 4, fontSize: font.body, lineHeight: 22, color: '#5C3D3A' },
  bannerCopy: { flex: 1 },
  hero: {
    backgroundColor: '#DCEAD8',
    borderRadius: 20,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroUnavailable: { backgroundColor: '#ECEEEA' },
  heroCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F6E7B4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCircleUnavailable: { backgroundColor: '#F3F5F2' },
  heroInitials: { fontSize: 28, fontWeight: '800', color: '#8A6A12' },
  heroInitialsMuted: { color: '#9AA39D' },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E4EAE2',
    padding: spacing.lg,
  },
  infoTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  infoHeading: { flex: 1 },
  mealName: { fontSize: font.lg, fontWeight: '800', color: '#1C3B2E', lineHeight: 26 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  statusPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  statusPillOn: { borderColor: '#1E7A45', backgroundColor: '#F1FAF4' },
  statusPillOff: { borderColor: '#C8CFC8', backgroundColor: '#F6F7F5' },
  statusPillText: { fontSize: font.sm, fontWeight: '700' },
  statusPillTextOn: { color: '#1E7A45' },
  statusPillTextOff: { color: '#8A948C' },
  categoryPill: {
    borderRadius: radius.pill,
    backgroundColor: '#F1F3F0',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  categoryPillText: { fontSize: font.sm, fontWeight: '700', color: '#5C675F' },
  price: { fontSize: font.lg, fontWeight: '800', color: '#1C3B2E' },
  sectionLabel: { marginTop: spacing.lg, fontSize: font.body, fontWeight: '800', color: '#1C3B2E' },
  sectionBody: { marginTop: 6, fontSize: font.body, lineHeight: 22, color: '#4E5B52' },
  allergenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  allergenPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  allergenPillNeutral: { backgroundColor: '#F6E7B4' },
  allergenPillWarn: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.danger },
  allergenPillText: { fontSize: font.sm, fontWeight: '700', color: '#8A6A12' },
  allergenPillTextWarn: { color: colors.danger },
  profileNote: { marginTop: spacing.md, fontSize: font.sm, lineHeight: 20, color: '#8A948C' },
  error: { marginTop: spacing.md, color: colors.danger, fontSize: font.body },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E6EBE3',
    backgroundColor: colors.authPage,
  },
  secondaryAction: { marginBottom: spacing.sm, alignItems: 'center', minHeight: control.minHeight, justifyContent: 'center' },
  secondaryActionText: { fontSize: font.body, fontWeight: '700', color: colors.primary },
  primary: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#1E4D38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryMuted: { backgroundColor: '#E4EAE2' },
  primaryLabel: { fontSize: font.body, fontWeight: '700', color: colors.white },
  primaryLabelMuted: { color: '#7E8C82' },
});