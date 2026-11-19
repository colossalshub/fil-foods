import { CLIENT_ORDER_STATUS } from '../../lib/orderStatus.js';
import type { AdminOrder, DietaryInfo, OrderStatus, StaffRole } from '../types';
import { adminListStatusLabel } from './orderDisplay.js';

/** Bottom navigation per role: Staff is Admin-only (ADM-02, DIT-16 #1, KIT-10). Delivery has no
 * Menu (DEL-14 removed and DEL-10 shows no menu in the revised workbook; DEL-02 still lists a Menu
 * tab — recorded inconsistency). */
export const TABS: Record<StaffRole, string[]> = {
  admin: ['Dashboard', 'Orders', 'Menu', 'Staff', 'Settings'],
  dietitian: ['Dashboard', 'Orders', 'Menu', 'Settings'],
  kitchen: ['Dashboard', 'Orders', 'Menu', 'Settings'],
  delivery: ['Dashboard', 'Orders', 'Settings'],
};

export const NO_ACCESS = 'You do not have access to this page.';

export type Capability =
  | 'staff'
  | 'sales'
  | 'menuManage'
  | 'menuAvailability'
  | 'prices'
  | 'fullName'
  | 'deliveryAddress'
  | 'customerHistory'
  | 'customerDirectory'
  | 'audit'
  | 'notificationSettings'
  | 'reviewOrders'
  | 'removalRequests'
  | 'assignDelivery';

const CAPABILITIES: Record<StaffRole, Capability[]> = {
  admin: [
    'staff', 'sales', 'menuManage', 'prices', 'fullName', 'deliveryAddress', 'customerHistory',
    'customerDirectory', 'audit', 'notificationSettings', 'assignDelivery',
  ],
  // DIT-16: no staff management, sales figures or menu management. DIT-17 is Dietitian-only.
  dietitian: ['prices', 'fullName', 'customerHistory', 'customerDirectory', 'reviewOrders', 'removalRequests'],
  // KIT-15 (revised): Kitchen only sets availability of existing items. ADM-18: Admin owns menu
  // details and views availability. DEL-14 removed: Delivery has no menu access.
  kitchen: ['menuAvailability'],
  delivery: ['deliveryAddress'],
};

export function can(role: StaffRole | null | undefined, capability: Capability) {
  return !!role && CAPABILITIES[role].includes(capability);
}

export type StaffBucket = 'Pending' | 'Preparing' | 'Delivered' | 'Cancelled';
export const BUCKET_FILTERS = ['All', 'Pending', 'Preparing', 'Delivered'] as const;
export type BucketFilter = typeof BUCKET_FILTERS[number];

/** List badges for every staff list: Pending, Preparing, Delivered, Cancelled (ADM-11 #3, KIT-11 #2). */
export function staffBucket(status: OrderStatus): StaffBucket {
  const label = adminListStatusLabel(status);
  if (label === 'Pending' || label === 'Preparing' || label === 'Delivered' || label === 'Cancelled') return label;
  return 'Pending';
}

/** Delivery Staff need the handoff stage on their list (Figma: Ready for Pickup / Out for Delivery). */
export function listBadgeLabel(role: StaffRole, status: OrderStatus): string {
  if (role === 'delivery') {
    if (status === CLIENT_ORDER_STATUS.READY_DELIVERY) return 'Ready for Pickup';
    if (status === CLIENT_ORDER_STATUS.OUT_FOR_DELIVERY) return 'Out for Delivery';
  }
  return staffBucket(status);
}

/** Detail badge wording per role. "Ready for Delivery" is the Kitchen → Delivery handoff, which
 * the Delivery stories call "Ready for Pickup" (recorded conflict). */
export function detailStatusLabel(role: StaffRole, status: OrderStatus): string {
  if (status === CLIENT_ORDER_STATUS.READY_DELIVERY && role !== 'admin') return 'Ready for Pickup';
  if (role === 'kitchen' && (status === CLIENT_ORDER_STATUS.PAID || status === CLIENT_ORDER_STATUS.CONFIRMED)) {
    return 'Pending';
  }
  return status;
}

const KITCHEN_VISIBLE: OrderStatus[] = [
  CLIENT_ORDER_STATUS.PAID,
  CLIENT_ORDER_STATUS.CONFIRMED,
  CLIENT_ORDER_STATUS.PREPARING,
  CLIENT_ORDER_STATUS.READY_DELIVERY,
  CLIENT_ORDER_STATUS.READY_PICKUP,
  CLIENT_ORDER_STATUS.OUT_FOR_DELIVERY,
  CLIENT_ORDER_STATUS.COMPLETED,
];

/** Same rule as `staff_can_see_order` in the database. */
export function canSeeOrder(role: StaffRole, staffId: string, order: AdminOrder) {
  switch (role) {
    case 'admin':
    case 'dietitian':
      return true;
    case 'kitchen':
      return KITCHEN_VISIBLE.includes(order.status)
        || (order.status === CLIENT_ORDER_STATUS.CANCELLED && !!order.wasPaid);
    case 'delivery':
      return (order.fulfillment ?? 'delivery') === 'delivery' && order.assigneeId === staffId;
    default:
      return false;
  }
}

/** Strips what a role must never receive (KIT-11, KIT-12, DEL-11, DEL-12, DEL-15, DIT-13). */
export function shapeOrderForRole(role: StaffRole, order: AdminOrder): AdminOrder {
  if (role === 'admin') return order;
  const firstName = order.firstName || order.customerName.split(' ')[0] || 'Customer';
  const shaped: AdminOrder = { ...order };
  if (!can(role, 'fullName')) {
    shaped.customerName = firstName;
    shaped.accountHolderName = null;
    shaped.customerEmail = null;
  }
  if (!can(role, 'prices')) {
    shaped.price = 0;
    shaped.lines = order.lines.map((line) => ({ ...line, price: 0 }));
    shaped.items = (order.items ?? []).map((item) => ({ ...item, unitPrice: null }));
  }
  if (!can(role, 'deliveryAddress')) shaped.delivery = null;
  if (role === 'kitchen') shaped.specialInstructions = null;
  shaped.firstName = firstName;
  return shaped;
}

export interface OrderAction {
  label: string;
  target: OrderStatus;
  tone: 'solid' | 'outline' | 'danger';
  confirmTitle: string;
}

/** The single next step each role may take on an order (server rules in `order_status_allowed_for_staff`). */
export function actionsFor(role: StaffRole, staffId: string, order: AdminOrder): OrderAction[] {
  const status = order.status;
  const pickup = order.fulfillment === 'pick_up';
  if (role === 'kitchen') {
    if (status === CLIENT_ORDER_STATUS.PAID || status === CLIENT_ORDER_STATUS.CONFIRMED) {
      return [{ label: 'Start Preparing', target: CLIENT_ORDER_STATUS.PREPARING, tone: 'solid', confirmTitle: 'Start preparing this order?' }];
    }
    if (status === CLIENT_ORDER_STATUS.PREPARING) {
      return [{
        label: 'Mark Ready for Pickup',
        target: pickup ? CLIENT_ORDER_STATUS.READY_PICKUP : CLIENT_ORDER_STATUS.READY_DELIVERY,
        tone: 'solid',
        confirmTitle: 'Mark this order Ready for Pickup?',
      }];
    }
    if (status === CLIENT_ORDER_STATUS.READY_PICKUP) {
      return [{ label: 'Mark Picked Up', target: CLIENT_ORDER_STATUS.COMPLETED, tone: 'solid', confirmTitle: 'Confirm the customer collected this order?' }];
    }
    return [];
  }
  if (role === 'delivery') {
    if (order.assigneeId !== staffId) return [];
    if (status === CLIENT_ORDER_STATUS.READY_DELIVERY) {
      return [{ label: 'Collect order & start delivery', target: CLIENT_ORDER_STATUS.OUT_FOR_DELIVERY, tone: 'solid', confirmTitle: 'Start this delivery?' }];
    }
    if (status === CLIENT_ORDER_STATUS.OUT_FOR_DELIVERY) {
      return [{ label: 'Mark Completed', target: CLIENT_ORDER_STATUS.COMPLETED, tone: 'solid', confirmTitle: 'Mark this order Completed?' }];
    }
    return [];
  }
  if (role === 'admin') {
    const next = nextStatus(order);
    const actions: OrderAction[] = next
      ? [{ label: `Move to ${next}`, target: next, tone: 'solid', confirmTitle: `Change status to ${next}?` }]
      : [];
    if (status !== CLIENT_ORDER_STATUS.COMPLETED && status !== CLIENT_ORDER_STATUS.CANCELLED) {
      actions.push({ label: 'Cancel order', target: CLIENT_ORDER_STATUS.CANCELLED, tone: 'danger', confirmTitle: 'Cancel this order?' });
    }
    return actions;
  }
  return [];
}

const DELIVERY_FLOW: OrderStatus[] = [
  CLIENT_ORDER_STATUS.FOR_DIETITIAN_REVIEW,
  CLIENT_ORDER_STATUS.AWAITING_PAYMENT,
  CLIENT_ORDER_STATUS.PAID,
  CLIENT_ORDER_STATUS.PREPARING,
  CLIENT_ORDER_STATUS.READY_DELIVERY,
  CLIENT_ORDER_STATUS.OUT_FOR_DELIVERY,
  CLIENT_ORDER_STATUS.COMPLETED,
];
const PICKUP_FLOW: OrderStatus[] = [
  CLIENT_ORDER_STATUS.FOR_DIETITIAN_REVIEW,
  CLIENT_ORDER_STATUS.AWAITING_PAYMENT,
  CLIENT_ORDER_STATUS.PAID,
  CLIENT_ORDER_STATUS.PREPARING,
  CLIENT_ORDER_STATUS.READY_PICKUP,
  CLIENT_ORDER_STATUS.COMPLETED,
];

/** Mirrors `validate_order_status_transition`: one step forward, or cancel. */
export function nextStatus(order: Pick<AdminOrder, 'status' | 'fulfillment'>): OrderStatus | null {
  if (order.status === CLIENT_ORDER_STATUS.CONFIRMED) return CLIENT_ORDER_STATUS.PREPARING;
  const flow = order.fulfillment === 'pick_up' ? PICKUP_FLOW : DELIVERY_FLOW;
  const index = flow.indexOf(order.status);
  return index >= 0 && index < flow.length - 1 ? flow[index + 1] : null;
}

export function isValidTransition(order: Pick<AdminOrder, 'status' | 'fulfillment'>, target: OrderStatus) {
  if (order.status === CLIENT_ORDER_STATUS.COMPLETED || order.status === CLIENT_ORDER_STATUS.CANCELLED) return false;
  if (target === CLIENT_ORDER_STATUS.CANCELLED) return true;
  return nextStatus(order) === target;
}

export function roleMayTransition(role: StaffRole, staffId: string, order: AdminOrder, target: OrderStatus) {
  if (!isValidTransition(order, target)) return false;
  if (role === 'admin') return true;
  return actionsFor(role, staffId, order).some((action) => action.target === target);
}

export interface NutritionTile {
  key: 'sugar' | 'calories' | 'sodium' | 'protein';
  label: string;
  level: string;
  range: string;
}

/**
 * Preferred Nutritional Levels (DIT-12, KIT-14, DEL-13, ADM-19). The user app stores yes/no goals,
 * so a goal maps to the spec's level and range; anything else reads "Not supplied".
 * Sodium uses ≤ 400 mg everywhere (spec lists ≤ 400 mg / ≤ 2.00 mg / ≤ 2g: recorded conflict).
 */
export function nutritionTiles(dietary: DietaryInfo | null | undefined): NutritionTile[] {
  const flags = dietary?.nutrition;
  const supplied = !!flags?.supplied;
  const notSupplied = { level: 'Not supplied', range: '' };
  const noPreference = { level: 'No preference', range: '' };
  const pick = (on: boolean | undefined, value: { level: string; range: string }) =>
    on ? value : supplied ? noPreference : notSupplied;
  return [
    { key: 'sugar', label: 'Sugar', ...(flags?.lowerSugar ? { level: 'Low', range: '≤ 5g' } : supplied ? noPreference : notSupplied) },
    { key: 'calories', label: 'Calories', ...pick(flags?.lowerCalories, { level: 'Low', range: '≤ 400 kcal' }) },
    { key: 'sodium', label: 'Sodium', ...pick(flags?.lowerSodium, { level: 'Low', range: '≤ 400 mg' }) },
    { key: 'protein', label: 'Protein', ...pick(flags?.higherProtein, { level: 'High', range: '≥ 25g' }) },
  ];
}

export function displayOrderNo(order: Pick<AdminOrder, 'orderNo' | 'id'>) {
  if (typeof order.orderNo === 'number') return `#${String(order.orderNo).padStart(5, '0')}`;
  if (/^\d+$/.test(order.id)) return `#${order.id.padStart(5, '0')}`;
  return `#${order.id.slice(0, 8)}`;
}

export const ROLE_TITLE: Record<StaffRole, string> = {
  admin: 'Admin',
  dietitian: 'Dietitian',
  kitchen: 'Kitchen Staff',
  delivery: 'Delivery Staff',
};
