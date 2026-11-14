import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, useWindowDimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import AppButton from '../components/AppButton';
import FormMessage from '../components/FormMessage';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { listClientOrders, refreshBackendOrdersForUser, TRACKING_MSG } from '../services/trackingService';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import { useMealProfile } from '../hooks/useMealProfile';
import { MEALS } from '../data/meals';
import { MEAL_PHOTOS } from '../data/mealPhotos';
import { ORDER_MSG, formatPhp, getRecommendedMeals } from '../services/orderService';
import type { Meal } from '../types';
import { mealsForLabel, recipientDisplayName } from '../domain/audience';
import { colors, card, font, radius, spacing } from '../theme/theme';

const STEPS = ['For Dietitian Review', 'Awaiting Payment', 'Paid', 'Preparing', 'Ready for Pick-up', 'Completed'];
const GREEN = colors.primary;
const GRAY = '#D9D9D9';

const STATUS_TO_STEP: Record<string, string> = {
  'For Dietitian Review': 'For Dietitian Review',
  'Awaiting Payment': 'Awaiting Payment',
  Paid: 'Paid',
  Confirmed: 'For Dietitian Review',
  Preparing: 'Preparing',
  'Ready for Pick-up': 'Ready for Pick-up',
  Completed: 'Completed',
  'Ready for Delivery': 'Ready for Pick-up',
  'Out for Delivery': 'Ready for Pick-up',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  pending: 'Confirmed',
  ready_for_pick_up: 'Ready for Pick-up',
  ready_for_pickup: 'Ready for Pick-up',
  ready_for_delivery: 'Ready for Pick-up',
  out_for_delivery: 'Ready for Pick-up',
  completed: 'Completed',
};

function mealFacts(meal: Meal) {
  return [
    meal.protein ? `${meal.protein} g protein` : null,
    meal.calories ? `${meal.calories} kcal` : null,
    meal.sodium ? `${meal.sodium} mg sodium` : null,
    ...(meal.diets || []),
  ].filter(Boolean);
}

function RecommendationPoster({ meal, reason, width, onPress }: {
  meal: Meal;
  reason: string;
  width: number;
  onPress?: () => void;
}) {
  const photo = MEAL_PHOTOS[meal.id];
  const facts = mealFacts(meal);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${meal.name}. ${reason}`}
      onPress={onPress}
      style={({ pressed }) => [styles.posterPage, { width }, pressed && styles.pressed]}
    >
      <View style={styles.posterCard}>
        {photo ? (
          <Image
            source={photo}
            style={styles.posterImage}
            resizeMode="cover"
            accessibilityLabel={`${meal.name} photo`}
          />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterEmoji}>{meal.emoji || '🍽️'}</Text>
          </View>
        )}
        <View style={styles.posterBody}>
          <Text style={styles.posterName}>{meal.name}</Text>
          <Text style={styles.posterMeta}>{[meal.cuisine, meal.category].filter(Boolean).join(' · ')}</Text>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{reason}</Text>
          </View>
          {facts.length ? (
            <View style={styles.factRow}>
              {facts.map((fact) => (
                <View key={fact} style={styles.fact}>
                  <Text style={styles.factText}>{fact}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {meal.ingredients?.length ? (
            <Text style={styles.posterIngredients}>{meal.ingredients.join(', ')}</Text>
          ) : null}
          {meal.allergens?.length ? (
            <Text style={styles.posterAllergen}>Contains {meal.allergens.join(', ')}</Text>
          ) : null}
          {meal.price ? <Text style={styles.posterPrice}>{formatPhp(meal.price)}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const DOT = 8;
const DOT_GAP = spacing.sm;
const DOT_STEP = DOT + DOT_GAP;

const PILL = 18;

function PosterDots({ count, scrollX, pageWidth }: {
  count: number;
  scrollX: Animated.Value;
  pageWidth: number;
}) {
  const page = Math.max(pageWidth, 1);
  const indexes = Array.from({ length: count }, (_, index) => index);
  const translateX = scrollX.interpolate({
    inputRange: indexes.map((index) => index * page),
    outputRange: indexes.map((index) => index * DOT_STEP - (PILL - DOT) / 2),
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.dots}>
      {indexes.map((index) => <View key={index} style={styles.dot} />)}
      <Animated.View style={[styles.dotOn, { transform: [{ translateX }] }]} />
    </View>
  );
}

function OrderProgress({ status }: { status: string }) {
  const step = STATUS_TO_STEP[status] || 'Confirmed';
  const current = Math.max(0, STEPS.indexOf(step));
  return (
    <View style={progressStyles.row}>
      {STEPS.map((label, i) => {
        const done = i <= current;
        return (
          <View key={label} style={progressStyles.step}>
            <View style={progressStyles.track}>
              <View style={[progressStyles.line, { backgroundColor: i === 0 ? 'transparent' : i <= current ? GREEN : GRAY }]} />
              <View style={[progressStyles.dot, { backgroundColor: done ? GREEN : GRAY }]} />
              <View style={[progressStyles.line, { backgroundColor: i === STEPS.length - 1 ? 'transparent' : i < current ? GREEN : GRAY }]} />
            </View>
            <Text numberOfLines={2} style={[progressStyles.label, { color: done ? GREEN : '#888', fontWeight: i === current ? '700' : '400' }]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const [activeOrders, setActiveOrders] = useState<Array<{
    id: string;
    status: string;
    trackingNumber?: string;
    meals?: string;
    date?: string;
  }>>([]);
  const [activeOrdersLoading, setActiveOrdersLoading] = useState(true);
  const [activeOrdersError, setActiveOrdersError] = useState('');
  const { profile, loading: profileLoading } = useMealProfile(user);
  const recommendations = useMemo(
    () => getRecommendedMeals(MEALS, profile, 5),
    [profile],
  );
  const { width: windowWidth } = useWindowDimensions();
  const [posterWidth, setPosterWidth] = useState(Math.max(0, windowWidth - spacing.lg * 2));
  const scrollX = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    scrollX.setValue(0);
  }, [recommendations, scrollX]);

  const openMeal = (meal: Meal) => navigation.navigate('Meals', {
    screen: 'MealDetail',
    params: { meal },
    initial: false,
  });

  const greeting = user?.firstName ? `Hello, ${user.firstName}.` : 'Hello.';

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user?.id) {
        setActiveOrders([]);
        setActiveOrdersLoading(false);
        setActiveOrdersError('');
        return undefined;
      }
      if (isSupabaseConfigured) {
        setActiveOrdersLoading(true);
        setActiveOrdersError('');
        refreshBackendOrdersForUser(user.id)
          .then((orders) => {
            if (!active) return;
            setActiveOrders((orders || []).filter((order) => !order.terminal));
            setActiveOrdersLoading(false);
          })
          .catch(() => {
            if (!active) return;
            setActiveOrders([]);
            setActiveOrdersError(TRACKING_MSG.unableRefresh);
            setActiveOrdersLoading(false);
          });
        return () => {
          active = false;
        };
      }
      const orders = listClientOrders(user.id);
      setActiveOrders(orders.filter((order) => !order.terminal));
      setActiveOrdersLoading(false);
      setActiveOrdersError('');
      return undefined;
    }, [user]),
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader
        title="Food is Life"
        subtitle="Healthy meals, made with care"
        showBell
      />
      <ScrollView contentContainerStyle={styles.scroll} directionalLockEnabled>
        <View style={styles.hero}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.heroTitle}>Good food, made for your needs.</Text>
          <Text style={styles.lead}>
            Browse meals matched to your health information, dietary needs, and preferences.
          </Text>
        </View>

        {activeOrdersError ? <FormMessage messages={[activeOrdersError]} tone="error" /> : null}
        {activeOrdersLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.recLoading} />
        ) : activeOrdersError ? null : activeOrders.length ? (
          activeOrders.map((order) => (
              <View key={order.id} style={[styles.orderCard, styles.orderAccent]}>
                <View style={styles.orderTop}>
                  <Text style={styles.cardTitle}>Active order</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{order.status}</Text>
                  </View>
                </View>
                <Text style={styles.body}>Tracking: {order.trackingNumber}</Text>
                <OrderProgress status={order.status} />
                <AppButton
                  title="My Current Order"
                  onPress={() => navigation.navigate('Orders', {
                    screen: 'OrderDetail',
                    params: { orderId: order.id },
                  })}
                  style={styles.cardBtn}
                />
              </View>
          ))
        ) : (
          <View style={styles.orderCard}>
            <Text style={styles.noOrders}>You have no active orders</Text>
            <AppButton
              title="Browse Meals"
              onPress={() => navigation.navigate('Meals', { screen: 'MealsList' })}
              color={colors.action}
              style={styles.cardBtn}
            />
          </View>
        )}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>
            {mealsForLabel(user?.accountFor, recipientDisplayName(user?.mealRecipient))}
          </Text>
        </View>
        {profileLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.recLoading} />
        ) : recommendations.emptyProfile ? (
          <View style={styles.orderCard}>
            <Text style={styles.body}>{ORDER_MSG.completeProfile}</Text>
            <AppButton
              title="Update Dietary Information"
              onPress={() => navigation.navigate('Account')}
              style={styles.cardBtn}
            />
          </View>
        ) : recommendations.none ? (
          <Text style={styles.noOrders}>{ORDER_MSG.noSuggestions}</Text>
        ) : (
          <View
            style={styles.recList}
            onLayout={(event) => {
              const nextWidth = event.nativeEvent.layout.width;
              if (nextWidth > 0 && nextWidth !== posterWidth) setPosterWidth(nextWidth);
            }}
          >
            <Animated.FlatList
              data={recommendations.items}
              horizontal
              pagingEnabled
              nestedScrollEnabled
              snapToInterval={posterWidth || undefined}
              snapToAlignment="start"
              disableIntervalMomentum
              bounces={false}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.meal.id}
              scrollEventThrottle={16}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true },
              )}
              getItemLayout={(_, index) => ({ length: posterWidth, offset: posterWidth * index, index })}
              renderItem={({ item }) => (
                <RecommendationPoster
                  meal={item.meal}
                  reason={item.reason}
                  width={posterWidth}
                  onPress={() => openMeal(item.meal)}
                />
              )}
            />
            {recommendations.items.length > 1 ? (
              <View style={styles.posterFooter}>
                <PosterDots
                  count={recommendations.items.length}
                  scrollX={scrollX}
                  pageWidth={posterWidth}
                />
                <Text style={styles.swipeHint}>Swipe left for another recommendation</Text>
              </View>
            ) : null}
            <Text style={styles.disclaimer}>{ORDER_MSG.recommendationsDisclaimer}</Text>
          </View>
        )}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>What would you like to do?</Text>
          <Text style={styles.sectionHint}>Your profile helps us personalize your meals.</Text>
        </View>

        <AppButton
          title="Browse Meals"
          onPress={() => navigation.navigate('Meals', { screen: 'MealsList' })}
          color={colors.action}
          style={[styles.btn, styles.primaryAction]}
        />
        <AppButton
          title="My Orders"
          icon="receipt-outline"
          variant="outline"
          onPress={() => navigation.navigate('Orders', { screen: 'TrackingList' })}
          color={colors.primary}
          style={styles.btn}
        />
        <AppButton
          title="My Account"
          icon="person-outline"
          variant="outline"
          onPress={() => navigation.navigate('Account')}
          color={colors.primary}
          style={styles.btn}
        />
        {itemCount > 0 ? (
          <AppButton
            title="Review order"
            onPress={() => navigation.navigate('Meals', { screen: 'Checkout' })}
            color={colors.primary}
            style={styles.btn}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  pressed: { opacity: 0.85 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  hero: { ...card, padding: spacing.lg, marginBottom: spacing.xl },
  greeting: {
    fontSize: font.xl,
    lineHeight: 28,
    color: colors.primaryDark,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: font.title,
    lineHeight: 34,
    color: colors.primaryDark,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  lead: {
    fontSize: font.body,
    lineHeight: 24,
    color: colors.text,
  },
  orderCard: { ...card, padding: spacing.lg, marginBottom: spacing.xl },
  orderAccent: { borderColor: colors.accent, borderLeftWidth: 5 },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: { flex: 1, fontSize: font.body, fontWeight: '700', color: colors.primary },
  statusPill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 28,
    justifyContent: 'center',
  },
  statusPillText: { color: colors.white, fontSize: font.sm, lineHeight: 16, fontWeight: '700' },
  body: { fontSize: font.body, lineHeight: 24, color: colors.text },
  cardBtn: { marginTop: spacing.md, minHeight: 44 },
  noOrders: {
    fontSize: font.body,
    lineHeight: 24,
    color: colors.muted,
    marginBottom: spacing.xl,
  },
  recLoading: { marginBottom: spacing.xl },
  recList: { marginBottom: spacing.xl },
  posterPage: { minHeight: 44 },
  posterCard: { ...card, overflow: 'hidden' },
  posterImage: { width: '100%', height: 210, backgroundColor: colors.surface },
  posterPlaceholder: {
    height: 160,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterEmoji: { fontSize: 56, lineHeight: 64 },
  posterBody: { padding: spacing.lg, gap: spacing.sm },
  posterName: { fontSize: font.xl, lineHeight: 28, fontWeight: '800', color: colors.primaryDark },
  posterMeta: { fontSize: font.body, lineHeight: 22, color: colors.muted },
  factRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fact: {
    backgroundColor: colors.soft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  factText: { fontSize: font.sm, lineHeight: 16, fontWeight: '700', color: colors.primary },
  posterIngredients: { fontSize: font.body, lineHeight: 22, color: colors.text },
  posterAllergen: { fontSize: font.md, lineHeight: 20, fontWeight: '700', color: colors.warning },
  posterPrice: { fontSize: font.lg, lineHeight: 24, fontWeight: '800', color: colors.primaryDark },
  posterFooter: { alignItems: 'center', marginTop: spacing.md, gap: spacing.xs },
  dots: { flexDirection: 'row', alignItems: 'center', gap: DOT_GAP, height: DOT, position: 'relative' },
  dot: { width: DOT, height: DOT, borderRadius: radius.pill, backgroundColor: colors.border },
  dotOn: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PILL,
    height: DOT,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  swipeHint: { fontSize: font.sm, lineHeight: 16, color: colors.muted },
  tag: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    backgroundColor: colors.soft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagText: { fontSize: font.sm, lineHeight: 16, fontWeight: '700', color: colors.primary },
  disclaimer: {
    fontSize: font.md,
    lineHeight: 20,
    color: colors.text,
    marginTop: spacing.sm,
  },
  sectionHeading: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: font.xl, lineHeight: 28, fontWeight: '800', color: colors.primaryDark },
  sectionHint: { fontSize: font.body, lineHeight: 24, color: colors.muted, marginTop: spacing.xs },
  primaryAction: { paddingVertical: spacing.md, minHeight: 52 },
  btn: { marginBottom: spacing.md, minHeight: 48 },
});

const progressStyles = StyleSheet.create({
  row: { flexDirection: 'row', width: '100%', marginVertical: 8 },
  step: { flex: 1, alignItems: 'center' },
  track: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 10 },
  line: { flex: 1, height: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: font.body, marginTop: 4, textAlign: 'center' },
});
