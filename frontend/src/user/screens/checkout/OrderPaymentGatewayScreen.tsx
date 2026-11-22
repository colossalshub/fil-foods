import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppPageShell from '../../components/AppPageShell';
import PageHeader from '../../components/PageHeader';
import CheckoutOrderStatusCard from '../../components/CheckoutOrderStatusCard';
import { useAuth } from '../../context/AuthContext';
import { CHECKOUT_MSG } from '../../data/checkoutCopy';
import { checkoutFlow } from '../../styles/checkoutFlow';
import { formatPeso } from '../../services/orderService';
import { isSupabaseConfigured } from '../../../lib/supabaseClient';
import { payOrderOnBackend } from '../../services/backendOrderService';
import {
  refreshBackendOrder,
  refreshClientOrder,
  settleClientPayment,
} from '../../services/trackingService';
import type { Order } from '../../types';
import { orderRefOf } from '../../domain/orderReference';

/**
 * USR-20: GCash and Maya open this checkout page. Pay now records the payment
 * on the customer's order. Cancel returns to the order without marking it paid.
 */
export default function OrderPaymentGatewayScreen({ route, navigation }: {
  route: { params?: { orderId?: string; method?: string } };
  navigation: {
    navigate: (name: string, params?: object) => void;
    goBack: () => void;
    getParent?: () => { navigate: (name: string, params?: object) => void } | undefined;
  };
}) {
  const { user } = useAuth();
  const orderId = route.params?.orderId;
  const method = route.params?.method || CHECKOUT_MSG.gcash;
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const userId = user?.id;
    if (!userId || !orderId) return;
    if (isSupabaseConfigured) {
      refreshBackendOrder(userId, orderId).then((row) => {
        if (row) {
          setOrder({ ...(row as unknown as Order) });
          return;
        }
        const local = refreshClientOrder(userId, orderId, { connected: true });
        if (local.ok && local.order) setOrder(local.order as unknown as Order);
      });
      return;
    }
    const result = refreshClientOrder(userId, orderId, { connected: true });
    if (result.ok && result.order) setOrder(result.order as unknown as Order);
  }, [user?.id, orderId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const finish = async (outcome: 'paid' | 'failed' | 'cancelled') => {
    if (!user?.id || !orderId) return;
    const remoteOrder = /^[0-9a-f-]{36}$/i.test(orderId);
    if (outcome === 'paid' && isSupabaseConfigured && remoteOrder) {
      try {
        await payOrderOnBackend(orderId);
      } catch {
        // Local demo still records the payment on this device.
      }
    }
    const result = settleClientPayment(user.id, orderId, { method, outcome });
    if (!result.ok) {
      if (outcome === 'paid' && order) {
        navigation.navigate('OrderPaymentSuccess', { order, method, outcome: 'paid' });
        return;
      }
      setError(result.message || CHECKOUT_MSG.notAvailablePay);
      return;
    }
    if (outcome === 'paid') {
      navigation.navigate('OrderPaymentSuccess', { order: result.order, method, outcome: 'paid' });
      return;
    }
    const parent = navigation.getParent?.();
    if (parent) {
      parent.navigate('Orders', { screen: 'OrderDetail', params: { orderId } });
      return;
    }
    navigation.navigate('OrderDetail', { orderId });
  };

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={checkoutFlow.page}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <PageHeader title={`${method} checkout`} subtitle={CHECKOUT_MSG.gatewayLead} />
        <View style={checkoutFlow.notice}>
          <Text style={checkoutFlow.noticeText}>{CHECKOUT_MSG.localPayDemo}</Text>
        </View>
        {order ? (
          <CheckoutOrderStatusCard
            badge={method}
            badgeTone="warn"
            rows={[
              { label: CHECKOUT_MSG.orderReference, value: orderRefOf(order) || '—' },
              { label: CHECKOUT_MSG.amountDue, value: formatPeso(order.total || 0) },
            ]}
          />
        ) : null}
        {error ? <Text style={checkoutFlow.error}>{error}</Text> : null}
      </ScrollView>
      <View style={checkoutFlow.footer}>
        <Pressable accessibilityRole="button" onPress={() => finish('paid')} style={[checkoutFlow.primary, { marginTop: 0 }]}>
          <Text style={checkoutFlow.primaryLabel}>{CHECKOUT_MSG.payNow}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => finish('failed')} style={checkoutFlow.outline}>
          <Text style={checkoutFlow.outlineLabel}>{CHECKOUT_MSG.paymentFailedTitle}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => finish('cancelled')} style={checkoutFlow.outline}>
          <Text style={checkoutFlow.outlineLabel}>{CHECKOUT_MSG.cancelPayment}</Text>
        </Pressable>
      </View>
    </AppPageShell>
  );
}
