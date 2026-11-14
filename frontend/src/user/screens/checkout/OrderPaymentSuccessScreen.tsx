import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppPageShell from '../../components/AppPageShell';
import CheckoutOrderStatusCard from '../../components/CheckoutOrderStatusCard';
import type { Order } from '../../types';
import { CHECKOUT_MSG } from '../../data/checkoutCopy';
import { checkoutFlow } from '../../styles/checkoutFlow';
import { formatPeso } from '../../services/orderService';
import { ORDER_STATUS, formatFulfillmentLine } from '../../services/trackingService';

export default function OrderPaymentSuccessScreen({ route, navigation }: {
  route: { params?: { order?: Order; method?: string } };
  navigation: { getParent?: () => { navigate: (name: string, params?: object) => void } | undefined };
}) {
  const order = route.params?.order;

  const viewOrders = () => {
    navigation.getParent?.()?.navigate('Orders', { screen: 'TrackingList' });
  };

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={checkoutFlow.page}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <View style={[checkoutFlow.statusIcon, checkoutFlow.statusIconOk]}>
          <Ionicons name="checkmark" size={36} color="#1E4D38" />
        </View>
        <Text style={checkoutFlow.title} accessibilityRole="header">{CHECKOUT_MSG.paidTitle}</Text>
        <Text style={checkoutFlow.lead}>{CHECKOUT_MSG.paidLead}</Text>

        {order ? (
          <CheckoutOrderStatusCard
            badge={ORDER_STATUS.PAID}
            badgeTone="ok"
            rows={[
              { label: CHECKOUT_MSG.orderReference, value: order.trackingNumber || '—' },
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