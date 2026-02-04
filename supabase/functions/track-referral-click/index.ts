import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { referral_code } = await req.json()

    if (!referral_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing referral_code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Tracking referral click for code: ${referral_code}`)

    // Create Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // First, find the referrer by looking up who has this referral code in their existing referral record
    // OR look up by profiles.referral_code if that exists
    // The referral code is stored in the referrals table when the user's profile is created
    const { data: existingReferral, error: lookupError } = await supabase
      .from('referrals')
      .select('referrer_id, id, status, referred_user_id')
      .eq('referral_code', referral_code)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lookupError) {
      console.error('Error looking up referral code:', lookupError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to look up referral code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!existingReferral) {
      console.log('Referral code not found:', referral_code)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid referral code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if this referral has already been used (has a referred_user_id)
    if (existingReferral.referred_user_id) {
      console.log('Referral code already used:', referral_code)
      // Still return success - the cookie will be set but won't work on signup
      return new Response(
        JSON.stringify({ 
          success: true, 
          referrer_id: existingReferral.referrer_id,
          already_used: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // The referral exists and is valid - return success
    // We don't need to create a new record, just validate the code exists
    console.log('Valid referral code found for referrer:', existingReferral.referrer_id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        referrer_id: existingReferral.referrer_id,
        referral_id: existingReferral.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
