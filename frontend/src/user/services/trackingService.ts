// Order tracking, live refresh, and alerts (USR-21 through USR-26).

import type { Announcement, AppNotification, Order, OrderItem } from '../types';
import { getDb, nextId, stamp } from '../data/mockStore.js';
import { ORDERS_COPY } from '../data/messages.js';
import { MEALS } from '../data/meals.js';
import { formatPhp, formatPeso } from './orderService.js';
import { getUser } from './authService.js';
import { formatTimestamp } from '../utils/time.js';
import {
  getClientOrderById,
  getClientOrders,
  subscribeToClientOrders,
} from './backendOrderService.js';
import { isSupabaseConfigured } from '../../lib/supabaseClient.js';

export const TRACKING_MSG = {
  noOrders: 'You have no orders yet.',
  noOrdersLead: 'Your orders will show up here once you place one.',
  orderNotFound: 'Order not found.',
  unableRefresh: 'Unable to refresh. Please check your connection.',
  statusUpdate: (trackingNumber: string, status: string) => `Order ${trackingNumber} is now ${status}.`,
  orderCancelled: (trackingNumber: string) => `Order ${trackingNumber} was cancelled.`,
};

export const ORDER_STATUS = {
  FOR_DIETITIAN_REVIEW: 'For Dietitian Review',
  AWAITING_PAYMENT: 'Awaiting Payment',
  PAID: 'Paid',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY_PICKUP: 'Ready for Pickup',
  READY_DELIVERY: 'Ready for Delivery',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const ALL_FILTER_STATUSES = [
  ORDER_STATUS.FOR_DIETITIAN_REVIEW,
  ORDER_STATUS.AWAITING_PAYMENT,
  ORDER_STATUS.PAID,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY_PICKUP,
  ORDER_STATUS.READY_DELIVERY,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
];

const STATUS_META: Record<string, { label: string; colorKey: string }> = {
  [ORDER_STATUS.FOR_DIETITIAN_REVIEW]: { label: 'For Dietitian Review', colorKey: 'warning' },
  [ORDER_STATUS.AWAITING_PAYMENT]: { label: 'Awaiting Payment', colorKey: 'warning' },
  [ORDER_STATUS.PAID]: { label: 'Paid', colorKey: 'action' },
  [ORDER_STATUS.CONFIRMED]: { label: 'Confirmed', colorKey: 'muted' },
  [ORDER_STATUS.PREPARING]: { label: 'Preparing', colorKey: 'success' },
  [ORDER_STATUS.READY_PICKUP]: { label: 'Ready for Pickup', colorKey: 'primary' },
  [ORDER_STATUS.READY_DELIVERY]: { label: 'Ready for Delivery', colorKey: 'primary' },
  [ORDER_STATUS.OUT_FOR_DELIVERY]: { label: 'Out for Delivery', colorKey: 'primary' },
  [ORDER_STATUS.COMPLETED]: { label: 'Completed', colorKey: 'success' },
  [ORDER_STATUS.CANCELLED]: { label: 'Cancelled', colorKey: 'danger' },
};

export const POLL_INTERVAL_MS = 4000;

const BACKEND_STATUS: Record<string, string> = {
  for_dietitian_review: ORDER_STATUS.FOR_DIETITIAN_REVIEW,
  awaiting_payment: ORDER_STATUS.AWAITING_PAYMENT,
  paid: ORDER_STATUS.PAID,
  confirmed: ORDER_STATUS.CONFIRMED,
  preparing: ORDER_STATUS.PREPARING,
  ready_for_pick_up: ORDER_STATUS.READY_PICKUP,
  ready_for_pickup: ORDER_STATUS.READY_PICKUP,
  ready_for_delivery: ORDER_STATUS.READY_DELIVERY,
  out_for_delivery: ORDER_STATUS.OUT_FOR_DELIVERY,
  completed: ORDER_STATUS.COMPLETED,
  cancelled: ORDER_STATUS.CANCELLED,
};

const PROGRESS_HINTS: Record<string, string> = {
  [ORDER_STATUS.FOR_DIETITIAN_REVIEW]: ORDERS_COPY.progressForDietitianReview,
  [ORDER_STATUS.AWAITING_PAYMENT]: ORDERS_COPY.progressAwaitingPayment,
  [ORDER_STATUS.PAID]: ORDERS_COPY.progressPaid,
  [ORDER_STATUS.CONFIRMED]: ORDERS_COPY.progressPaid,
  [ORDER_STATUS.PREPARING]: ORDERS_COPY.progressPreparing,
  [ORDER_STATUS.READY_PICKUP]: ORDERS_COPY.progressReadyPickup,
  [ORDER_STATUS.READY_DELIVERY]: ORDERS_COPY.progressReadyDelivery,
  [ORDER_STATUS.OUT_FOR_DELIVERY]: ORDERS_COPY.progressOutForDelivery,
  [ORDER_STATUS.COMPLETED]: ORDERS_COPY.progressCompleted,
};

const HISTORY_LABELS: Record<string, string> = {
  [ORDER_STATUS.FOR_DIETITIAN_REVIEW]: ORDERS_COPY.historySentToDietitian,
  [ORDER_STATUS.AWAITING_PAYMENT]: ORDERS_COPY.historyApprovedByDietitian,
  [ORDER_STATUS.PAID]: ORDERS_COPY.historyPaid,
  [ORDER_STATUS.CONFIRMED]: ORDERS_COPY.historySentToKitchen,
  [ORDER_STATUS.PREPARING]: ORDERS_COPY.historySentToKitchen,
  [ORDER_STATUS.READY_PICKUP]: ORDERS_COPY.historyReadyPickup,
  [ORDER_STATUS.READY_DELIVERY]: ORDERS_COPY.historyReadyDelivery,
  [ORDER_STATUS.OUT_FOR_DELIVERY]: ORDERS_COPY.historyOutForDelivery,
  [ORDER_STATUS.COMPLETED]: ORDERS_COPY.historyCompleted,
  [ORDER_STATUS.CANCELLED]: ORDERS_COPY.historyCancelled,
};

const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner'];

export function formatOrderPlacedDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function formatStatusHistoryTime(iso: string | null | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const monthDay = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(date);
  return `${monthDay} · ${time}`;
}

export function formatFulfillmentSchedule(iso: string | null | undefined) {
  if (!iso) return '';
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  const day = new Intl.DateTimeFormat('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(start);
  const startTime = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(start);
  const endTime = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(end);
  return `${day} · ${startTime}–${endTime}`;
}

export function formatFulfillmentLine(type: string | null | undefined, scheduledAt?: string | null) {
  const label = type === 'pickup' ? 'Pickup' : 'Delivery';
  const schedule = formatFulfillmentSchedule(scheduledAt);
  return schedule ? `${label} · ${schedule}` : label;
}

export function statusHistoryLabel(status: string) {
  return HISTORY_LABELS[status] || getStatusMeta(status).label;
}

export function progressHintForStatus(status: string) {
  return PROGRESS_HINTS[status] || '';
}

function normalizeStatus(status: string) {
  if (status === ORDER_STATUS.CONFIRMED) return ORDER_STATUS.PAID;
  return status;
}

export function itemsWithMealSlots(items: OrderItem[] | null | undefined) {
  const rows = items || [];
  return rows.map((row, index): {
    slot: string;
    name: string;
    quantity: number;
    lineTotalLabel: string;
    customizationLabel: string;
  } => {
    const meal = MEALS.find((entry) => entry.id === row.mealId);
    const slot = meal?.category && MEAL_SLOTS.includes(meal.category)
      ? meal.category
      : (MEAL_SLOTS[index] || 'Meal');
    return {
      slot,
      name: row.name,
      quantity: row.quantity,
      lineTotalLabel: formatPhp(row.lineTotal),
      customizationLabel: row.customizationLabel || '',
    };
  });
}

interface BackendOrder {
  id: string;
  client_id: string;
  tracking_number: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  total: number | string;
  delivery_fee?: number | string;
  order_items?: Array<{
    meal_id?: string;
    quantity: number;
    unit_price: number | string;
    line_total: number | string;
    meals?: { name?: string } | null;
  }>;
  fulfillment_type?: string;
  address?: string | null;
  schedule?: string;
  special_instructions?: string | null;
  order_status_history?: Array<{ status?: string; changed_at?: string }>;
}

function backendStatusLabel(status: string | null | undefined) {
  const key = String(status || '').toLowerCase();
  return BACKEND_STATUS[key] || ORDER_STATUS.CONFIRMED;
}

export function mapBackendOrder(order: BackendOrder): Order {
  return {
    id: order.id,
    userId: order.client_id,
    trackingNumber: order.tracking_number,
    status: backendStatusLabel(order.status),
    placedAt: order.created_at,
    lastUpdatedAt: order.updated_at,
    total: Number(order.total),
    deliveryFee: Number(order.delivery_fee || 0),
    items: (order.order_items || []).map((item) => ({
      mealId: item.meal_id,
      name: item.meals?.name || 'Meal',
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      lineTotal: Number(item.line_total),
    })),
    fulfillment: {
      type: order.fulfillment_type === 'pick_up' ? 'pickup' : 'delivery',
      address: order.address,
      scheduledAt: order.schedule,
      instructions: order.special_instructions,
    },
    statusHistory: (order.order_status_history || []).map((row) => ({
      status: backendStatusLabel(row.status),
      at: row.changed_at as string,
    })),
  };
}

export async function refreshBackendOrdersForUser(userId: string) {
  if (!isSupabaseConfigured) return null;
  const rows = await getClientOrders();
  return sortOrdersForList(
    rows.filter((row) => row.client_id === userId).map((row) => toListItem(mapBackendOrder(row))),
  );
}

export function detailFromBackendOrder(row: BackendOrder) {
  return toDetail(mapBackendOrder(row));
}

export async function refreshBackendOrder(userId: string, orderId: string) {
  if (!isSupabaseConfigured) return null;
  const row = await getClientOrderById(orderId);
  if (!row || row.client_id !== userId) return null;
  return detailFromBackendOrder(row);
}

export function subscribeToBackendOrderChanges(onChange: () => void) {
  if (!isSupabaseConfigured) return () => {};
  return subscribeToClientOrders(onChange);
}

function ensureOrdersArray(): Order[] {
  const db = getDb();
  if (!Array.isArray(db.orders)) db.orders = [];
  return db.orders;
}

function ensureNotifications(): AppNotification[] {
  const db = getDb();
  if (!Array.isArray(db.notifications)) db.notifications = [];
  return db.notifications;
}

function ensureAnnouncements(): Announcement[] {
  const db = getDb();
  if (!Array.isArray(db.announcements)) db.announcements = [];
  return db.announcements;
}

function parseDayStart(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDayEnd(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isTerminalStatus(status: string) {
  return status === ORDER_STATUS.COMPLETED || status === ORDER_STATUS.CANCELLED;
}

export function sortOrdersForList<T extends { status: string; placedAt?: string }>(orders: T[]): T[] {
  return [...orders].sort((a, b) => {
    const aDone = isTerminalStatus(a.status);
    const bDone = isTerminalStatus(b.status);
    if (aDone !== bDone) return aDone ? 1 : -1;
    const aTime = new Date(a.placedAt || 0).getTime();
    const bTime = new Date(b.placedAt || 0).getTime();
    return bTime - aTime;
  });
}

const SHARED_PROGRESS = [
  ORDER_STATUS.FOR_DIETITIAN_REVIEW,
  ORDER_STATUS.AWAITING_PAYMENT,
  ORDER_STATUS.PAID,
  ORDER_STATUS.PREPARING,
];

export function getStatusesForFulfillment(type: string | null | undefined) {
  if (type === 'pickup') {
    return [...SHARED_PROGRESS, ORDER_STATUS.READY_PICKUP, ORDER_STATUS.COMPLETED];
  }
  return [
    ...SHARED_PROGRESS,
    ORDER_STATUS.READY_DELIVERY,
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.COMPLETED,
  ];
}

export function getOrderProgressSteps(order: Pick<Order, 'status' | 'fulfillment'>) {
  if (order.status === ORDER_STATUS.CANCELLED) {
    return [];
  }
  const timeline = getStatusesForFulfillment(order.fulfillment?.type || 'delivery');
  const current = normalizeStatus(order.status);
  const currentIdx = timeline.indexOf(current);
  return timeline.map((status, index) => ({
    status,
    label: getStatusMeta(status).label,
    hint: progressHintForStatus(status),
    reached: currentIdx >= 0 ? index <= currentIdx : false,
    current: index === currentIdx,
  }));
}

export function getStatusMeta(status: string) {
  const row = STATUS_META[status];
  if (!row) return { label: status, colorKey: 'muted' };
  return { label: row.label, colorKey: row.colorKey };
}

export function listFilterStatuses() {
  return [...ALL_FILTER_STATUSES];
}

function backfillHistory(order: Order) {
  if (!Array.isArray(order.statusHistory) || !order.statusHistory.length) {
    const at = order.placedAt || stamp();
    order.statusHistory = [{ status: order.status || ORDER_STATUS.CONFIRMED, at }];
  }
  if (!order.lastUpdatedAt) {
    order.lastUpdatedAt = order.statusHistory[order.statusHistory.length - 1].at;
  }
}

function mealsSummary(items: OrderItem[] | null | undefined) {
  if (!items?.length) return 'No meals';
  return items.map((row) => row.name).join(', ');
}

export function formatOrderDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toListItem(order: Order) {
  backfillHistory(order);
  const fulfillmentType = order.fulfillment?.type || 'delivery';
  return {
    id: order.id,
    trackingNumber: order.trackingNumber,
    date: formatOrderDate(order.placedAt),
    dateLabel: formatOrderPlacedDate(order.placedAt),
    meals: mealsSummary(order.items),
    status: order.status,
    statusMeta: getStatusMeta(order.status),
    fulfillmentMethod: fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery',
    fulfillmentSummary: formatFulfillmentLine(order.fulfillment?.type, order.fulfillment?.scheduledAt),
    totalLabel: formatPeso(Number(order.total || 0)),
    placedAt: order.placedAt,
    lastUpdatedAt: order.lastUpdatedAt,
    terminal: isTerminalStatus(order.status),
  };
}

function toDetail(order: Order) {
  backfillHistory(order);
  const fulfillmentType = order.fulfillment?.type || 'delivery';
  return {
    id: order.id,
    trackingNumber: order.trackingNumber,
    status: order.status,
    statusMeta: getStatusMeta(order.status),
    paymentStatusLabel: paymentStatusLabel(order.status),
    placedDateLabel: formatOrderPlacedDate(order.placedAt),
    items: itemsWithMealSlots(order.items),
    accountFor: order.accountFor,
    orderedByName: order.orderedByName || '',
    mealRecipientName: order.mealRecipientName || '',
    mealRecipientAddress: order.mealRecipientAddress || '',
    total: order.total,
    totalLabel: formatPeso(Number(order.total || 0)),
    deliveryFee: order.deliveryFee || 0,
    deliveryFeeLabel: formatPhp(order.deliveryFee || 0),
    fulfillment: {
      type: fulfillmentType,
      typeLabel: fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery',
      address: order.fulfillment?.address || null,
      scheduledAt: order.fulfillment?.scheduledAt,
      scheduleLabel: formatFulfillmentSchedule(order.fulfillment?.scheduledAt),
      summary: formatFulfillmentLine(fulfillmentType, order.fulfillment?.scheduledAt),
      instructions: order.fulfillment?.instructions || null,
    },
    progressSteps: getOrderProgressSteps(order),
    statusTimeline: getStatusesForFulfillment(fulfillmentType).map((status) => ({
      status,
      ...getStatusMeta(status),
      reached: isStatusReached(order, status),
    })),
    statusHistory: (order.statusHistory || []).map((row) => ({
      status: row.status,
      historyLabel: statusHistoryLabel(row.status),
      statusMeta: getStatusMeta(row.status),
      at: row.at,
      atLabel: formatStatusHistoryTime(row.at),
    })),
    lastUpdatedAt: order.lastUpdatedAt,
    lastUpdatedLabel: formatTimestamp(order.lastUpdatedAt),
    placedAt: order.placedAt,
  };
}

function isStatusReached(order: Order, status: string) {
  const timeline = getStatusesForFulfillment(order.fulfillment?.type || 'delivery');
  const currentIdx = timeline.indexOf(normalizeStatus(order.status));
  const statusIdx = timeline.indexOf(status);
  if (currentIdx < 0 || statusIdx < 0) {
    return (order.statusHistory || []).some((row) => row.status === status);
  }
  return statusIdx <= currentIdx;
}

export function filterClientOrders(userId: string, {
  status,
  dateFrom,
  dateTo,
}: { status?: string; dateFrom?: string; dateTo?: string } = {}) {
  let orders = ensureOrdersArray().filter((o) => o.userId === userId);
  if (status) {
    orders = orders.filter((o) => o.status === status);
  }
  const from = parseDayStart(dateFrom);
  if (from) {
    orders = orders.filter((o) => new Date(o.placedAt as string).getTime() >= from.getTime());
  }
  const to = parseDayEnd(dateTo);
  if (to) {
    orders = orders.filter((o) => new Date(o.placedAt as string).getTime() <= to.getTime());
  }
  return sortOrdersForList(orders);
}

export function listClientOrders(userId: string, filters: { status?: string; dateFrom?: string; dateTo?: string } = {}) {
  return filterClientOrders(userId, filters).map(toListItem);
}

export function getClientOrder(userId: string, orderId: string) {
  const order = ensureOrdersArray().find((o) => o.id === orderId);
  if (!order || order.userId !== userId) {
    return { ok: false, message: TRACKING_MSG.orderNotFound };
  }
  return { ok: true, order: toDetail(order) };
}

export function searchOrderByTracking(userId: string, trackingNumber: string | null | undefined) {
  const trimmed = String(trackingNumber || '').trim();
  if (!trimmed) {
    return { ok: false, message: TRACKING_MSG.orderNotFound };
  }
  const order = ensureOrdersArray().find((o) => o.trackingNumber === trimmed);
  if (!order || order.userId !== userId) {
    return { ok: false, message: TRACKING_MSG.orderNotFound };
  }
  return { ok: true, order: toDetail(order) };
}

export function refreshOrdersForUser(userId: string, { connected = true }: { connected?: boolean } = {}) {
  if (!connected) {
    return { ok: false, message: TRACKING_MSG.unableRefresh, orders: null, refreshedAt: null };
  }
  const orders = listClientOrders(userId);
  return { ok: true, orders, refreshedAt: stamp() };
}

export function refreshClientOrder(userId: string, orderId: string, { connected = true }: { connected?: boolean } = {}) {
  if (!connected) {
    return { ok: false, message: TRACKING_MSG.unableRefresh, order: null, refreshedAt: null };
  }
  const result = getClientOrder(userId, orderId);
  if (!result.ok) {
    return { ok: false, message: result.message, order: null, refreshedAt: null };
  }
  return { ok: true, order: result.order, refreshedAt: stamp() };
}

function pushNotification(userId: string, payload: {
  type?: string;
  orderId?: string;
  trackingNumber?: string;
  message?: string;
  status?: string;
}) {
  const notifications = ensureNotifications();
  const row = {
    id: nextId('notif'),
    userId,
    read: false,
    createdAt: stamp(),
    ...payload,
  };
  notifications.push(row);
  return row;
}

export function recordStatusChange(order: Order, newStatus: string, at?: string) {
  const when = at || stamp();
  const previous = order.status;
  if (previous === newStatus) return { changed: false, order };
  if (newStatus !== ORDER_STATUS.CANCELLED) {
    const allowed = getStatusesForFulfillment(order.fulfillment?.type || 'delivery');
    const legacySkip = previous === ORDER_STATUS.CONFIRMED && newStatus === ORDER_STATUS.PREPARING;
    const previousIndex = allowed.indexOf(normalizeStatus(previous));
    const nextIndex = allowed.indexOf(newStatus);
    if (!legacySkip && (previousIndex < 0 || nextIndex !== previousIndex + 1)) {
      return { changed: false, order, message: 'Status transition is not allowed.' };
    }
  }
  order.status = newStatus;
  order.lastUpdatedAt = when;
  backfillHistory(order);
  order.statusHistory.push({ status: newStatus, at: when });
  const user = getUser(order.userId);
  const recipientName = order.mealRecipientName
    || (user?.accountFor === 'family'
      ? [user.mealRecipient?.firstName, user.mealRecipient?.lastName].filter(Boolean).join(' ')
      : '');
  const message = user?.accountFor === 'family' && recipientName
    ? `Order ${order.trackingNumber} for ${recipientName} is now ${newStatus}.`
    : TRACKING_MSG.statusUpdate(order.trackingNumber, newStatus);
  pushNotification(order.userId, {
    type: 'status',
    orderId: order.id,
    trackingNumber: order.trackingNumber,
    message,
    status: newStatus,
  });
  return { changed: true, order };
}

export function cancelClientOrder(orderId: string, { at }: { at?: string } = {}) {
  const order = ensureOrdersArray().find((o) => o.id === orderId);
  if (!order) return { ok: false, message: TRACKING_MSG.orderNotFound };
  const when = at || stamp();
  recordStatusChange(order, ORDER_STATUS.CANCELLED, when);
  return { ok: true, order };
}

/** Kitchen or test hook to advance an order status. */
export function advanceOrderStatus(orderId: string, newStatus: string, { at }: { at?: string } = {}) {
  const order = ensureOrdersArray().find((o) => o.id === orderId);
  if (!order) return { ok: false, message: TRACKING_MSG.orderNotFound };
  recordStatusChange(order, newStatus, at);
  return { ok: true, order };
}

function announcementRead(announcement: Announcement, userId: string) {
  if (!announcement.readBy) announcement.readBy = {};
  return !!announcement.readBy[userId];
}

export function getAlertsForUser(userId: string) {
  const notifications = ensureNotifications()
    .filter((n) => n.userId === userId)
    .map((n) => ({
      kind: 'notification',
      id: n.id,
      message: n.message,
      read: !!n.read,
      createdAt: n.createdAt,
      timeLabel: formatTimestamp(n.createdAt),
      type: n.type,
      orderId: n.orderId,
    }));

  const announcements = ensureAnnouncements().map((a) => ({
    kind: 'announcement',
    id: a.id,
    message: a.message,
    read: announcementRead(a, userId),
    createdAt: a.createdAt,
    timeLabel: formatTimestamp(a.createdAt),
    type: 'announcement',
  }));

  return [...notifications, ...announcements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function markAlertRead(userId: string, kind: string, id: string) {
  if (kind === 'notification') {
    const row = ensureNotifications().find((n) => n.id === id && n.userId === userId);
    if (row) row.read = true;
    return { ok: !!row };
  }
  if (kind === 'announcement') {
    const row = ensureAnnouncements().find((a) => a.id === id);
    if (row) {
      if (!row.readBy) row.readBy = {};
      row.readBy[userId] = true;
    }
    return { ok: !!row };
  }
  return { ok: false };
}

export function __testPushAnnouncement(message: string, { at }: { at?: string } = {}) {
  const announcements = ensureAnnouncements();
  const row = {
    id: nextId('ann'),
    message,
    createdAt: at || stamp(),
    readBy: {},
  };
  announcements.push(row);
  return row;
}

export function __testResetAlerts() {
  const db = getDb();
  db.notifications = [];
  db.announcements = [];
}

export function payClientOrder(userId: string, orderId: string) {
  const orders = ensureOrdersArray();
  const order = orders.find((row) => row.id === orderId && row.userId === userId);
  if (!order) return { ok: false as const, message: TRACKING_MSG.orderNotFound };
  if (order.status !== ORDER_STATUS.AWAITING_PAYMENT) {
    return { ok: false as const, message: 'Payment is available after Dietitian approval.' };
  }
  const at = stamp();
  order.status = ORDER_STATUS.PAID;
  order.statusHistory = [...(order.statusHistory || []), { status: ORDER_STATUS.PAID, at }];
  order.lastUpdatedAt = at;
  return { ok: true as const, order };
}

export function paymentStatusLabel(status: string) {
  if (status === ORDER_STATUS.CANCELLED) return ORDER_STATUS.CANCELLED;
  if (status === ORDER_STATUS.FOR_DIETITIAN_REVIEW) return ORDERS_COPY.paymentPending;
  if (status === ORDER_STATUS.AWAITING_PAYMENT) return ORDER_STATUS.AWAITING_PAYMENT;
  return ORDER_STATUS.PAID;
}
