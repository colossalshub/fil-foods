import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../copy.js';
import { adminView } from '../data/store.js';
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

export { NotificationsScreen } from './InboxScreen.js';
