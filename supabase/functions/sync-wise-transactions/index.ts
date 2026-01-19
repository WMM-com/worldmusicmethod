import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WiseStatement {
  type: string;
  date: string;
  amount: {
    value: number;
    currency: string;
  };
  totalFees: {
    value: number;
    currency: string;
  };
  details: {
    type: string;
    description?: string;
    senderName?: string;
    senderAccount?: string;
    paymentReference?: string;
    merchant?: {
      name?: string;
      category?: string;
    };
  };
  runningBalance: {
    value: number;
    currency: string;
  };
  referenceNumber: string;
}

interface WiseBalance {
  id: number;
  currency: string;
  amount: {
    value: number;
    currency: string;
  };
}

async function getWiseProfiles(apiToken: string): Promise<number[]> {
  const response = await fetch('https://api.wise.com/v1/profiles', {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get Wise profiles: ${await response.text()}`);
  }

  const profiles = await response.json();
  return profiles.map((p: { id: number }) => p.id);
}

async function getWiseBalances(apiToken: string, profileId: number): Promise<WiseBalance[]> {
  const response = await fetch(`https://api.wise.com/v4/profiles/${profileId}/balances?types=STANDARD`, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get Wise balances: ${await response.text()}`);
  }

  return response.json();
}

async function getWiseStatements(
  apiToken: string,
  profileId: number,
  balanceId: number,
  currency: string,
  startDate: string,
  endDate: string
): Promise<WiseStatement[]> {
  const url = new URL(`https://api.wise.com/v1/profiles/${profileId}/balance-statements/${balanceId}/statement.json`);
  url.searchParams.set('currency', currency);
  url.searchParams.set('intervalStart', startDate);
  url.searchParams.set('intervalEnd', endDate);
  url.searchParams.set('type', 'COMPACT');

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to get Wise statements for ${currency}:`, errorText);
    return [];
  }

  const data = await response.json();
  return data.transactions || [];
}

function getMerchantName(transaction: WiseStatement): string {
  return transaction.details.merchant?.name ||
         transaction.details.senderName ||
         transaction.details.description ||
         'Unknown';
}

function getTransactionType(transaction: WiseStatement): string {
  const type = transaction.details.type?.toUpperCase() || transaction.type?.toUpperCase();
  
  if (type.includes('CARD')) return 'card_payment';
  if (type.includes('TRANSFER')) return 'transfer';
  if (type.includes('CONVERSION')) return 'conversion';
  if (type.includes('DEPOSIT')) return 'deposit';
  if (type.includes('WITHDRAWAL')) return 'withdrawal';
  
  return type.toLowerCase();
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

    const apiToken = Deno.env.get('WISE_API_TOKEN');
    if (!apiToken) {
      throw new Error('WISE_API_TOKEN not configured');
    }

    const body = await req.json().catch(() => ({}));
    const syncType = body.sync_type || 'auto';
    
    // Determine date range
    const endDate = body.end_date || new Date().toISOString();
    const startDate = body.start_date || new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`Starting Wise sync from ${startDate} to ${endDate}`);

    // Create sync log entry
    const { data: syncLog } = await supabase
      .from('financial_sync_log')
      .insert({
        source: 'wise',
        sync_type: syncType,
        sync_details: { start_date: startDate, end_date: endDate }
      })
      .select()
      .single();

    // Get Wise profiles
    const profileIds = await getWiseProfiles(apiToken);
    console.log(`Found ${profileIds.length} Wise profile(s)`);

    // Get existing merchant rules for auto-categorization
    const { data: merchantRules } = await supabase
      .from('merchant_category_rules')
      .select('*');

    const ruleMap = new Map(merchantRules?.map(r => [r.merchant_name.toLowerCase(), r.category]) || []);

    let syncedCount = 0;
    let skippedCount = 0;
    const balanceSnapshots: { currency: string; available: number; pending: number }[] = [];

    for (const profileId of profileIds) {
      // Get balances
      const balances = await getWiseBalances(apiToken, profileId);
      console.log(`Profile ${profileId}: Found ${balances.length} balance(s)`);

      for (const balance of balances) {
        // Store balance snapshot
        balanceSnapshots.push({
          currency: balance.currency,
          available: balance.amount.value,
          pending: 0,
        });

        // Get statements for this balance
        const statements = await getWiseStatements(
          apiToken,
          profileId,
          balance.id,
          balance.currency,
          startDate,
          endDate
        );

        console.log(`${balance.currency}: Found ${statements.length} transactions`);

        for (const tx of statements) {
          const merchantName = getMerchantName(tx);
          const amount = tx.amount.value;
          const feeAmount = Math.abs(tx.totalFees?.value || 0);

          const transactionData = {
            source: 'wise',
            external_transaction_id: tx.referenceNumber,
            transaction_date: tx.date,
            amount: amount,
            currency: tx.amount.currency,
            fee_amount: feeAmount,
            fee_currency: tx.totalFees?.currency || tx.amount.currency,
            net_amount: amount - feeAmount,
            description: tx.details.description || tx.details.paymentReference || '',
            merchant_name: merchantName,
            transaction_type: getTransactionType(tx),
            status: 'completed',
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
            console.error('Failed to upsert Wise transaction:', upsertError);
            skippedCount++;
            continue;
          }

          // Auto-categorize based on merchant rules
          let category: string | null = null;
          let isAuto = false;

          if (ruleMap.has(merchantName.toLowerCase())) {
            category = ruleMap.get(merchantName.toLowerCase())!;
            isAuto = true;
          } else if (tx.details.type === 'CONVERSION') {
            category = 'bank_financial_charges';
            isAuto = true;
          } else if (tx.details.type === 'TRANSFER' && amount > 0) {
            // Incoming transfer - could be Stripe payout
            if (merchantName.toLowerCase().includes('stripe')) {
              category = 'internal_transfer';
              isAuto = true;
            }
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
      }
    }

    // Save balance snapshots
    for (const snapshot of balanceSnapshots) {
      await supabase
        .from('account_balances')
        .insert({
          source: 'wise',
          currency: snapshot.currency,
          available_balance: snapshot.available,
          pending_balance: snapshot.pending,
        });
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
            synced: syncedCount,
            skipped: skippedCount,
            balances: balanceSnapshots,
          }
        })
        .eq('id', syncLog.id);
    }

    console.log(`Wise sync completed: ${syncedCount} synced, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        skipped: skippedCount,
        balances: balanceSnapshots,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Wise sync error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
