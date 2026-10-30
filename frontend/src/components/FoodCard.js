import { View, Text, Pressable, StyleSheet } from 'react-native';
import { formatPhp } from '../services/orderService';
import { colors, card, font, radius, spacing, control } from '../theme/theme';

export default function FoodCard({ meal, onAdd, onPress, restrictionMatch }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, restrictionMatch && styles.cardHighlight]}
    >
      <View style={styles.thumb}><Text style={{ fontSize: 42 }}>{meal.emoji}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{meal.name}</Text>
        <Text style={styles.category}>{meal.category}</Text>
        <Text style={styles.meta}>{meal.cuisine} · {meal.calories} kcal</Text>
        <View style={styles.tags}>
          {meal.diets.map((d) => <Text key={d} style={styles.tag}>{d}</Text>)}
        </View>
        {restrictionMatch ? (
          <Text style={styles.match}>Matches your dietary restriction</Text>
        ) : null}
        {meal.allergens.length > 0 && (
          <Text style={styles.allergen}>Contains: {meal.allergens.join(', ')}</Text>
        )}
        <View style={styles.bottom}>
          <Text style={styles.price}>{formatPhp(meal.price)}</Text>
          <Pressable style={styles.add} onPress={(e) => { e?.stopPropagation?.(); onAdd(meal); }}>
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...card, flexDirection: 'row', padding: spacing.md, marginBottom: spacing.md, overflow: 'hidden', shadowColor: colors.primaryDark, shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHighlight: { borderColor: colors.action, backgroundColor: colors.soft },
  match: { fontSize: font.xs, color: colors.action, fontWeight: '600', marginTop: 4 },
  thumb: { width: 86, minHeight: 112, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  name: { fontSize: font.body, fontWeight: '800', color: colors.primaryDark },
  category: { fontSize: font.md, color: colors.secondary, marginTop: 2, fontWeight: '600' },
  meta: { fontSize: font.xs, color: colors.muted, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  tag: { fontSize: 10, color: colors.secondary, backgroundColor: colors.tint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 4, marginTop: 2, overflow: 'hidden' },
  allergen: { fontSize: 10, color: colors.danger, marginTop: 4 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  price: { fontSize: font.md, fontWeight: '700', color: colors.text },
  add: { backgroundColor: colors.primary, paddingHorizontal: 16, minHeight: control.minHeight, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  addText: { color: colors.white, fontSize: font.body, fontWeight: '600' },
});
