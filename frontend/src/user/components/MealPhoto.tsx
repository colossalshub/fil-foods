import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MEAL_PHOTOS } from '../data/mealPhotos';
import { colors, radius } from '../theme/theme';

type MealImage = number | string | { uri: string };

type MealPhotoMeal = {
  id?: string;
  name?: string;
  image?: MealImage;
};

function imageSource(image: MealImage | undefined, id?: string, name?: string): ImageSourcePropType | null {
  if (typeof image === 'number') return image;
  if (typeof image === 'string' && image.trim()) return { uri: image.trim() };
  if (image && typeof image === 'object' && image.uri) return { uri: image.uri };
  if (id && MEAL_PHOTOS[String(id)]) return MEAL_PHOTOS[String(id)];
  if (name && MEAL_PHOTOS[name]) return MEAL_PHOTOS[name];
  return null;
}

/**
 * Meal thumbnail. Uses `meal.image`, then the bundled photo for that id.
 * Swap the fallback in this file when real photos are ready for the rest of the menu.
 */
export default function MealPhoto({
  meal,
  size = 72,
  decorative = false,
  fill = false,
}: {
  meal: MealPhotoMeal;
  size?: number;
  decorative?: boolean;
  /** Stretch the photo to its parent instead of a fixed square. */
  fill?: boolean;
}) {
  const source = imageSource(meal.image, meal.id, meal.name);
  const label = meal.name ? `${meal.name} photo` : 'Meal photo';
  if (source) {
    return (
      <Image
        source={source}
        style={fill ? styles.fill : { width: size, height: size }}
        resizeMode="cover"
        accessible={!decorative}
        accessibilityLabel={decorative ? undefined : label}
      />
    );
  }
  return (
    <View
      style={[styles.placeholder, fill ? styles.fill : { width: size, height: size }]}
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : label}
    >
      <Ionicons name="restaurant-outline" size={Math.round(size * 0.42)} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  placeholder: {
    borderRadius: radius.md,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
