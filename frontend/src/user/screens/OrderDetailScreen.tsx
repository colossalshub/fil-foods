import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Pressable, View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import BackHeader from '../components/BackHeader';
import AppPageShell from '../components/AppPageShell';
import OrderStatusBadge from '../components/OrderStatusBadge';
import FormMessage from '../components/FormMessage';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import { MENU_CATALOG, resolveMenuMeal } from '../data/menuCatalog';
import type { DaySlot } from '../data/todayMenu';
import { ORDERS_COPY } from '../data/messages';
import { orderPartyLines } from '../domain/audience';
import {
  TRACKING_MSG,
  POLL_INTERVAL_MS,
  customerFacingStatus,
  refreshClientOrder,
  refreshBackendOrder,
} from '../services/trackingService';
import { colors, card, font, radius, spacing, fonts } from '../theme/theme';
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
    orderRef?: string;
    trackingNumber?: string;
    reviewReason?: string;
    status?: string;
    paymentStatusLabel?: string;
    placedDateLabel?: string;
    items?: {
      slot: string;
      name: string;
      lineTotalLabel?: string;
      customizationLabel?: string;
      specialRequestLabel?: string;
      specialRequestFeeLabel?: string;
    }[];
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

  const { addItem, clearCart } = useCart();
  const checkout = useCheckout();

  /** Revised USR-23: back to the start of the order process with this order's meals pre-filled. */
  const editAndResubmit = () => {
    if (!order?.id) return;
    clearCart();
    checkout.resetCheckout();
    checkout.setResubmit(order.id, order.orderRef || null);
    if (order.fulfillment?.type) checkout.setFulfillmentType(order.fulfillment.type);
    if (order.fulfillment?.type === 'delivery' && order.fulfillment.address) checkout.setAddress(order.fulfillment.address);
    let missing = false;
    for (const row of order.items || []) {
      const item = MENU_CATALOG.find((entry) => entry.name === row.name && entry.slot === row.slot)
        || MENU_CATALOG.find((entry) => entry.name === row.name);
      if (!item || !item.available || row.customizationLabel) {
        missing = true;
        continue;
      }
      if (addItem(resolveMenuMeal(item), 1, undefined, { daySlot: item.slot as DaySlot, todayMealId: item.id })) missing = true;
    }
    (navigation.getParent() as { navigate: (name: string, params?: object) => void } | undefined)
      ?.navigate('Meals', { screen: 'MealsList' });
    if (missing) Alert.alert(ORDERS_COPY.editAndResubmit, ORDERS_COPY.resubmitMissingMeals);
  };

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
        <BackHeader
          title={ORDERS_COPY.detailsTitle}
          backLabel={ORDERS_COPY.backToOrders}
          backAccessibilityLabel={ORDERS_COPY.backToOrders}
          onBack={() => navigation.navigate('TrackingList')}
        />

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
                <Text style={styles.valueStrong}>{order.orderRef}</Text>
              </MetaLine>
              {order.trackingNumber ? (
                <MetaLine label={ORDERS_COPY.trackingNumber}>
                  <Text style={styles.value}>{order.trackingNumber}</Text>
                </MetaLine>
              ) : null}
              <MetaLine label={ORDERS_COPY.status}>
                <OrderStatusBadge status={customerFacingStatus(order.status || '')} variant="outline" />
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

            {order.status === 'Returned for Changes' ? (
              <View style={[styles.card, styles.returnedCard]}>
                <Text style={styles.cardTitle} accessibilityRole="header">{ORDERS_COPY.returnedReasonLabel}</Text>
                <Text style={styles.value}>{order.reviewReason || '—'}</Text>
                <Text style={styles.metaLabel}>{ORDERS_COPY.progressReturnedForChanges}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={ORDERS_COPY.editAndResubmit}
                  onPress={editAndResubmit}
                  style={styles.resubmitButton}
                >
                  <Text style={styles.resubmitLabel}>{ORDERS_COPY.editAndResubmit}</Text>
                </Pressable>
              </View>
            ) : null}

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
                    {row.specialRequestLabel ? (
                      <Text style={styles.metaLabel}>{`${row.specialRequestLabel}${row.specialRequestFeeLabel ? ` · ${row.specialRequestFeeLabel}` : ''}`}</Text>
                    ) : null}
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
  scroll: { paddingHorizontal: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl, gap: spacing.lg },
  card: { ...card, padding: spacing.lg, gap: spacing.md },
  returnedCard: { borderWidth: 1, borderColor: colors.danger },
  resubmitButton: {
    minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg,
  },
  resubmitLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.white },
  cardTitle: { fontFamily: fonts.bold, fontSize: font.lg, color: colors.text },
  metaRow: { gap: 6 },
  metaLabel: { fontFamily: fonts.regular, fontSize: font.sm, color: colors.muted },
  value: { fontFamily: fonts.regular, fontSize: font.body, color: colors.text },
  valueStrong: { fontFamily: fonts.bold, fontSize: font.body, color: colors.text },
  mealRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, alignItems: 'flex-start' },
  mealLeft: { flex: 1, gap: 2 },
  mealSlot: { fontFamily: fonts.semibold, fontSize: font.sm, color: colors.muted },
  mealName: { fontFamily: fonts.regular, fontSize: font.body, color: colors.text },
  mealPrice: { fontFamily: fonts.bold, fontSize: font.body, color: colors.text },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  amountLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.text },
  amountValue: { fontFamily: fonts.bold, fontSize: font.lg, color: colors.primary },
  fulfillmentBox: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.mint,
    padding: spacing.lg,
    gap: 4,
  },
  fulfillmentIcon: { marginBottom: spacing.xs },
  fulfillmentKicker: { fontFamily: fonts.bold, fontSize: font.sm, color: colors.primary, letterSpacing: 0.6 },
  fulfillmentType: { fontFamily: fonts.bold, fontSize: font.body, color: colors.text },
  fulfillmentMeta: { fontFamily: fonts.regular, fontSize: font.body, color: colors.muted, lineHeight: 22 },
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
  historyLabel: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.text },
  historyTime: { fontFamily: fonts.regular, fontSize: font.sm, color: colors.muted },
  emptyCard: { ...card, padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontFamily: fonts.regular, fontSize: font.body, color: colors.muted, textAlign: 'center' },
});