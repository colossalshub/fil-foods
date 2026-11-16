import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../copy.js';
import { adminView, markNoticeRead } from '../data/store.js';
import { orderListDisplayId } from '../domain/orderDisplay.js';
import { chartMaxForValues, chartYAxisTicks } from '../domain/dashboardMetrics.js';
import { avatarLetter, percentLabel, peso } from '../domain/format.js';
import { useAdmin } from '../context.js';
import { openRoot, type ScreenProps } from '../nav.js';
import {
  AdminListStatusBadge,
  FlashBanner,
  PrimaryButton,
  useStoreRevision,
} from '../components.js';

declare const require: (id: string) => number;

const logo = require('../../../assets/images/fil-foods-logo.png');

const PHOTOS: Record<string, number> = {
  wrap: require('../../../assets/images/meals/grilled-chicken-wrap.jpg'),
  salad: require('../../../assets/images/meals/greek-chickpea-salad.jpg'),
  salmon: require('../../../assets/images/meals/salmon-teriyaki.jpg'),
  omelette: require('../../../assets/images/meals/egg-white-omelette.jpg'),
  bangus: require('../../../assets/images/meals/grilled-bangus.jpg'),
};

const WEEK_LABELS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'] as const;

const METRIC_ICONS = {
  orders: 'cart-outline',
  sales: 'cash-outline',
  customers: 'people-outline',
  menu: 'restaurant-outline',
} as const;

function formatSalesTick(value: number) {
  if (value === 0) return '0';
  if (value >= 1000) return `${value / 1000}k`;
  return String(value);
}

function PeriodPicker({
  visible,
  draft,
  onSelect,
  onClose,
  onApply,
}: {
  visible: boolean;
  draft: boolean;
  onSelect: (month: boolean) => void;
  onClose: () => void;
  onApply: () => void;
}) {
  const { colors, t } = useAdmin();
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalDismiss} onPress={onClose} />
        <View style={[styles.periodSheet, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: 'center' }]}>Sales period</Text>
          {[{ month: false, label: 'This Week' }, { month: true, label: 'This Month' }].map((option) => {
            const selected = draft === option.month;
            return (
              <Pressable
                key={option.label}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onSelect(option.month)}
                style={[styles.periodOption, { borderColor: selected ? colors.green : colors.border, backgroundColor: selected ? colors.mint : colors.card }]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>{option.label}</Text>
              </Pressable>
            );
          })}
          <PrimaryButton title={t('apply')} onPress={onApply} />
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.sheetCancel}>
            <Text style={{ color: colors.green, fontWeight: '700' }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

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

  const cards = [
    { key: 'orders', label: 'Total Orders', value: String(data.metrics.totalOrders), delta: data.metrics.ordersDelta, icon: METRIC_ICONS.orders, tint: colors.mint, accent: false },
    { key: 'sales', label: 'Total Sales', value: peso(data.metrics.totalSales), delta: data.metrics.salesDelta, icon: METRIC_ICONS.sales, tint: colors.mint, accent: false },
    { key: 'customers', label: 'Total Customers', value: String(data.metrics.totalCustomers), delta: data.metrics.customersDelta, icon: METRIC_ICONS.customers, tint: colors.mint, accent: false },
    { key: 'menu', label: 'Menu Items', value: String(data.menu.length), delta: 0, icon: METRIC_ICONS.menu, tint: '#FFE8CF', accent: true },
  ];

  const openSettings = () => {
    const tabs = navigation.getParent();
    tabs?.navigate('Settings');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.page }}
      contentContainerStyle={{ paddingBottom: 24, paddingTop: insets.top }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.headerShell, { backgroundColor: colors.header }]}>
        <View style={styles.headerRow}>
          <Image source={logo} style={styles.headerLogo} resizeMode="contain" accessibilityLabel="F.I.L Foods logo" />
          <View style={styles.headerCopy}>
            <Text style={styles.headerBrand}>{COPY.dashboardBrand}</Text>
            <Text style={styles.headerPanel}>Admin Panel</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => navigation.navigate('Notifications')}
            style={styles.headerIconBtn}
          >
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Account settings" onPress={openSettings} style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter(session?.name ?? 'Admin')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bodyPad}>
        <FlashBanner />
        <Text style={[styles.greeting, { color: colors.text }]} accessibilityRole="header">{COPY.welcome}</Text>
        <Text style={[styles.subGreeting, { color: colors.muted }]}>{COPY.dashboardSubtitle}</Text>

        <View style={styles.grid}>
          {cards.map((card) => (
            <View key={card.key} style={[styles.statCard, { backgroundColor: card.tint, borderColor: card.accent ? '#F5D4A8' : '#C8E6D0' }]}>
              <View style={[styles.statIconWrap, { backgroundColor: card.accent ? '#FFC98E' : '#FFFFFF' }]}>
                <Ionicons name={card.icon} size={20} color={colors.green} />
              </View>
              <Text style={[styles.statLabel, { color: colors.muted }]}>{card.label}</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{card.value}</Text>
              {card.delta > 0 ? (
                <View style={styles.delta}>
                  <Ionicons name="arrow-up" size={14} color={colors.positive} />
                  <Text style={{ color: colors.positive, fontWeight: '700' }}>{percentLabel(card.delta)}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <View style={[styles.recentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Orders</Text>
            <Pressable accessibilityRole="button" onPress={() => navigation.getParent()?.navigate('Orders')}>
              <Text style={{ color: colors.green, fontWeight: '700' }}>{t('viewAll')}</Text>
            </Pressable>
          </View>
          {recent.length === 0 ? (
            <Text style={[styles.orderWhen, { color: colors.muted, paddingVertical: 12 }]}>{COPY.noRecentOrders}</Text>
          ) : recent.map((order) => (
            <Pressable
              key={order.id}
              accessibilityRole="button"
              onPress={() => openRoot(navigation, 'OrderDetail', { id: order.id })}
              style={[styles.orderRow, { borderTopColor: colors.border }]}
            >
              <Image source={PHOTOS[order.photo] ?? PHOTOS.wrap} style={styles.orderPhoto} accessibilityIgnoresInvertColors />
              <View style={styles.orderCopy}>
                <Text style={[styles.orderTitle, { color: colors.text }]}>
                  {orderListDisplayId(order)} {order.customerName}
                </Text>
                <Text style={[styles.orderWhen, { color: colors.muted }]}>{order.when}</Text>
              </View>
              <AdminListStatusBadge status={order.status} />
            </Pressable>
          ))}
        </View>

        <SalesOverviewCard
          points={data.metrics.salesOverviewWeeks}
          periodLabel={periodLabel}
          monthView={monthView}
          periodOpen={periodOpen}
          periodDraft={periodDraft}
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
      </View>
    </ScrollView>
  );
}

function SalesOverviewCard({
  points,
  periodLabel,
  monthView,
  periodOpen,
  periodDraft,
  onOpenPeriod,
  onClosePeriod,
  onSelectPeriod,
  onApplyPeriod,
}: {
  points: number[];
  periodLabel: string;
  monthView: boolean;
  periodOpen: boolean;
  periodDraft: boolean;
  onOpenPeriod: () => void;
  onClosePeriod: () => void;
  onSelectPeriod: (month: boolean) => void;
  onApplyPeriod: () => void;
}) {
  const { colors } = useAdmin();
  const plotHeight = 136;
  const chartMax = useMemo(() => chartMaxForValues(points), [points]);
  const yTicks = useMemo(() => chartYAxisTicks(chartMax), [chartMax]);
  const coords = useMemo(() => {
    const step = 100 / Math.max(points.length - 1, 1);
  const scale = chartMax > 0 ? chartMax : 1;
    return points.map((value, index) => ({
      x: step * index,
      y: Math.max(value > 0 ? 4 : 2, (value / scale) * plotHeight),
    }));
  }, [points, chartMax]);

  return (
  <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <View style={styles.chartTop}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Sales Overview</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sales period"
        onPress={onOpenPeriod}
        style={[styles.periodChip, { backgroundColor: colors.page, borderColor: colors.border }]}
      >
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{periodLabel}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </Pressable>
    </View>
    {monthView ? (
      <Text style={[styles.monthEmpty, { color: colors.muted }]}>{COPY.monthEmpty}</Text>
    ) : (
      <>
        <View style={styles.chartPlotRow}>
          <View style={[styles.yAxis, { height: plotHeight }]}>
            {yTicks.map((tick) => (
              <Text key={tick} style={[styles.yTick, { color: colors.muted }]}>{formatSalesTick(tick)}</Text>
            ))}
          </View>
          <View style={[styles.plot, { height: plotHeight }]}>
            {coords.map((point, index) => {
              if (index === 0) return null;
              const prev = coords[index - 1];
              const leftPct = prev.x;
              const widthPct = point.x - prev.x;
              const top = plotHeight - Math.max(point.y, prev.y);
              const height = Math.max(point.y, prev.y);
              return (
                <View
                  key={WEEK_LABELS[index]}
                  style={[
                    styles.areaSlice,
                    {
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top,
                      height,
                      backgroundColor: colors.mint,
                    },
                  ]}
                />
              );
            })}
            {coords.slice(0, -1).map((point, index) => {
              const next = coords[index + 1];
              const dx = (next.x - point.x) * 0.01 * 280;
              const dy = next.y - point.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
              return (
                <View
                  key={`line-${index}`}
                  style={[
                    styles.chartSegment,
                    {
                      width: length,
                      left: `${point.x}%`,
                      bottom: point.y,
                      transform: [{ rotate: `${-angle}deg` }],
                      backgroundColor: colors.green,
                    },
                  ]}
                />
              );
            })}
            {coords.map((point, index) => (
              <View
                key={`dot-${WEEK_LABELS[index]}`}
                style={[
                  styles.chartDot,
                  {
                    left: `${point.x}%`,
                    bottom: point.y - 5,
                    backgroundColor: colors.green,
                    borderColor: colors.card,
                  },
                ]}
              />
            ))}
          </View>
        </View>
        <View style={styles.xAxis}>
          {WEEK_LABELS.map((label) => (
            <Text key={label} style={[styles.xTick, { color: colors.muted }]}>{label}</Text>
          ))}
        </View>
      </>
    )}
    <PeriodPicker
      visible={periodOpen}
      draft={periodDraft}
      onSelect={onSelectPeriod}
      onClose={onClosePeriod}
      onApply={onApplyPeriod}
    />
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('notifications')}</Text>
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
  headerShell: {
    marginHorizontal: 12,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 4,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF' },
  headerCopy: { flex: 1 },
  headerBrand: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  headerPanel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  headerIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#146B38', fontWeight: '800', fontSize: 16 },
  bodyPad: { paddingHorizontal: 16, gap: 4 },
  greeting: { fontSize: 26, fontWeight: '800', marginTop: 12 },
  subGreeting: { fontSize: 15, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    minHeight: 132,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: { fontSize: 13 },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  recentCard: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingBottom: 8, marginTop: 16 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  orderPhoto: { width: 52, height: 52, borderRadius: 12 },
  orderCopy: { flex: 1 },
  orderTitle: { fontWeight: '700', fontSize: 14 },
  orderWhen: { fontSize: 12, marginTop: 4 },
  chartCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 16 },
  chartTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chartPlotRow: { flexDirection: 'row', marginTop: 16, gap: 8 },
  yAxis: { width: 28, justifyContent: 'space-between', height: 136 },
  yTick: { fontSize: 10 },
  plot: { flex: 1, position: 'relative', overflow: 'hidden' },
  areaSlice: { position: 'absolute', opacity: 0.72, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  chartDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    marginLeft: -5,
  },
  chartSegment: { position: 'absolute', height: 2, transformOrigin: 'left center' },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingLeft: 36 },
  xTick: { fontSize: 11, flex: 1, textAlign: 'center' },
  monthEmpty: { textAlign: 'center', marginTop: 28, marginBottom: 12, fontSize: 15, lineHeight: 22 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16, 22, 18, 0.45)', justifyContent: 'center', padding: 24 },
  modalDismiss: { ...StyleSheet.absoluteFill },
  periodSheet: { borderRadius: 20, padding: 20, gap: 10 },
  periodOption: { borderWidth: 1.5, borderRadius: 14, padding: 14 },
  sheetCancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  noticeRow: { borderWidth: 1, borderRadius: 14, padding: 12 },
});