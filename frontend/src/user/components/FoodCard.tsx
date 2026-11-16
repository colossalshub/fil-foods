import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import type { Meal } from '../types';
import { formatPhp } from '../services/orderService';
import { MEAL_PHOTOS } from '../data/mealPhotos';
import { colors, card, font, radius, spacing, fonts } from '../theme/theme';

export default function FoodCard({ meal, onAdd, onPress, restrictionMatch }: {
  meal: Meal;
  onAdd: (meal: Meal) => void;
  onPress?: () => void;
  restrictionMatch?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, restrictionMatch && styles.cardHighlight]}
    >
      <View style={styles.thumb}>
        {MEAL_PHOTOS[meal.id] ? (
          <Image source={MEAL_PHOTOS[meal.id]} style={styles.thumbImage} resizeMode="cover" accessibilityLabel={`${meal.name} photo`} />
        ) : (
          <Text style={{ fontFamily: fonts.regular, fontSize: 42 }}>{meal.emoji}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{meal.name}</Text>
        <Text style={styles.category}>{meal.category}</Text>
        <Text style={styles.meta}>{meal.cuisine} · {meal.calories} kcal</Text>
        <View style={styles.tags}>
          {(meal.diets || []).map((d) => <Text key={d} style={styles.tag}>{d}</Text>)}
        </View>
        {restrictionMatch ? (
          <Text style={styles.match}>Matches your dietary restriction</Text>
        ) : null}
        {(meal.allergens || []).length > 0 && (
          <Text style={styles.allergen}>Contains: {(meal.allergens || []).join(', ')}</Text>
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
  card: { ...card, flexDirection: 'row', padding: spacing.md, marginBottom: spacing.md },
  cardHighlight: { borderColor: colors.action, backgroundColor: colors.soft },
  match: { fontFamily: fonts.semibold, fontSize: font.body, lineHeight: 22, color: colors.action, marginTop: 4 },
  thumb: { width: 86, height: 112, borderRadius: radius.md, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md, overflow: 'hidden' },
  thumbImage: { width: 86, height: 112 },
  name: { fontFamily: fonts.bold, fontSize: font.body, color: colors.primaryDark },
  category: { fontFamily: fonts.semibold, fontSize: font.body, lineHeight: 22, color: colors.secondary, marginTop: 2 },
  meta: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 22, color: colors.muted, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  tag: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 22, color: colors.secondary, backgroundColor: colors.tint, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 4, marginTop: 4, overflow: 'hidden' },
  allergen: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 22, color: colors.danger, marginTop: 4 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  price: { fontFamily: fonts.bold, fontSize: font.body, color: colors.text },
  add: { backgroundColor: colors.primary, paddingHorizontal: 18, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: fonts.semibold, color: colors.white, fontSize: font.body },
});
