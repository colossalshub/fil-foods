import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AppPageShell from '../components/AppPageShell';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { MSG, ORDERS_COPY } from '../data/messages';
import { CHECKOUT_MSG } from '../data/checkoutCopy';
import FormMessage from '../components/FormMessage';
import Chip from '../components/Chip';
import DateRangeFields from '../components/DateRangeFields';
import { useAuth } from '../context/AuthContext';
import {
  TRACKING_MSG,
  POLL_INTERVAL_MS,
  isTerminalStatus,
  listClientOrders,
  listFilterStatuses,
  refreshOrdersForUser,
  searchOrderByTracking,
  refreshBackendOrdersForUser,
  subscribeToBackendOrderChanges,
} from '../services/trackingService';
import { colors, card, font, radius, spacing, touch, control } from '../theme/theme';
import { isSupabaseConfigured } from '../../lib/supabaseClient.js';

type OrderListItem = {
  id: string;
  trackingNumber?: string;
  date?: string;
  meals?: string;
  status?: string;
  fulfillmentMethod?: string;
  fulfillmentSummary?: string;
  placedAt?: string;
  lastUpdatedAt?: string;
  totalLabel?: string;
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
      accessibilityLabel={`Order ${order.trackingNumber}, ${order.status}`}
      onPress={onPress}
      style={styles.orderCard}
    >
      <View style={styles.orderCardBody}>
        <View style={styles.orderCardMain}>
          <Text style={styles.tracking}>{order.trackingNumber}</Text>
          <OrderStatusBadge status={order.status || ''} variant="outline" />
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
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = useMemo(
    () => ({ status: statusFilter || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    [statusFilter, dateFrom, dateTo],
  );

  const syncOrders = useCallback(() => {
    if (!userId) {
      setOrders([]);
      return;
    }
    if (isSupabaseConfigured) {
      refreshBackendOrdersForUser(userId)
        .then((backendOrders) => {
          if (backendOrders) {
            setRefreshError('');
            setOrders(backendOrders);
          }
        })
        .catch(() => setRefreshError(TRACKING_MSG.unableRefresh));
      return;
    }
    setOrders(listClientOrders(userId, filters));
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
    const query = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter && order.status !== statusFilter) return false;
      if (dateFrom && order.date && order.date < dateFrom) return false;
      if (dateTo && order.date && order.date > dateTo) return false;
      if (query && !String(order.trackingNumber || '').toLowerCase().includes(query)) return false;
      return true;
    });
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
    const match = orders.find((order) => String(order.trackingNumber || '').toLowerCase() === query.toLowerCase());
    if (!match) {
      if (!isSupabaseConfigured) {
        const result = searchOrderByTracking(userId || '', query);
        if (result.ok) {
          setSearchError('');
          navigation.navigate('OrderStatus', { orderId: result.order?.id || '' });
          return;
        }
      }
      setSearchError(TRACKING_MSG.orderNotFound);
      return;
    }
    setSearchError('');
    navigation.navigate('OrderStatus', { orderId: match.id });
  };

  const statusOptions = listFilterStatuses();
  const parentNav = navigation.getParent();

  return (
    <AppPageShell edges={['top']} contentStyle={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title} accessibilityRole="header">{ORDERS_COPY.listTitle}</Text>
        <Text style={styles.subtitle}>{ORDERS_COPY.listSubtitle}</Text>

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
              <Text style={styles.label} accessibilityRole="text">Search by tracking number</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.input}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="TRK-2026-0001"
                  placeholderTextColor={colors.inactive}
                  autoCapitalize="characters"
                  accessibilityLabel="Tracking number search"
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

        {orders.length === 0 ? (
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
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: '#1C3B2E' },
  subtitle: { fontSize: font.body, lineHeight: 22, color: '#5C675F' },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touch.min,
    paddingVertical: spacing.sm,
  },
  filterToggleText: { fontSize: font.body, fontWeight: '700', color: colors.primary },
  section: { gap: spacing.sm },
  label: { fontSize: font.body, fontWeight: '600', color: colors.text },
  searchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
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
  searchBtnText: { color: colors.white, fontSize: font.body, fontWeight: '600' },
  errorText: { fontSize: font.body, color: colors.danger },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  emptyCard: { ...card, padding: spacing.xl, alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#E9F0E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: font.lg, fontWeight: '800', color: colors.text, textAlign: 'center' },
  emptyLead: { fontSize: font.body, lineHeight: 22, color: colors.muted, textAlign: 'center' },
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
  browseBtnText: { color: colors.white, fontSize: font.body, fontWeight: '700' },
  orderSection: { gap: spacing.sm },
  sectionLabel: { fontSize: font.sm, fontWeight: '700', color: '#6B8E6B', letterSpacing: 0.3 },
  sectionEmpty: { fontSize: font.body, lineHeight: 22, color: colors.muted },
  orderCard: { ...card, padding: spacing.lg },
  orderCardBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  orderCardMain: { flex: 1, gap: spacing.xs },
  orderCardAside: { alignItems: 'flex-end', gap: spacing.sm },
  tracking: { fontSize: font.body, fontWeight: '800', color: colors.text },
  fulfillmentLine: { fontSize: font.sm, color: colors.muted, lineHeight: 20 },
  mealsLine: { fontSize: font.sm, color: '#5C675F', lineHeight: 20 },
  totalValue: { fontSize: font.body, fontWeight: '800', color: colors.primary },
});