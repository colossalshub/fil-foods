import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppPageShell from '../../components/AppPageShell';
import CheckoutOrderStatusCard from '../../components/CheckoutOrderStatusCard';
import type { Order } from '../../types';
import { CHECKOUT_MSG } from '../../data/checkoutCopy';
import { checkoutFlow } from '../../styles/checkoutFlow';
import { formatPeso } from '../../services/orderService';
import { ORDER_STATUS } from '../../services/trackingService';

export default function OrderSubmittedScreen({ route, navigation }: {
  route: { params?: { order?: Order } };
  navigation: { getParent?: () => { navigate: (name: string, params?: object) => void } | undefined };
}) {
  const order = route.params?.order;
  if (!order) {
    return (
      <AppPageShell edges={['top']} contentStyle={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={checkoutFlow.lead}>Order not found.</Text>
      </AppPageShell>
    );
  }

  const viewOrders = () => {
    navigation.getParent?.()?.navigate('Orders', { screen: 'TrackingList' });
  };

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={checkoutFlow.page}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <View style={[checkoutFlow.statusIcon, checkoutFlow.statusIconPending]}>
          <Ionicons name="ellipsis-horizontal" size={32} color="#8A6A12" />
        </View>
        <Text style={checkoutFlow.title} accessibilityRole="header">{CHECKOUT_MSG.sentTitle}</Text>
        <Text style={checkoutFlow.lead}>{CHECKOUT_MSG.sentLead}</Text>

        <CheckoutOrderStatusCard
          badge={ORDER_STATUS.FOR_DIETITIAN_REVIEW}
          badgeTone="warn"
          rows={[
            { label: CHECKOUT_MSG.orderReference, value: order.trackingNumber || '—' },
            { label: CHECKOUT_MSG.meals, value: `${order.items?.length || 0} meals` },
            { label: CHECKOUT_MSG.total, value: formatPeso(order.total || 0) },
          ]}
        />

        <View style={checkoutFlow.notice}>
          <Text style={checkoutFlow.noticeText}>{CHECKOUT_MSG.sentNotice}</Text>
        </View>
      </ScrollView>

      <View style={checkoutFlow.footer}>
        <Pressable accessibilityRole="button" onPress={viewOrders} style={[checkoutFlow.primary, { marginTop: 0 }]}>
          <Text style={checkoutFlow.primaryLabel}>{CHECKOUT_MSG.viewOrders}</Text>
        </Pressable>
      </View>
    </AppPageShell>
  );
}