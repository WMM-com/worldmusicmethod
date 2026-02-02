# Pay What You Feel (PWYF) Testing Guide

This guide covers manual and automated testing for the PWYF feature.

---

## Manual Testing Checklist

### 1. Admin Dashboard Setup
- [ ] Navigate to Admin Dashboard → Products
- [ ] Edit a product (e.g., a Membership)
- [ ] Toggle "Pay What You Feel" ON
- [ ] Set **Min Price**: `5`
- [ ] Set **Max Price**: `500`
- [ ] Set **Suggested Price**: `50`
- [ ] Click Save and verify toast confirmation

### 2. Slider Behavior Testing
- [ ] Navigate to the product's checkout/landing page
- [ ] Verify slider shows with min `$5`, max `$500`, suggested `$50`
- [ ] **Test value 55**: Drag slider to ~55 → Should work (step is 5 at this range)
- [ ] **Test value 53**: Try typing `53` in input → Should snap to `55` on blur (nearest step)
- [ ] Verify "Suggested" marker appears at correct position
- [ ] Verify step indicator updates dynamically:
  - Values ≤50: Step = 1
  - Values 51-100: Step = 5
  - Values 101-300: Step = 10
  - Values >300: Step = 50

### 3. Cart Integration
- [ ] Select a PWYF price (e.g., `$75`)
- [ ] Click "Add to Cart"
- [ ] Open cart → Verify item shows `$75` (not base price)
- [ ] Navigate to Checkout → Verify total reflects `$75`

### 4. Cart Conflict Resolution
- [ ] Add a **Course** (one-time purchase) to cart first
- [ ] Then add a **PWYF Membership** (subscription)
- [ ] Verify conflict dialog appears: "Replace cart with subscription?"
- [ ] Click "Yes, replace cart"
- [ ] Verify Course is removed, only Membership remains
- [ ] Verify Membership shows correct PWYF custom price

### 5. Payment Intent Verification
- [ ] Proceed to Stripe checkout with PWYF item
- [ ] Open browser DevTools → Network tab
- [ ] Find `create-payment-intent` request
- [ ] Verify request payload includes correct `amounts` array with PWYF price
- [ ] Verify response `amount` matches (minus 2% Stripe discount)

---

## Debug Console Logs

Add these to help debug PWYF issues:

### CartContext.tsx (around line 63)
```typescript
// In performAddToCart function
console.log('[Cart] Adding item:', {
  productId: item.productId,
  isPwyf: item.isPwyf,
  customPrice: item.customPrice,
  minPrice: item.minPrice,
  maxPrice: item.maxPrice,
});
```

### CartContext.tsx (around line 181)
```typescript
// In getTotal function
console.log('[Cart] Calculating total:', items.map(i => ({
  name: i.name,
  price: i.price,
  customPrice: i.customPrice,
  isPwyf: i.isPwyf,
  finalPrice: i.isPwyf && i.customPrice !== undefined ? i.customPrice : i.price
})));
```

### PwyfSlider.tsx (around line 53)
```typescript
// In handleSliderChange
console.log('[PWYF Slider] Value changed:', {
  rawValue,
  step,
  steppedValue,
  clampedValue,
});
```

### create-payment-intent/index.ts (around line 110)
```typescript
// Already has logging, but add more detail:
console.log("[CREATE-PAYMENT-INTENT] PWYF validation:", {
  productId: product.id,
  receivedAmount: productAmount,
  minPrice: product.min_price,
  maxPrice: product.max_price,
  suggestedPrice: product.suggested_price,
  isValid: productAmount >= minPrice && productAmount <= maxPrice,
});
```

---

## Automated Tests

See test files in `src/test/pwyf/` directory:
- `PwyfSlider.test.tsx` - Slider component behavior
- `CartContext.test.tsx` - Cart state management and conflicts
- `pwyf-integration.test.tsx` - End-to-end PWYF flow

Run tests with:
```bash
npm run test
# or
bun test
```

---

## Edge Cases to Test

| Scenario | Expected Behavior |
|----------|-------------------|
| PWYF product with price below min | Reject or snap to min |
| PWYF product with price above max | Reject or snap to max |
| Toggle PWYF off on product | Clear min/max/suggested in DB |
| Currency conversion with PWYF | Price bounds converted correctly |
| Multiple PWYF items in cart | Each maintains its custom price |
| Refresh page with PWYF in cart | localStorage preserves custom price |

---

## Common Issues & Solutions

### Issue: Slider value doesn't match input
**Cause**: Dynamic stepping rounds to nearest valid step
**Solution**: This is expected behavior. Input values snap on blur.

### Issue: Cart shows base price instead of custom
**Cause**: `customPrice` not being set when adding to cart
**Debug**: Check `addToCart` call includes `customPrice` and `isPwyf: true`

### Issue: Payment intent has wrong amount
**Cause**: `amounts` array not including PWYF custom prices
**Debug**: Check Checkout component passes `items.map(i => i.customPrice ?? i.price)`
