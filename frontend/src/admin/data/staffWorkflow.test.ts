import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addStaffAsync,
  customerFor,
  decideRemovalAsync,
  deleteMenuAsync,
  getAdminDb,
  noticesFor,
  orderFor,
  ordersFor,
  removalRequest,
  removalRequests,
  resetAdminDb,
  reviewOrderAsync,
  saveMenuAsync,
  setMenuAvailabilityAsync,
  searchRoleOrders,
  setOrderStatusAsync,
  assignDeliveryAsync,
} from './store.js';

const admin = { id: 'staff-admin', name: 'Admin Account', email: 'admin@filfoods.ph', role: 'admin' as const };
const dietitian = { id: 'staff-maria', name: 'Dr. Maria Santos', email: 'maria.santos@filfoods.ph', role: 'dietitian' as const };
const kitchen = { id: 'staff-juan', name: 'Chef Juan Dela Cruz', email: 'juan.delacruz@filfoods.ph', role: 'kitchen' as const };
const ana = { id: 'staff-ana', name: 'Ana Reyes', email: 'ana.reyes@filfoods.ph', role: 'delivery' as const };
const mark = { id: 'staff-mark', name: 'Mark Peralta', email: 'mark.peralta@filfoods.ph', role: 'delivery' as const };

test.beforeEach(() => resetAdminDb());

test('full lifecycle: dietitian → payment → kitchen → admin assign → delivery', async () => {
  // Dietitian review (DIT-15).
  assert.equal((await reviewOrderAsync(dietitian, '00350', false, '  ')).message, 'Please enter a reason for returning this order.');
  assert.equal((await reviewOrderAsync(kitchen, '00350', true, '')).ok, false);
  assert.equal((await reviewOrderAsync(dietitian, '00350', true, '')).ok, true);
  assert.equal(orderFor(admin, '00350')?.status, 'Awaiting Payment');
  assert.equal((await reviewOrderAsync(dietitian, '00350', true, '')).message, 'This order has already been reviewed.');
  assert.equal(orderFor(kitchen, '00350'), null);

  // Payment arrives (user module) → kitchen sees it and is notified.
  const kitchenNotices = noticesFor('kitchen').length;
  assert.equal((await setOrderStatusAsync(admin, '00350', 'Paid')).ok, true);
  assert.equal(noticesFor('kitchen').length, kitchenNotices + 1);
  assert.equal(orderFor(kitchen, '00350')?.customerName, 'Juan');
  assert.equal(orderFor(kitchen, '00350')?.price, 0);

  // Kitchen may not skip or cancel (KIT-13).
  assert.equal((await setOrderStatusAsync(kitchen, '00350', 'Cancelled')).ok, false);
  assert.equal((await setOrderStatusAsync(kitchen, '00350', 'Ready for Delivery')).ok, false);
  assert.equal((await setOrderStatusAsync(kitchen, '00350', 'Preparing')).ok, true);

  // Admin assigns Mark; Ana can't see it.
  assert.equal((await assignDeliveryAsync(admin, '00350', 'staff-mark')).ok, true);
  assert.equal(orderFor(ana, '00350'), null);
  // DEL-11 AC 2 (revised): not in Mark's queue until it is Ready for Pickup.
  assert.equal(orderFor(mark, '00350'), null);
  assert.equal((await setOrderStatusAsync(mark, '00350', 'Out for Delivery')).ok, false);
  const markNotices = noticesFor('delivery', 'staff-mark').length;
  assert.equal((await setOrderStatusAsync(kitchen, '00350', 'Ready for Delivery')).ok, true);
  assert.equal(noticesFor('delivery', 'staff-mark').length, markNotices + 1);
  assert.equal(orderFor(mark, '00350')?.status, 'Ready for Delivery');
  assert.equal(noticesFor('delivery', 'staff-ana').some((n) => n.orderId === '00350'), false);

  // Delivery (DEL-17).
  assert.equal((await setOrderStatusAsync(ana, '00350', 'Out for Delivery')).message, 'This order is not assigned to you.');
  assert.equal((await setOrderStatusAsync(mark, '00350', 'Out for Delivery')).ok, true);
  assert.equal((await setOrderStatusAsync(mark, '00350', 'Completed')).ok, true);
  assert.equal((await setOrderStatusAsync(mark, '00350', 'Cancelled')).ok, false);
  assert.equal(getAdminDb().orders.find((o) => o.id === '00350')?.status, 'Completed');
  assert.ok(getAdminDb().auditLog.some((e) => e.action === 'order.review'));
});

test('returned order is Returned for Changes with the reason', async () => {
  const result = await reviewOrderAsync(dietitian, '00350', false, 'Contains shellfish; choose another meal.');
  assert.equal(result.ok, true);
  const row = orderFor(admin, '00350');
  assert.equal(row?.status, 'Returned for Changes');
  assert.equal(row?.reviewDecision, 'returned');
  assert.equal(row?.reviewReason, 'Contains shellfish; choose another meal.');
  assert.equal(orderFor(kitchen, '00350'), null);
});

test('pickup orders: kitchen completes, never assigned', async () => {
  assert.equal(orderFor(ana, '00355'), null);
  assert.equal((await assignDeliveryAsync(admin, '00355', 'staff-ana')).ok, false);
  assert.equal((await setOrderStatusAsync(kitchen, '00355', 'Ready for Pickup')).ok, true);
  assert.equal((await setOrderStatusAsync(kitchen, '00355', 'Completed')).ok, true);
});

test('role lists and search', () => {
  assert.deepEqual(ordersFor(ana).map((o) => o.id).sort(), ['00353', '00354']);
  assert.ok(ordersFor(kitchen).every((o) => o.price === 0));
  assert.equal(ordersFor(kitchen).some((o) => o.status === 'For Dietitian Review'), false);
  assert.deepEqual(searchRoleOrders(kitchen, 'rosa', 'All').map((o) => o.id), ['00352']);
  assert.deepEqual(searchRoleOrders(kitchen, 'lim', 'All'), []);
  assert.deepEqual(searchRoleOrders(kitchen, '00352', 'All').map((o) => o.id), ['00352']);
  assert.deepEqual(searchRoleOrders(kitchen, 'ORD-2026-0352', 'All').map((o) => o.id), ['00352']);
  assert.deepEqual(searchRoleOrders(kitchen, '0352', 'All').map((o) => o.id), ['00352']);
  assert.deepEqual(searchRoleOrders(ana, 'ben', 'Preparing').map((o) => o.id), ['00354']);
  assert.equal(customerFor(kitchen, 'customer-juan'), null);
  const rosa = customerFor(kitchen, 'customer-rosa');
  assert.equal(rosa?.name, 'Rosa');
  assert.deepEqual(rosa?.history, []);
  assert.ok((customerFor(dietitian, 'customer-ana')?.history.length ?? 0) >= 2);
});

test('removal requests: dietitian only, reason on reject', async () => {
  assert.deepEqual(removalRequests('pending').map((r) => r.id), ['rr-1', 'rr-2']);
  assert.equal((await decideRemovalAsync(admin, 'rr-1', true, '')).ok, false);
  assert.equal((await decideRemovalAsync(dietitian, 'rr-2', false, '')).message, 'Please enter a reason for rejecting this request.');
  assert.equal((await decideRemovalAsync(dietitian, 'rr-1', true, '')).ok, true);
  assert.equal((await decideRemovalAsync(dietitian, 'rr-1', true, '')).message, 'This request has already been decided.');
  assert.equal(customerFor(dietitian, 'customer-ana')?.dietary?.conditions.includes('Hypertension'), false);
  assert.equal(removalRequest('rr-1')?.status, 'approved');
  assert.equal((await decideRemovalAsync(dietitian, 'rr-2', false, 'Still listed on your last lab results.')).ok, true);
  assert.equal(removalRequests('pending').length, 0);
});

test('menu: admin owns details, kitchen sets availability only, delivery has no access', async () => {
  const draft = { name: 'Lugaw', category: 'Breakfast · Breads', price: '45', available: true, ingredients: 'rice, ginger', allergens: '' };
  assert.equal((await saveMenuAsync(dietitian, null, draft)).ok, false);
  assert.equal((await saveMenuAsync(kitchen, null, draft)).ok, false);
  assert.equal((await saveMenuAsync(ana, null, draft)).ok, false);
  assert.equal((await deleteMenuAsync(ana, 'menu-24')).ok, false);
  assert.equal((await deleteMenuAsync(kitchen, 'menu-24')).ok, false);
  assert.equal((await setMenuAvailabilityAsync(ana, 'menu-10', false)).ok, false);
  assert.equal((await saveMenuAsync(admin, null, draft)).ok, true);
  assert.ok(noticesFor('kitchen').some((n) => n.title.includes('Lugaw')));
  const adminNotices = noticesFor('admin').length;
  const toggled = await setMenuAvailabilityAsync(kitchen, 'menu-10', false);
  assert.equal(toggled.ok, true);
  assert.equal(toggled.message, 'Menu item updated. Your permitted availability change was saved.');
  assert.equal(noticesFor('admin').length, adminNotices + 1);
  assert.equal((await deleteMenuAsync(admin, 'menu-24')).ok, true);
  assert.equal((await addStaffAsync(kitchen, { name: 'X', email: 'x@filfoods.ph', role: 'kitchen' })).ok, false);
});
