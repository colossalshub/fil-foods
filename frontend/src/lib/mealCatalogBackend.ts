import { isSupabaseConfigured, requireSupabase } from './supabaseClient.js';
import { ensureSession } from './supabaseClient.js';

export interface RemoteMealRow {
  id: string;
  name: string;
  description?: string;
  category: string;
  ingredients?: string[];
  allergens?: string[];
  price: number | string;
  is_available?: boolean;
  calories?: number | null;
  protein?: number | null;
}

export async function fetchRemoteMeals(): Promise<RemoteMealRow[]> {
  if (!isSupabaseConfigured) return [];
  const session = await ensureSession();
  const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
  const query = requireSupabase()
    .from('meals')
    .select('id, name, description, category, ingredients, allergens, price, is_available, calories, protein')
    .order('category')
    .order('name');
  const { data, error } = headers
    ? await query.setHeader('Authorization', headers.Authorization)
    : await query;
  if (error) throw error;
  return (data as RemoteMealRow[]) || [];
}