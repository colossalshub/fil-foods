import { useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HOME_COPY, HOME_MEAL_NOTES } from '../data/messages';
import type { Meal, MealMatchProfile } from '../types';
import { mealCardCopy } from '../domain/homePresentation';
import { readyLunchMeals } from '../domain/readyMeals';
import { MEAL_PHOTOS } from '../data/mealPhotos';
import {
  ORDER_MSG,
  formatPeso,
  getRecommendedMeals,
} from '../services/orderService';
import MealPhoto from './MealPhoto';
import { card, colors, font, radius, spacing, fonts } from '../theme/theme';

function RecommendedMealCard({
  meal,
  width,
  fill,
  onPress,
}: {
  meal: Meal;
  width: number;
  fill?: boolean;
  onPress: () => void;
}) {
  const copy = mealCardCopy(meal);
  const price = meal.price != null ? formatPeso(meal.price) : null;
  const note = meal.id ? HOME_MEAL_NOTES[meal.id] : undefined;
  const label = [copy.title, note?.description, note?.benefit, price, HOME_COPY.addMeal].filter(Boolean).join('. ');

  return (
    <View style={[styles.mealCard, { width, marginRight: spacing.md }, fill && styles.mealCardFill]}>
      <View style={[styles.photoFrame, !fill && styles.photoFrameFixed, { width }]} pointerEvents="none">
        {meal.id && MEAL_PHOTOS[String(meal.id)] ? (
          <Image
            source={MEAL_PHOTOS[String(meal.id)]}
            style={styles.photo}
            resizeMode="cover"
            accessible={false}
          />
        ) : (
          <MealPhoto meal={meal} size={width} decorative />
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens this meal so you can edit it and add a special request"
        onPress={onPress}
        style={({ pressed }) => [styles.mealCopy, pressed && styles.mealCardPressed]}
      >
        <Text style={styles.mealName} numberOfLines={1}>{copy.title}</Text>
        {note ? <Text style={styles.mealDescription} numberOfLines={1}>{note.description}</Text> : null}
        <View style={styles.mealFooter}>
          {price ? <Text style={styles.mealPrice} numberOfLines={1}>{price}</Text> : <View />}
          <View style={styles.addChip} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Ionicons name="add" size={16} color={colors.white} />
            <Text style={styles.addChipText}>{HOME_COPY.addMeal}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function MealRail({
  meals,
  cardWidth,
  fill,
  onOpenMeal,
  label,
}: {
  meals: Meal[];
  cardWidth: number;
  fill?: boolean;
  onOpenMeal: (meal: Meal) => void;
  label: string;
}) {
  const step = cardWidth + spacing.md;
  const offset = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const countRef = useRef(meals.length);
  const stepRef = useRef(step);
  countRef.current = meals.length;
  stepRef.current = step;

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: () => false,
    // Claim the gesture only after a clear sideways swipe, so a downward
    // scroll of the page is left to the parent scroller.
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dx) > 28 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
    onPanResponderMove: (_, gesture) => {
      const max = Math.max(0, countRef.current - 1) * stepRef.current;
      const next = Math.min(0, Math.max(-max, -indexRef.current * stepRef.current + gesture.dx));
      offset.setValue(next);
    },
    onPanResponderRelease: (_, gesture) => {
      const current = indexRef.current;
      const last = Math.max(0, countRef.current - 1);
      let next = current;
      if (gesture.dx <= -48 && current < last) next = current + 1;
      else if (gesture.dx >= 48 && current > 0) next = current - 1;
      indexRef.current = next;
      setIndex(next);
      Animated.spring(offset, {
        toValue: -next * stepRef.current,
        useNativeDriver: true,
        bounciness: 0,
        speed: 20,
      }).start();
    },
    onPanResponderTerminate: () => {
      Animated.spring(offset, {
        toValue: -indexRef.current * stepRef.current,
        useNativeDriver: true,
        bounciness: 0,
        speed: 20,
      }).start();
    },
  })).current;

  const atEnd = meals.length > 1 && index >= meals.length - 1;

  const goBack = () => {
    indexRef.current = 0;
    setIndex(0);
    Animated.spring(offset, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  };

  return (
    <View style={[styles.railViewport, fill && styles.railFill]}>
      <View
        style={[fill ? styles.railFill : undefined, styles.railGesture]}
        accessibilityLabel={label}
        {...pan.panHandlers}
      >
        <Animated.View style={[styles.railTrack, fill && styles.railTrackFill, { transform: [{ translateX: offset }] }]}>
          {meals.map((meal) => (
            <RecommendedMealCard
              key={meal.id}
              meal={meal}
              width={cardWidth}
              fill={fill}
              onPress={() => onOpenMeal(meal)}
            />
          ))}
        </Animated.View>
      </View>
      {atEnd ? (
        <View style={[styles.goBackWrap, { left: cardWidth }]} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={HOME_COPY.goBack}
            accessibilityHint="Returns to the first meal"
            onPress={goBack}
            style={styles.goBack}
          >
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <Text style={styles.goBackText}>{HOME_COPY.goBack}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function RecommendedForYouSection({
  sectionTitle,
  recipientName,
  profile,
  loading,
  onOpenMeal,
  onCompleteProfile,
  fill = false,
}: {
  sectionTitle: string;
  recipientName?: string | null;
  profile: MealMatchProfile | null | undefined;
  loading?: boolean;
  onOpenMeal: (meal: Meal) => void;
  onCompleteProfile?: () => void;
  /** Stretch the meal cards into the space left on Home so the section stays on screen. */
  fill?: boolean;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(280, Math.max(168, windowWidth - spacing.lg * 2 - 128));
  const namedRecipient = recipientName?.trim() || '';
  const recommendations = useMemo(() => {
    const offered = readyLunchMeals();
    const result = getRecommendedMeals(offered, profile, offered.length);
    const order = new Map(offered.map((meal, index) => [meal.id, index]));
    return {
      ...result,
      items: [...result.items].sort(
        (a, b) => (order.get(a.meal.id) ?? 0) - (order.get(b.meal.id) ?? 0),
      ),
    };
  }, [profile]);
  const noMatchBody = namedRecipient
    ? HOME_COPY.noMatchingBodyFor(namedRecipient)
    : HOME_COPY.noMatchingBody;

  return (
    <View style={[styles.wrap, fill && styles.wrapFill]}>
      <Text style={styles.title} accessibilityRole="header">{sectionTitle}</Text>

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
          <Text style={styles.emptyBody}>{noMatchBody}</Text>
        </View>
      ) : null}

      {!loading && recommendations.items.length ? (
        <MealRail
          meals={recommendations.items.map(({ meal }) => meal)}
          cardWidth={cardWidth}
          fill={fill}
          onOpenMeal={onOpenMeal}
          label={sectionTitle}
        />
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm },
  wrapFill: { flex: 1, marginTop: 0, minHeight: 0 },
  title: { fontFamily: fonts.bold, fontSize: font.lg, lineHeight: 24, color: colors.heading },
  lead: { fontFamily: fonts.regular, marginTop: spacing.xs, fontSize: font.body, lineHeight: 22, color: colors.muted },
  railViewport: {
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  railGesture: { touchAction: 'pan-y' },
  railFill: { flex: 1, minHeight: 0 },
  goBackWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goBack: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goBackText: {
    fontFamily: fonts.semibold,
    fontSize: font.body,
    lineHeight: 24,
    color: colors.primary,
  },
  railTrack: { flexDirection: 'row' },
  railTrackFill: { height: '100%' },
  mealCard: {
    ...card,
    borderColor: colors.cardBorder,
    padding: 0,
    overflow: 'hidden',
  },
  mealCardFill: { height: '100%' },
  mealCardPressed: { opacity: 0.92 },
  photoFrame: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: colors.mint,
  },
  photoFrameFixed: { flex: 0, height: 168 },
  photo: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  mealCopy: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  mealFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
  },
  addChipText: {
    fontFamily: fonts.semibold,
    fontSize: font.sm,
    lineHeight: 20,
    color: colors.white,
  },
  mealName: {
    fontFamily: fonts.semibold,
    fontSize: font.lg,
    lineHeight: 24,
    color: colors.heading,
  },
  mealDescription: {
    fontFamily: fonts.regular,
    fontSize: font.body,
    lineHeight: 22,
    color: colors.text,
  },
  mealBenefit: {
    fontFamily: fonts.semibold,
    fontSize: font.body,
    lineHeight: 22,
    color: colors.primary,
  },
  mealPrice: { fontFamily: fonts.bold, fontSize: font.body, lineHeight: 24, color: colors.heading },
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
  emptyTitle: { fontFamily: fonts.bold, fontSize: font.lg, color: colors.heading, textAlign: 'center' },
  emptyBody: {
    fontFamily: fonts.regular,
    marginTop: spacing.sm,
    fontSize: font.body,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },
  profileLink: { marginTop: spacing.md, minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md },
  profileLinkText: { fontFamily: fonts.bold, fontSize: font.body, color: colors.primary },
  statusText: { fontFamily: fonts.regular, marginTop: spacing.lg, fontSize: font.body, color: colors.muted },
  disclaimer: {
    fontFamily: fonts.regular,
    marginTop: spacing.sm,
    fontSize: font.sm,
    lineHeight: 20,
    color: colors.muted,
  },
});
