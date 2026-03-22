import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { StorefrontProduct } from "@/lib/storefront-product";
import { toast } from "@/hooks/use-toast";
import { useStorefrontRates } from "@/hooks/useApi";
import { FLAT_SHIPPING_RATE, FREE_SHIPPING_THRESHOLD, TAX_RATE } from "@/config/constants";

export interface CartItem {
  product: StorefrontProduct;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: StorefrontProduct, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  /** From GET /settings/storefront (falls back to constants). */
  freeShippingThreshold: number;
  flatShippingRate: number;
  taxCombinedRate: number;
  lastAddedAt: number; // timestamp to trigger badge animation
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [lastAddedAt, setLastAddedAt] = useState(0);
  const { data: storefrontRes } = useStorefrontRates();
  const storefront = storefrontRes?.data;

  const addItem = useCallback((product: StorefrontProduct, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { product, quantity: qty }];
    });
    setLastAddedAt(Date.now());

    toast({
      title: "Added to cart",
      description: `${product.name} × ${qty}`,
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const freeShippingThreshold = storefront?.free_shipping_threshold ?? FREE_SHIPPING_THRESHOLD;
  const flatShippingRate = storefront?.flat_shipping_rate ?? FLAT_SHIPPING_RATE;
  const taxCombinedRate = storefront?.tax_combined_rate ?? TAX_RATE;

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const { tax, shipping, total } = useMemo(() => {
    const t = Math.round(subtotal * taxCombinedRate * 100) / 100;
    const ship =
      subtotal <= 0 ? 0 : subtotal >= freeShippingThreshold ? 0 : flatShippingRate;
    const tot = Math.round((subtotal + t + ship) * 100) / 100;
    return { tax: t, shipping: ship, total: tot };
  }, [subtotal, taxCombinedRate, freeShippingThreshold, flatShippingRate]);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        tax,
        shipping,
        total,
        freeShippingThreshold,
        flatShippingRate,
        taxCombinedRate,
        lastAddedAt,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
