import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const CartContext = createContext({
  items: [],
  addItem: () => {},
  updateQuantity: () => {},
  removeItem: () => {},
  clearCart: () => {},
  itemCount: 0,
});

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = useCallback((meal, quantity) => {
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

  const updateQuantity = useCallback((mealId, quantity) => {
    setItems((prev) => prev.map((row) => (row.meal.id === mealId ? { ...row, quantity } : row)));
  }, []);

  const removeItem = useCallback((mealId) => {
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
