import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { listClientOrders } from '../services/trackingService';
import { colors, card, font, radius, spacing } from '../theme/theme';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const [activeOrder, setActiveOrder] = useState(null);

  const greeting = user?.firstName ? `Hello, ${user.firstName}.` : 'Hello.';

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        setActiveOrder(null);
        return;
      }
      const orders = listClientOrders(user.id);
      const active = orders.find((o) => !o.terminal) || null;
      setActiveOrder(active);
    }, [user]),
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Food is Life" subtitle="Healthy meals, made with care" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.heroTitle}>Good food, made for your needs.</Text>
          <Text style={styles.lead}>
            Browse meals matched to your health information, dietary needs, and preferences.
          </Text>
        </View>

        {activeOrder ? (
          <View style={[styles.orderCard, styles.orderAccent]}>
            <Text style={styles.cardTitle}>Active order</Text>
            <Text style={styles.body}>Tracking: {activeOrder.trackingNumber}</Text>
            <Text style={styles.body}>Status: {activeOrder.status}</Text>
            <AppButton
              title="My Current Order"
              onPress={() => navigation.navigate('Orders', {
                screen: 'OrderDetail',
                params: { orderId: activeOrder.id },
              })}
              style={styles.cardBtn}
            />
          </View>
        ) : (
          <Text style={styles.noOrders}>You have no active orders</Text>
        )}

        <AppButton
          title="Browse Meals"
          onPress={() => navigation.navigate('Meals')}
          color={colors.action}
          style={[styles.btn, styles.primaryAction]}
        />
        <AppButton
          title="My Orders"
          variant="outline"
          onPress={() => navigation.navigate('Orders')}
          color={colors.primary}
          style={styles.btn}
        />
        <AppButton
          title="My Account"
          variant="outline"
          onPress={() => navigation.navigate('Account')}
          color={colors.primary}
          style={styles.btn}
        />
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>What would you like to do?</Text>
          <Text style={styles.sectionHint}>Your profile helps us personalize your meals.</Text>
        </View>

        {itemCount > 0 ? (
          <AppButton
            title="Review order"
            onPress={() => navigation.navigate('Meals', { screen: 'Checkout' })}
            color={colors.primary}
            style={styles.btn}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  hero: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg },
  greeting: {
    fontSize: font.body,
    lineHeight: 24,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  heroTitle: { fontSize: 24, lineHeight: 30, color: colors.primaryDark, fontWeight: '800', marginBottom: spacing.sm },
  lead: {
    fontSize: font.body,
    lineHeight: 24,
    color: colors.text,
    marginBottom: spacing.md,
  },
  orderCard: { ...card, padding: spacing.lg, marginBottom: spacing.lg },
  orderAccent: { borderColor: colors.accent, borderLeftWidth: 5 },
  cardTitle: { fontSize: font.body, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  body: { fontSize: font.body, lineHeight: 24, color: colors.text },
  cardBtn: { marginTop: spacing.md },
  noOrders: {
    fontSize: font.body,
    lineHeight: 24,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  sectionHeading: { marginTop: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontSize: font.lg, fontWeight: '800', color: colors.primaryDark },
  sectionHint: { fontSize: font.body, lineHeight: 24, color: colors.muted, marginTop: spacing.xs },
  primaryAction: { paddingVertical: spacing.md },
  btn: { marginBottom: spacing.sm },
});
