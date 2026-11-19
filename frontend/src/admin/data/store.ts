import { isSupabaseConfigured } from '../../lib/supabaseClient.js';
import * as remote from '../../lib/staffBackend.js';
import type { AppDatabase, AuditEvent } from '../../user/types';
import { appendAuditEvent, comparePasswordSync, hashPasswordSync, verifyAuditChain } from '../../user/services/securityService.js';
import { COPY, DEMO_PASSWORD } from '../copy.js';
import { formatWhen, isValidEmail, parsePrice, peso, splitList } from '../domain/format.js';
import { computeDashboardMetrics } from '../domain/dashboardMetrics.js';
import { searchOrdersWhere } from '../domain/search.js';
import { can, displayOrderNo } from '../domain/roleAccess.js';
import {
  BUCKET_FILTERS,
  canSeeOrder,
  isValidTransition,
  roleMayTransition,
  shapeOrderForRole,
  staffBucket,
  type BucketFilter,
} from '../domain/roleAccess.js';
import type {
  Actor,
  AdminOrder,
  AuditRow,
  Customer,
  FieldChange,
  MenuDraft,
  MenuItem,
  OrderStatus,
  DietaryInfo,
  PlanOffer,
  Preferences,
  RemovalRequest,
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
  auditLog: AuditEvent[];
  resets: ResetLink[];
  pendingSetup: { name: string; email: string; token: string } | null;
  support: { id: string; from: string; topic?: string; message: string; at: string }[];
  removalRequests: RemovalRequest[];
  /** Rows from `admin_audit_log` when signed in to Supabase. */
  remoteAudit: AuditRow[] | null;
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

/** Meal times shared with the user app (USR menu tabs, Figma Breakfast / Lunch / Dinner). */
export const MEAL_TIMES = ['Breakfast', 'Lunch', 'Dinner'] as const;

/** Categories offered in the menu form: Supabase meals use the meal time; demo data keeps sub-groups. */
export function menuCategories() {
  const present = db.menu.map((item) => item.category);
  const base: string[] = backendActive() ? [...MEAL_TIMES] : CATEGORIES;
  return [...new Set([...base, ...present])];
}

export function mealTimeOf(category: string) {
  return MEAL_TIMES.find((time) => category.startsWith(time)) ?? 'Other';
}

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DEFAULT_PREFS: Preferences = { language: 'en', appearance: 'light' };
const STATUSES: OrderStatus[] = [
  'For Dietitian Review',
  'Awaiting Payment',
  'Paid',
  'Confirmed',
  'Preparing',
  'Ready for Delivery',
  'Out for Delivery',
  'Ready for Pickup',
  'Completed',
  'Cancelled',
];
const RESET_TTL = 30 * 60 * 1000;

let demoHash: string | null = null;
let online = true;
let seq = 100;
// Built at the end of this module, after the seed tables are initialised.
let db = undefined as unknown as AdminDb;
let backendSynced = false;
let backendViewer: Actor | null = null;
// Why the last Supabase sync failed (shown on staff screens instead of sample rows).
let backendError: string | null = null;
const listeners = new Set<() => void>();
const BACKEND_ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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


const ADDRESSES: Record<string, string> = {
  juan: '12 Mabini St., Brgy. San Antonio, Pasig City',
  maria: '88 Katipunan Ave., Loyola Heights, Quezon City',
  carlos: '5 Jupiter St., Bel-Air, Makati City',
  ana: 'Unit 4B, 21 Scout Tobias St., Quezon City',
  mark: '301 Shaw Blvd., Mandaluyong City',
  rosa: '9 Sampaguita St., Marikina Heights, Marikina City',
  ben: '45 Aguirre Ave., BF Homes, Parañaque City',
  elena: '17 Ortigas Ave. Ext., Cainta, Rizal',
};

function flags(partial: Partial<DietaryInfo['nutrition']>): DietaryInfo['nutrition'] {
  return { supplied: true, lowerCalories: false, higherProtein: false, lowerSodium: false, lowerSugar: false, ...partial };
}

const NONE: DietaryInfo = {
  allergies: [],
  conditions: [],
  restrictions: [],
  nutrition: { supplied: false, lowerCalories: false, higherProtein: false, lowerSodium: false, lowerSugar: false },
  updatedAt: null,
};

const SEED_CUSTOMERS: Omit<Customer, 'history'>[] = [
  {
    id: 'customer-ana',
    name: 'Ana Garcia',
    firstName: 'Ana',
    accountHolderName: 'Ana Garcia',
    email: 'anagarcia@gmail.com',
    allergies: ['Peanuts', 'Dairy'],
    nutrition: [],
    sodiumConflict: ['≤400 mg', '≤2.00 mg', '≤2g'],
    dietary: {
      allergies: [{ value: 'Peanuts', note: 'Severe: carries an EpiPen' }, { value: 'Dairy', note: null }],
      conditions: ['Hypertension', 'Type 2 Diabetes'],
      restrictions: ['Low-sugar', 'Halal'],
      nutrition: flags({ lowerSodium: true, lowerSugar: true, higherProtein: true }),
      updatedAt: '2026-10-28T10:00:00+08:00',
    },
  },
  { id: 'customer-juan', name: 'Juan Dela Cruz', firstName: 'Juan', accountHolderName: 'Juan Dela Cruz', email: 'juan.delacruz@gmail.com', allergies: ['Shellfish'], nutrition: [], sodiumConflict: null, dietary: { allergies: [{ value: 'Shellfish', note: null }], conditions: ['High cholesterol'], restrictions: [], nutrition: flags({ lowerCalories: true }), updatedAt: '2026-10-20T08:00:00+08:00' } },
  { id: 'customer-maria', name: 'Maria Santos', firstName: 'Maria', accountHolderName: 'Pedro Santos', email: 'maria.santos@gmail.com', allergies: [], nutrition: [], sodiumConflict: null, dietary: { ...NONE, restrictions: ['Vegetarian'], nutrition: flags({ higherProtein: true }) } },
  { id: 'customer-carlos', name: 'Carlos Reyes', firstName: 'Carlos', accountHolderName: 'Carlos Reyes', email: 'carlos.reyes@gmail.com', allergies: [], nutrition: [], sodiumConflict: null, dietary: NONE },
  { id: 'customer-mark', name: 'Mark Villanueva', firstName: 'Mark', accountHolderName: 'Mark Villanueva', email: 'mark.villanueva@gmail.com', allergies: [], nutrition: [], sodiumConflict: null, dietary: { ...NONE, conditions: ['Hypertension'], nutrition: flags({ lowerSodium: true }) } },
  { id: 'customer-rosa', name: 'Rosa Lim', firstName: 'Rosa', accountHolderName: 'Rosa Lim', email: 'rosa.lim@gmail.com', allergies: ['Eggs'], nutrition: [], sodiumConflict: null, dietary: { allergies: [{ value: 'Eggs', note: 'Hives' }], conditions: ['Gout'], restrictions: ['Low-purine'], nutrition: flags({ lowerCalories: true }), updatedAt: '2026-10-25T09:00:00+08:00' } },
  { id: 'customer-ben', name: 'Ben Torres', firstName: 'Ben', accountHolderName: 'Lilia Torres', email: 'ben.torres@gmail.com', allergies: [], nutrition: [], sodiumConflict: null, dietary: { ...NONE, conditions: ['Chronic kidney disease'], nutrition: flags({ lowerSodium: true }) } },
  { id: 'customer-elena', name: 'Elena Cruz', firstName: 'Elena', accountHolderName: 'Elena Cruz', email: 'elena.cruz@gmail.com', allergies: ['Fish'], nutrition: [], sodiumConflict: null, dietary: { ...NONE, allergies: [{ value: 'Fish', note: null }] } },
];

type SeedOrder = [string, string, OrderStatus, number, string, string, string, Partial<AdminOrder>?];

const SEED_ORDERS: SeedOrder[] = [
  ['00350', 'customer-juan', 'For Dietitian Review', 120, '2026-10-29T20:45:00+08:00', 'wrap', 'Fried Chicken', { specialInstructions: 'Less oil, please.' }],
  ['00349', 'customer-maria', 'Preparing', 99, '2026-10-29T20:30:00+08:00', 'salad', 'Garden Bowl'],
  ['00348', 'customer-carlos', 'Completed', 180, '2026-10-29T19:50:00+08:00', 'salmon', 'Salmon Teriyaki'],
  ['00347', 'customer-ana', 'Cancelled', 85, '2026-10-29T19:15:00+08:00', 'omelette', 'Egg White Omelette', { wasPaid: false }],
  ['00346', 'customer-mark', 'Completed', 140, '2026-10-29T18:35:00+08:00', 'bangus', 'Grilled Bangus'],
  ['00352', 'customer-rosa', 'Paid', 130, '2026-10-30T10:05:00+08:00', 'wrap', 'Chicken Adobo', { specialInstructions: 'Gate code 4471.' }],
  ['00353', 'customer-ana', 'Ready for Delivery', 195, '2026-10-30T11:00:00+08:00', 'salad', 'Spring Salad', { assigneeId: 'staff-ana', assigneeName: 'Ana Reyes', specialInstructions: 'Leave with the guard if no one answers.' }],
  ['00354', 'customer-ben', 'Out for Delivery', 95, '2026-10-30T09:30:00+08:00', 'salad', 'Pinakbet', { assigneeId: 'staff-ana', assigneeName: 'Ana Reyes' }],
  ['00355', 'customer-elena', 'Preparing', 110, '2026-10-30T12:15:00+08:00', 'bangus', 'Chicken Tinola', { fulfillment: 'pick_up' }],
  ['00356', 'customer-ben', 'Awaiting Payment', 160, '2026-10-30T14:00:00+08:00', 'wrap', 'Beef Caldereta'],
];

const PAID_STAGES: OrderStatus[] = ['Paid', 'Confirmed', 'Preparing', 'Ready for Delivery', 'Ready for Pickup', 'Out for Delivery', 'Completed'];

function seedOrder([id, clientId, status, price, placedAt, photo, meal, extra]: SeedOrder): AdminOrder {
  const customer = SEED_CUSTOMERS.find((row) => row.id === clientId)!;
  const first = customer.firstName || customer.name.split(' ')[0];
  const fulfillment = extra?.fulfillment ?? 'delivery';
  const phone = `+63 917 555 0${id.slice(-3)}`;
  return {
    id,
    orderNo: Number(id),
    orderRef: `ORD-2026-${id.slice(-4)}`,
    trackingNumber: fulfillment === 'delivery' ? `TRK-2026-${id.slice(-4)}` : undefined,
    clientId,
    customerName: customer.name,
    firstName: first,
    accountHolderName: customer.accountHolderName ?? customer.name,
    customerEmail: customer.email,
    status,
    fulfillment,
    price,
    placedAt,
    when: formatWhen(placedAt),
    photo,
    lines: [{ name: meal, price }],
    items: [{ name: meal, quantity: 1, unitPrice: price, mealKey: null }],
    dietary: customer.dietary ?? NONE,
    delivery: fulfillment === 'delivery'
      ? { firstName: first, contactNumber: phone, address: ADDRESSES[clientId.replace('customer-', '')] ?? null, notes: extra?.specialInstructions ?? null }
      : null,
    specialInstructions: null,
    reviewDecision: PAID_STAGES.includes(status) || status === 'Awaiting Payment' ? 'approved' : null,
    reviewReason: null,
    wasPaid: PAID_STAGES.includes(status),
    assigneeId: null,
    assigneeName: null,
    updates: [],
    ...extra,
  };
}

function historyFor(orders: AdminOrder[], clientId: string) {
  return orders
    .filter((order) => order.clientId === clientId)
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    .map((order) => ({
      orderId: order.id,
      at: order.when,
      name: order.lines.map((line) => line.name).join(', ') || `Order #${order.id}`,
      status: order.status,
      price: order.price,
    }));
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
    orders: SEED_ORDERS.map(seedOrder),
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
    customers: SEED_CUSTOMERS.map((row) => ({ ...row, history: [] })),
    notices: [
      { id: 'note-350', audience: 'admin', title: 'Order #00350 is pending', orderId: '00350', readBy: [], createdAt: '2026-10-29T20:45:00+08:00' },
      { id: 'note-350d', audience: 'dietitian', title: 'New order for review', body: 'Order #00350 from Juan is waiting for your review.', kind: 'order_review', orderId: '00350', readBy: [], createdAt: '2026-10-29T20:45:00+08:00' },
      { id: 'note-rr1', audience: 'dietitian', title: 'Health condition removal request', body: 'Ana Garcia asked to remove Hypertension.', kind: 'removal_request', requestId: 'rr-1', readBy: [], createdAt: '2026-10-30T09:10:00+08:00' },
      { id: 'note-352k', audience: 'kitchen', title: 'New paid order', body: 'Order #00352 is paid and ready to prepare.', kind: 'new_order', orderId: '00352', readBy: [], createdAt: '2026-10-30T10:05:00+08:00' },
      { id: 'note-353d', audience: 'delivery', recipientId: 'staff-ana', title: 'Order ready for pickup', body: 'Order #00353 is ready for pickup at the kitchen.', kind: 'ready_for_pickup', orderId: '00353', readBy: [], createdAt: '2026-10-30T11:20:00+08:00' },
    ],
    settings: {
      kitchen: { enabled: true, types: { newOrder: true, menuUpdated: true } },
      delivery: { enabled: true, types: { readyForPickup: true, menuUpdated: false } },
    },
    auditLog: [],
    resets: [],
    pendingSetup: null,
    support: [],
    removalRequests: [
      { id: 'rr-1', clientId: 'customer-ana', recipientName: 'Ana Garcia', condition: 'Hypertension', reason: 'My doctor cleared me after my last check-up.', requestedBy: 'Ana Garcia', requestedAt: '2026-10-30T09:10:00+08:00', status: 'pending', decisionReason: null, decidedAt: null, decidedBy: null },
      { id: 'rr-2', clientId: 'customer-rosa', recipientName: 'Rosa Lim', condition: 'Gout', reason: null, requestedBy: 'Rosa Lim', requestedAt: '2026-10-30T13:40:00+08:00', status: 'pending', decisionReason: null, decidedAt: null, decidedBy: null },
      { id: 'rr-0', clientId: 'customer-ana', recipientName: 'Ana Garcia', condition: 'Anemia', reason: 'Recovered.', requestedBy: 'Ana Garcia', requestedAt: '2026-10-27T08:00:00+08:00', status: 'approved', decisionReason: null, decidedAt: '2026-10-28T10:00:00+08:00', decidedBy: 'Dr. Maria Santos' },
    ],
    remoteAudit: null,
  };
  next.customers.forEach((customer) => {
    customer.history = historyFor(next.orders, customer.id);
  });
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
  backendViewer = null;
  backendSynced = false;
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
    removalRequests: db.removalRequests,
    menu: db.menu,
    customers: db.customers,
    notices: db.notices,
    settings: db.settings,
    metrics: computeDashboardMetrics(db.orders, db.menu),
    plans: PLANS,
    categories: CATEGORIES,
    staff: db.staff.filter((person) => !person.deleted).map(toPublic),
    pendingSetup: db.pendingSetup,
    audit: db.remoteAudit ?? audit,
    intact: db.remoteAudit ? true : isAuditIntact(),
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

const PANEL_FOR_ROLE: Record<StaffRole, string> = {
  admin: 'Admin',
  dietitian: 'Dietitian',
  kitchen: 'Kitchen',
  delivery: 'Delivery',
};

export function authorizePanel(account: StaffPublic, panel: StaffRole) {
  if (account.role !== panel) {
    return {
      ok: false as const,
      title: COPY.notAuthorized,
      detail: `This account is for the ${PANEL_FOR_ROLE[account.role]} panel. Go back, choose ${PANEL_FOR_ROLE[account.role]}, and sign in again.`,
    };
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

function emit(audience: StaffRole, title: string, orderId?: string, extra: Partial<StaffNotice> = {}) {
  db.notices.unshift({
    id: nid('note'),
    audience,
    title,
    orderId,
    readBy: [],
    createdAt: new Date().toISOString(),
    ...extra,
  });
}

function orderLabel(order: AdminOrder) {
  return displayOrderNo(order);
}

/** Same audiences as the `orders_notify_staff` trigger. */
function notifyTransition(order: AdminOrder, status: OrderStatus) {
  const no = orderLabel(order);
  const first = order.firstName || order.customerName.split(' ')[0];
  if (status === 'For Dietitian Review') {
    emit('dietitian', 'New order for review', order.id, { kind: 'reviewRequest', body: `Order ${no} from ${first} is waiting for your review.` });
    emit('admin', `Order ${no} is pending`, order.id, { kind: 'newOrder' });
  }
  if (status === 'Paid') {
    if (db.settings.kitchen.enabled && db.settings.kitchen.types.newOrder) {
      emit('kitchen', 'New paid order', order.id, { kind: 'newOrder', body: `Order ${no} is paid and ready to prepare.` });
    }
    emit('admin', `Order ${no} was paid`, order.id, { kind: 'orderPaid' });
  }
  if (status === 'Ready for Delivery') {
    emit('admin', `Order ${no} is ready for pickup`, order.id, { kind: 'readyForPickup' });
    if (order.assigneeId && db.settings.delivery.enabled && db.settings.delivery.types.readyForPickup) {
      emit('delivery', 'Order ready for pickup', order.id, {
        kind: 'readyForPickup',
        recipientId: order.assigneeId,
        body: `Order ${no} is ready for pickup at the kitchen.`,
      });
    }
  }
  if (status === 'Ready for Pickup') emit('admin', `Order ${no} is ready for customer pickup`, order.id, { kind: 'readyForPickup' });
  if (status === 'Completed') emit('admin', `Order ${no} was completed`, order.id, { kind: 'orderCompleted' });
}

function notifyMenu(title: string) {
  if (db.settings.kitchen.enabled && db.settings.kitchen.types.menuUpdated) emit('kitchen', title, undefined, { kind: 'menuUpdated' });
  if (db.settings.delivery.enabled && db.settings.delivery.types.menuUpdated) emit('delivery', title, undefined, { kind: 'menuUpdated' });
}

function bucketOrStatus(status: 'All' | BucketFilter | OrderStatus | 'Cancelled') {
  if (status === 'All') return () => true;
  if ((BUCKET_FILTERS as readonly string[]).includes(status) || status === 'Cancelled') {
    return (order: AdminOrder) => staffBucket(order.status) === status;
  }
  return (order: AdminOrder) => order.status === status;
}

/** Admin search: full names, any status bucket (ADM-11). */
export function searchStaffOrders(query: string, status: 'All' | BucketFilter | OrderStatus | 'Cancelled') {
  return searchOrdersWhere(db.orders, query, bucketOrStatus(status));
}

/** Orders a staff member may see, shaped for their role (names, prices, address). */
export function ordersFor(actor: Pick<Actor, 'id' | 'role'>) {
  return db.orders
    .filter((order) => canSeeOrder(actor.role, actor.id, order))
    .map((order) => shapeOrderForRole(actor.role, order));
}

export function orderFor(actor: Pick<Actor, 'id' | 'role'>, orderId: string) {
  return ordersFor(actor).find((order) => order.id === orderId) ?? null;
}

/** KIT-11 / DEL-11: Kitchen and Delivery search first names and order numbers only. */
export function searchRoleOrders(
  actor: Pick<Actor, 'id' | 'role'>,
  query: string,
  status: 'All' | BucketFilter | OrderStatus | 'Cancelled',
) {
  return searchOrdersWhere(ordersFor(actor), query, bucketOrStatus(status));
}

export function backendActive() {
  return isSupabaseConfigured && backendViewer !== null;
}

export function endBackendSession() {
  backendViewer = null;
  backendSynced = false;
  backendError = null;
  db = build();
  touch();
}

function recordFromPublic(person: StaffPublic): StaffRecord {
  const existing = db.staff.find((row) => row.id === person.id);
  return {
    id: person.id,
    name: person.name,
    email: person.email,
    role: person.role,
    passwordHash: null,
    googleSub: null,
    disabled: person.disabled,
    deleted: false,
    mustSetPassword: false,
    sessionVersion: 1,
    preferences: existing?.preferences ?? { ...DEFAULT_PREFS },
  };
}

/** Loads everything the signed-in role may see from Supabase into the cache. */
/** Demo data is only used when Supabase is not configured (explicit offline demo). */
export function isDemoMode() {
  return !isSupabaseConfigured;
}

export function backendSyncError() {
  return backendError;
}

/** Drops every sample row so a Supabase session never shows made-up data. */
function clearSampleData(actor: Actor) {
  db.orders = [];
  db.customers = [];
  db.menu = [];
  db.notices = [];
  db.removalRequests = [];
  db.auditLog = [];
  db.remoteAudit = [];
  db.support = [];
  db.staff = [recordFromPublic({
    id: actor.id, name: actor.name, email: actor.email, role: actor.role,
    disabled: false, sessionVersion: 1, preferences: { ...DEFAULT_PREFS },
  })];
}

export async function syncStaffData(actor: Actor) {
  if (!isSupabaseConfigured) return { ok: true as const, skipped: true as const };
  if (!backendViewer || backendViewer.id !== actor.id || !backendSynced) clearSampleData(actor);
  backendViewer = actor;
  backendSynced = true;
  const errors: string[] = [];
  const keep = <T,>(result: { ok: true; value: T } | { ok: false; message: string }, apply: (value: T) => void) => {
    if (result.ok) apply(result.value);
    else errors.push(result.message);
  };
  const [orders, menu, notices] = await Promise.all([
    remote.fetchStaffOrders(),
    remote.fetchMenu(),
    remote.fetchStaffNotices(actor.role, actor.id),
  ]);
  keep(orders, (value) => { db.orders = value; });
  keep(menu, (value) => { db.menu = value; });
  keep(notices, (value) => { db.notices = value; });
  if (actor.role === 'admin' || actor.role === 'dietitian') {
    keep(await remote.fetchStaffCustomers(), (value) => { db.customers = value; });
  } else {
    db.customers = [];
  }
  if (actor.role === 'admin') {
    const [staff, audit, settings] = await Promise.all([
      remote.fetchStaffDirectory(),
      remote.fetchAuditLog(),
      remote.fetchNotificationSettings(),
    ]);
    if (staff.ok) {
      const self = staff.value.some((row) => row.id === actor.id);
      const people = self ? staff.value : [...staff.value, { id: actor.id, name: actor.name, email: actor.email, role: actor.role, disabled: false, sessionVersion: 1, preferences: { ...DEFAULT_PREFS } }];
      db.staff = people.map(recordFromPublic);
    } else errors.push(staff.message);
    keep(audit, (value) => { db.remoteAudit = value; });
    if (settings.ok && settings.value) {
      db.settings = {
        kitchen: settings.value.kitchen ?? db.settings.kitchen,
        delivery: settings.value.delivery ?? db.settings.delivery,
      };
    }
  }
  if (actor.role === 'dietitian') {
    keep(await remote.fetchRemovalRequests(null), (value) => { db.removalRequests = value; });
  }
  const outdated = errors.find((message) => message === remote.SERVER_OUTDATED);
  backendError = outdated ?? errors[0] ?? null;
  touch();
  return backendError ? { ok: false as const, message: backendError } : { ok: true as const };
}

/** Fetches the role-shaped detail (dietary info, address, history) for one order. */
export async function loadOrderDetail(orderId: string) {
  if (!backendActive()) return { ok: true as const };
  const detail = await remote.fetchStaffOrderDetail(orderId);
  if (!detail.ok) return detail;
  const index = db.orders.findIndex((row) => row.id === orderId);
  if (index >= 0) db.orders[index] = { ...db.orders[index], ...detail.value };
  else db.orders.push(detail.value);
  touch();
  return { ok: true as const };
}

export async function loadCustomerDetail(clientId: string) {
  if (!backendActive()) return { ok: true as const };
  const detail = await remote.fetchStaffCustomerDetail(clientId);
  if (!detail.ok) return detail;
  const index = db.customers.findIndex((row) => row.id === clientId);
  if (index >= 0) db.customers[index] = { ...db.customers[index], ...detail.value };
  else db.customers.push(detail.value);
  touch();
  return { ok: true as const };
}

/** Customer details a role may open (KIT-14 / DEL-13 are limited to customers on visible orders). */
export function customerFor(actor: Pick<Actor, 'id' | 'role'>, clientId: string): Customer | null {
  const visible = actor.role === 'admin' || actor.role === 'dietitian'
    || ordersFor(actor).some((order) => order.clientId === clientId);
  if (!visible) return null;
  const customer = db.customers.find((row) => row.id === clientId);
  const order = db.orders.find((row) => row.clientId === clientId);
  if (!customer && !order) return null;
  const base: Customer = customer ?? {
    id: clientId,
    name: order!.customerName,
    firstName: order!.firstName,
    email: order!.customerEmail ?? '',
    dietary: order!.dietary ?? null,
    allergies: [],
    nutrition: [],
    sodiumConflict: null,
    history: [],
  };
  if (actor.role === 'kitchen' || actor.role === 'delivery') {
    const first = base.firstName || base.name.split(' ')[0];
    return { ...base, name: first, accountHolderName: null, history: [] };
  }
  return base;
}

export function staffBackendSynced() {
  return backendSynced;
}

/** @deprecated kept for older callers; use syncStaffData(actor). */
export async function syncStaffDataFromBackend() {
  if (!backendViewer) return { ok: true as const, skipped: true as const };
  return syncStaffData(backendViewer);
}

const BACKEND_ID = BACKEND_ORDER_ID;

function closed(order: AdminOrder) {
  return order.status === 'Completed' || order.status === 'Cancelled';
}

function transitionDenied(actor: Actor, order: AdminOrder, status: OrderStatus) {
  if (!STATUSES.includes(status)) return 'Choose a valid status.';
  if (closed(order)) return COPY.readOnlyOrder;
  if (!isValidTransition(order, status)) return 'That status change is not allowed for this order.';
  if (!roleMayTransition(actor.role, actor.id, order, status)) {
    return actor.role === 'delivery' && order.assigneeId !== actor.id
      ? 'This order is not assigned to you.'
      : 'This status change is not allowed for your role.';
  }
  return null;
}

function applyLocalOrderStatus(actor: Actor, order: AdminOrder, status: OrderStatus) {
  const from = order.status;
  order.status = status;
  if (status === 'Paid') order.wasPaid = true;
  const at = new Date().toISOString();
  order.updates.push({ at, by: actor.name, summary: `${from} → ${status}` });
  auditChange(actor, 'order.status', order.id, {
    summary: `Status ${from} → ${status}`,
    targetLabel: `Order ${orderLabel(order)}`,
    oldValue: from,
    newValue: status,
  });
  notifyTransition(order, status);
  const customer = db.customers.find((row) => row.id === order.clientId);
  if (customer) customer.history = historyFor(db.orders, customer.id);
  touch();
}

/** One status step for any role (ADM-12, KIT-13, DEL-17). Server rules apply when signed in. */
export async function setOrderStatusAsync(actor: Actor, orderId: string, status: OrderStatus) {
  const order = db.orders.find((row) => row.id === orderId);
  if (!order) return { ok: false as const, message: COPY.noOrders };
  if (order.status === status) return { ok: true as const, message: '', unchanged: true };
  const denied = transitionDenied(actor, order, status);
  if (denied) return { ok: false as const, message: denied };
  if (backendActive() && BACKEND_ID.test(orderId)) {
    const result = await remote.transitionOrder(orderId, status);
    if (!result.ok) return { ok: false as const, message: result.message };
    await syncStaffData(actor);
    await loadOrderDetail(orderId);
    return { ok: true as const, message: `Status changed to ${status}` };
  }
  applyLocalOrderStatus(actor, order, status);
  return { ok: true as const, message: `Status changed to ${status}` };
}

export function setOrderStatus(actor: Actor, orderId: string, status: OrderStatus) {
  const order = db.orders.find((row) => row.id === orderId);
  if (!order) return { ok: false as const, message: COPY.noOrders };
  if (order.status === status) return { ok: true as const, message: '', unchanged: true };
  const denied = transitionDenied(actor, order, status);
  if (denied) return { ok: false as const, message: denied };
  applyLocalOrderStatus(actor, order, status);
  return { ok: true as const, message: 'Status saved' };
}

export function assignDelivery(actor: Actor, orderId: string, staffId: string) {
  if (actor.role !== 'admin') return { ok: false as const, message: COPY.notAuthorized };
  const order = db.orders.find((row) => row.id === orderId);
  if (!order) return { ok: false as const, message: COPY.noOrders };
  if (closed(order)) return { ok: false as const, message: COPY.readOnlyOrder };
  if (order.fulfillment === 'pick_up') return { ok: false as const, message: 'Pickup orders are not assigned to Delivery Staff.' };
  const person = db.staff.find((row) => row.id === staffId && row.role === 'delivery' && !row.deleted && !row.disabled);
  if (!person) return { ok: false as const, message: COPY.chooseDelivery };
  const from = order.assigneeName ?? 'Unassigned';
  order.assigneeId = person.id;
  order.assigneeName = person.name;
  const at = new Date().toISOString();
  order.updates.push({ at, by: actor.name, summary: `Assigned to ${person.name}` });
  auditChange(actor, 'order.assign', order.id, {
    summary: `Assigned ${person.name}`,
    targetLabel: `Order ${orderLabel(order)}`,
    oldValue: from,
    newValue: person.name,
  });
  if (db.settings.delivery.enabled && db.settings.delivery.types.readyForPickup) {
    emit('delivery', 'New delivery assigned', order.id, {
      kind: 'readyForPickup',
      recipientId: person.id,
      body: `Order ${orderLabel(order)} was assigned to you.`,
    });
  }
  touch();
  return { ok: true as const, message: 'Delivery assigned' };
}

export async function assignDeliveryAsync(actor: Actor, orderId: string, staffId: string) {
  if (backendActive() && BACKEND_ID.test(orderId)) {
    if (actor.role !== 'admin') return { ok: false as const, message: COPY.notAuthorized };
    const result = await remote.assignDeliveryStaff(orderId, staffId);
    if (!result.ok) return { ok: false as const, message: result.message };
    await syncStaffData(actor);
    await loadOrderDetail(orderId);
    return { ok: true as const, message: 'Delivery assigned' };
  }
  return assignDelivery(actor, orderId, staffId);
}

/** DIT-15: approve moves to Awaiting Payment; return cancels with the Dietitian's reason. */
export async function reviewOrderAsync(actor: Actor, orderId: string, approve: boolean, reason: string) {
  if (actor.role !== 'dietitian' && actor.role !== 'admin') return { ok: false as const, message: COPY.notAuthorized };
  const order = db.orders.find((row) => row.id === orderId);
  if (!order) return { ok: false as const, message: COPY.noOrders };
  if (order.status !== 'For Dietitian Review') return { ok: false as const, message: 'This order has already been reviewed.' };
  const note = reason.trim();
  if (!approve && !note) return { ok: false as const, message: 'Please enter a reason for returning this order.' };
  if (backendActive() && BACKEND_ID.test(orderId)) {
    const result = await remote.reviewOrder(orderId, approve, note || null);
    if (!result.ok) return { ok: false as const, message: result.message };
    await syncStaffData(actor);
    await loadOrderDetail(orderId);
  } else {
    // Revised DIT-15 / USR-23: a return is Returned for Changes, not a cancellation.
    const target: OrderStatus = approve ? 'Awaiting Payment' : 'Returned for Changes';
    order.reviewDecision = approve ? 'approved' : 'returned';
    order.reviewReason = approve ? (note || null) : note;
    const from = order.status;
    order.status = target;
    order.updates.push({ at: new Date().toISOString(), by: actor.name, summary: approve ? 'Approved by the Dietitian' : `Returned for Changes: ${note}` });
    auditChange(actor, 'order.review', order.id, {
      summary: approve ? 'Dietitian approved an order' : 'Dietitian returned an order',
      targetLabel: `Order ${orderLabel(order)}`,
      oldValue: from,
      newValue: approve ? 'approved' : `returned: ${note}`,
    });
    const customer = db.customers.find((row) => row.id === order.clientId);
    if (customer) customer.history = historyFor(db.orders, customer.id);
    touch();
  }
  return { ok: true as const, message: approve ? 'Order approved. The customer can now pay.' : 'Order Returned for Changes. The customer has been notified.' };
}

export function removalRequests(status: 'pending' | 'decided' | 'all' = 'pending') {
  const rows = db.removalRequests.filter((row) => (
    status === 'all' ? true : status === 'pending' ? row.status === 'pending' : row.status !== 'pending'
  ));
  return [...rows].sort((a, b) => (
    status === 'pending' ? a.requestedAt.localeCompare(b.requestedAt) : b.requestedAt.localeCompare(a.requestedAt)
  ));
}

export function removalRequest(id: string) {
  const row = db.removalRequests.find((request) => request.id === id);
  if (!row) return null;
  const customer = db.customers.find((person) => person.id === row.clientId);
  return { ...row, dietary: row.dietary ?? customer?.dietary ?? null };
}

export async function loadRemovalRequest(id: string) {
  if (!backendActive()) return { ok: true as const };
  const detail = await remote.fetchRemovalRequestDetail(id);
  if (!detail.ok) return detail;
  const index = db.removalRequests.findIndex((row) => row.id === id);
  if (index >= 0) db.removalRequests[index] = detail.value;
  else db.removalRequests.push(detail.value);
  touch();
  return { ok: true as const };
}

/** DIT-17: only the Dietitian decides; rejecting needs a reason. */
export async function decideRemovalAsync(actor: Actor, id: string, approve: boolean, reason: string) {
  if (actor.role !== 'dietitian') return { ok: false as const, message: COPY.notAuthorized };
  const request = db.removalRequests.find((row) => row.id === id);
  if (!request) return { ok: false as const, message: 'This request is no longer available.' };
  if (request.status !== 'pending') return { ok: false as const, message: 'This request has already been decided.' };
  const note = reason.trim();
  if (!approve && !note) return { ok: false as const, message: 'Please enter a reason for rejecting this request.' };
  if (backendActive()) {
    const result = await remote.decideRemoval(id, approve, note || null);
    if (!result.ok) return { ok: false as const, message: result.message };
    await syncStaffData(actor);
    return { ok: true as const, message: approve ? 'Request approved. The condition was removed.' : 'Request rejected.' };
  }
  request.status = approve ? 'approved' : 'rejected';
  request.decisionReason = note || null;
  request.decidedAt = new Date().toISOString();
  request.decidedBy = actor.name;
  if (approve) {
    const drop = (info: DietaryInfo | null | undefined) => {
      if (info) info.conditions = info.conditions.filter((condition) => condition !== request.condition);
    };
    const customer = db.customers.find((row) => row.id === request.clientId);
    drop(customer?.dietary);
    db.orders.filter((order) => order.clientId === request.clientId).forEach((order) => drop(order.dietary));
  }
  auditChange(actor, 'health_condition_removal.decided', request.clientId, {
    summary: 'Decided a health-condition removal request',
    targetLabel: `${request.recipientName} · ${request.condition}`,
    oldValue: 'requested',
    newValue: approve ? 'approved' : `rejected: ${note}`,
  });
  touch();
  return { ok: true as const, message: approve ? 'Request approved. The condition was removed.' : 'Request rejected.' };
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

export async function saveMenuAsync(actor: Actor, id: string | null, draft: MenuDraft) {
  if (!can(actor.role, 'menuManage')) return { ok: false as const, message: COPY.notAuthorized };
  const parsed = draftMenu(draft);
  if (!parsed.ok) return parsed;
  if (backendActive()) {
    if (id && !menuChanges(id, draft).length) return { ok: false as const, message: COPY.nothingChanged };
    const result = await remote.upsertMeal(id, parsed.value);
    if (!result.ok) return { ok: false as const, message: result.message };
    await syncStaffData(actor);
    return { ok: true as const, message: id ? COPY.menuUpdated : COPY.menuAdded };
  }
  return saveMenu(actor, id, draft);
}

/** KIT-15: Kitchen sets availability only. Admin keeps full write (owner decision) although its
 * screen shows availability read-only (ADM-18). */
function canSetAvailability(role: Actor['role']) {
  return can(role, 'menuAvailability') || can(role, 'menuManage');
}

export async function setMenuAvailabilityAsync(actor: Actor, id: string, available: boolean) {
  if (!canSetAvailability(actor.role)) return { ok: false as const, message: COPY.notAuthorized };
  if (backendActive()) {
    const result = await remote.setMealAvailability(id, available);
    if (!result.ok) return { ok: false as const, message: result.message };
    await syncStaffData(actor);
    if (actor.role === 'kitchen') return { ok: true as const, message: COPY.availabilitySaved };
    return { ok: true as const, message: available ? 'Menu item updated' : COPY.notSelectable };
  }
  return setMenuAvailability(actor, id, available);
}

export async function deleteMenuAsync(actor: Actor, id: string) {
  if (!can(actor.role, 'menuManage')) return { ok: false as const, message: COPY.notAuthorized };
  if (backendActive()) {
    const result = await remote.deleteMeal(id);
    if (!result.ok) return { ok: false as const, message: result.message };
    await syncStaffData(actor);
    return { ok: true as const, message: result.value === 'retired' ? COPY.menuRetired : COPY.menuDeleted };
  }
  return deleteMenu(actor, id);
}

export function saveMenu(actor: Actor, id: string | null, draft: MenuDraft) {
  if (!can(actor.role, 'menuManage')) return { ok: false as const, message: COPY.notAuthorized };
  const parsed = draftMenu(draft);
  if (!parsed.ok) return parsed;
  if (!id) {
    const item: MenuItem = { id: nid('menu'), ...parsed.value };
    db.menu.push(item);
    auditChange(actor, 'menu.create', item.id, { summary: `Added ${item.name}`, targetLabel: item.name, newValue: peso(item.price) });
    notifyMenu(`Menu updated: ${item.name}`);
    touch();
    return { ok: true as const, message: COPY.menuAdded };
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
  return { ok: true as const, message: COPY.menuUpdated };
}

export function setMenuAvailability(actor: Actor, id: string, available: boolean) {
  if (!canSetAvailability(actor.role)) return { ok: false as const, message: COPY.notAuthorized };
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
  // KIT-15: a Kitchen availability change notifies the Admin.
  if (actor.role === 'kitchen') {
    emit('admin', `Menu availability updated: ${item.name} is ${available ? 'available' : 'unavailable'}`, undefined, { kind: 'menuUpdated' });
    touch();
    return { ok: true as const, message: COPY.availabilitySaved };
  }
  if (!available) {
    touch();
    return { ok: true as const, message: COPY.notSelectable };
  }
  notifyMenu(`Menu updated: ${item.name}`);
  touch();
  return { ok: true as const, message: 'Menu item updated' };
}

export function deleteMenu(actor: Actor, id: string) {
  if (!can(actor.role, 'menuManage')) return { ok: false as const, message: COPY.notAuthorized };
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

function splitName(name: string) {
  return name.trim();
}

export async function addStaffAsync(actor: Actor, draft: { name: string; email: string; role: StaffRole }) {
  if (!backendActive()) return addStaff(actor, draft);
  if (actor.role !== 'admin') return { ok: false as const, message: COPY.notAuthorized };
  const cleaned = cleanStaff(draft.name, draft.email, draft.role);
  if (!cleaned.ok) return cleaned;
  if (findEmail(cleaned.value.email)) return { ok: false as const, message: COPY.duplicateEmail };
  const result = await remote.manageStaff({ action: 'create', fullName: splitName(cleaned.value.name), email: cleaned.value.email, role: cleaned.value.role });
  if (!result.ok) return { ok: false as const, message: result.message };
  await syncStaffData(actor);
  // The Edge Function sends the set-password invite (ADM-14 #3).
  return { ok: true as const, message: COPY.staffAdded, token: null };
}

export async function updateStaffAsync(actor: Actor, id: string, draft: { name: string; email: string; role: StaffRole }) {
  if (!backendActive()) return updateStaff(actor, id, draft);
  if (actor.role !== 'admin') return { ok: false as const, message: COPY.notAuthorized };
  const preview = previewStaff(id, draft);
  if (!preview.ok) return preview;
  if (!preview.changes.length) return { ok: false as const, message: COPY.nothingChanged };
  const result = await remote.manageStaff({ action: 'update', id, fullName: splitName(draft.name), email: draft.email.trim(), role: draft.role });
  if (!result.ok) return { ok: false as const, message: result.message };
  await syncStaffData(actor);
  return { ok: true as const, message: COPY.staffUpdated };
}

export async function deleteStaffAsync(actor: Actor, id: string) {
  if (!backendActive()) return deleteStaff(actor, id);
  if (actor.role !== 'admin') return { ok: false as const, message: COPY.notAuthorized };
  if (actor.id === id) return { ok: false as const, message: COPY.cannotDeleteSelf };
  const result = await remote.manageStaff({ action: 'delete', id });
  if (!result.ok) return { ok: false as const, message: result.message };
  await syncStaffData(actor);
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

export async function saveRoleNotificationsAsync(
  actor: Actor,
  role: 'kitchen' | 'delivery',
  nextTypes: { newOrder?: boolean; menuUpdated?: boolean; readyForPickup?: boolean },
) {
  if (actor.role !== 'admin') return { ok: false as const, message: COPY.deniedNotifications };
  if (!backendActive()) return saveRoleNotifications(actor, role, nextTypes);
  const types = { ...db.settings[role].types, ...nextTypes };
  const enabled = Object.values(types).some(Boolean);
  const result = await remote.saveNotificationSettings(role, enabled, types as Record<string, boolean>);
  if (!result.ok) return { ok: false as const, message: result.message };
  db.settings[role] = { enabled, types };
  await syncStaffData(actor);
  return { ok: true as const, message: COPY.notificationsSaved };
}

/** Notices for one role; Delivery notices only reach the assigned staff member. */
export function noticesFor(role: StaffRole, viewerId?: string) {
  return db.notices.filter((notice) => (
    notice.audience === role && (!notice.recipientId || !viewerId || notice.recipientId === viewerId)
  ));
}

export function markNoticeRead(accountId: string, noticeId: string) {
  const notice = db.notices.find((row) => row.id === noticeId);
  if (!notice || notice.readBy.includes(accountId)) return;
  notice.readBy.push(accountId);
  touch();
  if (backendActive()) void remote.markStaffNoticeRead(noticeId);
}

export function markAllNoticesRead(role: StaffRole, accountId: string) {
  noticesFor(role, accountId).forEach((notice) => {
    if (!notice.readBy.includes(accountId)) notice.readBy.push(accountId);
  });
  touch();
  if (backendActive()) void remote.markStaffNoticeRead(null);
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

export async function saveProfileAsync(actor: Actor, draft: { name: string; email: string }) {
  if (!backendActive()) return saveProfile(actor, draft);
  const name = draft.name.trim();
  const email = draft.email.trim();
  if (!name || !email) return { ok: false as const, message: COPY.staffRequired };
  if (!isValidEmail(email)) return { ok: false as const, message: COPY.badProfileEmail };
  const emailChanged = email.toLowerCase() !== actor.email.toLowerCase();
  if (name === actor.name && !emailChanged) return { ok: false as const, message: COPY.nothingChanged };
  if (name !== actor.name) {
    const result = await remote.updateOwnStaffName(actor.id, name);
    if (!result.ok) return { ok: false as const, message: result.message };
  }
  if (emailChanged) {
    const result = await remote.requestOwnEmailChange(email);
    if (!result.ok) return { ok: false as const, message: result.message };
  }
  const record = db.staff.find((person) => person.id === actor.id);
  if (record) record.name = name;
  touch();
  return {
    ok: true as const,
    message: emailChanged ? COPY.confirmNewEmail : COPY.profileUpdated,
    // The sign-in email changes only after the confirmation link is opened.
    account: { id: actor.id, name, email: actor.email, role: actor.role, disabled: false, sessionVersion: 1, preferences: record?.preferences ?? { ...DEFAULT_PREFS } },
  };
}

export function savePreferences(actor: Actor, preferences: Preferences) {
  const record = db.staff.find((person) => person.id === actor.id && !person.deleted);
  // Signed in through Supabase without a local record: the app keeps prefs per account on the device.
  if (!record) return { ok: true as const, message: 'Preferences saved', preferences: { ...preferences } };
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

export function sendSupport(actor: Actor, message: string, topic = '') {
  const text = message.trim();
  if (!text) return { ok: false as const, message: COPY.helpEmpty };
  db.support.push({ id: nid('help'), from: actor.email, topic: topic.trim(), message: text, at: new Date().toISOString() });
  auditChange(actor, 'support.message', actor.id, {
    summary: 'Support message sent',
    targetLabel: actor.email,
    newValue: 'sent',
  });
  touch();
  return { ok: true as const, message: COPY.helpSent };
}

/** Live mode stores the message in help_feedback; demo mode keeps it on the device. */
export async function sendSupportAsync(actor: Actor, message: string, topic = '') {
  if (!backendActive()) return sendSupport(actor, message, topic);
  if (!message.trim()) return { ok: false as const, message: COPY.helpEmpty };
  const saved = await remote.sendStaffSupportMessage(actor.id, topic, message);
  if (!saved.ok) return { ok: false as const, message: saved.message };
  return { ok: true as const, message: COPY.helpSent };
}

export function activeOrders() {
  return db.orders.filter((order) =>
    order.status === 'For Dietitian Review'
    || order.status === 'Awaiting Payment'
    || order.status === 'Paid'
    || order.status === 'Preparing',
  );
}

export { formatWhen };

db = build();
