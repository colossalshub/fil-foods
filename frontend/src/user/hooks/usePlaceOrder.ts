import { useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import type { AuthTokenSession, AuthUser, Order, ServiceResult } from '../types';
import { useCart } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import {
  ORDER_MSG,
  collectOrderAllergenWarnings,
  confirmOrder,
  parseQuantityInput,
  validateFulfillment,
} from '../services/orderService';
import { confirmChoosePlan, setPendingPlanPeriod, subscriptionForCheckout } from '../services/planService';
import { isSupabaseConfigured } from '../../lib/supabaseClient.js';
import { placeOrderWithBackend, saveMealRecipientWithBackend } from '../services/backendOrderService.js';
import { mapBackendOrder } from '../services/trackingService.js';
import { orderCatalogIdentity } from '../domain/readyMeals.js';
import { specialRequestLabel } from '../domain/specialRequest.js';
import { combineSchedule } from '../components/scheduleValue';
import type { MealMatchProfile } from '../types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createRequestId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return Crypto.randomUUID();
}

export function usePlaceOrder(user: AuthUser | null | undefined, session: AuthTokenSession | null | undefined, profile: MealMatchProfile | null, recipientName: string) {
  const { items, clearCart } = useCart();
  const checkout = useCheckout();
  const [placing, setPlacing] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const attemptRef = useRef<{ id: string | null; key: string }>({ id: null, key: '' });

  const lineItems = items.map((row) => ({
    meal: row.meal,
    quantity: row.quantity,
    customization: row.customization,
    specialRequest: row.specialRequest,
  }));

  const warnings = profile
    ? collectOrderAllergenWarnings(lineItems, profile, recipientName)
    : [];

  const placeOrder = async (): Promise<{
    ok: boolean;
    order?: Order | null;
    messages?: string[];
    allergenBlocked?: boolean;
    placing?: boolean;
  }> => {
    if (!user?.id || !lineItems.length) {
      return { ok: false, messages: ['No meals selected.'] };
    }
    // Revised USR-11/12: allergen meals cannot be ordered; there is no "I understand" override.
    if (warnings.length) {
      return { ok: false, allergenBlocked: true, messages: warnings.map((w) => w.message) };
    }

    const fulfillment = {
      type: checkout.fulfillmentType,
      address: checkout.fulfillmentType === 'delivery' ? checkout.address : '',
      scheduledAt: combineSchedule(checkout.scheduleDate, checkout.scheduleTime),
      instructions: checkout.instructions,
    };
    const check = validateFulfillment({ ...fulfillment, now: new Date() });
    if (!check.ok) {
      setFieldError(check.message || '');
      return { ok: false, messages: [check.message || ORDER_MSG.chooseFulfillment] };
    }
    setFieldError('');

    const subscribed = subscriptionForCheckout(user.id, user.plan);
    const planId = subscribed ? 'standard' : checkout.planId;
    if (planId === 'standard') {
      setPendingPlanPeriod(null);
    } else {
      setPendingPlanPeriod(planId);
    }

    const attemptKey = JSON.stringify({
      items: lineItems.map((row) => [row.meal.id, String(row.quantity), specialRequestLabel(row.specialRequest)]),
      type: fulfillment.type,
      address: fulfillment.address,
      scheduledAt: fulfillment.scheduledAt,
      instructions: fulfillment.instructions,
    });
    if (attemptRef.current.key !== attemptKey || !UUID_PATTERN.test(attemptRef.current.id || '')) {
      attemptRef.current = { id: createRequestId(), key: attemptKey };
    }

    setPlacing(true);
    let result: (ServiceResult & {
      order?: Order | null;
      placing?: boolean;
      allergenBlocked?: boolean;
    }) | undefined;
    try {
      if (isSupabaseConfigured) {
        const authSession = session?.access_token ? session : {
          access_token: user.accessToken,
          refresh_token: user.refreshToken,
          expires_at: user.expiresAt,
        };
        if (user.accountFor === 'family' && user.mealRecipient) {
          await saveMealRecipientWithBackend(user.mealRecipient, authSession);
        }
        const payload = {
          planId,
          authSession,
          fulfillmentType: fulfillment.type,
          schedule: check.scheduled!.toISOString(),
          address: fulfillment.address,
          specialInstructions: fulfillment.instructions,
          items: lineItems.map((row) => {
            const parsed = parseQuantityInput(row.quantity);
            const catalog = orderCatalogIdentity(row.meal);
            return {
              mealId: catalog.mealId,
              mealName: catalog.mealName,
              mealCategory: row.meal.category,
              quantity: parsed.ok ? parsed.value : 0,
              specialRequest: row.specialRequest,
            };
          }),
        };
        const resubmitOrderId = checkout.resubmitOrderId;
        let backendOrder = await placeOrderWithBackend({
          ...payload,
          clientRequestId: attemptRef.current.id || '',
          resubmitOrderId,
        });
        const createdAt = new Date(backendOrder?.created_at).getTime();
        // A resubmitted order keeps its original created_at, so it is never mistaken for a stale replay.
        if (!resubmitOrderId && Number.isFinite(createdAt) && createdAt < Date.now() - 15000) {
          attemptRef.current = { id: createRequestId(), key: attemptKey };
          backendOrder = await placeOrderWithBackend({
            ...payload,
            clientRequestId: attemptRef.current.id || '',
          });
        }
        result = {
          ok: true,
          order: mapBackendOrder(backendOrder as Parameters<typeof mapBackendOrder>[0]),
          message: resubmitOrderId ? ORDER_MSG.orderResubmitted : ORDER_MSG.orderSuccess,
        };
        attemptRef.current = { id: null, key: '' };
        if (result?.ok && planId !== 'standard') {
          confirmChoosePlan(user.id, planId as 'weekly' | 'monthly' | 'yearly');
        }
      } else {
        result = confirmOrder(user.id, {
          items: lineItems,
          fulfillment,
          now: new Date(),
          clientRequestId: attemptRef.current.id || '',
          planId,
          resubmitOrderId: checkout.resubmitOrderId,
        }) as NonNullable<typeof result>;
        if (result?.ok && planId !== 'standard') {
          confirmChoosePlan(user.id, planId as 'weekly' | 'monthly' | 'yearly');
        }
      }
    } catch (error) {
      const message = (error as { message?: string } | undefined)?.message;
      result = { ok: false, messages: [message || 'Unable to place order.'] };
    } finally {
      setPlacing(false);
    }

    if (!result?.ok) {
      if (result?.placing) return { ok: false, placing: true };
      if (result?.allergenBlocked) {
        return { ok: false, allergenBlocked: true, messages: result.messages };
      }
      return { ok: false, messages: result?.messages || [fieldError || 'Unable to place order.'] };
    }

    clearCart();
    checkout.setResubmit(null, null);
    return { ok: true, order: result.order ?? null };
  };

  return {
    lineItems,
    warnings,
    fieldError,
    setFieldError,
    placing,
    placeOrder,
  };
}