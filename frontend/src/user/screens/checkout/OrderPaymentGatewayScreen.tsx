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
import {
  refreshClientOrder,
  settleClientPayment,
} from '../../services/trackingService';
import type { Order } from '../../types';
import { orderRefOf } from '../../domain/orderReference';

/**
 * USR-20: GCash and Maya leave the app's payment choice and open a checkout page.
 * This page is the local stand-in for that gateway. Paid is recorded only after
 * Pay now. Cancel returns to the order without marking it paid.
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
    if (!user?.id || !orderId) return;
    const result = refreshClientOrder(user.id, orderId, { connected: true });
    if (result.ok && result.order) setOrder(result.order as unknown as Order);
  }, [user?.id, orderId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const finish = (outcome: 'paid' | 'failed' | 'cancelled') => {
    if (!user?.id || !orderId) return;
    const result = settleClientPayment(user.id, orderId, { method, outcome });
    if (!result.ok) {
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
