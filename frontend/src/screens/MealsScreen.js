import { useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import FoodCard from '../components/FoodCard';
import Chip from '../components/Chip';
import FilterModal from '../components/FilterModal';
import AppButton from '../components/AppButton';
import { MEALS, CUISINES } from '../data/meals';
import { useAuth } from '../context/AuthContext';
import {
  getProfileForMeals, mealRestrictionMatch,
} from '../services/profileService';
import {
  ORDER_MSG,
  getRecommendedMeals,
  searchAndFilterMeals,
} from '../services/orderService';
import { colors, font, radius, spacing, control } from '../theme/theme';

export default function MealsScreen({ navigation }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState('All');
  const [filters, setFilters] = useState({ category: null, diets: [], allergens: [] });
  const [showFilters, setShowFilters] = useState(false);
  const { width } = useWindowDimensions();

  const activeCount = (filters.category ? 1 : 0) + filters.diets.length + filters.allergens.length;

  const profile = useMemo(() => (user?.id ? getProfileForMeals(user.id) : null), [user]);

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
    }),
    [query, cuisineFiltered, filters, profile],
  );

  const recommendations = useMemo(
    () => getRecommendedMeals(cuisineFiltered, profile, 5),
    [cuisineFiltered, profile],
  );

  const openDetail = (meal) => navigation.navigate('MealDetail', { meal });

  const listHeader = (
    <View>
      <Text style={styles.recTitle}>Recommended for you</Text>
      {recommendations.emptyProfile ? (
        <View style={styles.recEmpty}>
          <Text style={styles.recEmptyText}>{ORDER_MSG.completeProfile}</Text>
          <AppButton
            title="Go to Profile"
            onPress={() => navigation.getParent()?.navigate('Profile')}
            style={styles.recBtn}
          />
        </View>
      ) : (
        <>
          {recommendations.items.map(({ meal, reason }) => (
            <Pressable key={`rec-${meal.id}`} onPress={() => openDetail(meal)} style={styles.recCard}>
              <Text style={styles.recName}>{meal.name}</Text>
              <Text style={styles.recReason}>{reason}</Text>
            </Pressable>
          ))}
          <Text style={styles.disclaimer}>{ORDER_MSG.recommendationsDisclaimer}</Text>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Meals" subtitle="Pick something good today" />
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput style={styles.searchInput} placeholder="Search meals" placeholderTextColor={colors.inactive} value={query} onChangeText={setQuery} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Filters" style={styles.filterBtn} onPress={() => setShowFilters(true)}>
          <Ionicons name="options" size={18} color={colors.white} />
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
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, minHeight: control.minHeight },
  searchInput: { flex: 1, marginLeft: 6, fontSize: font.body, color: colors.text },
  filterBtn: { width: control.minHeight, height: control.minHeight, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, color: colors.white, fontSize: 10, textAlign: 'center', lineHeight: 16, overflow: 'hidden' },
  chipScroll: { marginHorizontal: spacing.lg, marginTop: spacing.md, height: 32 },
  chips: { alignItems: 'center', gap: 8, height: 32 },
  chipsSpread: { flexGrow: 1, justifyContent: 'space-between' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, fontSize: font.body },
  recTitle: { fontSize: font.body, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  recCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  recName: { fontSize: font.body, fontWeight: '700', color: colors.text },
  recReason: { fontSize: font.md, color: colors.muted, marginTop: 4 },
  disclaimer: { fontSize: font.md, color: colors.muted, marginBottom: spacing.lg, lineHeight: 20 },
  recEmpty: { marginBottom: spacing.lg },
  recEmptyText: { fontSize: font.body, color: colors.text, marginBottom: spacing.sm },
  recBtn: { alignSelf: 'flex-start' },
});
