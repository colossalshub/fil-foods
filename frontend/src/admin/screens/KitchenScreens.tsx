import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminView, noticesFor, ordersFor } from '../data/store.js';
import { peso } from '../domain/format.js';
import { displayOrderNo } from '../domain/roleAccess.js';
import { photoKeyFor } from '../../lib/staffBackend.js';
import { useAdmin } from '../context.js';
import { openRoot, type ScreenProps } from '../nav.js';
import { FlashBanner, useStoreRevision } from '../components.js';
import { OrderPhoto } from '../ui/blocks.js';
import { Text } from '../ui/StaffText.js';
import { useActor, useRefresh } from './OrdersScreen.js';
import { RoleDashboardHeader } from './DietitianScreens.js';

/** KIT-10: shortcuts to Orders and Menu Management (availability only, KIT-15); no sales, customers or staff figures. */
export function KitchenDashboardScreen(props: ScreenProps) {
  return <ShiftDashboard {...props} role="kitchen" />;
}

/** DEL-10 (revised): Orders and delivery tasks only; no menu card (DEL-14 removed). */
export function DeliveryDashboardScreen(props: ScreenProps) {
  return <ShiftDashboard {...props} role="delivery" />;
}

function ShiftDashboard({ navigation, role }: ScreenProps & { role: 'kitchen' | 'delivery' }) {
  useStoreRevision();
  const { colors, session } = useAdmin();
  const insets = useSafeAreaInsets();
  const actor = useActor();
  const { refreshing, onRefresh, enabled } = useRefresh();
  if (!actor) return null;
  const kitchen = role === 'kitchen';
  const unread = noticesFor(role, session?.id).filter((notice) => !notice.readBy.includes(session?.id ?? '')).length;
  const mine = ordersFor(actor);
  const queue = kitchen
    ? mine.filter((order) => order.status === 'Paid' || order.status === 'Confirmed' || order.status === 'Preparing')
    : mine.filter((order) => order.status === 'Ready for Delivery' || order.status === 'Out for Delivery');
  const toCollect = kitchen ? [] : mine.filter((order) => order.status === 'Ready for Delivery');
  const menu = kitchen ? adminView().menu.slice(0, 5) : [];
  // Kitchen only sets availability (KIT-15), so Edit opens the Menu list with its availability switches.
  const editItem = () => navigation.getParent()?.navigate('Menu');
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.page }}
      contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
      refreshControl={enabled ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
    >
      <RoleDashboardHeader
        icon={<MaterialCommunityIcons name={kitchen ? 'chef-hat' : 'moped'} size={38} color="#FFFFFF" />}
        title={kitchen ? 'Kitchen Staff' : 'Delivery Staff'}
        subtitle={kitchen ? 'Kitchen Panel' : 'Delivery Panel'}
        unread={unread}
        onBell={() => openRoot(navigation, 'Inbox')}
      />
      <View style={styles.body}>
        <FlashBanner />
        <View>
          <Text style={[styles.greeting, { color: colors.green }]} accessibilityRole="header">Welcome back, {kitchen ? 'Kitchen Staff' : 'Delivery Staff'}!</Text>
          <Text style={{ color: colors.muted }}>Here&apos;s what you can do today.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Orders"
          onPress={() => navigation.getParent()?.navigate('Orders')}
          style={[styles.hero, { backgroundColor: colors.mint, borderColor: colors.border }]}
        >
          <MaterialCommunityIcons name={kitchen ? 'silverware-fork-knife' : 'map-marker-path'} size={36} color={colors.text} />
          <View style={styles.flex}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>View Orders</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {kitchen
                ? (queue.length ? `${queue.length} paid order${queue.length === 1 ? '' : 's'} to prepare` : 'No paid orders waiting')
                : (queue.length ? `${queue.length} assigned deliver${queue.length === 1 ? 'y' : 'ies'}` : 'No deliveries assigned to you')}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color={colors.text} />
        </Pressable>
        {kitchen ? null : (
          <View style={styles.counts}>
            {[
              ['Ready', mine.filter((order) => order.status === 'Ready for Delivery').length],
              ['On route', mine.filter((order) => order.status === 'Out for Delivery').length],
              ['Completed', mine.filter((order) => order.status === 'Completed').length],
            ].map(([label, count]) => (
              <View key={String(label)} style={[styles.count, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ color: colors.green, fontSize: 22, fontWeight: '700' }}>{count}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
              </View>
            ))}
          </View>
        )}
        {toCollect.length ? (
          <View style={{ gap: 8 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Ready for Pickup</Text>
            {toCollect.map((order) => (
              <Pressable
                key={order.id}
                accessibilityRole="button"
                accessibilityLabel={`${order.customerName} ${displayOrderNo(order)}`}
                onPress={() => openRoot(navigation, 'OrderDetail', { id: order.id })}
                style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <OrderPhoto photo={order.photo} size={44} />
                <View style={styles.flex}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{order.customerName} · {displayOrderNo(order)}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{order.when}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {kitchen ? (
        <View>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Menu Management</Text>
            <Pressable accessibilityRole="button" onPress={() => navigation.getParent()?.navigate('Menu')} style={styles.viewAll}>
              <Text style={{ color: colors.green, fontWeight: '600', fontSize: 13 }}>View All</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.green} />
            </Pressable>
          </View>
          <Text style={{ color: colors.muted }}>Manage your menu items.</Text>
        </View>
        ) : null}
        {menu.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${item.name} ${peso(item.price)}`}
            onPress={editItem}
            style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <OrderPhoto photo={photoKeyFor(item.name)} size={52} />
            <View style={styles.flex}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{item.name}</Text>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{peso(item.price)}</Text>
              {!item.available ? <Text style={{ color: '#D76566', fontSize: 12 }}>Unavailable</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.name}`} onPress={editItem} style={[styles.edit, { backgroundColor: colors.header }]}>
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>Edit</Text>
            </Pressable>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: 16, gap: 14 },
  greeting: { fontSize: 20, fontWeight: '700' },
  hero: { borderRadius: 18, borderWidth: 1, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  counts: { flexDirection: 'row', gap: 8 },
  count: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center', gap: 2 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  item: { borderRadius: 16, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  edit: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 },
});
