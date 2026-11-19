/**
 * Revised workbook (2026-11-19), USR-13 AC 4/5: every order has an order reference ORD-YYYY-NNNN
 * used in the User, Admin and Kitchen modules; TRK-YYYY-NNNN is only the delivery tracking number,
 * shown separately on delivery orders. Both share the same number.
 */
export interface OrderReferenceSource {
  id?: string;
  orderRef?: string | null;
  trackingNumber?: string | null;
  fulfillment?: { type?: string } | null;
}

export const ORDER_REF_PREFIX = 'ORD-';
export const TRACKING_PREFIX = 'TRK-';

export function formatOrderRef(year: number, sequence: number) {
  return `${ORDER_REF_PREFIX}${year}-${String(sequence).padStart(4, '0')}`;
}

/** The order reference; orders saved before the change derive it from their TRK- number. */
export function orderRefOf(order: OrderReferenceSource) {
  if (order.orderRef) return order.orderRef;
  const tracking = String(order.trackingNumber || '');
  if (tracking.startsWith(TRACKING_PREFIX)) return `${ORDER_REF_PREFIX}${tracking.slice(TRACKING_PREFIX.length)}`;
  return order.id || '';
}

/** The delivery tracking number, or undefined for pickup orders. */
export function deliveryTrackingOf(order: OrderReferenceSource) {
  const type = order.fulfillment?.type || 'delivery';
  if (type !== 'delivery') return undefined;
  if (order.trackingNumber) return order.trackingNumber;
  const ref = String(order.orderRef || '');
  return ref.startsWith(ORDER_REF_PREFIX) ? `${TRACKING_PREFIX}${ref.slice(ORDER_REF_PREFIX.length)}` : undefined;
}
