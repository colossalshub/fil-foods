import { useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getUser } from '../services/authService';
import { getProfileForMeals } from '../services/profileService';
import {
  ORDER_MSG,
  calculateTotals,
  collectOrderAllergenWarnings,
  confirmOrder,
  formatPhp,
  lineSubtotal,
  parseQuantityInput,
  validateFulfillment,
} from '../services/orderService';
import { colors, font, radius, spacing, control } from '../theme/theme';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import { placeOrderWithBackend } from '../services/backendOrderService.js';

function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function FulfillmentOption({ label, active, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.option, active && styles.optionActive]}
    >
      <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function OrderScreen({ navigation }) {
  const { user } = useAuth();
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const [fulfillmentType, setFulfillmentType] = useState(null);
  const [address, setAddress] = useState('');
  const [scheduleText, setScheduleText] = useState('');
  const [instructions, setInstructions] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [allergenAck, setAllergenAck] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const requestIdRef = useRef(createRequestId());

  const dbUser = useMemo(() => (user?.id ? getUser(user.id) : null), [user]);
  const profile = useMemo(() => (user?.id ? getProfileForMeals(user.id) : null), [user]);

  const lineItems = useMemo(
    () => items.map((row) => ({ meal: row.meal, quantity: row.quantity })),
    [items],
  );

  const warnings = useMemo(
    () => (profile ? collectOrderAllergenWarnings(lineItems, profile) : []),
    [lineItems, profile],
  );

  const totals = useMemo(
    () => calculateTotals(lineItems, dbUser || {}),
    [lineItems, dbUser],
  );

  const onQtyChange = (mealId, text) => {
    const parsed = parseQuantityInput(text);
    if (!parsed.ok) {
      Alert.alert('Quantity', parsed.message);
      return;
    }
    updateQuantity(mealId, parsed.value);
  };

  const onConfirm = async () => {
    if (!user?.id || !lineItems.length) return;
    if (warnings.length && !allergenAck) {
      Alert.alert('Allergen warning', warnings.map((w) => w.message).join('\n'));
      return;
    }

    const fulfillment = {
      type: fulfillmentType,
      address: fulfillmentType === 'delivery' ? address : '',
      scheduledAt: scheduleText,
      instructions,
    };
    const check = validateFulfillment({ ...fulfillment, now: new Date() });
    if (!check.ok) {
      setFieldError(check.message);
      return;
    }
    setFieldError('');

    setPlacing(true);
    let result;
    try {
      if (isSupabaseConfigured) {
        const backendOrder = await placeOrderWithBackend({
          clientRequestId: requestIdRef.current,
          fulfillmentType: fulfillment.type,
          schedule: check.scheduled.toISOString(),
          address: fulfillment.address,
          specialInstructions: fulfillment.instructions,
          items: lineItems.map((row) => ({
            mealId: row.meal.id,
            quantity: parseQuantityInput(row.quantity).value,
          })),
        });
        result = {
          ok: true,
          order: backendOrder,
          message: ORDER_MSG.orderSuccess,
        };
        requestIdRef.current = createRequestId();
      } else {
        result = confirmOrder(user.id, {
          items: lineItems,
          fulfillment,
          now: new Date(),
          clientRequestId: requestIdRef.current,
          allergenAcknowledged: allergenAck || warnings.length === 0,
        });
      }
    } catch (error) {
      result = { ok: false, messages: [error.message || 'Unable to place order.'] };
    } finally {
      setPlacing(false);
    }

    if (!result.ok) {
      if (result.placing) return;
      if (result.needsAcknowledgement) {
        Alert.alert('Allergen warning', result.messages.join('\n'));
        return;
      }
      setFieldError(result.messages?.[0] || 'Unable to place order.');
      return;
    }

    setLastOrder(result.order);
    clearCart();
    setAllergenAck(false);
    Alert.alert('Success', ORDER_MSG.orderSuccess);
  };

  if (!user?.id || user.role === 'visitor') {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Order" subtitle="Sign in required" />
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>Log in to place an order and keep your meals private.</Text>
          <AppButton
            title="Log in"
            onPress={() => navigation.getParent()?.getParent()?.getParent()?.navigate('Login')}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!items.length && !lastOrder) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Order" subtitle="Review and confirm" />
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>Your cart is empty. Add meals to get started.</Text>
          <AppButton title="Browse Meals" onPress={() => navigation.navigate('MealsList')} style={{ alignSelf: 'stretch' }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Order" subtitle="Review and confirm" />
      <ScrollView contentContainerStyle={styles.content}>
        {lastOrder ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>{ORDER_MSG.orderSuccess}</Text>
            <Text style={styles.body}>Tracking: {lastOrder.trackingNumber}</Text>
            <Text style={styles.body}>Status: {lastOrder.status}</Text>
          </View>
        ) : null}

        <Text style={styles.section}>Meals</Text>
        {items.map((row) => (
          <View key={row.meal.id} style={styles.line}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lineName}>{row.meal.name}</Text>
              <Text style={styles.lineMeta}>{formatPhp(row.meal.price)} each</Text>
              <TextInput
                style={styles.qtyInput}
                value={String(row.quantity)}
                onChangeText={(t) => onQtyChange(row.meal.id, t)}
                keyboardType="number-pad"
                accessibilityLabel={`Quantity for ${row.meal.name}`}
              />
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('MealDetail', { meal: row.meal })}>
                <Text style={styles.link}>Edit meal</Text>
              </Pressable>
            </View>
            <View style={styles.lineRight}>
              <Text style={styles.lineTotal}>{formatPhp(lineSubtotal(row.meal, row.quantity))}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${row.meal.name}`} onPress={() => removeItem(row.meal.id)} style={styles.removeBtn}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Text style={styles.section}>Fulfillment</Text>
        <Text style={styles.label}>Choose delivery or pickup.</Text>
        <View style={styles.row}>
          <FulfillmentOption label="Delivery" active={fulfillmentType === 'delivery'} onPress={() => setFulfillmentType('delivery')} />
          <FulfillmentOption label="Pickup" active={fulfillmentType === 'pickup'} onPress={() => setFulfillmentType('pickup')} />
        </View>

        {fulfillmentType === 'delivery' ? (
          <>
            <Text style={styles.label}>Delivery address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Street, city"
              placeholderTextColor={colors.inactive}
              accessibilityLabel="Delivery address"
            />
          </>
        ) : null}

        <Text style={styles.label}>Schedule (ISO local, e.g. 2026-10-13T10:00:00)</Text>
        <TextInput
          style={styles.input}
          value={scheduleText}
          onChangeText={setScheduleText}
          placeholder="2026-10-13T10:00:00"
          placeholderTextColor={colors.inactive}
          accessibilityLabel="Schedule date and time"
        />

        <Text style={styles.label}>Instructions (optional)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={instructions}
          onChangeText={setInstructions}
          multiline
          accessibilityLabel="Delivery instructions"
        />

        {fieldError ? <Text style={styles.error}>{fieldError}</Text> : null}

        {warnings.map((w) => (
          <Text key={`${w.mealId}-${w.allergen}`} style={styles.warn}>{w.message}</Text>
        ))}
        {warnings.length ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: allergenAck }}
            onPress={() => setAllergenAck((v) => !v)}
            style={styles.checkRow}
          >
            <View style={[styles.checkbox, allergenAck && styles.checkboxOn]} />
            <Text style={styles.checkLabel}>I understand the allergen warnings</Text>
          </Pressable>
        ) : null}

        <View style={styles.totals}>
          <Text style={styles.body}>Subtotal: {formatPhp(totals.subtotal)}</Text>
          {totals.discountRate > 0 ? (
            <>
              <Text style={styles.body}>Discount ({Math.round(totals.discountRate * 100)}%): -{formatPhp(totals.discountAmount)}</Text>
              <Text style={styles.totalLine}>Total: {formatPhp(totals.total)}</Text>
            </>
          ) : (
            <Text style={styles.totalLine}>Total: {formatPhp(totals.total)}</Text>
          )}
        </View>

        <AppButton
          title={placing ? ORDER_MSG.placingOrder : 'Confirm order'}
          onPress={onConfirm}
          loading={placing}
          disabled={placing || !items.length}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  emptyWrap: { flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.lg },
  empty: { textAlign: 'center', color: colors.muted, fontSize: font.body },
  section: { fontSize: font.body, fontWeight: '700', color: colors.primary, marginTop: spacing.lg, marginBottom: spacing.sm },
  label: { fontSize: font.md, color: colors.muted, marginBottom: 4 },
  body: { fontSize: font.body, color: colors.text },
  line: { flexDirection: 'row', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  lineName: { fontSize: font.body, fontWeight: '700', color: colors.text },
  lineMeta: { fontSize: font.md, color: colors.muted, marginTop: 2 },
  qtyInput: { marginTop: spacing.sm, minHeight: control.minHeight, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, fontSize: font.body, backgroundColor: colors.background, maxWidth: 120 },
  link: { marginTop: spacing.sm, color: colors.action, fontSize: font.md, minHeight: control.minHeight, lineHeight: control.minHeight },
  lineRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  lineTotal: { fontSize: font.body, fontWeight: '700', color: colors.text },
  removeBtn: { minHeight: control.minHeight, justifyContent: 'center' },
  removeText: { color: colors.danger, fontSize: font.md, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  option: { flex: 1, minHeight: control.minHeight, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  optionActive: { borderColor: colors.action, backgroundColor: colors.soft },
  optionText: { fontSize: font.body, color: colors.text },
  optionTextActive: { color: colors.action, fontWeight: '700' },
  input: { minHeight: control.minHeight, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, fontSize: font.body, backgroundColor: colors.white, marginBottom: spacing.md },
  multiline: { minHeight: 80, paddingVertical: spacing.sm, textAlignVertical: 'top' },
  error: { color: colors.danger, fontSize: font.body, marginBottom: spacing.sm },
  warn: { color: colors.danger, fontSize: font.body, marginBottom: spacing.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.sm, minHeight: control.minHeight },
  checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: colors.border, borderRadius: 4, marginRight: spacing.sm },
  checkboxOn: { backgroundColor: colors.action, borderColor: colors.action },
  checkLabel: { flex: 1, fontSize: font.body, color: colors.text },
  totals: { marginVertical: spacing.lg, gap: 4 },
  totalLine: { fontSize: font.body, fontWeight: '700', color: colors.primary, marginTop: 4 },
  successBox: { backgroundColor: colors.soft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  successTitle: { fontSize: font.body, fontWeight: '700', color: colors.success, marginBottom: 4 },
});
