import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COPY } from '../copy.js';
import { activeOrders, ordersForAssignee } from '../data/store.js';
import { peso } from '../domain/format.js';
import { useAdmin } from '../context.js';
import { openRoot, resetStaff, type ScreenProps } from '../nav.js';
import { ConfirmCard, PhoneFrame, PrimaryButton, StatusBadge, useStoreRevision } from '../components.js';

export function RoleHomeScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { session, colors, signOut } = useAdmin();
  const [logout, setLogout] = useState(false);
  if (!session) return null;
  const orders = session.role === 'delivery' ? ordersForAssignee(session.id) : activeOrders();
  return (
    <PhoneFrame>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={[styles.title, { color: colors.text }]}>Hello, {session.name}</Text>
        <Text style={{ color: colors.muted, marginBottom: 16 }}>{session.role}</Text>
        <Text style={[styles.section, { color: colors.text }]}>
          {session.role === 'delivery' ? 'Assigned deliveries' : 'Active orders'}
        </Text>
        {orders.length === 0 ? <Text style={{ color: colors.muted, marginBottom: 12 }}>Nothing assigned right now.</Text> : null}
        {orders.map((order) => (
          <Pressable key={order.id} onPress={() => openRoot(navigation, 'OrderDetail', { id: order.id })} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>#{order.id} {order.customerName}</Text>
            <View style={styles.row}>
              <StatusBadge status={order.status} />
              <Text style={{ color: colors.text }}>{peso(order.price)}</Text>
            </View>
          </Pressable>
        ))}
        <PrimaryButton title="Notification settings" variant="outline" onPress={() => openRoot(navigation, 'StaffNotifications')} />
        <View style={{ height: 12 }} />
        <PrimaryButton title={COPY.logOut} variant="danger" onPress={() => setLogout(true)} />
      </ScrollView>
      <ConfirmCard
        visible={logout}
        title={COPY.logoutTitle}
        confirmLabel={COPY.logOut}
        cancelLabel={COPY.stay}
        danger
        onCancel={() => setLogout(false)}
        onConfirm={async () => {
          const role = session.role;
          await signOut();
          resetStaff(navigation, { index: 1, routes: [{ name: 'SignInRequired' }, { name: 'StaffLogin', params: { role } }] });
        }}
      />
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: '800' },
  section: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
