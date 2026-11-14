import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AppPageShell from '../../components/AppPageShell';
import { useAuth } from '../../context/AuthContext';
import { CHECKOUT_MSG } from '../../data/checkoutCopy';
import { checkoutFlow } from '../../styles/checkoutFlow';
import { formatPeso } from '../../services/orderService';
import {
  ORDER_STATUS,
  paymentStatusLabel,
  payClientOrder,
  refreshBackendOrder,
  refreshClientOrder,
} from '../../services/trackingService';
import { isSupabaseConfigured } from '../../../lib/supabaseClient.js';
import type { Order } from '../../types';

const METHODS = [
  { id: 'gcash', label: CHECKOUT_MSG.gcash },
  { id: 'maya', label: CHECKOUT_MSG.maya },
  { id: 'card', label: CHECKOUT_MSG.card },
];

export default function OrderPaymentScreen({ route, navigation }: {
  route: { params?: { orderId?: string } };
  navigation: { navigate: (name: string, params?: object) => void; goBack: () => void };
}) {
  const { user } = useAuth();
  const orderId = route.params?.orderId;
  const [order, setOrder] = useState<Order | null>(null);
  const [method, setMethod] = useState('gcash');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!user?.id || !orderId) return;
    if (isSupabaseConfigured) {
      refreshBackendOrder(user.id, orderId).then((row) => setOrder(row ? { ...(row as unknown as Order) } : null));
      return;
    }
    const result = refreshClientOrder(user.id, orderId, { connected: true });
    if (result.ok && result.order) setOrder(result.order as unknown as Order);
  }, [user?.id, orderId]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const canPay = order?.status === ORDER_STATUS.AWAITING_PAYMENT;

  const onPay = () => {
    if (!user?.id || !orderId || !canPay) {
      setError(CHECKOUT_MSG.notAvailablePay);
      return;
    }
    if (isSupabaseConfigured) {
      setError('Payment is not available in this build yet. Use a local session to try the payment flow.');
      return;
    }
    const result = payClientOrder(user.id, orderId);
    if (!result.ok) {
      setError(result.message || CHECKOUT_MSG.notAvailablePay);
      return;
    }
    navigation.navigate('OrderPaymentSuccess', { order: result.order, method });
  };

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={{ flex: 1 }}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <View style={[checkoutFlow.statusIcon, checkoutFlow.statusIconOk]}>
          <Ionicons name="checkmark" size={36} color="#1E4D38" />
        </View>
        <Text style={checkoutFlow.title} accessibilityRole="header">{CHECKOUT_MSG.approvedTitle}</Text>
        <Text style={checkoutFlow.lead}>{CHECKOUT_MSG.approvedLead}</Text>

        {order ? (
          <View style={checkoutFlow.card}>
            <Text style={checkoutFlow.line}><Text style={checkoutFlow.lineBold}>{CHECKOUT_MSG.orderReference}: </Text>{order.trackingNumber}</Text>
            <Text style={checkoutFlow.line}><Text style={checkoutFlow.lineBold}>{CHECKOUT_MSG.status}: </Text>{paymentStatusLabel(order.status)}</Text>
            <View style={[checkoutFlow.badge, checkoutFlow.badgeOk]}>
              <Text style={[checkoutFlow.badgeText, checkoutFlow.badgeTextOk]}>{paymentStatusLabel(order.status)}</Text>
            </View>
            <Text style={checkoutFlow.total}>{`${CHECKOUT_MSG.amountDue} ${formatPeso(order.total || 0)}`}</Text>
          </View>
        ) : null}

        <Text style={[checkoutFlow.lineBold, { marginTop: 16 }]}>{CHECKOUT_MSG.paymentMethod}</Text>
        {METHODS.map((item) => {
          const active = method === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setMethod(item.id)}
              style={[checkoutFlow.payRow, active && checkoutFlow.payRowOn]}
            >
              <Text style={checkoutFlow.payLabel}>{item.label}</Text>
              {active ? <Ionicons name="checkmark-circle" size={22} color="#1E4D38" /> : null}
            </Pressable>
          );
        })}

        {error ? <Text style={checkoutFlow.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={onPay}
          disabled={!canPay}
          style={[checkoutFlow.primary, !canPay && checkoutFlow.primaryDisabled]}
        >
          <Text style={checkoutFlow.primaryLabel}>
            {CHECKOUT_MSG.payAmount(formatPeso(order?.total || 0))}
          </Text>
        </Pressable>
      </ScrollView>
    </AppPageShell>
  );
}