import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppPageShell from '../../components/AppPageShell';
import PageHeader from '../../components/PageHeader';
import CheckoutOrderStatusCard from '../../components/CheckoutOrderStatusCard';
import CheckoutRadio from '../../components/CheckoutRadio';
import { useAuth } from '../../context/AuthContext';
import { CHECKOUT_MSG } from '../../data/checkoutCopy';
import { checkoutFlow } from '../../styles/checkoutFlow';
import { formatPeso } from '../../services/orderService';
import {
  ORDER_STATUS,
  PAYMENT_METHOD,
  settleClientPayment,
  refreshBackendOrder,
  refreshClientOrder,
} from '../../services/trackingService';
import { isSupabaseConfigured } from '../../../lib/supabaseClient.js';
import type { Order } from '../../types';
import { deliveryTrackingOf, orderRefOf } from '../../domain/orderReference';

const METHODS = [
  { id: 'gcash', label: CHECKOUT_MSG.gcash, method: PAYMENT_METHOD.GCASH },
  { id: 'maya', label: CHECKOUT_MSG.maya, method: PAYMENT_METHOD.MAYA },
  { id: 'cod', label: CHECKOUT_MSG.cod, method: PAYMENT_METHOD.COD },
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

  const userId = user?.id;
  const load = useCallback(() => {
    if (!userId || !orderId) return;
    if (isSupabaseConfigured) {
      refreshBackendOrder(userId, orderId).then((row) => setOrder(row ? { ...(row as unknown as Order) } : null));
      return;
    }
    const result = refreshClientOrder(userId, orderId, { connected: true });
    if (result.ok && result.order) setOrder(result.order as unknown as Order);
  }, [userId, orderId]);

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
    const selected = METHODS.find((item) => item.id === method) || METHODS[0];
    if (selected.method === PAYMENT_METHOD.COD) {
      const result = settleClientPayment(user.id, orderId, { method: selected.method, outcome: 'recorded' });
      if (!result.ok) {
        setError(result.message || CHECKOUT_MSG.notAvailablePay);
        return;
      }
      navigation.navigate('OrderPaymentSuccess', { order: result.order, method: selected.id, outcome: 'cod' });
      return;
    }
    navigation.navigate('OrderPaymentGateway', { orderId, method: selected.method });
  };

  if (awaitingReview) {
    return (
      <AppPageShell edges={['top', 'bottom']} contentStyle={checkoutFlow.page}>
        <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
          <PageHeader title={CHECKOUT_MSG.sentTitle} subtitle={CHECKOUT_MSG.sentLead} />
          {order ? (
            <CheckoutOrderStatusCard
              badge={ORDER_STATUS.FOR_DIETITIAN_REVIEW}
              badgeTone="warn"
              rows={[
                { label: CHECKOUT_MSG.orderReference, value: orderRefOf(order) || '—' },
                ...(deliveryTrackingOf(order) ? [{ label: CHECKOUT_MSG.trackingNumber, value: deliveryTrackingOf(order) as string }] : []),
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
        <PageHeader
          title={alreadyPaid ? CHECKOUT_MSG.paidTitle : CHECKOUT_MSG.approvedTitle}
          subtitle={alreadyPaid ? CHECKOUT_MSG.paidLead : CHECKOUT_MSG.approvedLead}
        />

        {order ? (
          <>
            <CheckoutOrderStatusCard
              badge={alreadyPaid ? ORDER_STATUS.PAID : CHECKOUT_MSG.approvedBadge}
              badgeTone="ok"
              rows={[
                { label: CHECKOUT_MSG.orderReference, value: orderRefOf(order) || '—' },
                ...(deliveryTrackingOf(order) ? [{ label: CHECKOUT_MSG.trackingNumber, value: deliveryTrackingOf(order) as string }] : []),
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
                <View style={checkoutFlow.notice}>
                  <Text style={checkoutFlow.noticeText}>{CHECKOUT_MSG.localPayDemo}</Text>
                </View>
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
              {method === 'cod' ? CHECKOUT_MSG.cod : CHECKOUT_MSG.payAmount(formatPeso(order?.total || 0))}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </AppPageShell>
  );
}