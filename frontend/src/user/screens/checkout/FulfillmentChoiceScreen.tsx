import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import AppPageShell from '../../components/AppPageShell';
import CheckoutRadio from '../../components/CheckoutRadio';
import { useCart } from '../../context/CartContext';
import { useCheckout } from '../../context/CheckoutContext';
import { FULFILLMENT_COPY } from '../../data/checkoutCopy';
import { checkoutFlow } from '../../styles/checkoutFlow';

function MethodCard({
  title,
  body,
  icon,
  selected,
  onPress,
}: {
  title: string;
  body: string;
  icon: 'car-outline' | 'storefront-outline';
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={[checkoutFlow.methodCard, selected && checkoutFlow.methodCardOn]}
    >
      <View style={checkoutFlow.methodIconWrap}>
        <Ionicons name={icon} size={22} color="#1E4D38" />
      </View>
      <View style={checkoutFlow.methodContent}>
        <Text style={checkoutFlow.methodTitle}>{title}</Text>
        <Text style={checkoutFlow.methodBody}>{body}</Text>
      </View>
      <CheckoutRadio selected={selected} />
    </Pressable>
  );
}

export default function FulfillmentChoiceScreen({ navigation }: {
  navigation: { navigate: (name: string) => void };
}) {
  const { items } = useCart();
  const checkout = useCheckout();
  const [draftType, setDraftType] = useState<'delivery' | 'pickup' | null>(
    checkout.fulfillmentType === 'delivery' || checkout.fulfillmentType === 'pickup'
      ? checkout.fulfillmentType
      : null,
  );

  useEffect(() => {
    if (!items.length) navigation.navigate('MealsList');
  }, [items.length, navigation]);

  const onContinue = () => {
    if (!draftType) return;
    checkout.setFulfillmentType(draftType);
    navigation.navigate('FulfillmentDetails');
  };

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={checkoutFlow.page}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <Text style={checkoutFlow.title} accessibilityRole="header">{FULFILLMENT_COPY.chooseTitle}</Text>
        <Text style={checkoutFlow.lead}>{FULFILLMENT_COPY.chooseLead}</Text>

        <View style={checkoutFlow.methodList}>
          <MethodCard
            title={FULFILLMENT_COPY.deliveryTitle}
            body={FULFILLMENT_COPY.deliveryCardBody}
            icon="car-outline"
            selected={draftType === 'delivery'}
            onPress={() => setDraftType('delivery')}
          />
          <MethodCard
            title={FULFILLMENT_COPY.pickupTitle}
            body={FULFILLMENT_COPY.pickupCardBody}
            icon="storefront-outline"
            selected={draftType === 'pickup'}
            onPress={() => setDraftType('pickup')}
          />
        </View>

        <Text style={checkoutFlow.footnote}>{FULFILLMENT_COPY.chooseFootnote}</Text>
      </ScrollView>

      <View style={checkoutFlow.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={FULFILLMENT_COPY.continue}
          onPress={onContinue}
          disabled={!draftType}
          style={[checkoutFlow.primary, { marginTop: 0 }, !draftType && checkoutFlow.primaryDisabled]}
        >
          <Text style={[checkoutFlow.primaryLabel, !draftType && checkoutFlow.primaryLabelDisabled]}>
            {FULFILLMENT_COPY.continue}
          </Text>
        </Pressable>
      </View>
    </AppPageShell>
  );
}