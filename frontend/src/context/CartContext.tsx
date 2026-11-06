import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Meal } from '../types';

interface CartItem {
  meal: Meal;
  quantity: number;
}

interface CartValue {
  items: CartItem[];
  addItem: (meal: Meal, quantity: number) => void;
  updateQuantity: (mealId: string, quantity: number) => void;
  removeItem: (mealId: string) => void;
  clearCart: () => void;
  itemCount: number;
}

const CartContext = createContext<CartValue>({
  items: [],
  addItem: () => {},
  updateQuantity: () => {},
  removeItem: () => {},
  clearCart: () => {},
  itemCount: 0,
});

export function CartProvider({ children }: { children?: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((meal: Meal, quantity: number) => {
    setItems((prev) => {
      const idx = prev.findIndex((row) => row.meal.id === meal.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
        return next;
      }
      return [...prev, { meal, quantity }];
    });
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
