import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import OrderStatusBadge from '../components/OrderStatusBadge';
import FormMessage from '../components/FormMessage';
import { useAuth } from '../context/AuthContext';
import {
  TRACKING_MSG,
  POLL_INTERVAL_MS,
  refreshClientOrder,
  refreshBackendOrder,
} from '../services/trackingService';
import { colors, card, font, spacing, touch } from '../theme/theme';
import { formatTimestamp } from '../utils/time';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';

function Line({ label, value }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value || '—'}</Text>
    </View>
  );
}

export default function OrderDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const orderId = route.params?.orderId;
  const userId = user?.id;

  const [refreshError, setRefreshError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [order, setOrder] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const pollRefresh = useCallback(() => {
    if (!userId || !orderId) {
      setNotFound(true);
      setOrder(null);
      return;
    }
    if (isSupabaseConfigured) {
      refreshBackendOrder(userId, orderId)
        .then((backendOrder) => {
          if (!backendOrder) {
            setNotFound(true);
            setOrder(null);
            return;
          }
          setRefreshError('');
          setNotFound(false);
          setOrder(backendOrder);
          setLastRefreshed(new Date().toISOString());
        })
        .catch(() => setRefreshError(TRACKING_MSG.unableRefresh));
      return;
    }

    const result = refreshClientOrder(userId, orderId, { connected: true });
    if (!result.ok) {
      setNotFound(true);
      setOrder(null);
      return;
    }
    setRefreshError('');
    setNotFound(false);
    setOrder(result.order);
    setLastRefreshed(result.refreshedAt);
  }, [userId, orderId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const run = () => {
        if (!active) return;
        pollRefresh();
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

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Order details</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {refreshError ? <FormMessage messages={[refreshError]} tone="error" /> : null}

        {notFound ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{TRACKING_MSG.orderNotFound}</Text>
          </View>
        ) : null}

        {order ? (
          <>
            <View style={styles.card}>
              <View style={styles.headRow}>
                <Text style={styles.tracking}>{order.trackingNumber}</Text>
                <OrderStatusBadge status={order.status} />
              </View>
              {lastRefreshed ? (
                <Text style={styles.sub}>Updated {formatTimestamp(lastRefreshed)}</Text>
              ) : (
                <Text style={styles.sub}>Last update: {order.lastUpdatedLabel}</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle} accessibilityRole="header">Meals</Text>
              {order.items.map((row) => (
                <View key={`${row.name}-${row.quantity}`} style={styles.mealRow}>
                  <Text style={styles.body}>{row.name} ×{row.quantity}</Text>
                  <Text style={styles.body}>{row.lineTotalLabel}</Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{order.totalLabel}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle} accessibilityRole="header">Fulfillment</Text>
              <Line label="Type" value={order.fulfillment.typeLabel} />
              {order.fulfillment.type === 'delivery' ? (
                <>
                  <Line label="Address" value={order.fulfillment.address} />
                  <Line label="Delivery fee" value={order.deliveryFeeLabel} />
                </>
              ) : null}
              <Line label="Schedule" value={order.fulfillment.scheduleLabel} />
              <Line label="Instructions" value={order.fulfillment.instructions} />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle} accessibilityRole="header">Status progress</Text>
              {order.statusTimeline.map((step) => (
                <View key={step.status} style={styles.timelineRow}>
                  <OrderStatusBadge status={step.status} />
                  <Text style={styles.timelineHint}>
                    {step.reached ? 'Reached' : 'Pending'}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle} accessibilityRole="header">Status history</Text>
              {order.statusHistory.map((row, index) => (
                <View key={`${row.status}-${row.at}-${index}`} style={styles.historyRow}>
                  <OrderStatusBadge status={row.status} />
                  <Text style={styles.historyTime}>{row.atLabel}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.min,
    minWidth: touch.min,
    paddingRight: spacing.sm,
  },
  backText: { fontSize: font.body, color: colors.primary, fontWeight: '600' },
  title: { flex: 1, textAlign: 'center', fontSize: font.lg, fontWeight: '700', color: colors.primary },
  topSpacer: { width: touch.min },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  card: { ...card, padding: spacing.lg, gap: spacing.sm },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  tracking: { fontSize: font.body, fontWeight: '700', color: colors.primary, flex: 1 },
  sub: { fontSize: font.sm, color: colors.muted },
  sectionTitle: { fontSize: font.body, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  mealRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  body: { fontSize: font.body, color: colors.text },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { fontSize: font.body, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: font.body, fontWeight: '700', color: colors.primary },
  line: { marginBottom: spacing.sm },
  lineLabel: { fontSize: font.sm, color: colors.muted, marginBottom: 2 },
  lineValue: { fontSize: font.body, color: colors.text },
  timelineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  timelineHint: { fontSize: font.body, color: colors.muted },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm },
  historyTime: { fontSize: font.body, color: colors.text },
  emptyCard: { ...card, padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: font.body, color: colors.muted, textAlign: 'center' },
});
