import { useEffect, useMemo } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import BackHeader from '../../components/BackHeader';
import AppPageShell from '../../components/AppPageShell';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useCheckout } from '../../context/CheckoutContext';
import { getUser } from '../../services/authService';
import { subscriptionForCheckout } from '../../services/planService';
import { orderPartyLines, recipientDisplayName } from '../../domain/audience';
import {
  STANDARD_MEAL_PRICE,
  checkoutTotal,
  formatPeso,
} from '../../services/orderService';
import { feeForSpecialRequest, specialRequestLabel } from '../../domain/specialRequest';
import { CHECKOUT_MSG, CHECKOUT_PLANS } from '../../data/checkoutCopy';
import { ORDERS_COPY, SPECIAL_REQUEST_COPY } from '../../data/messages';
import { checkoutFlow } from '../../styles/checkoutFlow';
import { colors, spacing } from '../../theme/theme';
import { formatScheduleSummary } from '../../components/scheduleValue';

const MEAL_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function OrderSummaryScreen({ navigation }: {
  navigation: {
    navigate: (name: string, params?: object, options?: { pop?: boolean }) => void;
    goBack: () => void;
  };
}) {
  const { user } = useAuth();
  const { items } = useCart();
  const checkout = useCheckout();
  const isFocused = useIsFocused();
  const dbUser = useMemo(() => (user?.id ? getUser(user.id) : null), [user]);
  const subscribed = subscriptionForCheckout(user?.id, dbUser?.plan || user?.plan);
  const hasSubscription = Boolean(subscribed);

  useEffect(() => {
    // This screen stays mounted under the schedule page. Reacting while it is
    // covered pushes a new Delivery or Pickup screen on every date or method tap.
    if (!isFocused) return;
    if (!items.length) {
      navigation.navigate('MealsList', undefined, { pop: true });
      return;
    }
    if (!checkout.fulfillmentType || !checkout.scheduleDate || !checkout.scheduleTime) {
      navigation.goBack();
    }
    if (hasSubscription && checkout.planId !== 'standard') checkout.setPlanId('standard');
  }, [
    isFocused,
    items.length,
    navigation,
    checkout.fulfillmentType,
    checkout.scheduleDate,
    checkout.scheduleTime,
    checkout.planId,
    checkout.setPlanId,
    hasSubscription,
  ]);

  const lineItems = items.map((row) => ({
    meal: row.meal,
    quantity: row.quantity,
    customization: row.customization,
    specialRequest: row.specialRequest,
  }));
  const pricingPlanId = subscribed ? 'standard' : checkout.planId;
  const totals = checkoutTotal(lineItems, pricingPlanId, subscribed
    ? { ...(dbUser || user || {}), plan: subscribed }
    : (dbUser || user || {}));
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
  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={checkoutFlow.page}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <BackHeader title={CHECKOUT_MSG.orderSummaryTitle} subtitle={CHECKOUT_MSG.orderSummaryLead} onBack={() => navigation.goBack()} />

        <View style={checkoutFlow.mealList}>
          {sortedItems.map((row) => (
            <View key={row.meal.id} style={checkoutFlow.mealRow}>
              <View style={checkoutFlow.mealLeft}>
                <Text style={checkoutFlow.mealSlot}>{row.meal.category || 'Meal'}</Text>
                <Text style={checkoutFlow.mealName}>{row.meal.name}</Text>
                {row.customizationLabel ? (
                  <Text style={checkoutFlow.mealSlot}>{row.customizationLabel}</Text>
                ) : null}
                {specialRequestLabel(row.specialRequest) ? (
                  <Text style={checkoutFlow.mealSlot}>
                    {`${SPECIAL_REQUEST_COPY.heading}: ${specialRequestLabel(row.specialRequest)} · ${SPECIAL_REQUEST_COPY.feeLabel} ${formatPeso(row.specialRequest?.fee ?? feeForSpecialRequest(row.specialRequest))}`}
                  </Text>
                ) : null}
              </View>
              <Text style={checkoutFlow.mealPrice}>{formatPeso(row.meal.price || STANDARD_MEAL_PRICE)}</Text>
            </View>
          ))}
        </View>

        <View style={checkoutFlow.summaryFulfillment}>
          <Ionicons
            name={checkout.fulfillmentType === 'pickup' ? 'storefront-outline' : 'car-outline'}
            size={22}
            color={colors.primary}
          />
          <Text style={checkoutFlow.fulfillmentKicker}>{ORDERS_COPY.fulfillmentHeading}</Text>
          <Text style={checkoutFlow.fulfillmentTypeLine}>{fulfillmentTypeLabel}</Text>
          {checkout.fulfillmentType === 'delivery' ? (
            <Text style={checkoutFlow.fulfillmentBody}>{checkout.address}</Text>
          ) : null}
          <Text style={checkoutFlow.fulfillmentBody}>{scheduleLabel}</Text>
        </View>

        {/* USR-46 C: "Ordered by" + "Meal recipient", or "Ordered by and for" (For Myself). */}
        {party.length ? (
          <View style={{ marginTop: spacing.lg }}>
            {party.map((line) => (
              <Text key={line.label} style={checkoutFlow.line}>
                <Text style={checkoutFlow.lineBold}>{`${line.label}: `}</Text>
                {line.value}
              </Text>
            ))}
          </View>
        ) : null}

        {/* USR-20 A: total from the selected meals (Standard meal) or a selected plan.
            An active subscription already covers the order, so the plan list stays hidden. */}
        <Text style={checkoutFlow.sectionHeading}>
          {subscribed ? CHECKOUT_MSG.plan : CHECKOUT_MSG.planChoiceHeading}
        </Text>
        <Text style={checkoutFlow.optionCardBody}>
          {subscribed ? CHECKOUT_MSG.planAlready : CHECKOUT_MSG.planChoiceLead}
        </Text>
        {subscribed ? (
          <View style={[checkoutFlow.optionCard, checkoutFlow.optionCardOn, { marginTop: spacing.md }]}>
            <View style={checkoutFlow.optionCardRow}>
              <Text style={[checkoutFlow.optionCardTitle, { flex: 1 }]}>{subscribed.name}</Text>
              <Text style={checkoutFlow.optionCardTitle}>{subscribed.priceLabel}</Text>
            </View>
          </View>
        ) : (
          <View accessibilityRole="radiogroup" style={[checkoutFlow.optionList, { marginTop: spacing.md }]}>
            {CHECKOUT_PLANS.map((plan) => {
              const on = checkout.planId === plan.id;
              const price = plan.perMealLabel || plan.priceLabel;
              return (
                <Pressable
                  key={plan.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${plan.label}, ${price}`}
                  onPress={() => checkout.setPlanId(plan.id)}
                  style={[checkoutFlow.optionCard, on && checkoutFlow.optionCardOn]}
                >
                  <View style={checkoutFlow.optionCardRow}>
                    <View style={[checkoutFlow.radio, on && checkoutFlow.radioOn]}>
                      {on ? <View style={checkoutFlow.radioDot} /> : null}
                    </View>
                    <Text style={[checkoutFlow.optionCardTitle, { flex: 1 }]}>{plan.label}</Text>
                    <Text style={checkoutFlow.optionCardTitle}>{price}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {totals.discountAmount ? (
          <View style={[checkoutFlow.mealRow, { marginTop: spacing.lg }]}>
            <Text style={checkoutFlow.summaryTotalLabel}>{CHECKOUT_MSG.planDiscount}</Text>
            <Text style={checkoutFlow.mealPrice}>{`-${formatPeso(totals.discountAmount)}`}</Text>
          </View>
        ) : null}
        {totals.specialRequestFees ? (
          <View style={[checkoutFlow.mealRow, { marginTop: spacing.lg }]}>
            <Text style={checkoutFlow.summaryTotalLabel}>{SPECIAL_REQUEST_COPY.feesLine}</Text>
            <Text style={checkoutFlow.mealPrice}>{formatPeso(totals.specialRequestFees)}</Text>
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
          style={[checkoutFlow.primary, { marginTop: 0 }]}
        >
          <Text style={checkoutFlow.primaryLabel}>{CHECKOUT_MSG.placeOrder}</Text>
        </Pressable>
      </View>
    </AppPageShell>
  );
}