/** Shared order status labels (USR-20–23) mapped to Supabase `order_status` enum values. */

export const CLIENT_ORDER_STATUS = {
  FOR_DIETITIAN_REVIEW: 'For Dietitian Review',
  AWAITING_PAYMENT: 'Awaiting Payment',
  PAID: 'Paid',
  PREPARING: 'Preparing',
  READY_PICKUP: 'Ready for Pickup',
  READY_DELIVERY: 'Ready for Delivery',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  CONFIRMED: 'Confirmed',
} as const;

export type ClientOrderStatus = typeof CLIENT_ORDER_STATUS[keyof typeof CLIENT_ORDER_STATUS];

export const TERMINAL_STATUSES: ClientOrderStatus[] = [
  CLIENT_ORDER_STATUS.COMPLETED,
  CLIENT_ORDER_STATUS.CANCELLED,
];

export const DB_TO_CLIENT: Record<string, ClientOrderStatus> = {
  for_dietitian_review: CLIENT_ORDER_STATUS.FOR_DIETITIAN_REVIEW,
  awaiting_payment: CLIENT_ORDER_STATUS.AWAITING_PAYMENT,
  paid: CLIENT_ORDER_STATUS.PAID,
  confirmed: CLIENT_ORDER_STATUS.CONFIRMED,
  preparing: CLIENT_ORDER_STATUS.PREPARING,
  ready_for_pick_up: CLIENT_ORDER_STATUS.READY_PICKUP,
  ready_for_pickup: CLIENT_ORDER_STATUS.READY_PICKUP,
  ready_for_delivery: CLIENT_ORDER_STATUS.READY_DELIVERY,
  out_for_delivery: CLIENT_ORDER_STATUS.OUT_FOR_DELIVERY,
  completed: CLIENT_ORDER_STATUS.COMPLETED,
  cancelled: CLIENT_ORDER_STATUS.CANCELLED,
  issue: CLIENT_ORDER_STATUS.CANCELLED,
};

export const CLIENT_TO_DB: Record<string, string> = {
  [CLIENT_ORDER_STATUS.FOR_DIETITIAN_REVIEW]: 'for_dietitian_review',
  [CLIENT_ORDER_STATUS.AWAITING_PAYMENT]: 'awaiting_payment',
  [CLIENT_ORDER_STATUS.PAID]: 'paid',
  [CLIENT_ORDER_STATUS.CONFIRMED]: 'confirmed',
  [CLIENT_ORDER_STATUS.PREPARING]: 'preparing',
  [CLIENT_ORDER_STATUS.READY_PICKUP]: 'ready_for_pick_up',
  [CLIENT_ORDER_STATUS.READY_DELIVERY]: 'ready_for_delivery',
  [CLIENT_ORDER_STATUS.OUT_FOR_DELIVERY]: 'out_for_delivery',
  [CLIENT_ORDER_STATUS.COMPLETED]: 'completed',
  [CLIENT_ORDER_STATUS.CANCELLED]: 'cancelled',
};

export function clientStatusFromDb(status: string | null | undefined): ClientOrderStatus {
  const key = String(status || '').toLowerCase();
  return DB_TO_CLIENT[key] || CLIENT_ORDER_STATUS.CONFIRMED;
}

export function dbStatusFromClient(status: string): string {
  return CLIENT_TO_DB[status] || keyFallback(status);
}

function keyFallback(status: string): string {
  return status.toLowerCase().replace(/\s+/g, '_');
}

export const STAFF_WORKFLOW_STATUSES: ClientOrderStatus[] = [
  CLIENT_ORDER_STATUS.FOR_DIETITIAN_REVIEW,
  CLIENT_ORDER_STATUS.AWAITING_PAYMENT,
  CLIENT_ORDER_STATUS.PAID,
  CLIENT_ORDER_STATUS.PREPARING,
  CLIENT_ORDER_STATUS.READY_DELIVERY,
  CLIENT_ORDER_STATUS.OUT_FOR_DELIVERY,
  CLIENT_ORDER_STATUS.READY_PICKUP,
  CLIENT_ORDER_STATUS.COMPLETED,
  CLIENT_ORDER_STATUS.CANCELLED,
];