import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AppPageShell from '../components/AppPageShell';
import PageHeader from '../components/PageHeader';
import AppButton from '../components/AppButton';
import OrderStatusBadge from '../components/OrderStatusBadge';
import RecommendedForYouSection from '../components/RecommendedForYouSection';
import { useAuth } from '../context/AuthContext';
import { HOME_COPY, MEAL_DETAIL_COPY } from '../data/messages';
import { MENU_CATALOG } from '../data/menuCatalog';
import { readyLunchChoice } from '../domain/readyMeals';
import { useMealProfile } from '../hooks/useMealProfile';
import { useTabScrollInset } from '../hooks/useTabScrollInset';
import { mealsForLabel, recipientDisplayName } from '../domain/audience';
import { getProfile } from '../services/profileService';
import { ORDER_MSG, profileAllergensInMeal } from '../services/orderService';
import {
  ORDER_STATUS,
  customerFacingStatus,
  isTerminalStatus,
  loadHomeOrders,
} from '../services/trackingService';
import type { Meal } from '../types';
import { card, colors, font, spacing, fonts } from '../theme/theme';

type HomeNavigation = {
  navigate: (name: string, params?: object) => void;
};

type ActiveOrderRow = {
  id: string;
  orderRef?: string;
  trackingNumber?: string;
  status?: string;
  totalLabel?: string;
  fulfillmentSummary?: string;
};

export default function HomeScreen({ navigation }: { navigation: HomeNavigation }) {
  const { user } = useAuth();
  const { profile, loading } = useMealProfile(user);
  const userId = user?.id;
  const [activeOrders, setActiveOrders] = useState<ActiveOrderRow[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [ordersError, setOrdersError] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const ordersRequest = useRef(0);
  const loadedUserId = useRef<string | null>(null);

  const account = useMemo(() => (userId ? getProfile(userId) : null), [userId]);

  const holderFirstName = useMemo(() => {
    const fromProfile = account?.firstName?.trim();
    if (fromProfile) return fromProfile;
    return user?.firstName?.trim() || recipientDisplayName(account || user) || 'there';
  }, [account, user]);

  const recipientName = useMemo(() => {
    if (account?.accountFor === 'family') {
      return recipientDisplayName(account.mealRecipient);
    }
    return recipientDisplayName(account);
  }, [account]);

  const homeSubtitle = useMemo(() => {
    if (account?.accountFor === 'family' && recipientName) {
      return HOME_COPY.orderingFor(recipientName);
    }
    return HOME_COPY.welcomeBack(holderFirstName);
  }, [account?.accountFor, holderFirstName, recipientName]);

  const mealsSectionTitle = useMemo(
    () => mealsForLabel(account?.accountFor, recipientName),
    [account?.accountFor, recipientName],
  );

  const syncOrders = useCallback(() => {
    const requestId = ordersRequest.current + 1;
    ordersRequest.current = requestId;
    if (!userId) {
      loadedUserId.current = null;
      setActiveOrders([]);
      setOrdersLoaded(true);
      setOrdersError(false);
      setOrdersLoading(false);
      return;
    }
    if (loadedUserId.current !== userId) {
      setActiveOrders([]);
      setOrdersLoaded(false);
      setOrdersError(false);
    }
    setOrdersLoading(true);
    loadHomeOrders(userId)
      .then((snapshot) => {
        if (ordersRequest.current !== requestId) return;
        loadedUserId.current = userId;
        setActiveOrders(
          snapshot.active.filter((order) => order.status && !isTerminalStatus(order.status)),
        );
        setOrdersLoaded(true);
        setOrdersError(false);
      })
      .catch(() => {
        if (ordersRequest.current !== requestId) return;
        setOrdersError(true);
      })
      .finally(() => {
        if (ordersRequest.current !== requestId) return;
        setOrdersLoading(false);
      });
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      const task = setTimeout(syncOrders, 0);
      return () => clearTimeout(task);
    }, [syncOrders]),
  );

  const openAccount = useCallback(() => {
    navigation.navigate('Account', { screen: 'AccountMain' });
  }, [navigation]);

  const openMeals = useCallback(() => {
    navigation.navigate('Meals', { screen: 'MealsList' });
  }, [navigation]);

  const addReadyMeal = useCallback((meal: Meal) => {
    const choice = readyLunchChoice(meal);
    const allergens = profile ? profileAllergensInMeal(meal, profile) : [];
    if (allergens.length) {
      Alert.alert(
        MEAL_DETAIL_COPY.allergenWarningTitle,
        ORDER_MSG.mealAllergenBlocked(allergens.join(', '), account?.accountFor === 'family' ? recipientName : null),
      );
      return;
    }
    if (choice) {
      navigation.navigate('Meals', {
        screen: 'BuildMealCustomize',
        params: {
          todayMealId: choice.catalogId,
          slot: 'Lunch',
          meatProtein: choice.meatProtein,
          cookingStyle: choice.cookingStyle,
        },
      });
      return;
    }
    const item = MENU_CATALOG.find((entry) => (entry.mealId || entry.id) === meal.id || entry.id === meal.id);
    if (!item) {
      openMeals();
      return;
    }
    if (item.slot === 'Breakfast') {
      navigation.navigate('Meals', { screen: 'MealDetail', params: { meal } });
      return;
    }
    navigation.navigate('Meals', {
      screen: 'BuildMealCustomize',
      params: { todayMealId: item.id, slot: item.slot },
    });
  }, [account?.accountFor, navigation, openMeals, profile, recipientName]);

  const openOrderDetails = useCallback((orderId: string) => {
    navigation.navigate('Orders', {
      screen: 'OrderDetail',
      params: { orderId },
    });
  }, [navigation]);

  const familyRecipient = account?.accountFor === 'family' && recipientName ? recipientName : null;
  const hasActiveOrder = activeOrders.length > 0;
  const tabInset = useTabScrollInset();

  return (
    <AppPageShell edges={['top']}>
      <View style={[styles.page, styles.scroll, { paddingBottom: tabInset + spacing.sm }]}>
        <PageHeader title={HOME_COPY.screenTitle} subtitle={homeSubtitle} />

        <View style={styles.shortcuts}>
          {([
            [HOME_COPY.browseMeals, openMeals],
            [HOME_COPY.myOrders, () => navigation.navigate('Orders', { screen: 'TrackingList' })],
            [HOME_COPY.myAccount, openAccount],
          ] as const).map(([label, onPress]) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={onPress}
              style={styles.shortcut}
            >
              <Text style={styles.shortcutLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {ordersError ? (
          <View style={styles.ordersError} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Text style={styles.ordersErrorText}>{HOME_COPY.ordersLoadError}</Text>
            <AppButton
              title={HOME_COPY.tryAgain}
              variant="outline"
              onPress={syncOrders}
              loading={ordersLoading}
              color={colors.primary}
            />
          </View>
        ) : null}

        {!ordersLoaded && !ordersError ? (
          <Text style={styles.ordersLoading} accessibilityLiveRegion="polite">{HOME_COPY.loadingOrders}</Text>
        ) : null}

        {hasActiveOrder ? (
          <View style={styles.panelCard}>
            <Text style={styles.panelTitle} accessibilityRole="header">{HOME_COPY.activeOrder}</Text>
            {activeOrders.map((order) => {
              const shownStatus = customerFacingStatus(order.status || '');
              const ready = shownStatus === ORDER_STATUS.READY_PICKUP || shownStatus === ORDER_STATUS.READY_DELIVERY;
              const label = [order.orderRef || order.id, shownStatus, order.fulfillmentSummary].filter(Boolean).join(', ');
              return (
                <Pressable
                  key={order.id}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityHint="Opens order details"
                  onPress={() => openOrderDetails(order.id)}
                  style={({ pressed }) => [
                    styles.activeOrderRow,
                    ready && styles.activeOrderReady,
                    pressed && styles.activeOrderPressed,
                  ]}
                >
                  <View style={styles.activeOrderMain}>
                    <Text style={styles.activeOrderRef} numberOfLines={1}>{order.orderRef || order.id}</Text>
                    {order.fulfillmentSummary ? (
                      <Text style={styles.activeOrderEta} numberOfLines={1}>{order.fulfillmentSummary}</Text>
                    ) : null}
                    {shownStatus ? (
                      <OrderStatusBadge status={shownStatus} prominent={ready} style={styles.activeOrderBadge} />
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={ready ? colors.primary : colors.muted} />
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <RecommendedForYouSection
          sectionTitle={mealsSectionTitle}
          recipientName={familyRecipient}
          profile={profile}
          loading={loading}
          onOpenMeal={addReadyMeal}
          onCompleteProfile={openAccount}
          fill
        />
      </View>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg },
  shortcuts: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  shortcut: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.white,
  },
  shortcutLabel: {
    fontFamily: fonts.bold,
    fontSize: font.body,
    lineHeight: 20,
    color: colors.primary,
    textAlign: 'center',
  },
  panelCard: {
    ...card,
    marginBottom: spacing.md,
    borderColor: colors.cardBorder,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
  },
  panelTitle: {
    fontFamily: fonts.bold,
    fontSize: font.lg,
    color: colors.heading,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  ordersError: { marginBottom: spacing.lg, gap: spacing.md },
  ordersErrorText: {
    fontFamily: fonts.regular,
    fontSize: font.body,
    lineHeight: 24,
    color: colors.heading,
  },
  ordersLoading: {
    fontFamily: fonts.regular,
    fontSize: font.body,
    lineHeight: 24,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  activeOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  activeOrderReady: { backgroundColor: colors.mint },
  activeOrderPressed: { backgroundColor: colors.mintStrong },
  activeOrderMain: { flex: 1, paddingVertical: spacing.xs },
  activeOrderBadge: { alignSelf: 'flex-start', marginTop: spacing.sm },
  activeOrderRef: { fontFamily: fonts.bold, fontSize: font.body, color: colors.heading },
  activeOrderEta: { fontFamily: fonts.regular, marginTop: 2, fontSize: font.body, lineHeight: 22, color: colors.heading },
  activeOrderTotal: { fontFamily: fonts.regular, marginTop: 2, fontSize: font.sm, color: colors.muted },
});
