import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HOME_COPY } from '../data/messages';
import { RECOMMENDATION_MEALS } from '../data/meals';
import { PROFILE_DIET_OPTIONS } from '../constants/profileFormOptions';
import type { Meal, MealMatchProfile } from '../types';
import {
  ORDER_MSG,
  formatPeso,
  getRecommendedMeals,
  recommendationReason,
} from '../services/orderService';
import { card, colors, font, radius, spacing, control } from '../theme/theme';

function profileMatchChips(profile: MealMatchProfile | null | undefined) {
  if (!profile) return [];
  const chips: string[] = [];
  for (const allergy of profile.allergies || []) {
    const name = allergy.name?.trim();
    if (!name) continue;
    chips.push(name.toLowerCase().includes('allergy') ? name : `${name} allergy`);
  }
  for (const condition of profile.healthConditions || []) {
    if (condition.trim()) chips.push(condition.trim());
  }
  for (const restriction of profile.dietaryRestrictions || []) {
    const text = restriction.trim();
    if (!text) continue;
    const fromList = PROFILE_DIET_OPTIONS.includes(text);
    chips.push(fromList ? text : `${text} (doctor)`);
  }
  return chips;
}

function mealMetaLine(meal: Meal, profile: MealMatchProfile | null | undefined) {
  const parts: string[] = [];
  if (meal.calories != null) parts.push(`${meal.calories} kcal`);
  const reason = recommendationReason(meal, profile);
  if (reason && reason !== 'Fits your dietary information') {
    parts.push(reason.replace(/^Matches your preference for /i, '').replace(/^Matches your /i, ''));
  }
  return parts.join(' · ') || reason;
}

function RecommendedMealCard({
  meal,
  profile,
  onPress,
  onAdd,
}: {
  meal: Meal;
  profile: MealMatchProfile | null | undefined;
  onPress: () => void;
  onAdd: () => void;
}) {
  const meta = mealMetaLine(meal, profile);
  const price = meal.price != null ? formatPeso(meal.price) : null;

  return (
    <View style={styles.mealCard}>
      <View style={styles.mealThumb} accessibilityElementsHidden>
        {meal.emoji ? (
          <Text style={styles.mealEmoji}>{meal.emoji}</Text>
        ) : (
          <Ionicons name="restaurant" size={26} color={colors.primary} />
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={styles.mealMain}
      >
        <View style={styles.suitableBadge}>
          <Text style={styles.suitableBadgeText}>{HOME_COPY.suitableForYou}</Text>
        </View>
        <Text style={styles.mealName}>{meal.name}</Text>
        <Text style={styles.mealMeta}>{meta}</Text>
        {price ? <Text style={styles.mealPrice}>{price}</Text> : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${HOME_COPY.addMeal} ${meal.name}`}
        onPress={onAdd}
        style={styles.addButton}
      >
        <Text style={styles.addButtonText}>{HOME_COPY.addMeal}</Text>
      </Pressable>
    </View>
  );
}

export default function RecommendedForYouSection({
  sectionTitle,
  profile,
  loading,
  onOpenMeal,
  onCompleteProfile,
}: {
  sectionTitle: string;
  profile: MealMatchProfile | null | undefined;
  loading?: boolean;
  onOpenMeal: (meal: Meal) => void;
  onCompleteProfile?: () => void;
}) {
  const chips = useMemo(() => profileMatchChips(profile), [profile]);
  const recommendations = useMemo(
    () => getRecommendedMeals(RECOMMENDATION_MEALS, profile, 5),
    [profile],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">{sectionTitle}</Text>
      <Text style={styles.lead}>{HOME_COPY.recommendedLead}</Text>

      {chips.length ? (
        <View style={styles.profileCard}>
          <Text style={styles.profileCardTitle}>{HOME_COPY.matchedToProfile}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {chips.map((label) => (
              <View key={label} style={styles.chip}>
                <Text style={styles.chipText}>{label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {loading ? (
        <Text style={styles.statusText}>{HOME_COPY.loadingRecommendations}</Text>
      ) : null}

      {!loading && recommendations.emptyProfile ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyBody}>{ORDER_MSG.completeProfile}</Text>
          {onCompleteProfile ? (
            <Pressable
              accessibilityRole="button"
              onPress={onCompleteProfile}
              style={styles.profileLink}
            >
              <Text style={styles.profileLinkText}>{HOME_COPY.openProfile}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!loading && !recommendations.emptyProfile && recommendations.none ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="search" size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{HOME_COPY.noMatchingTitle}</Text>
          <Text style={styles.emptyBody}>{HOME_COPY.noMatchingBody}</Text>
        </View>
      ) : null}

      {!loading && recommendations.items.length ? (
        <View style={styles.list}>
          {recommendations.items.map(({ meal }) => (
            <RecommendedMealCard
              key={meal.id}
              meal={meal}
              profile={profile}
              onPress={() => onOpenMeal(meal)}
              onAdd={() => onOpenMeal(meal)}
            />
          ))}
        </View>
      ) : null}

      {!loading && !recommendations.emptyProfile ? (
        <Text style={styles.disclaimer}>{ORDER_MSG.recommendationsDisclaimer}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm },
  title: { fontSize: font.lg, lineHeight: 24, fontWeight: '800', color: colors.heading },
  lead: { marginTop: spacing.xs, fontSize: font.body, lineHeight: 22, color: colors.muted },
  profileCard: {
    marginTop: spacing.lg,
    ...card,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  profileCardTitle: {
    fontSize: font.sm,
    fontWeight: '800',
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.sm },
  chip: {
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  chipText: { fontSize: font.sm, fontWeight: '700', color: colors.heading },
  list: { marginTop: spacing.lg, gap: spacing.md },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...card,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    minHeight: control.minHeight,
  },
  mealThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealEmoji: { fontSize: 32 },
  mealMain: { flex: 1, paddingRight: spacing.xs },
  suitableBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.mintStrong,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: spacing.xs,
  },
  suitableBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  mealName: { fontSize: font.body, lineHeight: 22, fontWeight: '800', color: colors.heading },
  mealMeta: { marginTop: 2, fontSize: font.sm, lineHeight: 20, color: colors.muted },
  mealPrice: { marginTop: spacing.xs, fontSize: font.body, fontWeight: '800', color: colors.heading },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 40,
    minWidth: 64,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { fontSize: font.body, fontWeight: '700', color: colors.white },
  emptyCard: {
    marginTop: spacing.lg,
    ...card,
    borderColor: colors.cardBorder,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: font.lg, fontWeight: '800', color: colors.heading, textAlign: 'center' },
  emptyBody: {
    marginTop: spacing.sm,
    fontSize: font.body,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },
  profileLink: { marginTop: spacing.md, minHeight: control.minHeight, justifyContent: 'center' },
  profileLinkText: { fontSize: font.body, fontWeight: '700', color: colors.primary },
  statusText: { marginTop: spacing.lg, fontSize: font.body, color: colors.muted },
  disclaimer: {
    marginTop: spacing.md,
    fontSize: font.sm,
    lineHeight: 20,
    color: colors.inactive,
  },
});