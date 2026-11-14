import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import AppPageShell from '../../components/AppPageShell';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useCheckout } from '../../context/CheckoutContext';
import { CHECKOUT_MSG, CHECKOUT_PLANS, type CheckoutPlanId } from '../../data/checkoutCopy';
import { checkoutFlow } from '../../styles/checkoutFlow';
import AppButton from '../../components/AppButton';

export default function ChoosePlanScreen({ navigation }: {
  navigation: { navigate: (name: string) => void; goBack: () => void };
}) {
  const { user } = useAuth();
  const { items } = useCart();
  const { setPlanId } = useCheckout();

  useEffect(() => {
    if (!user?.id || user.role === 'visitor') return;
    if (!items.length) navigation.navigate('MealsList');
  }, [user, items.length, navigation]);

  const onChoose = (planId: CheckoutPlanId) => {
    setPlanId(planId);
    navigation.navigate('FulfillmentChoice');
  };

  if (!user?.id || user.role === 'visitor') {
    return (
      <AppPageShell edges={['top']} contentStyle={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
          <Text style={checkoutFlow.lead}>Log in to choose a plan and place your order.</Text>
          <AppButton title="Log in" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
        </View>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell edges={['top']} contentStyle={{ flex: 1 }}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <Text style={checkoutFlow.title} accessibilityRole="header">{CHECKOUT_MSG.choosePlanTitle}</Text>
        <Text style={checkoutFlow.lead}>{CHECKOUT_MSG.choosePlanLead}</Text>

        {CHECKOUT_PLANS.map((plan) => (
          <View key={plan.id} style={checkoutFlow.card}>
            <Text style={checkoutFlow.cardTitle}>{plan.label}</Text>
            <Text style={checkoutFlow.cardBody}>{plan.description}</Text>
            <Text style={checkoutFlow.cardPrice}>{plan.priceLabel}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${CHECKOUT_MSG.choosePlan} ${plan.label}`}
              onPress={() => onChoose(plan.id)}
              style={checkoutFlow.primary}
            >
              <Text style={checkoutFlow.primaryLabel}>{CHECKOUT_MSG.choosePlan}</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </AppPageShell>
  );
}