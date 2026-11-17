import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminView, noticesFor, ordersFor } from '../data/store.js';
import { peso } from '../domain/format.js';
import { photoKeyFor } from '../../lib/staffBackend.js';
import { useAdmin } from '../context.js';
import { openRoot, type ScreenProps } from '../nav.js';
import { FlashBanner, useStoreRevision } from '../components.js';
import { OrderPhoto } from '../ui/blocks.js';
import { Text } from '../ui/StaffText.js';
import { useActor, useRefresh } from './OrdersScreen.js';
import { RoleDashboardHeader } from './DietitianScreens.js';

/** KIT-10: shortcuts to Orders and Menu Management; no sales, customers or staff figures. */
export function KitchenDashboardScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { colors, session } = useAdmin();
  const insets = useSafeAreaInsets();
  const actor = useActor();
  const { refreshing, onRefresh, enabled } = useRefresh();
  if (!actor) return null;
  const unread = noticesFor('kitchen', session?.id).filter((notice) => !notice.readBy.includes(session?.id ?? '')).length;
  const queue = ordersFor(actor).filter((order) => order.status === 'Paid' || order.status === 'Confirmed' || order.status === 'Preparing');
  const menu = adminView().menu.slice(0, 5);
  const editItem = (id: string) => navigation.getParent()?.navigate('Menu', { screen: 'MenuForm', params: { id }, initial: false });
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.page }}
      contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
      refreshControl={enabled ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
    >
      <RoleDashboardHeader
        icon={<MaterialCommunityIcons name="chef-hat" size={38} color="#FFFFFF" />}
        title="Kitchen Staff"
        subtitle="Kitchen Panel"
        unread={unread}
        onBell={() => openRoot(navigation, 'Inbox')}
      />
      <View style={styles.body}>
        <FlashBanner />
        <View>
          <Text style={[styles.greeting, { color: colors.green }]} accessibilityRole="header">Welcome back, Kitchen Staff!</Text>
          <Text style={{ color: colors.muted }}>Here&apos;s what you can do today.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Orders"
          onPress={() => navigation.getParent()?.navigate('Orders')}
          style={[styles.hero, { backgroundColor: colors.mint, borderColor: colors.border }]}
        >
          <MaterialCommunityIcons name="silverware-fork-knife" size={36} color={colors.text} />
          <View style={styles.flex}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>View Orders</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {queue.length ? `${queue.length} paid order${queue.length === 1 ? '' : 's'} to prepare` : 'No paid orders waiting'}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color={colors.text} />
        </Pressable>
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
        {menu.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${item.name} ${peso(item.price)}`}
            onPress={() => editItem(item.id)}
            style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <OrderPhoto photo={photoKeyFor(item.name)} size={52} />
            <View style={styles.flex}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{item.name}</Text>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{peso(item.price)}</Text>
              {!item.available ? <Text style={{ color: '#D76566', fontSize: 12 }}>Unavailable</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.name}`} onPress={() => editItem(item.id)} style={[styles.edit, { backgroundColor: colors.header }]}>
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
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  item: { borderRadius: 16, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  edit: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 },
});
