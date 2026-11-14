import { useCallback, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AppPageShell from '../components/AppPageShell';
import OrderStatusBadge from '../components/OrderStatusBadge';
import FormMessage from '../components/FormMessage';
import { useAuth } from '../context/AuthContext';
import { ORDERS_COPY } from '../data/messages';
import { orderPartyLines } from '../domain/audience';
import {
  TRACKING_MSG,
  POLL_INTERVAL_MS,
  refreshClientOrder,
  refreshBackendOrder,
} from '../services/trackingService';
import { colors, card, font, radius, spacing, touch } from '../theme/theme';
import { isSupabaseConfigured } from '../../lib/supabaseClient.js';

function MetaLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function OrderDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute() as { params?: { orderId?: string } };
  const { user } = useAuth();
  const orderId = route.params?.orderId;
  const userId = user?.id;

  const [refreshError, setRefreshError] = useState('');
  const [order, setOrder] = useState<{
    id?: string;
    trackingNumber?: string;
    status?: string;
    paymentStatusLabel?: string;
    placedDateLabel?: string;
    items?: { slot: string; name: string; lineTotalLabel?: string; customizationLabel?: string }[];
    accountFor?: 'self' | 'family';
    orderedByName?: string;
    mealRecipientName?: string;
    mealRecipientAddress?: string;
    totalLabel?: string;
    fulfillment?: {
      type?: string;
      typeLabel?: string;
      address?: string | null;
      scheduleLabel?: string;
    };
    statusHistory?: { historyLabel?: string; atLabel?: string; status?: string }[];
  } | null>(null);
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
    setOrder(result.order as NonNullable<typeof order>);
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

  const partyLines = order
    ? orderPartyLines({
        accountFor: order.accountFor,
        orderedByName: order.orderedByName,
        mealRecipientName: order.mealRecipientName,
        mealRecipientAddress: order.mealRecipientAddress,
      })
    : [];

  return (
    <AppPageShell edges={['top']} contentStyle={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ORDERS_COPY.backToOrders}
          onPress={() => navigation.navigate('TrackingList')}
          style={styles.backRow}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={styles.backText}>{ORDERS_COPY.backToOrders}</Text>
        </Pressable>

        <Text style={styles.title} accessibilityRole="header">{ORDERS_COPY.detailsTitle}</Text>

        {refreshError ? <FormMessage messages={[refreshError]} tone="error" /> : null}

        {notFound ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{TRACKING_MSG.orderNotFound}</Text>
          </View>
        ) : null}

        {order ? (
          <>
            <View style={styles.card}>
              <MetaLine label={ORDERS_COPY.orderReference}>
                <Text style={styles.valueStrong}>{order.trackingNumber}</Text>
              </MetaLine>
              <MetaLine label={ORDERS_COPY.status}>
                <OrderStatusBadge status={order.status || ''} variant="outline" />
              </MetaLine>
              <MetaLine label={ORDERS_COPY.date}>
                <Text style={styles.value}>{order.placedDateLabel}</Text>
              </MetaLine>
              <MetaLine label={ORDERS_COPY.paymentStatus}>
                <OrderStatusBadge status={order.paymentStatusLabel || order.status || ''} variant="outline" />
              </MetaLine>
              {partyLines.map((line) => (
                <MetaLine key={line.label} label={line.label}>
                  <Text style={styles.value}>{line.value}</Text>
                </MetaLine>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">Meals</Text>
              {(order.items || []).map((row) => (
                <View key={`${row.slot}-${row.name}`} style={styles.mealRow}>
                  <View style={styles.mealLeft}>
                    <Text style={styles.mealSlot}>{row.slot}</Text>
                    <Text style={styles.mealName}>
                      {row.name}
                      {row.customizationLabel ? ` (${row.customizationLabel})` : ''}
                    </Text>
                  </View>
                  <Text style={styles.mealPrice}>{row.lineTotalLabel}</Text>
                </View>
              ))}
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>{ORDERS_COPY.amount}</Text>
                <Text style={styles.amountValue}>{order.totalLabel}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">{ORDERS_COPY.deliveryDetails}</Text>
              <View style={styles.fulfillmentBox}>
                <Ionicons name="car-outline" size={22} color={colors.primary} style={styles.fulfillmentIcon} />
                <Text style={styles.fulfillmentKicker}>{ORDERS_COPY.fulfillmentHeading}</Text>
                <Text style={styles.fulfillmentType}>{order.fulfillment?.typeLabel}</Text>
                {order.fulfillment?.address ? (
                  <Text style={styles.fulfillmentMeta}>{order.fulfillment.address}</Text>
                ) : null}
                {order.fulfillment?.scheduleLabel ? (
                  <Text style={styles.fulfillmentMeta}>{order.fulfillment.scheduleLabel}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">{ORDERS_COPY.statusHistory}</Text>
              {(order.statusHistory || []).map((row, index, rows) => {
                const isLast = index === rows.length - 1;
                const isCurrent = isLast;
                return (
                  <View key={`${row.status}-${row.atLabel}-${index}`} style={styles.historyStep}>
                    <View style={styles.historyRail}>
                      <View style={[styles.historyDot, isCurrent && styles.historyDotActive]} />
                      {!isLast ? <View style={styles.historyLine} /> : null}
                    </View>
                    <View style={styles.historyBody}>
                      <Text style={styles.historyLabel}>{row.historyLabel}</Text>
                      {row.atLabel ? <Text style={styles.historyTime}>{row.atLabel}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.min,
    alignSelf: 'flex-start',
    gap: 2,
  },
  backText: { fontSize: font.body, fontWeight: '700', color: colors.primary },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: '#1C3B2E', letterSpacing: -0.4 },
  card: { ...card, padding: spacing.lg, gap: spacing.md },
  cardTitle: { fontSize: font.lg, fontWeight: '800', color: colors.text },
  metaRow: { gap: 6 },
  metaLabel: { fontSize: font.sm, color: colors.muted },
  value: { fontSize: font.body, color: colors.text },
  valueStrong: { fontSize: font.body, fontWeight: '800', color: colors.text },
  mealRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, alignItems: 'flex-start' },
  mealLeft: { flex: 1, gap: 2 },
  mealSlot: { fontSize: font.sm, color: colors.muted, fontWeight: '600' },
  mealName: { fontSize: font.body, color: colors.text },
  mealPrice: { fontSize: font.body, fontWeight: '700', color: colors.text },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  amountLabel: { fontSize: font.body, fontWeight: '700', color: colors.text },
  amountValue: { fontSize: font.lg, fontWeight: '800', color: colors.primary },
  fulfillmentBox: {
    borderWidth: 2,
    borderColor: '#9BBF9A',
    borderRadius: radius.md,
    backgroundColor: '#F1FAF4',
    padding: spacing.lg,
    gap: 4,
  },
  fulfillmentIcon: { marginBottom: spacing.xs },
  fulfillmentKicker: { fontSize: font.sm, fontWeight: '700', color: colors.primary, letterSpacing: 0.6 },
  fulfillmentType: { fontSize: font.body, fontWeight: '800', color: colors.text },
  fulfillmentMeta: { fontSize: font.body, color: colors.muted, lineHeight: 22 },
  historyStep: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, minHeight: 52 },
  historyRail: { width: 20, alignItems: 'center' },
  historyDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  historyDotActive: { backgroundColor: colors.primary },
  historyLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: colors.border,
    marginTop: 2,
  },
  historyBody: { flex: 1, paddingBottom: spacing.sm, gap: 2 },
  historyLabel: { fontSize: font.body, fontWeight: '600', color: colors.text },
  historyTime: { fontSize: font.sm, color: colors.muted },
  emptyCard: { ...card, padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: font.body, color: colors.muted, textAlign: 'center' },
});