import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'
import Stripe from 'https://esm.sh/stripe@18.5.0'
import { getStripeSecretKey } from "../_shared/stripe-key.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

// Product type detection - customize these based on your Stripe product IDs
const SUBSCRIPTION_PRODUCT_KEYWORDS = ['union', 'membership', 'subscription']
const SUBSCRIPTION_CREDIT_MULTIPLIER = 2.0 // 200% of first month
const COURSE_CREDIT_PERCENTAGE = 0.30 // 30% of purchase

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : ''
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const stripeKey = getStripeSecretKey()
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!stripeKey) {
    logStep('ERROR: STRIPE_SECRET_KEY not set')
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' })
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    let event: Stripe.Event

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          webhookSecret,
          undefined,
          Stripe.createSubtleCryptoProvider()
        )
        logStep('Webhook signature verified')
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        logStep('Webhook signature verification failed', { error: errorMessage })
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      // Parse without verification (development mode)
      event = JSON.parse(body)
      logStep('WARNING: Processing webhook without signature verification')
    }

    logStep('Received event', { type: event.type, id: event.id })

    // ── Merch-specific events ──────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const metadata = session.metadata || {}

      // Route merch checkouts to the merch handler
      if (metadata.gig_id) {
        await handleMerchCheckoutCompleted(session, stripe, supabase)
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const metadata = paymentIntent.metadata || {}
      const paymentMethodTypes = paymentIntent.payment_method_types || []
      const isTerminal = paymentMethodTypes.includes('card_present')

      // Route merch terminal payments or metadata-tagged payments
      if (metadata.gig_id || metadata.artist_user_id || isTerminal) {
        await handleMerchPaymentIntentSucceeded(paymentIntent, stripe, supabase)
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // ── Beta Membership subscription handling ────────────────
    if (
      event.type === 'invoice.payment_succeeded' ||
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      await handleBetaMembershipSubscription(event, stripe, supabase)
    }

    // ── Auto-apply referral credits to upcoming subscription invoices ──
    if (event.type === 'invoice.created') {
      await handleInvoiceCreatedApplyCredits(event, stripe, supabase)
    }

    // ── Create order records for subscription charges (trial-end & renewals) ──
    if (event.type === 'invoice.payment_succeeded') {
      await handleSubscriptionInvoiceOrder(event, stripe, supabase)
    }

    // ── Existing referral/subscription/digital product handling ──
    if (event.type === 'checkout.session.completed' || event.type === 'invoice.payment_succeeded') {
      await handlePaymentEvent(event, stripe, supabase)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logStep('Unexpected error', { error: errorMessage })
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ── Create order records when subscription invoices are actually charged ──
async function handleSubscriptionInvoiceOrder(
  event: Stripe.Event,
  stripe: Stripe,
  supabase: any
) {
  const invoice = event.data.object as Stripe.Invoice
  if (!invoice.subscription) return
  if (invoice.amount_paid <= 0) {
    logStep('Skipping zero-amount invoice for order creation')
    return
  }

  // Only create orders for actual charges: subscription_cycle (renewals) and subscription_create (first charge after trial)
  const validReasons = ['subscription_cycle', 'subscription_create']
  if (!validReasons.includes(invoice.billing_reason || '')) {
    logStep('Skipping invoice - not a billable cycle', { billing_reason: invoice.billing_reason })
    return
  }

  const stripeSubId = typeof invoice.subscription === 'string' ? invoice.subscription : (invoice.subscription as any)?.id
  if (!stripeSubId) return

  // Find the DB subscription
  const { data: dbSub } = await supabase
    .from('subscriptions')
    .select('id, user_id, product_id, product_name, amount, currency')
    .eq('provider_subscription_id', stripeSubId)
    .maybeSingle()

  if (!dbSub) {
    logStep('No DB subscription found for invoice order', { stripeSubId })
    return
  }

  // Idempotency: check if order already exists for this invoice
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('provider_payment_id', invoice.id)
    .maybeSingle()

  if (existingOrder) {
    logStep('Order already exists for this invoice', { invoiceId: invoice.id })
    return
  }

  // Get Stripe fee from the charge's balance transaction
  let stripeFee = 0
  try {
    if (invoice.charge) {
      const chargeId = typeof invoice.charge === 'string' ? invoice.charge : (invoice.charge as any)?.id
      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId)
        if (charge.balance_transaction) {
          const btId = typeof charge.balance_transaction === 'string'
            ? charge.balance_transaction
            : (charge.balance_transaction as any)?.id
          if (btId) {
            const bt = await stripe.balanceTransactions.retrieve(btId)
            stripeFee = bt.fee / 100
          }
        }
      }
    }
  } catch (e) {
    logStep('Could not retrieve fee for invoice order', { error: (e as Error).message })
  }

  const amount = invoice.amount_paid / 100
  const currency = (invoice.currency || 'usd').toUpperCase()
  const netAmount = amount - stripeFee

  const { error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: dbSub.user_id,
      product_id: dbSub.product_id,
      subscription_id: dbSub.id,
      amount,
      currency,
      payment_provider: 'stripe',
      provider_payment_id: invoice.id,
      status: 'completed',
      stripe_fee: stripeFee,
      net_amount: netAmount,
      customer_name: invoice.customer_name || null,
      email: invoice.customer_email || null,
    })

  if (orderError) {
    logStep('Error creating order from invoice', { error: orderError.message, invoiceId: invoice.id })
  } else {
    logStep('Order created from subscription invoice', {
      invoiceId: invoice.id,
      userId: dbSub.user_id,
      productId: dbSub.product_id,
      amount,
      currency,
      billingReason: invoice.billing_reason,
    })
  }
}

// ── Beta Membership: grant premium features on subscription ──
async function handleBetaMembershipSubscription(
  event: Stripe.Event,
  stripe: Stripe,
  supabase: any
) {
  let subscriptionMetadata: Record<string, string> = {}
  let subscriptionStatus: string = ''
  let subscriptionId: string = ''

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice
    if (!invoice.subscription) return

    // Retrieve the subscription to access metadata
    try {
      const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
      subscriptionMetadata = (sub.metadata || {}) as Record<string, string>
      subscriptionStatus = sub.status
      subscriptionId = sub.id
    } catch (err) {
      logStep('Failed to retrieve subscription from invoice', { error: (err as Error).message })
      return
    }
  } else if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated'
  ) {
    const sub = event.data.object as Stripe.Subscription
    subscriptionMetadata = (sub.metadata || {}) as Record<string, string>
    subscriptionStatus = sub.status
    subscriptionId = sub.id
  }

  // Check if this is a Beta Membership (product_type === 'membership' or product name match)
  const productType = subscriptionMetadata.product_type || ''
  const productName = subscriptionMetadata.product_name || ''
  const userId = subscriptionMetadata.user_id || ''
  const isBetaMembership =
    productType === 'membership' ||
    productName.toLowerCase().includes('beta membership')

  if (!isBetaMembership) {
    return // Not a Beta Membership subscription, skip
  }

  logStep('Beta Membership subscription event detected', {
    eventType: event.type,
    subscriptionId,
    subscriptionStatus,
    userId,
    productType,
    productName,
  })

  if (!userId) {
    // Fallback: try to resolve user_id from email in metadata
    const email = subscriptionMetadata.email
    if (email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (profile) {
        logStep('Resolved user_id from email fallback', { userId: profile.id, email })
        await grantOrRevokePremium(supabase, profile.id, subscriptionStatus, subscriptionId)
      } else {
        logStep('Could not resolve user from email', { email })
      }
    } else {
      logStep('No user_id or email in subscription metadata, cannot grant premium')
    }
    return
  }

  await grantOrRevokePremium(supabase, userId, subscriptionStatus, subscriptionId)
}

async function grantOrRevokePremium(
  supabase: any,
  userId: string,
  subscriptionStatus: string,
  subscriptionId: string
) {
  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'

  if (isActive) {
    // Grant premium features
    const { data: existing } = await supabase
      .from('extended_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('extended_profiles')
        .update({
          has_premium_features: true,
          premium_granted_by: 'subscription',
        })
        .eq('user_id', userId)

      if (error) {
        logStep('Error updating premium features', { error: error.message, userId })
      } else {
        logStep('Premium features GRANTED via subscription', { userId, subscriptionId })
      }
    } else {
      // Create extended_profiles row if it doesn't exist
      const { error } = await supabase
        .from('extended_profiles')
        .insert({
          user_id: userId,
          has_premium_features: true,
          premium_granted_by: 'subscription',
        })

      if (error) {
        logStep('Error inserting extended_profiles for premium', { error: error.message, userId })
      } else {
        logStep('Premium features GRANTED (new profile created)', { userId, subscriptionId })
      }
    }
  } else if (subscriptionStatus === 'canceled' || subscriptionStatus === 'unpaid' || subscriptionStatus === 'past_due') {
    // Revoke premium features (only if granted by subscription, not by admin)
    const { error } = await supabase
      .from('extended_profiles')
      .update({ has_premium_features: false })
      .eq('user_id', userId)
      .eq('premium_granted_by', 'subscription')

    if (error) {
      logStep('Error revoking premium features', { error: error.message, userId })
    } else {
      logStep('Premium features REVOKED due to subscription status', {
        userId,
        subscriptionId,
        status: subscriptionStatus,
      })
    }
  }
}

// ── Merch: checkout.session.completed ─────────────────────
async function handleMerchCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: any
) {
  const metadata = session.metadata || {}
  const gigId = metadata.gig_id
  const artistUserId = metadata.artist_user_id
  const productIds = metadata.product_ids ? metadata.product_ids.split(',') : []

  logStep('Merch checkout completed', { gigId, artistUserId, sessionId: session.id })

  // Idempotency: check if we already recorded this payment
  const { data: existing } = await supabase
    .from('merch_sales')
    .select('id')
    .eq('stripe_payment_id', session.id)
    .maybeSingle()

  if (existing) {
    logStep('Merch sale already recorded, skipping', { sessionId: session.id })
    return
  }

  // Retrieve line items to get individual product details
  let lineItems: any[] = []
  try {
    const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 })
    lineItems = items.data
  } catch (err) {
    logStep('Failed to retrieve line items', { error: (err as Error).message })
  }

  const currency = (session.currency || 'usd').toUpperCase()
  const buyerEmail = session.customer_email || session.customer_details?.email || null

  if (lineItems.length > 0 && productIds.length > 0) {
    // Insert one sale per product line item
    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i]
      const productId = productIds[i] || null
      const quantity = li.quantity || 1
      const unitPrice = (li.amount_total || 0) / 100 / quantity
      const total = (li.amount_total || 0) / 100

      const { error } = await supabase.from('merch_sales').insert({
        user_id: artistUserId,
        gig_id: gigId,
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        total,
        currency,
        payment_method: 'stripe',
        payment_source: 'web',
        buyer_email: buyerEmail,
        stripe_payment_id: `${session.id}_${i}`,
      })

      if (error) {
        logStep('Error inserting merch sale line', { error: error.message, index: i })
      }
    }
  } else {
    // Single sale record (custom amount or fallback)
    const total = (session.amount_total || 0) / 100

    const { error } = await supabase.from('merch_sales').insert({
      user_id: artistUserId,
      gig_id: gigId,
      quantity: 1,
      unit_price: total,
      total,
      currency,
      payment_method: 'stripe',
      payment_source: 'web',
      buyer_email: buyerEmail,
      stripe_payment_id: session.id,
    })

    if (error) {
      logStep('Error inserting merch sale', { error: error.message })
    }
  }

  logStep('Merch sales recorded successfully', { gigId })
}

// ── Merch: payment_intent.succeeded (Terminal / Connect) ──
async function handleMerchPaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  stripe: Stripe,
  supabase: any
) {
  const metadata = paymentIntent.metadata || {}
  let gigId = metadata.gig_id || null
  const artistUserId = metadata.artist_user_id || null
  const productId = metadata.product_id || null
  const paymentMethodTypes = paymentIntent.payment_method_types || []
  const isTerminal = paymentMethodTypes.includes('card_present')

  logStep('Merch payment_intent.succeeded', {
    paymentIntentId: paymentIntent.id,
    gigId,
    artistUserId,
    isTerminal,
    connectedAccount: (paymentIntent as any).transfer_data?.destination,
  })

  // If no artist_user_id in metadata, try to find it via connected account
  let resolvedArtistId = artistUserId
  if (!resolvedArtistId) {
    const connectedAccountId = (paymentIntent as any).transfer_data?.destination
    if (connectedAccountId) {
      const { data: account } = await supabase
        .from('payment_accounts')
        .select('user_id')
        .eq('account_id', connectedAccountId)
        .eq('provider', 'stripe')
        .maybeSingle()

      if (account) {
        resolvedArtistId = account.user_id
        logStep('Resolved artist from connected account', { userId: resolvedArtistId })
      }
    }
  }

  // For Terminal payments, try to resolve gig from the Terminal location
  if (isTerminal && !gigId) {
    try {
      // Get the charge to find the payment method details with location
      const charges = await stripe.charges.list({ payment_intent: paymentIntent.id, limit: 1 })
      const charge = charges.data[0]
      const locationId = (charge?.payment_method_details as any)?.card_present?.reader?.location
        || metadata.location

      if (locationId) {
        logStep('Terminal location found', { locationId })
        const { data: gig } = await supabase
          .from('merch_gigs')
          .select('id, user_id')
          .eq('stripe_location_id', locationId)
          .maybeSingle()

        if (gig) {
          gigId = gig.id
          if (!resolvedArtistId) resolvedArtistId = gig.user_id
          logStep('Resolved gig from Terminal location', { gigId, userId: gig.user_id })
        } else {
          logStep('No gig found for Terminal location', { locationId })
        }
      }
    } catch (err) {
      logStep('Error resolving Terminal location', { error: (err as Error).message })
    }
  }

  if (!resolvedArtistId) {
    logStep('Could not resolve artist user_id, skipping merch sale insert')
    return
  }

  // Idempotency
  const { data: existing } = await supabase
    .from('merch_sales')
    .select('id')
    .eq('stripe_payment_id', paymentIntent.id)
    .maybeSingle()

  if (existing) {
    logStep('Payment intent already recorded, skipping', { piId: paymentIntent.id })
    return
  }

  const total = (paymentIntent.amount || 0) / 100
  const currency = (paymentIntent.currency || 'usd').toUpperCase()
  const paymentSource = isTerminal ? 'terminal' : 'web'

  const { error } = await supabase.from('merch_sales').insert({
    user_id: resolvedArtistId,
    gig_id: gigId,
    product_id: productId,
    quantity: 1,
    unit_price: total,
    total,
    currency,
    payment_method: isTerminal ? 'stripe_terminal' : 'stripe',
    payment_source: paymentSource,
    stripe_payment_id: paymentIntent.id,
  })

  if (error) {
    logStep('Error inserting terminal merch sale', { error: error.message })
  } else {
    logStep('Merch sale recorded', { total, currency, paymentSource })
  }
}

// ── Existing: referral / digital product handling ─────────
async function handlePaymentEvent(event: Stripe.Event, stripe: Stripe, supabase: any) {
  let customerEmail: string | null = null
  let amountPaid: number = 0
  let currency: string = 'usd'
  let isSubscription = false
  let isFirstSubscriptionPayment = false
  let productName: string = ''
  let paymentId: string = ''

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    customerEmail = session.customer_email || session.customer_details?.email || null
    amountPaid = session.amount_total || 0
    currency = session.currency || 'usd'
    isSubscription = session.mode === 'subscription'
    paymentId = session.id

    // Check if this is a digital product purchase
    const metadata = session.metadata || {}
    if (metadata.product_type === 'digital_product') {
      logStep('Digital product purchase detected', {
        productId: metadata.product_id,
        sellerId: metadata.seller_id,
        buyerId: metadata.buyer_id,
      })

      // Complete the digital product purchase
      try {
        const { data: completeResult, error: completeError } = await supabase.functions.invoke(
          'complete-digital-product-purchase',
          {
            body: {
              productId: metadata.product_id,
              buyerId: metadata.buyer_id || null,
              buyerEmail: customerEmail,
              sellerId: metadata.seller_id,
              amount: amountPaid / 100,
              currency: currency.toUpperCase(),
              paymentProvider: 'stripe',
              providerPaymentId: session.id,
            },
          }
        )

        if (completeError) {
          logStep('Failed to complete digital product purchase', { error: completeError.message })
        } else {
          logStep('Digital product purchase completed', { result: completeResult })
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        logStep('Error completing digital product purchase', { error: errMsg })
      }

      return
    }

    // Get product details from line items
    if (session.line_items?.data?.[0]?.price?.product) {
      const product = await stripe.products.retrieve(
        session.line_items.data[0].price.product as string
      )
      productName = product.name || ''
    }

    if (isSubscription) {
      isFirstSubscriptionPayment = true
    }

    logStep('Checkout session completed', {
      email: customerEmail,
      amount: amountPaid,
      mode: session.mode,
      product: productName,
    })
  } else if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice

    if (!invoice.subscription) {
      logStep('Skipping non-subscription invoice')
      return
    }

    customerEmail = invoice.customer_email
    amountPaid = invoice.amount_paid
    currency = invoice.currency
    isSubscription = true
    paymentId = invoice.id

    isFirstSubscriptionPayment = invoice.billing_reason === 'subscription_create'

    if (!isFirstSubscriptionPayment) {
      logStep('Skipping non-first subscription payment', { billing_reason: invoice.billing_reason })
      return
    }

    if (invoice.lines?.data?.[0]?.price?.product) {
      const product = await stripe.products.retrieve(
        invoice.lines.data[0].price.product as string
      )
      productName = product.name || ''
    }

    logStep('First subscription invoice paid', {
      email: customerEmail,
      amount: amountPaid,
      product: productName,
    })
  }

  if (!customerEmail) {
    logStep('No customer email found, cannot process referral')
    return
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', customerEmail)
    .maybeSingle()

  if (profileError || !profile) {
    logStep('User not found by email', { email: customerEmail, error: profileError?.message })
    return
  }

  const userId = profile.id
  logStep('Found user', { userId })

  const { data: referral, error: referralError } = await supabase
    .from('referrals')
    .select('id, referrer_id')
    .eq('referred_user_id', userId)
    .eq('status', 'signed_up')
    .maybeSingle()

  if (referralError || !referral) {
    logStep('No pending referral found', { userId, error: referralError?.message })
    return
  }

  logStep('Found pending referral', { referralId: referral.id, referrerId: referral.referrer_id })

  const { data: existingTransaction } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('reference_id', paymentId)
    .maybeSingle()

  if (existingTransaction) {
    logStep('Payment already processed', { paymentId })
    return
  }

  const isUnionMembership = SUBSCRIPTION_PRODUCT_KEYWORDS.some(
    keyword => productName.toLowerCase().includes(keyword)
  ) || isSubscription

  let creditAmount: number
  let description: string

  if (isUnionMembership && isFirstSubscriptionPayment) {
    creditAmount = Math.round(amountPaid * SUBSCRIPTION_CREDIT_MULTIPLIER)
    description = `Referral reward: ${productName || 'Union Membership'} (200% first month)`
  } else if (!isSubscription) {
    creditAmount = Math.round(amountPaid * COURSE_CREDIT_PERCENTAGE)
    description = `Referral reward: ${productName || 'Course purchase'} (30%)`
  } else {
    logStep('Skipping - not eligible for referral credit', { isSubscription, isFirstSubscriptionPayment })
    return
  }

  logStep('Awarding referral credit', {
    referrerId: referral.referrer_id,
    amount: creditAmount,
    currency,
    description,
  })

  const { data: result, error: awardError } = await supabase.rpc('award_referral_credit', {
    p_referrer_id: referral.referrer_id,
    p_referred_user_id: userId,
    p_amount: creditAmount,
    p_description: description,
    p_reference_id: paymentId,
  })

  if (awardError) {
    logStep('Error awarding credit', { error: awardError.message })
    throw awardError
  }

  logStep('Referral credit awarded successfully', result)
}

// ── Auto-apply referral credits to subscription invoice before payment ──
async function handleInvoiceCreatedApplyCredits(
  event: Stripe.Event,
  stripe: Stripe,
  supabase: any
) {
  const invoice = event.data.object as Stripe.Invoice

  // Only apply to subscription renewal invoices, not the first one
  if (!invoice.subscription) {
    logStep('Skipping non-subscription invoice for credit application')
    return
  }

  // Skip draft invoices that are manually created
  if (invoice.billing_reason === 'manual') {
    logStep('Skipping manual invoice')
    return
  }

  const customerEmail = invoice.customer_email
  if (!customerEmail) {
    logStep('No customer email on invoice, cannot check credits')
    return
  }

  // Find the user by email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', customerEmail)
    .maybeSingle()

  if (profileError || !profile) {
    logStep('User not found for credit application', { email: customerEmail })
    return
  }

  const userId = profile.id

  // Check if user has credits
  const { data: credits, error: creditsError } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle()

  if (creditsError || !credits || credits.balance <= 0) {
    logStep('No credits to apply', { userId, balance: credits?.balance || 0 })
    return
  }

  const balanceCents = credits.balance // Already in USD cents
  const invoiceAmountCents = invoice.amount_due // Invoice amount in smallest currency unit

  // Convert credit (USD cents) to invoice currency if needed
  // For simplicity, if the invoice is in USD, apply directly
  // For other currencies, we'd need exchange rate conversion
  const invoiceCurrency = (invoice.currency || 'usd').toLowerCase()
  
  let creditToApply: number
  
  if (invoiceCurrency === 'usd') {
    // Apply up to the invoice amount or the full credit balance, whichever is less
    creditToApply = Math.min(balanceCents, invoiceAmountCents)
  } else {
    // For non-USD invoices, look up exchange rate
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const { data: rate } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', 'USD')
      .eq('to_currency', invoiceCurrency.toUpperCase())
      .eq('rate_month', currentMonth)
      .maybeSingle()

    if (!rate) {
      logStep('No exchange rate found, skipping credit application', {
        currency: invoiceCurrency,
      })
      return
    }

    // Convert credit balance to invoice currency
    const creditInInvoiceCurrency = Math.round(balanceCents * rate.rate)
    creditToApply = Math.min(creditInInvoiceCurrency, invoiceAmountCents)
    
    logStep('Currency conversion for credit', {
      usdCents: balanceCents,
      rate: rate.rate,
      convertedCents: creditInInvoiceCurrency,
      invoiceCurrency,
    })
  }

  if (creditToApply <= 0) {
    logStep('Credit amount too small to apply')
    return
  }

  logStep('Applying referral credits to invoice', {
    userId,
    creditBalance: balanceCents,
    invoiceAmount: invoiceAmountCents,
    creditToApply,
    invoiceCurrency,
    invoiceId: invoice.id,
  })

  try {
    // Add a negative invoice item to discount the invoice
    await stripe.invoiceItems.create({
      customer: invoice.customer as string,
      invoice: invoice.id,
      amount: -creditToApply, // Negative = discount
      currency: invoiceCurrency,
      description: `Referral credit applied ($${(creditToApply / 100).toFixed(2)} ${invoiceCurrency.toUpperCase()})`,
    })

    // Calculate how many USD cents were actually spent
    let usdCentsSpent: number
    if (invoiceCurrency === 'usd') {
      usdCentsSpent = creditToApply
    } else {
      // Reverse-convert from invoice currency back to USD
      const currentMonth = new Date().toISOString().slice(0, 7)
      const { data: rate } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', 'USD')
        .eq('to_currency', invoiceCurrency.toUpperCase())
        .eq('rate_month', currentMonth)
        .maybeSingle()

      usdCentsSpent = rate ? Math.round(creditToApply / rate.rate) : creditToApply
    }

    // Deduct credits from user balance
    const { error: deductError } = await supabase
      .from('user_credits')
      .update({ balance: credits.balance - usdCentsSpent })
      .eq('user_id', userId)

    if (deductError) {
      logStep('Error deducting credits', { error: deductError.message })
    }

    // Log the credit transaction
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: -usdCentsSpent,
      type: 'spent_subscription',
      description: `Auto-applied to subscription renewal (${invoiceCurrency.toUpperCase()})`,
      reference_id: invoice.id,
    })

    logStep('Credits successfully applied to invoice', {
      userId,
      usdCentsSpent,
      newBalance: credits.balance - usdCentsSpent,
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    logStep('Error applying credits to invoice', { error: errMsg })
  }
}