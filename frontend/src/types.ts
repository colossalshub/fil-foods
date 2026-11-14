export interface Allergy {
  name: string;
  note?: string;
}

export interface MealPreferences {
  preferredCategories: string[];
  dislikedIngredients: string[];
}

export interface NutritionTargets {
  calories?: number;
  protein?: number;
  fat?: number;
}

export interface Guardian {
  name: string;
  relationship: string;
  contactNumber: string;
}

export interface MealRecipientProfile {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  contactNumber?: string;
  relationship: string;
  deliveryAddress: string;
  consentAt?: string;
  healthConditions: string[];
  dietaryRestrictions: string[];
  allergies: Allergy[];
  mealPreferences: MealPreferences;
  nutritionalPreference: string | null;
  nutritionalPreferences: string[];
  nutritionTargets: NutritionTargets;
}

export interface AuthEvent {
  type: string;
  at: string;
}

export interface ProfileHistoryEntry {
  id: string;
  section: string;
  action: string;
  item: string;
  at: string;
  whoName: string;
  role: string;
  previousValue?: string;
  newValue?: string;
  formatted?: string;
}

export type AccountFor = 'self' | 'family';

export interface PendingContactChange {
  contactNumber: string | null;
  email: string | null;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  address: string;
}

export interface StoredPlan {
  periodId: string;
  periodLabel: string;
  name: string;
  price: number;
  priceLabel: string;
  discountRate: number;
  status: string;
  startDate: string;
  renewalDate: string;
  pendingPeriodId: string | null;
}

export interface PublicPlan {
  status: string;
  periodId: string;
  periodLabel: string;
  discountRate: number;
  name: string;
  priceLabel: string;
  renewalDate: string;
  startDate: string;
  pendingPeriodId?: string | null;
}

export interface User {
  id: string;
  accountFor?: AccountFor;
  mealRecipient?: MealRecipientProfile;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  contactNumber: string;
  email: string;
  username: string | null;
  password?: string | null;
  passwordHash?: string | null;
  passwordStorage?: string;
  roleMask?: number;
  role?: string;
  verified: boolean;
  profileComplete: boolean;
  inactive: boolean;
  locked: boolean;
  failedAttempts: number;
  googleSub?: string | null;
  termsAcceptedAt: string | null;
  termsAcceptedVersion?: string | null;
  authEvents: AuthEvent[];
  sessionVersion: number;
  createdAt?: string;
  address?: string;
  healthConditions?: string[];
  dietaryRestrictions?: string[];
  allergies?: Allergy[];
  mealPreferences?: MealPreferences;
  nutritionalPreference?: string | null;
  nutritionalPreferences?: string[];
  nutritionTargets?: NutritionTargets;
  guardian?: Guardian | null;
  profileLastUpdated?: string | null;
  profileHistory?: ProfileHistoryEntry[];
  pendingContactChange?: PendingContactChange | null;
  plan?: StoredPlan | null;
  biometricUnlock?: { enabled: boolean };
}

export interface AuthUser {
  id?: string;
  role?: string;
  accountFor?: AccountFor;
  mealRecipient?: MealRecipientProfile;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  contactNumber?: string;
  email?: string;
  username?: string | null;
  verified?: boolean;
  profileComplete?: boolean;
  inactive?: boolean;
  termsAcceptedAt?: string | null;
  termsAcceptedVersion?: string | null;
  address?: string;
  plan?: PublicPlan | null;
  biometricUnlock?: { enabled: boolean };
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  contact_number?: string;
  accessToken?: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
}

export interface PublicUser {
  id: string;
  accountFor?: AccountFor;
  mealRecipient?: MealRecipientProfile;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  contactNumber: string;
  email: string;
  username: string | null;
  verified: boolean;
  profileComplete: boolean;
  termsAcceptedAt: string | null;
  termsAcceptedVersion?: string | null;
  plan: PublicPlan | null;
  biometricUnlock: { enabled: boolean };
  role?: string;
  inactive?: boolean;
  address?: string;
  accessToken?: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
}

export interface Meal {
  id: string;
  name: string;
  cuisine?: string;
  category?: string;
  diets?: string[];
  allergens?: string[];
  calories?: number;
  protein?: number;
  sodium?: number;
  carbs?: number;
  fat?: number;
  price?: number;
  emoji?: string;
  mealCategories?: string[];
  dietaryTags?: string[];
  ingredients?: string[];
  portion?: string;
  available?: boolean;
}

export interface MealMatchProfile {
  healthConditions?: string[];
  dietaryRestrictions?: string[];
  allergies?: Allergy[];
  mealPreferences?: {
    preferredCategories?: string[];
    dislikedIngredients?: string[];
  };
  nutritionalPreference?: string | null;
  nutritionalPreferences?: string[];
  nutritionTargets?: NutritionTargets;
}

export interface Profile {
  id: string;
  accountFor?: AccountFor;
  mealRecipient?: MealRecipientProfile;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  contactNumber: string;
  email: string;
  address: string;
  healthConditions: string[];
  dietaryRestrictions: string[];
  allergies: Allergy[];
  mealPreferences: MealPreferences;
  nutritionalPreference: string | null;
  nutritionalPreferences: string[];
  nutritionTargets: NutritionTargets;
  guardian: Guardian | null;
  profileLastUpdated?: string | null;
  profileLastUpdatedFormatted: string;
  history: ProfileHistoryEntry[];
  pendingContactChange: PendingContactChange | null;
}

export interface OrderStatusChange {
  status: string;
  at: string;
}

export interface OrderFulfillment {
  type: string;
  address?: string | null;
  scheduledAt?: string;
  instructions?: string | null;
}

export interface MealCustomization {
  vegetableStyle?: string;
  meatProtein?: string;
  cookingStyle?: string;
}

export interface OrderItem {
  mealId?: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
  customizationLabel?: string;
}

export interface KitchenView {
  healthConditions: string[];
  dietaryRestrictions: string[];
  allergies: Array<{ name: string; note: string }>;
}

export interface Order {
  id: string;
  userId: string;
  clientConfirmKey?: string;
  trackingNumber: string;
  status: string;
  statusHistory: OrderStatusChange[];
  lastUpdatedAt?: string;
  items: OrderItem[];
  fulfillment: OrderFulfillment;
  subtotal?: number;
  discountRate?: number;
  discountAmount?: number;
  total?: number;
  placedAt?: string;
  kitchenView?: KitchenView;
  deliveryFee?: number;
  orderedByName?: string;
  mealRecipientName?: string;
  mealRecipientAddress?: string;
  accountFor?: AccountFor;
}

export interface AuditEvent {
  id: string;
  at: string;
  action: string;
  userId: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  previousHash: string | null;
  hash: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  read: boolean;
  createdAt: string;
  type?: string;
  orderId?: string;
  trackingNumber?: string;
  message?: string;
  status?: string;
}

export interface Announcement {
  id: string;
  message: string;
  createdAt: string;
  readBy?: Record<string, boolean>;
}

export interface VerificationCode {
  id: string;
  userId: string;
  purpose: string;
  channel: string;
  target: string;
  code: string;
  createdAtMs: number;
  createdAt?: string;
  expiresAtMs: number;
  used: boolean;
  invalidated: boolean;
  wrongAttempts: number;
  smsText?: string;
  emailSubject?: string;
  emailBody?: string;
}

export interface PasswordGrant {
  id: string;
  userId: string;
  used: boolean;
  createdAtMs: number;
}

export interface LoginAttempt {
  username?: string;
  atMs: number;
  at: string;
}

export interface AppDatabase {
  users: User[];
  auditLog: AuditEvent[];
  codes: VerificationCode[];
  grants: PasswordGrant[];
  attempts: LoginAttempt[];
  failNextCodeSend: boolean;
  settings: {
    leadTimeHours: number;
    deliveryFee: number;
    kitchenHours: { days: number[]; openHour: number; closeHour: number };
  };
  seq: number;
  orders?: Order[];
  notifications?: AppNotification[];
  announcements?: Announcement[];
}

export interface CodedError extends Error {
  code?: string;
}

export interface AuthTokenSession {
  access_token?: string;
  refresh_token?: string | null;
  expires_at?: number | null;
  expires_in?: number | null;
  token_type?: string;
  user?: { id?: string };
}

export interface PersistedSession {
  userId: string;
  username: string | null;
  sessionVersion: number;
  keepLoggedIn: boolean;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface NutritionTarget {
  calories?: number;
  protein?: number;
  fat?: number;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

declare global {
  namespace ReactNavigation {
    interface RootParamList {
      [route: string]: object | undefined;
    }
  }
}

export type FieldMap = Record<string, string | boolean>;

export interface ServiceResult {
  ok: boolean;
  needsGoogle?: boolean;
  message?: string;
  messages?: string[];
  fields?: FieldMap;
  values?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    suffix?: string;
    contactNumber?: string;
    email?: string;
    address?: string;
    name?: string;
    relationship?: string;
  };
  needsVerification?: boolean;
  channel?: string;
  sent?: boolean;
  codeId?: string;
  masked?: string;
  phone?: string;
  email?: string;
  purpose?: string;
  complete?: boolean;
  nextChannel?: string;
  user?: PublicUser | null;
  session?: AuthTokenSession | null;
  scheduled?: Date;
  grantId?: string;
  reason?: string;
  alreadyActive?: boolean;
  userId?: string;
  code?: string;
  status?: string;
  verifyRequired?: boolean;
  startDate?: string;
  renewalDate?: string;
  plan?: StoredPlan | null;
  summary?: {
    periodId?: string;
    name?: string;
    priceLabel?: string;
    periodLabel?: string;
    benefits?: string[];
    isChange?: boolean;
    effectiveDate?: string | null;
  };
}

export interface RegistrationInput {
  accountFor?: AccountFor;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  contactNumber?: string;
  address?: string;
  email?: string;
  username?: string;
  password?: string;
  acceptedTerms?: boolean;
}

export interface OnboardingInput {
  personal?: PersonalInfoInput;
  recipient?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    suffix?: string;
    contactNumber?: string;
    relationship?: string;
    relationshipOther?: string;
    deliveryAddress?: string;
    consentConfirmed?: boolean;
  };
  allergies?: Allergy[];
  healthConditions?: string[];
  dietaryRestrictions?: string[];
  acceptedTerms?: boolean;
}

export interface PersonalInfoInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  contactNumber?: string;
  email?: string;
  address?: string;
}

export interface GuardianInput {
  name?: string;
  relationship?: string;
  contactNumber?: string;
}

export type ScheduleInput = string | Date | null | undefined;

export interface ConfirmOrderItem {
  meal: Meal;
  quantity: number | string;
  customization?: MealCustomization;
}

export interface ConfirmFulfillment {
  type?: string | null;
  address?: string;
  scheduledAt?: string | Date | null;
  instructions?: string;
}

export interface ConfirmOrderPayload {
  items?: ConfirmOrderItem[];
  fulfillment: ConfirmFulfillment;
  now?: ScheduleInput;
  allergenAcknowledged?: boolean;
  clientRequestId?: string | null;
}
