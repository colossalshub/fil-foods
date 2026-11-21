import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BackHeader from '../components/BackHeader';
import AppPageShell from '../components/AppPageShell';
import AppInput from '../components/AppInput';
import Checkbox from '../components/Checkbox';
import {
  MENU_SLOT_SUBTITLE,
  allMenuMeals,
  resolveMenuMeal,
  type MenuCatalogItem,
  type MenuSlot,
} from '../data/menuCatalog';
import { useAuth } from '../context/AuthContext';
import { useMealProfile } from '../hooks/useMealProfile';
import { mealsForLabel, recipientDisplayName, warningRecipientName } from '../domain/audience';
import {
  ORDER_MSG,
  formatPeso,
  fuzzySearchMeals,
  profileAllergensInMeal,
  recommendationReason,
} from '../services/orderService';
import {
  mealMatchesNutritionalPreferences,
  nutritionIdsFromProfile,
  sortMealsForProfile,
} from '../services/profileService';
import type { Meal } from '../types';
import { MEAL_PHOTOS } from '../data/mealPhotos';
import { MEAL_DETAIL_COPY } from '../data/messages';
import { colors, font, radius, spacing, control, fonts, type } from '../theme/theme';

const MENU_SLOTS: MenuSlot[] = ['Breakfast', 'Lunch', 'Dinner'];

/** USR-26 / USR-13: label of the menu filter that applies the saved nutritional preferences. */
const NUTRITION_GOALS_LABEL = 'Use my nutrition goals';

function MenuRow({ item, photo, warnings, reason, onPress }: {
  item: MenuCatalogItem;
  photo?: number;
  warnings: string[];
  reason?: string;
  onPress: () => void;
}) {
  // USR-11 B / USR-12 (revised): a meal with a recorded allergen is disabled, with the reason shown.
  const blocked = warnings.length > 0;
  const available = item.available && !blocked;
  const initials = item.initials || item.name.slice(0, 2);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked }}
      accessibilityLabel={`${item.name}, ${formatPeso(item.price ?? 300)}${available ? ', available' : ', not available'}${warnings.length ? `, ${warnings.join(' ')}` : ''}`}
      onPress={onPress}
      disabled={blocked}
      style={[styles.row, blocked && styles.rowBlocked]}
    >
      <View style={styles.thumb}>
        {photo ? (
          <Image source={photo} style={styles.thumbImage} resizeMode="cover" accessibilityLabel={`${item.name} photo`} />
        ) : (
          <Text style={styles.thumbInitials}>{initials}</Text>
        )}
      </View>
      <View style={styles.rowMain}>
        <View style={styles.titleRow}>
          <Text style={styles.rowName}>{item.name}</Text>
          {item.price != null ? (
            <Text style={styles.rowPrice}>{formatPeso(item.price)}</Text>
          ) : null}
        </View>
        {item.subtitle ? <Text style={styles.rowSubtitle}>{item.subtitle}</Text> : null}
        {reason && warnings.length === 0 ? <Text style={styles.rowSubtitle}>{reason}</Text> : null}
        {!available && warnings.length === 0 ? (
          <Text style={styles.statusOff}>{MEAL_DETAIL_COPY.notAvailable}</Text>
        ) : null}
        {warnings.map((text) => (
          <Text key={text} style={styles.warning}>{text}</Text>
        ))}
      </View>
    </Pressable>
  );
}

type Row = { item: MenuCatalogItem; meal: Meal };

function groupBySection(rows: Row[]) {
  const sections = new Map<string, Row[]>();
  for (const row of rows) {
    const key = row.item.section;
    sections.set(key, [...(sections.get(key) || []), row]);
  }
  return [...sections.entries()].map(([title, items]) => ({ title, items }));
}

/**
 * Menu (USR-16, USR-12, USR-13, USR-17, USR-46): browse by meal time, search all
 * meals (OSA fuzzy search, USR-28 "Menu: browse and search meals"), filter with
 * the saved nutritional preferences, and rank by the meal recipient's
 * preferences. Meals with a recorded allergen are disabled and explained (revised USR-11/12).
 */
export default function MealsScreen({ navigation }: {
  navigation: {
    navigate: (name: string, params?: object) => void;
    goBack: () => void;
  };
}) {
  const { user } = useAuth();
  const { profile } = useMealProfile(user);
  const [slot, setSlot] = useState<MenuSlot>('Breakfast');
  const [query, setQuery] = useState('');
  const [useGoals, setUseGoals] = useState(false);
  const recipientName = warningRecipientName(user);
  const hasGoals = nutritionIdsFromProfile(profile).length > 0;
  const searching = query.trim().length > 0;

  const rows = useMemo(() => {
    let list = allMenuMeals();
    if (!searching) list = list.filter((row) => row.item.slot === slot);
    if (useGoals && hasGoals) {
      list = list.filter((row) => mealMatchesNutritionalPreferences(row.meal, profile));
    }
    const byMealId = new Map(list.map((row) => [row.meal.id, row]));
    let meals = list.map((row) => row.meal);
    if (searching) meals = fuzzySearchMeals(meals, query);
    // Search keeps its relevance order; browsing ranks by the recipient's profile (USR-12).
    else if (profile) meals = sortMealsForProfile(meals, profile);
    return meals.map((meal) => byMealId.get(meal.id)).filter((row): row is Row => Boolean(row));
  }, [slot, query, searching, useGoals, hasGoals, profile]);

  const warningsFor = (meal: Meal) => (profile
    ? profileAllergensInMeal(meal, profile).map((allergen) => ORDER_MSG.mealAllergenBlocked(allergen, recipientName))
    : []);

  const groups = useMemo(() => {
    if (!searching) return groupBySection(rows);
    return MENU_SLOTS
      .map((time) => ({ title: time, items: rows.filter((row) => row.item.slot === time) }))
      .filter((group) => group.items.length > 0);
  }, [rows, searching]);

  const openItem = (item: MenuCatalogItem) => {
    navigation.navigate('MealDetail', {
      meal: resolveMenuMeal(item),
      initials: item.initials,
    });
  };

  const forWhom = mealsForLabel(user?.accountFor, recipientDisplayName(user?.mealRecipient));

  return (
    <AppPageShell edges={['top']} contentStyle={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BackHeader
          title="Menu"
          subtitle={searching ? 'Results from every meal time' : MENU_SLOT_SUBTITLE[slot]}
          backLabel="Today's meals"
          backAccessibilityLabel="Back to today's meals"
          onBack={() => navigation.goBack()}
        />

        {hasGoals ? (
          <Checkbox checked={useGoals} onToggle={() => setUseGoals((on) => !on)}>
            {NUTRITION_GOALS_LABEL}
          </Checkbox>
        ) : (
          <Text style={styles.hint}>Save nutritional preferences in Account to filter the menu with them.</Text>
        )}


        <AppInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search meals"
          accessibilityLabel="Search meals"
          leadingIcon="search"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.search}
        />

        {!searching ? (
          <View style={styles.slots}>
            {MENU_SLOTS.map((item) => {
              const active = item === slot;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSlot(item)}
                  style={[styles.slot, active ? styles.slotOn : styles.slotOff]}
                >
                  <Text style={[styles.slotLabel, active && styles.slotLabelOn]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {profile && !searching ? (
          <Text style={styles.hint}>{`${forWhom}: best matches first. Meals with a recorded allergen are disabled.`}</Text>
        ) : null}
        {useGoals && hasGoals ? <Text style={styles.hint}>Only matching meals are shown.</Text> : null}

        {groups.length === 0 ? (
          <Text style={styles.empty} accessibilityLiveRegion="polite">{ORDER_MSG.noMeals}</Text>
        ) : null}

        {groups.map((section) => (
          <View key={section.title} style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((row, index) => (
                <View key={row.item.id}>
                  <MenuRow
                    item={row.item}
                    photo={MEAL_PHOTOS[String(row.meal.id)] || MEAL_PHOTOS[row.item.id]}
                    warnings={warningsFor(row.meal)}
                    reason={profile ? recommendationReason(row.meal, profile) : undefined}
                    onPress={() => openItem(row.item)}
                  />
                  {index < section.items.length - 1 ? <View style={styles.divider} /> : null}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  search: { marginTop: spacing.lg, marginBottom: spacing.sm },
  hint: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 22, color: colors.muted, marginBottom: spacing.sm },
  empty: { fontFamily: fonts.semibold, fontSize: font.body, lineHeight: 22, color: colors.text, marginTop: spacing.lg, textAlign: 'center' },
  rowBlocked: { opacity: 0.6 },
  warning: { fontFamily: fonts.semibold, marginTop: spacing.xs, fontSize: font.body, lineHeight: 22, color: colors.danger },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md },
  slot: {
    minHeight: control.minHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotOn: { backgroundColor: colors.primary },
  slotOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  slotLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.text },
  slotLabelOn: { color: colors.white },
  sectionBlock: { marginTop: spacing.lg },
  sectionTitle: {
    ...type.sectionTitle,
    marginBottom: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: control.minHeight,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: 64, height: 64 },
  thumbInitials: { fontFamily: fonts.semibold, fontSize: font.lg, lineHeight: 24, color: colors.primary },
  rowMain: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  rowName: { flex: 1, fontFamily: fonts.semibold, fontSize: font.lg, lineHeight: 24, color: colors.heading },
  rowSubtitle: { fontFamily: fonts.regular, marginTop: 2, fontSize: font.body, lineHeight: 24, color: colors.muted },
  statusOff: { fontFamily: fonts.semibold, marginTop: spacing.xs, fontSize: font.body, lineHeight: 24, color: colors.text },
  rowPrice: { fontFamily: fonts.semibold, fontSize: font.lg, lineHeight: 24, color: colors.heading },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.cardBorder, marginHorizontal: spacing.lg },
});