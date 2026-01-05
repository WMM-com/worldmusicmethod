import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
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
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin');

    if (roleError || !roleData || roleData.length === 0) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { email, password, fullName, role } = await req.json();

    if (!email || !password || !fullName) {
      throw new Error('Missing required fields: email, password, fullName');
    }

    // Check if email already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingProfile) {
      throw new Error('A user with this email address already exists');
    }

    console.log(`Creating user: ${email} with role: ${role}`);

    // Create the user using admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      // Check for duplicate email error from Supabase Auth
      if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
        throw new Error('A user with this email address already exists');
      }
      throw createError;
    }

    console.log(`User created: ${newUser.user.id}`);

    // Mark email as verified in profiles for admin-created users
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        email_verified: true, 
        email_verified_at: new Date().toISOString() 
      })
      .eq('id', newUser.user.id);

    if (profileUpdateError) {
      console.error('Error updating profile email_verified:', profileUpdateError);
    } else {
      console.log(`Email verified flag set for user: ${newUser.user.id}`);
    }

    // If role is admin, update the user_roles table
    if (role === 'admin' && newUser.user) {
      // First delete existing role if any
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', newUser.user.id);

      // Insert admin role
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          role: 'admin',
        });

      if (roleInsertError) {
        console.error('Error setting admin role:', roleInsertError);
      } else {
        console.log(`Admin role set for user: ${newUser.user.id}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, user: { id: newUser.user.id, email: newUser.user.email } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
