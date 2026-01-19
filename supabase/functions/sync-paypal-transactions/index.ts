import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayPalTransaction {
  transaction_id: string;
  transaction_info: {
    transaction_id: string;
    transaction_event_code: string;
    transaction_initiation_date: string;
    transaction_updated_date: string;
    transaction_amount: {
      currency_code: string;
      value: string;
    };
    fee_amount?: {
      currency_code: string;
      value: string;
    };
    transaction_status: string;
    transaction_subject?: string;
    transaction_note?: string;
  };
  payer_info?: {
    payer_name?: {
      alternate_full_name?: string;
    };
    email_address?: string;
  };
  cart_info?: {
    item_details?: Array<{
      item_name?: string;
    }>;
  };
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const response = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchPayPalTransactions(
  accessToken: string,
  startDate: string,
  endDate: string,
  page: number = 1
): Promise<{ transactions: PayPalTransaction[]; hasMore: boolean }> {
  const pageSize = 100;
  
  const url = new URL('https://api-m.paypal.com/v1/reporting/transactions');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('fields', 'all');
  url.searchParams.set('page_size', pageSize.toString());
  url.searchParams.set('page', page.toString());
  url.searchParams.set('transaction_status', 'S'); // Only settled transactions

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch PayPal transactions: ${error}`);
  }

  const data = await response.json();
  const transactions = data.transaction_details || [];
  const totalPages = data.total_pages || 1;

  return {
    transactions,
    hasMore: page < totalPages,
  };
}

function categorizeTransaction(transaction: PayPalTransaction): string | null {
  const eventCode = transaction.transaction_info.transaction_event_code;
  const subject = transaction.transaction_info.transaction_subject?.toLowerCase() || '';
  
  // USER INITIATED WITHDRAWAL - transfer to Wise
  if (eventCode === 'T0400' || eventCode === 'T0300') {
    return 'internal_transfer';
  }
  
  // Refunds
  if (eventCode === 'T1107' || eventCode === 'T1106') {
    return null; // Handle as negative income
  }
  
  // Currency conversion
  if (eventCode === 'T0200') {
    return 'bank_financial_charges';
  }
  
  return null; // Needs manual categorization
}

function getMerchantName(transaction: PayPalTransaction): string {
  return transaction.payer_info?.payer_name?.alternate_full_name || 
         transaction.payer_info?.email_address ||
         transaction.cart_info?.item_details?.[0]?.item_name ||
         'Unknown';
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

    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const { data: isAdmin } = await supabase.rpc('has_role', { 
          _user_id: user.id, 
          _role: 'admin' 
        });
        
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const body = await req.json().catch(() => ({}));
    const syncType = body.sync_type || 'auto';
    
    // Determine date range - default to last 31 days, or custom range
    const endDate = body.end_date || new Date().toISOString();
    const startDate = body.start_date || new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`Starting PayPal sync from ${startDate} to ${endDate}`);

    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('financial_sync_log')
      .insert({
        source: 'paypal',
        sync_type: syncType,
        sync_details: { start_date: startDate, end_date: endDate }
      })
      .select()
      .single();

    if (syncLogError) {
      console.error('Failed to create sync log:', syncLogError);
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();
    console.log('Got PayPal access token');

    // Fetch all transactions with pagination
    let allTransactions: PayPalTransaction[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await fetchPayPalTransactions(accessToken, startDate, endDate, page);
      allTransactions = allTransactions.concat(result.transactions);
      hasMore = result.hasMore;
      page++;
      
      console.log(`Fetched page ${page - 1}, total transactions: ${allTransactions.length}`);
    }

    console.log(`Total PayPal transactions fetched: ${allTransactions.length}`);

    // Get existing merchant rules for auto-categorization
    const { data: merchantRules } = await supabase
      .from('merchant_category_rules')
      .select('*');

    const ruleMap = new Map(merchantRules?.map(r => [r.merchant_name.toLowerCase(), r.category]) || []);

    let syncedCount = 0;
    let skippedCount = 0;

    // Process and upsert transactions
    for (const tx of allTransactions) {
      const merchantName = getMerchantName(tx);
      const amount = parseFloat(tx.transaction_info.transaction_amount.value);
      const feeAmount = tx.transaction_info.fee_amount 
        ? Math.abs(parseFloat(tx.transaction_info.fee_amount.value))
        : 0;

      const transactionData = {
        source: 'paypal',
        external_transaction_id: tx.transaction_info.transaction_id,
        transaction_date: tx.transaction_info.transaction_initiation_date,
        amount: amount,
        currency: tx.transaction_info.transaction_amount.currency_code,
        fee_amount: feeAmount,
        fee_currency: tx.transaction_info.fee_amount?.currency_code || tx.transaction_info.transaction_amount.currency_code,
        net_amount: amount - feeAmount,
        description: tx.transaction_info.transaction_subject || tx.transaction_info.transaction_note || '',
        merchant_name: merchantName,
        transaction_type: tx.transaction_info.transaction_event_code,
        status: tx.transaction_info.transaction_status === 'S' ? 'completed' : 'pending',
        raw_data: tx,
      };

      // Upsert transaction
      const { data: upsertedTx, error: upsertError } = await supabase
        .from('financial_transactions')
        .upsert(transactionData, {
          onConflict: 'source,external_transaction_id',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (upsertError) {
        console.error('Failed to upsert transaction:', upsertError);
        skippedCount++;
        continue;
      }

      // Auto-categorize if we have a rule or can determine category
      let category = categorizeTransaction(tx);
      let isAuto = !!category;
      
      if (!category && ruleMap.has(merchantName.toLowerCase())) {
        category = ruleMap.get(merchantName.toLowerCase())!;
        isAuto = true;
      }

      if (category && upsertedTx) {
        await supabase
          .from('transaction_categories')
          .upsert({
            transaction_id: upsertedTx.id,
            category: category,
            is_auto_categorized: isAuto,
          }, {
            onConflict: 'transaction_id',
          });
      }

      syncedCount++;
    }

    // Update sync log
    if (syncLog) {
      await supabase
        .from('financial_sync_log')
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed',
          transactions_synced: syncedCount,
          sync_details: {
            start_date: startDate,
            end_date: endDate,
            total_fetched: allTransactions.length,
            synced: syncedCount,
            skipped: skippedCount,
          }
        })
        .eq('id', syncLog.id);
    }

    console.log(`PayPal sync completed: ${syncedCount} synced, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        skipped: skippedCount,
        total: allTransactions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('PayPal sync error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
