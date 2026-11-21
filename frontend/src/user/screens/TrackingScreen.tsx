import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import PageHeader from '../components/PageHeader';
import AppPageShell from '../components/AppPageShell';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { MEAL_DAY_COPY, MSG, ORDERS_COPY } from '../data/messages';
import { recipientDisplayName, warningRecipientName } from '../domain/audience';
import { CHECKOUT_MSG } from '../data/checkoutCopy';
import FormMessage from '../components/FormMessage';
import Chip from '../components/Chip';
import DateRangeFields from '../components/DateRangeFields';
import { useAuth } from '../context/AuthContext';
import {
  TRACKING_MSG,
  POLL_INTERVAL_MS,
  customerFacingStatus,
  isTerminalStatus,
  listClientOrders,
  listFilterStatuses,
  refreshOrdersForUser,
  searchClientOrders,
  searchOrderByTracking,
  refreshBackendOrdersForUser,
  subscribeToBackendOrderChanges,
} from '../services/trackingService';
import { colors, card, font, radius, spacing, touch, control, fonts } from '../theme/theme';
import { isSupabaseConfigured } from '../../lib/supabaseClient.js';

type OrderListItem = {
  id: string;
  orderRef?: string;
  trackingNumber?: string;
  date?: string;
  meals?: string;
  status?: string;
  fulfillmentMethod?: string;
  fulfillmentSummary?: string;
  placedAt?: string;
  lastUpdatedAt?: string;
  totalLabel?: string;
  paymentStatus?: string;
  dateLabel?: string;
};

function OrderListCard({
  order,
  onPress,
}: {
  order: OrderListItem;
  onPress: () => void;
}) {
  const scheduleLine = order.fulfillmentSummary
    || (order.fulfillmentMethod && order.dateLabel
      ? `${order.fulfillmentMethod} · ${order.dateLabel}`
      : order.dateLabel || order.fulfillmentMethod || '—');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderRef}, ${customerFacingStatus(order.status || '')}`}
      onPress={onPress}
      style={styles.orderCard}
    >
      <View style={styles.orderCardBody}>
        <View style={styles.orderCardMain}>
          <Text style={styles.tracking}>{order.orderRef}</Text>
          {order.trackingNumber ? <Text style={styles.mealsLine}>{order.trackingNumber}</Text> : null}
          <OrderStatusBadge status={customerFacingStatus(order.status || '')} variant="outline" />
          {order.paymentStatus ? (
            <Text style={styles.fulfillmentLine}>{`${ORDERS_COPY.paymentStatus}: ${order.paymentStatus}`}</Text>
          ) : null}
          <Text style={styles.fulfillmentLine}>{scheduleLine}</Text>
          <Text style={styles.mealsLine} numberOfLines={1}>{order.meals}</Text>
        </View>
        <View style={styles.orderCardAside}>
          <Text style={styles.totalValue}>{order.totalLabel}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.inactive} />
        </View>
      </View>
    </Pressable>
  );
}

function OrderSection({
  title,
  orders,
  onOpen,
  emptyHint,
}: {
  title: string;
  orders: OrderListItem[];
  onOpen: (orderId: string) => void;
  emptyHint?: string;
}) {
  if (!orders.length && !emptyHint) return null;
  return (
    <View style={styles.orderSection}>
      <Text style={styles.sectionLabel} accessibilityRole="header">{title}</Text>
      {orders.length ? (
        orders.map((order) => (
          <OrderListCard
            key={order.id}
            order={order}
            onPress={() => onOpen(order.id)}
          />
        ))
      ) : (
        <Text style={styles.sectionEmpty}>{emptyHint}</Text>
      )}
    </View>
  );
}

export default function TrackingScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const userId = user?.id;

  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [ordersReady, setOrdersReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = useMemo(
    () => ({ status: statusFilter || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    [statusFilter, dateFrom, dateTo],
  );

  const syncOrders = useCallback(() => {
    if (!userId) {
      setOrders([]);
      setOrdersReady(true);
      return;
    }
    if (isSupabaseConfigured) {
      refreshBackendOrdersForUser(userId)
        .then((backendOrders) => {
          if (backendOrders) {
            setRefreshError('');
            setOrders(backendOrders);
          }
          setOrdersReady(true);
        })
        .catch(() => {
          setRefreshError(TRACKING_MSG.unableRefresh);
          setOrdersReady(true);
        });
      return;
    }
    setOrders(listClientOrders(userId, filters));
    setOrdersReady(true);
  }, [userId, filters]);

  useFocusEffect(
    useCallback(() => subscribeToBackendOrderChanges(() => syncOrders()), [syncOrders]),
  );

  const pollRefresh = useCallback((connected = true) => {
    if (!userId) return;
    if (isSupabaseConfigured) {
      syncOrders();
      return;
    }
    const result = refreshOrdersForUser(userId, { connected });
    if (!result.ok) {
      setRefreshError(result.message || '');
      return;
    }
    setRefreshError('');
    setOrders(listClientOrders(userId, filters));
  }, [userId, filters, syncOrders]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const run = () => {
        if (!active) return;
        pollRefresh(true);
      };
      const initial = setTimeout(run, 0);
      const timer = setInterval(run, POLL_INTERVAL_MS);
      return () => {
        active = false;
        clearTimeout(initial);
        clearInterval(timer);
      };
    }, [pollRefresh]),
  );

  useFocusEffect(
    useCallback(() => {
      const sync = setTimeout(() => syncOrders(), 0);
      return () => clearTimeout(sync);
    }, [syncOrders]),
  );

  const onManualRefresh = () => {
    setRefreshing(true);
    pollRefresh(true);
    setRefreshing(false);
  };

  const visibleOrders = useMemo(() => {
    const filtered = orders.filter((order) => {
      if (statusFilter && order.status !== statusFilter) return false;
      if (dateFrom && order.date && order.date < dateFrom) return false;
      if (dateTo && order.date && order.date > dateTo) return false;
      return true;
    });
    return searchClientOrders(filtered, searchQuery);
  }, [orders, statusFilter, dateFrom, dateTo, searchQuery]);

  const { activeOrders, pastOrders } = useMemo(() => {
    const active: OrderListItem[] = [];
    const past: OrderListItem[] = [];
    for (const order of visibleOrders) {
      if (isTerminalStatus(order.status || '')) past.push(order);
      else active.push(order);
    }
    return { activeOrders: active, pastOrders: past };
  }, [visibleOrders]);

  const openOrder = useCallback(
    (orderId: string) => navigation.navigate('OrderStatus', { orderId }),
    [navigation],
  );

  const onSearch = () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchError('');
      return;
    }
    const wanted = query.toLowerCase();
    const match = orders.find((order) => [order.orderRef, order.trackingNumber].some((code) => String(code || '').toLowerCase() === wanted));
    if (!match) {
      if (!isSupabaseConfigured) {
        const result = searchOrderByTracking(userId || '', query);
        if (result.ok) {
          setSearchError('');
          navigation.navigate('OrderStatus', { orderId: result.order?.id || '' });
          return;
        }
      }
      // Close matches (meal names, small typos) are already listed below.
      setSearchError(visibleOrders.length ? '' : TRACKING_MSG.orderNotFound);
      return;
    }
    setSearchError('');
    navigation.navigate('OrderStatus', { orderId: match.id });
  };

  const statusOptions = listFilterStatuses();
  const parentNav = navigation.getParent();
  const recipientName = warningRecipientName(user);
  const holderName = user?.firstName?.trim() || recipientDisplayName(user) || '';
  const forWhom = user?.accountFor === 'family' && recipientName
    ? MEAL_DAY_COPY.forName(recipientName)
    : MEAL_DAY_COPY.forYou(holderName);

  return (
    <AppPageShell edges={['top']} contentStyle={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader title={ORDERS_COPY.listTitle} subtitle={forWhom} caption={ORDERS_COPY.listSubtitle} />

        {refreshError ? <FormMessage messages={[refreshError]} tone="error" /> : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => setFiltersOpen((open) => !open)}
          style={styles.filterToggle}
        >
          <Text style={styles.filterToggleText}>{filtersOpen ? 'Hide search and filters' : 'Search and filter orders'}</Text>
          <Ionicons name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
        </Pressable>

        {filtersOpen ? (
          <>
            <View style={styles.section}>
              <Text style={styles.label} accessibilityRole="text">Search by tracking number or meal</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.input}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="ORD-2026-0001"
                  placeholderTextColor={colors.inactive}
                  autoCapitalize="characters"
                  accessibilityLabel="Search orders by tracking number or meal"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Search order"
                  onPress={onSearch}
                  style={styles.searchBtn}
                >
                  <Text style={styles.searchBtnText}>Search</Text>
                </Pressable>
              </View>
              {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Filter by status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Chip label="All" active={!statusFilter} onPress={() => setStatusFilter('')} />
                {statusOptions.map((status) => (
                  <Chip key={status} label={status} active={statusFilter === status} onPress={() => setStatusFilter(status)} />
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Date range</Text>
              <DateRangeFields
                dateFrom={dateFrom}
                dateTo={dateTo}
                onChangeFrom={setDateFrom}
                onChangeTo={setDateTo}
              />
            </View>
          </>
        ) : null}

        {!ordersReady ? (
          <Text style={styles.emptyLead}>{TRACKING_MSG.loadingOrders}</Text>
        ) : orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={34} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{TRACKING_MSG.noOrders}</Text>
            <Text style={styles.emptyLead}>{TRACKING_MSG.noOrdersLead}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={CHECKOUT_MSG.browseMeals}
              onPress={() => parentNav?.navigate('Meals', { screen: 'MealsList' })}
              style={styles.browseBtn}
            >
              <Text style={styles.browseBtnText}>{CHECKOUT_MSG.browseMeals}</Text>
            </Pressable>
          </View>
        ) : visibleOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyLead}>{TRACKING_MSG.orderNotFound}</Text>
          </View>
        ) : (
          <>
            <OrderSection
              title={ORDERS_COPY.activeSection}
              orders={activeOrders}
              onOpen={openOrder}
              emptyHint={activeOrders.length === 0 && pastOrders.length > 0 ? MSG.noActiveOrders : undefined}
            />
            <OrderSection
              title={ORDERS_COPY.pastSection}
              orders={pastOrders}
              onOpen={openOrder}
            />
          </>
        )}
      </ScrollView>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl, gap: spacing.md },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touch.min,
    paddingVertical: spacing.sm,
  },
  filterToggleText: { fontFamily: fonts.bold, fontSize: font.body, color: colors.primary },
  section: { gap: spacing.sm },
  label: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.text },
  searchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    fontFamily: fonts.regular,
    flex: 1,
    minWidth: 0,
    minHeight: control.minHeight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    fontSize: font.body,
    color: colors.text,
  },
  searchBtn: {
    minHeight: touch.min,
    minWidth: touch.min,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  searchBtnText: { fontFamily: fonts.semibold, color: colors.white, fontSize: font.body },
  errorText: { fontFamily: fonts.regular, fontSize: font.body, color: colors.danger },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  emptyCard: { ...card, padding: spacing.xl, alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontFamily: fonts.bold, fontSize: font.lg, color: colors.text, textAlign: 'center' },
  emptyLead: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 22, color: colors.muted, textAlign: 'center' },
  browseBtn: {
    marginTop: spacing.sm,
    minHeight: 52,
    minWidth: 200,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  browseBtnText: { fontFamily: fonts.bold, color: colors.white, fontSize: font.body },
  orderSection: { gap: spacing.sm },
  sectionLabel: { fontFamily: fonts.semibold, fontSize: font.body, lineHeight: 24, color: colors.primary },
  sectionEmpty: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 22, color: colors.muted },
  orderCard: { ...card, padding: spacing.lg },
  orderCardBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  orderCardMain: { flex: 1, gap: spacing.xs },
  orderCardAside: { alignItems: 'flex-end', gap: spacing.sm },
  tracking: { fontFamily: fonts.bold, fontSize: font.body, color: colors.text },
  fulfillmentLine: { fontFamily: fonts.regular, fontSize: font.sm, color: colors.muted, lineHeight: 20 },
  mealsLine: { fontFamily: fonts.regular, fontSize: font.sm, color: colors.muted, lineHeight: 20 },
  totalValue: { fontFamily: fonts.bold, fontSize: font.body, color: colors.primary },
});