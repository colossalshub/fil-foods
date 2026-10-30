import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { listClientOrders, refreshBackendOrdersForUser } from '../services/trackingService';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import { useMealProfile } from '../hooks/useMealProfile';
import { MEALS } from '../data/meals';
import { ORDER_MSG, getRecommendedMeals } from '../services/orderService';
import { colors, card, font, radius, spacing } from '../theme/theme';

const STEPS = ['Confirmed', 'Preparing', 'Ready for Pick-up', 'Completed'];
const GREEN = colors.primary;
const GRAY = '#D9D9D9';

const STATUS_TO_STEP = {
  Confirmed: 'Confirmed',
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

function OrderProgress({ status }) {
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
  const [activeOrders, setActiveOrders] = useState([]);
  const { profile, loading: profileLoading } = useMealProfile(user);
  const recommendations = useMemo(
    () => getRecommendedMeals(MEALS, profile, 5),
    [profile],
  );

  const openMeal = (meal) => navigation.navigate('Meals', {
    screen: 'MealDetail',
    params: { meal },
  });

  const greeting = user?.firstName ? `Hello, ${user.firstName}.` : 'Hello.';

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user?.id) {
        setActiveOrders([]);
        return undefined;
      }
      if (isSupabaseConfigured) {
        refreshBackendOrdersForUser(user.id)
          .then((orders) => {
            if (!active) return;
            setActiveOrders((orders || []).filter((order) => !order.terminal));
          })
          .catch(() => {
            if (active) setActiveOrders([]);
          });
        return () => {
          active = false;
        };
      }
      const orders = listClientOrders(user.id);
      setActiveOrders(orders.filter((order) => !order.terminal));
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.heroTitle}>Good food, made for your needs.</Text>
          <Text style={styles.lead}>
            Browse meals matched to your health information, dietary needs, and preferences.
          </Text>
        </View>

        {activeOrders.length ? (
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
          <Text style={styles.noOrders}>You have no active orders</Text>
        )}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
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
          <View style={styles.recList}>
            {recommendations.items.map(({ meal, reason }) => (
              <Pressable
                key={meal.id}
                accessibilityRole="button"
                onPress={() => openMeal(meal)}
                style={({ pressed }) => [styles.recCard, pressed && styles.pressed]}
              >
                <View style={styles.recIcon}>
                  <Text style={styles.recEmoji}>{meal.emoji || '🍽️'}</Text>
                </View>
                <View style={styles.recCopy}>
                  <Text style={styles.recName}>{meal.name}</Text>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{reason}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
            <Text style={styles.disclaimer}>{ORDER_MSG.recommendationsDisclaimer}</Text>
          </View>
        )}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>What would you like to do?</Text>
          <Text style={styles.sectionHint}>Your profile helps us personalize your meals.</Text>
        </View>

        <AppButton
          title="Browse Meals"
          onPress={() => navigation.navigate('Meals')}
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
  recCard: {
    ...card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    minHeight: 44,
  },
  recIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recEmoji: { fontSize: 24, lineHeight: 30 },
  recCopy: { flex: 1 },
  recName: { fontSize: font.body, lineHeight: 22, fontWeight: '700', color: colors.primaryDark },
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
  label: { fontSize: 10, marginTop: 4, textAlign: 'center' },
});
