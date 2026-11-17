import assert from 'node:assert/strict';
import test from 'node:test';
import { backendMessage, mapAuditRow, mapCustomer, mapRemovalRequest, mapStaffOrder, staffRoleFromDb } from './staffBackend.js';

test('maps role-shaped staff_orders rows', () => {
  const kitchen = mapStaffOrder({
    id: 'a1', order_no: 12, status: 'paid', fulfillment_type: 'delivery', created_at: '2026-10-30T02:00:00Z',
    client_id: 'c1', first_name: 'Ana', items: [{ name: 'Salmon Teriyaki', quantity: 2, meal_key: 'salmon' }],
    assigned_delivery_id: null, assignee_name: null,
  });
  assert.equal(kitchen.status, 'Paid');
  assert.equal(kitchen.customerName, 'Ana');
  assert.equal(kitchen.price, 0);
  assert.equal(kitchen.items?.[0].unitPrice, null);
  assert.equal(kitchen.photo, 'salmon');
  assert.equal(kitchen.orderNo, 12);
  const admin = mapStaffOrder({
    id: 'a2', order_no: 13, status: 'ready_for_delivery', fulfillment_type: 'pick_up', first_name: 'Ben',
    customer_name: 'Ben Torres', account_holder_name: 'Lilia Torres', total: 320, items: [{ name: 'Pinakbet', quantity: 1, unit_price: 320 }],
    dietary: { allergies: [{ value: 'Eggs', note: 'Hives' }], conditions: ['Gout'], restrictions: [], nutrition: { supplied: true, lower_sodium: true } },
    delivery: { first_name: 'Ben', contact_number: '0917', address: 'Makati', notes: null },
    history: [{ status: 'paid', changed_at: '2026-10-30T02:00:00Z', changed_by: 'Admin Account' }],
  });
  assert.equal(admin.status, 'Ready for Delivery');
  assert.equal(admin.fulfillment, 'pick_up');
  assert.equal(admin.price, 320);
  assert.equal(admin.dietary?.allergies[0].note, 'Hives');
  assert.equal(admin.dietary?.nutrition.lowerSodium, true);
  assert.equal(admin.delivery?.address, 'Makati');
  assert.equal(admin.updates[0].summary, 'Paid');
});

test('maps customers, removal requests, audit rows and errors', () => {
  const customer = mapCustomer({ id: 'c1', name: 'Ana Garcia', email: 'a@x.ph', history: [{ id: 'o', status: 'completed', total: 99, items: ['Adobo'], created_at: '2026-10-30T02:00:00Z' }] });
  assert.equal(customer.firstName, 'Ana');
  assert.equal(customer.history[0].status, 'Completed');
  assert.equal(customer.history[0].name, 'Adobo');
  const request = mapRemovalRequest({ id: 'r', client_id: 'c1', recipient_name: 'Ana Garcia', condition: 'Gout', status: 'pending', requested_at: 'x', requested_by: 'Ana Garcia' });
  assert.equal(request.status, 'pending');
  assert.equal(request.reason, null);
  const audit = mapAuditRow({ id: 5, occurred_at: 't', event_type: 'menu.update', details: { name: 'Adobo' }, actor_name: 'Juan', actor_email: 'j@f.ph', actor_role: 'kitchen_staff' });
  assert.equal(audit.summary, 'Menu item updated');
  assert.equal(audit.target, 'Adobo');
  assert.equal(backendMessage({ message: 'not_authorized' }), 'You do not have access to this page.');
  assert.equal(backendMessage({ message: 'reason_required' }, 'removal'), 'Please enter a reason for rejecting this request.');
  assert.equal(backendMessage({ message: 'TypeError: Failed to fetch' }), 'Could not connect');
  assert.equal(staffRoleFromDb('kitchen_staff'), 'kitchen');
  assert.equal(staffRoleFromDb('client'), null);
});
