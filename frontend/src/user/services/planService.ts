// Plan catalog and checkout discounts (demo helper; order totals cite USR-20 plan prices).

import type { ServiceResult, StoredPlan, User } from '../types';
import { getDb } from '../data/mockStore.js';
import { MSG } from '../data/messages.js';
import { getUser } from './authService.js';

export const PLAN_MSG = {
  loginRequired: 'Please log in or create an account to choose a plan.',
  verifyRequired: MSG.verifyFirst,
  currentPlan: 'Current plan',
  headline: 'Simple plans. Powerful benefits.',
  lockInAbout: 'No lock-in. Change or cancel your plan anytime.',
  lockInShort: 'No lock-in — change or cancel anytime',
};

const PERIOD_ORDER = ['weekly', 'monthly', 'yearly'];

const SHARED_BENEFITS = [
  'Customized meals for your goals',
  'Dietitian-approved recipes',
];

export const PLAN_CATALOG: Record<string, {
  id: string;
  periodLabel: string;
  name: string;
  price: number;
  unit: string;
  tagline: string;
  orderBenefit: string;
  discountRate: number;
  chooseLabel: string;
}> = {
  weekly: {
    id: 'weekly',
    periodLabel: 'Weekly',
    name: 'Weekly plan',
    price: 3299,
    unit: 'week',
    tagline: 'Great for short-term needs',
    orderBenefit: '5% off on all orders',
    discountRate: 0.05,
    chooseLabel: 'Choose weekly',
  },
  monthly: {
    id: 'monthly',
    periodLabel: 'Monthly',
    name: 'Monthly plan',
    price: 15399,
    unit: 'month',
    tagline: 'Great for short-term needs',
    orderBenefit: 'UP to 15% off on all orders',
    discountRate: 0.15,
    chooseLabel: 'Choose monthly',
  },
  yearly: {
    id: 'yearly',
    periodLabel: 'Yearly',
    name: 'Yearly plan',
    price: 179999,
    unit: 'year',
    tagline: 'Great for longer-term needs',
    orderBenefit: 'UP to 75% off on all orders',
    discountRate: 0.75,
    chooseLabel: 'Choose yearly',
  },
};

const MAX_DISCOUNT: Record<string, number> = {
  weekly: 0.05,
  monthly: 0.15,
  yearly: 0.75,
};

let pendingPeriodId: string | null = null;
let testNowMs: number | null = null;

export function __setPlanTestNow(isoOrMs: string | number | null | undefined) {
  if (isoOrMs == null) {
    testNowMs = null;
    return;
  }
  testNowMs = typeof isoOrMs === 'number' ? isoOrMs : new Date(isoOrMs).getTime();
}

function nowMs() {
  return testNowMs ?? Date.now();
}

function nowIso() {
  return new Date(nowMs()).toISOString();
}

export function listPlanPeriods() {
  return PERIOD_ORDER.map((id) => getPlanDefinition(id)).filter((item) => item != null);
}

export function getPlanDefinition(periodId: string) {
  const def = PLAN_CATALOG[periodId];
  if (!def) return null;
  return {
    ...def,
    benefits: [...SHARED_BENEFITS, def.orderBenefit],
    priceLabel: formatPlanPrice(def.price, def.unit),
  };
}

export function formatPlanPrice(amount: number, unit: string) {
  const formatted = Number(amount).toLocaleString('en-US');
  return `PHP ${formatted} / ${unit}`;
}

export function formatPlanDate(iso: string | null | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addPeriod(fromIso: string, periodId: string) {
  const base = new Date(fromIso);
  const out = new Date(base.getTime());
  if (periodId === 'weekly') {
    out.setDate(out.getDate() + 7);
  } else if (periodId === 'monthly') {
    out.setMonth(out.getMonth() + 1);
  } else if (periodId === 'yearly') {
    out.setFullYear(out.getFullYear() + 1);
  }
  return out.toISOString();
}

function clampRate(periodId: string | undefined, rate: number | null | undefined) {
  const cap = MAX_DISCOUNT[periodId ?? ''] ?? 0;
  return Math.min(Math.max(rate ?? 0, 0), cap);
}

function buildStoredPlan(periodId: string, {
  startDate,
  renewalDate,
  status,
  pendingPeriodId: pending,
}: {
  startDate: string;
  renewalDate: string;
  status: string;
  pendingPeriodId?: string | null;
}): StoredPlan {
  const def = PLAN_CATALOG[periodId];
  return {
    periodId,
    periodLabel: def.periodLabel,
    name: def.name,
    price: def.price,
    priceLabel: formatPlanPrice(def.price, def.unit),
    discountRate: clampRate(periodId, def.discountRate),
    status,
    startDate,
    renewalDate,
    pendingPeriodId: pending ?? null,
  };
}

function ensurePlanField(user: User) {
  if (user.plan === undefined) user.plan = null;
}

export function setPendingPlanPeriod(periodId: string | null | undefined) {
  pendingPeriodId = periodId && PLAN_CATALOG[periodId] ? periodId : null;
}

export function peekPendingPlanPeriod() {
  return pendingPeriodId;
}

export function consumePendingPlanPeriod() {
  const value = pendingPeriodId;
  pendingPeriodId = null;
  return value;
}

export function activePlanMessage(periodLabel: string) {
  return `Your ${periodLabel} plan is active.`;
}

export function planChangeMessage(periodLabel: string, renewalIso: string) {
  return `Your plan will change to ${periodLabel} on ${formatPlanDate(renewalIso)}.`;
}

export function cancelConfirmMessage(periodLabel: string, renewalIso: string) {
  return `Cancel your ${periodLabel} plan? You can keep using it until ${formatPlanDate(renewalIso)}.`;
}

export function planEndMessage(renewalIso: string) {
  return `Your plan will end on ${formatPlanDate(renewalIso)}.`;
}

export function getPlanForUser(userId: string) {
  const user = getUser(userId);
  if (!user) return null;
  ensurePlanField(user);
  if (!user.plan) return null;
  return { ...user.plan };
}

export function isCurrentPlanPeriod(userId: string, periodId: string) {
  const plan = getPlanForUser(userId);
  if (!plan || plan.status !== 'active') return false;
  return plan.periodId === periodId;
}

export function canChoosePlan(user: {
  id?: string;
  role?: string;
  verified?: boolean;
  profileComplete?: boolean;
} | null | undefined) {
  if (!user || user.role === 'visitor' || !user.id) {
    return { ok: false, reason: 'visitor', message: PLAN_MSG.loginRequired };
  }
  if (!user.verified) {
    return { ok: false, reason: 'unverified', message: PLAN_MSG.verifyRequired };
  }
  if (user.profileComplete !== true) {
    return { ok: false, reason: 'profile', message: PLAN_MSG.verifyRequired };
  }
  return { ok: true };
}

export function beginChoosePlan(userId: string, periodId: string): ServiceResult {
  const def = getPlanDefinition(periodId);
  if (!def) return { ok: false, message: PLAN_MSG.loginRequired };

  const user = getUser(userId);
  if (!user) return { ok: false, message: PLAN_MSG.loginRequired };

  const gate = canChoosePlan({ ...user, role: 'client' });
  if (!gate.ok) return { ok: false, message: gate.message, reason: gate.reason };

  ensurePlanField(user);
  const existing = user.plan;

  if (existing?.status === 'active' && existing.periodId === periodId && !existing.pendingPeriodId) {
    return { ok: false, message: PLAN_MSG.currentPlan, alreadyActive: true };
  }

  return {
    ok: true,
    summary: {
      periodId,
      name: def.name,
      priceLabel: def.priceLabel,
      periodLabel: def.periodLabel,
      benefits: def.benefits,
      isChange: existing?.status === 'active' || existing?.status === 'cancelled',
      effectiveDate: existing?.status === 'active' ? existing.renewalDate : null,
    },
  };
}

export function confirmChoosePlan(userId: string, periodId: string): ServiceResult {
  const started = beginChoosePlan(userId, periodId);
  if (!started.ok) return started;

  const user = getUser(userId)!;
  ensurePlanField(user);
  const def = PLAN_CATALOG[periodId]!;
  const existing = user.plan;
  const start = nowIso();

  if (existing?.status === 'active' && existing.periodId !== periodId) {
    existing.pendingPeriodId = periodId;
    return {
      ok: true,
      plan: { ...user.plan } as StoredPlan,
      message: planChangeMessage(def.periodLabel, existing.renewalDate),
    };
  }

  if (existing?.status === 'active' && existing.periodId === periodId) {
    return { ok: false, message: PLAN_MSG.currentPlan, alreadyActive: true };
  }

  const renewalDate = addPeriod(start, periodId);
  user.plan = buildStoredPlan(periodId, {
    startDate: start,
    renewalDate,
    status: 'active',
  });

  return {
    ok: true,
    plan: { ...user.plan } as StoredPlan,
    message: activePlanMessage(def.periodLabel),
    startDate: formatPlanDate(start),
    renewalDate: formatPlanDate(renewalDate),
  };
}

export function cancelPlanSelection() {
  return { ok: true };
}

export function requestCancelPlan(userId: string) {
  const user = getUser(userId);
  if (!user?.plan || user.plan.status !== 'active') {
    return { ok: false };
  }
  return {
    ok: true,
    message: cancelConfirmMessage(user.plan.periodLabel, user.plan.renewalDate),
    renewalDate: user.plan.renewalDate,
  };
}

export function confirmCancelPlan(userId: string) {
  const user = getUser(userId);
  if (!user?.plan || user.plan.status !== 'active') {
    return { ok: false };
  }
  user.plan.status = 'cancelled';
  user.plan.pendingPeriodId = null;
  return {
    ok: true,
    plan: { ...user.plan },
    message: planEndMessage(user.plan.renewalDate),
  };
}

export function keepPlanChange(userId: string) {
  const user = getUser(userId);
  if (!user?.plan?.pendingPeriodId) return { ok: false };
  user.plan.pendingPeriodId = null;
  return { ok: true, plan: { ...user.plan } };
}

export function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function formatMoney(amount: number) {
  return roundMoney(amount).toFixed(2);
}

/**
 * Order discount from an active plan. Returns amounts in pesos with two decimals.
 */
export function discountFor(subtotal: number | string, plan: {
  status?: string;
  periodId?: string;
  discountRate?: number;
} | null | undefined) {
  const base = Number(subtotal) || 0;
  if (!plan || plan.status !== 'active') {
    return {
      subtotal: roundMoney(base),
      discount: null,
      total: roundMoney(base),
    };
  }
  const rate = clampRate(plan.periodId, plan.discountRate);
  const discount = roundMoney(base * rate);
  const total = roundMoney(base - discount);
  return {
    subtotal: roundMoney(base),
    discount,
    total,
  };
}

/** @internal tests */
export function __testOnlySetUserPlan(userId: string, plan: StoredPlan | null) {
  const user = getDb().users.find((item) => item.id === userId);
  if (user) user.plan = plan;
}
