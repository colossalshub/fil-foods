import { Pressable, ScrollView, Text, View } from 'react-native';
import AppPageShell from '../../components/AppPageShell';
import PageHeader from '../../components/PageHeader';
import CheckoutOrderStatusCard from '../../components/CheckoutOrderStatusCard';
import type { Order } from '../../types';
import { CHECKOUT_MSG } from '../../data/checkoutCopy';
import { checkoutFlow } from '../../styles/checkoutFlow';
import { formatPeso } from '../../services/orderService';
import { ORDER_STATUS, formatFulfillmentLine } from '../../services/trackingService';
import { deliveryTrackingOf, orderRefOf } from '../../domain/orderReference';

export default function OrderPaymentSuccessScreen({ route, navigation }: {
  route: { params?: { order?: Order; method?: string; outcome?: string } };
  navigation: { getParent?: () => { navigate: (name: string, params?: object) => void } | undefined };
}) {
  const order = route.params?.order;
  const cashOnDelivery = route.params?.outcome === 'cod';

  const viewOrders = () => {
    navigation.getParent?.()?.navigate('Orders', { screen: 'TrackingList' });
  };

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={checkoutFlow.page}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <PageHeader
          title={cashOnDelivery ? CHECKOUT_MSG.codTitle : CHECKOUT_MSG.paidTitle}
          subtitle={cashOnDelivery ? CHECKOUT_MSG.codLead : CHECKOUT_MSG.paidLead}
        />

        {order ? (
          <CheckoutOrderStatusCard
            badge={cashOnDelivery ? 'Pending' : ORDER_STATUS.PAID}
            badgeTone={cashOnDelivery ? 'warn' : 'ok'}
            rows={[
              { label: CHECKOUT_MSG.orderReference, value: orderRefOf(order) || '—' },
                ...(deliveryTrackingOf(order) ? [{ label: CHECKOUT_MSG.trackingNumber, value: deliveryTrackingOf(order) as string }] : []),
              {
                label: CHECKOUT_MSG.fulfillment,
                value: formatFulfillmentLine(order.fulfillment?.type, order.fulfillment?.scheduledAt),
              },
            ]}
            footer={(
              <Text style={checkoutFlow.amountDueRow}>
                {`${CHECKOUT_MSG.amountPaid} ${formatPeso(order.total || 0)}`}
              </Text>
            )}
          />
        ) : null}
      </ScrollView>

      <View style={checkoutFlow.footer}>
        <Pressable accessibilityRole="button" onPress={viewOrders} style={[checkoutFlow.primary, { marginTop: 0 }]}>
          <Text style={checkoutFlow.primaryLabel}>{CHECKOUT_MSG.viewOrders}</Text>
        </Pressable>
      </View>
    </AppPageShell>
  );
}