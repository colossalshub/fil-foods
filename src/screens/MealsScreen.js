import { useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import FoodCard from '../components/FoodCard';
import Chip from '../components/Chip';
import FilterModal from '../components/FilterModal';
import { MEALS, CUISINES } from '../data/meals';
import { colors, font, radius, spacing } from '../theme/theme';

export default function MealsScreen() {
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState('All');
  const [filters, setFilters] = useState({ category: null, diets: [], allergens: [] });
  const [showFilters, setShowFilters] = useState(false);

  const activeCount = (filters.category ? 1 : 0) + filters.diets.length + filters.allergens.length;

  const results = useMemo(() => MEALS.filter((m) => {
    if (cuisine !== 'All' && m.cuisine !== cuisine) return false;
    if (query && !m.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (filters.category && m.category !== filters.category) return false;
    if (!filters.diets.every((d) => m.diets.includes(d))) return false;
    if (filters.allergens.some((a) => m.allergens.includes(a))) return false;
    return true;
  }), [query, cuisine, filters]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Meals" subtitle="Pick something good today" />
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput style={styles.searchInput} placeholder="Search meals" placeholderTextColor={colors.inactive} value={query} onChangeText={setQuery} />
        </View>
        <Pressable style={styles.filterBtn} onPress={() => setShowFilters(true)}>
          <Ionicons name="options" size={18} color={colors.white} />
          {activeCount > 0 && <Text style={styles.badge}>{activeCount}</Text>}
        </Pressable>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CUISINES.map((c) => <Chip key={c} label={c} active={cuisine === c} onPress={() => setCuisine(c)} />)}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <FoodCard meal={item} onAdd={(m) => Alert.alert('Cart coming soon', `"${m.name}" will be addable once ordering is built.`)} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No meals match your search or filters.</Text>}
      />

      <FilterModal visible={showFilters} filters={filters} onChange={setFilters} onClose={() => setShowFilters(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  searchRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.md, alignItems: 'center' },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, height: 42 },
  searchInput: { flex: 1, marginLeft: 6, fontSize: font.md, color: colors.text },
  filterBtn: { width: 42, height: 42, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, color: colors.white, fontSize: 10, textAlign: 'center', lineHeight: 16, overflow: 'hidden' },
  chips: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, fontSize: font.md },
});
