import { useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import type { AuthTokenSession, AuthUser, Order, ServiceResult } from '../types';
import { getUser } from '../services/authService';
import { useCart } from '../context/CartContext';
import { useCheckout } from '../context/CheckoutContext';
import {
  ORDER_MSG,
  collectOrderAllergenWarnings,
  confirmOrder,
  parseQuantityInput,
  validateFulfillment,
} from '../services/orderService';
import { confirmChoosePlan, setPendingPlanPeriod } from '../services/planService';
import { isSupabaseConfigured } from '../../lib/supabaseClient.js';
import { placeOrderWithBackend } from '../services/backendOrderService.js';
import { mapBackendOrder } from '../services/trackingService.js';
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
  }));

  const warnings = profile
    ? collectOrderAllergenWarnings(lineItems, profile, recipientName)
    : [];

  const placeOrder = async (): Promise<{
    ok: boolean;
    order?: Order | null;
    messages?: string[];
    needsAcknowledgement?: boolean;
    placing?: boolean;
  }> => {
    if (!user?.id || !lineItems.length) {
      return { ok: false, messages: ['No meals selected.'] };
    }
    if (warnings.length && !checkout.allergenAck) {
      return { ok: false, needsAcknowledgement: true, messages: warnings.map((w) => w.message) };
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

    if (checkout.planId === 'standard') {
      setPendingPlanPeriod(null);
    } else {
      setPendingPlanPeriod(checkout.planId);
    }

    const attemptKey = JSON.stringify({
      items: lineItems.map((row) => [row.meal.id, String(row.quantity)]),
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
      needsAcknowledgement?: boolean;
    }) | undefined;
    try {
      if (isSupabaseConfigured) {
        const authSession = session?.access_token ? session : {
          access_token: user.accessToken,
          refresh_token: user.refreshToken,
          expires_at: user.expiresAt,
        };
        const payload = {
          authSession,
          fulfillmentType: fulfillment.type,
          schedule: check.scheduled!.toISOString(),
          address: fulfillment.address,
          specialInstructions: fulfillment.instructions,
          items: lineItems.map((row) => {
            const parsed = parseQuantityInput(row.quantity);
            return {
              mealId: row.meal.id,
              mealName: row.meal.name,
              mealCategory: row.meal.category,
              quantity: parsed.ok ? parsed.value : 0,
            };
          }),
        };
        let backendOrder = await placeOrderWithBackend({
          ...payload,
          clientRequestId: attemptRef.current.id || '',
        });
        const createdAt = new Date(backendOrder?.created_at).getTime();
        if (Number.isFinite(createdAt) && createdAt < Date.now() - 15000) {
          attemptRef.current = { id: createRequestId(), key: attemptKey };
          backendOrder = await placeOrderWithBackend({
            ...payload,
            clientRequestId: attemptRef.current.id || '',
          });
        }
        result = {
          ok: true,
          order: mapBackendOrder(backendOrder as Parameters<typeof mapBackendOrder>[0]),
          message: ORDER_MSG.orderSuccess,
        };
        attemptRef.current = { id: null, key: '' };
        if (result?.ok && checkout.planId !== 'standard') {
          confirmChoosePlan(user.id, checkout.planId as 'weekly' | 'monthly' | 'yearly');
        }
      } else {
        result = confirmOrder(user.id, {
          items: lineItems,
          fulfillment,
          now: new Date(),
          clientRequestId: attemptRef.current.id || '',
          allergenAcknowledged: checkout.allergenAck || warnings.length === 0,
        }) as NonNullable<typeof result>;
        if (result?.ok && checkout.planId !== 'standard') {
          confirmChoosePlan(user.id, checkout.planId as 'weekly' | 'monthly' | 'yearly');
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
      if (result?.needsAcknowledgement) {
        return { ok: false, needsAcknowledgement: true, messages: result.messages };
      }
      return { ok: false, messages: result?.messages || [fieldError || 'Unable to place order.'] };
    }

    clearCart();
    checkout.setAllergenAck(false);
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