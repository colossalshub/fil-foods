import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import AppPageShell from '../components/AppPageShell';
import FormMessage from '../components/FormMessage';
import OrderSummaryCard from '../components/OrderSummaryCard';
import OrderProgressStepper from '../components/OrderProgressStepper';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { ORDERS_COPY } from '../data/messages';
import {
  TRACKING_MSG,
  POLL_INTERVAL_MS,
  ORDER_STATUS,
  refreshClientOrder,
  refreshBackendOrder,
} from '../services/trackingService';
import { CHECKOUT_MSG } from '../data/checkoutCopy';
import { checkoutFlow } from '../styles/checkoutFlow';
import { colors, font, spacing } from '../theme/theme';
import { isSupabaseConfigured } from '../../lib/supabaseClient.js';

type OrderView = {
  id?: string;
  trackingNumber?: string;
  status?: string;
  totalLabel?: string;
  fulfillment?: { summary?: string };
  progressSteps?: {
    status: string;
    label: string;
    hint?: string;
    reached?: boolean;
    current?: boolean;
  }[];
};

export default function OrderStatusScreen() {
  const navigation = useNavigation();
  const route = useRoute() as { params?: { orderId?: string } };
  const { user } = useAuth();
  const orderId = route.params?.orderId;
  const userId = user?.id;

  const [refreshError, setRefreshError] = useState('');
  const [order, setOrder] = useState<OrderView | null>(null);
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
          setOrder(backendOrder as OrderView);
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
    setOrder(result.order as OrderView);
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

  const cancelled = order?.status === ORDER_STATUS.CANCELLED;
  const canPay = order?.status === ORDER_STATUS.AWAITING_PAYMENT;

  return (
    <AppPageShell edges={['top']} contentStyle={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle} accessibilityRole="header">{ORDERS_COPY.statusTitle}</Text>
        <Text style={styles.pageSubtitle}>{ORDERS_COPY.statusSubtitle}</Text>

        {refreshError ? <FormMessage messages={[refreshError]} tone="error" /> : null}

        {notFound ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{TRACKING_MSG.orderNotFound}</Text>
          </View>
        ) : null}

        {order ? (
          <>
            <OrderSummaryCard
              trackingNumber={order.trackingNumber}
              status={order.status || ''}
              fulfillmentSummary={order.fulfillment?.summary}
              totalLabel={order.totalLabel}
            />
            <OrderProgressStepper
              steps={order.progressSteps || []}
              cancelled={cancelled}
            />
            {canPay ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={CHECKOUT_MSG.approvedTitle}
                onPress={() => navigation.navigate('OrderPayment', { orderId: order.id })}
                style={[checkoutFlow.primary, styles.payBtn]}
              >
                <Text style={checkoutFlow.primaryLabel}>{CHECKOUT_MSG.payAmount(order.totalLabel || '')}</Text>
              </Pressable>
            ) : null}
            <AppButton
              title={ORDERS_COPY.viewOrderDetails}
              onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
              style={styles.detailsBtn}
            />
          </>
        ) : null}
      </ScrollView>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  pageTitle: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: '#1C3B2E' },
  pageSubtitle: { fontSize: font.body, lineHeight: 22, color: '#5C675F', marginBottom: spacing.xs },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: font.body, color: colors.muted, textAlign: 'center' },
  detailsBtn: { marginTop: spacing.sm },
  payBtn: { marginTop: spacing.md },
});