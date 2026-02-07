import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import Stripe from 'https://esm.sh/stripe@14.21.0'

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

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
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

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    let event: Stripe.Event

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
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

      // Route merch terminal payments to the merch handler
      if (metadata.gig_id || metadata.artist_user_id) {
        await handleMerchPaymentIntentSucceeded(paymentIntent, supabase)
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
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
  supabase: any
) {
  const metadata = paymentIntent.metadata || {}
  const gigId = metadata.gig_id || null
  const artistUserId = metadata.artist_user_id || null
  const productId = metadata.product_id || null

  logStep('Merch payment_intent.succeeded', {
    paymentIntentId: paymentIntent.id,
    gigId,
    artistUserId,
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

  const { error } = await supabase.from('merch_sales').insert({
    user_id: resolvedArtistId,
    gig_id: gigId,
    product_id: productId,
    quantity: 1,
    unit_price: total,
    total,
    currency,
    payment_method: 'stripe_terminal',
    stripe_payment_id: paymentIntent.id,
  })

  if (error) {
    logStep('Error inserting terminal merch sale', { error: error.message })
  } else {
    logStep('Terminal merch sale recorded', { total, currency })
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
