import {
  createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode,
} from 'react';
import type { DaySlot } from '../data/todayMenu';
import type { Meal, MealCustomization, SpecialRequest } from '../types';
import { addCartLine } from './cartRules';

import type { AddCartItemOptions, CartItem } from './cartRules';

export type { AddCartItemOptions, CartItem } from './cartRules';

interface CartValue {
  items: CartItem[];
  addItem: (
    meal: Meal,
    quantity: number,
    customization?: MealCustomization,
    options?: AddCartItemOptions,
  ) => string;
  updateQuantity: (mealId: string, quantity: number) => void;
  removeItem: (mealId: string) => void;
  /** Clears the meal chosen for one meal time (every meal time is optional). */
  removeSlot: (daySlot: DaySlot) => void;
  /** USR-51. Replaces the special request on the meal already chosen for that meal time. */
  setSpecialRequest: (daySlot: DaySlot, request: SpecialRequest | null) => void;
  clearCart: () => void;
  itemCount: number;
}

const CartContext = createContext<CartValue>({
  items: [],
  addItem: () => '',
  updateQuantity: () => {},
  removeItem: () => {},
  removeSlot: () => {},
  setSpecialRequest: () => {},
  clearCart: () => {},
  itemCount: 0,
});

export function CartProvider({ children }: { children?: ReactNode }) {
  const [items, setItemsState] = useState<CartItem[]>([]);
  // The latest cart, updated synchronously, so addItem can return a refusal
  // (one meal per meal time, three per day) in the same call that caused it.
  const itemsRef = useRef<CartItem[]>([]);
  const setItems = useCallback((update: (prev: CartItem[]) => CartItem[]) => {
    itemsRef.current = update(itemsRef.current);
    setItemsState(itemsRef.current);
  }, []);

  const addItem = useCallback((
    meal: Meal,
    quantity: number,
    customization?: MealCustomization,
    options?: AddCartItemOptions,
  ) => {
    const result = addCartLine(itemsRef.current, meal, quantity, customization, options);
    if (result.error) return result.error;
    setItems(() => result.items);
    return '';
  }, [setItems]);

  const updateQuantity = useCallback((mealId: string, quantity: number) => {
    setItems((prev) => prev.map((row) => (row.meal.id === mealId ? { ...row, quantity } : row)));
  }, [setItems]);

  const removeItem = useCallback((mealId: string) => {
    setItems((prev) => prev.filter((row) => row.meal.id !== mealId));
  }, [setItems]);

  const removeSlot = useCallback((daySlot: DaySlot) => {
    setItems((prev) => prev.filter((row) => row.daySlot !== daySlot));
  }, [setItems]);

  const setSpecialRequest = useCallback((daySlot: DaySlot, request: SpecialRequest | null) => {
    setItems((prev) => prev.map((row) => (row.daySlot === daySlot ? { ...row, specialRequest: request || undefined } : row)));
  }, [setItems]);

  const clearCart = useCallback(() => setItems(() => []), [setItems]);

  const itemCount = useMemo(
    () => items.reduce((sum, row) => sum + row.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items, addItem, updateQuantity, removeItem, removeSlot, setSpecialRequest, clearCart, itemCount,
    }),
    [items, addItem, updateQuantity, removeItem, removeSlot, setSpecialRequest, clearCart, itemCount],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
