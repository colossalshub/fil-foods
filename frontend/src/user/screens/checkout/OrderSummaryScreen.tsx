import { useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import AppPageShell from '../../components/AppPageShell';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useCheckout } from '../../context/CheckoutContext';
import { getUser } from '../../services/authService';
import { orderPartyLines, recipientDisplayName } from '../../domain/audience';
import {
  STANDARD_MEAL_PRICE,
  calculateTotals,
  formatPeso,
} from '../../services/orderService';
import { CHECKOUT_MSG, STANDARD_PLAN } from '../../data/checkoutCopy';
import { ORDERS_COPY } from '../../data/messages';
import { checkoutFlow } from '../../styles/checkoutFlow';
import { spacing } from '../../theme/theme';
import { formatScheduleSummary } from '../../components/scheduleValue';

const MEAL_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function OrderSummaryScreen({ navigation }: {
  navigation: { navigate: (name: string) => void; goBack: () => void };
}) {
  const { user } = useAuth();
  const { items } = useCart();
  const checkout = useCheckout();
  const dbUser = useMemo(() => (user?.id ? getUser(user.id) : null), [user]);

  useEffect(() => {
    if (!items.length) navigation.navigate('MealsList');
    else if (!checkout.fulfillmentType || !checkout.scheduleDate || !checkout.scheduleTime) {
      navigation.navigate('FulfillmentChoice');
    }
  }, [items.length, navigation, checkout.fulfillmentType, checkout.scheduleDate, checkout.scheduleTime]);

  const lineItems = items.map((row) => ({ meal: row.meal, quantity: row.quantity, customization: row.customization }));
  const totals = calculateTotals(lineItems, dbUser || user || {});
  const sortedItems = [...items].sort((a, b) => {
    const ai = MEAL_ORDER.indexOf(a.meal.category || '');
    const bi = MEAL_ORDER.indexOf(b.meal.category || '');
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  const party = orderPartyLines({
    accountFor: dbUser?.accountFor || user?.accountFor,
    orderedByName: [dbUser?.firstName || user?.firstName, dbUser?.lastName || user?.lastName].filter(Boolean).join(' '),
    mealRecipientName: (dbUser?.accountFor || user?.accountFor) === 'family'
      ? recipientDisplayName(dbUser?.mealRecipient || user?.mealRecipient)
      : '',
    mealRecipientAddress: dbUser?.mealRecipient?.deliveryAddress || user?.mealRecipient?.deliveryAddress || '',
  });

  const scheduleLabel = formatScheduleSummary(checkout.scheduleDate, checkout.scheduleTime);
  const fulfillmentTypeLabel = checkout.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery';
  const planLine = checkout.planId === 'standard'
    ? `${STANDARD_PLAN.label} · ${STANDARD_PLAN.perMealLabel}`
    : CHECKOUT_MSG.plan;

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={checkoutFlow.page}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <Text style={checkoutFlow.title} accessibilityRole="header">{CHECKOUT_MSG.orderSummaryTitle}</Text>
        <Text style={checkoutFlow.lead}>{CHECKOUT_MSG.orderSummaryLead}</Text>

        <View style={checkoutFlow.card}>
          <Text style={checkoutFlow.line}>
            <Text style={checkoutFlow.lineBold}>{`${CHECKOUT_MSG.plan}: `}</Text>
            {planLine}
          </Text>
          {sortedItems.map((row) => (
            <View key={row.meal.id} style={checkoutFlow.mealRow}>
              <View style={checkoutFlow.mealLeft}>
                <Text style={checkoutFlow.mealSlot}>{row.meal.category || 'Meal'}</Text>
                <Text style={checkoutFlow.mealName}>{row.meal.name}</Text>
              </View>
              <Text style={checkoutFlow.mealPrice}>{formatPeso(row.meal.price || STANDARD_MEAL_PRICE)}</Text>
            </View>
          ))}
        </View>

        <View style={checkoutFlow.summaryFulfillment}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons
              name={checkout.fulfillmentType === 'pickup' ? 'storefront-outline' : 'car-outline'}
              size={20}
              color="#1E4D38"
            />
            <Text style={checkoutFlow.fulfillmentTitle}>{ORDERS_COPY.fulfillmentHeading}</Text>
          </View>
          <Text style={checkoutFlow.fulfillmentTitle}>{fulfillmentTypeLabel}</Text>
          {checkout.fulfillmentType === 'delivery' ? (
            <Text style={checkoutFlow.fulfillmentBody}>{checkout.address}</Text>
          ) : null}
          <Text style={checkoutFlow.fulfillmentBody}>{scheduleLabel}</Text>
        </View>

        {party.length > 1 ? (
          <View style={{ marginTop: spacing.lg }}>
            {party.map((line) => (
              <Text key={line.label} style={checkoutFlow.line}>
                <Text style={checkoutFlow.lineBold}>{`${line.label}: `}</Text>
                {line.value}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={checkoutFlow.summaryTotalRow}>
          <Text style={checkoutFlow.summaryTotalLabel}>{ORDERS_COPY.total}</Text>
          <Text style={checkoutFlow.summaryTotalValue}>{formatPeso(totals.total)}</Text>
        </View>
      </ScrollView>

      <View style={checkoutFlow.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={CHECKOUT_MSG.placeOrder}
          onPress={() => navigation.navigate('OrderConfirm')}
          style={checkoutFlow.primary}
        >
          <Text style={checkoutFlow.primaryLabel}>{CHECKOUT_MSG.placeOrder}</Text>
        </Pressable>
      </View>
    </AppPageShell>
  );
}