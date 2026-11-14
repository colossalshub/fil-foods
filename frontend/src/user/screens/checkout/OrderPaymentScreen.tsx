import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AppPageShell from '../../components/AppPageShell';
import CheckoutOrderStatusCard from '../../components/CheckoutOrderStatusCard';
import CheckoutRadio from '../../components/CheckoutRadio';
import { useAuth } from '../../context/AuthContext';
import { CHECKOUT_MSG } from '../../data/checkoutCopy';
import { checkoutFlow } from '../../styles/checkoutFlow';
import { formatPeso } from '../../services/orderService';
import {
  ORDER_STATUS,
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

  const awaitingReview = order?.status === ORDER_STATUS.FOR_DIETITIAN_REVIEW;
  const canPay = order?.status === ORDER_STATUS.AWAITING_PAYMENT;
  const alreadyPaid = order?.status === ORDER_STATUS.PAID;

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

  if (awaitingReview) {
    return (
      <AppPageShell edges={['top', 'bottom']} contentStyle={checkoutFlow.page}>
        <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
          <View style={[checkoutFlow.statusIcon, checkoutFlow.statusIconPending]}>
            <Ionicons name="ellipsis-horizontal" size={32} color="#8A6A12" />
          </View>
          <Text style={checkoutFlow.title} accessibilityRole="header">{CHECKOUT_MSG.sentTitle}</Text>
          <Text style={checkoutFlow.lead}>{CHECKOUT_MSG.sentLead}</Text>
          {order ? (
            <CheckoutOrderStatusCard
              badge={ORDER_STATUS.FOR_DIETITIAN_REVIEW}
              badgeTone="warn"
              rows={[
                { label: CHECKOUT_MSG.orderReference, value: order.trackingNumber || '—' },
                { label: CHECKOUT_MSG.meals, value: `${order.items?.length || 0} meals` },
                { label: CHECKOUT_MSG.total, value: formatPeso(order.total || 0) },
              ]}
            />
          ) : null}
          <View style={checkoutFlow.notice}>
            <Text style={checkoutFlow.noticeText}>{CHECKOUT_MSG.sentNotice}</Text>
          </View>
        </ScrollView>
        <View style={checkoutFlow.footer}>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={[checkoutFlow.primary, { marginTop: 0 }]}>
            <Text style={checkoutFlow.primaryLabel}>{CHECKOUT_MSG.goBack}</Text>
          </Pressable>
        </View>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={checkoutFlow.page}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <View style={[checkoutFlow.statusIcon, checkoutFlow.statusIconOk]}>
          <Ionicons name="checkmark" size={36} color="#1E4D38" />
        </View>
        <Text style={checkoutFlow.title} accessibilityRole="header">
          {alreadyPaid ? CHECKOUT_MSG.paidTitle : CHECKOUT_MSG.approvedTitle}
        </Text>
        <Text style={checkoutFlow.lead}>
          {alreadyPaid ? CHECKOUT_MSG.paidLead : CHECKOUT_MSG.approvedLead}
        </Text>

        {order ? (
          <>
            <CheckoutOrderStatusCard
              badge={alreadyPaid ? ORDER_STATUS.PAID : CHECKOUT_MSG.approvedBadge}
              badgeTone="ok"
              rows={[
                { label: CHECKOUT_MSG.orderReference, value: order.trackingNumber || '—' },
              ]}
              footer={
                !alreadyPaid ? (
                  <Text style={checkoutFlow.amountDueRow}>
                    {`${CHECKOUT_MSG.amountDue} ${formatPeso(order.total || 0)}`}
                  </Text>
                ) : undefined
              }
            />

            {!alreadyPaid ? (
              <>
                <Text style={checkoutFlow.paymentSectionTitle}>{CHECKOUT_MSG.chooseHowToPay}</Text>
                {METHODS.map((item) => {
                  const active = method === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active, checked: active }}
                      onPress={() => setMethod(item.id)}
                      style={[checkoutFlow.payRow, active && checkoutFlow.payRowOn]}
                    >
                      <Text style={checkoutFlow.payLabel}>{item.label}</Text>
                      <CheckoutRadio selected={active} />
                    </Pressable>
                  );
                })}
              </>
            ) : null}
          </>
        ) : null}

        {error ? <Text style={checkoutFlow.error}>{error}</Text> : null}
      </ScrollView>

      {!alreadyPaid ? (
        <View style={checkoutFlow.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={onPay}
            disabled={!canPay}
            style={[checkoutFlow.primary, { marginTop: 0 }, !canPay && checkoutFlow.primaryDisabled]}
          >
            <Text style={[checkoutFlow.primaryLabel, !canPay && checkoutFlow.primaryLabelDisabled]}>
              {CHECKOUT_MSG.payAmount(formatPeso(order?.total || 0))}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </AppPageShell>
  );
}