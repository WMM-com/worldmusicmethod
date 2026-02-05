import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get request body
    const { 
      business_name, 
      business_email, 
      business_mobile, 
      bank_code, 
      account_number,
      country,
      split_value = 10, // Default platform fee percentage
    } = await req.json();

    // Validate required fields
    if (!business_name || !business_email || !account_number || !bank_code) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: business_name, business_email, account_number, bank_code' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check Flutterwave secret key
    const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!flutterwaveSecretKey) {
      return new Response(JSON.stringify({ error: 'Flutterwave not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for existing payment account
    const { data: existingAccount } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'flutterwave')
      .single();

    if (existingAccount?.onboarding_complete) {
      return new Response(JSON.stringify({ 
        error: 'Flutterwave account already connected',
        account: existingAccount,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Flutterwave subaccount
    const flutterwaveResponse = await fetch('https://api.flutterwave.com/v3/subaccounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flutterwaveSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_bank: bank_code,
        account_number: account_number,
        business_name: business_name,
        business_email: business_email,
        business_mobile: business_mobile || '',
        country: country || 'NG',
        split_type: 'percentage',
        split_value: split_value,
      }),
    });

    const flutterwaveData = await flutterwaveResponse.json();
    console.log('[flutterwave-subaccount-create] Flutterwave response:', flutterwaveData);

    if (flutterwaveData.status !== 'success') {
      return new Response(JSON.stringify({ 
        error: flutterwaveData.message || 'Failed to create Flutterwave subaccount',
        details: flutterwaveData,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subaccount = flutterwaveData.data;

    // Upsert payment account record
    const { data: savedAccount, error: upsertError } = await supabase
      .from('payment_accounts')
      .upsert({
        user_id: user.id,
        provider: 'flutterwave',
        account_id: subaccount.subaccount_id || subaccount.id,
        account_status: 'active',
        onboarding_complete: true,
        account_email: business_email,
        metadata: {
          business_name: subaccount.business_name,
          account_bank: subaccount.account_bank,
          account_number: subaccount.account_number,
          bank_name: subaccount.bank_name,
          country: subaccount.country,
          split_value: subaccount.split_value,
          flutterwave_id: subaccount.id,
        },
      }, { onConflict: 'user_id,provider' })
      .select()
      .single();

    if (upsertError) {
      console.error('[flutterwave-subaccount-create] Error saving account:', upsertError);
      return new Response(JSON.stringify({ error: 'Failed to save account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[flutterwave-subaccount-create] Created subaccount for user:', user.id);

    return new Response(JSON.stringify({ 
      success: true,
      account: savedAccount,
      subaccount: subaccount,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[flutterwave-subaccount-create] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
