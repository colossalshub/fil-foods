import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppPageShell from '../../components/AppPageShell';
import type { Order } from '../../types';
import { CHECKOUT_MSG } from '../../data/checkoutCopy';
import { checkoutFlow } from '../../styles/checkoutFlow';
import { formatPeso } from '../../services/orderService';
import { ORDER_STATUS } from '../../services/trackingService';
import { formatTimestamp } from '../../utils/time';

export default function OrderPaymentSuccessScreen({ route, navigation }: {
  route: { params?: { order?: Order; method?: string } };
  navigation: { getParent?: () => { navigate: (name: string, params?: object) => void } | undefined };
}) {
  const order = route.params?.order;
  const fulfillment = order?.fulfillment;
  const fulfillmentLabel = fulfillment?.type === 'pickup'
    ? `Pickup · ${formatTimestamp(fulfillment.scheduledAt || '')}`
    : `Delivery · ${fulfillment?.address || ''} · ${formatTimestamp(fulfillment?.scheduledAt || '')}`;

  const viewOrders = () => {
    navigation.getParent?.()?.navigate('Orders', { screen: 'TrackingList' });
  };

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={{ flex: 1 }}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <View style={[checkoutFlow.statusIcon, checkoutFlow.statusIconOk]}>
          <Ionicons name="checkmark" size={36} color="#1E4D38" />
        </View>
        <Text style={checkoutFlow.title} accessibilityRole="header">{CHECKOUT_MSG.paidTitle}</Text>
        <Text style={checkoutFlow.lead}>{CHECKOUT_MSG.paidLead}</Text>

        {order ? (
          <View style={checkoutFlow.card}>
            <Text style={checkoutFlow.line}><Text style={checkoutFlow.lineBold}>{CHECKOUT_MSG.orderReference}: </Text>{order.trackingNumber}</Text>
            <Text style={checkoutFlow.line}><Text style={checkoutFlow.lineBold}>{CHECKOUT_MSG.status}: </Text>{ORDER_STATUS.PAID}</Text>
            <View style={[checkoutFlow.badge, checkoutFlow.badgeOk]}>
              <Text style={[checkoutFlow.badgeText, checkoutFlow.badgeTextOk]}>{ORDER_STATUS.PAID}</Text>
            </View>
            <Text style={checkoutFlow.line}><Text style={checkoutFlow.lineBold}>{CHECKOUT_MSG.fulfillment}: </Text>{fulfillmentLabel}</Text>
            <Text style={checkoutFlow.total}>{`${CHECKOUT_MSG.amountPaid} ${formatPeso(order.total || 0)}`}</Text>
          </View>
        ) : null}

        <Pressable accessibilityRole="button" onPress={viewOrders} style={checkoutFlow.primary}>
          <Text style={checkoutFlow.primaryLabel}>{CHECKOUT_MSG.viewOrders}</Text>
        </Pressable>
      </ScrollView>
    </AppPageShell>
  );
}