import type { AppDatabase, AuditEvent } from '../../types';
import { appendAuditEvent, comparePasswordSync, hashPasswordSync, verifyAuditChain } from '../../services/securityService.js';
import { COPY, DEMO_PASSWORD } from '../copy.js';
import { formatWhen, isValidEmail, parsePrice, peso, splitList } from '../domain/format.js';
import { searchOrders } from '../domain/search.js';
import type {
  Actor,
  AdminOrder,
  AuditRow,
  Customer,
  DashboardMetrics,
  FieldChange,
  MenuDraft,
  MenuItem,
  OrderStatus,
  PlanOffer,
  Preferences,
  RoleNotificationSetting,
  StaffNotice,
  StaffPublic,
  StaffRole,
} from '../types';

interface StaffRecord {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  passwordHash: string | null;
  googleSub: string | null;
  disabled: boolean;
  deleted: boolean;
  mustSetPassword: boolean;
  sessionVersion: number;
  preferences: Preferences;
}

interface ResetLink {
  token: string;
  email: string;
  expiresAt: number;
  used: boolean;
}

interface AdminDb {
  staff: StaffRecord[];
  orders: AdminOrder[];
  menu: MenuItem[];
  customers: Customer[];
  notices: StaffNotice[];
  settings: { kitchen: RoleNotificationSetting; delivery: RoleNotificationSetting };
  metrics: DashboardMetrics;
  auditLog: AuditEvent[];
  resets: ResetLink[];
  pendingSetup: { name: string; email: string; token: string } | null;
  support: { id: string; from: string; message: string; at: string }[];
}

export const CATEGORIES = [
  'Breakfast · Pastries',
  'Breakfast · Breads',
  'Lunch · Meat',
  'Lunch · Vegetable',
  'Dinner · Meat',
  'Dinner · Vegetable',
];

export const PLANS: PlanOffer[] = [
  { id: 'standard', name: 'Standard meal', price: 300 },
  { id: 'weekly', name: 'Weekly', price: 4999 },
  { id: 'monthly', name: 'Monthly', price: 27899 },
  { id: 'yearly', name: 'Yearly', price: 327999 },
];

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DEFAULT_PREFS: Preferences = { language: 'en', appearance: 'light' };
const STATUSES: OrderStatus[] = ['Pending', 'Preparing', 'Delivered', 'Cancelled'];
const RESET_TTL = 30 * 60 * 1000;

let demoHash: string | null = null;
let online = true;
let seq = 100;
let db = build();
const listeners = new Set<() => void>();

function demoPasswordHash() {
  if (!demoHash) demoHash = hashPasswordSync(DEMO_PASSWORD);
  return demoHash;
}

function nid(prefix: string) {
  seq += 1;
  return `${prefix}-${seq}`;
}

function touch() {
  for (const listener of listeners) listener();
}

function logAuditOn(target: AdminDb, entry: {
  action: string;
  userId: string;
  targetId?: string | null;
  metadata: Record<string, string>;
  at?: string;
}) {
  appendAuditEvent({ auditLog: target.auditLog } as AppDatabase, {
    action: entry.action,
    userId: entry.userId,
    targetId: entry.targetId ?? null,
    metadata: entry.metadata,
    at: entry.at,
  });
}

function logAudit(entry: {
  action: string;
  userId: string;
  targetId?: string | null;
  metadata: Record<string, string>;
  at?: string;
}) {
  logAuditOn(db, entry);
}

function auditChange(actor: Actor, action: string, targetId: string, metadata: Record<string, string>) {
  logAudit({
    action,
    userId: actor.id,
    targetId,
    metadata: {
      accountName: actor.name,
      accountEmail: actor.email,
      ...metadata,
    },
  });
}

function toPublic(record: StaffRecord): StaffPublic {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
    disabled: record.disabled,
    sessionVersion: record.sessionVersion,
    preferences: { ...record.preferences },
  };
}

function findEmail(email: string) {
  const key = email.trim().toLowerCase();
  return db.staff.find((person) => person.email.toLowerCase() === key && !person.deleted);
}

function menuItem(id: string, name: string, category: string, price: number, ingredients: string, allergens: string): MenuItem {
  return {
    id,
    name,
    category,
    price,
    ingredients: splitList(ingredients),
    allergens: splitList(allergens),
    available: true,
  };
}

function build(): AdminDb {
  const hash = demoPasswordHash();
  const prefs = (): Preferences => ({ ...DEFAULT_PREFS });
  const next: AdminDb = {
    staff: [
      { id: 'staff-admin', name: 'Admin Account', email: 'admin@filfoods.ph', role: 'admin', passwordHash: hash, googleSub: 'google-admin-filfoods', disabled: false, deleted: false, mustSetPassword: false, sessionVersion: 1, preferences: prefs() },
      { id: 'staff-maria', name: 'Dr. Maria Santos', email: 'maria.santos@filfoods.ph', role: 'dietitian', passwordHash: hash, googleSub: null, disabled: false, deleted: false, mustSetPassword: false, sessionVersion: 1, preferences: prefs() },
      { id: 'staff-juan', name: 'Chef Juan Dela Cruz', email: 'juan.delacruz@filfoods.ph', role: 'kitchen', passwordHash: hash, googleSub: null, disabled: false, deleted: false, mustSetPassword: false, sessionVersion: 1, preferences: prefs() },
      { id: 'staff-ana', name: 'Ana Reyes', email: 'ana.reyes@filfoods.ph', role: 'delivery', passwordHash: hash, googleSub: null, disabled: false, deleted: false, mustSetPassword: false, sessionVersion: 1, preferences: prefs() },
      { id: 'staff-mark', name: 'Mark Peralta', email: 'mark.peralta@filfoods.ph', role: 'delivery', passwordHash: hash, googleSub: null, disabled: false, deleted: false, mustSetPassword: false, sessionVersion: 1, preferences: prefs() },
    ],
    orders: [
      { id: '00350', customerName: 'Juan Dela Cruz', status: 'Pending', price: 120, placedAt: '2026-10-29T20:45:00+08:00', when: 'Oct 29, 2026 · 08:45 PM', photo: 'wrap', lines: [{ name: 'Fried Chicken', price: 120 }], assigneeId: null, assigneeName: null, updates: [] },
      { id: '00349', customerName: 'Maria Santos', status: 'Preparing', price: 99, placedAt: '2026-10-29T20:30:00+08:00', when: 'Oct 29, 2026 · 08:30 PM', photo: 'salad', lines: [{ name: 'Garden Bowl', price: 99 }], assigneeId: null, assigneeName: null, updates: [] },
      { id: '00348', customerName: 'Carlos Reyes', status: 'Delivered', price: 180, placedAt: '2026-10-29T19:50:00+08:00', when: 'Oct 29, 2026 · 07:50 PM', photo: 'salmon', lines: [{ name: 'Salmon Teriyaki', price: 180 }], assigneeId: null, assigneeName: null, updates: [] },
      { id: '00347', customerName: 'Ana Garcia', status: 'Cancelled', price: 85, placedAt: '2026-10-29T19:15:00+08:00', when: 'Oct 29, 2026 · 07:15 PM', photo: 'omelette', lines: [{ name: 'Egg White Omelette', price: 85 }], assigneeId: null, assigneeName: null, updates: [] },
      { id: '00346', customerName: 'Mark Villanueva', status: 'Delivered', price: 140, placedAt: '2026-10-29T18:35:00+08:00', when: 'Oct 29, 2026 · 06:35 PM', photo: 'bangus', lines: [{ name: 'Grilled Bangus', price: 140 }], assigneeId: null, assigneeName: null, updates: [] },
    ],
    menu: [
      menuItem('menu-1', 'Ensaymada', 'Breakfast · Pastries', 45, 'flour, butter, sugar, cheese', 'Dairy, Gluten'),
      menuItem('menu-2', 'Spanish Bread', 'Breakfast · Pastries', 35, 'flour, butter, sugar', 'Gluten, Dairy'),
      menuItem('menu-3', 'Cinnamon Roll', 'Breakfast · Pastries', 55, 'flour, cinnamon, butter', 'Gluten, Dairy'),
      menuItem('menu-4', 'Banana Cake', 'Breakfast · Pastries', 60, 'banana, flour, egg', 'Gluten, Eggs'),
      menuItem('menu-5', 'Pandesal', 'Breakfast · Breads', 20, 'flour, yeast', 'Gluten'),
      menuItem('menu-6', 'Pan de Coco', 'Breakfast · Breads', 30, 'flour, coconut', 'Gluten'),
      menuItem('menu-7', 'Wheat Toast', 'Breakfast · Breads', 25, 'whole wheat', 'Gluten'),
      menuItem('menu-8', 'Ube Cheese Bread', 'Breakfast · Breads', 50, 'ube, cheese, flour', 'Dairy, Gluten'),
      menuItem('menu-9', 'Chicken Adobo', 'Lunch · Meat', 130, 'chicken, soy, vinegar, garlic', 'Soy'),
      menuItem('menu-10', 'Fried Chicken', 'Lunch · Meat', 120, 'chicken, flour, oil', 'Gluten'),
      menuItem('menu-11', 'Pork Sisig', 'Lunch · Meat', 140, 'pork, onion, chili', ''),
      menuItem('menu-12', 'Beef Caldereta', 'Lunch · Meat', 160, 'beef, tomato, potato, cheese', 'Dairy'),
      menuItem('menu-13', 'Chicken Satay', 'Lunch · Meat', 130, 'chicken, peanut, soy', 'Peanuts, Soy'),
      menuItem('menu-14', 'Ampalaya Stir Fry', 'Lunch · Vegetable', 90, 'ampalaya, egg, garlic', 'Eggs'),
      menuItem('menu-15', 'Tofu Stir Fry', 'Lunch · Vegetable', 95, 'tofu, vegetables, soy', 'Soy'),
      menuItem('menu-16', 'Chop Suey', 'Lunch · Vegetable', 85, 'mixed vegetables', ''),
      menuItem('menu-17', 'Spring Salad', 'Lunch · Vegetable', 100, 'greens, tomato, cucumber', ''),
      menuItem('menu-18', 'Chicken Tinola', 'Dinner · Meat', 110, 'chicken, ginger, papaya', ''),
      menuItem('menu-19', 'Sinigang na Hipon', 'Dinner · Meat', 150, 'shrimp, tamarind, radish', 'Shellfish'),
      menuItem('menu-20', 'Grilled Bangus', 'Dinner · Meat', 140, 'bangus, tomato, onion', 'Fish'),
      menuItem('menu-21', 'Salmon Teriyaki', 'Dinner · Meat', 180, 'salmon, soy, mirin', 'Fish, Soy'),
      menuItem('menu-22', 'Pinakbet', 'Dinner · Vegetable', 95, 'squash, eggplant, bitter melon', ''),
      menuItem('menu-23', 'Ginataang Gulay', 'Dinner · Vegetable', 100, 'coconut milk, squash, string beans', ''),
      menuItem('menu-24', 'Tortang Talong', 'Dinner · Vegetable', 80, 'eggplant, egg', 'Eggs'),
    ],
    customers: [
      {
        id: 'customer-ana',
        name: 'Ana Garcia',
        email: 'anagarcia@gmail.com',
        allergies: ['Peanuts', 'Dairy'],
        nutrition: [
          { label: 'Sugar', value: '≤5g' },
          { label: 'Calories', value: '400–600' },
          { label: 'Protein', value: '≥25g' },
        ],
        sodiumConflict: ['≤400 mg', '≤2.00 mg', '≤2g'],
        history: [
          { name: 'Spring Salad', status: 'Delivered', price: 100 },
          { name: 'Order #00347', status: 'Cancelled', price: 85 },
        ],
      },
      { id: 'customer-juan', name: 'Juan Dela Cruz', email: 'juan.delacruz@gmail.com', allergies: [], nutrition: [], sodiumConflict: null, history: [{ name: 'Fried Chicken', status: 'Pending', price: 120 }] },
      { id: 'customer-maria', name: 'Maria Santos', email: 'maria.santos@gmail.com', allergies: [], nutrition: [], sodiumConflict: null, history: [{ name: 'Garden Bowl', status: 'Preparing', price: 99 }] },
      { id: 'customer-carlos', name: 'Carlos Reyes', email: 'carlos.reyes@gmail.com', allergies: [], nutrition: [], sodiumConflict: null, history: [{ name: 'Salmon Teriyaki', status: 'Delivered', price: 180 }] },
      { id: 'customer-mark', name: 'Mark Villanueva', email: 'mark.villanueva@gmail.com', allergies: [], nutrition: [], sodiumConflict: null, history: [{ name: 'Grilled Bangus', status: 'Delivered', price: 140 }] },
    ],
    notices: [
      { id: 'note-350', audience: 'admin', title: 'Order #00350 is pending', orderId: '00350', readBy: [], createdAt: '2026-10-29T20:45:00+08:00' },
    ],
    settings: {
      kitchen: { enabled: true, types: { newOrder: true, menuUpdated: true } },
      delivery: { enabled: true, types: { readyForPickup: true, menuUpdated: false } },
    },
    metrics: {
      totalOrders: 124,
      ordersDelta: 0.12,
      totalSales: 8750,
      salesDelta: 0.15,
      totalCustomers: 892,
      customersDelta: 0.08,
      menuDelta: 0.02,
      weekSales: [820, 640, 910, 700, 1240, 1560, 2880],
      monthSales: null,
    },
    auditLog: [],
    resets: [],
    pendingSetup: null,
    support: [],
  };
  logAuditOn(next, {
    action: 'dietitian.health_condition_removal',
    userId: 'staff-maria',
    targetId: 'customer-ana',
    at: '2026-10-28T02:00:00.000Z',
    metadata: {
      accountName: 'Dr. Maria Santos',
      accountEmail: 'maria.santos@filfoods.ph',
      summary: 'Decided a health-condition removal request',
      targetLabel: 'Ana Garcia · health condition',
      oldValue: 'requested',
      newValue: 'approved',
    },
  });
  return next;
}

export function subscribeAdmin(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetAdminDb() {
  online = true;
  db = build();
  touch();
}

export function getAdminDb() {
  return db;
}

export function setAdminOnline(next: boolean) {
  online = next;
}

export function isAdminOnline() {
  return online;
}

export function isAuditIntact() {
  return verifyAuditChain(db.auditLog);
}

function metaText(event: AuditEvent, key: string) {
  const value = event.metadata[key];
  return value === undefined || value === null ? '' : String(value);
}

export function adminView() {
  const audit: AuditRow[] = [...db.auditLog].reverse().map((event) => ({
    id: event.id,
    at: event.at,
    action: event.action,
    accountName: metaText(event, 'accountName'),
    accountEmail: metaText(event, 'accountEmail'),
    summary: metaText(event, 'summary') || event.action,
    target: metaText(event, 'targetLabel') || event.targetId || '',
    setting: metaText(event, 'setting'),
    role: metaText(event, 'role'),
    oldValue: metaText(event, 'oldValue'),
    newValue: metaText(event, 'newValue'),
  }));
  return {
    orders: db.orders,
    menu: db.menu,
    customers: db.customers,
    notices: db.notices,
    settings: db.settings,
    metrics: db.metrics,
    plans: PLANS,
    categories: CATEGORIES,
    staff: db.staff.filter((person) => !person.deleted).map(toPublic),
    pendingSetup: db.pendingSetup,
    audit,
    intact: isAuditIntact(),
  };
}

export function findPublic(accountId: string) {
  const record = db.staff.find((person) => person.id === accountId && !person.deleted && !person.disabled);
  return record ? toPublic(record) : null;
}

function rejected(email: string, password: string) {
  if (!email.trim() || !password) return { ok: false as const, field: 'form' as const, message: COPY.blank };
  if (!email.includes('@')) return { ok: false as const, field: 'email' as const, message: COPY.invalidEmail };
  if (!online) return { ok: false as const, field: 'form' as const, message: COPY.offline };
  return null;
}

export function loginAdmin(email: string, password: string) {
  const invalid = rejected(email, password);
  if (invalid) return invalid;
  const account = db.staff.find((person) => person.email.toLowerCase() === email.trim().toLowerCase());
  if (!account) return { ok: false as const, field: 'password' as const, message: COPY.wrongPassword };
  if (account.disabled || account.deleted) return { ok: false as const, field: 'form' as const, message: COPY.disabledAccount };
  if (account.mustSetPassword || !account.passwordHash) {
    return { ok: false as const, field: 'form' as const, message: COPY.setPasswordFirst };
  }
  if (!comparePasswordSync(password, account.passwordHash)) {
    return { ok: false as const, field: 'password' as const, message: COPY.wrongPassword };
  }
  return { ok: true as const, account: toPublic(account) };
}

export function authorizePanel(account: StaffPublic, panel: StaffRole) {
  if (account.role !== panel) {
    return { ok: false as const, title: COPY.notAuthorized, detail: COPY.noSession };
  }
  return { ok: true as const };
}

export function loginWithGoogle(email: string, panel: StaffRole) {
  const before = db.staff.length;
  if (!online) {
    return { ok: false as const, title: COPY.offline, detail: COPY.noSession, created: false };
  }
  const account = db.staff.find((person) => (
    person.email.toLowerCase() === email.trim().toLowerCase()
    && person.googleSub
    && !person.deleted
    && !person.disabled
  ));
  const created = db.staff.length !== before;
  if (!account || account.role !== panel) {
    return { ok: false as const, title: COPY.notAuthorized, detail: COPY.noSession, created };
  }
  return { ok: true as const, account: toPublic(account), created };
}

export function requestPasswordReset(email: string) {
  if (!email.trim() || !email.includes('@') || !isValidEmail(email)) {
    return { ok: false as const, message: COPY.badResetEmail, token: null };
  }
  const account = findEmail(email);
  let token: string | null = null;
  if (account && !account.disabled) {
    token = nid('reset');
    db.resets.push({ token, email: account.email, expiresAt: Date.now() + RESET_TTL, used: false });
  }
  touch();
  return { ok: true as const, message: COPY.checkEmail, token };
}

export function peekResetToken(email: string) {
  const key = email.trim().toLowerCase();
  const link = [...db.resets].reverse().find((row) => (
    row.email.toLowerCase() === key && !row.used && row.expiresAt >= Date.now()
  ));
  return link?.token ?? null;
}

export function tokenStatus(token: string) {
  const link = db.resets.find((row) => row.token === token);
  if (!link || link.used || link.expiresAt < Date.now()) {
    return { ok: false as const, message: COPY.linkExpired };
  }
  return { ok: true as const };
}

export function expireReset(token: string) {
  const link = db.resets.find((row) => row.token === token);
  if (link) link.expiresAt = Date.now() - 1000;
}

export function resetPassword(token: string, nextPassword: string, confirm: string) {
  if (!nextPassword && !confirm) return { ok: false as const, message: COPY.enterPassword };
  if (nextPassword !== confirm) return { ok: false as const, message: COPY.passwordMismatch };
  if (nextPassword.length < 8) return { ok: false as const, message: COPY.shortPassword };
  const link = db.resets.find((row) => row.token === token);
  if (!link || link.used || link.expiresAt < Date.now()) {
    return { ok: false as const, message: COPY.linkExpired };
  }
  const account = findEmail(link.email);
  if (!account) return { ok: false as const, message: COPY.linkExpired };
  link.used = true;
  account.passwordHash = hashPasswordSync(nextPassword);
  account.mustSetPassword = false;
  account.sessionVersion += 1;
  if (db.pendingSetup?.email.toLowerCase() === account.email.toLowerCase()) db.pendingSetup = null;
  logAudit({
    action: 'password.reset',
    userId: account.id,
    targetId: account.id,
    metadata: {
      accountName: account.name,
      accountEmail: account.email,
      summary: 'Password updated',
      targetLabel: account.email,
    },
  });
  touch();
  return { ok: true as const, message: COPY.passwordUpdated };
}

function emit(audience: StaffRole, title: string, orderId?: string) {
  db.notices.unshift({
    id: nid('note'),
    audience,
    title,
    orderId,
    readBy: [],
    createdAt: new Date().toISOString(),
  });
}

function notifyOrder(order: AdminOrder, title: string) {
  emit('admin', title, order.id);
  if (db.settings.kitchen.enabled && db.settings.kitchen.types.newOrder) {
    emit('kitchen', title, order.id);
  }
  if (db.settings.delivery.enabled && db.settings.delivery.types.readyForPickup) {
    emit('delivery', title, order.id);
  }
}

function notifyMenu(title: string) {
  emit('admin', title);
  if (db.settings.kitchen.enabled && db.settings.kitchen.types.menuUpdated) emit('kitchen', title);
  if (db.settings.delivery.enabled && db.settings.delivery.types.menuUpdated) emit('delivery', title);
}

export function searchStaffOrders(query: string, status: 'All' | OrderStatus) {
  return searchOrders(db.orders, query, status);
}

export function setOrderStatus(actor: Actor, orderId: string, status: OrderStatus) {
  if (actor.role !== 'admin') return { ok: false as const, message: COPY.notAuthorized };
  if (!STATUSES.includes(status)) return { ok: false as const, message: 'Choose a valid status.' };
  const order = db.orders.find((row) => row.id === orderId);
  if (!order) return { ok: false as const, message: COPY.noOrders };
  if (order.status === 'Delivered' || order.status === 'Cancelled') {
    return { ok: false as const, message: COPY.readOnlyOrder };
  }
  if (order.status === status) return { ok: true as const, message: '', unchanged: true };
  const from = order.status;
  order.status = status;
  const at = new Date().toISOString();
  order.updates.push({ at, by: actor.name, summary: `${from} → ${status}` });
  auditChange(actor, 'order.status', order.id, {
    summary: `Status ${from} → ${status}`,
    targetLabel: `Order #${order.id}`,
    oldValue: from,
    newValue: status,
  });
  notifyOrder(order, `Order #${order.id} is ${status.toLowerCase()}`);
  touch();
  return { ok: true as const, message: 'Status saved' };
}

export function assignDelivery(actor: Actor, orderId: string, staffId: string) {
  if (actor.role !== 'admin') return { ok: false as const, message: COPY.notAuthorized };
  const order = db.orders.find((row) => row.id === orderId);
  if (!order) return { ok: false as const, message: COPY.noOrders };
  if (order.status === 'Delivered' || order.status === 'Cancelled') {
    return { ok: false as const, message: COPY.readOnlyOrder };
  }
  const person = db.staff.find((row) => row.id === staffId && row.role === 'delivery' && !row.deleted && !row.disabled);
  if (!person) return { ok: false as const, message: COPY.chooseDelivery };
  const from = order.assigneeName ?? 'Unassigned';
  order.assigneeId = person.id;
  order.assigneeName = person.name;
  const at = new Date().toISOString();
  order.updates.push({ at, by: actor.name, summary: `Assigned to ${person.name}` });
  auditChange(actor, 'order.assign', order.id, {
    summary: `Assigned ${person.name}`,
    targetLabel: `Order #${order.id}`,
    oldValue: from,
    newValue: person.name,
  });
  notifyOrder(order, `Order #${order.id} is assigned to ${person.name}`);
  touch();
  return { ok: true as const, message: 'Delivery assigned' };
}

export function deliveryStaff() {
  return db.staff.filter((person) => person.role === 'delivery' && !person.deleted && !person.disabled).map(toPublic);
}

export function ordersForAssignee(staffId: string) {
  return db.orders.filter((order) => order.assigneeId === staffId);
}

function draftMenu(draft: MenuDraft) {
  const name = draft.name.trim();
  const category = draft.category.trim();
  if (!name || !category || typeof draft.available !== 'boolean') {
    return { ok: false as const, message: COPY.menuRequired };
  }
  const price = parsePrice(draft.price);
  if (price === null) return { ok: false as const, message: COPY.priceError };
  return {
    ok: true as const,
    value: {
      name,
      category,
      price,
      available: draft.available,
      ingredients: splitList(draft.ingredients),
      allergens: splitList(draft.allergens),
    },
  };
}

export function menuChanges(id: string, draft: MenuDraft): FieldChange[] {
  const item = db.menu.find((row) => row.id === id);
  const parsed = draftMenu(draft);
  if (!item || !parsed.ok) return [];
  const next = parsed.value;
  const changes: FieldChange[] = [];
  if (item.name !== next.name) changes.push({ label: 'Name', from: item.name, to: next.name });
  if (item.category !== next.category) changes.push({ label: 'Category', from: item.category, to: next.category });
  if (item.price !== next.price) changes.push({ label: 'Price', from: peso(item.price), to: peso(next.price) });
  if (item.available !== next.available) {
    changes.push({ label: 'Availability', from: item.available ? 'Available' : 'Unavailable', to: next.available ? 'Available' : 'Unavailable' });
  }
  const ingredients = item.ingredients.join(', ');
  const nextIngredients = next.ingredients.join(', ');
  if (ingredients !== nextIngredients) changes.push({ label: 'Ingredients', from: ingredients || 'None', to: nextIngredients || 'None' });
  const allergens = item.allergens.join(', ');
  const nextAllergens = next.allergens.join(', ');
  if (allergens !== nextAllergens) changes.push({ label: 'Allergens', from: allergens || 'None', to: nextAllergens || 'None' });
  return changes;
}

export function saveMenu(actor: Actor, id: string | null, draft: MenuDraft) {
  if (actor.role !== 'admin') return { ok: false as const, message: COPY.notAuthorized };
  const parsed = draftMenu(draft);
  if (!parsed.ok) return parsed;
  if (!id) {
    const item: MenuItem = { id: nid('menu'), ...parsed.value };
    db.menu.push(item);
    auditChange(actor, 'menu.create', item.id, { summary: `Added ${item.name}`, targetLabel: item.name, newValue: peso(item.price) });
    notifyMenu(`Menu updated: ${item.name}`);
    touch();
    return { ok: true as const, message: 'Menu item added' };
  }
  const item = db.menu.find((row) => row.id === id);
  if (!item) return { ok: false as const, message: 'Menu item not found.' };
  const changes = menuChanges(id, draft);
  if (!changes.length) return { ok: false as const, message: COPY.nothingChanged };
  const previousPrice = item.price;
  Object.assign(item, parsed.value);
  auditChange(actor, 'menu.update', item.id, {
    summary: changes.map((change) => `${change.label}: ${change.from} → ${change.to}`).join('; '),
    targetLabel: item.name,
    oldValue: changes.map((change) => change.from).join(', '),
    newValue: changes.map((change) => change.to).join(', '),
  });
  if (item.price !== previousPrice || changes.some((change) => change.label !== 'Price')) {
    notifyMenu(`Menu updated: ${item.name}`);
  }
  touch();
  return { ok: true as const, message: 'Menu item updated' };
}

export function setMenuAvailability(actor: Actor, id: string, available: boolean) {
  if (actor.role !== 'admin') return { ok: false as const, message: COPY.notAuthorized };
  const item = db.menu.find((row) => row.id === id);
  if (!item || item.available === available) return { ok: true as const, message: '' };
  const from = item.available ? 'Available' : 'Unavailable';
  item.available = available;
  auditChange(actor, 'menu.availability', item.id, {
    summary: available ? `${item.name} can be ordered` : COPY.notSelectable,
    targetLabel: item.name,
    oldValue: from,
    newValue: available ? 'Available' : 'Unavailable',
  });
  if (!available) {
    touch();
    return { ok: true as const, message: COPY.notSelectable };
  }
  notifyMenu(`Menu updated: ${item.name}`);
  touch();
  return { ok: true as const, message: 'Menu item updated' };
}

export function deleteMenu(actor: Actor, id: string) {
  if (actor.role !== 'admin') return { ok: false as const, message: COPY.notAuthorized };
  const index = db.menu.findIndex((row) => row.id === id);
  if (index < 0) return { ok: false as const, message: 'Menu item not found.' };
  const [item] = db.menu.splice(index, 1);
  auditChange(actor, 'menu.delete', item.id, {
    summary: COPY.menuDeleted,
    targetLabel: item.name,
    oldValue: item.name,
    newValue: 'deleted',
  });
  touch();
  return { ok: true as const, message: COPY.menuDeleted };
}

function staffChanges(record: StaffRecord, draft: { name: string; email: string; role: StaffRole }): FieldChange[] {
  const changes: FieldChange[] = [];
  if (record.name !== draft.name) changes.push({ label: 'Name', from: record.name, to: draft.name });
  if (record.email !== draft.email) changes.push({ label: 'Email', from: record.email, to: draft.email });
  if (record.role !== draft.role) changes.push({ label: 'Role', from: record.role, to: draft.role });
  return changes;
}

function cleanStaff(name: string, email: string, role: StaffRole) {
  const nextName = name.trim();
  const nextEmail = email.trim();
  if (!nextName || !nextEmail || !role) return { ok: false as const, message: COPY.staffRequired };
  if (!isValidEmail(nextEmail)) return { ok: false as const, message: COPY.badProfileEmail };
  return { ok: true as const, value: { name: nextName, email: nextEmail, role } };
}

export function previewStaff(id: string, draft: { name: string; email: string; role: StaffRole }) {
  const record = db.staff.find((person) => person.id === id && !person.deleted);
  const cleaned = cleanStaff(draft.name, draft.email, draft.role);
  if (!record || !cleaned.ok) return cleaned.ok ? { ok: false as const, message: 'Staff not found.', changes: [] } : { ...cleaned, changes: [] as FieldChange[] };
  const taken = db.staff.find((person) => person.id !== id && !person.deleted && person.email.toLowerCase() === cleaned.value.email.toLowerCase());
  if (taken) return { ok: false as const, message: COPY.duplicateEmail, changes: [] as FieldChange[] };
  if (record.role === 'admin' && cleaned.value.role !== 'admin') {
    return { ok: false as const, message: COPY.roleLocked, changes: [] as FieldChange[] };
  }
  return { ok: true as const, message: '', changes: staffChanges(record, cleaned.value) };
}

export function addStaff(actor: Actor, draft: { name: string; email: string; role: StaffRole }) {
  if (actor.role !== 'admin') return { ok: false as const, message: COPY.notAuthorized };
  const cleaned = cleanStaff(draft.name, draft.email, draft.role);
  if (!cleaned.ok) return cleaned;
  if (findEmail(cleaned.value.email)) return { ok: false as const, message: COPY.duplicateEmail };
  const token = nid('setup');
  const record: StaffRecord = {
    id: nid('staff'),
    name: cleaned.value.name,
    email: cleaned.value.email,
    role: cleaned.value.role,
    passwordHash: null,
    googleSub: null,
    disabled: false,
    deleted: false,
    mustSetPassword: true,
    sessionVersion: 1,
    preferences: { ...DEFAULT_PREFS },
  };
  db.staff.push(record);
  db.resets.push({ token, email: record.email, expiresAt: Date.now() + RESET_TTL, used: false });
  db.pendingSetup = { name: record.name, email: record.email, token };
  auditChange(actor, 'staff.create', record.id, {
    summary: `Added ${record.name}`,
    targetLabel: record.name,
    newValue: `${record.email} · ${record.role}`,
  });
  touch();
  return { ok: true as const, message: COPY.staffAdded, token };
}

export function updateStaff(actor: Actor, id: string, draft: { name: string; email: string; role: StaffRole }) {
  if (actor.role !== 'admin') return { ok: false as const, message: COPY.notAuthorized };
  const preview = previewStaff(id, draft);
  if (!preview.ok) return preview;
  if (!preview.changes.length) return { ok: false as const, message: COPY.nothingChanged };
  const record = db.staff.find((person) => person.id === id && !person.deleted);
  if (!record) return { ok: false as const, message: 'Staff not found.' };
  const cleaned = cleanStaff(draft.name, draft.email, draft.role);
  if (!cleaned.ok) return cleaned;
  record.name = cleaned.value.name;
  record.email = cleaned.value.email;
  record.role = cleaned.value.role;
  auditChange(actor, 'staff.update', record.id, {
    summary: preview.changes.map((change) => `${change.label}: ${change.from} → ${change.to}`).join('; '),
    targetLabel: record.name,
    oldValue: preview.changes.map((change) => change.from).join(', '),
    newValue: preview.changes.map((change) => change.to).join(', '),
  });
  touch();
  return { ok: true as const, message: COPY.staffUpdated };
}

export function deleteStaff(actor: Actor, id: string) {
  if (actor.role !== 'admin') return { ok: false as const, message: COPY.notAuthorized };
  if (actor.id === id) return { ok: false as const, message: COPY.cannotDeleteSelf };
  const record = db.staff.find((person) => person.id === id && !person.deleted);
  if (!record) return { ok: false as const, message: 'Staff not found.' };
  record.deleted = true;
  record.disabled = true;
  record.sessionVersion += 1;
  auditChange(actor, 'staff.delete', record.id, {
    summary: `Deleted ${record.name}`,
    targetLabel: record.name,
    oldValue: record.email,
    newValue: 'deleted',
  });
  touch();
  return { ok: true as const, message: COPY.staffDeleted };
}

const TYPE_LABELS: Record<string, string> = {
  newOrder: 'New order',
  menuUpdated: 'Menu updated',
  readyForPickup: 'Ready for pickup',
};

export function saveRoleNotifications(
  actor: Actor,
  role: 'kitchen' | 'delivery',
  nextTypes: { newOrder?: boolean; menuUpdated?: boolean; readyForPickup?: boolean },
) {
  if (actor.role !== 'admin') return { ok: false as const, message: COPY.deniedNotifications };
  const current = db.settings[role];
  const types = { ...current.types, ...nextTypes };
  const enabled = Object.values(types).some(Boolean);
  const roleName = role === 'kitchen' ? 'Kitchen' : 'Delivery';
  let changed = false;
  if (current.enabled !== enabled) {
    changed = true;
    auditChange(actor, 'notifications.update', role, {
      summary: `${roleName} notifications ${enabled ? 'ON' : 'OFF'}`,
      targetLabel: roleName,
      role: roleName,
      setting: 'notifications',
      oldValue: current.enabled ? 'ON' : 'OFF',
      newValue: enabled ? 'ON' : 'OFF',
    });
  }
  for (const key of Object.keys(types) as (keyof typeof types)[]) {
    if (current.types[key] === types[key]) continue;
    changed = true;
    auditChange(actor, 'notifications.update', role, {
      summary: `${roleName}: ${TYPE_LABELS[key]} ${types[key] ? 'ON' : 'OFF'}`,
      targetLabel: roleName,
      role: roleName,
      setting: TYPE_LABELS[key],
      oldValue: current.types[key] ? 'ON' : 'OFF',
      newValue: types[key] ? 'ON' : 'OFF',
    });
  }
  if (!changed) return { ok: true as const, message: COPY.notificationsSaved };
  db.settings[role] = { enabled, types };
  touch();
  return { ok: true as const, message: COPY.notificationsSaved };
}

export function noticesFor(role: StaffRole) {
  return db.notices.filter((notice) => notice.audience === role);
}

export function markNoticeRead(accountId: string, noticeId: string) {
  const notice = db.notices.find((row) => row.id === noticeId);
  if (!notice || notice.readBy.includes(accountId)) return;
  notice.readBy.push(accountId);
  touch();
}

export function saveProfile(actor: Actor, draft: { name: string; email: string }) {
  const record = db.staff.find((person) => person.id === actor.id && !person.deleted);
  if (!record) return { ok: false as const, message: 'Account not found.' };
  const name = draft.name.trim();
  const email = draft.email.trim();
  if (!name || !email) return { ok: false as const, message: COPY.staffRequired };
  if (!isValidEmail(email)) return { ok: false as const, message: COPY.badProfileEmail };
  const taken = db.staff.find((person) => person.id !== record.id && !person.deleted && person.email.toLowerCase() === email.toLowerCase());
  if (taken) return { ok: false as const, message: COPY.duplicateEmail };
  const changes: FieldChange[] = [];
  if (record.name !== name) changes.push({ label: 'Name', from: record.name, to: name });
  if (record.email !== email) changes.push({ label: 'Email', from: record.email, to: email });
  if (!changes.length) return { ok: false as const, message: COPY.nothingChanged };
  record.name = name;
  record.email = email;
  auditChange({ ...actor, name, email }, 'profile.update', record.id, {
    summary: changes.map((change) => `${change.from} → ${change.to}`).join('; '),
    targetLabel: name,
    oldValue: changes.map((change) => change.from).join(', '),
    newValue: changes.map((change) => change.to).join(', '),
  });
  touch();
  return { ok: true as const, message: COPY.profileUpdated, account: toPublic(record) };
}

export function savePreferences(actor: Actor, preferences: Preferences) {
  const record = db.staff.find((person) => person.id === actor.id && !person.deleted);
  if (!record) return { ok: false as const, message: 'Account not found.' };
  const from = `${record.preferences.language}/${record.preferences.appearance}`;
  const to = `${preferences.language}/${preferences.appearance}`;
  record.preferences = { ...preferences };
  if (from !== to) {
    auditChange(actor, 'preferences.update', record.id, {
      summary: `Preferences ${from} → ${to}`,
      targetLabel: record.email,
      oldValue: from,
      newValue: to,
    });
  }
  touch();
  return { ok: true as const, message: 'Preferences saved', preferences: record.preferences };
}

export function sendSupport(actor: Actor, message: string) {
  const text = message.trim();
  if (!text) return { ok: false as const, message: COPY.helpEmpty };
  db.support.push({ id: nid('help'), from: actor.email, message: text, at: new Date().toISOString() });
  auditChange(actor, 'support.message', actor.id, {
    summary: 'Support message sent',
    targetLabel: actor.email,
    newValue: 'sent',
  });
  touch();
  return { ok: true as const, message: COPY.helpSent };
}

export function activeOrders() {
  return db.orders.filter((order) => order.status === 'Pending' || order.status === 'Preparing');
}

export { formatWhen };
