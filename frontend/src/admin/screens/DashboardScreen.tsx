import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../copy.js';
import { WEEK_DAYS, adminView, markNoticeRead } from '../data/store.js';
import { percentLabel, peso } from '../domain/format.js';
import { useAdmin } from '../context.js';
import { openRoot, type ScreenProps } from '../nav.js';
import { FlashBanner, StatusBadge, useStoreRevision } from '../components.js';

export function DashboardScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { colors, t } = useAdmin();
  const insets = useSafeAreaInsets();
  const data = adminView();
  const recent = [...data.orders].sort((left, right) => right.placedAt.localeCompare(left.placedAt)).slice(0, 3);
  const cards = [
    { label: 'Total Orders', value: String(data.metrics.totalOrders), delta: data.metrics.ordersDelta },
    { label: 'Total Sales', value: peso(data.metrics.totalSales), delta: data.metrics.salesDelta },
    { label: 'Total Customers', value: String(data.metrics.totalCustomers), delta: data.metrics.customersDelta },
    { label: 'Menu Items', value: String(data.menu.length), delta: data.metrics.menuDelta },
  ];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24, paddingTop: insets.top }}>
      <FlashBanner />
      <View style={styles.top}>
        <Text style={[styles.welcome, { color: colors.text }]} accessibilityRole="header">{COPY.welcome}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => navigation.navigate('Notifications')} style={[styles.bell, { backgroundColor: colors.card }]}>
          <Ionicons name="notifications-outline" size={22} color={colors.green} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {cards.map((card) => (
          <View key={card.label} style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.muted }]}>{card.label}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{card.value}</Text>
            <View style={styles.delta}>
              {card.delta > 0 ? <Ionicons name="arrow-up" size={14} color={colors.positive} /> : null}
              <Text style={{ color: colors.positive, fontWeight: '700' }}>{percentLabel(card.delta)}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.sectionHead}>
        <Text style={[styles.section, { color: colors.text }]}>Recent Orders</Text>
        <Pressable onPress={() => navigation.navigate('Orders')}>
          <Text style={{ color: colors.green, fontWeight: '700' }}>{t('viewAll')}</Text>
        </Pressable>
      </View>
      {recent.map((order) => (
        <Pressable key={order.id} onPress={() => openRoot(navigation, 'OrderDetail', { id: order.id })} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.flex}>
            <Text style={[styles.orderId, { color: colors.text }]}>#{order.id} {order.customerName}</Text>
            <Text style={{ color: colors.muted }}>{order.status}</Text>
          </View>
          <StatusBadge status={order.status} />
        </Pressable>
      ))}
      <SalesChart />
    </ScrollView>
  );
}

function SalesChart() {
  const { colors } = useAdmin();
  const [month, setMonth] = useState(false);
  const data = adminView();
  const max = Math.max(...data.metrics.weekSales, 1);
  return (
    <View style={[styles.chart, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.section, { color: colors.text }]}>Sales Overview</Text>
      <View style={styles.filters}>
        {[{ id: false, label: 'This Week' }, { id: true, label: 'This Month' }].map((option) => {
          const selected = month === option.id;
          return (
            <Pressable key={option.label} onPress={() => setMonth(option.id)} style={[styles.filter, { backgroundColor: selected ? colors.green : colors.page }]}>
              <Text style={{ color: selected ? '#FFFFFF' : colors.text, fontWeight: '700' }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {month ? (
        <Text style={[styles.monthEmpty, { color: colors.muted }]}>{COPY.monthEmpty}</Text>
      ) : (
        <View style={styles.bars}>
          {data.metrics.weekSales.map((value, index) => (
            <View key={WEEK_DAYS[index]} style={styles.barCol}>
              <View style={[styles.bar, { height: 12 + (value / max) * 110, backgroundColor: colors.green }]} />
              <Text style={{ color: colors.muted, fontSize: 11 }}>{WEEK_DAYS[index]}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function NotificationsScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { session, colors, t } = useAdmin();
  const notices = adminView().notices.filter((notice) => notice.audience === session?.role);
  return (
    <View style={styles.flex}>
      <View style={styles.sectionHead}>
        <Pressable accessibilityLabel="Back" onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={24} color={colors.green} /></Pressable>
        <Text style={[styles.section, { color: colors.text }]}>{t('notifications')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {notices.length === 0 ? <Text style={[styles.monthEmpty, { color: colors.muted }]}>{COPY.caughtUp}</Text> : null}
        {notices.map((notice) => {
          const unread = session ? !notice.readBy.includes(session.id) : false;
          return (
            <Pressable
              key={notice.id}
              onPress={() => {
                if (session) markNoticeRead(session.id, notice.id);
                if (notice.orderId) openRoot(navigation, 'OrderDetail', { id: notice.orderId });
              }}
              style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={{ color: colors.text, fontWeight: unread ? '800' : '500', flex: 1 }}>{notice.title}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  welcome: { flex: 1, fontSize: 26, fontWeight: '800' },
  bell: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  stat: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: 16, padding: 14 },
  statLabel: { fontSize: 13 },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8, marginTop: 8 },
  section: { fontSize: 18, fontWeight: '800' },
  row: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderId: { fontWeight: '800' },
  chart: { margin: 16, borderWidth: 1, borderRadius: 16, padding: 16 },
  filters: { flexDirection: 'row', gap: 8, marginTop: 12 },
  filter: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18, height: 150 },
  barCol: { alignItems: 'center', gap: 6 },
  bar: { width: 18, borderRadius: 8 },
  monthEmpty: { textAlign: 'center', marginTop: 28, marginBottom: 20, fontSize: 15 },
});
