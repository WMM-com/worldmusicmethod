import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  courseId?: string;
  productType: string;
  customPrice?: number; // For PWYF products
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => boolean;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateCustomPrice: (productId: string, customPrice: number) => void;
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
    
    setItems(prev => {
      // EXCLUSIVE CART: If adding different product type - clear cart and add new item
      if (prev.length > 0) {
        const cartHasSubscription = prev.some(i => isSubscriptionType(i.productType));
        const cartHasOneTime = prev.some(i => !isSubscriptionType(i.productType));
        
        // If mixing types, clear cart and start fresh with new item
        if ((isNewItemSubscription && cartHasOneTime) || (!isNewItemSubscription && cartHasSubscription)) {
          return [{ ...item, quantity: 1 }];
        }
      }
      
      const existing = prev.find(i => i.productId === item.productId);
      if (existing) {
        // For courses/subscriptions, don't increase quantity
        if (item.productType === 'course' || isSubscriptionType(item.productType)) {
          // Update custom price if provided
          if (item.customPrice !== undefined) {
            return prev.map(i => 
              i.productId === item.productId 
                ? { ...i, customPrice: item.customPrice, price: item.customPrice }
                : i
            );
          }
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

  const updateCustomPrice = (productId: string, customPrice: number) => {
    setItems(prev => prev.map(i => 
      i.productId === productId 
        ? { ...i, customPrice, price: customPrice }
        : i
    ));
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotal = () => {
    return items.reduce((sum, item) => {
      const price = item.customPrice ?? item.price;
      return sum + price * item.quantity;
    }, 0);
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
      updateCustomPrice,
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
