import type { AdminOrder, DashboardMetrics, MenuItem } from '../types.js';

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_WEEK = 7 * MS_DAY;

function parsePlacedAt(iso: string) {
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? null : time;
}

/** Orders that contribute to sales totals (excludes cancelled). */
/** Sales count money actually taken: unpaid (review / awaiting payment) and cancelled orders are left out. */
const UNPAID: AdminOrder['status'][] = ['Cancelled', 'For Dietitian Review', 'Awaiting Payment'];

export function ordersForSales(orders: AdminOrder[]) {
  return orders.filter((order) => !UNPAID.includes(order.status));
}

function uniqueCustomersWithOrders(orders: AdminOrder[]) {
  const ids = new Set<string>();
  for (const order of orders) {
    if (order.clientId) ids.add(order.clientId);
    else if (order.customerName.trim()) ids.add(`name:${order.customerName.trim().toLowerCase()}`);
  }
  return ids.size;
}

function countInRange(orders: AdminOrder[], start: number, end: number) {
  let count = 0;
  for (const order of orders) {
    const placed = parsePlacedAt(order.placedAt);
    if (placed === null) continue;
    if (placed >= start && placed < end) count += 1;
  }
  return count;
}

function salesInRange(orders: AdminOrder[], start: number, end: number) {
  let total = 0;
  for (const order of ordersForSales(orders)) {
    const placed = parsePlacedAt(order.placedAt);
    if (placed === null) continue;
    if (placed >= start && placed < end) total += order.price;
  }
  return total;
}

function customersWithOrdersInRange(orders: AdminOrder[], start: number, end: number) {
  const ids = new Set<string>();
  for (const order of orders) {
    const placed = parsePlacedAt(order.placedAt);
    if (placed === null) continue;
    if (placed < start || placed >= end) continue;
    if (order.clientId) ids.add(order.clientId);
    else ids.add(`name:${order.customerName.trim().toLowerCase()}`);
  }
  return ids.size;
}

function growthDelta(current: number, previous: number) {
  if (previous <= 0) return 0;
  return (current - previous) / previous;
}

function startOfWeekMonday(reference: Date) {
  const day = reference.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + mondayOffset);
  return start.getTime();
}

export function salesByDayThisWeek(orders: AdminOrder[], reference = new Date()): number[] {
  const weekStart = startOfWeekMonday(reference);
  const buckets = [0, 0, 0, 0, 0, 0, 0];
  for (const order of ordersForSales(orders)) {
    const placed = parsePlacedAt(order.placedAt);
    if (placed === null) continue;
    const dayIndex = Math.floor((placed - weekStart) / MS_DAY);
    if (dayIndex >= 0 && dayIndex < 7) buckets[dayIndex] += order.price;
  }
  return buckets;
}

/** Last four calendar weeks of sales; Week 1 oldest, Week 4 most recent. */
export function salesByFourWeeks(orders: AdminOrder[], reference = new Date()): number[] {
  const now = reference.getTime();
  const buckets = [0, 0, 0, 0];
  for (const order of ordersForSales(orders)) {
    const placed = parsePlacedAt(order.placedAt);
    if (placed === null) continue;
    const age = now - placed;
    if (age < 0) continue;
    const weekIndex = Math.floor(age / MS_WEEK);
    if (weekIndex >= 0 && weekIndex < 4) buckets[3 - weekIndex] += order.price;
  }
  return buckets;
}

export function chartMaxForValues(values: number[]) {
  const peak = Math.max(...values, 0);
  if (peak <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(peak));
  const scaled = peak / magnitude;
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return nice * magnitude;
}

export function chartYAxisTicks(max: number) {
  if (max <= 0) return [0];
  const steps = 4;
  const step = max / steps;
  const ticks: number[] = [];
  for (let i = steps; i >= 0; i -= 1) ticks.push(Math.round(step * i));
  return ticks;
}

export function computeDashboardMetrics(
  orders: AdminOrder[],
  menu: MenuItem[],
  reference = new Date(),
): DashboardMetrics {
  const now = reference.getTime();
  const salesOrders = ordersForSales(orders);
  const totalOrders = orders.length;
  const totalSales = salesOrders.reduce((sum, order) => sum + order.price, 0);
  const totalCustomers = uniqueCustomersWithOrders(orders);
  void menu;

  const currentWeekStart = now - MS_WEEK;
  const previousWeekStart = now - 2 * MS_WEEK;

  const ordersDelta = growthDelta(
    countInRange(orders, currentWeekStart, now),
    countInRange(orders, previousWeekStart, currentWeekStart),
  );
  const salesDelta = growthDelta(
    salesInRange(orders, currentWeekStart, now),
    salesInRange(orders, previousWeekStart, currentWeekStart),
  );
  const customersDelta = growthDelta(
    customersWithOrdersInRange(orders, currentWeekStart, now),
    customersWithOrdersInRange(orders, previousWeekStart, currentWeekStart),
  );

  const menuDelta = 0;

  return {
    totalOrders,
    ordersDelta,
    totalSales,
    salesDelta,
    totalCustomers,
    customersDelta,
    menuDelta,
    weekSales: salesByDayThisWeek(orders, reference),
    salesOverviewWeeks: salesByFourWeeks(orders, reference),
    monthSales: null,
  };
}