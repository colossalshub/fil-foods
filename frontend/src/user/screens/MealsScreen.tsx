import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
} from '../services/orderService';
import {
  mealMatchesNutritionalPreferences,
  nutritionIdsFromProfile,
  sortMealsForProfile,
} from '../services/profileService';
import type { Meal } from '../types';
import { colors, font, radius, spacing, control, fonts } from '../theme/theme';

const MENU_SLOTS: MenuSlot[] = ['Breakfast', 'Lunch', 'Dinner'];

/** USR-26 / USR-13: label of the menu filter that applies the saved nutritional preferences. */
const NUTRITION_GOALS_LABEL = 'Use my nutrition goals';

function MenuRow({ item, warnings, onPress }: {
  item: MenuCatalogItem;
  warnings: string[];
  onPress: () => void;
}) {
  const available = item.available;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${formatPeso(item.price ?? 300)}${available ? ', available' : ', not available'}${warnings.length ? `, ${warnings.join(' ')}` : ''}`}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowName}>{item.name}</Text>
        {item.subtitle ? <Text style={styles.rowSubtitle}>{item.subtitle}</Text> : null}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, available ? styles.statusDotOn : styles.statusDotOff]} />
          <Text style={[styles.statusLabel, available ? styles.statusOn : styles.statusOff]}>
            {available ? 'Available' : 'Not available'}
          </Text>
        </View>
        {warnings.map((text) => (
          <Text key={text} style={styles.warning}>{text}</Text>
        ))}
      </View>
      {item.price != null ? (
        <Text style={styles.rowPrice}>{formatPeso(item.price)}</Text>
      ) : null}
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
  return [...sections.entries()].map(([title, items]) => ({ title: title.toUpperCase(), items }));
}

/**
 * Menu (USR-16, USR-12, USR-13, USR-17, USR-46): browse by meal time, search all
 * meals (OSA fuzzy search, USR-28 "Menu: browse and search meals"), filter with
 * the saved nutritional preferences, and rank by the meal recipient's
 * preferences with allergen meals listed last and warned.
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
    ? profileAllergensInMeal(meal, profile).map((allergen) => ORDER_MSG.mealAllergen(allergen, recipientName))
    : []);

  const groups = useMemo(() => {
    if (!searching) return groupBySection(rows);
    return MENU_SLOTS
      .map((time) => ({ title: time.toUpperCase(), items: rows.filter((row) => row.item.slot === time) }))
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
          subtitle={searching ? 'Search results from every meal time' : MENU_SLOT_SUBTITLE[slot]}
          backLabel="Today's meals"
          backAccessibilityLabel="Back to today's meals"
          onBack={() => navigation.goBack()}
        />

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

        {hasGoals ? (
          <Checkbox checked={useGoals} onToggle={() => setUseGoals((on) => !on)}>
            {NUTRITION_GOALS_LABEL}
          </Checkbox>
        ) : (
          <Text style={styles.hint}>Save nutritional preferences in Account to filter the menu with them.</Text>
        )}

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
          <Text style={styles.hint}>{`${forWhom}: best matches first. Meals with a listed allergen are last.`}</Text>
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
                    warnings={warningsFor(row.meal)}
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
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  search: { marginTop: spacing.lg, marginBottom: spacing.sm },
  hint: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 22, color: colors.muted, marginBottom: spacing.sm },
  empty: { fontFamily: fonts.semibold, fontSize: font.body, lineHeight: 22, color: colors.text, marginTop: spacing.lg, textAlign: 'center' },
  warning: { fontFamily: fonts.semibold, marginTop: spacing.xs, fontSize: font.body, lineHeight: 22, color: colors.danger },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md },
  slot: {
    minHeight: 40,
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
    fontFamily: fonts.bold,
    fontSize: font.sm,
    letterSpacing: 1.2,
    color: colors.inactive,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: control.minHeight,
  },
  rowMain: { flex: 1 },
  rowName: { fontFamily: fonts.bold, fontSize: font.body, lineHeight: 22, color: colors.heading },
  rowSubtitle: { fontFamily: fonts.regular, marginTop: 2, fontSize: font.body, lineHeight: 20, color: colors.muted },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusDotOn: { backgroundColor: '#1E7A45' },
  statusDotOff: { backgroundColor: '#B0B8B2' },
  statusLabel: { fontFamily: fonts.bold, fontSize: font.body },
  statusOn: { color: '#1E7A45' },
  statusOff: { color: colors.inactive },
  rowPrice: { fontFamily: fonts.bold, fontSize: font.body, lineHeight: 22, color: colors.heading },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E8EDE6', marginHorizontal: spacing.lg },
});