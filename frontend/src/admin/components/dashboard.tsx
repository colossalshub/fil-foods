import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { Image, Modal, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Text } from '../ui/StaffText.js';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../copy.js';
import { chartMaxForValues, chartYAxisTicks } from '../domain/dashboardMetrics.js';
import { orderListDisplayId } from '../domain/orderDisplay.js';
import { avatarLetter, percentLabel } from '../domain/format.js';
import { useAdmin } from '../context.js';
import { AdminListStatusBadge, FlashBanner, PrimaryButton } from '../components.js';
import type { AdminOrder } from '../types.js';

declare const require: (id: string) => number;

const logo = require('../../../assets/images/fil-foods-logo.png');

const WEEK_LABELS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'] as const;

const STAT = {
  greenBg: '#EAF4EC',
  greenBorder: '#CFE5D6',
  greenIconBg: '#FFFFFF',
  orangeBg: '#FFF1E0',
  orangeBorder: '#F5D4A8',
  orangeIconBg: '#FFD4A3',
} as const;

function formatSalesTick(value: number) {
  if (value === 0) return '0';
  if (value >= 1000) return `${value / 1000}k`;
  return String(value);
}

function splitWhen(when: string) {
  const parts = when.split('·').map((part) => part.trim());
  return { date: parts[0] ?? when, time: parts[1] ?? '' };
}

export function AdminDashboardHeader({
  onNotifications,
  onAccount,
  adminName,
}: {
  onNotifications: () => void;
  onAccount: () => void;
  adminName: string;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useAdmin();
  return (
    <View style={[styles.header, { backgroundColor: colors.header, paddingTop: insets.top + 10 }]}>
      <View style={styles.headerRow}>
        <Image source={logo} style={styles.headerLogo} resizeMode="contain" accessibilityLabel="F.I.L Foods logo" />
        <View style={styles.headerCopy}>
          <Text style={styles.headerBrand}>{COPY.dashboardBrand}</Text>
          <Text style={styles.headerPanel}>Admin Panel</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={onNotifications}
          style={styles.headerAction}
        >
          <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Account settings" onPress={onAccount} style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarLetter(adminName)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function DashboardWelcomeBlock() {
  const { colors } = useAdmin();
  return (
    <View style={styles.welcomeBlock}>
      <FlashBanner />
      <Text style={[styles.greeting, { color: colors.text }]} accessibilityRole="header">{COPY.welcome}</Text>
      <Text style={[styles.subGreeting, { color: colors.muted }]}>{COPY.dashboardSubtitle}</Text>
    </View>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  delta: number;
  icon: ComponentProps<typeof Ionicons>['name'];
  accent?: boolean;
};

export function DashboardStatCard({ label, value, delta, icon, accent }: StatCardProps) {
  const { colors } = useAdmin();
  return (
    <View
      style={[
        styles.statCard,
        accent
          ? { backgroundColor: STAT.orangeBg, borderColor: STAT.orangeBorder }
          : { backgroundColor: STAT.greenBg, borderColor: STAT.greenBorder },
      ]}
    >
      <View
        style={[
          styles.statIcon,
          { backgroundColor: accent ? STAT.orangeIconBg : STAT.greenIconBg },
        ]}
      >
        <Ionicons name={icon} size={22} color={colors.greenDeep} />
      </View>
      <Text style={[styles.statLabel, { color: colors.muted }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      {delta > 0 ? (
        <View style={styles.statDelta}>
          <Ionicons name="arrow-up" size={13} color={colors.positive} />
          <Text style={[styles.statDeltaText, { color: colors.positive }]}>{percentLabel(delta)}</Text>
        </View>
      ) : <View style={styles.statDeltaSpacer} />}
    </View>
  );
}

export function DashboardStatGrid({ children }: { children: ReactNode }) {
  return <View style={styles.statGrid}>{children}</View>;
}

type RecentOrdersProps = {
  orders: AdminOrder[];
  photos: Record<string, number>;
  onViewAll: () => void;
  onOrder: (id: string) => void;
  viewAllLabel: string;
};

export function DashboardRecentOrders({ orders, photos, onViewAll, onOrder, viewAllLabel }: RecentOrdersProps) {
  const { colors } = useAdmin();
  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.panelHead}>
        <View style={styles.panelTitleRow}>
          <View style={[styles.panelIcon, { backgroundColor: colors.mint }]}>
            <Ionicons name="receipt-outline" size={18} color={colors.green} />
          </View>
          <Text style={[styles.panelTitle, { color: colors.text }]}>Recent Orders</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onViewAll} style={styles.viewAll}>
          <Text style={[styles.viewAllText, { color: colors.green }]}>{viewAllLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.green} />
        </Pressable>
      </View>
      {orders.length === 0 ? (
        <Text style={[styles.emptyRecent, { color: colors.muted }]}>{COPY.noRecentOrders}</Text>
      ) : orders.map((order, index) => {
        const { date, time } = splitWhen(order.when);
        return (
          <Pressable
            key={order.id}
            accessibilityRole="button"
            onPress={() => onOrder(order.id)}
            style={[
              styles.orderRow,
              index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
            ]}
          >
            <Image
              source={photos[order.photo] ?? photos.wrap}
              style={styles.orderThumb}
              accessibilityIgnoresInvertColors
            />
            <View style={styles.orderMain}>
              <Text style={[styles.orderIdLine, { color: colors.text }]} numberOfLines={2}>
                <Text style={styles.orderId}>{orderListDisplayId(order)}</Text>
                {' '}{order.customerName}
              </Text>
            </View>
            <View style={styles.orderAside}>
              <AdminListStatusBadge status={order.status} />
              <Text style={[styles.orderDate, { color: colors.muted }]} numberOfLines={1}>{date}</Text>
              {time ? <Text style={[styles.orderTime, { color: colors.muted }]} numberOfLines={1}>{time}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function PeriodPicker({
  visible,
  draft,
  onSelect,
  onClose,
  onApply,
  applyLabel,
}: {
  visible: boolean;
  draft: boolean;
  onSelect: (month: boolean) => void;
  onClose: () => void;
  onApply: () => void;
  applyLabel: string;
}) {
  const { colors } = useAdmin();
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalDismiss} onPress={onClose} accessibilityLabel="Dismiss" />
        <View style={[styles.periodSheet, { backgroundColor: colors.card }]}>
          <Text style={[styles.panelTitle, { color: colors.text, textAlign: 'center' }]}>Sales period</Text>
          {[{ month: false, label: 'This Week' }, { month: true, label: 'This Month' }].map((option) => {
            const selected = draft === option.month;
            return (
              <Pressable
                key={option.label}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onSelect(option.month)}
                style={[
                  styles.periodOption,
                  { borderColor: selected ? colors.green : colors.border, backgroundColor: selected ? colors.mint : colors.card },
                ]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>{option.label}</Text>
              </Pressable>
            );
          })}
          <PrimaryButton title={applyLabel} onPress={onApply} />
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.sheetCancel}>
            <Text style={{ color: colors.green, fontWeight: '700' }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function DashboardSalesOverview({
  points,
  periodLabel,
  monthView,
  periodOpen,
  periodDraft,
  applyLabel,
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
  applyLabel: string;
  onOpenPeriod: () => void;
  onClosePeriod: () => void;
  onSelectPeriod: (month: boolean) => void;
  onApplyPeriod: () => void;
}) {
  const { colors } = useAdmin();
  const plotHeight = 148;
  const [plotWidth, setPlotWidth] = useState(0);
  const chartMax = useMemo(() => chartMaxForValues(points), [points]);
  const yTicks = useMemo(() => chartYAxisTicks(chartMax), [chartMax]);
  const scale = chartMax > 0 ? chartMax : 1;

  const coords = useMemo(() => {
    if (plotWidth <= 0) return [];
    const padX = 8;
    const innerW = plotWidth - padX * 2;
    const step = points.length > 1 ? innerW / (points.length - 1) : 0;
    return points.map((value, index) => ({
      x: padX + step * index,
      y: plotHeight - 10 - (value / scale) * (plotHeight - 24),
      value,
    }));
  }, [points, plotWidth, scale, plotHeight]);

  const onPlotLayout = (e: LayoutChangeEvent) => {
    setPlotWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={[styles.panel, styles.chartPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.panelHead}>
        <View style={styles.panelTitleRow}>
          <View style={[styles.panelIcon, { backgroundColor: colors.mint }]}>
            <Ionicons name="stats-chart-outline" size={18} color={colors.green} />
          </View>
          <Text style={[styles.panelTitle, { color: colors.text }]}>Sales Overview</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sales period"
          onPress={onOpenPeriod}
          style={[styles.periodChip, { backgroundColor: colors.page, borderColor: colors.border }]}
        >
          <Text style={[styles.periodChipText, { color: colors.text }]}>{periodLabel}</Text>
          <Ionicons name="chevron-down" size={15} color={colors.muted} />
        </Pressable>
      </View>
      {monthView ? (
        <Text style={[styles.monthEmpty, { color: colors.muted }]}>{COPY.monthEmpty}</Text>
      ) : (
        <View style={styles.chartBody}>
          <View style={[styles.yAxis, { height: plotHeight }]}>
            {yTicks.map((tick) => (
              <Text key={tick} style={[styles.yTick, { color: colors.muted }]}>{formatSalesTick(tick)}</Text>
            ))}
          </View>
          <View style={styles.chartMain}>
            <View style={[styles.plot, { height: plotHeight }]} onLayout={onPlotLayout}>
              {yTicks.slice(1).map((tick) => {
                const y = plotHeight - 10 - (tick / scale) * (plotHeight - 24);
                return (
                  <View
                    key={`grid-${tick}`}
                    style={[styles.gridLine, { top: y, backgroundColor: colors.border }]}
                  />
                );
              })}
              {coords.length > 1 && coords.map((point, index) => {
                if (index === 0) return null;
                const prev = coords[index - 1];
                const left = Math.min(prev.x, point.x);
                const width = Math.abs(point.x - prev.x);
                const top = Math.min(prev.y, point.y);
                const height = plotHeight - 10 - top;
                return (
                  <View
                    key={`area-${index}`}
                    style={[
                      styles.areaCol,
                      {
                        left,
                        width,
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
                if (!next) return null;
                const dx = next.x - point.x;
                const dy = next.y - point.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                return (
                  <View
                    key={`seg-${index}`}
                    style={[
                      styles.lineSeg,
                      {
                        width: length,
                        left: point.x,
                        top: point.y,
                        transform: [{ rotate: `${angle}deg` }],
                        backgroundColor: colors.green,
                      },
                    ]}
                  />
                );
              })}
              {coords.map((point, index) => (
                <View
                  key={`dot-${index}`}
                  style={[
                    styles.chartDot,
                    {
                      left: point.x - 5,
                      top: point.y - 5,
                      backgroundColor: colors.green,
                      borderColor: colors.card,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.xAxis}>
              {WEEK_LABELS.map((label) => (
                <Text key={label} style={[styles.xTick, { color: colors.muted }]}>{label}</Text>
              ))}
            </View>
          </View>
        </View>
      )}
      <PeriodPicker
        visible={periodOpen}
        draft={periodDraft}
        onSelect={onSelectPeriod}
        onClose={onClosePeriod}
        onApply={onApplyPeriod}
        applyLabel={applyLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  headerBrand: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerPanel: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 2, fontWeight: '500' },
  headerAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#0E542C', fontWeight: '800', fontSize: 16 },
  welcomeBlock: { paddingHorizontal: 16, paddingTop: 14, gap: 4 },
  greeting: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4, marginTop: 4 },
  subGreeting: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '47%',
    maxWidth: '48.5%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 138,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statLabel: { fontSize: 12, fontWeight: '600' },
  statValue: { fontSize: 21, fontWeight: '800', marginTop: 6, letterSpacing: -0.3 },
  statDelta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 10 },
  statDeltaSpacer: { height: 23, marginTop: 10 },
  statDeltaText: { fontSize: 12, fontWeight: '700' },
  panel: {
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingBottom: 6,
    shadowColor: '#0E2014',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  chartPanel: { paddingBottom: 14 },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 8,
  },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  panelIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4, paddingLeft: 8 },
  viewAllText: { fontSize: 13, fontWeight: '700' },
  emptyRecent: { paddingVertical: 16, fontSize: 14, textAlign: 'center' },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
  },
  orderThumb: { width: 50, height: 50, borderRadius: 12 },
  orderMain: { flex: 1, minWidth: 0, paddingTop: 2 },
  orderIdLine: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  orderId: { fontWeight: '800' },
  orderAside: { alignItems: 'flex-end', gap: 4, maxWidth: '38%', flexShrink: 0 },
  orderDate: { fontSize: 10, textAlign: 'right' },
  orderTime: { fontSize: 11, fontWeight: '600', textAlign: 'right' },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  periodChipText: { fontWeight: '700', fontSize: 12 },
  chartBody: { flexDirection: 'row', gap: 6, marginTop: 4 },
  yAxis: { width: 30, justifyContent: 'space-between', paddingBottom: 22 },
  yTick: { fontSize: 10, fontWeight: '500' },
  chartMain: { flex: 1, minWidth: 0 },
  plot: { position: 'relative', width: '100%', overflow: 'visible' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, opacity: 0.85 },
  areaCol: { position: 'absolute', opacity: 0.55, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  lineSeg: { position: 'absolute', height: 2.5, transformOrigin: 'left center' },
  chartDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 },
  xTick: { fontSize: 10, flex: 1, textAlign: 'center', fontWeight: '500' },
  monthEmpty: { textAlign: 'center', paddingVertical: 32, fontSize: 14, lineHeight: 22 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16, 22, 18, 0.45)', justifyContent: 'center', padding: 24 },
  modalDismiss: { ...StyleSheet.absoluteFill },
  periodSheet: { borderRadius: 20, padding: 20, gap: 10 },
  periodOption: { borderWidth: 1.5, borderRadius: 14, padding: 14 },
  sheetCancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});