import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Meal, MealCustomization } from '../types';
import { customizationLabel, validateOrderSelection } from '../services/orderService';

interface CartItem {
  meal: Meal;
  quantity: number;
  customization?: MealCustomization;
  customizationLabel?: string;
}

interface CartValue {
  items: CartItem[];
  addItem: (meal: Meal, quantity: number, customization?: MealCustomization) => string;
  updateQuantity: (mealId: string, quantity: number) => void;
  removeItem: (mealId: string) => void;
  clearCart: () => void;
  itemCount: number;
}

const CartContext = createContext<CartValue>({
  items: [],
  addItem: () => '',
  updateQuantity: () => {},
  removeItem: () => {},
  clearCart: () => {},
  itemCount: 0,
});

export function CartProvider({ children }: { children?: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((meal: Meal, quantity: number, customization?: MealCustomization) => {
    let error = '';
    setItems((prev) => {
      const next = prev.filter((row) => row.meal.id !== meal.id);
      next.push({
        meal,
        quantity,
        customization,
        customizationLabel: customizationLabel(customization),
      });
      const check = validateOrderSelection(next);
      if (!check.ok) {
        error = check.message || '';
        return prev;
      }
      error = '';
      return next;
    });
    return error;
  }, []);

  const updateQuantity = useCallback((mealId: string, quantity: number) => {
    setItems((prev) => prev.map((row) => (row.meal.id === mealId ? { ...row, quantity } : row)));
  }, []);

  const removeItem = useCallback((mealId: string) => {
    setItems((prev) => prev.filter((row) => row.meal.id !== mealId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(
    () => items.reduce((sum, row) => sum + row.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items, addItem, updateQuantity, removeItem, clearCart, itemCount,
    }),
    [items, addItem, updateQuantity, removeItem, clearCart, itemCount],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
