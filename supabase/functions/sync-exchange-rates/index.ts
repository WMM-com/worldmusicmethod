import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Free API for exchange rates
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest';

interface ExchangeRateResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

async function fetchExchangeRates(baseCurrency: string): Promise<ExchangeRateResponse> {
  const response = await fetch(`${EXCHANGE_API_URL}/${baseCurrency}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rates: ${await response.text()}`);
  }
  
  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    
    // Optionally specify which month to fetch rates for
    // Default to current month
    const targetDate = body.month ? new Date(body.month) : new Date();
    const rateMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString().split('T')[0];

    console.log(`Fetching exchange rates for month: ${rateMonth}`);

    // Primary currencies we care about
    const currencies = ['GBP', 'USD', 'EUR'];
    const ratesInserted: { from: string; to: string; rate: number }[] = [];

    // Create sync log
    const { data: syncLog } = await supabase
      .from('financial_sync_log')
      .insert({
        source: 'exchange_rates',
        sync_type: 'auto',
        sync_details: { month: rateMonth }
      })
      .select()
      .single();

    // Fetch rates with GBP as base (primary currency)
    const gbpRates = await fetchExchangeRates('GBP');
    
    // Store rates for all currency pairs
    for (const fromCurrency of currencies) {
      for (const toCurrency of currencies) {
        if (fromCurrency === toCurrency) continue;

        // Calculate cross rate
        let rate: number;
        if (fromCurrency === 'GBP') {
          rate = gbpRates.rates[toCurrency];
        } else if (toCurrency === 'GBP') {
          rate = 1 / gbpRates.rates[fromCurrency];
        } else {
          // Cross rate via GBP
          rate = gbpRates.rates[toCurrency] / gbpRates.rates[fromCurrency];
        }

        // Upsert the rate
        const { error } = await supabase
          .from('exchange_rates')
          .upsert({
            rate_month: rateMonth,
            from_currency: fromCurrency,
            to_currency: toCurrency,
            rate: rate,
            source: 'api',
            fetched_at: new Date().toISOString(),
          }, {
            onConflict: 'rate_month,from_currency,to_currency',
          });

        if (error) {
          console.error(`Failed to save rate ${fromCurrency}->${toCurrency}:`, error);
        } else {
          ratesInserted.push({ from: fromCurrency, to: toCurrency, rate });
        }
      }
    }

    // Update sync log
    if (syncLog) {
      await supabase
        .from('financial_sync_log')
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed',
          transactions_synced: ratesInserted.length,
          sync_details: {
            month: rateMonth,
            rates: ratesInserted,
          }
        })
        .eq('id', syncLog.id);
    }

    console.log(`Exchange rates synced: ${ratesInserted.length} rates`);

    return new Response(
      JSON.stringify({
        success: true,
        month: rateMonth,
        rates: ratesInserted,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Exchange rate sync error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
