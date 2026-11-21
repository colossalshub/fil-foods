import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import BackHeader from '../../components/BackHeader';
import AppPageShell from '../../components/AppPageShell';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useCheckout } from '../../context/CheckoutContext';
import { getUser } from '../../services/authService';
import { orderPartyLines, recipientDisplayName } from '../../domain/audience';
import { checkoutTotal, formatPeso } from '../../services/orderService';
import { feeForSpecialRequest, specialRequestLabel } from '../../domain/specialRequest';
import { CHECKOUT_MSG, CHECKOUT_PLANS, STANDARD_PLAN } from '../../data/checkoutCopy';
import { checkoutFlow } from '../../styles/checkoutFlow';
import { spacing } from '../../theme/theme';
import { formatScheduleSummary } from '../../components/scheduleValue';
import { useMealProfile } from '../../hooks/useMealProfile';
import { usePlaceOrder } from '../../hooks/usePlaceOrder';
import { ORDERS_COPY, SPECIAL_REQUEST_COPY } from '../../data/messages';

export default function OrderConfirmScreen({ navigation }: {
  navigation: { navigate: (name: string, params?: object) => void; goBack: () => void };
}) {
  const { user, session } = useAuth();
  const { items } = useCart();
  const checkout = useCheckout();
  const userId = user?.id;
  const dbUser = useMemo(() => (userId ? getUser(userId) : null), [userId]);
  const { profile } = useMealProfile(user);
  const recipientName = (dbUser?.accountFor || user?.accountFor) === 'family'
    ? recipientDisplayName(dbUser?.mealRecipient || user?.mealRecipient)
    : '';

  const { warnings, fieldError, placing, placeOrder } = usePlaceOrder(user, session, profile, recipientName);

  const lineItems = items.map((row) => ({
    meal: row.meal,
    quantity: row.quantity,
    customization: row.customization,
    specialRequest: row.specialRequest,
  }));
  const totals = checkoutTotal(lineItems, checkout.planId, dbUser || user || {});
  const scheduleLabel = formatScheduleSummary(checkout.scheduleDate, checkout.scheduleTime);
  const party = orderPartyLines({
    accountFor: dbUser?.accountFor || user?.accountFor,
    orderedByName: [dbUser?.firstName || user?.firstName, dbUser?.lastName || user?.lastName].filter(Boolean).join(' '),
    mealRecipientName: recipientName,
    mealRecipientAddress: dbUser?.mealRecipient?.deliveryAddress || user?.mealRecipient?.deliveryAddress || '',
  });
  const selectedPlan = CHECKOUT_PLANS.find((plan) => plan.id === checkout.planId);
  const planLabel = checkout.planId === 'standard'
    ? `${STANDARD_PLAN.label} · ${STANDARD_PLAN.perMealLabel}`
    : selectedPlan
      ? `${selectedPlan.label} · ${selectedPlan.priceLabel}`
      : checkout.planId;
  const addressLine = checkout.fulfillmentType === 'delivery'
    ? checkout.address
    : 'Pickup at F.I.L Foods counter';

  const mealLines = items.map((row) => {
    const custom = row.customizationLabel ? ` (${row.customizationLabel})` : '';
    return `${row.meal.category || 'Meal'}: ${row.meal.name}${custom}`;
  });
  const verificationLines = [
    ...mealLines,
    ...party.map((line) => `${line.label}: ${line.value}`),
    `${checkout.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery'}: ${addressLine}`,
    `Schedule: ${scheduleLabel}`,
  ];

  const send = async () => {
    const result = await placeOrder();
    if (result.allergenBlocked) {
      Alert.alert('Allergy check', (result.messages || []).join('\n'));
      return;
    }
    if (!result.ok) {
      if (result.messages?.length) Alert.alert('Unable to send order', result.messages.join('\n'));
      return;
    }
    navigation.navigate('OrderSubmitted', { order: result.order });
  };

  // USR-20: the summary is the first check. This dialog is the second, and it
  // repeats the meals, meal times, customizations, recipient and fulfillment.
  const onConfirm = () => {
    const ref = checkout.resubmitOrderRef || '';
    const body = checkout.resubmitOrderId
      ? `${ORDERS_COPY.resubmitConfirmBody(ref)}\n\n${verificationLines.join('\n')}`
      : verificationLines.join('\n');
    Alert.alert(
      checkout.resubmitOrderId ? ORDERS_COPY.resubmitConfirmTitle : CHECKOUT_MSG.confirmTitle,
      body,
      [
        { text: CHECKOUT_MSG.goBack, style: 'cancel' },
        { text: checkout.resubmitOrderId ? ORDERS_COPY.resubmitConfirm : CHECKOUT_MSG.confirmSend, onPress: () => { send(); } },
      ],
    );
  };

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={checkoutFlow.page}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <BackHeader title={CHECKOUT_MSG.confirmTitle} subtitle={CHECKOUT_MSG.confirmLead} onBack={() => navigation.goBack()} />

        <View style={checkoutFlow.card}>
          <Text style={checkoutFlow.line}>
            <Text style={checkoutFlow.lineBold}>{`${CHECKOUT_MSG.plan}: `}</Text>
            {planLabel}
          </Text>
          {items.map((row) => (
            <Text key={row.meal.id} style={checkoutFlow.line}>
              <Text style={checkoutFlow.lineBold}>{`${row.meal.category || 'Meal'}: `}</Text>
              {`${row.meal.name}${row.customizationLabel ? ` (${row.customizationLabel})` : ''}`}
            </Text>
          ))}
          <Text style={checkoutFlow.line}>
            <Text style={checkoutFlow.lineBold}>{`${CHECKOUT_MSG.deliveryAddress}: `}</Text>
            {addressLine}
          </Text>
          <Text style={checkoutFlow.line}>
            <Text style={checkoutFlow.lineBold}>{`${CHECKOUT_MSG.schedule}: `}</Text>
            {scheduleLabel}
          </Text>
          {party.map((line) => (
            <Text key={line.label} style={checkoutFlow.line}>
              <Text style={checkoutFlow.lineBold}>{`${line.label}: `}</Text>
              {line.value}
            </Text>
          ))}
          {items.map((row) => {
            const requestText = specialRequestLabel(row.specialRequest);
            if (!requestText) return null;
            const fee = row.specialRequest?.fee ?? feeForSpecialRequest(row.specialRequest);
            return (
              <Text key={row.meal.id} style={checkoutFlow.line}>
                <Text style={checkoutFlow.lineBold}>{`${row.meal.category || 'Meal'} · ${row.meal.name}: `}</Text>
                {`${requestText} · ${SPECIAL_REQUEST_COPY.feeLabel} ${formatPeso(fee)}`}
              </Text>
            );
          })}
          {totals.specialRequestFees ? (
            <Text style={checkoutFlow.line}>
              <Text style={checkoutFlow.lineBold}>{`${SPECIAL_REQUEST_COPY.feesLine}: `}</Text>
              {formatPeso(totals.specialRequestFees)}
            </Text>
          ) : null}
          <Text style={checkoutFlow.amountDueRow}>{`${ORDERS_TOTAL_LABEL} ${formatPeso(totals.total)}`}</Text>
        </View>

        <View style={checkoutFlow.notice}>
          <Text style={checkoutFlow.noticeText}>
            {checkout.resubmitOrderId
              ? ORDERS_COPY.resubmitBanner(checkout.resubmitOrderRef || '')
              : CHECKOUT_MSG.dietitianNotice}
          </Text>
        </View>

        {warnings.map((w) => (
          <Text key={`${w.mealId}-${w.allergen}`} style={checkoutFlow.error}>{w.message}</Text>
        ))}
        {fieldError ? <Text style={checkoutFlow.error}>{fieldError}</Text> : null}
      </ScrollView>

      <View style={checkoutFlow.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={CHECKOUT_MSG.confirmSend}
          onPress={onConfirm}
          disabled={placing || warnings.length > 0}
          accessibilityState={{ disabled: placing || warnings.length > 0 }}
          style={[checkoutFlow.primary, { marginTop: 0 }, (placing || warnings.length > 0) && checkoutFlow.primaryDisabled]}
        >
          <Text style={checkoutFlow.primaryLabel}>
            {placing ? 'Sending…' : checkout.resubmitOrderId ? ORDERS_COPY.resubmitAction : CHECKOUT_MSG.confirmSend}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={[checkoutFlow.outline, { marginTop: spacing.sm }]}
        >
          <Text style={checkoutFlow.outlineLabel}>{CHECKOUT_MSG.goBack}</Text>
        </Pressable>
      </View>
    </AppPageShell>
  );
}

const ORDERS_TOTAL_LABEL = 'Total';