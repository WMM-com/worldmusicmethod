import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function logStep(step: string, details?: any) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REPAIR-TAGS] ${step}${detailsStr}`);
}

// Parse CSV content into array of {email, tags}
function parseCSV(csvContent: string): Array<{email: string; tags: string}> {
  const lines = csvContent.split('\n');
  const results: Array<{email: string; tags: string}> = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV with quoted fields
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    
    // CSV format: First Name, Last Name, Email, Status, Tags, ...
    if (fields.length >= 5) {
      const email = fields[2]?.toLowerCase().trim();
      const tags = fields[4]?.trim() || '';
      
      if (email && email.includes('@')) {
        results.push({ email, tags });
      }
    }
  }
  
  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting tag repair from CSV");

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read the CSV file from the request body
    const { csvContent } = await req.json();
    
    if (!csvContent) {
      throw new Error('CSV content is required');
    }

    logStep("Parsing CSV content");
    const students = parseCSV(csvContent);
    logStep(`Parsed ${students.length} students from CSV`);

    // Process in batches of 100
    const batchSize = 100;
    let totalMatched = 0;
    let totalUpdated = 0;
    let totalTagsCreated = 0;
    let totalUnmatched = 0;
    const allUnmatchedSamples: string[] = [];

    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      logStep(`Processing batch ${batchNumber} (${batch.length} students)`);

      // Call the database function
      const { data, error } = await supabase.rpc('repair_profile_tags_from_csv', {
        csv_data: batch
      });

      if (error) {
        logStep(`Error in batch ${batchNumber}`, error);
        throw error;
      }

      if (data) {
        totalMatched += data.matched_profiles || 0;
        totalUpdated += data.updated_profiles || 0;
        totalTagsCreated += data.user_tags_created || 0;
        totalUnmatched += data.unmatched_count || 0;
        if (data.sample_unmatched) {
          allUnmatchedSamples.push(...data.sample_unmatched.slice(0, 5));
        }
      }

      logStep(`Batch ${batchNumber} complete`, data);
    }

    const summary = {
      total_students_processed: students.length,
      matched_profiles: totalMatched,
      updated_profiles: totalUpdated,
      user_tags_created: totalTagsCreated,
      unmatched_count: totalUnmatched,
      sample_unmatched_emails: allUnmatchedSamples.slice(0, 10)
    };

    logStep("Repair complete", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
