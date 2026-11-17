import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COPY } from '../copy.js';
import {
  assignDeliveryAsync,
  backendActive,
  customerFor,
  deliveryStaff,
  loadOrderDetail,
  orderFor,
  searchRoleOrders,
  searchStaffOrders,
  setOrderStatusAsync,
  syncStaffData,
} from '../data/store.js';
import { peso } from '../domain/format.js';
import {
  actionsFor,
  can,
  detailStatusLabel,
  displayOrderNo,
  listBadgeLabel,
  type BucketFilter,
  type OrderAction,
} from '../domain/roleAccess.js';
import { useAdmin } from '../context.js';
import { openRoot, type ScreenProps } from '../nav.js';
import type { Actor, AdminOrder } from '../types';
import { ConfirmCard, FlashBanner, GreenHeader, PhoneFrame, PrimaryButton, useStoreRevision } from '../components.js';
import { Card, EmptyState, OrderPhoto, Pill, PreferencesPanel, SearchBox, Section } from '../ui/blocks.js';
import { Text } from '../ui/StaffText.js';
import { ReviewPanel } from './DietitianScreens.js';

export function useActor(): Actor | null {
  const { session } = useAdmin();
  return session ? { id: session.id, name: session.name, email: session.email, role: session.role } : null;
}

/** Pull-to-refresh against Supabase when signed in there. */
export function useRefresh() {
  const { session } = useAdmin();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    if (!session || !backendActive()) return;
    setRefreshing(true);
    await syncStaffData({ id: session.id, name: session.name, email: session.email, role: session.role });
    setRefreshing(false);
  }, [session]);
  return { refreshing, onRefresh, enabled: backendActive() };
}

const FILTERS: { id: 'All' | BucketFilter; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Preparing', label: 'Preparing' },
  { id: 'Delivered', label: 'Delivered' },
];

export function OrderRow({ order, role, onPress }: { order: AdminOrder; role: Actor['role']; onPress: () => void }) {
  const { colors } = useAdmin();
  const firstNameFirst = role === 'kitchen' || role === 'delivery';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Order ${displayOrderNo(order)} ${order.customerName}`}
      onPress={onPress}
      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <OrderPhoto photo={order.photo} />
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{firstNameFirst ? order.customerName : displayOrderNo(order)}</Text>
        <Text style={{ color: colors.text, fontSize: 14 }}>{firstNameFirst ? displayOrderNo(order) : order.customerName}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{order.when}</Text>
      </View>
      <View style={styles.side}>
        <Pill label={listBadgeLabel(role, order.status)} />
        {can(role, 'prices') ? <Text style={[styles.price, { color: colors.text }]}>{peso(order.price)}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

export function OrdersScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { colors, t } = useAdmin();
  const actor = useActor();
  const refresh = useRefresh();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'All' | BucketFilter>('All');
  const [basket, setBasket] = useState(false);
  if (!actor) return null;
  const rows = actor.role === 'admin' ? searchStaffOrders(query, status) : searchRoleOrders(actor, query, status);
  const searching = query.trim().length > 0;
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
      <SearchBox value={query} onChange={setQuery} placeholder={t('searchOrders')} />
      <View style={styles.chips}>
        {FILTERS.map((option) => {
          const selected = option.id === status;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setStatus(option.id)}
              style={[styles.chip, { backgroundColor: selected ? colors.greenDeep : colors.card, borderColor: selected ? colors.greenDeep : colors.border }]}
            >
              <Text style={{ color: selected ? '#FFFFFF' : colors.text, fontWeight: '600', fontSize: 13 }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={refresh.enabled ? <RefreshControl refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} /> : undefined}
      >
        {rows.length === 0 ? (
          <EmptyState
            title={COPY.noOrders}
            action={searching ? <PrimaryButton title={COPY.clearSearch} variant="outline" onPress={() => setQuery('')} /> : undefined}
          />
        ) : rows.map((order) => (
          <OrderRow key={order.id} order={order} role={actor.role} onPress={() => openRoot(navigation, 'OrderDetail', { id: order.id })} />
        ))}
      </ScrollView>
      <ConfirmCard visible={basket} title={COPY.noOrderSelected} confirmLabel="OK" onConfirm={() => setBasket(false)} />
    </View>
  );
}

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function OrderDetailScreen({ navigation, route }: ScreenProps<{ id?: string }>) {
  useStoreRevision();
  const { colors, showFlash } = useAdmin();
  const actor = useActor();
  const id = route.params?.id ?? '';
  const [pending, setPending] = useState<OrderAction | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadOrderDetail(id).then((result) => {
      if (!result.ok && 'message' in result) showFlash(result.message);
    });
  }, [id, showFlash]);

  const order = actor ? orderFor(actor, id) : null;
  if (!actor || !order) {
    return (
      <PhoneFrame>
        <GreenHeader title="Order Details" onBack={() => navigation.goBack()} />
        <EmptyState title={actor ? COPY.noAccess : COPY.noOrders} />
      </PhoneFrame>
    );
  }
  const role = actor.role;
  const showPrices = can(role, 'prices');
  const closed = order.status === 'Completed' || order.status === 'Cancelled';
  const actions = actionsFor(role, actor.id, order);
  const customer = order.clientId ? customerFor(actor, order.clientId) : null;
  const items = order.items?.length ? order.items : order.lines.map((line) => ({ name: line.name, quantity: 1, unitPrice: line.price }));

  const run = async (action: OrderAction) => {
    setPending(null);
    setBusy(true);
    const result = await setOrderStatusAsync(actor, order.id, action.target);
    setBusy(false);
    if (result.message) showFlash(result.message);
  };

  return (
    <PhoneFrame>
      <GreenHeader title="Order Details" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.detail}>
        <FlashBanner />
        <Card style={styles.headCard}>
          <OrderPhoto photo={order.photo} size={64} />
          <View style={styles.flex}>
            <Text style={[styles.headName, { color: colors.text }]}>{order.customerName}</Text>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{displayOrderNo(order)}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {role === 'kitchen' && order.wasPaid ? 'Approved · Paid' : order.when}
            </Text>
            {order.fulfillment === 'pick_up' ? <Text style={{ color: colors.green, fontSize: 12, fontWeight: '600' }}>Pickup order</Text> : null}
          </View>
          <Pill label={detailStatusLabel(role, order.status)} />
        </Card>

        <Section title="Order Items">
          <Card>
            {items.map((item) => (
              <View key={`${item.name}-${item.quantity}`} style={styles.itemRow}>
                <Text style={{ color: colors.text, flex: 1 }}>{item.name} ×{item.quantity}</Text>
                {showPrices && item.unitPrice !== null ? <Text style={{ color: colors.text, fontWeight: '600' }}>{peso((item.unitPrice ?? 0) * item.quantity)}</Text> : null}
              </View>
            ))}
            {showPrices ? (
              <View style={[styles.itemRow, styles.total, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>Total</Text>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{peso(order.price)}</Text>
              </View>
            ) : null}
          </Card>
        </Section>

        <ReviewPanel order={order} />

        <Section title="Customer Preferences">
          <Card>
            <PreferencesPanel dietary={order.dietary} showHealth={role === 'admin' || role === 'dietitian'} />
          </Card>
        </Section>

        {order.specialInstructions && role !== 'kitchen' && !order.delivery ? (
          <Section title="Special instructions">
            <Card><Text style={{ color: colors.text }}>{order.specialInstructions}</Text></Card>
          </Section>
        ) : null}

        {order.delivery ? (
          <Section title="Delivery Address">
            <Card>
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {order.delivery.firstName}{order.delivery.contactNumber ? ` · ${order.delivery.contactNumber}` : ''}
              </Text>
              <Text style={{ color: colors.text }}>{order.delivery.address || 'Address not supplied'}</Text>
              <Text style={{ color: colors.muted }}>Delivery notes: {order.delivery.notes || 'None'}</Text>
            </Card>
            <Text style={[styles.sub, { color: colors.text }]}>Location not available</Text>
            {order.delivery.address ? (
              <PrimaryButton title="Open in Maps" variant="outline" onPress={() => { void Linking.openURL(mapsUrl(order.delivery!.address!)); }} />
            ) : null}
            {order.delivery.contactNumber && role === 'delivery' ? (
              <PrimaryButton title={`Call ${order.delivery.firstName}`} variant="outline" onPress={() => { void Linking.openURL(`tel:${order.delivery!.contactNumber!.replace(/\s+/g, '')}`); }} />
            ) : null}
          </Section>
        ) : null}

        {role === 'admin' && order.fulfillment !== 'pick_up' ? (
          <Section title="Delivery Staff">
            <Card style={styles.assignCard}>
              <View style={styles.flex}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{order.assigneeName ?? 'Unassigned'}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>Only the assigned staff member sees this order.</Text>
              </View>
              {!closed ? (
                <Pressable accessibilityRole="button" onPress={() => setAssignOpen((open) => !open)} style={[styles.smallBtn, { backgroundColor: colors.greenDeep }]}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>{order.assigneeId ? 'Change' : 'Assign'}</Text>
                </Pressable>
              ) : null}
            </Card>
            {assignOpen && !closed ? deliveryStaff().map((person) => (
              <Pressable
                key={person.id}
                accessibilityRole="button"
                onPress={async () => {
                  setAssignOpen(false);
                  const result = await assignDeliveryAsync(actor, order.id, person.id);
                  if (result.message) showFlash(result.message);
                }}
                style={[styles.option, { backgroundColor: colors.card, borderColor: order.assigneeId === person.id ? colors.primary : colors.border }]}
              >
                <Ionicons name={order.assigneeId === person.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={colors.green} />
                <Text style={{ color: colors.text, fontWeight: '600' }}>{person.name}</Text>
              </Pressable>
            )) : null}
          </Section>
        ) : null}

        {closed ? <Text style={{ color: colors.muted, textAlign: 'center' }}>{COPY.readOnlyOrder}</Text> : null}
        {order.status === 'Cancelled' && order.reviewDecision === 'returned' && order.reviewReason ? (
          <Card><Text style={{ color: colors.text }}>Returned by the Dietitian: {order.reviewReason}</Text></Card>
        ) : null}

        {actions.map((action) => (
          <PrimaryButton
            key={action.label}
            title={busy ? 'Saving…' : action.label}
            variant={action.tone}
            disabled={busy}
            onPress={() => setPending(action)}
          />
        ))}

        {customer ? (
          <PrimaryButton title="Customer details" variant="outline" onPress={() => openRoot(navigation, 'CustomerDetail', { id: customer.id })} />
        ) : null}

        {(role === 'admin' || role === 'dietitian') && order.updates.length ? (
          <Section title="Status history">
            <Card>
              {order.updates.map((update) => (
                <Text key={`${update.at}-${update.summary}`} style={{ color: colors.muted, fontSize: 13 }}>
                  {update.by} · {update.summary}
                </Text>
              ))}
            </Card>
          </Section>
        ) : null}
      </ScrollView>
      <ConfirmCard
        visible={!!pending}
        title={pending?.confirmTitle ?? ''}
        body={pending?.target === 'Cancelled' ? 'The customer will see this order as Cancelled.' : undefined}
        confirmLabel={pending?.label ?? ''}
        cancelLabel="Not now"
        danger={pending?.tone === 'danger'}
        onCancel={() => setPending(null)}
        onConfirm={() => { if (pending) void run(pending); }}
      />
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 10 },
  chip: { flex: 1, borderRadius: 999, borderWidth: 1, paddingHorizontal: 4, paddingVertical: 8, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  row: { marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontWeight: '700', fontSize: 16 },
  price: { fontWeight: '700' },
  side: { alignItems: 'flex-end', gap: 6 },
  detail: { padding: 16, gap: 14, paddingBottom: 40 },
  headCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headName: { fontSize: 18, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  total: { borderTopWidth: 1, marginTop: 6, paddingTop: 8 },
  sub: { fontWeight: '600', fontSize: 16, marginTop: 4 },
  assignCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  smallBtn: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  option: { borderWidth: 1.5, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
