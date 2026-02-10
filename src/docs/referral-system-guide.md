# Referral System — Complete Guide

## Current State & What's Working

### ✅ Fully Built & Functional

| Component | Status | Details |
|---|---|---|
| Referral code generation | ✅ Working | 8-character unique codes (e.g., `A3B5C7D9`) |
| Cookie tracking | ✅ Working | `?ref=CODE` in URL → stored in 10-day cookie |
| Link referral on signup | ✅ Working | Cookie is read on signup → edge function links referrer to new user |
| Signup milestones | ✅ Working | $10 bonus at 5, 10, 20, 50, 100 referral signups |
| Credit storage | ✅ Working | `user_credits` table stores balance in USD cents |
| Credit transaction log | ✅ Working | `credit_transactions` table logs all credit changes |
| Credit display in UI | ✅ Working | Account → Invite Friends shows balance badge |
| Credit at checkout | ✅ Working | Toggle to apply credits with currency conversion |
| Free credit checkout | ✅ Working | 100% credit-covered purchases bypass Stripe |
| Partial credit discount | ✅ Working | Credits reduce Stripe payment intent amount |
| Invite Friends UI | ✅ Working | Profile button + Account sidebar + social share links |

---

## How the Referral Flow Works

### Step 1: Sharing
- User goes to their Profile or Account → Invite Friends
- Copies their unique referral link (e.g., `https://worldmusicmethod.lovable.app/?ref=A3B5C7D9`)
- Shares via Copy Link, Twitter/X, WhatsApp, or Email buttons

### Step 2: Clicking
- Visitor clicks the referral link
- The `?ref=` parameter is detected by the `ReferralTracker` component
- The referral code is saved in a browser cookie (lasts 10 days)

### Step 3: Signing Up
- Visitor creates an account on the site
- On signup, the `AuthContext` automatically calls `linkReferralOnSignup()`
- This invokes the `link-referral` edge function which:
  - Validates the referral code exists and hasn't expired
  - Links the new user to the referrer in the `referrals` table
  - Checks and awards any signup milestones ($10 bonus per 5 signups)
  - Clears the referral cookie

### Step 4: Earning Credits (✅ Fully Working)
- **Signup milestones**: $10 bonus per 5/10/20/50/100 referred signups
- **Purchase commissions**: 200% of first subscription month, 30% of course purchases (via Stripe webhook)

### Step 5: Spending Credits
- At checkout, the `CreditPaymentSection` component appears if user has credits
- User toggles "Use Referral Credit" to apply
- Credits are converted from USD to the user's regional currency
- If credits cover 100%: uses `complete-free-credit-checkout` (no Stripe needed)
- If credits cover partially: reduces the Stripe payment intent amount

---

## Where Things Are Stored

### Database Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `referrals` | Tracks referral relationships | `referrer_id`, `referred_user_id`, `referral_code`, `status`, `expires_at` |
| `user_credits` | Current credit balance per user | `user_id`, `balance` (in USD cents) |
| `credit_transactions` | Full history of credit changes | `user_id`, `amount`, `type`, `description`, `reference_id` |

### UI Locations

| What | Where to Find It |
|---|---|
| Referral link & share buttons | Profile page → "Invite Friends" button (next to Edit Profile) |
| Credit balance & referral stats | Account page → "Invite Friends" sidebar item |
| Credit usage at checkout | Checkout page → "Use Referral Credit" toggle (appears if balance > 0) |

### Backend Functions (Edge Functions)

| Function | Purpose |
|---|---|
| `link-referral` | Links a new signup to their referrer, checks milestones |
| `create-payment-intent` | Handles credit deduction for partial-credit purchases |
| `complete-free-credit-checkout` | Handles purchases fully covered by credits |

### Database Functions (PostgreSQL)

| Function | Purpose |
|---|---|
| `link_referred_signup()` | Validates referral code, links referred user, prevents self-referral |
| `check_and_award_signup_milestone()` | Awards $10 bonus at 5/10/20/50/100 signup milestones |
| `award_referral_credit()` | Generic function to add credits and log transaction |

---

## ⚠️ What's Missing

### 1. Stripe Webhook for Purchase Conversion Credits

**The Problem**: When a referred user makes their first purchase, the referrer should earn commission credits (200% of first month's subscription price, or 30% of course purchase price). This requires knowing when a payment succeeds.

**The Solution**: A Stripe webhook endpoint that listens for `checkout.session.completed` and `invoice.payment_succeeded` events.

**What the webhook would do**:
1. Receive payment event from Stripe
2. Look up if the paying user was referred by someone
3. Calculate the referral commission (200% for subscriptions, 30% for courses)
4. Call `award_referral_credit()` to credit the referrer

### 2. Applying Credits to Existing Subscriptions — ✅ Built

Credits are **automatically applied** to subscription renewal invoices:
- When Stripe creates a new invoice (`invoice.created`), the webhook checks if the subscriber has referral credits
- Credits are converted to the invoice currency using stored exchange rates
- A negative invoice item is added to discount the invoice
- The user's credit balance is deducted and a `spent_subscription` transaction is logged

### 3. Stripe Webhook Secret

**What it is**: A signing secret (`whsec_...`) that verifies webhook requests actually come from Stripe (not an attacker).

**How to get it**:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter URL: `https://bfwvjhrokucqjcbeufwk.supabase.co/functions/v1/stripe-webhook`
4. Select events: `checkout.session.completed`, `invoice.payment_succeeded`
5. Click "Add endpoint"
6. Click "Reveal" next to "Signing secret" — copy the `whsec_...` value

**How to add it to the project**:
- Provide the `whsec_...` value when prompted to add the `STRIPE_WEBHOOK_SECRET` secret
- The developer (Lovable AI) will use the `add_secret` tool to securely store it

---

## Credit Reward Structure

| Trigger | Reward | Status |
|---|---|---|
| Referred user signs up (every 5 signups) | $10 milestone bonus | ✅ Working |
| Referred user buys a subscription | 200% of first month's price | ✅ Working (webhook) |
| Referred user buys a course | 30% of course price | ✅ Working (webhook) |
| Auto-apply to subscription renewal | Credits discount next invoice | ✅ Working (invoice.created) |

---

## Secrets Required

| Secret Name | Purpose | Status |
|---|---|---|
| `STRIPE_SECRET_KEY` | Create payment intents, manage customers | ✅ Configured |
| `STRIPE_WEBHOOK_SECRET` | Verify webhook signatures from Stripe | ✅ Configured |

---

## Next Steps

1. **Add `invoice.created` to Stripe webhook events** — In Stripe Dashboard → Developers → Webhooks → your platform webhook endpoint, add the `invoice.created` event so credits auto-apply to renewals
2. **Test end-to-end**: Share link → Signup → Purchase → Credits awarded → Credits auto-applied to renewal

---

## Architecture Diagram

```
User A (Referrer)                    User B (Referred)
     |                                     |
     |-- Shares ?ref=CODE link ----------->|
     |                                     |
     |                              Clicks link
     |                              Cookie stored (10 days)
     |                                     |
     |                              Signs up
     |                              linkReferralOnSignup() called
     |                                     |
     |<-- referrals table updated ---------|
     |    (status: signed_up)              |
     |                                     |
     |<-- Milestone check ($10/5 signups)  |
     |    (user_credits updated)           |
     |                                     |
     |                              Makes purchase (⚠️ webhook needed)
     |                                     |
     |<-- Commission credit awarded -------|
     |    (200% sub / 30% course)          |
     |                                     |
     Uses credits at checkout
     (CreditPaymentSection toggle)
```
