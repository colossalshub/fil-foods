import { requireSupabase } from '../lib/supabaseClient.js';

export async function placeOrderWithBackend({
  clientRequestId,
  fulfillmentType,
  schedule,
  address,
  specialInstructions,
  items,
}) {
  const { data, error } = await requireSupabase().rpc('place_order', {
    p_client_request_id: clientRequestId,
    p_fulfillment_type: fulfillmentType === 'delivery' ? 'delivery' : 'pick_up',
    p_schedule: schedule,
    p_address: address || null,
    p_special_instructions: specialInstructions || null,
    p_items: items.map(({ mealId, quantity }) => ({ meal_id: mealId, quantity })),
  });
  if (error) throw error;
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
