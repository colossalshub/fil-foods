export type StaffRole = 'admin' | 'dietitian' | 'kitchen' | 'delivery';

export type OrderStatus =
  | 'For Dietitian Review'
  | 'Awaiting Payment'
  | 'Paid'
  | 'Preparing'
  | 'Ready for Delivery'
  | 'Out for Delivery'
  | 'Ready for Pickup'
  | 'Completed'
  | 'Cancelled';

export type Appearance = 'light' | 'dark' | 'system';

export interface Preferences {
  language: 'en' | 'fil';
  appearance: Appearance;
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

export interface AdminOrder {
  id: string;
  clientId?: string | null;
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
  email: string;
  allergies: string[];
  nutrition: NutritionRow[];
  sodiumConflict: string[] | null;
  history: CustomerHistory[];
}

export interface StaffNotice {
  id: string;
  audience: StaffRole;
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
