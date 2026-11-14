import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import AppPageShell from '../../components/AppPageShell';
import ScheduleSlotPicker from '../../components/ScheduleSlotPicker';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useCheckout } from '../../context/CheckoutContext';
import { FULFILLMENT_COPY } from '../../data/checkoutCopy';
import { checkoutFlow } from '../../styles/checkoutFlow';

function FulfillmentToggle({
  type,
  onChange,
}: {
  type: 'delivery' | 'pickup';
  onChange: (next: 'delivery' | 'pickup') => void;
}) {
  return (
    <View style={checkoutFlow.segment}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: type === 'delivery' }}
        onPress={() => onChange('delivery')}
        style={[checkoutFlow.segmentBtn, type === 'delivery' && checkoutFlow.segmentBtnOn]}
      >
        <Text style={[checkoutFlow.segmentText, type === 'delivery' && checkoutFlow.segmentTextOn]}>
          {FULFILLMENT_COPY.deliveryTitle}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: type === 'pickup' }}
        onPress={() => onChange('pickup')}
        style={[checkoutFlow.segmentBtn, type === 'pickup' && checkoutFlow.segmentBtnOn]}
      >
        <Text style={[checkoutFlow.segmentText, type === 'pickup' && checkoutFlow.segmentTextOn]}>
          {FULFILLMENT_COPY.pickupTitle}
        </Text>
      </Pressable>
    </View>
  );
}

export default function FulfillmentDetailsScreen({ navigation }: {
  navigation: { navigate: (name: string) => void; goBack: () => void };
}) {
  const { user } = useAuth();
  const { items } = useCart();
  const checkout = useCheckout();
  const type: 'delivery' | 'pickup' = checkout.fulfillmentType === 'pickup' ? 'pickup' : 'delivery';

  const savedAddress = user?.mealRecipient?.deliveryAddress || user?.address || '';
  const [useCustomAddress, setUseCustomAddress] = useState(
    Boolean(checkout.address && checkout.address !== savedAddress),
  );

  useEffect(() => {
    if (!items.length) navigation.navigate('MealsList');
    else if (!checkout.fulfillmentType) navigation.goBack();
  }, [items.length, navigation, checkout.fulfillmentType]);

  useEffect(() => {
    if (type === 'delivery' && !useCustomAddress && savedAddress && !checkout.address) {
      checkout.setAddress(savedAddress);
    }
  }, [type, useCustomAddress, savedAddress, checkout]);

  const addressReady = useMemo(() => {
    if (type !== 'delivery') return true;
    if (useCustomAddress) return checkout.address.trim().length > 0;
    return savedAddress.trim().length > 0;
  }, [type, useCustomAddress, checkout.address, savedAddress]);

  const canContinue = addressReady && checkout.scheduleDate && checkout.scheduleTime;

  const onContinue = () => {
    if (type === 'delivery' && !useCustomAddress) {
      checkout.setAddress(savedAddress);
    }
    navigation.navigate('OrderSummary');
  };

  const detailsTitle = type === 'delivery' ? FULFILLMENT_COPY.deliveryDetailsTitle : FULFILLMENT_COPY.pickupDetailsTitle;
  const detailsLead = type === 'delivery' ? FULFILLMENT_COPY.deliveryDetailsLead : FULFILLMENT_COPY.pickupDetailsLead;

  return (
    <AppPageShell edges={['top', 'bottom']} contentStyle={checkoutFlow.page}>
      <ScrollView contentContainerStyle={checkoutFlow.scroll} showsVerticalScrollIndicator={false}>
        <FulfillmentToggle
          type={type}
          onChange={(next) => checkout.setFulfillmentType(next)}
        />

        <Text style={[checkoutFlow.title, { marginTop: 8 }]} accessibilityRole="header">{detailsTitle}</Text>
        <Text style={checkoutFlow.lead}>{detailsLead}</Text>

        {type === 'delivery' ? (
          <>
            {!useCustomAddress && savedAddress ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: true }}
                onPress={() => setUseCustomAddress(false)}
                style={checkoutFlow.savedAddressCard}
              >
                <View style={checkoutFlow.savedAddressRow}>
                  <Text style={checkoutFlow.savedAddressTitle}>{FULFILLMENT_COPY.useSavedAddress}</Text>
                  <Ionicons name="checkmark-circle" size={22} color="#1E4D38" />
                </View>
                <Text style={checkoutFlow.savedAddressBody}>{savedAddress}</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setUseCustomAddress(true);
                if (!checkout.address) checkout.setAddress('');
              }}
              style={checkoutFlow.textLinkWrap}
            >
              <Text style={checkoutFlow.textLink}>{FULFILLMENT_COPY.requestDifferentAddress}</Text>
            </Pressable>

            {useCustomAddress || !savedAddress ? (
              <TextInput
                style={checkoutFlow.input}
                value={checkout.address}
                onChangeText={checkout.setAddress}
                placeholder="Street, city"
                accessibilityLabel="Delivery address"
              />
            ) : null}
          </>
        ) : (
          <View style={checkoutFlow.card}>
            <Text style={checkoutFlow.cardTitle}>{FULFILLMENT_COPY.pickupCounterTitle}</Text>
            {FULFILLMENT_COPY.pickupSteps.map((step, index) => (
              <Text key={step} style={checkoutFlow.line}>
                <Text style={checkoutFlow.lineBold}>{`${index + 1}. `}</Text>
                {step}
              </Text>
            ))}
          </View>
        )}

        <ScheduleSlotPicker
          date={checkout.scheduleDate}
          time={checkout.scheduleTime}
          onChangeDate={checkout.setScheduleDate}
          onChangeTime={checkout.setScheduleTime}
        />
      </ScrollView>

      <View style={checkoutFlow.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={FULFILLMENT_COPY.continue}
          onPress={onContinue}
          disabled={!canContinue}
          style={[checkoutFlow.primary, !canContinue && checkoutFlow.primaryDisabled]}
        >
          <Text style={checkoutFlow.primaryLabel}>{FULFILLMENT_COPY.continue}</Text>
        </Pressable>
      </View>
    </AppPageShell>
  );
}