import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartConflictDialog } from '@/components/cart/CartConflictDialog';

export interface CartItem {
  productId: string;
  name: string;
  price: number; // Base price or PWYF selected price
  currency: string;
  quantity: number;
  courseId?: string;
  productType: string;
  customPrice?: number; // For PWYF products - the user-selected price
  isPwyf?: boolean; // Flag to identify PWYF products
  minPrice?: number; // Min price for validation
  maxPrice?: number; // Max price for validation
}

interface PendingItem {
  item: Omit<CartItem, 'quantity'>;
  isAddingSubscription: boolean;
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
  hasPwyfProduct: () => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'wmm_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  // State for conflict dialog
  const [pendingItem, setPendingItem] = useState<PendingItem | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const isSubscriptionType = (type: string) => 
    type === 'subscription' || type === 'membership';

  const hasSubscription = () => items.some(i => isSubscriptionType(i.productType));
  const hasOneTimeProduct = () => items.some(i => !isSubscriptionType(i.productType));
  const hasPwyfProduct = () => items.some(i => i.isPwyf);

  // Internal function to actually add item (after confirmation if needed)
  const performAddToCart = useCallback((item: Omit<CartItem, 'quantity'>, clearFirst: boolean): boolean => {
    // Validate PWYF price
    if (item.isPwyf && item.customPrice !== undefined) {
      const minPrice = item.minPrice || 0;
      const maxPrice = item.maxPrice || Infinity;
      if (item.customPrice < minPrice || item.customPrice > maxPrice) {
        console.error('[Cart] PWYF price out of range:', { customPrice: item.customPrice, minPrice, maxPrice });
        return false;
      }
    }
    
    setItems(prev => {
      // If we need to clear first due to type conflict
      if (clearFirst) {
        const finalItem = item.isPwyf && item.customPrice !== undefined
          ? { ...item, price: item.customPrice, quantity: 1 }
          : { ...item, quantity: 1 };
        return [finalItem];
      }
      
      const existing = prev.find(i => i.productId === item.productId);
      if (existing) {
        // For courses/subscriptions/PWYF, don't increase quantity, just update price
        if (item.productType === 'course' || isSubscriptionType(item.productType) || item.isPwyf) {
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
      
      // For PWYF products, use customPrice as the price
      const finalItem = item.isPwyf && item.customPrice !== undefined
        ? { ...item, price: item.customPrice, quantity: 1 }
        : { ...item, quantity: 1 };
        
      return [...prev, finalItem];
    });
    return true;
  }, []);

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>): boolean => {
    const isNewItemSubscription = isSubscriptionType(item.productType);
    
    // Check for cart type conflict
    if (items.length > 0) {
      const cartHasSubscription = items.some(i => isSubscriptionType(i.productType));
      const cartHasOneTime = items.some(i => !isSubscriptionType(i.productType));
      
      // If mixing types, show confirmation dialog
      if ((isNewItemSubscription && cartHasOneTime) || (!isNewItemSubscription && cartHasSubscription)) {
        setPendingItem({ item, isAddingSubscription: isNewItemSubscription });
        setShowConflictDialog(true);
        return false; // Return false - item not added yet, pending confirmation
      }
    }
    
    // No conflict, add directly
    return performAddToCart(item, false);
  }, [items, performAddToCart]);

  const handleConflictConfirm = useCallback(() => {
    if (pendingItem) {
      performAddToCart(pendingItem.item, true);
    }
    setPendingItem(null);
    setShowConflictDialog(false);
  }, [pendingItem, performAddToCart]);

  const handleConflictCancel = useCallback(() => {
    setPendingItem(null);
    setShowConflictDialog(false);
  }, []);

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
    setItems(prev => prev.map(i => {
      if (i.productId !== productId) return i;
      
      // Validate PWYF price range
      const minPrice = i.minPrice || 0;
      const maxPrice = i.maxPrice || Infinity;
      if (customPrice < minPrice || customPrice > maxPrice) {
        console.warn('[Cart] Custom price out of range:', { customPrice, minPrice, maxPrice });
        return i;
      }
      
      return { ...i, customPrice, price: customPrice };
    }));
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotal = () => {
    return items.reduce((sum, item) => {
      // For PWYF products, always use customPrice if set
      const price = item.isPwyf && item.customPrice !== undefined 
        ? item.customPrice 
        : (item.customPrice ?? item.price);
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
      hasPwyfProduct,
    }}>
      {children}
      <CartConflictDialog
        open={showConflictDialog}
        onConfirm={handleConflictConfirm}
        onCancel={handleConflictCancel}
        isAddingSubscription={pendingItem?.isAddingSubscription ?? false}
      />
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
