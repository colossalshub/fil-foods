import assert from 'node:assert/strict';
import test from 'node:test';
import { getDb, resetStore } from '../data/mockStore.js';
import {
  TRACKING_MSG,
  ORDER_STATUS,
  __testPushAnnouncement,
  __testResetAlerts,
  advanceOrderStatus,
  cancelClientOrder,
  filterClientOrders,
  getAlertsForUser,
  getClientOrder,
  getStatusesForFulfillment,
  listClientOrders,
  markAlertRead,
  detailFromBackendOrder,
  refreshOrdersForUser,
  searchOrderByTracking,
  sortOrdersForList,
} from './trackingService.js';

const MARIA = 'user-maria';
const ANA = 'user-ana';

function seedSampleOrders() {
  const db = getDb();
  if (!Array.isArray(db.orders)) db.orders = [];
  db.orders.push(
    {
      id: 'order-seed-1',
      userId: MARIA,
      trackingNumber: 'TRK-2026-0001',
      status: ORDER_STATUS.COMPLETED,
      placedAt: '2026-10-10T10:00:00.000Z',
      lastUpdatedAt: '2026-10-10T14:00:00.000Z',
      statusHistory: [
        { status: ORDER_STATUS.CONFIRMED, at: '2026-10-10T10:00:00.000Z' },
        { status: ORDER_STATUS.COMPLETED, at: '2026-10-10T14:00:00.000Z' },
      ],
      items: [{ mealId: 'm1', name: 'Chicken Tinola', quantity: 1, unitPrice: 120, lineTotal: 120 }],
      fulfillment: {
        type: 'pickup',
        address: null,
        scheduledAt: '2026-10-11T10:00:00.000Z',
        instructions: 'Call when ready',
      },
      subtotal: 120,
      total: 120,
    },
    {
      id: 'order-seed-2',
      userId: MARIA,
      trackingNumber: 'TRK-2026-0002',
      status: ORDER_STATUS.PREPARING,
      placedAt: '2026-10-12T09:00:00.000Z',
      lastUpdatedAt: '2026-10-12T09:30:00.000Z',
      statusHistory: [
        { status: ORDER_STATUS.CONFIRMED, at: '2026-10-12T09:00:00.000Z' },
        { status: ORDER_STATUS.PREPARING, at: '2026-10-12T09:30:00.000Z' },
      ],
      items: [{ mealId: 'm2', name: 'Beef Caldereta', quantity: 2, unitPrice: 150, lineTotal: 300 }],
      fulfillment: {
        type: 'delivery',
        address: '12 Mabini St., Quezon City',
        scheduledAt: '2026-10-13T11:00:00.000Z',
        instructions: 'Leave at gate',
      },
      subtotal: 300,
      total: 300,
    },
    {
      id: 'order-seed-ana',
      userId: ANA,
      trackingNumber: 'TRK-2026-0099',
      status: ORDER_STATUS.CONFIRMED,
      placedAt: '2026-10-12T08:00:00.000Z',
      lastUpdatedAt: '2026-10-12T08:00:00.000Z',
      statusHistory: [{ status: ORDER_STATUS.CONFIRMED, at: '2026-10-12T08:00:00.000Z' }],
      items: [{ mealId: 'm3', name: 'Pancit', quantity: 1, unitPrice: 90, lineTotal: 90 }],
      fulfillment: { type: 'delivery', address: 'Ana address', scheduledAt: '2026-10-14T10:00:00.000Z', instructions: null },
      subtotal: 90,
      total: 90,
    },
  );
}

test('sortOrdersForList puts ongoing orders before completed, newest first within group', () => {
  resetStore();
  seedSampleOrders();
  const sorted = sortOrdersForList(getDb().orders.filter((o) => o.userId === MARIA));
  assert.equal(sorted[0].trackingNumber, 'TRK-2026-0002');
  assert.equal(sorted[1].trackingNumber, 'TRK-2026-0001');
});

test('listClientOrders supports status and date filters', () => {
  resetStore();
  seedSampleOrders();
  const preparing = listClientOrders(MARIA, { status: ORDER_STATUS.PREPARING });
  assert.equal(preparing.length, 1);
  assert.equal(preparing[0].trackingNumber, 'TRK-2026-0002');

  const oct10 = filterClientOrders(MARIA, { dateFrom: '2026-10-10', dateTo: '2026-10-10' });
  assert.equal(oct10.length, 1);
  assert.equal(oct10[0].trackingNumber, 'TRK-2026-0001');

  const empty = listClientOrders(MARIA, { dateFrom: '2026-01-01', dateTo: '2026-01-02' });
  assert.equal(empty.length, 0);
});

test('empty order list uses the no-orders sentence in service layer', () => {
  resetStore();
  assert.equal(listClientOrders(MARIA).length, 0);
  assert.equal(TRACKING_MSG.noOrders, 'You have no orders yet.');
});

test('getClientOrder and search return Order not found for missing or other client', () => {
  resetStore();
  seedSampleOrders();
  assert.equal(getClientOrder(MARIA, 'missing').message, TRACKING_MSG.orderNotFound);
  assert.equal(searchOrderByTracking(MARIA, 'TRK-2026-0099').message, TRACKING_MSG.orderNotFound);
  assert.equal(searchOrderByTracking(MARIA, 'TRK-2026-0002').ok, true);
});

test('pickup and delivery status lists omit the opposite fulfillment steps', () => {
  const pickup = getStatusesForFulfillment('pickup');
  assert.ok(pickup.includes(ORDER_STATUS.READY_PICKUP));
  assert.ok(!pickup.includes(ORDER_STATUS.READY_DELIVERY));
  assert.ok(!pickup.includes(ORDER_STATUS.OUT_FOR_DELIVERY));

  const delivery = getStatusesForFulfillment('delivery');
  assert.ok(delivery.includes(ORDER_STATUS.READY_DELIVERY));
  assert.ok(delivery.includes(ORDER_STATUS.OUT_FOR_DELIVERY));
  assert.ok(!delivery.includes(ORDER_STATUS.READY_PICKUP));
});

test('status change writes notification with exact update sentence', () => {
  resetStore();
  __testResetAlerts();
  seedSampleOrders();
  advanceOrderStatus('order-seed-2', ORDER_STATUS.READY_DELIVERY, { at: '2026-10-12T09:45:00.000Z' });
  advanceOrderStatus('order-seed-2', ORDER_STATUS.OUT_FOR_DELIVERY, { at: '2026-10-12T10:00:00.000Z' });
  const alerts = getAlertsForUser(MARIA);
  assert.ok(alerts.some((a) => a.message === 'Order TRK-2026-0002 is now Out for Delivery.'));
});

test('markAlertRead keeps notification in list and marks it read', () => {
  resetStore();
  __testResetAlerts();
  seedSampleOrders();
  advanceOrderStatus('order-seed-2', ORDER_STATUS.READY_DELIVERY, { at: '2026-10-12T09:45:00.000Z' });
  const before = getAlertsForUser(MARIA);
  const target = before.find((a) => a.kind === 'notification');
  assert.ok(target);
  assert.equal(target.read, false);
  markAlertRead(MARIA, 'notification', target.id);
  const after = getAlertsForUser(MARIA);
  assert.equal(after.length, before.length);
  const updated = after.find((a) => a.id === target.id);
  assert.equal(updated.read, true);
});

test('announcements appear in alerts feed and cancellation creates a notification', () => {
  resetStore();
  __testResetAlerts();
  seedSampleOrders();
  __testPushAnnouncement('Kitchen closed on Oct 31', { at: '2026-10-20T08:00:00.000Z' });
  cancelClientOrder('order-seed-2', { at: '2026-10-12T11:00:00.000Z' });
  const alerts = getAlertsForUser(MARIA);
  assert.ok(alerts.some((a) => a.message === 'Kitchen closed on Oct 31'));
  assert.ok(alerts.some((a) => a.message === 'Order TRK-2026-0002 is now Cancelled.'));
});

test('refreshOrdersForUser reports connection failure without requiring network', () => {
  resetStore();
  seedSampleOrders();
  const offline = refreshOrdersForUser(MARIA, { connected: false });
  assert.equal(offline.ok, false);
  assert.equal(offline.message, 'Unable to refresh. Please check your connection.');
  const online = refreshOrdersForUser(MARIA, { connected: true });
  assert.equal(online.ok, true);
  assert.equal(online.orders.length, 2);
});

test('a backend order opens with meals and a status timeline', () => {
  const detail = detailFromBackendOrder({
    id: 'order-1',
    client_id: 'user-1',
    tracking_number: 'TRK-2026-0007',
    status: 'preparing',
    created_at: '2026-10-30T01:00:00.000Z',
    updated_at: '2026-10-30T02:00:00.000Z',
    total: 180,
    delivery_fee: 0,
    fulfillment_type: 'delivery',
    address: '12 Mabini St., Quezon City',
    schedule: '2026-10-31T01:00:00.000Z',
    special_instructions: null,
    order_items: [{
      meal_id: 'meal-1',
      meals: { name: 'Chicken Adobo' },
      quantity: 1,
      unit_price: 180,
      line_total: 180,
    }],
    order_status_history: [{ status: 'confirmed', changed_at: '2026-10-30T01:00:00.000Z' }],
  });
  assert.equal(detail.status, 'Preparing');
  assert.equal(detail.items[0].name, 'Chicken Adobo');
  assert.ok(detail.statusTimeline.length > 0);
  assert.ok(detail.statusHistory.length > 0);
  assert.equal(detail.fulfillment.typeLabel, 'Delivery');
});
