import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COPY } from '../copy.js';
import { adminView, customerFor, loadCustomerDetail } from '../data/store.js';
import { avatarLetter, peso } from '../domain/format.js';
import { adminListStatusLabel } from '../domain/orderDisplay.js';
import { can, nutritionTiles } from '../domain/roleAccess.js';
import { searchOrdersWhere } from '../domain/search.js';
import { useAdmin } from '../context.js';
import { openRoot, type ScreenProps } from '../nav.js';
import { GreenHeader, PhoneFrame, SyncBanner, useStoreRevision } from '../components.js';
import { Card, Chip, EmptyState, Pill, SearchBox, Section } from '../ui/blocks.js';
import { Text } from '../ui/StaffText.js';
import { useActor } from './OrdersScreen.js';

/** ADM-19 / DIT-13 customer directory (Admin and Dietitian only). */
export function CustomersScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { colors, t } = useAdmin();
  const actor = useActor();
  const [query, setQuery] = useState('');
  if (!actor) return null;
  if (!can(actor.role, 'customerDirectory')) {
    return (
      <View style={styles.flex}>
        <GreenHeader title={t('customers')} onBack={() => navigation.goBack()} />
        <EmptyState title={COPY.noAccess} />
      </View>
    );
  }
  const all = adminView().customers;
  // Reuse the order search (fuzzy names) by treating customers as name rows.
  const rows = query.trim()
    ? searchOrdersWhere(
      all.map((customer) => ({ ...customer, customerName: customer.name, status: 'Paid' as const, placedAt: customer.id })),
      query,
      () => true,
    )
    : all;
  return (
    <View style={styles.flex}>
      <GreenHeader title={actor.role === 'dietitian' ? 'Customer Preferences' : t('customers')} onBack={() => navigation.goBack()} />
      {actor.role === 'dietitian' ? <Text style={[styles.choose, { color: colors.muted }]}>Choose a customer</Text> : null}
      <SearchBox value={query} onChange={setQuery} placeholder="Search customers..." />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <SyncBanner />
        {rows.length === 0 ? <EmptyState title="No customers found" /> : rows.map((customer) => {
          const allergies = customer.dietary?.allergies.map((item) => item.value) ?? customer.allergies;
          return (
            <Pressable
              key={customer.id}
              accessibilityRole="button"
              onPress={() => openRoot(navigation, 'CustomerDetail', { id: customer.id })}
              style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.avatarSm, { backgroundColor: colors.green }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{avatarLetter(customer.name)}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{customer.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{customer.email}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                  {allergies.length ? `Allergies: ${allergies.join(', ')}` : 'No listed allergens'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** ADM-19, DIT-13, KIT-14, DEL-13: Kitchen / Delivery see first name, email, allergies and levels only. */
export function CustomerDetailScreen({ navigation, route }: ScreenProps<{ id?: string }>) {
  useStoreRevision();
  const { colors, showFlash } = useAdmin();
  const actor = useActor();
  const id = route.params?.id ?? '';
  useEffect(() => {
    void loadCustomerDetail(id).then((result) => {
      if (!result.ok && 'message' in result) showFlash(result.message);
    });
  }, [id, showFlash]);
  const customer = actor ? customerFor(actor, id) : null;
  const full = actor?.role === 'admin' || actor?.role === 'dietitian';
  return (
    <PhoneFrame>
      <GreenHeader title="Customer Details" onBack={() => navigation.goBack()} />
      {!customer || !actor ? <EmptyState title={actor ? COPY.noAccess : 'Customer not found.'} /> : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.profile}>
            <View style={[styles.avatar, { backgroundColor: colors.greenDeep }]}>
              <Text style={styles.avatarText}>{avatarLetter(customer.name)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={[styles.name, { color: colors.text }]}>{customer.name}</Text>
              <Text style={{ color: colors.muted }}>{customer.email}</Text>
              {full && customer.accountHolderName && customer.accountHolderName !== customer.name ? (
                <Text style={{ color: colors.muted, fontSize: 12 }}>Account holder: {customer.accountHolderName}</Text>
              ) : null}
            </View>
          </View>

          <Section title="Allergies">
            <View style={styles.chips}>
              {customer.dietary?.allergies.length
                ? customer.dietary.allergies.map((item) => <Chip key={item.value} label={item.value} note={item.note} />)
                : <Text style={{ color: colors.text }}>No listed allergens</Text>}
            </View>
          </Section>

          <Section title="Preferred Nutritional Levels">
            <Card>
              {nutritionTiles(customer.dietary).map((tile) => (
                <View key={tile.key} style={styles.levelRow}>
                  <Text style={{ color: colors.text, flex: 1 }}>{tile.label}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{tile.level}</Text>
                    {tile.range ? <Text style={{ color: colors.muted, fontSize: 12 }}>{tile.range}</Text> : null}
                  </View>
                </View>
              ))}
            </Card>
          </Section>

          {full ? (
            <Section title="Health conditions & restrictions">
              <Card>
                <Text style={{ color: colors.text }}>Conditions: {customer.dietary?.conditions.length ? customer.dietary.conditions.join(', ') : 'Not supplied'}</Text>
                <Text style={{ color: colors.text }}>Restrictions: {customer.dietary?.restrictions.length ? customer.dietary.restrictions.join(', ') : 'Not supplied'}</Text>
              </Card>
            </Section>
          ) : null}

          {full ? (
            <Section title="Order History">
              {customer.history.length === 0 ? <Text style={{ color: colors.muted }}>{COPY.noRecentOrders}</Text> : customer.history.map((row) => (
                <Pressable
                  key={`${row.orderId ?? row.name}-${row.at ?? ''}`}
                  disabled={!row.orderId}
                  onPress={() => row.orderId && openRoot(navigation, 'OrderDetail', { id: row.orderId })}
                  style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.flex}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{row.name}</Text>
                    {row.at ? <Text style={{ color: colors.muted, fontSize: 12 }}>{row.at}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Pill label={adminListStatusLabel(row.status)} />
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{peso(row.price)}</Text>
                  </View>
                </Pressable>
              ))}
            </Section>
          ) : null}
          <Text style={{ color: colors.muted, textAlign: 'center' }}>View only</Text>
        </ScrollView>
      )}
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  choose: { marginHorizontal: 16, marginTop: 14, fontWeight: '600' },
  body: { padding: 16, gap: 16, paddingBottom: 40 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarSm: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  row: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
