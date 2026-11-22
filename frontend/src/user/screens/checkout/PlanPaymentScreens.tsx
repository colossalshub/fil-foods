import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import AppPageShell from '../../components/AppPageShell';
import PageHeader from '../../components/PageHeader';
import CheckoutRadio from '../../components/CheckoutRadio';
import { useAuth } from '../../context/AuthContext';
import { CHECKOUT_MSG } from '../../data/checkoutCopy';
import { checkoutFlow } from '../../styles/checkoutFlow';
import { formatPeso } from '../../services/orderService';
import { confirmChoosePlan, getPlanDefinition } from '../../services/planService';

const METHODS = [
  { id: 'gcash', label: CHECKOUT_MSG.gcash },
  { id: 'maya', label: CHECKOUT_MSG.maya },
  { id: 'cod', label: CHECKOUT_MSG.cod },
];

export function PlanPaymentScreen({ route, navigation }: {
  route: { params?: { periodId?: string } };
  navigation: { navigate: (name: string, params?: object) => void; goBack: () => void };
}) {
  const { user } = useAuth();
  const periodId = route.params?.periodId || '';
  const plan = getPlanDefinition(periodId);
  const [method, setMethod] = useState('gcash');
  const [error, setError] = useState('');

  const onPay = () => {
    if (!plan || !user?.id) {
      setError('Choose a plan first.');
      return;
    }
    if (method === 'cod') {
      const result = confirmChoosePlan(user.id, periodId);
      if (!result.ok && !result.alreadyActive) {
        setError(result.message || 'Unable to start this plan.');
        return;
      }
      navigation.navigate('PlanPaymentSuccess', {
        message: result.message || `${plan.name} is active.`,
        method: CHECKOUT_MSG.cod,
        priceLabel: plan.priceLabel,
      });
      return;
    }
    const selected = METHODS.find((item) => item.id === method) || METHODS[0];
    navigation.navigate('PlanPaymentGateway', { periodId, method: selected.label });
  };

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={checkoutFlow.page}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <PageHeader title="Pay for your plan" subtitle={plan ? `${plan.name} · ${plan.priceLabel}` : 'Choose a plan first.'} />
        <View style={checkoutFlow.notice}>
          <Text style={checkoutFlow.noticeText}>{CHECKOUT_MSG.localPayDemo}</Text>
        </View>
        {plan ? (
          <>
            <Text style={checkoutFlow.paymentSectionTitle}>{CHECKOUT_MSG.chooseHowToPay}</Text>
            {METHODS.map((item) => {
              const active = method === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active, checked: active }}
                  onPress={() => setMethod(item.id)}
                  style={[checkoutFlow.payRow, active && checkoutFlow.payRowOn]}
                >
                  <Text style={checkoutFlow.payLabel}>{item.label}</Text>
                  <CheckoutRadio selected={active} />
                </Pressable>
              );
            })}
          </>
        ) : null}
        {error ? <Text style={checkoutFlow.error}>{error}</Text> : null}
      </ScrollView>
      <View style={checkoutFlow.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={plan ? CHECKOUT_MSG.payAmount(formatPeso(plan.price)) : CHECKOUT_MSG.payNow}
          onPress={onPay}
          disabled={!plan}
          style={[checkoutFlow.primary, { marginTop: 0 }, !plan && checkoutFlow.primaryDisabled]}
        >
          <Text style={checkoutFlow.primaryLabel}>
            {method === 'cod' ? CHECKOUT_MSG.cod : CHECKOUT_MSG.payAmount(formatPeso(plan?.price || 0))}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={checkoutFlow.outline}>
          <Text style={checkoutFlow.outlineLabel}>{CHECKOUT_MSG.cancelPayment}</Text>
        </Pressable>
      </View>
    </AppPageShell>
  );
}

export function PlanPaymentGatewayScreen({ route, navigation }: {
  route: { params?: { periodId?: string; method?: string } };
  navigation: { navigate: (name: string, params?: object) => void; goBack: () => void };
}) {
  const { user } = useAuth();
  const periodId = route.params?.periodId || '';
  const method = route.params?.method || CHECKOUT_MSG.gcash;
  const plan = getPlanDefinition(periodId);
  const [error, setError] = useState('');

  const finish = (outcome: 'paid' | 'failed' | 'cancelled') => {
    if (outcome !== 'paid') {
      setError(outcome === 'failed' ? CHECKOUT_MSG.paymentFailedLead : CHECKOUT_MSG.paymentCancelledLead);
      return;
    }
    if (!user?.id || !plan) {
      setError('Choose a plan first.');
      return;
    }
    const result = confirmChoosePlan(user.id, periodId);
    if (!result.ok && !result.alreadyActive) {
      setError(result.message || 'Unable to start this plan.');
      return;
    }
    navigation.navigate('PlanPaymentSuccess', {
      message: result.message || `${plan.name} is active.`,
      method,
      priceLabel: plan.priceLabel,
    });
  };

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={checkoutFlow.page}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <PageHeader title={`${method} checkout`} subtitle={CHECKOUT_MSG.gatewayLead} />
        <View style={checkoutFlow.notice}>
          <Text style={checkoutFlow.noticeText}>{CHECKOUT_MSG.localPayDemo}</Text>
        </View>
        {plan ? (
          <Text style={checkoutFlow.amountDueRow}>{`${CHECKOUT_MSG.amountDue} ${formatPeso(plan.price)}`}</Text>
        ) : null}
        {error ? <Text style={checkoutFlow.error}>{error}</Text> : null}
      </ScrollView>
      <View style={checkoutFlow.footer}>
        <Pressable accessibilityRole="button" onPress={() => finish('paid')} style={[checkoutFlow.primary, { marginTop: 0 }]}>
          <Text style={checkoutFlow.primaryLabel}>{CHECKOUT_MSG.payNow}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => finish('failed')} style={checkoutFlow.outline}>
          <Text style={checkoutFlow.outlineLabel}>{CHECKOUT_MSG.paymentFailedTitle}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={checkoutFlow.outline}>
          <Text style={checkoutFlow.outlineLabel}>{CHECKOUT_MSG.cancelPayment}</Text>
        </Pressable>
      </View>
    </AppPageShell>
  );
}

export function PlanPaymentSuccessScreen({ route, navigation }: {
  route: { params?: { message?: string; method?: string; priceLabel?: string } };
  navigation: { navigate: (name: string) => void };
}) {
  const message = route.params?.message || 'Your plan is active.';
  const cash = route.params?.method === CHECKOUT_MSG.cod;

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={checkoutFlow.page}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <PageHeader
          title={cash ? CHECKOUT_MSG.codTitle : CHECKOUT_MSG.paidTitle}
          subtitle={cash ? CHECKOUT_MSG.codLead : message}
        />
        {!cash ? <Text style={checkoutFlow.line}>{message}</Text> : null}
        {route.params?.priceLabel ? (
          <Text style={checkoutFlow.amountDueRow}>{`${CHECKOUT_MSG.amountPaid} ${route.params.priceLabel}`}</Text>
        ) : null}
      </ScrollView>
      <View style={checkoutFlow.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to subscription"
          onPress={() => navigation.navigate('Plans')}
          style={[checkoutFlow.primary, { marginTop: 0 }]}
        >
          <Text style={checkoutFlow.primaryLabel}>Back to subscription</Text>
        </Pressable>
      </View>
    </AppPageShell>
  );
}
