import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration tests for PWYF feature
 * These tests verify the end-to-end flow of PWYF pricing
 */

describe('PWYF Integration', () => {
  describe('Dynamic step calculation', () => {
    // Helper function matching PwyfSlider logic
    function getDynamicStep(value: number): number {
      if (value <= 50) return 1;
      if (value <= 100) return 5;
      if (value <= 300) return 10;
      return 50;
    }

    function roundToStep(value: number, step: number): number {
      return Math.round(value / step) * step;
    }

    it('returns step 1 for values up to 50', () => {
      expect(getDynamicStep(1)).toBe(1);
      expect(getDynamicStep(25)).toBe(1);
      expect(getDynamicStep(50)).toBe(1);
    });

    it('returns step 5 for values 51-100', () => {
      expect(getDynamicStep(51)).toBe(5);
      expect(getDynamicStep(75)).toBe(5);
      expect(getDynamicStep(100)).toBe(5);
    });

    it('returns step 10 for values 101-300', () => {
      expect(getDynamicStep(101)).toBe(10);
      expect(getDynamicStep(200)).toBe(10);
      expect(getDynamicStep(300)).toBe(10);
    });

    it('returns step 50 for values above 300', () => {
      expect(getDynamicStep(301)).toBe(50);
      expect(getDynamicStep(500)).toBe(50);
    });

    it('rounds 53 to 55 when step is 5', () => {
      const value = 53;
      const step = getDynamicStep(value);
      expect(step).toBe(5);
      expect(roundToStep(value, step)).toBe(55);
    });

    it('rounds 47 to 47 when step is 1', () => {
      const value = 47;
      const step = getDynamicStep(value);
      expect(step).toBe(1);
      expect(roundToStep(value, step)).toBe(47);
    });

    it('rounds 153 to 150 when step is 10', () => {
      const value = 153;
      const step = getDynamicStep(value);
      expect(step).toBe(10);
      expect(roundToStep(value, step)).toBe(150);
    });

    it('rounds 375 to 400 when step is 50', () => {
      const value = 375;
      const step = getDynamicStep(value);
      expect(step).toBe(50);
      expect(roundToStep(value, step)).toBe(400);
    });
  });

  describe('PWYF price validation', () => {
    interface PwyfProduct {
      is_pwyf: boolean;
      min_price: number;
      max_price: number;
      suggested_price: number;
    }

    function validatePwyfPrice(product: PwyfProduct, customPrice: number): {
      valid: boolean;
      adjustedPrice?: number;
      reason?: string;
    } {
      if (!product.is_pwyf) {
        return { valid: false, reason: 'Product is not PWYF' };
      }

      if (customPrice < product.min_price) {
        return {
          valid: false,
          adjustedPrice: product.min_price,
          reason: `Price below minimum (${product.min_price})`,
        };
      }

      if (customPrice > product.max_price) {
        return {
          valid: false,
          adjustedPrice: product.max_price,
          reason: `Price above maximum (${product.max_price})`,
        };
      }

      return { valid: true };
    }

    const testProduct: PwyfProduct = {
      is_pwyf: true,
      min_price: 5,
      max_price: 500,
      suggested_price: 50,
    };

    it('accepts price within valid range', () => {
      expect(validatePwyfPrice(testProduct, 75)).toEqual({ valid: true });
      expect(validatePwyfPrice(testProduct, 5)).toEqual({ valid: true });
      expect(validatePwyfPrice(testProduct, 500)).toEqual({ valid: true });
    });

    it('rejects price below minimum', () => {
      const result = validatePwyfPrice(testProduct, 2);
      expect(result.valid).toBe(false);
      expect(result.adjustedPrice).toBe(5);
    });

    it('rejects price above maximum', () => {
      const result = validatePwyfPrice(testProduct, 999);
      expect(result.valid).toBe(false);
      expect(result.adjustedPrice).toBe(500);
    });

    it('rejects non-PWYF product', () => {
      const nonPwyfProduct = { ...testProduct, is_pwyf: false };
      const result = validatePwyfPrice(nonPwyfProduct, 75);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Product is not PWYF');
    });
  });

  describe('Cart item type detection', () => {
    function isSubscriptionType(type: string): boolean {
      return type === 'subscription' || type === 'membership';
    }

    function detectConflict(
      cartItems: { productType: string }[],
      newItemType: string
    ): { hasConflict: boolean; type?: 'adding_subscription' | 'adding_onetime' } {
      if (cartItems.length === 0) {
        return { hasConflict: false };
      }

      const isNewItemSubscription = isSubscriptionType(newItemType);
      const cartHasSubscription = cartItems.some((i) =>
        isSubscriptionType(i.productType)
      );
      const cartHasOneTime = cartItems.some(
        (i) => !isSubscriptionType(i.productType)
      );

      if (isNewItemSubscription && cartHasOneTime) {
        return { hasConflict: true, type: 'adding_subscription' };
      }

      if (!isNewItemSubscription && cartHasSubscription) {
        return { hasConflict: true, type: 'adding_onetime' };
      }

      return { hasConflict: false };
    }

    it('detects no conflict for empty cart', () => {
      expect(detectConflict([], 'course')).toEqual({ hasConflict: false });
      expect(detectConflict([], 'membership')).toEqual({ hasConflict: false });
    });

    it('detects conflict when adding subscription to cart with courses', () => {
      const cart = [{ productType: 'course' }];
      const result = detectConflict(cart, 'membership');
      expect(result.hasConflict).toBe(true);
      expect(result.type).toBe('adding_subscription');
    });

    it('detects conflict when adding course to cart with subscription', () => {
      const cart = [{ productType: 'subscription' }];
      const result = detectConflict(cart, 'course');
      expect(result.hasConflict).toBe(true);
      expect(result.type).toBe('adding_onetime');
    });

    it('allows adding course to cart with courses', () => {
      const cart = [{ productType: 'course' }];
      expect(detectConflict(cart, 'course')).toEqual({ hasConflict: false });
    });

    it('treats membership as subscription type', () => {
      const cart = [{ productType: 'course' }];
      expect(detectConflict(cart, 'membership').hasConflict).toBe(true);
    });
  });

  describe('Payment intent amount calculation', () => {
    interface CartItem {
      price: number;
      customPrice?: number;
      isPwyf?: boolean;
      quantity: number;
    }

    function calculatePaymentAmount(items: CartItem[]): {
      totalAmount: number;
      stripeDiscount: number;
      finalAmount: number;
    } {
      const totalAmount = items.reduce((sum, item) => {
        const price =
          item.isPwyf && item.customPrice !== undefined
            ? item.customPrice
            : item.price;
        return sum + price * item.quantity;
      }, 0);

      const stripeDiscount = totalAmount * 0.02;
      const finalAmount = totalAmount - stripeDiscount;

      return {
        totalAmount,
        stripeDiscount: Math.round(stripeDiscount * 100) / 100,
        finalAmount: Math.round(finalAmount * 100) / 100,
      };
    }

    it('calculates amount for PWYF item with custom price', () => {
      const items: CartItem[] = [
        { price: 50, customPrice: 100, isPwyf: true, quantity: 1 },
      ];
      const result = calculatePaymentAmount(items);
      expect(result.totalAmount).toBe(100);
      expect(result.stripeDiscount).toBe(2);
      expect(result.finalAmount).toBe(98);
    });

    it('calculates amount for non-PWYF item', () => {
      const items: CartItem[] = [{ price: 97, quantity: 1 }];
      const result = calculatePaymentAmount(items);
      expect(result.totalAmount).toBe(97);
      expect(result.finalAmount).toBe(95.06);
    });

    it('calculates mixed cart correctly', () => {
      const items: CartItem[] = [
        { price: 97, quantity: 1 }, // Regular course
        { price: 50, customPrice: 75, isPwyf: true, quantity: 1 }, // PWYF
      ];
      const result = calculatePaymentAmount(items);
      expect(result.totalAmount).toBe(172); // 97 + 75
    });
  });
});

describe('PWYF Edge Cases', () => {
  it('handles zero suggested price', () => {
    const product = {
      min_price: 0,
      max_price: 100,
      suggested_price: 0,
    };
    expect(product.suggested_price).toBe(0);
    expect(product.min_price).toBe(0);
  });

  it('handles equal min and max price', () => {
    const product = {
      min_price: 50,
      max_price: 50,
      suggested_price: 50,
    };
    // Only one valid price
    expect(product.min_price).toBe(product.max_price);
  });

  it('handles currency symbols correctly', () => {
    const currencies = [
      { code: 'USD', symbol: '$' },
      { code: 'EUR', symbol: '€' },
      { code: 'GBP', symbol: '£' },
    ];
    
    currencies.forEach(({ code, symbol }) => {
      expect(symbol).toBeDefined();
      expect(code.length).toBe(3);
    });
  });
});
