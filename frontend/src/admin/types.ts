import type { ClientOrderStatus } from '../lib/orderStatus.js';

export type StaffRole = 'admin' | 'dietitian' | 'kitchen' | 'delivery';

/** Staff-facing labels; kept in sync with Supabase / client order status. */
export type OrderStatus = ClientOrderStatus;

export type Appearance = 'light' | 'dark' | 'system';

export interface Preferences {
  language: 'en' | 'fil';
  appearance: Appearance;
  /** Dietitian only (DIT-07); Admin, Kitchen and Delivery have no switch (ADM-07, KIT-07, DEL-07). */
  notifications?: boolean;
}

export interface StaffPublic {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  disabled: boolean;
  sessionVersion: number;
  preferences: Preferences;
}

export interface Actor {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
}

export interface OrderLine {
  name: string;
  price: number;
}

export interface OrderUpdate {
  at: string;
  by: string;
  summary: string;
}

export type Fulfillment = 'delivery' | 'pick_up';

export interface OrderItem {
  name: string;
  quantity: number;
  /** Only Admin and Dietitian receive prices (KIT-12, DEL-12). */
  unitPrice: number | null;
  mealKey?: string | null;
}

export interface NutritionFlags {
  supplied: boolean;
  lowerCalories: boolean;
  higherProtein: boolean;
  lowerSodium: boolean;
  lowerSugar: boolean;
}

export interface DietaryInfo {
  allergies: { value: string; note?: string | null }[];
  conditions: string[];
  restrictions: string[];
  nutrition: NutritionFlags;
  updatedAt?: string | null;
}

/** Shown to Admin and the assigned Delivery Staff only (DEL-15). */
export interface DeliveryInfo {
  firstName: string;
  contactNumber: string | null;
  address: string | null;
  notes: string | null;
}

export interface AdminOrder {
  id: string;
  /** Internal sequence; shown as #00000 only when an order has no reference yet. */
  orderNo?: number | null;
  /** ORD-YYYY-NNNN order reference shown in the Admin, Dietitian and Kitchen modules (revised USR-13 AC 4). */
  orderRef?: string;
  /** Meal recipient's first name; the only name Kitchen and Delivery see. */
  firstName?: string;
  accountHolderName?: string | null;
  customerEmail?: string | null;
  fulfillment?: Fulfillment;
  items?: OrderItem[];
  dietary?: DietaryInfo | null;
  delivery?: DeliveryInfo | null;
  specialInstructions?: string | null;
  reviewDecision?: 'approved' | 'returned' | null;
  reviewReason?: string | null;
  /** Kitchen keeps seeing cancelled orders only when they had been paid. */
  wasPaid?: boolean;
  clientId?: string | null;
  /** TRK-YYYY-NNNN delivery tracking number; delivery orders only. */
  trackingNumber?: string;
  customerName: string;
  status: OrderStatus;
  price: number;
  placedAt: string;
  when: string;
  photo: string;
  lines: OrderLine[];
  assigneeId: string | null;
  assigneeName: string | null;
  updates: OrderUpdate[];
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  ingredients: string[];
  allergens: string[];
  price: number;
  available: boolean;
}

export interface MenuDraft {
  name: string;
  category: string;
  price: string;
  available: boolean;
  ingredients: string;
  allergens: string;
}

export interface CustomerHistory {
  orderId?: string;
  at?: string;
  name: string;
  status: OrderStatus;
  price: number;
}

export interface NutritionRow {
  label: string;
  value: string;
}

export interface Customer {
  id: string;
  name: string;
  firstName?: string;
  accountHolderName?: string | null;
  dietary?: DietaryInfo | null;
  email: string;
  allergies: string[];
  nutrition: NutritionRow[];
  sodiumConflict: string[] | null;
  history: CustomerHistory[];
}

export interface StaffNotice {
  id: string;
  audience: StaffRole;
  body?: string;
  kind?: string;
  requestId?: string;
  /** Delivery notices go to the assigned staff member only. */
  recipientId?: string;
  title: string;
  orderId?: string;
  readBy: string[];
  createdAt: string;
}

export interface NotificationTypes {
  newOrder?: boolean;
  menuUpdated?: boolean;
  readyForPickup?: boolean;
}

export interface RoleNotificationSetting {
  enabled: boolean;
  types: NotificationTypes;
}

export interface FieldChange {
  label: string;
  from: string;
  to: string;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  token?: string | null;
}

export interface DashboardMetrics {
  totalOrders: number;
  ordersDelta: number;
  totalSales: number;
  salesDelta: number;
  totalCustomers: number;
  customersDelta: number;
  menuDelta: number;
  weekSales: number[];
  /** Four weekly totals for the Sales Overview line chart (ADM-10). */
  salesOverviewWeeks: number[];
  monthSales: number[] | null;
}

export interface AuditRow {
  id: string;
  at: string;
  action: string;
  accountName: string;
  accountEmail: string;
  summary: string;
  target: string;
  setting: string;
  role: string;
  oldValue: string;
  newValue: string;
}

export interface PlanOffer {
  id: string;
  name: string;
  price: number;
}

export type RemovalStatus = 'pending' | 'approved' | 'rejected';

/** DIT-17: a user's request to remove a health condition from the meal recipient's profile. */
export interface RemovalRequest {
  id: string;
  clientId: string;
  recipientName: string;
  condition: string;
  reason: string | null;
  requestedBy: string;
  requestedAt: string;
  status: RemovalStatus;
  decisionReason: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  dietary?: DietaryInfo | null;
}
