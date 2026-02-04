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

    // Handle relevant events
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

    // Get product details from line items
    if (session.line_items?.data?.[0]?.price?.product) {
      const product = await stripe.products.retrieve(
        session.line_items.data[0].price.product as string
      )
      productName = product.name || ''
    }

    // For subscriptions from checkout, this is always the first payment
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
    
    // Only process subscription invoices
    if (!invoice.subscription) {
      logStep('Skipping non-subscription invoice')
      return
    }

    customerEmail = invoice.customer_email
    amountPaid = invoice.amount_paid
    currency = invoice.currency
    isSubscription = true
    paymentId = invoice.id

    // Check if this is the first payment for the subscription
    // billing_reason === 'subscription_create' indicates first invoice
    isFirstSubscriptionPayment = invoice.billing_reason === 'subscription_create'

    if (!isFirstSubscriptionPayment) {
      logStep('Skipping non-first subscription payment', { billing_reason: invoice.billing_reason })
      return
    }

    // Get product name from invoice lines
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

  // Find the user by email
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

  // Check if this user has a referral with status 'signed_up'
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

  // Check if we've already processed this payment (idempotency)
  const { data: existingTransaction } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('reference_id', paymentId)
    .maybeSingle()

  if (existingTransaction) {
    logStep('Payment already processed', { paymentId })
    return
  }

  // Determine product type and calculate credit amount
  const isUnionMembership = SUBSCRIPTION_PRODUCT_KEYWORDS.some(
    keyword => productName.toLowerCase().includes(keyword)
  ) || isSubscription

  let creditAmount: number
  let description: string

  if (isUnionMembership && isFirstSubscriptionPayment) {
    // 200% of first month for subscriptions
    creditAmount = Math.round(amountPaid * SUBSCRIPTION_CREDIT_MULTIPLIER)
    description = `Referral reward: ${productName || 'Union Membership'} (200% first month)`
  } else if (!isSubscription) {
    // 30% for one-time purchases (courses)
    creditAmount = Math.round(amountPaid * COURSE_CREDIT_PERCENTAGE)
    description = `Referral reward: ${productName || 'Course purchase'} (30%)`
  } else {
    logStep('Skipping - not eligible for referral credit', { isSubscription, isFirstSubscriptionPayment })
    return
  }

  // Amount is in cents, credit is also stored in cents
  logStep('Awarding referral credit', {
    referrerId: referral.referrer_id,
    amount: creditAmount,
    currency,
    description,
  })

  // Award the credit atomically using database function
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
