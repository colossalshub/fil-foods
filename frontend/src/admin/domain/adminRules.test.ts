import assert from 'node:assert/strict';
import test from 'node:test';
import { COPY, DEMO_PASSWORD, panelTitle } from '../copy.js';
import {
  addStaff,
  adminView,
  assignDelivery,
  deleteMenu,
  deleteStaff,
  expireReset,
  getAdminDb,
  isAuditIntact,
  loginAdmin,
  loginWithGoogle,
  noticesFor,
  requestPasswordReset,
  resetAdminDb,
  resetPassword,
  saveMenu,
  savePreferences,
  saveRoleNotifications,
  searchStaffOrders,
  setAdminOnline,
  setMenuAvailability,
  setOrderStatus,
} from '../data/store.js';
import { peso } from './format.js';
import { levenshtein, searchOrders } from './search.js';

const adminActor = {
  id: 'staff-admin',
  name: 'Admin Account',
  email: 'admin@filfoods.ph',
  role: 'admin' as const,
};

test.beforeEach(() => {
  resetAdminDb();
});

test('money format and dietitian panel title', () => {
  assert.equal(peso(8750), '₱8,750.00');
  assert.equal(peso(4999), '₱4,999.00');
  assert.equal(peso(27899), '₱27,899.00');
  assert.equal(peso(327999), '₱327,999.00');
  assert.equal(peso(120), '₱120.00');
  assert.equal(panelTitle('dietitian'), 'Dietitian Panel');
  assert.equal(panelTitle('admin'), 'Admin Panel');
  assert.equal(adminView().menu.length, 24);
  assert.equal(adminView().metrics.totalOrders, 124);
});

test('order search follows the admin examples', () => {
  assert.equal(levenshtein('mria', 'maria'), 1);
  assert.equal(levenshtein('carols', 'carlos'), 2);
  assert.equal(levenshtein('villanueba', 'villanueva'), 1);
  assert.equal(levenshtein('jon', 'juan'), 2);

  const names = (query: string, status: 'All' | 'Pending' | 'Preparing' | 'Delivered' | 'Cancelled' = 'All') => (
    searchStaffOrders(query, status).map((order) => order.customerName)
  );
  assert.deepEqual(names('Mria'), ['Maria Santos']);
  assert.deepEqual(names('carols'), ['Carlos Reyes']);
  assert.deepEqual(names('Villanueba'), ['Mark Villanueva']);
  assert.deepEqual(names('Garcia Ana'), ['Ana Garcia']);
  assert.deepEqual(names('Mar'), ['Maria Santos', 'Mark Villanueva']);
  assert.deepEqual(names('00359'), []);
  assert.deepEqual(names('Jon'), []);
  assert.deepEqual(names('  MaRia   '), ['Maria Santos']);
  assert.deepEqual(names('maria', 'Preparing'), ['Maria Santos']);
  assert.deepEqual(names('maria', 'Delivered'), []);
  assert.deepEqual(names('350'), ['Juan Dela Cruz']);
  assert.deepEqual(names('00351'), []);

  const accented = searchOrders([
    { id: '1', customerName: 'José Núñez', status: 'Pending', placedAt: '2026-10-29T00:00:00.000Z' },
  ], 'Jose Nunez', 'All');
  assert.equal(accented.length, 1);
  assert.equal(searchOrders([
    { id: '1', customerName: 'José Núñez', status: 'Pending', placedAt: '2026-10-29T00:00:00.000Z' },
  ], 'Nunes', 'All').length, 1);
});

test('login rules, salted hashes, and google sign-in', () => {
  const dumped = JSON.stringify(getAdminDb());
  assert.equal(dumped.includes(DEMO_PASSWORD), false);
  assert.equal(dumped.includes('"password":'), false);
  assert.ok(getAdminDb().staff.every((person) => !person.passwordHash || person.passwordHash.startsWith('$2')));

  assert.equal(loginAdmin('', '').message, COPY.blank);
  assert.equal(loginAdmin('adminfilfoods.ph', DEMO_PASSWORD).message, COPY.invalidEmail);
  assert.equal(loginAdmin('admin@filfoods.ph', 'nope').message, COPY.wrongPassword);

  setAdminOnline(false);
  assert.equal(loginAdmin('admin@filfoods.ph', DEMO_PASSWORD).message, COPY.offline);
  setAdminOnline(true);

  const signedIn = loginAdmin('admin@filfoods.ph', DEMO_PASSWORD);
  assert.equal(signedIn.ok, true);

  const before = getAdminDb().staff.length;
  const denied = loginWithGoogle('guest.user@gmail.com', 'admin');
  assert.equal(denied.ok, false);
  assert.equal(denied.created, false);
  assert.equal(denied.title, COPY.notAuthorized);
  assert.equal(denied.detail, COPY.noSession);
  assert.equal(getAdminDb().staff.length, before);

  const allowed = loginWithGoogle('admin@filfoods.ph', 'admin');
  assert.equal(allowed.ok, true);
  assert.equal(allowed.created, false);
  const wrongPanel = loginWithGoogle('admin@filfoods.ph', 'dietitian');
  assert.equal(wrongPanel.ok, false);
  assert.equal(getAdminDb().staff.length, before);
});

test('password reset is neutral, matched, and one-time', () => {
  assert.equal(requestPasswordReset('not-an-email').message, COPY.badResetEmail);
  assert.equal(getAdminDb().resets.length, 0);
  const unknown = requestPasswordReset('nobody@filfoods.ph');
  assert.equal(unknown.ok, true);
  assert.equal(unknown.token, null);
  assert.equal(unknown.message, COPY.checkEmail);

  const issued = requestPasswordReset('admin@filfoods.ph');
  assert.ok(issued.token);
  assert.equal(resetPassword(issued.token!, 'Newpass1', 'Otherpass').message, COPY.passwordMismatch);
  expireReset(issued.token!);
  assert.equal(resetPassword(issued.token!, 'Newpass12', 'Newpass12').message, COPY.linkExpired);

  const fresh = requestPasswordReset('admin@filfoods.ph');
  assert.equal(resetPassword(fresh.token!, 'Newpass12', 'Newpass12').message, COPY.passwordUpdated);
  assert.equal(resetPassword(fresh.token!, 'Newpass12', 'Newpass12').message, COPY.linkExpired);
  assert.equal(JSON.stringify(getAdminDb()).includes('Newpass12'), false);
  assert.equal(loginAdmin('admin@filfoods.ph', DEMO_PASSWORD).ok, false);
  assert.equal(loginAdmin('admin@filfoods.ph', 'Newpass12').ok, true);
});

test('staff, menu, orders, and notifications', () => {
  assert.equal(addStaff(adminActor, { name: 'Ana Reyes', email: 'ana.reyes@filfoods.ph', role: 'delivery' }).message, COPY.duplicateEmail);
  const created = addStaff(adminActor, { name: 'Liza Gomez', email: 'liza.gomez@filfoods.ph', role: 'kitchen' });
  assert.equal(created.message, COPY.staffAdded);
  assert.equal(loginAdmin('liza.gomez@filfoods.ph', DEMO_PASSWORD).message, COPY.setPasswordFirst);
  assert.equal(deleteStaff(adminActor, adminActor.id).message, COPY.cannotDeleteSelf);
  assert.equal(deleteStaff(adminActor, 'staff-ana').message, COPY.staffDeleted);
  assert.equal(loginAdmin('ana.reyes@filfoods.ph', DEMO_PASSWORD).message, COPY.disabledAccount);
  assert.equal(adminView().staff.some((person) => person.email === 'anagarcia@gmail.com'), false);

  const orderPrice = getAdminDb().orders[0].price;
  assert.equal(saveMenu(adminActor, 'menu-10', {
    name: 'Fried Chicken',
    category: 'Lunch · Meat',
    price: '0',
    available: true,
    ingredients: 'chicken, flour, oil',
    allergens: 'Gluten',
  }).message, COPY.priceError);
  assert.equal(saveMenu(adminActor, 'menu-10', {
    name: 'Fried Chicken',
    category: 'Lunch · Meat',
    price: '130',
    available: true,
    ingredients: 'chicken, flour, oil',
    allergens: 'Gluten',
  }).ok, true);
  assert.equal(getAdminDb().orders[0].price, orderPrice);
  assert.equal(setMenuAvailability(adminActor, 'menu-10', false).message, COPY.notSelectable);
  assert.equal(getAdminDb().orders[0].lines[0].name, 'Fried Chicken');
  const removed = deleteMenu(adminActor, 'menu-24');
  assert.equal(removed.message, COPY.menuDeleted);
  assert.equal(adminView().menu.length, 23);

  assert.equal(setOrderStatus(adminActor, '00348', 'Pending').message, COPY.readOnlyOrder);
  assert.equal(assignDelivery(adminActor, '00350', 'staff-maria').message, COPY.chooseDelivery);
  assert.equal(assignDelivery(adminActor, '00350', 'staff-mark').ok, true);
  assert.equal(getAdminDb().orders[0].assigneeName, 'Mark Peralta');
  assert.equal(setOrderStatus(adminActor, '00350', 'Preparing').ok, true);
  const statusAudit = getAdminDb().auditLog.find((entry) => entry.action === 'order.status');
  assert.equal(statusAudit?.metadata.accountName, 'Admin Account');
  assert.ok(statusAudit?.at);

  const kitchenBefore = noticesFor('kitchen').length;
  assert.ok(noticesFor('kitchen').length >= kitchenBefore);
  const kitchen = { id: 'staff-juan', name: 'Chef Juan Dela Cruz', email: 'juan.delacruz@filfoods.ph', role: 'kitchen' as const };
  const settingsBefore = JSON.stringify(getAdminDb().settings);
  assert.equal(saveRoleNotifications(kitchen, 'kitchen', { newOrder: false, menuUpdated: false }).message, COPY.deniedNotifications);
  assert.equal(JSON.stringify(getAdminDb().settings), settingsBefore);

  const held = noticesFor('kitchen').length;
  assert.equal(saveRoleNotifications(adminActor, 'kitchen', { newOrder: false, menuUpdated: false }).message, COPY.notificationsSaved);
  assert.equal(getAdminDb().settings.kitchen.enabled, false);
  setOrderStatus(adminActor, '00350', 'Pending');
  assert.equal(noticesFor('kitchen').length, held);
  const logged = getAdminDb().auditLog.filter((entry) => entry.action === 'notifications.update');
  assert.ok(logged.length > 0);
  assert.ok(logged.every((entry) => entry.metadata.role && entry.metadata.setting && entry.metadata.oldValue && entry.metadata.newValue && entry.at));

  assert.equal(getAdminDb().settings.delivery.types.readyForPickup, true);
  assert.equal(getAdminDb().settings.delivery.types.menuUpdated, false);
  assert.equal(savePreferences(adminActor, { language: 'fil', appearance: 'dark' }).ok, true);
  assert.equal(savePreferences(kitchen, { language: 'en', appearance: 'light' }).ok, true);
  assert.equal(getAdminDb().staff[0].preferences.language, 'fil');
  assert.equal(getAdminDb().staff[2].preferences.appearance, 'light');
  assert.equal(isAuditIntact(), true);
  getAdminDb().auditLog[0].metadata = { changed: true };
  assert.equal(isAuditIntact(), false);
});
