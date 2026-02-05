# Artist Profile System - Complete Testing Checklist

## Overview
This document provides a comprehensive testing checklist for the flexible artist profile system, covering all features from layout editing to payment processing.

---

## 1. Drag-and-Drop & Grid Layouts

### 1.1 Section Reordering
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Drag section up | Grab handle, drag Bio above Gallery | Order persists after refresh | ☐ |
| Drag section down | Move Projects below Custom Tabs | Order updates in real-time | ☐ |
| Cancel drag mid-flight | Start drag, press ESC | Section returns to original position | ☐ |
| Drag to empty area | Drop between existing sections | Section inserts at drop position | ☐ |
| Multiple rapid drags | Reorder 3+ sections quickly | All positions save correctly | ☐ |

### 1.2 Grid Layout Variations
| Layout | Column Split | Test Scenario | Status |
|--------|--------------|---------------|--------|
| `full` | 100% | Single section spans full width | ☐ |
| `half-left` | 50% left | Content aligns left, right side empty | ☐ |
| `half-right` | 50% right | Content aligns right, left side empty | ☐ |
| `two-thirds-left` | 66.67% left | 2/3 width on left | ☐ |
| `two-thirds-right` | 66.67% right | 2/3 width on right | ☐ |
| `quarter-first` | 25% first column | Narrow left column | ☐ |
| `quarter-last` | 25% last column | Narrow right column | ☐ |
| `three-quarters-left` | 75% left | Wide left, narrow right | ☐ |
| `three-quarters-right` | 75% right | Narrow left, wide right | ☐ |
| `50-25-25` | 50%, 25%, 25% | Three-column asymmetric | ☐ |
| `25-50-25` | 25%, 50%, 25% | Center-focused three-column | ☐ |
| `25-25-50` | 25%, 25%, 50% | Right-heavy three-column | ☐ |
| `thirds` | 33.33% each | Equal three-column | ☐ |
| `quarters` | 25% each | Four equal columns | ☐ |

### 1.3 Grid Edge Cases
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Switch layout mid-edit | Change from `full` to `thirds` | Content redistributes cleanly | ☐ |
| Empty column handling | Apply `50-25-25` with only 1 section | Layout maintains structure | ☐ |
| Long content in narrow column | Add 1000+ char bio in 25% column | Text wraps, no overflow | ☐ |
| Image in quarter column | Add gallery in 25% width | Images scale proportionally | ☐ |
| Nested content overflow | Embed player in narrow column | Controls remain usable | ☐ |

---

## 2. Hero Section Templates

### 2.1 Standard Template
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Background image upload | Upload 1920x1080 image | Full-width display, no distortion | ☐ |
| Gradient overlay | Enable gradient | Text remains readable | ☐ |
| Text alignment - left | Set textAlign: 'left' | Title/subtitle align left | ☐ |
| Text alignment - center | Set textAlign: 'center' | Content centers horizontally | ☐ |
| Text alignment - right | Set textAlign: 'right' | Content aligns right | ☐ |
| Very long title | Enter 100+ character title | Text wraps gracefully | ☐ |
| No background image | Leave image empty | Solid background color shows | ☐ |

### 2.2 Cut-Out Template
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| PNG with transparency | Upload transparent PNG | Cutout displays over background | ☐ |
| Cutout positioning | Check default position | Image positioned correctly | ☐ |
| Background color behind cutout | Set backgroundColor | Color visible behind PNG | ☐ |
| Gradient background | Apply gradient | Gradient renders behind cutout | ☐ |
| Non-transparent image | Upload JPG as cutout | Displays but warns user | ☐ |
| Very large cutout file | Upload 5MB+ PNG | Compression or size limit applied | ☐ |

### 2.3 Minimal Template
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Typography only | No images set | Clean text on solid color | ☐ |
| Brand color as background | Set backgroundColor to brand | Matches brand_color setting | ☐ |
| Subtitle visibility | Add long subtitle | Displays without truncation | ☐ |
| No content | Leave all fields empty | Minimal placeholder or hide section | ☐ |

### 2.4 Brand Color Integration
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Color picker selection | Choose #FF5733 | `--brand-color` CSS var updates | ☐ |
| Apply to links | Check profile links | Links use brand color | ☐ |
| Apply to buttons | Check CTA buttons | Primary buttons use brand color | ☐ |
| Apply to hero | Enable brand color in hero | Hero elements reflect color | ☐ |
| Contrast check - light color | Set #FFFF00 (yellow) | Text remains readable | ☐ |
| Contrast check - dark color | Set #000033 (navy) | Text/icons visible | ☐ |
| Reset to default | Clear brand color | Falls back to theme default | ☐ |
| Persistence | Set color, refresh page | Color persists from database | ☐ |

---

## 3. Device Preview

### 3.1 Viewport Sizes
| Device | Dimensions | Test Focus | Status |
|--------|------------|------------|--------|
| Mobile | 375x667 | Single column, touch targets 44px+ | ☐ |
| Tablet | 768x1024 | 2-column layouts, readable text | ☐ |
| Desktop | 1440x900 | Full grid layouts, hover states | ☐ |

### 3.2 Responsive Behavior
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Grid collapse on mobile | Preview `quarters` layout on mobile | Stacks to single column | ☐ |
| Hero image scaling | Preview hero on all sizes | No horizontal scroll, image covers | ☐ |
| Navigation usability | Check menu on mobile | Hamburger menu or accessible nav | ☐ |
| Form inputs on mobile | Check PWYW input | Full-width, keyboard appears | ☐ |
| Modal sizing | Open BuyProductModal on mobile | Modal fills screen appropriately | ☐ |
| Sidebar behavior | Check sidebar sections on tablet | Collapses or adapts | ☐ |

### 3.3 Preview Accuracy
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| WYSIWYG match | Compare preview to published | Layout identical | ☐ |
| Scrolling in preview | Scroll long profile in preview | Smooth, no jank | ☐ |
| Interactive elements | Click buttons in preview | Non-functional (preview mode) or functional | ☐ |
| Refresh preview | Make change, check preview | Updates without full reload | ☐ |

---

## 4. Payment Account Onboarding

### 4.1 Stripe Connect
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Initiate onboarding | Click "Connect Stripe" | Redirects to Stripe Express | ☐ |
| Complete onboarding | Fill Stripe forms | Returns to app, account shows "Connected" | ☐ |
| Abandon onboarding | Start then close Stripe tab | Status remains "Pending" | ☐ |
| Already connected | Try to connect again | Shows "Already connected" or update option | ☐ |
| Invalid return | Manipulate return URL | Graceful error handling | ☐ |
| Account status check | After connect, verify in DB | `onboarding_complete = true` | ☐ |

### 4.2 Flutterwave Subaccount
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Create subaccount | Enter bank details | Subaccount ID saved to `payment_accounts` | ☐ |
| Invalid bank code | Enter wrong bank code | Clear error message | ☐ |
| Duplicate account | Try same bank details twice | Prevents duplicate or updates | ☐ |
| African country detection | User from Nigeria | Flutterwave shown prominently | ☐ |
| Non-African country | User from USA | Flutterwave available but not default | ☐ |

### 4.3 PayPal
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Connect PayPal email | Enter valid PayPal email | Account saved, status connected | ☐ |
| Invalid email format | Enter "notanemail" | Validation error shown | ☐ |
| Update PayPal email | Change connected email | Updates in database | ☐ |
| Disconnect PayPal | Remove PayPal account | Account removed, option to reconnect | ☐ |

### 4.4 Multi-Provider Scenarios
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Connect all three | Stripe + Flutterwave + PayPal | All show in BuyProductModal | ☐ |
| Only one provider | Connect only PayPal | Only PayPal shown to buyers | ☐ |
| Provider priority | All connected, buyer in Ghana | Flutterwave auto-selected | ☐ |
| Provider priority | All connected, buyer in USA | Stripe auto-selected | ☐ |
| No providers connected | Seller has no accounts | "No payment methods" message | ☐ |

---

## 5. Digital Product Flow

### 5.1 Product Upload
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Upload PDF | Select 5MB PDF | Uploads to R2, URL saved | ☐ |
| Upload ZIP | Select 50MB ZIP | Uploads with progress indicator | ☐ |
| Upload too large file | Select 500MB file | Size limit error (if applicable) | ☐ |
| Set fixed price | Enter $29.99 | `price_type = 'fixed'`, `base_price = 29.99` | ☐ |
| Set PWYW price | Enable PWYW, min $5 | `price_type = 'pwyw'`, `min_price = 5` | ☐ |
| Add description | Enter 500 chars | Saves and displays correctly | ☐ |
| Missing required fields | Submit without title | Validation errors shown | ☐ |
| Edit existing product | Change price of uploaded product | Updates in database | ☐ |
| Delete product | Remove product | Removed from list, file cleanup (if implemented) | ☐ |

### 5.2 Purchase Flow - Stripe
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Fixed price checkout | Buy $20 product via Stripe | Redirects to Stripe Checkout | ☐ |
| Complete payment | Use test card 4242... | Returns to success page | ☐ |
| Cancel payment | Click back on Stripe page | Returns to cancel URL | ☐ |
| Platform fee applied | Check Stripe dashboard | 10% application fee deducted | ☐ |
| Seller receives funds | After payment | Funds in seller's Connect account | ☐ |

### 5.3 Purchase Flow - Flutterwave
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| African buyer checkout | Buyer in Nigeria, select Flutterwave | Redirects to Flutterwave | ☐ |
| Complete with card | Use test card | Returns to success page | ☐ |
| Complete with mobile money | Use test mobile money | Payment processed | ☐ |
| Subaccount split | Check Flutterwave dashboard | Split payment to seller | ☐ |

### 5.4 Purchase Flow - PayPal
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| PayPal checkout | Select PayPal, click Pay Now | Redirects to PayPal approval | ☐ |
| Approve payment | Log in to PayPal sandbox | Order captured, success page | ☐ |
| Cancel on PayPal | Click cancel on PayPal | Returns to cancel URL | ☐ |

### 5.5 Download Delivery
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Access after purchase | Visit success page | Download link available | ☐ |
| Download file | Click download | File downloads correctly | ☐ |
| Unauthorized access | Try download URL without purchase | Access denied | ☐ |
| Multiple downloads | Download same file twice | Both succeed (or limit enforced) | ☐ |

---

## 6. PWYW (Pay What You Want) + Geo-Pricing

### 6.1 PWYW Input Behavior
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Default to suggested price | Open modal for PWYW product | Input shows suggested price | ☐ |
| Enter custom amount | Type $25 for $10 suggested | Amount accepted | ☐ |
| Below minimum | Enter $3 when min is $5 | Error: "Minimum price is $5" | ☐ |
| Exactly minimum | Enter $5 when min is $5 | Accepted, proceed to checkout | ☐ |
| Very high amount | Enter $1000 | Accepted (no max by default) | ☐ |
| Non-numeric input | Type "abc" | Input rejected or cleared | ☐ |
| Decimal amounts | Enter $15.50 | Accepted, formatted correctly | ☐ |
| Currency display | Check input label | Shows correct currency symbol | ☐ |

### 6.2 Geo-Pricing Display
| Test Case | Buyer Country | Expected Behavior | Status |
|-----------|---------------|-------------------|--------|
| USA buyer | United States | Full price in USD | ☐ |
| UK buyer | United Kingdom | GBP equivalent | ☐ |
| Nigeria buyer | Nigeria | 65% discount applied | ☐ |
| Germany buyer | Germany | EUR, full price | ☐ |
| Poland buyer | Poland | EUR, 40% discount | ☐ |
| Japan buyer | Japan | USD, default pricing | ☐ |
| Brazil buyer | Brazil | 65% discount applied | ☐ |
| Unknown country | VPN/unknown | Fallback to USD full price | ☐ |

### 6.3 Geo-Pricing + PWYW Interaction
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| PWYW with geo-discount | Nigerian buyer, PWYW product | Suggested price shows discount | ☐ |
| Min price with geo-pricing | Check min_price display | Min price also adjusted? (design decision) | ☐ |
| Currency conversion in input | UK buyer enters amount | Input in GBP, checkout in GBP | ☐ |

---

## 7. Premium Gating

### 7.1 Basic Tier Restrictions
| Feature | Basic User Action | Expected Result | Status |
|---------|-------------------|-----------------|--------|
| Add Digital Products section | Try to add | PremiumGate blocks, shows upgrade CTA | ☐ |
| Brand color picker | Try to access | PremiumGate blocks, shows upgrade CTA | ☐ |
| Add 4th custom section | Already has 3, try to add 4th | PremiumGate blocks with limit message | ☐ |
| Connect payment accounts | Try to connect Stripe | PremiumGate blocks | ☐ |

### 7.2 Premium Tier Access
| Feature | Premium User Action | Expected Result | Status |
|---------|---------------------|-----------------|--------|
| Add Digital Products section | Try to add | Section added successfully | ☐ |
| Brand color picker | Access picker | Color picker functional | ☐ |
| Add 10 custom sections | Add many sections | No limit enforced | ☐ |
| Connect all payment accounts | Connect Stripe, Flutterwave, PayPal | All connect successfully | ☐ |

### 7.3 Premium Gate UI
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Gate appears inline | Check brand color area (basic user) | Inline gate with crown icon | ☐ |
| Gate appears as overlay | Try to add blocked section | Modal/overlay with upgrade CTA | ☐ |
| CTA links to membership | Click "Upgrade" | Navigates to /membership | ☐ |
| Crown icon visibility | Check section dropdown | Crown shows on premium items | ☐ |
| Gate disappears on upgrade | Upgrade to premium, refresh | All features accessible | ☐ |

### 7.4 Edge Cases
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Downgrade from premium | Had premium, now basic | Existing commerce sections remain but can't add new | ☐ |
| Existing sections over limit | Had 5 sections, downgraded | Sections remain visible, can't add more | ☐ |
| Direct URL access | Basic user navigates to /profile/edit | Gates still enforced | ☐ |
| API bypass attempt | Try to POST digital product as basic | Backend rejects (if enforced) | ☐ |

---

## 8. Cross-Browser Testing

### 8.1 Desktop Browsers
| Browser | Version | Key Tests | Status |
|---------|---------|-----------|--------|
| Chrome | Latest | All features, DevTools check | ☐ |
| Firefox | Latest | Drag-drop, CSS grid layouts | ☐ |
| Safari | Latest | CSS variables, color picker | ☐ |
| Edge | Latest | Payment redirects, modals | ☐ |

### 8.2 Mobile Browsers
| Browser | Platform | Key Tests | Status |
|---------|----------|-----------|--------|
| Chrome | Android | Touch drag-drop, PWYW input | ☐ |
| Safari | iOS | Color picker, file upload | ☐ |
| Samsung Internet | Android | Payment flows, modals | ☐ |

### 8.3 Known Browser-Specific Issues
| Issue | Browser | Workaround | Status |
|-------|---------|------------|--------|
| Color picker appearance | Safari | Native picker may differ | ☐ |
| Drag ghost image | Firefox | May need custom drag image | ☐ |
| File input styling | iOS Safari | Cannot fully style | ☐ |
| Position: sticky in grid | Older Safari | May need fallback | ☐ |

---

## 9. Edge Cases & Error Handling

### 9.1 Network Failures
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Upload during disconnect | Start upload, kill network | Error message, retry option | ☐ |
| Payment redirect fails | Block Stripe domain | Clear error, fallback instructions | ☐ |
| Save profile offline | Edit profile, go offline, save | Queued or error shown | ☐ |
| Load profile slow network | Throttle to 3G | Skeleton loaders, eventual load | ☐ |

### 9.2 Data Integrity
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Concurrent edits | Two tabs editing same profile | Last save wins or conflict resolution | ☐ |
| Corrupted geo_pricing JSON | Manually break JSON in DB | Graceful fallback to base_price | ☐ |
| Missing seller account | Delete payment_account, try buy | "No payment methods" error | ☐ |
| Orphaned product | Delete seller user, check products | Products hidden or error handled | ☐ |

### 9.3 Input Validation
| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| XSS in product title | Enter `<script>alert(1)</script>` | Sanitized or escaped | ☐ |
| SQL injection attempt | Enter `'; DROP TABLE--` | No effect, input escaped | ☐ |
| Extremely long inputs | 10,000 char description | Truncated or rejected | ☐ |
| Special characters | Emojis, unicode in titles | Displayed correctly | ☐ |
| Negative prices | Enter -$10 | Rejected with error | ☐ |

---

## 10. Performance Benchmarks

| Metric | Target | How to Measure | Status |
|--------|--------|----------------|--------|
| Profile load time | < 2s | Lighthouse, Network tab | ☐ |
| Drag-drop responsiveness | < 16ms frame | Chrome DevTools Performance | ☐ |
| Image upload (5MB) | < 10s | Stopwatch, progress bar | ☐ |
| Payment redirect | < 3s | Time from click to Stripe page | ☐ |
| Preview switch | < 500ms | Time to change device size | ☐ |

---

## Testing Environment Setup

### Required Accounts
- [ ] Stripe test account with Connect enabled
- [ ] Flutterwave sandbox account
- [ ] PayPal sandbox account
- [ ] Test users: 1 basic tier, 1 premium tier

### Test Data
- [ ] Sample products: 1 fixed price, 1 PWYW
- [ ] Sample images: Hero backgrounds, cutouts, product thumbnails
- [ ] Sample files: PDF, ZIP for digital products

### Browser DevTools Settings
- [ ] Enable "Sensors" for geolocation spoofing
- [ ] Set up network throttling profiles
- [ ] Enable paint flashing for layout debugging

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product | | | |

---

*Last updated: February 2026*
