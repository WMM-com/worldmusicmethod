import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { CartProvider, useCart } from '@/contexts/CartContext';

// Test component to access cart context
function TestConsumer({ onMount }: { onMount: (cart: ReturnType<typeof useCart>) => void }) {
  const cart = useCart();
  onMount(cart);
  return null;
}

function renderWithCart(onMount: (cart: ReturnType<typeof useCart>) => void) {
  return render(
    <CartProvider>
      <TestConsumer onMount={onMount} />
    </CartProvider>
  );
}

describe('CartContext PWYF functionality', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('adds PWYF item with custom price', () => {
    let cartRef: ReturnType<typeof useCart>;
    
    renderWithCart((cart) => { cartRef = cart; });
    
    act(() => {
      cartRef.addToCart({
        productId: 'pwyf-1',
        name: 'PWYF Membership',
        price: 50, // base price
        currency: 'USD',
        productType: 'membership',
        isPwyf: true,
        customPrice: 75,
        minPrice: 5,
        maxPrice: 500,
      });
    });
    
    expect(cartRef.items).toHaveLength(1);
    expect(cartRef.items[0].customPrice).toBe(75);
    expect(cartRef.items[0].price).toBe(75); // Price should be set to customPrice
    expect(cartRef.items[0].isPwyf).toBe(true);
  });

  it('calculates total with PWYF custom price', () => {
    let cartRef: ReturnType<typeof useCart>;
    
    renderWithCart((cart) => { cartRef = cart; });
    
    act(() => {
      cartRef.addToCart({
        productId: 'pwyf-2',
        name: 'PWYF Membership',
        price: 50,
        currency: 'USD',
        productType: 'membership',
        isPwyf: true,
        customPrice: 100,
        minPrice: 5,
        maxPrice: 500,
      });
    });
    
    expect(cartRef.getTotal()).toBe(100);
  });

  it('updates PWYF custom price', () => {
    let cartRef: ReturnType<typeof useCart>;
    
    renderWithCart((cart) => { cartRef = cart; });
    
    act(() => {
      cartRef.addToCart({
        productId: 'pwyf-3',
        name: 'PWYF Membership',
        price: 50,
        currency: 'USD',
        productType: 'membership',
        isPwyf: true,
        customPrice: 75,
        minPrice: 5,
        maxPrice: 500,
      });
    });
    
    act(() => {
      cartRef.updateCustomPrice('pwyf-3', 150);
    });
    
    expect(cartRef.items[0].customPrice).toBe(150);
    expect(cartRef.items[0].price).toBe(150);
    expect(cartRef.getTotal()).toBe(150);
  });

  it('rejects custom price outside valid range', () => {
    let cartRef: ReturnType<typeof useCart>;
    
    renderWithCart((cart) => { cartRef = cart; });
    
    act(() => {
      cartRef.addToCart({
        productId: 'pwyf-4',
        name: 'PWYF Membership',
        price: 50,
        currency: 'USD',
        productType: 'membership',
        isPwyf: true,
        customPrice: 75,
        minPrice: 5,
        maxPrice: 500,
      });
    });
    
    // Try to update to price below min
    act(() => {
      cartRef.updateCustomPrice('pwyf-4', 2);
    });
    
    // Should remain unchanged
    expect(cartRef.items[0].customPrice).toBe(75);
  });
});

describe('CartContext cart methods', () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('identifies cart has PWYF product', () => {
    let cartRef: ReturnType<typeof useCart>;
    
    const { unmount } = renderWithCart((cart) => { cartRef = cart; });
    
    // Initially empty
    expect(cartRef.items).toHaveLength(0);
    expect(cartRef.hasPwyfProduct()).toBe(false);
    
    act(() => {
      cartRef.addToCart({
        productId: 'pwyf-check',
        name: 'PWYF Membership',
        price: 50,
        currency: 'USD',
        productType: 'membership',
        isPwyf: true,
        customPrice: 75,
        minPrice: 5,
        maxPrice: 500,
      });
    });
    
    expect(cartRef.hasPwyfProduct()).toBe(true);
    unmount();
  });

  it('clears cart when clearCart is called', () => {
    let cartRef: ReturnType<typeof useCart>;
    
    const { unmount } = renderWithCart((cart) => { cartRef = cart; });
    
    act(() => {
      cartRef.addToCart({
        productId: 'course-clear',
        name: 'Guitar Course',
        price: 97,
        currency: 'USD',
        productType: 'course',
      });
    });
    
    expect(cartRef.items).toHaveLength(1);
    
    act(() => {
      cartRef.clearCart();
    });
    
    expect(cartRef.items).toHaveLength(0);
    expect(cartRef.getTotal()).toBe(0);
    unmount();
  });
});

describe('CartContext subscription/one-time conflict detection', () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('detects one-time product type correctly', () => {
    let cartRef: ReturnType<typeof useCart>;
    
    const { unmount } = renderWithCart((cart) => { cartRef = cart; });
    
    act(() => {
      cartRef.addToCart({
        productId: 'course-type-test',
        name: 'Guitar Course',
        price: 97,
        currency: 'USD',
        productType: 'course',
      });
    });
    
    expect(cartRef.hasOneTimeProduct()).toBe(true);
    expect(cartRef.hasSubscription()).toBe(false);
    unmount();
  });

  it('detects subscription type correctly', () => {
    let cartRef: ReturnType<typeof useCart>;
    
    const { unmount } = renderWithCart((cart) => { cartRef = cart; });
    
    act(() => {
      cartRef.addToCart({
        productId: 'membership-type-test',
        name: 'Membership',
        price: 50,
        currency: 'USD',
        productType: 'subscription',
      });
    });
    
    expect(cartRef.hasSubscription()).toBe(true);
    expect(cartRef.hasOneTimeProduct()).toBe(false);
    unmount();
  });

  it('returns false when adding conflicting item (pending confirmation)', () => {
    let cartRef: ReturnType<typeof useCart>;
    
    const { unmount } = renderWithCart((cart) => { cartRef = cart; });
    
    // Add a course first
    act(() => {
      cartRef.addToCart({
        productId: 'course-conflict',
        name: 'Guitar Course',
        price: 97,
        currency: 'USD',
        productType: 'course',
      });
    });
    
    expect(cartRef.items).toHaveLength(1);
    
    // Try to add subscription - should return false (pending confirmation)
    let result: boolean = true;
    act(() => {
      result = cartRef.addToCart({
        productId: 'membership-conflict',
        name: 'Membership',
        price: 50,
        currency: 'USD',
        productType: 'membership',
      });
    });
    
    // Should return false because conflict dialog should be shown
    expect(result).toBe(false);
    // Original course should still be in cart
    expect(cartRef.items).toHaveLength(1);
    expect(cartRef.items[0].productId).toBe('course-conflict');
    unmount();
  });

  it('allows adding same product type without conflict', () => {
    let cartRef: ReturnType<typeof useCart>;
    
    const { unmount } = renderWithCart((cart) => { cartRef = cart; });
    
    // Add first course
    act(() => {
      cartRef.addToCart({
        productId: 'course-same-1',
        name: 'Guitar Course',
        price: 97,
        currency: 'USD',
        productType: 'course',
      });
    });
    
    // Add second course - should succeed
    let result: boolean = false;
    act(() => {
      result = cartRef.addToCart({
        productId: 'course-same-2',
        name: 'Piano Course',
        price: 147,
        currency: 'USD',
        productType: 'course',
      });
    });
    
    expect(result).toBe(true);
    expect(cartRef.items).toHaveLength(2);
    unmount();
  });
});
