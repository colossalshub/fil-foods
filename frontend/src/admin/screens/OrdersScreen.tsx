import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COPY } from '../copy.js';
import {
  adminView,
  assignDelivery,
  deliveryStaff,
  searchStaffOrders,
  setOrderStatusAsync,
} from '../data/store.js';
import { statusesForStaffRole } from '../../lib/staffBackend.js';
import { peso } from '../domain/format.js';
import { useAdmin } from '../context.js';
import { openRoot, type ScreenProps } from '../nav.js';
import type { OrderStatus } from '../types';
import {
  ConfirmCard,
  FilterChips,
  FlashBanner,
  GreenHeader,
  PhoneFrame,
  PrimaryButton,
  StatusBadge,
  useStoreRevision,
} from '../components.js';

declare const require: (id: string) => number;

const PHOTOS: Record<string, number> = {
  wrap: require('../../../assets/images/meals/grilled-chicken-wrap.jpg'),
  salad: require('../../../assets/images/meals/greek-chickpea-salad.jpg'),
  salmon: require('../../../assets/images/meals/salmon-teriyaki.jpg'),
  omelette: require('../../../assets/images/meals/egg-white-omelette.jpg'),
  bangus: require('../../../assets/images/meals/grilled-bangus.jpg'),
};

export function OrdersScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { colors, t } = useAdmin();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'All' | OrderStatus>('All');
  const [basket, setBasket] = useState(false);
  const rows = searchStaffOrders(query, status);
  const searching = query.trim().length >= 2;
  return (
    <View style={styles.flex}>
      <GreenHeader
        title={t('orders')}
        onBack={() => navigation.navigate('Dashboard')}
        right={(
          <Pressable accessibilityLabel="Basket" onPress={() => setBasket(true)}>
            <Ionicons name="basket-outline" size={22} color="#FFFFFF" />
          </Pressable>
        )}
      />
      <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('searchOrders')}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>
      <View style={styles.chips}>
        <FilterChips
          value={status}
          onChange={(id) => setStatus(id as 'All' | OrderStatus)}
          options={[
            { id: 'All', label: t('all') },
            { id: 'For Dietitian Review', label: 'Review' },
            { id: 'Preparing', label: t('preparing') },
            { id: 'Completed', label: 'Completed' },
          ]}
        />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {rows.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{COPY.noOrders}</Text>
            {searching ? <PrimaryButton title={COPY.clearSearch} variant="outline" onPress={() => setQuery('')} /> : null}
          </View>
        ) : rows.map((order) => (
          <Pressable key={order.id} onPress={() => openRoot(navigation, 'OrderDetail', { id: order.id })} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image source={PHOTOS[order.photo]} style={styles.photo} />
            <View style={styles.flex}>
              <Text style={[styles.id, { color: colors.text }]}>#{order.id}</Text>
              <Text style={{ color: colors.text }}>{order.customerName}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{order.when}</Text>
            </View>
            <View style={styles.side}>
              <StatusBadge status={order.status} />
              <Text style={[styles.price, { color: colors.text }]}>{peso(order.price)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
      <ConfirmCard visible={basket} title={COPY.noOrderSelected} confirmLabel="OK" onConfirm={() => setBasket(false)} />
    </View>
  );
}

export function OrderDetailScreen({ navigation, route }: ScreenProps<{ id?: string }>) {
  useStoreRevision();
  const { session, colors, showFlash } = useAdmin();
  const data = adminView();
  const order = data.orders.find((row) => row.id === route.params?.id);
  const canManage = session?.role === 'admin' || session?.role === 'dietitian' || session?.role === 'kitchen' || session?.role === 'delivery';
  const locked = !order || order.status === 'Completed' || order.status === 'Cancelled';
  const transitionOptions = session ? statusesForStaffRole(session.role) : [];
  if (!session || !order) {
    return (
      <PhoneFrame>
        <GreenHeader title="Order" onBack={() => navigation.goBack()} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{COPY.noOrders}</Text>
      </PhoneFrame>
    );
  }
  const actor = { id: session.id, name: session.name, email: session.email, role: session.role };
  const customer = data.customers.find((row) => row.name === order.customerName);
  return (
    <PhoneFrame>
      <GreenHeader title={`#${order.id}`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <FlashBanner />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image source={PHOTOS[order.photo]} style={styles.photo} />
          <View style={styles.flex}>
            <Text style={[styles.id, { color: colors.text }]}>{order.customerName}</Text>
            <Text style={{ color: colors.muted }}>{order.when}</Text>
            <Text style={[styles.price, { color: colors.text }]}>{peso(order.price)}</Text>
          </View>
          <StatusBadge status={order.status} />
        </View>
        {order.lines.map((line) => (
          <Text key={line.name} style={{ color: colors.text }}>{line.name} · {peso(line.price)}</Text>
        ))}
        {order.assigneeName ? <Text style={{ color: colors.text }}>Delivery: {order.assigneeName}</Text> : null}
        {locked ? <Text style={{ color: colors.muted }}>{COPY.readOnlyOrder}</Text> : null}
        {canManage && !locked ? (
          <>
            <Text style={[styles.id, { color: colors.text }]}>Update status</Text>
            <View style={styles.statusRow}>
              {transitionOptions.map((status) => (
                <Pressable
                  key={status}
                  onPress={async () => {
                    const result = await setOrderStatusAsync(actor, order.id, status);
                    if (result.message) showFlash(result.message);
                  }}
                  style={[styles.statusBtn, { borderColor: colors.border, backgroundColor: order.status === status ? colors.mint : colors.card }]}
                >
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{status}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.id, { color: colors.text }]}>Assign delivery</Text>
            {deliveryStaff().map((person) => (
              <Pressable
                key={person.id}
                onPress={() => {
                  const result = assignDelivery(actor, order.id, person.id);
                  if (result.message) showFlash(result.message);
                }}
                style={[styles.card, { backgroundColor: colors.card, borderColor: order.assigneeId === person.id ? colors.primary : colors.border }]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>{person.name}</Text>
              </Pressable>
            ))}
          </>
        ) : null}
        {customer ? (
          <PrimaryButton title="Customer details" variant="outline" onPress={() => openRoot(navigation, 'CustomerDetail', { id: customer.id })} />
        ) : null}
        {order.updates.map((update) => (
          <Text key={`${update.at}-${update.summary}`} style={{ color: colors.muted }}>
            {update.by} · {update.summary}
          </Text>
        ))}
      </ScrollView>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { margin: 16, marginBottom: 8, borderWidth: 1, borderRadius: 14, minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 10 },
  chips: { paddingHorizontal: 16, marginBottom: 8 },
  card: { marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  photo: { width: 58, height: 58, borderRadius: 12 },
  id: { fontWeight: '800', fontSize: 16 },
  price: { fontWeight: '800', marginTop: 6 },
  side: { alignItems: 'flex-end', gap: 6 },
  empty: { padding: 24, gap: 12 },
  emptyTitle: { textAlign: 'center', fontSize: 16, fontWeight: '700', marginTop: 12 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
});
