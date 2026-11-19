import type { AdminOrder, OrderStatus } from '../types.js';

export type AdminListStatusLabel = 'Pending' | 'Preparing' | 'Delivered' | 'Cancelled';

const PENDING: OrderStatus[] = [
  'For Dietitian Review',
  'Awaiting Payment',
  'Paid',
  'Confirmed',
];

const PREPARING: OrderStatus[] = [
  'Preparing',
  'Ready for Delivery',
  'Out for Delivery',
  'Ready for Pickup',
];

export function adminListStatusLabel(status: OrderStatus): AdminListStatusLabel | OrderStatus {
  if (PENDING.includes(status)) return 'Pending';
  if (PREPARING.includes(status)) return 'Preparing';
  if (status === 'Completed') return 'Delivered';
  if (status === 'Cancelled') return 'Cancelled';
  return status;
}

export function orderListDisplayId(order: Pick<AdminOrder, 'id' | 'trackingNumber'> & { orderRef?: string }) {
  if (order.orderRef) return order.orderRef;
  if (/^\d+$/.test(order.id)) return `#${order.id}`;
  const tracking = order.trackingNumber?.trim();
  if (tracking) return tracking.startsWith('#') ? tracking : `#${tracking}`;
  return `#${order.id.slice(0, 8)}`;
}