import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import OrderStatusBadge from '../components/OrderStatusBadge';
import FormMessage from '../components/FormMessage';
import Chip from '../components/Chip';
import { useAuth } from '../context/AuthContext';
import {
  TRACKING_MSG,
  POLL_INTERVAL_MS,
  listClientOrders,
  listFilterStatuses,
  refreshOrdersForUser,
  searchOrderByTracking,
  refreshBackendOrdersForUser,
  subscribeToBackendOrderChanges,
} from '../services/trackingService';
import { colors, card, font, radius, spacing, touch, control } from '../theme/theme';
import { formatTimestamp } from '../utils/time';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';

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
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

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
            setLastRefreshed(new Date().toISOString());
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
      setRefreshError(result.message);
      return;
    }
    setRefreshError('');
    setLastRefreshed(result.refreshedAt);
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

  const onSearch = () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchError('');
      return;
    }
    const match = orders.find((order) => String(order.trackingNumber || '').toLowerCase() === query.toLowerCase());
    if (!match) {
      if (!isSupabaseConfigured) {
        const result = searchOrderByTracking(userId, query);
        if (result.ok) {
          setSearchError('');
          navigation.navigate('OrderDetail', { orderId: result.order.id });
          return;
        }
      }
      setSearchError(TRACKING_MSG.orderNotFound);
      return;
    }
    setSearchError('');
    navigation.navigate('OrderDetail', { orderId: match.id });
  };

  const statusOptions = listFilterStatuses();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Orders" subtitle={lastRefreshed ? `Updated ${formatTimestamp(lastRefreshed)}` : undefined} showBell />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        {refreshError ? <FormMessage messages={[refreshError]} tone="error" /> : null}

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
          <View style={styles.dateRow}>
            <TextInput
              style={[styles.input, styles.dateInput]}
              value={dateFrom}
              onChangeText={setDateFrom}
              placeholder="From YYYY-MM-DD"
              placeholderTextColor={colors.inactive}
              accessibilityLabel="Date from"
            />
            <TextInput
              style={[styles.input, styles.dateInput]}
              value={dateTo}
              onChangeText={setDateTo}
              placeholder="To YYYY-MM-DD"
              placeholderTextColor={colors.inactive}
              accessibilityLabel="Date to"
            />
          </View>
        </View>

        {orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{TRACKING_MSG.noOrders}</Text>
          </View>
        ) : visibleOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{TRACKING_MSG.orderNotFound}</Text>
          </View>
        ) : (
          visibleOrders.map((order) => (
            <Pressable
              key={order.id}
              accessibilityRole="button"
              accessibilityLabel={`Order ${order.trackingNumber}, ${order.status}`}
              onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
              style={styles.orderCard}
            >
              <View style={styles.orderHead}>
                <Text style={styles.tracking}>{order.trackingNumber}</Text>
                <OrderStatusBadge status={order.status} />
              </View>
              <Text style={styles.meta}>Date: {order.date}</Text>
              <Text style={styles.meta}>Meals: {order.meals}</Text>
              <Text style={styles.updated}>Last update: {formatTimestamp(order.lastUpdatedAt)}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
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
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  dateInput: { flex: 1 },
  emptyCard: { ...card, padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: font.body, color: colors.muted, textAlign: 'center' },
  orderCard: { ...card, padding: spacing.lg, gap: spacing.sm },
  orderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  tracking: { fontSize: font.body, fontWeight: '700', color: colors.primary, flex: 1 },
  meta: { fontSize: font.body, color: colors.text },
  updated: { fontSize: font.sm, color: colors.muted },
});
