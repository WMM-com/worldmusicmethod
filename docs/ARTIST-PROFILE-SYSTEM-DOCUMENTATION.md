# Artist Profile System - Complete Documentation

> Last Updated: February 2025

This document provides complete documentation for the Artist Profile system, including all features, required configuration, API keys, and setup instructions.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Profile Customization Features](#profile-customization-features)
3. [Commerce System](#commerce-system)
4. [Payment Providers Setup](#payment-providers-setup)
5. [Digital Products](#digital-products)
6. [Storage Configuration](#storage-configuration)
7. [Required Secrets & API Keys](#required-secrets--api-keys)
8. [Database Schema](#database-schema)
9. [Edge Functions Reference](#edge-functions-reference)
10. [Troubleshooting](#troubleshooting)

---

## System Overview

The Artist Profile system allows artists to create fully customizable profile pages with:
- Flexible section layouts (12-column grid system)
- Commerce capabilities (sell digital products)
- Multiple payment provider support
- Geo-based pricing
- Premium membership gating

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  Profile Page  │  Commerce  │  Payment UI  │  Downloads     │
└────────┬───────┴─────┬──────┴──────┬───────┴───────┬────────┘
         │             │             │               │
         ▼             ▼             ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Edge Functions (Deno)                     │
├─────────────────────────────────────────────────────────────┤
│ stripe-connect │ flutterwave │ paypal │ complete-purchase   │
└────────┬───────┴──────┬──────┴────┬───┴──────────┬──────────┘
         │              │           │              │
         ▼              ▼           ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Services                           │
├─────────────────────────────────────────────────────────────┤
│   Stripe API   │  Flutterwave  │  PayPal  │  Cloudflare R2  │
└─────────────────────────────────────────────────────────────┘
```

---

## Profile Customization Features

### 1. Layout System

**Location:** `src/components/profile/GridLayout.tsx`

The profile uses a 12-column responsive grid with 20+ layout variations:

| Layout Key | Description | Columns |
|------------|-------------|---------|
| `full` | Full width | 12 |
| `half-left` | Left half | 6 |
| `half-right` | Right half | 6 |
| `two-thirds-left` | Two-thirds left | 8 |
| `one-third-right` | One-third right | 4 |
| `quarter-first` | First quarter | 3 |
| `three-quarters` | Three quarters | 9 |

### 2. Brand Colors

**Database Column:** `extended_profiles.brand_color`

Artists can set a custom brand color that overrides the default accent color:

```tsx
// Applied via CSS variable
style={{ '--brand-color': heroSettings.brand_color }}
```

**Premium Feature:** Requires `profile_tier = 'premium'`

### 3. Hero Section Templates

**Components:** 
- `src/components/profile/HeroSection.tsx` - Display component
- `src/components/profile/HeroEditor.tsx` - Configuration dialog
- `src/components/profile/HeroOverlayControls.tsx` - In-place editing controls

**Database Columns in `extended_profiles`:**
- `hero_type` (TEXT) - Template type: 'standard', 'cut-out', 'minimal'
- `hero_config` (JSONB) - Hero configuration
- `brand_color` (TEXT) - Custom brand color hex
- `cover_settings` (JSONB) - Cover image display settings

#### Hero Types

| Type | Description | Best For |
|------|-------------|----------|
| `standard` | Full background image with gradient overlay and text | Artists with strong photography |
| `cut-out` | Transparent PNG person/logo over solid background | Personal branding, logos |
| `minimal` | Solid color background with clean typography | Minimalist aesthetic |

#### Hero Config Structure

```typescript
interface HeroConfig {
  title?: string;           // Main heading (falls back to artist name)
  subtitle?: string;        // Secondary text (e.g., "Musician • Producer")
  description?: string;     // Bio paragraph
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string; // Hex color for background
  backgroundImage?: string; // URL for background image (standard/cut-out)
  cutoutImage?: string;     // URL for transparent PNG (cut-out only)
}
```

#### Cover Settings Structure

```typescript
interface CoverSettings {
  height?: 'small' | 'medium' | 'large';  // 192px, 256px, 320px
  focalPointX?: number;  // 0-100 (horizontal focus)
  focalPointY?: number;  // 0-100 (vertical focus)
}
```

#### Integration Flow

1. **Standard Template as Default**: When no hero is configured, the system uses the standard template with the user's cover image (`extended_profiles.cover_image_url`).

2. **Hero Overlay Controls**: When editing, controls appear in the top-right corner of the hero section:
   - "Edit Hero" - Opens full hero configuration dialog
   - "Cover Settings" - Quick access to height and focal point adjustments

3. **Cover Image Fallback**: If `hero_config.backgroundImage` is not set, the system falls back to `extended_profiles.cover_image_url`.

### 4. Device Preview

**Component:** `src/components/profile/DevicePreviewToggle.tsx`

Viewport sizes:
- **Mobile:** 375px
- **Tablet:** 768px  
- **Desktop:** Full width

### 5. Section Types

Available profile sections in `profile_sections` table:

| Section Type | Component | Description |
|--------------|-----------|-------------|
| `bio` | `BioSection.tsx` | Rich text biography |
| `gallery` | `GallerySection.tsx` | Image gallery |
| `projects` | `ProjectsSection.tsx` | Portfolio items |
| `events` | `EventsEmbed.tsx` | Calendar integration |
| `spotify` | `SpotifyEmbed.tsx` | Spotify player |
| `youtube` | `YouTubeEmbed.tsx` | YouTube videos |
| `soundcloud` | `SoundCloudEmbed.tsx` | SoundCloud player |
| `social_feed` | `SocialFeedEmbed.tsx` | Social media feed |
| `digital_products` | `DigitalProductsSection.tsx` | Product sales |
| `donation` | `DonationBlock.tsx` | Tip jar |
| `text_block` | `TextBlock.tsx` | Custom text |
| `audio_player` | `AudioBlock.tsx` | Audio player |
| `custom_tabs` | `CustomTabsSection.tsx` | Tabbed content |

---

## Commerce System

### Overview

The commerce system allows artists to:
- Connect multiple payment providers
- Sell digital products (files, music, PDFs)
- Set fixed or "Pay What You Want" pricing
- Apply geo-based pricing adjustments

### Premium Gating

**Component:** `src/components/profile/PremiumGate.tsx`

```tsx
<PremiumGate feature="commerce">
  <DigitalProductsSection />
</PremiumGate>
```

Gated features:
- ✅ Commerce (Stripe Connect, product sales)
- ✅ Brand color customization
- ✅ More than 3 custom sections
- ✅ Payment account connections

### Upgrading Users to Premium

**Manual (Admin):**
```sql
UPDATE extended_profiles 
SET profile_tier = 'premium' 
WHERE id = 'user-uuid-here';
```

**Future:** Implement membership subscription system

---

## Payment Providers Setup

### Database Table

```sql
CREATE TABLE payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL,  -- 'stripe', 'flutterwave', 'paypal'
  account_id TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  account_email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);
```

---

### 1. Stripe Connect Setup

**Edge Function:** `supabase/functions/stripe-connect-onboard/index.ts`

#### Required Secrets

| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key | [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Publishable key (frontend) | [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys) |

#### Adding Stripe Secrets

1. Go to **Lovable Cloud → Secrets**
2. Add each secret:
   - `STRIPE_SECRET_KEY`: `sk_live_...` or `sk_test_...`
   - `STRIPE_WEBHOOK_SECRET`: `whsec_...`
   - `VITE_STRIPE_PUBLISHABLE_KEY`: `pk_live_...` or `pk_test_...`

#### Stripe Connect Configuration

1. **Enable Connect** in Stripe Dashboard → Connect → Settings
2. **Set redirect URLs:**
   - Refresh URL: `https://your-domain.com/settings?tab=payments&refresh=true`
   - Return URL: `https://your-domain.com/settings?tab=payments&success=true`
3. **Configure branding** in Connect Settings

#### Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://bfwvjhrokucqjcbeufwk.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `account.updated` (for Connect)
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

#### Platform Fee (Optional)

To charge a platform commission, modify the checkout creation:

```typescript
// In create-digital-product-stripe-checkout
application_fee_amount: Math.round(amount * 0.10), // 10% fee
```

**Current Setting:** 0% commission (money goes directly to artist)

---

### 2. Flutterwave Setup

**Edge Function:** `supabase/functions/flutterwave-subaccount-create/index.ts`

#### Required Secrets

| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `FLUTTERWAVE_SECRET_KEY` | API secret key | [Flutterwave Dashboard → Settings → API](https://dashboard.flutterwave.com/settings/apis) |
| `FLUTTERWAVE_PUBLIC_KEY` | Public key (frontend) | Same location |
| `FLUTTERWAVE_ENCRYPTION_KEY` | Encryption key | Same location |

#### Adding Flutterwave Secrets

1. Create account at [Flutterwave](https://flutterwave.com)
2. Complete business verification
3. Go to Settings → API Keys
4. Copy keys to Lovable Cloud → Secrets

#### Subaccount Creation Flow

Artists provide:
- Business name
- Business email
- Bank code (country-specific)
- Account number
- Country

The system creates a Flutterwave subaccount for split payments.

#### Supported Countries

Flutterwave supports mobile money in:
- Nigeria (NGN)
- Ghana (GHS)
- Kenya (KES) - M-Pesa
- Uganda (UGX)
- Tanzania (TZS)
- South Africa (ZAR)

---

### 3. PayPal Setup

**Edge Function:** `supabase/functions/paypal-connect/index.ts`

#### Required Secrets

| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `PAYPAL_CLIENT_ID` | API client ID | [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications) |
| `PAYPAL_CLIENT_SECRET` | API client secret | Same location |

#### Adding PayPal Secrets

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Create an app (Sandbox for testing, Live for production)
3. Copy Client ID and Secret to Lovable Cloud → Secrets

#### PayPal Connect Flow

1. Artist enters their PayPal email
2. System validates the email format
3. Stores in `payment_accounts` table
4. Payments are sent directly to that PayPal email

**Note:** PayPal doesn't require OAuth for simple email-based payments

---

## Digital Products

### Database Table

```sql
CREATE TABLE digital_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,  -- R2 storage path
  price_type TEXT DEFAULT 'fixed',  -- 'fixed' or 'pwyw'
  base_price DECIMAL(10,2) DEFAULT 0,
  min_price DECIMAL(10,2),  -- For PWYW
  currency TEXT DEFAULT 'USD',
  geo_pricing JSONB,  -- Regional price adjustments
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Purchase Tracking

```sql
CREATE TABLE digital_product_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES digital_products(id),
  buyer_id UUID REFERENCES auth.users(id),
  buyer_email TEXT NOT NULL,
  seller_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_provider TEXT NOT NULL,
  provider_payment_id TEXT,
  status TEXT DEFAULT 'pending',
  download_token UUID DEFAULT gen_random_uuid(),
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 5,
  download_expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Pricing Options

#### Fixed Price
```typescript
{
  price_type: 'fixed',
  base_price: 9.99,
  currency: 'USD'
}
```

#### Pay What You Want (PWYW)
```typescript
{
  price_type: 'pwyw',
  base_price: 10.00,  // Suggested price
  min_price: 1.00,    // Minimum allowed
  currency: 'USD'
}
```

### Geo-Pricing

Uses existing `GeoPricingContext` with regional multipliers:

```typescript
const GEO_PRICING_REGIONS = {
  'premium': { multiplier: 1.0, countries: ['US', 'GB', 'DE', 'FR', ...] },
  'standard': { multiplier: 0.7, countries: ['PL', 'CZ', 'HU', ...] },
  'emerging': { multiplier: 0.4, countries: ['IN', 'NG', 'KE', ...] }
};
```

---

## Storage Configuration

### Cloudflare R2 Setup

Digital product files are stored in Cloudflare R2.

#### Required Secrets

| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `R2_ACCESS_KEY_ID` | R2 access key | [Cloudflare Dashboard → R2 → Manage R2 API Tokens](https://dash.cloudflare.com/) |
| `R2_SECRET_ACCESS_KEY` | R2 secret key | Same location |
| `R2_BUCKET_NAME` | Bucket name | Create in R2 dashboard |
| `R2_ACCOUNT_ID` | Cloudflare account ID | Cloudflare Dashboard → Overview |
| `R2_PUBLIC_URL` | Public bucket URL | R2 → Bucket → Settings → Public Access |

#### Creating R2 Bucket

1. Go to Cloudflare Dashboard → R2
2. Click "Create bucket"
3. Name: `digital-products` (or your choice)
4. Create API token with read/write permissions
5. Add secrets to Lovable Cloud

#### File Upload Flow

```
User Upload → r2-upload Edge Function → Cloudflare R2
                     ↓
              Returns file path
                     ↓
         Stored in digital_products.file_url
```

#### Secure Downloads

Files are served via signed URLs with expiration:

```typescript
// r2-presigned-url edge function
const signedUrl = await getSignedUrl(s3Client, command, { 
  expiresIn: 3600  // 1 hour
});
```

---

## Required Secrets & API Keys

### Complete Secrets Checklist

| Secret | Required For | Status |
|--------|--------------|--------|
| `STRIPE_SECRET_KEY` | Stripe payments | ⚠️ **ADD** |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | ⚠️ **ADD** |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Frontend Stripe | ⚠️ **ADD** |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave payments | ⚠️ **ADD** |
| `FLUTTERWAVE_PUBLIC_KEY` | Frontend Flutterwave | ⚠️ **ADD** |
| `FLUTTERWAVE_ENCRYPTION_KEY` | Flutterwave encryption | ⚠️ **ADD** |
| `PAYPAL_CLIENT_ID` | PayPal payments | ⚠️ **ADD** |
| `PAYPAL_CLIENT_SECRET` | PayPal API | ⚠️ **ADD** |
| `R2_ACCESS_KEY_ID` | File storage | ⚠️ **ADD** |
| `R2_SECRET_ACCESS_KEY` | File storage | ⚠️ **ADD** |
| `R2_BUCKET_NAME` | File storage | ⚠️ **ADD** |
| `R2_ACCOUNT_ID` | File storage | ⚠️ **ADD** |
| `R2_PUBLIC_URL` | File downloads | ⚠️ **ADD** |
| `AWS_ACCESS_KEY_ID` | Email (SES) | ✅ Check if exists |
| `AWS_SECRET_ACCESS_KEY` | Email (SES) | ✅ Check if exists |
| `AWS_SES_REGION` | Email (SES) | ✅ Check if exists |

### How to Add Secrets

1. Open your Lovable project
2. Go to **Settings** (gear icon)
3. Navigate to **Cloud** → **Secrets**
4. Click **Add Secret**
5. Enter the secret name and value
6. Click **Save**

### Testing vs Production Keys

**Development/Testing:**
- Use Stripe test keys (`sk_test_...`, `pk_test_...`)
- Use Flutterwave sandbox
- Use PayPal sandbox

**Production:**
- Use live keys (`sk_live_...`, `pk_live_...`)
- Complete verification with each provider
- Test thoroughly before going live

---

## Database Schema

### Core Tables

```sql
-- Extended user profiles with customization
extended_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  brand_color TEXT,
  profile_tier TEXT DEFAULT 'basic',  -- 'basic', 'premium'
  hero_settings JSONB,
  ...
)

-- Profile sections (drag-drop ordering)
profile_sections (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  section_type TEXT NOT NULL,
  title TEXT,
  content JSONB,
  layout TEXT DEFAULT 'full',
  order_index INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  ...
)

-- Payment provider accounts
payment_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL,
  account_id TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  ...
)

-- Digital products for sale
digital_products (
  id UUID PRIMARY KEY,
  seller_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  price_type TEXT DEFAULT 'fixed',
  base_price DECIMAL(10,2),
  ...
)

-- Purchase records
digital_product_purchases (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES digital_products(id),
  buyer_email TEXT NOT NULL,
  download_token UUID,
  status TEXT DEFAULT 'pending',
  ...
)
```

---

## Edge Functions Reference

| Function | Purpose | Endpoint |
|----------|---------|----------|
| `stripe-connect-onboard` | Initiate Stripe Connect | `/functions/v1/stripe-connect-onboard` |
| `stripe-webhook` | Handle Stripe events | `/functions/v1/stripe-webhook` |
| `create-digital-product-stripe-checkout` | Create Stripe checkout | `/functions/v1/create-digital-product-stripe-checkout` |
| `flutterwave-subaccount-create` | Create Flutterwave subaccount | `/functions/v1/flutterwave-subaccount-create` |
| `create-digital-product-flutterwave-payment` | Create Flutterwave payment | `/functions/v1/create-digital-product-flutterwave-payment` |
| `paypal-connect` | Link PayPal account | `/functions/v1/paypal-connect` |
| `create-digital-product-paypal-order` | Create PayPal order | `/functions/v1/create-digital-product-paypal-order` |
| `capture-paypal-order` | Capture PayPal payment | `/functions/v1/capture-paypal-order` |
| `complete-digital-product-purchase` | Finalize purchase, send email | `/functions/v1/complete-digital-product-purchase` |
| `r2-upload` | Upload files to R2 | `/functions/v1/r2-upload` |
| `r2-presigned-url` | Generate download URLs | `/functions/v1/r2-presigned-url` |
| `get-stripe-publishable-key` | Get Stripe public key | `/functions/v1/get-stripe-publishable-key` |

---

## Troubleshooting

### Common Issues

#### 1. Stripe Connect Not Working

**Symptoms:** Onboarding link doesn't open or returns error

**Solutions:**
- Verify `STRIPE_SECRET_KEY` is set correctly
- Check Stripe Connect is enabled in dashboard
- Ensure redirect URLs are configured

#### 2. File Uploads Failing

**Symptoms:** Products can't be created, file upload errors

**Solutions:**
- Verify all R2 secrets are set
- Check bucket exists and permissions are correct
- Ensure bucket CORS is configured:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"]
  }
]
```

#### 3. Downloads Not Working

**Symptoms:** Download links expire immediately or return 403

**Solutions:**
- Check `download_expires_at` hasn't passed
- Verify `download_count < max_downloads`
- Ensure R2 presigned URL function is working

#### 4. Payments Not Completing

**Symptoms:** Payment succeeds but no download access

**Solutions:**
- Check webhook is configured correctly
- Verify `STRIPE_WEBHOOK_SECRET` matches
- Check Edge Function logs for errors

#### 5. Email Not Sending

**Symptoms:** Purchase confirmation emails not received

**Solutions:**
- Verify AWS SES secrets are configured
- Check sender email is verified in SES
- Review `send-email-ses` function logs

### Checking Logs

1. Go to Lovable Cloud → Edge Functions
2. Click on the function name
3. View recent logs and errors

### Testing Payment Flow

1. Use Stripe test card: `4242 4242 4242 4242`
2. Any future expiry date
3. Any CVC
4. Complete checkout
5. Check purchase appears in database
6. Verify download link works

---

## Future Enhancements

### Planned Features

- [ ] Membership subscription system
- [ ] Automatic premium tier on subscription
- [ ] Analytics dashboard for sellers
- [ ] Bulk product uploads
- [ ] Product bundles
- [ ] Discount codes
- [ ] Affiliate tracking
- [ ] Physical product support (with shipping)

### Integration Roadmap

1. **Phase 1** (Current): Basic digital product sales
2. **Phase 2**: Subscription memberships
3. **Phase 3**: Advanced analytics
4. **Phase 4**: Marketplace features

---

## Support

For issues with this system:
1. Check this documentation first
2. Review Edge Function logs
3. Test with minimal configuration
4. Check all secrets are properly set

---

*This documentation covers the Artist Profile system as of February 2025. Features may be added or modified over time.*
