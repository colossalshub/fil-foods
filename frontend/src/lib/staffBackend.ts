import type { AdminOrder, MenuItem, StaffRole } from '../admin/types';
import {
  CLIENT_ORDER_STATUS,
  clientStatusFromDb,
  dbStatusFromClient,
  STAFF_WORKFLOW_STATUSES,
  type ClientOrderStatus,
} from './orderStatus.js';
import { ensureSession, isSupabaseConfigured, requireSupabase } from './supabaseClient.js';

interface BackendOrderRow {
  id: string;
  tracking_number: string;
  status?: string;
  created_at?: string;
  total: number | string;
  fulfillment_type?: string;
  client_id?: string;
  profiles?: { first_name?: string; last_name?: string } | null;
  order_items?: Array<{
    quantity: number;
    unit_price: number | string;
    meals?: { name?: string } | null;
  }>;
  order_status_history?: Array<{ status?: string; changed_at?: string; changed_by?: string }>;
}

interface BackendMealRow {
  id: string;
  name: string;
  category: string;
  ingredients?: string[];
  allergens?: string[];
  price: number | string;
  is_available?: boolean;
}

const PHOTO_BY_NAME: Record<string, string> = {
  'grilled chicken wrap': 'wrap',
  'greek chickpea salad': 'salad',
  'salmon teriyaki rice': 'salmon',
  'egg white omelette': 'omelette',
  'grilled bangus': 'bangus',
};

function photoKeyForMeal(name: string): string {
  return PHOTO_BY_NAME[name.trim().toLowerCase()] || 'wrap';
}

function formatWhen(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function mapBackendOrderToAdmin(row: BackendOrderRow): AdminOrder {
  const profile = row.profiles;
  const customerName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || 'Customer'
    : 'Customer';
  const lines = (row.order_items || []).map((item) => ({
    name: item.meals?.name || 'Meal',
    price: Number(item.unit_price),
  }));
  const firstMeal = lines[0]?.name || '';
  return {
    id: row.id,
    trackingNumber: row.tracking_number,
    customerName,
    status: clientStatusFromDb(row.status),
    price: Number(row.total),
    placedAt: row.created_at || new Date().toISOString(),
    when: formatWhen(row.created_at),
    photo: photoKeyForMeal(firstMeal),
    lines,
    assigneeId: null,
    assigneeName: null,
    updates: (row.order_status_history || []).map((entry) => ({
      at: entry.changed_at || '',
      by: 'System',
      summary: clientStatusFromDb(entry.status),
    })),
  };
}

export function mapBackendMealToAdmin(row: BackendMealRow): MenuItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    ingredients: row.ingredients || [],
    allergens: row.allergens || [],
    price: Number(row.price),
    available: row.is_available !== false,
  };
}

async function staffHeaders() {
  const session = await ensureSession();
  if (!session?.access_token) throw new Error('Staff backend session expired.');
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function fetchStaffOrdersFromBackend(): Promise<AdminOrder[]> {
  if (!isSupabaseConfigured) return [];
  const headers = await staffHeaders();
  const { data, error } = await requireSupabase()
    .from('orders')
    .select(`
      id, tracking_number, status, created_at, total, fulfillment_type, client_id,
      profiles:client_id (first_name, last_name),
      order_items (quantity, unit_price, meals (name)),
      order_status_history (status, changed_at, changed_by)
    `)
    .order('created_at', { ascending: false })
    .setHeader('Authorization', headers.Authorization);
  if (error) throw error;
  return (data as BackendOrderRow[] || []).map(mapBackendOrderToAdmin);
}

export async function fetchStaffMenuFromBackend(): Promise<MenuItem[]> {
  if (!isSupabaseConfigured) return [];
  const headers = await staffHeaders();
  const { data, error } = await requireSupabase()
    .from('meals')
    .select('id, name, category, ingredients, allergens, price, is_available')
    .order('name')
    .setHeader('Authorization', headers.Authorization);
  if (error) throw error;
  return (data as BackendMealRow[] || []).map(mapBackendMealToAdmin);
}

export async function transitionOrderOnBackend(orderId: string, status: ClientOrderStatus) {
  if (!isSupabaseConfigured) return { ok: false as const, message: 'Backend not configured.' };
  const headers = await staffHeaders();
  const dbStatus = dbStatusFromClient(status);
  const { data, error } = await requireSupabase()
    .rpc('transition_order_status', {
      p_order_id: orderId,
      p_new_status: dbStatus,
    })
    .setHeader('Authorization', headers.Authorization);
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, row: data };
}

export async function upsertMealOnBackend(
  id: string | null,
  payload: {
    name: string;
    category: string;
    ingredients: string[];
    allergens: string[];
    price: number;
    available: boolean;
  },
) {
  if (!isSupabaseConfigured) return { ok: false as const, message: 'Backend not configured.' };
  const headers = await staffHeaders();
  const row = {
    name: payload.name,
    category: payload.category,
    ingredients: payload.ingredients,
    allergens: payload.allergens,
    price: payload.price,
    is_available: payload.available,
  };
  if (id) {
    const { error } = await requireSupabase()
      .from('meals')
      .update(row)
      .eq('id', id)
      .setHeader('Authorization', headers.Authorization);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, id };
  }
  const { data, error } = await requireSupabase()
    .from('meals')
    .insert(row)
    .select('id')
    .single()
    .setHeader('Authorization', headers.Authorization);
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, id: data.id as string };
}

export function statusesForStaffRole(role: StaffRole): ClientOrderStatus[] {
  switch (role) {
    case 'dietitian':
      return [
        CLIENT_ORDER_STATUS.AWAITING_PAYMENT,
        CLIENT_ORDER_STATUS.CANCELLED,
      ];
    case 'kitchen':
      return [
        STAFF_WORKFLOW_STATUSES[2],
        STAFF_WORKFLOW_STATUSES[3],
        STAFF_WORKFLOW_STATUSES[4],
        STAFF_WORKFLOW_STATUSES[6],
      ];
    case 'delivery':
      return [
        STAFF_WORKFLOW_STATUSES[4],
        STAFF_WORKFLOW_STATUSES[5],
        STAFF_WORKFLOW_STATUSES[7],
      ];
    default:
      return STAFF_WORKFLOW_STATUSES;
  }
}