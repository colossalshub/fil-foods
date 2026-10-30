import { requireSupabase } from '../lib/supabaseClient.js';

export async function placeOrderWithBackend({
  clientRequestId,
  fulfillmentType,
  schedule,
  address,
  specialInstructions,
  items,
}) {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) {
    throw new Error('Your session has expired. Please log in again.');
  }
  const mealNames = [...new Set(items.map(({ mealName }) => mealName).filter(Boolean))];
  const { data: meals, error: mealsError } = await client
    .from('meals')
    .select('id, name')
    .in('name', mealNames);
  if (mealsError) throw mealsError;

  const idsByName = new Map((meals || []).map((meal) => [meal.name, meal.id]));
  const backendItems = items.map(({ mealId, mealName, quantity }) => {
    const backendMealId = idsByName.get(mealName) || mealId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(backendMealId)) {
      throw new Error(`Meal "${mealName || mealId}" is not available in the backend catalog.`);
    }
    return { meal_id: backendMealId, quantity };
  });

  const { data, error } = await client.rpc('place_order', {
    p_client_request_id: clientRequestId,
    p_fulfillment_type: fulfillmentType === 'delivery' ? 'delivery' : 'pick_up',
    p_schedule: schedule,
    p_address: address || null,
    p_special_instructions: specialInstructions || null,
    p_items: backendItems,
  });
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

export async function getClientOrderById(orderId) {
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

export function subscribeToClientOrders(onChange) {
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
