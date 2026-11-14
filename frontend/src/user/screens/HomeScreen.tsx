import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AppPageShell from '../components/AppPageShell';
import AppButton from '../components/AppButton';
import OrderStatusBadge from '../components/OrderStatusBadge';
import RecommendedForYouSection from '../components/RecommendedForYouSection';
import { useAuth } from '../context/AuthContext';
import { HOME_COPY, MSG } from '../data/messages';
import { useMealProfile } from '../hooks/useMealProfile';
import { mealsForLabel, recipientDisplayName } from '../domain/audience';
import { getProfile } from '../services/profileService';
import {
  isTerminalStatus,
  listClientOrders,
  refreshBackendOrdersForUser,
} from '../services/trackingService';
import type { Meal } from '../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { card, colors, font, radius, spacing, control } from '../theme/theme';

type HomeNavigation = {
  navigate: (name: string, params?: object) => void;
};

type ActiveOrderRow = {
  id: string;
  trackingNumber?: string;
  status?: string;
  totalLabel?: string;
};

function HomeShortcut({
  label,
  icon,
  onPress,
  showDivider,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  showDivider?: boolean;
}) {
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.shortcutRow, pressed && styles.shortcutPressed]}
      >
        <View style={styles.shortcutIconWrap}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>
        <Text style={styles.shortcutLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.inactive} />
      </Pressable>
      {showDivider ? <View style={styles.shortcutDivider} /> : null}
    </>
  );
}

export default function HomeScreen({ navigation }: { navigation: HomeNavigation }) {
  const { user } = useAuth();
  const { profile, loading } = useMealProfile(user);
  const userId = user?.id;
  const [activeOrders, setActiveOrders] = useState<ActiveOrderRow[]>([]);

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

  const syncActiveOrders = useCallback(() => {
    if (!userId) {
      setActiveOrders([]);
      return;
    }
    if (isSupabaseConfigured) {
      refreshBackendOrdersForUser(userId)
        .then((backendOrders) => {
          if (!backendOrders) return;
          setActiveOrders(
            backendOrders.filter((order) => order.status && !isTerminalStatus(order.status)),
          );
        })
        .catch(() => {
          setActiveOrders([]);
        });
      return;
    }
    setActiveOrders(
      listClientOrders(userId).filter((order) => order.status && !isTerminalStatus(order.status)),
    );
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      const task = setTimeout(syncActiveOrders, 0);
      return () => clearTimeout(task);
    }, [syncActiveOrders]),
  );

  const openMeal = useCallback((meal: Meal) => {
    navigation.navigate('Meals', {
      screen: 'MealDetail',
      params: { meal },
    });
  }, [navigation]);

  const openAccount = useCallback(() => {
    navigation.navigate('Account', { screen: 'AccountMain' });
  }, [navigation]);

  const openOrders = useCallback(() => {
    navigation.navigate('Orders', { screen: 'TrackingList' });
  }, [navigation]);

  const openMeals = useCallback(() => {
    navigation.navigate('Meals', { screen: 'MealsList' });
  }, [navigation]);

  const openOrderStatus = useCallback((orderId: string) => {
    navigation.navigate('Orders', {
      screen: 'OrderStatus',
      params: { orderId },
    });
  }, [navigation]);

  return (
    <AppPageShell edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.homeHeader}>
          <Text style={styles.homeTitle} accessibilityRole="header">{HOME_COPY.screenTitle}</Text>
          <Text style={styles.homeSubtitle}>{homeSubtitle}</Text>
        </View>

        <View style={styles.panelCard}>
          <HomeShortcut
            icon="restaurant-outline"
            label={HOME_COPY.browseMeals}
            onPress={openMeals}
            showDivider
          />
          <HomeShortcut
            icon="bag-handle-outline"
            label={HOME_COPY.myOrders}
            onPress={openOrders}
            showDivider
          />
          <HomeShortcut
            icon="person-outline"
            label={HOME_COPY.myAccount}
            onPress={openAccount}
          />
        </View>

        <View style={styles.panelCard}>
          <Text style={styles.panelTitle} accessibilityRole="header">{HOME_COPY.activeOrder}</Text>
          {activeOrders.length ? (
            activeOrders.map((order) => (
              <Pressable
                key={order.id}
                accessibilityRole="button"
                onPress={() => openOrderStatus(order.id)}
                style={styles.activeOrderRow}
              >
                <View style={styles.activeOrderMain}>
                  <Text style={styles.activeOrderRef}>{order.trackingNumber || order.id}</Text>
                  {order.totalLabel ? <Text style={styles.activeOrderTotal}>{order.totalLabel}</Text> : null}
                </View>
                {order.status ? <OrderStatusBadge status={order.status} /> : null}
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyActive}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="bag-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyActiveText}>{MSG.noActiveOrders}</Text>
              <AppButton
                title={HOME_COPY.browseMeals}
                onPress={openMeals}
                color={colors.primary}
                style={styles.browseCta}
              />
            </View>
          )}
        </View>

        <RecommendedForYouSection
          sectionTitle={mealsSectionTitle}
          profile={profile}
          loading={loading}
          onOpenMeal={openMeal}
          onCompleteProfile={openAccount}
        />
      </ScrollView>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  homeHeader: { marginBottom: spacing.lg },
  homeTitle: { fontSize: font.title, lineHeight: 34, fontWeight: '800', color: colors.heading },
  homeSubtitle: { marginTop: spacing.xs, fontSize: font.body, lineHeight: 22, color: colors.muted },
  panelCard: {
    ...card,
    marginBottom: spacing.lg,
    borderColor: colors.cardBorder,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
  },
  panelTitle: {
    fontSize: font.lg,
    fontWeight: '800',
    color: colors.heading,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: control.minHeight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  shortcutPressed: { opacity: 0.88 },
  shortcutIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: { flex: 1, fontSize: font.body, fontWeight: '700', color: colors.heading },
  shortcutDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
    marginLeft: spacing.lg + 44 + spacing.md,
    marginRight: spacing.lg,
  },
  emptyActive: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyActiveText: {
    fontSize: font.body,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  browseCta: { alignSelf: 'stretch' },
  activeOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: control.minHeight,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  activeOrderMain: { flex: 1 },
  activeOrderRef: { fontSize: font.body, fontWeight: '700', color: colors.heading },
  activeOrderTotal: { marginTop: 2, fontSize: font.sm, color: colors.muted },
});