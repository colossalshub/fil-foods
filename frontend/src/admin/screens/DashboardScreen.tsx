import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../copy.js';
import { adminView, markNoticeRead } from '../data/store.js';
import { peso } from '../domain/format.js';
import { useAdmin } from '../context.js';
import { openRoot, type ScreenProps } from '../nav.js';
import { useStoreRevision } from '../components.js';
import {
  AdminDashboardHeader,
  DashboardRecentOrders,
  DashboardSalesOverview,
  DashboardStatCard,
  DashboardStatGrid,
  DashboardWelcomeBlock,
} from '../components/dashboard.js';

declare const require: (id: string) => number;

const PHOTOS: Record<string, number> = {
  wrap: require('../../../assets/images/meals/grilled-chicken-wrap.jpg'),
  salad: require('../../../assets/images/meals/greek-chickpea-salad.jpg'),
  salmon: require('../../../assets/images/meals/salmon-teriyaki.jpg'),
  omelette: require('../../../assets/images/meals/egg-white-omelette.jpg'),
  bangus: require('../../../assets/images/meals/grilled-bangus.jpg'),
};

export function DashboardScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { colors, t, session, showFlash } = useAdmin();
  const insets = useSafeAreaInsets();
  const data = adminView();
  const recent = [...data.orders].sort((left, right) => right.placedAt.localeCompare(left.placedAt)).slice(0, 3);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [periodDraft, setPeriodDraft] = useState(false);
  const [monthView, setMonthView] = useState(false);
  const periodLabel = monthView ? 'This Month' : 'This Week';
  const tabBarPad = 72 + insets.bottom;

  const openSettings = () => navigation.getParent()?.navigate('Settings');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.page }}
      contentContainerStyle={{ paddingBottom: tabBarPad }}
      showsVerticalScrollIndicator={false}
    >
      <AdminDashboardHeader
        adminName={session?.name ?? 'Admin'}
        onNotifications={() => navigation.navigate('Notifications')}
        onAccount={openSettings}
      />
      <DashboardWelcomeBlock />
      <DashboardStatGrid>
        <DashboardStatCard
          label="Total Orders"
          value={String(data.metrics.totalOrders)}
          delta={data.metrics.ordersDelta}
          icon="cart-outline"
        />
        <DashboardStatCard
          label="Total Sales"
          value={peso(data.metrics.totalSales)}
          delta={data.metrics.salesDelta}
          icon="cash-outline"
        />
        <DashboardStatCard
          label="Total Customers"
          value={String(data.metrics.totalCustomers)}
          delta={data.metrics.customersDelta}
          icon="people-outline"
        />
        <DashboardStatCard
          label="Menu Items"
          value={String(data.menu.length)}
          delta={0}
          icon="restaurant-outline"
          accent
        />
      </DashboardStatGrid>
      <DashboardRecentOrders
        orders={recent}
        photos={PHOTOS}
        viewAllLabel={t('viewAll')}
        onViewAll={() => navigation.getParent()?.navigate('Orders')}
        onOrder={(id) => openRoot(navigation, 'OrderDetail', { id })}
      />
      <DashboardSalesOverview
        points={data.metrics.salesOverviewWeeks}
        periodLabel={periodLabel}
        monthView={monthView}
        periodOpen={periodOpen}
        periodDraft={periodDraft}
        applyLabel={t('apply')}
        onOpenPeriod={() => {
          setPeriodDraft(monthView);
          setPeriodOpen(true);
        }}
        onClosePeriod={() => setPeriodOpen(false)}
        onSelectPeriod={setPeriodDraft}
        onApplyPeriod={() => {
          setMonthView(periodDraft);
          setPeriodOpen(false);
          showFlash(COPY.periodApplied);
        }}
      />
    </ScrollView>
  );
}

export function NotificationsScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { session, colors, t } = useAdmin();
  const notices = adminView().notices.filter((notice) => notice.audience === session?.role);
  return (
    <View style={styles.flex}>
      <View style={styles.notifHead}>
        <Pressable accessibilityLabel="Back" onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.green} />
        </Pressable>
        <Text style={[styles.notifTitle, { color: colors.text }]}>{t('notifications')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {notices.length === 0 ? <Text style={[styles.empty, { color: colors.muted }]}>{COPY.caughtUp}</Text> : null}
        {notices.map((notice) => {
          const unread = session ? !notice.readBy.includes(session.id) : false;
          return (
            <Pressable
              key={notice.id}
              onPress={() => {
                if (session) markNoticeRead(session.id, notice.id);
                if (notice.orderId) openRoot(navigation, 'OrderDetail', { id: notice.orderId });
              }}
              style={[styles.noticeRow, { backgroundColor: colors.card, borderColor: colors.border }]}
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
  notifHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  notifTitle: { fontSize: 18, fontWeight: '800' },
  empty: { textAlign: 'center', marginTop: 28, fontSize: 15 },
  noticeRow: { borderWidth: 1, borderRadius: 14, padding: 12 },
});