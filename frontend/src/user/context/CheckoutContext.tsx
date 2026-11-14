import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';
import type { CheckoutPlanId } from '../data/checkoutCopy';

export interface CheckoutDraft {
  planId: CheckoutPlanId;
  fulfillmentType: string | null;
  address: string;
  scheduleDate: Date | null;
  scheduleTime: Date | null;
  instructions: string;
  allergenAck: boolean;
}

interface CheckoutValue extends CheckoutDraft {
  setPlanId: (id: CheckoutPlanId) => void;
  setFulfillmentType: (type: string | null) => void;
  setAddress: (value: string) => void;
  setScheduleDate: (value: Date | null) => void;
  setScheduleTime: (value: Date | null) => void;
  setInstructions: (value: string) => void;
  setAllergenAck: (value: boolean) => void;
  resetCheckout: () => void;
}

const defaultDraft: CheckoutDraft = {
  planId: 'standard',
  fulfillmentType: null,
  address: '',
  scheduleDate: null,
  scheduleTime: null,
  instructions: '',
  allergenAck: false,
};

const CheckoutContext = createContext<CheckoutValue | null>(null);

export function CheckoutProvider({ children }: { children?: ReactNode }) {
  const [draft, setDraft] = useState<CheckoutDraft>(defaultDraft);

  const patch = useCallback((partial: Partial<CheckoutDraft>) => {
    setDraft((current) => ({ ...current, ...partial }));
  }, []);

  const resetCheckout = useCallback(() => {
    setDraft(defaultDraft);
  }, []);

  const value = useMemo<CheckoutValue>(() => ({
    ...draft,
    setPlanId: (planId) => patch({ planId }),
    setFulfillmentType: (fulfillmentType) => patch({ fulfillmentType }),
    setAddress: (address) => patch({ address }),
    setScheduleDate: (scheduleDate) => patch({ scheduleDate }),
    setScheduleTime: (scheduleTime) => patch({ scheduleTime }),
    setInstructions: (instructions) => patch({ instructions }),
    setAllergenAck: (allergenAck) => patch({ allergenAck }),
    resetCheckout,
  }), [draft, patch, resetCheckout]);

  return (
    <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const value = useContext(CheckoutContext);
  if (!value) throw new Error('useCheckout requires CheckoutProvider');
  return value;
}