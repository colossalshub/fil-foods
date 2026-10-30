// Order tracking, live refresh, and alerts (CLT-21 through CLT-26).

import { getDb, nextId, stamp } from '../data/mockStore.js';
import { formatPhp } from './orderService.js';
import { formatTimestamp } from '../utils/time.js';
import {
  getClientOrderById,
  getClientOrders,
  subscribeToClientOrders,
} from './backendOrderService.js';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';

export const TRACKING_MSG = {
  noOrders: 'You have no orders yet.',
  orderNotFound: 'Order not found.',
  unableRefresh: 'Unable to refresh. Please check your connection.',
  statusUpdate: (trackingNumber, status) => `Order ${trackingNumber} is now ${status}.`,
  orderCancelled: (trackingNumber) => `Order ${trackingNumber} was cancelled.`,
};

export const ORDER_STATUS = {
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY_PICKUP: 'Ready for Pick-up',
  READY_DELIVERY: 'Ready for Delivery',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const ALL_FILTER_STATUSES = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY_PICKUP,
  ORDER_STATUS.READY_DELIVERY,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.COMPLETED,
];

const STATUS_META = {
  [ORDER_STATUS.CONFIRMED]: { label: 'Confirmed', colorKey: 'muted' },
  [ORDER_STATUS.PREPARING]: { label: 'Preparing', colorKey: 'warning' },
  [ORDER_STATUS.READY_PICKUP]: { label: 'Ready for Pick-up', colorKey: 'action' },
  [ORDER_STATUS.READY_DELIVERY]: { label: 'Ready for Delivery', colorKey: 'action' },
  [ORDER_STATUS.OUT_FOR_DELIVERY]: { label: 'Out for Delivery', colorKey: 'primary' },
  [ORDER_STATUS.COMPLETED]: { label: 'Completed', colorKey: 'success' },
  [ORDER_STATUS.CANCELLED]: { label: 'Cancelled', colorKey: 'danger' },
};

export const POLL_INTERVAL_MS = 4000;

const BACKEND_STATUS = {
  confirmed: ORDER_STATUS.CONFIRMED,
  preparing: ORDER_STATUS.PREPARING,
  ready_for_pick_up: ORDER_STATUS.READY_PICKUP,
  ready_for_delivery: ORDER_STATUS.READY_DELIVERY,
  out_for_delivery: ORDER_STATUS.OUT_FOR_DELIVERY,
  completed: ORDER_STATUS.COMPLETED,
  cancelled: ORDER_STATUS.CANCELLED,
};

function backendStatusLabel(status) {
  const key = String(status || '').toLowerCase();
  return BACKEND_STATUS[key] || ORDER_STATUS.CONFIRMED;
}

export function mapBackendOrder(order) {
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
      at: row.changed_at,
    })),
  };
}

export async function refreshBackendOrdersForUser(userId) {
  if (!isSupabaseConfigured) return null;
  const rows = await getClientOrders();
  return sortOrdersForList(
    rows.filter((row) => row.client_id === userId).map((row) => toListItem(mapBackendOrder(row))),
  );
}

export function detailFromBackendOrder(row) {
  return toDetail(mapBackendOrder(row));
}

export async function refreshBackendOrder(userId, orderId) {
  if (!isSupabaseConfigured) return null;
  const row = await getClientOrderById(orderId);
  if (!row || row.client_id !== userId) return null;
  return detailFromBackendOrder(row);
}

export function subscribeToBackendOrderChanges(onChange) {
  if (!isSupabaseConfigured) return () => {};
  return subscribeToClientOrders(onChange);
}

function ensureOrdersArray() {
  const db = getDb();
  if (!Array.isArray(db.orders)) db.orders = [];
  return db.orders;
}

function ensureNotifications() {
  const db = getDb();
  if (!Array.isArray(db.notifications)) db.notifications = [];
  return db.notifications;
}

function ensureAnnouncements() {
  const db = getDb();
  if (!Array.isArray(db.announcements)) db.announcements = [];
  return db.announcements;
}

function parseDayStart(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDayEnd(value) {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isTerminalStatus(status) {
  return status === ORDER_STATUS.COMPLETED || status === ORDER_STATUS.CANCELLED;
}

export function sortOrdersForList(orders) {
  return [...orders].sort((a, b) => {
    const aDone = isTerminalStatus(a.status);
    const bDone = isTerminalStatus(b.status);
    if (aDone !== bDone) return aDone ? 1 : -1;
    const aTime = new Date(a.placedAt || 0).getTime();
    const bTime = new Date(b.placedAt || 0).getTime();
    return bTime - aTime;
  });
}

export function getStatusesForFulfillment(type) {
  if (type === 'pickup') {
    return [
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.PREPARING,
      ORDER_STATUS.READY_PICKUP,
      ORDER_STATUS.COMPLETED,
    ];
  }
  return [
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.PREPARING,
    ORDER_STATUS.READY_DELIVERY,
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.COMPLETED,
  ];
}

export function getStatusMeta(status) {
  const row = STATUS_META[status];
  if (!row) return { label: status, colorKey: 'muted' };
  return { label: row.label, colorKey: row.colorKey };
}

export function listFilterStatuses() {
  return [...ALL_FILTER_STATUSES];
}

function backfillHistory(order) {
  if (!Array.isArray(order.statusHistory) || !order.statusHistory.length) {
    const at = order.placedAt || stamp();
    order.statusHistory = [{ status: order.status || ORDER_STATUS.CONFIRMED, at }];
  }
  if (!order.lastUpdatedAt) {
    order.lastUpdatedAt = order.statusHistory[order.statusHistory.length - 1].at;
  }
}

function mealsSummary(items) {
  if (!items?.length) return 'No meals';
  const parts = items.map((row) => `${row.name} ×${row.quantity}`);
  return parts.join(', ');
}

export function formatOrderDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toListItem(order) {
  backfillHistory(order);
  return {
    id: order.id,
    trackingNumber: order.trackingNumber,
    date: formatOrderDate(order.placedAt),
    meals: mealsSummary(order.items),
    status: order.status,
    statusMeta: getStatusMeta(order.status),
    placedAt: order.placedAt,
    lastUpdatedAt: order.lastUpdatedAt,
    terminal: isTerminalStatus(order.status),
  };
}

function toDetail(order) {
  backfillHistory(order);
  const fulfillmentType = order.fulfillment?.type || 'delivery';
  return {
    id: order.id,
    trackingNumber: order.trackingNumber,
    status: order.status,
    statusMeta: getStatusMeta(order.status),
    items: (order.items || []).map((row) => ({
      name: row.name,
      quantity: row.quantity,
      lineTotal: row.lineTotal,
      lineTotalLabel: formatPhp(row.lineTotal),
    })),
    total: order.total,
    totalLabel: formatPhp(order.total),
    deliveryFee: order.deliveryFee || 0,
    deliveryFeeLabel: formatPhp(order.deliveryFee || 0),
    fulfillment: {
      type: fulfillmentType,
      typeLabel: fulfillmentType === 'pickup' ? 'Pick-up' : 'Delivery',
      address: order.fulfillment?.address || null,
      scheduledAt: order.fulfillment?.scheduledAt,
      scheduleLabel: formatTimestamp(order.fulfillment?.scheduledAt),
      instructions: order.fulfillment?.instructions || null,
    },
    statusTimeline: getStatusesForFulfillment(fulfillmentType).map((status) => ({
      status,
      ...getStatusMeta(status),
      reached: isStatusReached(order, status),
    })),
    statusHistory: (order.statusHistory || []).map((row) => ({
      status: row.status,
      statusMeta: getStatusMeta(row.status),
      at: row.at,
      atLabel: formatTimestamp(row.at),
    })),
    lastUpdatedAt: order.lastUpdatedAt,
    lastUpdatedLabel: formatTimestamp(order.lastUpdatedAt),
    placedAt: order.placedAt,
  };
}

function isStatusReached(order, status) {
  const timeline = getStatusesForFulfillment(order.fulfillment?.type || 'delivery');
  const currentIdx = timeline.indexOf(order.status);
  const statusIdx = timeline.indexOf(status);
  if (currentIdx < 0 || statusIdx < 0) {
    return (order.statusHistory || []).some((row) => row.status === status);
  }
  return statusIdx <= currentIdx;
}

export function filterClientOrders(userId, { status, dateFrom, dateTo } = {}) {
  let orders = ensureOrdersArray().filter((o) => o.userId === userId);
  if (status) {
    orders = orders.filter((o) => o.status === status);
  }
  const from = parseDayStart(dateFrom);
  if (from) {
    orders = orders.filter((o) => new Date(o.placedAt).getTime() >= from.getTime());
  }
  const to = parseDayEnd(dateTo);
  if (to) {
    orders = orders.filter((o) => new Date(o.placedAt).getTime() <= to.getTime());
  }
  return sortOrdersForList(orders);
}

export function listClientOrders(userId, filters = {}) {
  return filterClientOrders(userId, filters).map(toListItem);
}

export function getClientOrder(userId, orderId) {
  const order = ensureOrdersArray().find((o) => o.id === orderId);
  if (!order || order.userId !== userId) {
    return { ok: false, message: TRACKING_MSG.orderNotFound };
  }
  return { ok: true, order: toDetail(order) };
}

export function searchOrderByTracking(userId, trackingNumber) {
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

export function refreshOrdersForUser(userId, { connected = true } = {}) {
  if (!connected) {
    return { ok: false, message: TRACKING_MSG.unableRefresh, orders: null, refreshedAt: null };
  }
  const orders = listClientOrders(userId);
  return { ok: true, orders, refreshedAt: stamp() };
}

export function refreshClientOrder(userId, orderId, { connected = true } = {}) {
  if (!connected) {
    return { ok: false, message: TRACKING_MSG.unableRefresh, order: null, refreshedAt: null };
  }
  const result = getClientOrder(userId, orderId);
  if (!result.ok) {
    return { ok: false, message: result.message, order: null, refreshedAt: null };
  }
  return { ok: true, order: result.order, refreshedAt: stamp() };
}

function pushNotification(userId, payload) {
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

export function recordStatusChange(order, newStatus, at) {
  const when = at || stamp();
  const previous = order.status;
  if (previous === newStatus) return { changed: false, order };
  if (newStatus !== ORDER_STATUS.CANCELLED) {
    const allowed = getStatusesForFulfillment(order.fulfillment?.type || 'delivery');
    const previousIndex = allowed.indexOf(previous);
    const nextIndex = allowed.indexOf(newStatus);
    if (previousIndex < 0 || nextIndex !== previousIndex + 1) {
      return { changed: false, order, message: 'Status transition is not allowed.' };
    }
  }
  order.status = newStatus;
  order.lastUpdatedAt = when;
  backfillHistory(order);
  order.statusHistory.push({ status: newStatus, at: when });
  pushNotification(order.userId, {
    type: 'status',
    orderId: order.id,
    trackingNumber: order.trackingNumber,
    message: TRACKING_MSG.statusUpdate(order.trackingNumber, newStatus),
    status: newStatus,
  });
  return { changed: true, order };
}

export function cancelClientOrder(orderId, { at } = {}) {
  const order = ensureOrdersArray().find((o) => o.id === orderId);
  if (!order) return { ok: false, message: TRACKING_MSG.orderNotFound };
  const when = at || stamp();
  recordStatusChange(order, ORDER_STATUS.CANCELLED, when);
  return { ok: true, order };
}

/** Kitchen or test hook to advance an order status. */
export function advanceOrderStatus(orderId, newStatus, { at } = {}) {
  const order = ensureOrdersArray().find((o) => o.id === orderId);
  if (!order) return { ok: false, message: TRACKING_MSG.orderNotFound };
  recordStatusChange(order, newStatus, at);
  return { ok: true, order };
}

function announcementRead(announcement, userId) {
  if (!announcement.readBy) announcement.readBy = {};
  return !!announcement.readBy[userId];
}

export function getAlertsForUser(userId) {
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

export function markAlertRead(userId, kind, id) {
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

export function __testPushAnnouncement(message, { at } = {}) {
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
