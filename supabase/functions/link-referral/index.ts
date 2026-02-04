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
    const { referral_code, user_id } = await req.json()

    if (!referral_code || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing referral_code or user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Linking referral: code=${referral_code}, user_id=${user_id}`)

    // Create Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the database function to link the referral
    const { data, error } = await supabase.rpc('link_referred_signup', {
      p_referral_code: referral_code,
      p_referred_user_id: user_id
    })

    if (error) {
      console.error('Error linking referral:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Referral link result:', data)

    // If successfully linked, check and award signup milestones to the referrer
    if (data?.success && data?.referrer_id) {
      console.log('Checking signup milestones for referrer:', data.referrer_id)
      
      const { data: milestoneResult, error: milestoneError } = await supabase.rpc(
        'check_and_award_signup_milestone',
        { p_referrer_id: data.referrer_id }
      )

      if (milestoneError) {
        console.error('Error checking milestones:', milestoneError)
        // Don't fail the response, milestone check is supplementary
      } else if (milestoneResult?.any_awarded) {
        console.log('Milestones awarded:', milestoneResult.milestones_awarded)
      }

      // Include milestone info in response
      return new Response(
        JSON.stringify({
          ...data,
          milestone_check: milestoneResult
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify(data),
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
