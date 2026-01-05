import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  courseId?: string;
  productType: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => boolean;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  hasSubscription: () => boolean;
  hasOneTimeProduct: () => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'wmm_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const isSubscriptionType = (type: string) => 
    type === 'subscription' || type === 'membership';

  const hasSubscription = () => items.some(i => isSubscriptionType(i.productType));
  const hasOneTimeProduct = () => items.some(i => !isSubscriptionType(i.productType));

  const addToCart = (item: Omit<CartItem, 'quantity'>): boolean => {
    const isNewItemSubscription = isSubscriptionType(item.productType);
    
    // Check for mixed product types
    if (items.length > 0) {
      const cartHasSubscription = hasSubscription();
      const cartHasOneTime = hasOneTimeProduct();
      
      if (isNewItemSubscription && cartHasOneTime) {
        return false; // Cannot add subscription to cart with one-time products
      }
      if (!isNewItemSubscription && cartHasSubscription) {
        return false; // Cannot add one-time product to cart with subscriptions
      }
    }
    
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      if (existing) {
        // For courses/subscriptions, don't increase quantity
        if (item.productType === 'course' || isSubscriptionType(item.productType)) {
          return prev;
        }
        return prev.map(i => 
          i.productId === item.productId 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    return true;
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems(prev => prev.map(i => 
      i.productId === productId ? { ...i, quantity } : i
    ));
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotal = () => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getItemCount = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotal,
      getItemCount,
      hasSubscription,
      hasOneTimeProduct,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
