import type { AuthTokenSession } from '../types.js';
import { ensureSession, requireSupabase } from '../../lib/supabaseClient.js';
import { cleanSpecialRequest } from '../domain/specialRequest.js';
import { SPECIAL_REQUEST_COPY } from '../data/messages.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PlaceOrderLineItem {
  mealId?: string;
  mealName?: string;
  mealCategory?: string;
  quantity: number;
  specialRequest?: { options: string[]; note: string } | null;
}

interface BackendMealLookupRow {
  id: string;
  name: string;
  category?: string;
  client_meal_key?: string | null;
}

export function resolveBackendMealId(
  item: PlaceOrderLineItem,
  rows: BackendMealLookupRow[],
): string | undefined {
  const byKey = new Map<string, string>();
  const byNameCategory = new Map<string, string>();
  const byName = new Map<string, string>();
  rows.forEach((row) => {
    if (row.client_meal_key) byKey.set(row.client_meal_key, row.id);
    const nameCategoryKey = `${row.name}\u0000${row.category || ''}`;
    byNameCategory.set(nameCategoryKey, row.id);
    if (!byName.has(row.name)) byName.set(row.name, row.id);
  });

  if (item.mealId && byKey.has(item.mealId)) {
    return byKey.get(item.mealId);
  }
  if (item.mealName && item.mealCategory) {
    const hit = byNameCategory.get(`${item.mealName}\u0000${item.mealCategory}`);
    if (hit) return hit;
  }
  if (item.mealName && byName.has(item.mealName)) {
    return byName.get(item.mealName);
  }
  if (item.mealId && UUID_RE.test(item.mealId)) {
    return item.mealId;
  }
  return undefined;
}

export async function placeOrderWithBackend({
  authSession,
  clientRequestId,
  fulfillmentType,
  schedule,
  address,
  specialInstructions,
  items,
  planId,
  resubmitOrderId,
}: {
  planId?: string | null;
  /** Revised USR-23: edit this Returned for Changes order instead of placing a new one. */
  resubmitOrderId?: string | null;
  authSession?: AuthTokenSession | null;
  clientRequestId: string;
  fulfillmentType?: string | null;
  schedule: string;
  address?: string | null;
  specialInstructions?: string | null;
  items: PlaceOrderLineItem[];
}) {
  const client = requireSupabase();
  const session = await ensureSession(authSession)
    || (authSession?.access_token ? authSession : null);
  if (!session?.access_token) {
    throw new Error('Your session has expired. Please log in again.');
  }
  const authorization = `Bearer ${session.access_token}`;
  const mealKeys = [...new Set(items.map(({ mealId }) => mealId).filter(Boolean))] as string[];
  const mealNames = [...new Set(items.map(({ mealName }) => mealName).filter(Boolean))] as string[];

  const selectFields = 'id, name, category, client_meal_key';
  const mealRows = new Map<string, BackendMealLookupRow>();
  const collect = (rows: BackendMealLookupRow[] | null) => {
    (rows || []).forEach((row) => mealRows.set(row.id, row));
  };
  if (mealKeys.length) {
    const { data, error } = await client
      .from('meals')
      .select(selectFields)
      .eq('is_available', true)
      .in('client_meal_key', mealKeys)
      .setHeader('Authorization', authorization);
    if (error) throw error;
    collect(data as BackendMealLookupRow[]);
  }
  if (mealNames.length) {
    const { data, error } = await client
      .from('meals')
      .select(selectFields)
      .eq('is_available', true)
      .in('name', mealNames)
      .setHeader('Authorization', authorization);
    if (error) throw error;
    collect(data as BackendMealLookupRow[]);
  }
  const meals = [...mealRows.values()];

  const backendItems = items.map((item) => {
    const backendMealId = resolveBackendMealId(item, meals);
    if (!backendMealId || !UUID_RE.test(backendMealId)) {
      throw new Error(`Meal "${item.mealName || item.mealId}" is not available in the backend catalog.`);
    }
    const request = cleanSpecialRequest(item.specialRequest);
    const line = item.mealCategory
      ? { meal_id: backendMealId, quantity: item.quantity, meal_time: item.mealCategory }
      : { meal_id: backendMealId, quantity: item.quantity };
    return request ? { ...line, special_request: request } : line;
  });

  const common = {
    p_fulfillment_type: fulfillmentType === 'delivery' ? 'delivery' : 'pick_up',
    p_schedule: schedule,
    p_address: address || null,
    p_special_instructions: specialInstructions || null,
    p_items: backendItems,
    p_plan_id: planId && planId !== 'standard' ? planId : null,
  };
  const { data, error } = resubmitOrderId
    ? await client.rpc('resubmit_order', { p_order_id: resubmitOrderId, ...common }).setHeader('Authorization', authorization)
    : await client.rpc('place_order', { p_client_request_id: clientRequestId, ...common }).setHeader('Authorization', authorization);
  if (error) throw new Error(backendOrderErrorMessage(error));
  return Array.isArray(data) ? data[0] : data;
}

const ORDER_ERRORS: Record<string, string> = {
  not_authenticated: 'Your session has expired. Please log in again.',
  account_not_ready: 'Please verify your account before placing an order.',
  items_required: 'Add at least one meal to your order.',
  bad_quantity: 'Enter a valid quantity.',
  one_meal_per_time: 'You can choose only one meal for that meal time.',
  max_meals_per_day: 'You can choose a maximum of three meals per day.',
  meal_unavailable: 'One of the selected meals is no longer available.',
  plan_unavailable: 'The selected plan is not available. Please choose another plan.',
  lead_time: 'Please choose a time at least 24 hours from now.',
  kitchen_closed: 'The kitchen is closed at that time. Orders can be scheduled Monday to Saturday, 7:00 AM to 6:00 PM.',
  address_required: 'Please enter a delivery address.',
  order_not_returned: 'This order was already resubmitted.',
  order_not_found: 'This order is no longer available.',
  special_request_too_long: SPECIAL_REQUEST_COPY.tooLong,
  special_request_allergen: SPECIAL_REQUEST_COPY.allergen,
  recipient_name_required: "Please enter the meal recipient's first and last name.",
  invalid_contact: 'Please enter a valid 11-digit contact number.',
};

/** Turns place_order / save_meal_recipient error codes into the user-facing wording. */
export function backendOrderErrorMessage(error: { message?: string } | null | undefined) {
  const raw = String(error?.message || '').trim();
  if (raw.startsWith('allergen_conflict:')) {
    return `A selected meal contains ${raw.slice('allergen_conflict:'.length).trim()}, which is listed in the profile.`;
  }
  return ORDER_ERRORS[raw] || raw || 'Unable to place order.';
}

/** Family Member accounts: keep the meal recipient on the server so staff deliver to the right person. */
export async function saveMealRecipientWithBackend(
  recipient: {
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
    contactNumber?: string;
    relationship?: string;
    deliveryAddress?: string;
  },
  authSession?: AuthTokenSession | null,
) {
  const client = requireSupabase();
  const session = await ensureSession(authSession)
    || (authSession?.access_token ? authSession : null);
  if (!session?.access_token) throw new Error('Your session has expired. Please log in again.');
  const { data, error } = await client.rpc('save_meal_recipient', {
    p_recipient: {
      first_name: recipient.firstName,
      middle_name: recipient.middleName || null,
      last_name: recipient.lastName,
      suffix: recipient.suffix || null,
      contact_number: recipient.contactNumber || null,
      relationship: recipient.relationship || null,
      address: recipient.deliveryAddress || null,
    },
  }).setHeader('Authorization', `Bearer ${session.access_token}`);
  if (error) throw new Error(backendOrderErrorMessage(error));
  return data;
}

export async function getClientOrders() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('orders')
    .select('*, order_items(*, meals(*)), order_status_history(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getClientOrderById(orderId: string) {
  const { data, error } = await requireSupabase()
    .from('orders')
    .select('*, order_items(*, meals(*)), order_status_history(*)')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getClientNotifications() {
  const { data, error } = await requireSupabase()
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function payOrderOnBackend(orderId: string, authSession?: AuthTokenSession | null) {
  const client = requireSupabase();
  const session = await ensureSession(authSession);
  if (!session?.access_token) {
    throw new Error('Your session has expired. Please log in again.');
  }
  const { data, error } = await client
    .rpc('pay_order', { p_order_id: orderId })
    .setHeader('Authorization', `Bearer ${session.access_token}`);
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

const orderListeners = new Set<() => void>();
let orderChannel: ReturnType<ReturnType<typeof requireSupabase>['channel']> | null = null;

function publishOrderChange() {
  orderListeners.forEach((listener) => listener());
}

export function subscribeToClientOrders(onChange: () => void) {
  const client = requireSupabase();
  orderListeners.add(onChange);
  if (!orderChannel) {
    orderChannel = client
      .channel('client-order-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, publishOrderChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, publishOrderChange);
    ensureSession().then((session) => {
      if (!orderChannel) return;
      if (session?.access_token) client.realtime.setAuth(session.access_token);
      orderChannel.subscribe();
    });
  }
  return () => {
    orderListeners.delete(onChange);
    if (orderListeners.size === 0 && orderChannel) {
      client.removeChannel(orderChannel);
      orderChannel = null;
    }
  };
}