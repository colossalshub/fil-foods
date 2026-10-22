import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, card, font, radius, spacing } from '../theme/theme';

export default function FoodCard({ meal, onAdd }) {
  return (
    <View style={styles.card}>
      <View style={styles.thumb}><Text style={{ fontSize: 34 }}>{meal.emoji}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{meal.name}</Text>
        <Text style={styles.meta}>{meal.cuisine} · {meal.category} · {meal.calories} kcal</Text>
        <View style={styles.tags}>
          {meal.diets.map((d) => <Text key={d} style={styles.tag}>{d}</Text>)}
        </View>
        {meal.allergens.length > 0 && (
          <Text style={styles.allergen}>Contains: {meal.allergens.join(', ')}</Text>
        )}
        <View style={styles.bottom}>
          <Text style={styles.price}>₱{meal.price}</Text>
          <Pressable style={styles.add} onPress={() => onAdd(meal)}>
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...card, flexDirection: 'row', padding: spacing.md, marginBottom: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  name: { fontSize: font.md, fontWeight: '700', color: colors.primary },
  meta: { fontSize: font.xs, color: colors.muted, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  tag: { fontSize: 10, color: colors.secondary, backgroundColor: colors.tint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 4, marginTop: 2, overflow: 'hidden' },
  allergen: { fontSize: 10, color: colors.danger, marginTop: 4 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  price: { fontSize: font.md, fontWeight: '700', color: colors.text },
  add: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.sm },
  addText: { color: colors.white, fontSize: font.sm, fontWeight: '600' },
});
