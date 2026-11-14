import type { AuthTokenSession } from '../types.js';
import { ensureSession, requireSupabase } from '../../lib/supabaseClient.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PlaceOrderLineItem {
  mealId?: string;
  mealName?: string;
  mealCategory?: string;
  quantity: number;
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
}: {
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
    return { meal_id: backendMealId, quantity: item.quantity };
  });

  const { data, error } = await client.rpc('place_order', {
    p_client_request_id: clientRequestId,
    p_fulfillment_type: fulfillmentType === 'delivery' ? 'delivery' : 'pick_up',
    p_schedule: schedule,
    p_address: address || null,
    p_special_instructions: specialInstructions || null,
    p_items: backendItems,
  }).setHeader('Authorization', authorization);
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
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

export function subscribeToClientOrders(onChange: () => void) {
  const client = requireSupabase();
  const channel = client
    .channel('client-orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}