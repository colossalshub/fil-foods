/**
 * Supabase access for the staff app (ADM / DIT / KIT / DEL). Orders and customers come from the
 * role-shaped RPCs in `20261117100000_staff_modules.sql`, so the server decides what each role
 * receives; these mappers only translate rows into the staff app's types.
 */
import type {
  AdminOrder,
  AuditRow,
  Customer,
  DietaryInfo,
  MenuItem,
  RemovalRequest,
  RoleNotificationSetting,
  StaffNotice,
  StaffPublic,
  StaffRole,
} from '../admin/types';
import { clientStatusFromDb, dbStatusFromClient, type ClientOrderStatus } from './orderStatus.js';
import { formatWhen as formatLocalWhen } from '../admin/domain/format.js';
import { ensureSession, isSupabaseConfigured, requireSupabase } from './supabaseClient.js';

type Json = Record<string, unknown>;

export const BACKEND_ROLE: Record<StaffRole, string> = {
  admin: 'owner_admin',
  dietitian: 'dietitian_staff',
  kitchen: 'kitchen_staff',
  delivery: 'delivery_staff',
};

export function staffRoleFromDb(role: string | null | undefined): StaffRole | null {
  switch (role) {
    case 'owner_admin': return 'admin';
    case 'dietitian_staff': return 'dietitian';
    case 'kitchen_staff': return 'kitchen';
    case 'delivery_staff': return 'delivery';
    default: return null;
  }
}

/** Server error codes → the exact messages from the specs. */
const MESSAGES: Record<string, string> = {
  not_authorized: 'You do not have access to this page.',
  not_authenticated: 'Your session has expired. Please log in again.',
  already_decided: 'This request has already been decided.',
  already_reviewed: 'This order has already been reviewed.',
  not_assigned: 'This order is not assigned to you.',
  // Revised KIT-12 AC 4 / DEL-17 AC 5 (new wording).
  payment_not_confirmed: 'This order cannot be prepared until its payment is confirmed.',
  order_not_ready: 'This order is not Ready for Pickup yet.',
  meal_not_found: 'Menu item not found.',
  role_cannot_transition: 'This status change is not allowed for your role.',
  invalid_status_transition: 'That status change is not allowed for this order.',
  not_delivery_staff: 'Choose a delivery staff member.',
  pickup_order_not_assignable: 'Pickup orders are not assigned to Delivery Staff.',
  order_closed: 'Delivered and cancelled orders are read-only.',
  order_not_found: 'This order is no longer available.',
  request_not_found: 'This request is no longer available.',
  customer_not_found: 'This customer is no longer available.',
};

/** Shown when the linked project has not received the staff migrations / Edge Function yet. */
export const SERVER_OUTDATED = 'Live staff data is not available yet: the server is missing the staff database update (migration 20261117100000_staff_modules and later). Ask the admin to apply it, then pull to refresh.';
export const STAFF_FUNCTION_MISSING = 'Staff management is not installed on the server yet (Edge Function admin-staff). Ask the admin to deploy it.';

export function isServerOutdated(error: { message?: string; code?: string } | string | null | undefined) {
  const raw = typeof error === 'string' ? error : `${error?.code ?? ''} ${error?.message ?? ''}`;
  return /PGRST202|PGRST205|Could not find the (function|table)|schema cache/i.test(raw);
}

export function backendMessage(error: { message?: string; code?: string } | string | null | undefined, reasonContext: 'order' | 'removal' = 'order') {
  if (isServerOutdated(error)) return SERVER_OUTDATED;
  const raw = typeof error === 'string' ? error : error?.message || '';
  if (/Requested function was not found|NOT_FOUND|FunctionsHttpError.*404/i.test(raw)) return STAFF_FUNCTION_MISSING;
  if (raw.includes('reason_required')) {
    return reasonContext === 'removal'
      ? 'Please enter a reason for rejecting this request.'
      : 'Please enter a reason for returning this order.';
  }
  const code = Object.keys(MESSAGES).find((key) => raw.includes(key));
  if (code) return MESSAGES[code];
  if (/network|fetch|failed to fetch/i.test(raw)) return 'Could not connect';
  return raw || 'Could not connect';
}

/** Meals the customer app offers today, including the dinner copies of the lunch plates. */
const CUSTOMER_MENU_KEYS = new Set([
  'menu-traditional-pandesal', 'traditional-pandesal',
  'menu-lunch-beef', 'plate-lunch-beef',
  'menu-lunch-pork', 'plate-lunch-pork',
  'menu-lunch-chicken', 'plate-lunch-chicken',
  'menu-lunch-steamed', 'plate-lunch-veg-steamed',
  'menu-dinner-beef', 'plate-dinner-beef',
  'menu-dinner-pork', 'plate-dinner-pork',
  'menu-dinner-chicken', 'plate-dinner-chicken',
  'menu-dinner-steamed', 'plate-dinner-veg-steamed',
]);

/** Names whose bundled photo is stored under a different key than the label. */
const PHOTO_KEY_BY_NAME: Record<string, string> = {
  'traditional pandesal': 'traditional-pandesal',
  'sugar free ube pandesal': 'sugar-free-ube-pandesal',
  'whole wheat pandesal': 'whole-wheat-pandesal',
  monay: 'menu-monay',
  'spanish bread': 'menu-spanish-bread',
  ensaymada: 'menu-ensaymada',
  'cheese bread': 'menu-cheese-bread',
  piaya: 'menu-piaya',
};

export function isCustomerMenuMeal(clientMealKey: string | null | undefined) {
  return !!clientMealKey && CUSTOMER_MENU_KEYS.has(clientMealKey);
}

/** Photo key for a picture already bundled with the customer menu. */
export function photoKeyFor(name: string, mealKey?: string | null) {
  const label = name.trim();
  const named = PHOTO_KEY_BY_NAME[label.toLowerCase()];
  if (named) return named;
  if (label) return label;
  const key = mealKey?.trim();
  return key && CUSTOMER_MENU_KEYS.has(key) ? key : '';
}

function formatWhen(iso: string | undefined) {
  return iso ? formatLocalWhen(iso) : '';
}

function text(value: unknown) {
  return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
}

export function mapDietary(raw: unknown): DietaryInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Json;
  const nutrition = (row.nutrition ?? {}) as Json;
  return {
    allergies: Array.isArray(row.allergies)
      ? (row.allergies as Json[]).map((item) => ({ value: text(item.value), note: item.note ? text(item.note) : null }))
      : [],
    conditions: Array.isArray(row.conditions) ? (row.conditions as unknown[]).map(text) : [],
    restrictions: Array.isArray(row.restrictions) ? (row.restrictions as unknown[]).map(text) : [],
    nutrition: {
      supplied: Boolean(nutrition.supplied),
      lowerCalories: Boolean(nutrition.lower_calories),
      higherProtein: Boolean(nutrition.higher_protein),
      lowerSodium: Boolean(nutrition.lower_sodium),
      lowerSugar: Boolean(nutrition.lower_sugar),
    },
    updatedAt: row.updated_at ? text(row.updated_at) : null,
  };
}

export function mapStaffOrder(row: Json): AdminOrder {
  const items = Array.isArray(row.items) ? (row.items as Json[]) : [];
  const mappedItems = items.map((item) => ({
    name: text(item.name) || 'Meal',
    quantity: Number(item.quantity) || 1,
    unitPrice: item.unit_price === undefined || item.unit_price === null ? null : Number(item.unit_price),
    mealKey: item.meal_key ? text(item.meal_key) : null,
  }));
  const firstName = text(row.first_name) || 'Customer';
  const created = text(row.created_at);
  const delivery = row.delivery as Json | undefined;
  const history = Array.isArray(row.history) ? (row.history as Json[]) : [];
  return {
    id: text(row.id),
    orderNo: row.order_no === null || row.order_no === undefined ? null : Number(row.order_no),
    clientId: row.client_id ? text(row.client_id) : null,
    // display_no carries the ORD- reference since 20261119110000_order_reference.sql.
    orderRef: row.order_ref ? text(row.order_ref) : (text(row.display_no).startsWith('ORD-') ? text(row.display_no) : undefined),
    trackingNumber: row.tracking_number && row.fulfillment_type === 'delivery' ? text(row.tracking_number) : undefined,
    firstName,
    customerName: text(row.customer_name) || firstName,
    accountHolderName: row.account_holder_name ? text(row.account_holder_name) : null,
    customerEmail: row.customer_email ? text(row.customer_email) : null,
    status: clientStatusFromDb(text(row.status)),
    fulfillment: row.fulfillment_type === 'pick_up' ? 'pick_up' : 'delivery',
    price: row.total === undefined || row.total === null ? 0 : Number(row.total),
    placedAt: created || new Date().toISOString(),
    when: formatWhen(created),
    photo: photoKeyFor(mappedItems[0]?.name || '', mappedItems[0]?.mealKey),
    lines: mappedItems.map((item) => ({ name: item.name, price: (item.unitPrice ?? 0) * item.quantity })),
    items: mappedItems,
    assigneeId: row.assigned_delivery_id ? text(row.assigned_delivery_id) : null,
    assigneeName: row.assignee_name ? text(row.assignee_name) : null,
    reviewDecision: row.review_decision === 'approved' || row.review_decision === 'returned' ? row.review_decision : null,
    reviewReason: row.review_reason ? text(row.review_reason) : null,
    specialInstructions: row.special_instructions ? text(row.special_instructions) : null,
    dietary: row.dietary ? mapDietary(row.dietary) : undefined,
    delivery: delivery
      ? {
        firstName: text(delivery.first_name) || firstName,
        contactNumber: delivery.contact_number ? text(delivery.contact_number) : null,
        address: delivery.address ? text(delivery.address) : null,
        notes: delivery.notes ? text(delivery.notes) : null,
      }
      : undefined,
    wasPaid: true,
    updates: history.map((entry) => ({
      at: text(entry.changed_at),
      by: text(entry.changed_by) || 'Customer',
      summary: clientStatusFromDb(text(entry.status)),
    })),
  };
}

export function mapCustomer(row: Json): Customer {
  const history = Array.isArray(row.history) ? (row.history as Json[]) : [];
  const first = text(row.first_name) || text(row.name).split(' ')[0] || 'Customer';
  return {
    id: text(row.id),
    name: text(row.name) || first,
    firstName: first,
    email: text(row.email),
    accountHolderName: row.account_holder_name ? text(row.account_holder_name) : null,
    dietary: mapDietary(row.dietary),
    allergies: (mapDietary(row.dietary)?.allergies ?? []).map((item) => item.value),
    nutrition: [],
    sodiumConflict: null,
    history: history.map((entry) => ({
      orderId: text(entry.id),
      at: formatWhen(text(entry.created_at)),
      name: Array.isArray(entry.items) && entry.items.length ? (entry.items as unknown[]).map(text).join(', ') : text(entry.display_no),
      status: clientStatusFromDb(text(entry.status)),
      price: Number(entry.total) || 0,
    })),
  };
}

export function mapRemovalRequest(row: Json): RemovalRequest & { dietary?: DietaryInfo | null } {
  return {
    id: text(row.id),
    clientId: text(row.client_id),
    recipientName: text(row.recipient_name),
    condition: text(row.condition),
    reason: row.reason ? text(row.reason) : null,
    requestedBy: text(row.requested_by),
    requestedAt: text(row.requested_at),
    status: row.status === 'approved' || row.status === 'rejected' ? row.status : 'pending',
    decisionReason: row.decision_reason ? text(row.decision_reason) : null,
    decidedAt: row.decided_at ? text(row.decided_at) : null,
    decidedBy: row.decided_by ? text(row.decided_by) : null,
    dietary: row.dietary ? mapDietary(row.dietary) : undefined,
  };
}

const AUDIT_SUMMARY: Record<string, string> = {
  order_created: 'Order created',
  order_status_changed: 'Order status changed',
  order_assigned: 'Delivery staff assigned',
  order_reviewed: 'Dietitian reviewed an order',
  'menu.insert': 'Menu item added',
  'menu.update': 'Menu item updated',
  'menu.delete': 'Menu item deleted',
  'staff.create': 'Staff added',
  'staff.update': 'Staff updated',
  'staff.delete': 'Staff deleted',
  'staff_notifications.updated': 'Notification settings changed',
  'health_condition_removal.requested': 'Health condition removal requested',
  'health_condition_removal.decided': 'Decided a health-condition removal request',
};

function stringify(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function mapAuditRow(row: Json): AuditRow {
  const details = (row.details ?? {}) as Json;
  const action = text(row.event_type);
  const target = text(details.name) || text(details.recipient)
    || (details.order_no ? `Order #${String(details.order_no).padStart(5, '0')}` : '')
    || text(details.email) || text(details.role);
  return {
    id: text(row.id),
    at: text(row.occurred_at),
    action,
    accountName: text(row.actor_name) || (row.actor_email ? text(row.actor_email) : 'System'),
    accountEmail: text(row.actor_email),
    summary: AUDIT_SUMMARY[action] || action,
    target: details.condition ? `${target} · ${text(details.condition)}` : target,
    setting: text(details.setting),
    role: text(details.role) || text(row.actor_role),
    oldValue: stringify(details.old_value ?? (action.endsWith('decided') ? 'requested' : '')),
    newValue: stringify(details.new_value ?? details.decision ?? details.status ?? ''),
  };
}

export function mapNotice(row: Json, role: StaffRole, viewerId: string): StaffNotice {
  return {
    id: text(row.id),
    audience: role,
    title: text(row.title),
    body: text(row.body),
    kind: text(row.kind),
    orderId: row.order_id ? text(row.order_id) : undefined,
    requestId: row.request_id ? text(row.request_id) : undefined,
    readBy: row.read_at ? [viewerId] : [],
    createdAt: text(row.created_at),
  };
}

export function mapMeal(row: Json): MenuItem {
  return {
    id: text(row.id),
    name: text(row.name),
    category: text(row.category),
    ingredients: Array.isArray(row.ingredients) ? (row.ingredients as unknown[]).map(text) : [],
    allergens: Array.isArray(row.allergens) ? (row.allergens as unknown[]).map(text) : [],
    price: Number(row.price),
    available: row.is_available !== false,
  };
}

export function mapStaffProfile(row: Json): StaffPublic | null {
  const role = staffRoleFromDb(text(row.role));
  if (!role) return null;
  return {
    id: text(row.id),
    name: `${text(row.first_name)} ${text(row.last_name)}`.trim() || text(row.email),
    email: text(row.email),
    role,
    disabled: row.is_active === false,
    sessionVersion: 1,
    preferences: { language: 'en', appearance: 'light' },
  };
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

async function authHeader() {
  const session = await ensureSession();
  if (!session?.access_token) throw new Error('not_authenticated');
  return `Bearer ${session.access_token}`;
}

async function rpc<T>(name: string, args: Json = {}, context: 'order' | 'removal' = 'order'): Promise<Result<T>> {
  if (!isSupabaseConfigured) return { ok: false, message: 'Backend not configured.' };
  try {
    const { data, error } = await requireSupabase().rpc(name, args).setHeader('Authorization', await authHeader());
    if (error) return { ok: false, message: backendMessage(error, context) };
    return { ok: true, value: data as T };
  } catch (error) {
    return { ok: false, message: backendMessage(error as Error, context) };
  }
}

export async function fetchStaffOrders() {
  const result = await rpc<Json[]>('staff_orders');
  return result.ok ? { ok: true as const, value: (result.value || []).map(mapStaffOrder) } : result;
}

export async function fetchStaffOrderDetail(orderId: string) {
  const result = await rpc<Json>('staff_order_detail', { p_order_id: orderId });
  return result.ok ? { ok: true as const, value: mapStaffOrder(result.value) } : result;
}

export async function fetchStaffCustomers() {
  const result = await rpc<Json[]>('staff_customers');
  return result.ok ? { ok: true as const, value: (result.value || []).map(mapCustomer) } : result;
}

export async function fetchStaffCustomerDetail(clientId: string) {
  const result = await rpc<Json>('staff_customer_detail', { p_client_id: clientId });
  return result.ok ? { ok: true as const, value: mapCustomer(result.value) } : result;
}

export async function fetchAuditLog(limit = 200) {
  const result = await rpc<Json[]>('admin_audit_log', { p_limit: limit });
  return result.ok ? { ok: true as const, value: (result.value || []).map(mapAuditRow) } : result;
}

export async function fetchRemovalRequests(status: string | null = null) {
  const result = await rpc<Json[]>('dietitian_removal_requests', { p_status: status });
  return result.ok ? { ok: true as const, value: (result.value || []).map(mapRemovalRequest) } : result;
}

export async function fetchRemovalRequestDetail(id: string) {
  const result = await rpc<Json>('dietitian_removal_request_detail', { p_id: id });
  return result.ok ? { ok: true as const, value: mapRemovalRequest(result.value) } : result;
}

async function select<T>(build: () => PromiseLike<{ data: unknown; error: { message?: string } | null }>): Promise<Result<T>> {
  if (!isSupabaseConfigured) return { ok: false, message: 'Backend not configured.' };
  try {
    const { data, error } = await build();
    if (error) return { ok: false, message: backendMessage(error) };
    return { ok: true, value: data as T };
  } catch (error) {
    return { ok: false, message: backendMessage(error as Error) };
  }
}

export async function fetchMenu() {
  const header = await authHeader().catch(() => '');
  const result = await select<Json[]>(() => requireSupabase()
    .from('meals')
    .select('id, name, category, ingredients, allergens, price, is_available, client_meal_key')
    .order('name')
    .setHeader('Authorization', header));
  if (!result.ok) return result;
  const rows = (result.value || []).filter((row) => isCustomerMenuMeal(text(row.client_meal_key)));
  return { ok: true as const, value: rows.map(mapMeal) };
}

export async function fetchStaffDirectory() {
  const header = await authHeader().catch(() => '');
  const result = await select<Json[]>(() => requireSupabase()
    .from('profiles')
    .select('id, first_name, last_name, email, role, is_active')
    .in('role', ['owner_admin', 'dietitian_staff', 'kitchen_staff', 'delivery_staff'])
    .eq('is_active', true)
    .order('first_name')
    .setHeader('Authorization', header));
  return result.ok
    ? { ok: true as const, value: (result.value || []).map(mapStaffProfile).filter((row): row is StaffPublic => !!row) }
    : result;
}

export async function fetchStaffNotices(role: StaffRole, viewerId: string) {
  const header = await authHeader().catch(() => '');
  const result = await select<Json[]>(() => requireSupabase()
    .from('staff_notifications')
    .select('id, kind, title, body, order_id, request_id, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
    .setHeader('Authorization', header));
  return result.ok ? { ok: true as const, value: (result.value || []).map((row) => mapNotice(row, role, viewerId)) } : result;
}

export async function fetchNotificationSettings() {
  const header = await authHeader().catch(() => '');
  const result = await select<Json[]>(() => requireSupabase()
    .from('settings')
    .select('key, value')
    .eq('key', 'staff_notifications')
    .setHeader('Authorization', header));
  if (!result.ok) return result;
  const value = (result.value?.[0]?.value ?? null) as { kitchen?: RoleNotificationSetting; delivery?: RoleNotificationSetting } | null;
  return { ok: true as const, value };
}

export async function fetchOwnStaffProfile(userId: string) {
  const header = await authHeader().catch(() => '');
  const result = await select<Json[]>(() => requireSupabase()
    .from('profiles')
    .select('id, first_name, last_name, email, role, is_active')
    .eq('id', userId)
    .setHeader('Authorization', header));
  if (!result.ok) return result;
  const row = result.value?.[0];
  return { ok: true as const, value: row ? mapStaffProfile(row) : null };
}

export function transitionOrder(orderId: string, status: ClientOrderStatus) {
  return rpc<Json>('transition_order_status', { p_order_id: orderId, p_new_status: dbStatusFromClient(status) });
}

export function reviewOrder(orderId: string, approve: boolean, reason: string | null) {
  return rpc<Json>('dietitian_review_order', { p_order_id: orderId, p_approve: approve, p_reason: reason });
}

export function assignDeliveryStaff(orderId: string, staffId: string) {
  return rpc<Json>('assign_delivery_staff', { p_order_id: orderId, p_staff_id: staffId });
}

export function decideRemoval(id: string, approve: boolean, reason: string | null) {
  return rpc<Json>('decide_health_condition_removal', { p_id: id, p_approve: approve, p_reason: reason }, 'removal');
}

export function markStaffNoticeRead(id: string | null) {
  return rpc<number>('mark_staff_notification_read', { p_id: id });
}

export function saveNotificationSettings(role: 'kitchen' | 'delivery', enabled: boolean, types: Record<string, boolean>) {
  return rpc<Json>('save_staff_notification_settings', { p_role: role, p_enabled: enabled, p_types: types });
}

export async function upsertMeal(
  id: string | null,
  payload: { name: string; category: string; ingredients: string[]; allergens: string[]; price: number; available: boolean },
) {
  const header = await authHeader().catch(() => '');
  const row = {
    name: payload.name,
    category: payload.category,
    ingredients: payload.ingredients,
    allergens: payload.allergens,
    price: payload.price,
    is_available: payload.available,
  };
  if (id) {
    const result = await select<null>(() => requireSupabase().from('meals').update(row).eq('id', id).setHeader('Authorization', header));
    return result.ok ? { ok: true as const, value: id } : result;
  }
  const result = await select<Json>(() => requireSupabase().from('meals').insert(row).select('id').single().setHeader('Authorization', header));
  return result.ok ? { ok: true as const, value: text(result.value?.id) } : result;
}

/** KIT-15: availability goes through set_meal_availability (Kitchen or Admin); it notifies the Admin
 * when Kitchen changes it. Direct table writes on meals are Admin-only. */
export async function setMealAvailability(id: string, available: boolean) {
  const result = await rpc<Json>('set_meal_availability', { p_meal_id: id, p_available: available });
  return result.ok ? { ok: true as const, value: null } : result;
}

async function retireMeal(id: string) {
  const header = await authHeader().catch(() => '');
  return select<null>(() => requireSupabase().from('meals').update({ is_available: false }).eq('id', id).setHeader('Authorization', header));
}

/** Deletes a meal; meals already on past orders are made unavailable instead (order history keeps them). */
export async function deleteMeal(id: string): Promise<Result<'deleted' | 'retired'>> {
  const header = await authHeader().catch(() => '');
  const removed = await select<null>(() => requireSupabase().from('meals').delete().eq('id', id).setHeader('Authorization', header));
  if (removed.ok) return { ok: true, value: 'deleted' };
  if (!/foreign key|violates|23503/i.test(removed.message)) return removed;
  const retired = await retireMeal(id);
  return retired.ok ? { ok: true, value: 'retired' } : retired;
}

export async function manageStaff(body: Json): Promise<Result<Json>> {
  if (!isSupabaseConfigured) return { ok: false, message: 'Backend not configured.' };
  try {
    const { data, error } = await requireSupabase().functions.invoke('admin-staff', {
      body,
      headers: { Authorization: await authHeader() },
    });
    if (error) {
      const context = (error as { context?: Response }).context;
      if (context?.status === 404) return { ok: false, message: STAFF_FUNCTION_MISSING };
      let message = error.message;
      if (context && typeof context.json === 'function') {
        try {
          const payload = await context.json() as { message?: string };
          if (payload?.message) message = payload.message;
        } catch {
          // keep the generic message
        }
      }
      return { ok: false, message: backendMessage(message) };
    }
    return { ok: true, value: (data ?? {}) as Json };
  } catch (error) {
    return { ok: false, message: backendMessage(error as Error) };
  }
}

export async function sendStaffPasswordReset(email: string) {
  if (!isSupabaseConfigured) return { ok: false as const, message: 'Backend not configured.' };
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim());
  return error ? { ok: false as const, message: backendMessage(error) } : { ok: true as const };
}

export async function updateOwnStaffName(userId: string, fullName: string) {
  const header = await authHeader().catch(() => '');
  const parts = fullName.trim().split(/\s+/);
  const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  return select<null>(() => requireSupabase()
    .from('profiles')
    .update({ first_name: first, last_name: last })
    .eq('id', userId)
    .setHeader('Authorization', header));
}

/** DIT/KIT/DEL-08: staff Help & Support messages are stored in help_feedback with their topic. */
export async function sendStaffSupportMessage(userId: string, topic: string, message: string) {
  const header = await authHeader().catch(() => '');
  return select<null>(() => requireSupabase()
    .from('help_feedback')
    .insert({ client_id: userId, topic: topic.trim() || null, message: message.trim() })
    .setHeader('Authorization', header));
}

/** Own email change: Supabase emails a confirmation link; a DB trigger copies the confirmed email to `profiles`. */
export async function requestOwnEmailChange(email: string) {
  if (!isSupabaseConfigured) return { ok: false as const, message: 'Backend not configured.' };
  try {
    await ensureSession();
    const { error } = await requireSupabase().auth.updateUser({ email: email.trim().toLowerCase() });
    return error ? { ok: false as const, message: backendMessage(error) } : { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: backendMessage(error as Error) };
  }
}
