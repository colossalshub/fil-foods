import assert from 'node:assert/strict';
import test from 'node:test';
import type { AdminOrder } from '../types';
import {
  TABS,
  actionsFor,
  can,
  canSeeOrder,
  detailStatusLabel,
  displayOrderNo,
  isValidTransition,
  listBadgeLabel,
  nextStatus,
  nutritionTiles,
  roleMayTransition,
  shapeOrderForRole,
  staffBucket,
} from './roleAccess.js';

function order(partial: Partial<AdminOrder>): AdminOrder {
  return {
    id: 'o1',
    orderNo: 7,
    customerName: 'Ana Garcia',
    firstName: 'Ana',
    accountHolderName: 'Pedro Garcia',
    customerEmail: 'ana@example.com',
    status: 'Paid',
    fulfillment: 'delivery',
    price: 250,
    placedAt: '2026-10-30T10:00:00+08:00',
    when: '',
    photo: 'wrap',
    lines: [{ name: 'Adobo', price: 250 }],
    items: [{ name: 'Adobo', quantity: 1, unitPrice: 250 }],
    delivery: { firstName: 'Ana', contactNumber: '0917', address: 'QC', notes: null },
    specialInstructions: 'No onions',
    assigneeId: 'd1',
    assigneeName: 'Ana Reyes',
    updates: [],
    wasPaid: true,
    ...partial,
  };
}

test('tabs: Staff is Admin-only', () => {
  assert.ok(TABS.admin.includes('Staff'));
  for (const role of ['dietitian', 'kitchen'] as const) {
    assert.deepEqual(TABS[role], ['Dashboard', 'Orders', 'Menu', 'Settings']);
  }
  assert.deepEqual(TABS.delivery, ['Dashboard', 'Orders', 'Settings']);
  assert.equal(can('admin', 'menuManage'), true);
  assert.equal(can('dietitian', 'menuManage'), false);
  assert.equal(can('kitchen', 'menuManage'), false);
  assert.equal(can('kitchen', 'menuAvailability'), true);
  assert.equal(can('delivery', 'menuManage'), false);
  assert.equal(can('delivery', 'menuAvailability'), false);
  assert.equal(can('admin', 'removalRequests'), false);
  assert.equal(can('dietitian', 'removalRequests'), true);
  assert.equal(can('kitchen', 'sales'), false);
});

test('visibility follows staff_can_see_order', () => {
  assert.equal(canSeeOrder('kitchen', 'k', order({ status: 'For Dietitian Review' })), false);
  assert.equal(canSeeOrder('kitchen', 'k', order({ status: 'Awaiting Payment' })), false);
  assert.equal(canSeeOrder('kitchen', 'k', order({ status: 'Paid' })), true);
  assert.equal(canSeeOrder('kitchen', 'k', order({ status: 'Cancelled', wasPaid: false })), false);
  assert.equal(canSeeOrder('kitchen', 'k', order({ status: 'Cancelled', wasPaid: true })), true);
  assert.equal(canSeeOrder('delivery', 'd1', order({})), true);
  assert.equal(canSeeOrder('delivery', 'd2', order({})), false);
  assert.equal(canSeeOrder('delivery', 'd1', order({ fulfillment: 'pick_up' })), false);
  assert.equal(canSeeOrder('dietitian', 'x', order({ status: 'For Dietitian Review' })), true);
});

test('shaping hides names, prices and address by role', () => {
  const kitchen = shapeOrderForRole('kitchen', order({}));
  assert.equal(kitchen.customerName, 'Ana');
  assert.equal(kitchen.accountHolderName, null);
  assert.equal(kitchen.price, 0);
  assert.equal(kitchen.items?.[0].unitPrice, null);
  assert.equal(kitchen.delivery, null);
  assert.equal(kitchen.specialInstructions, null);
  const delivery = shapeOrderForRole('delivery', order({}));
  assert.equal(delivery.customerName, 'Ana');
  assert.equal(delivery.delivery?.address, 'QC');
  assert.equal(delivery.specialInstructions, 'No onions');
  const dietitian = shapeOrderForRole('dietitian', order({}));
  assert.equal(dietitian.customerName, 'Ana Garcia');
  assert.equal(dietitian.price, 250);
  assert.equal(dietitian.delivery, null);
  assert.equal(shapeOrderForRole('admin', order({})).delivery?.address, 'QC');
});

test('status buckets and wording', () => {
  assert.equal(staffBucket('Awaiting Payment'), 'Pending');
  assert.equal(staffBucket('Paid'), 'Pending');
  assert.equal(staffBucket('Out for Delivery'), 'Preparing');
  assert.equal(staffBucket('Completed'), 'Delivered');
  assert.equal(staffBucket('Cancelled'), 'Cancelled');
  assert.equal(listBadgeLabel('delivery', 'Ready for Delivery'), 'Ready for Pickup');
  assert.equal(listBadgeLabel('kitchen', 'Ready for Delivery'), 'Preparing');
  assert.equal(detailStatusLabel('kitchen', 'Paid'), 'Pending');
  assert.equal(detailStatusLabel('delivery', 'Ready for Delivery'), 'Ready for Pickup');
  assert.equal(detailStatusLabel('admin', 'Ready for Delivery'), 'Ready for Delivery');
  assert.equal(displayOrderNo({ id: 'x', orderNo: 42 }), '#00042');
  assert.equal(displayOrderNo({ id: '00350' }), '#00350');
});

test('transitions: one step or cancel, per role', () => {
  assert.equal(nextStatus(order({ status: 'Preparing' })), 'Ready for Delivery');
  assert.equal(nextStatus(order({ status: 'Preparing', fulfillment: 'pick_up' })), 'Ready for Pickup');
  assert.equal(nextStatus(order({ status: 'Completed' })), null);
  assert.equal(isValidTransition(order({ status: 'Paid' }), 'Completed'), false);
  assert.equal(isValidTransition(order({ status: 'Paid' }), 'Cancelled'), true);
  assert.equal(isValidTransition(order({ status: 'Completed' }), 'Cancelled'), false);

  assert.deepEqual(actionsFor('kitchen', 'k', order({ status: 'Paid' })).map((a) => a.target), ['Preparing']);
  assert.deepEqual(actionsFor('kitchen', 'k', order({ status: 'Preparing' })).map((a) => a.label), ['Mark Ready for Pickup']);
  assert.deepEqual(actionsFor('kitchen', 'k', order({ status: 'Preparing', fulfillment: 'pick_up' })).map((a) => a.target), ['Ready for Pickup']);
  assert.deepEqual(actionsFor('kitchen', 'k', order({ status: 'Ready for Delivery' })), []);
  assert.deepEqual(actionsFor('delivery', 'd1', order({ status: 'Ready for Delivery' })).map((a) => a.target), ['Out for Delivery']);
  assert.deepEqual(actionsFor('delivery', 'd2', order({ status: 'Ready for Delivery' })), []);
  assert.deepEqual(actionsFor('delivery', 'd1', order({ status: 'Out for Delivery' })).map((a) => a.label), ['Mark Completed']);
  assert.deepEqual(actionsFor('dietitian', 'x', order({ status: 'For Dietitian Review' })), []);
  assert.equal(roleMayTransition('kitchen', 'k', order({ status: 'Paid' }), 'Cancelled'), false);
  assert.equal(roleMayTransition('admin', 'a', order({ status: 'Paid' }), 'Cancelled'), true);
  assert.equal(roleMayTransition('delivery', 'd1', order({ status: 'Preparing' }), 'Ready for Delivery'), false);
});

test('nutrition tiles: goals map to levels; nothing saved reads Not supplied', () => {
  const none = nutritionTiles(null);
  assert.deepEqual(none.map((tile) => tile.level), ['Not supplied', 'Not supplied', 'Not supplied', 'Not supplied']);
  const tiles = nutritionTiles({
    allergies: [],
    conditions: [],
    restrictions: [],
    nutrition: { supplied: true, lowerCalories: false, higherProtein: true, lowerSodium: true, lowerSugar: false },
  });
  assert.deepEqual(tiles.map((tile) => `${tile.label}:${tile.level}`), ['Sugar:No preference', 'Calories:No preference', 'Sodium:Low', 'Protein:High']);
  assert.equal(tiles[2].range, '≤ 400 mg');
});

test('each role lands on its own home after sign-in (DIT-05, KIT-10, DEL-10)', async () => {
  const { homeRouteFor } = await import('../nav.js');
  assert.equal(homeRouteFor('admin'), 'AdminApp');
  assert.equal(homeRouteFor('dietitian'), 'RoleApp');
  assert.equal(homeRouteFor('kitchen'), 'RoleApp');
  assert.equal(homeRouteFor('delivery'), 'RoleApp');
});
