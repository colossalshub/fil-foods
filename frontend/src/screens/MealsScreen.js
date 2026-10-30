import { useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, TextInput, FlatList, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import FoodCard from '../components/FoodCard';
import Checkbox from '../components/Checkbox';
import Chip from '../components/Chip';
import FilterModal from '../components/FilterModal';
import AppButton from '../components/AppButton';
import { MEALS, CUISINES } from '../data/meals';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import NutritionDayPanel from '../components/NutritionDayPanel';
import {
  mealRestrictionMatch, saveNutritionalPreference,
} from '../services/profileService';
import { useMealProfile } from '../hooks/useMealProfile';
import {
  ORDER_MSG,
  getRecommendedMeals,
  searchAndFilterMeals,
} from '../services/orderService';
import { colors, card, font, radius, spacing, control } from '../theme/theme';

export default function MealsScreen({ navigation }) {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState('All');
  const [filters, setFilters] = useState({ category: null, diets: [], allergens: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [applyNutrition, setApplyNutrition] = useState(false);
  const { width } = useWindowDimensions();

  const activeCount = (filters.category ? 1 : 0) + filters.diets.length + filters.allergens.length;

  const { profile, loading: profileLoading } = useMealProfile(user);

  const cuisineFiltered = useMemo(
    () => MEALS.filter((m) => cuisine === 'All' || m.cuisine === cuisine),
    [cuisine],
  );

  const results = useMemo(
    () => searchAndFilterMeals(cuisineFiltered, {
      query,
      category: filters.category,
      diets: filters.diets,
      excludeAllergens: filters.allergens,
      profile,
      applyNutrition,
    }),
    [query, cuisineFiltered, filters, profile, applyNutrition],
  );

  const recommendations = useMemo(
    () => getRecommendedMeals(cuisineFiltered, profile, 5),
    [cuisineFiltered, profile],
  );

  const openDetail = (meal) => navigation.navigate('MealDetail', { meal });

  const listHeader = (
    <View>
      {itemCount > 0 ? (
        <AppButton
          title="Review order"
          onPress={() => navigation.navigate('Checkout')}
          style={styles.reviewOrderBtn}
        />
      ) : null}
      <Text style={styles.recTitle}>Recommended for you</Text>
      {profileLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.recEmpty} />
      ) : recommendations.emptyProfile ? (
        <View style={styles.recEmpty}>
          <Text style={styles.recEmptyText}>{ORDER_MSG.completeProfile}</Text>
          <AppButton
            title="Update Dietary Information"
            onPress={() => navigation.getParent()?.navigate('Account')}
            style={styles.recBtn}
          />
        </View>
      ) : recommendations.none ? (
        <Text style={styles.recEmptyText}>{ORDER_MSG.noSuggestions}</Text>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recScroller}>
            {recommendations.items.map(({ meal, reason }) => (
              <Pressable key={`rec-${meal.id}`} onPress={() => openDetail(meal)} style={styles.recCard}>
                <Text style={styles.recName} numberOfLines={2}>{meal.name}</Text>
                <Text style={styles.recReason} numberOfLines={3}>{reason}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.disclaimer}>{ORDER_MSG.recommendationsDisclaimer}</Text>
        </>
      )}
      {(profile?.nutritionalPreferences?.length || profile?.nutritionalPreference) ? (
        <Checkbox
          checked={applyNutrition}
          onToggle={() => setApplyNutrition((on) => !on)}
          accessibilityLabel="Use my nutrition goals"
        >
          Use my nutrition goals
        </Checkbox>
      ) : null}
    </View>
  );

  const listFooter = user?.id ? (
    <NutritionDayPanel
      profile={profile}
      targets={profile?.nutritionTargets}
      onSaveTargets={(target) => saveNutritionalPreference(
        user.id,
        profile?.nutritionalPreferences?.length
          ? profile.nutritionalPreferences
          : profile?.nutritionalPreference,
        target,
      )}
    />
  ) : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Meal" subtitle="Pick something good today" showBell />
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search meals"
            placeholderTextColor={colors.inactive}
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="Search meals"
          />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Filters" style={styles.filterBtn} onPress={() => setShowFilters(true)}>
          <Ionicons name="options" size={18} color={colors.white} />
          <Text style={styles.filterLabel}>Filters</Text>
          {activeCount > 0 && <Text style={styles.badge}>{activeCount}</Text>}
        </Pressable>
      </View>

      <View style={styles.chipScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, width < 520 && styles.chipsSpread]}>
          {CUISINES.map((c) => <Chip key={c} label={c} active={cuisine === c} onPress={() => setCuisine(c)} />)}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg }}
        ListHeaderComponent={user ? listHeader : null}
        ListFooterComponent={listFooter}
        renderItem={({ item }) => (
          <FoodCard
            meal={item}
            restrictionMatch={profile ? mealRestrictionMatch(item, profile) : false}
            onPress={() => openDetail(item)}
            onAdd={(m) => openDetail(m)}
          />
        )}
        ListEmptyComponent={(
          <Text style={styles.empty}>
            {query.trim() ? ORDER_MSG.noMeals : ORDER_MSG.noMeals}
          </Text>
        )}
      />

      <FilterModal visible={showFilters} filters={filters} onChange={setFilters} onClose={() => setShowFilters(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  searchRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.md, alignItems: 'center' },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: control.minHeight },
  searchInput: { flex: 1, marginLeft: 6, fontSize: font.body, color: colors.text },
  filterBtn: { minWidth: control.minHeight, minHeight: control.minHeight, paddingHorizontal: 8, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  filterLabel: { color: colors.white, fontSize: font.body, fontWeight: '700' },
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, color: colors.white, fontSize: 10, textAlign: 'center', lineHeight: 16, overflow: 'hidden' },
  chipScroll: { marginHorizontal: spacing.lg, marginTop: spacing.md, height: control.minHeight },
  chips: { alignItems: 'center', gap: 8, height: control.minHeight },
  chipsSpread: { flexGrow: 1, justifyContent: 'space-between' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, fontSize: font.body },
  recTitle: { fontSize: font.body, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  recScroller: { gap: spacing.sm, paddingBottom: spacing.sm },
  recCard: { ...card, width: 200, padding: spacing.md },
  recName: { fontSize: font.body, fontWeight: '700', color: colors.text },
  recReason: { fontSize: font.sm, color: colors.muted, marginTop: 4, lineHeight: 18 },
  disclaimer: { fontSize: font.body, color: colors.muted, marginBottom: spacing.lg, lineHeight: 24 },
  recEmpty: { marginBottom: spacing.lg },
  recEmptyText: { fontSize: font.body, color: colors.text, marginBottom: spacing.sm },
  recBtn: { alignSelf: 'flex-start' },
  reviewOrderBtn: { marginBottom: spacing.md, alignSelf: 'stretch' },
});
