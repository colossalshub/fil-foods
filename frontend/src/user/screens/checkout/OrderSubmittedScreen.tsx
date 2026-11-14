import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppPageShell from '../../components/AppPageShell';
import type { Order } from '../../types';
import { CHECKOUT_MSG } from '../../data/checkoutCopy';
import { checkoutFlow } from '../../styles/checkoutFlow';
import { formatPeso } from '../../services/orderService';
import { ORDER_STATUS } from '../../services/trackingService';
import { Pressable } from 'react-native';

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
    <AppPageShell edges={['top', 'bottom']} contentStyle={{ flex: 1 }}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <View style={[checkoutFlow.statusIcon, checkoutFlow.statusIconPending]}>
          <Ionicons name="ellipsis-horizontal" size={32} color="#8A6A12" />
        </View>
        <Text style={checkoutFlow.title} accessibilityRole="header">{CHECKOUT_MSG.sentTitle}</Text>
        <Text style={checkoutFlow.lead}>{CHECKOUT_MSG.sentLead}</Text>

        <View style={checkoutFlow.card}>
          <Text style={checkoutFlow.line}><Text style={checkoutFlow.lineBold}>{CHECKOUT_MSG.orderReference}: </Text>{order.trackingNumber}</Text>
          <Text style={checkoutFlow.line}><Text style={checkoutFlow.lineBold}>{CHECKOUT_MSG.status}: </Text>{ORDER_STATUS.FOR_DIETITIAN_REVIEW}</Text>
          <View style={[checkoutFlow.badge, checkoutFlow.badgeWarn]}>
            <Text style={checkoutFlow.badgeText}>{ORDER_STATUS.FOR_DIETITIAN_REVIEW}</Text>
          </View>
          <Text style={checkoutFlow.line}><Text style={checkoutFlow.lineBold}>{CHECKOUT_MSG.meals}: </Text>{`${order.items?.length || 0} meals`}</Text>
          <Text style={checkoutFlow.line}><Text style={checkoutFlow.lineBold}>{CHECKOUT_MSG.total}: </Text>{formatPeso(order.total || 0)}</Text>
        </View>

        <View style={checkoutFlow.notice}>
          <Text style={checkoutFlow.noticeText}>{CHECKOUT_MSG.sentNotice}</Text>
        </View>

        <Pressable accessibilityRole="button" onPress={viewOrders} style={checkoutFlow.primary}>
          <Text style={checkoutFlow.primaryLabel}>{CHECKOUT_MSG.viewOrders}</Text>
        </Pressable>
      </ScrollView>
    </AppPageShell>
  );
}