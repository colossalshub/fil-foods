import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import AppPageShell from '../../components/AppPageShell';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useCheckout } from '../../context/CheckoutContext';
import { getUser } from '../../services/authService';
import { orderPartyLines, recipientDisplayName } from '../../domain/audience';
import { calculateTotals, formatPeso } from '../../services/orderService';
import { CHECKOUT_MSG, STANDARD_PLAN } from '../../data/checkoutCopy';
import { checkoutFlow } from '../../styles/checkoutFlow';
import { formatScheduleSummary } from '../../components/scheduleValue';
import { useMealProfile } from '../../hooks/useMealProfile';
import { usePlaceOrder } from '../../hooks/usePlaceOrder';

export default function OrderConfirmScreen({ navigation }: {
  navigation: { navigate: (name: string, params?: object) => void; goBack: () => void };
}) {
  const { user, session } = useAuth();
  const { items } = useCart();
  const checkout = useCheckout();
  const dbUser = useMemo(() => (user?.id ? getUser(user.id) : null), [user?.id]);
  const { profile } = useMealProfile(user);
  const recipientName = (dbUser?.accountFor || user?.accountFor) === 'family'
    ? recipientDisplayName(dbUser?.mealRecipient || user?.mealRecipient)
    : '';

  const { warnings, fieldError, placing, placeOrder } = usePlaceOrder(user, session, profile, recipientName);

  const lineItems = items.map((row) => ({ meal: row.meal, quantity: row.quantity, customization: row.customization }));
  const totals = calculateTotals(lineItems, dbUser || user || {});
  const scheduleLabel = formatScheduleSummary(checkout.scheduleDate, checkout.scheduleTime);
  const party = orderPartyLines({
    accountFor: dbUser?.accountFor || user?.accountFor,
    orderedByName: [dbUser?.firstName || user?.firstName, dbUser?.lastName || user?.lastName].filter(Boolean).join(' '),
    mealRecipientName: recipientName,
    mealRecipientAddress: dbUser?.mealRecipient?.deliveryAddress || user?.mealRecipient?.deliveryAddress || '',
  });
  const customerLine = party.length === 1 ? party[0].value : party.map((p) => `${p.label}: ${p.value}`).join(' · ');
  const planLabel = checkout.planId === 'standard' ? STANDARD_PLAN.label : checkout.planId;

  const onConfirm = async () => {
    const result = await placeOrder();
    if (result.needsAcknowledgement) {
      Alert.alert('Allergen warning', (result.messages || []).join('\n'), [
        { text: 'Not now', style: 'cancel' },
        { text: 'I understand', onPress: () => { checkout.setAllergenAck(true); } },
      ]);
      return;
    }
    if (!result.ok) {
      if (result.messages?.length) Alert.alert('Unable to send order', result.messages.join('\n'));
      return;
    }
    navigation.navigate('OrderSubmitted', { order: result.order });
  };

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={{ flex: 1 }}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <Text style={checkoutFlow.title} accessibilityRole="header">{CHECKOUT_MSG.confirmTitle}</Text>
        <Text style={checkoutFlow.lead}>{CHECKOUT_MSG.confirmLead}</Text>

        <View style={checkoutFlow.card}>
          <Text style={checkoutFlow.line}><Text style={checkoutFlow.lineBold}>{CHECKOUT_MSG.plan}: </Text>{planLabel}</Text>
          <Text style={checkoutFlow.line}><Text style={checkoutFlow.lineBold}>{CHECKOUT_MSG.meals}: </Text>{`${items.length} meals`}</Text>
          <Text style={checkoutFlow.line}><Text style={checkoutFlow.lineBold}>{CHECKOUT_MSG.deliveryAddress}: </Text>{checkout.fulfillmentType === 'delivery' ? checkout.address : 'Pickup'}</Text>
          <Text style={checkoutFlow.line}><Text style={checkoutFlow.lineBold}>{CHECKOUT_MSG.schedule}: </Text>{scheduleLabel}</Text>
          <Text style={checkoutFlow.line}><Text style={checkoutFlow.lineBold}>{CHECKOUT_MSG.customer}: </Text>{customerLine}</Text>
          <Text style={checkoutFlow.total}>{`Total ${formatPeso(totals.total)}`}</Text>
        </View>

        <View style={checkoutFlow.notice}>
          <Text style={checkoutFlow.noticeText}>{CHECKOUT_MSG.dietitianNotice}</Text>
        </View>

        {warnings.map((w) => (
          <Text key={`${w.mealId}-${w.allergen}`} style={checkoutFlow.error}>{w.message}</Text>
        ))}
        {warnings.length ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: checkout.allergenAck }}
            onPress={() => checkout.setAllergenAck(!checkout.allergenAck)}
            style={{ marginTop: 8, minHeight: 48, justifyContent: 'center' }}
          >
            <Text style={checkoutFlow.line}>I understand the allergen warnings</Text>
          </Pressable>
        ) : null}
        {fieldError ? <Text style={checkoutFlow.error}>{fieldError}</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={CHECKOUT_MSG.confirmSend}
          onPress={onConfirm}
          disabled={placing}
          style={[checkoutFlow.primary, placing && checkoutFlow.primaryDisabled]}
        >
          <Text style={checkoutFlow.primaryLabel}>{placing ? 'Sending…' : CHECKOUT_MSG.confirmSend}</Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={checkoutFlow.outline}>
          <Text style={checkoutFlow.outlineLabel}>{CHECKOUT_MSG.goBack}</Text>
        </Pressable>
      </ScrollView>
    </AppPageShell>
  );
}