import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[IMPORT-WP-USERS] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error('Invalid authorization');
    }

    // Check if requesting user is an admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: requestingUser.id,
      _role: 'admin',
    });

    if (isAdmin !== true) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { users, mode = 'preview' } = await req.json();

    if (!users || !Array.isArray(users)) {
      throw new Error('Missing required field: users (array)');
    }

    logStep('Processing import request', { userCount: users.length, mode });

    const results = {
      total: users.length,
      created: 0,
      skipped: 0,
      errors: [] as { email: string; error: string }[],
      preview: [] as { email: string; name: string; status: string }[],
    };

    for (const wpUser of users) {
      const email = (wpUser.email || wpUser.user_email || '').toLowerCase().trim();
      const fullName = wpUser.display_name || wpUser.name || wpUser.user_nicename || email.split('@')[0];
      const wpPasswordHash = wpUser.user_pass || wpUser.password_hash;

      if (!email) {
        results.errors.push({ email: 'unknown', error: 'Missing email address' });
        continue;
      }

      // Check if user already exists in profiles
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        results.skipped++;
        results.preview.push({ email, name: fullName, status: 'exists' });
        logStep('User already exists', { email });
        continue;
      }

      if (mode === 'preview') {
        results.preview.push({ email, name: fullName, status: 'will_create' });
        continue;
      }

      // Import mode - create the user
      try {
        // WordPress uses PHPass which Supabase doesn't support natively
        // We have two options:
        // 1. Create user with a random password and send password reset email
        // 2. Create user with a known temporary password that must be changed
        
        // Option 1 is more secure - create with random password
        const tempPassword = crypto.randomUUID() + 'Aa1!'; // Ensure it meets password requirements
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true, // Auto-confirm since they were already confirmed in WordPress
          user_metadata: {
            full_name: fullName,
            imported_from: 'wordpress',
            wp_password_hash: wpPasswordHash ? 'stored' : 'none', // Don't store actual hash
          },
        });

        if (createError) {
          if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
            results.skipped++;
            results.preview.push({ email, name: fullName, status: 'exists_in_auth' });
          } else {
            results.errors.push({ email, error: createError.message });
          }
          continue;
        }

        logStep('User created', { email, userId: newUser.user.id });

        // Mark email as verified in profiles
        const { error: profileUpdateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            full_name: fullName,
            email_verified: true, 
            email_verified_at: new Date().toISOString() 
          })
          .eq('id', newUser.user.id);

        if (profileUpdateError) {
          logStep('Profile update error', { email, error: profileUpdateError.message });
        }

        // Store WordPress password hash for potential future migration/verification
        // This could be used with a custom verify function if needed
        if (wpPasswordHash) {
          await supabaseAdmin
            .from('profiles')
            .update({ 
              wp_password_hash: wpPasswordHash 
            })
            .eq('id', newUser.user.id);
        }

        results.created++;
        results.preview.push({ email, name: fullName, status: 'created' });

      } catch (userError: any) {
        logStep('Error creating user', { email, error: userError.message });
        results.errors.push({ email, error: userError.message });
      }
    }

    logStep('Import complete', { 
      created: results.created, 
      skipped: results.skipped, 
      errors: results.errors.length 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: mode === 'preview' 
          ? `Preview: ${results.preview.filter(p => p.status === 'will_create').length} users will be created, ${results.skipped} already exist`
          : `Created ${results.created} users, skipped ${results.skipped} existing users, ${results.errors.length} errors`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logStep('ERROR', { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});