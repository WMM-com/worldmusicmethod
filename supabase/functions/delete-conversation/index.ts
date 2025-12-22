import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { conversationId } = await req.json();

    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: 'Missing conversationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the conversation
    const { data: conversation, error: convError } = await adminClient
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is a participant
    if (!conversation.participant_ids.includes(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Not authorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Soft delete: add user to deleted_for_users array
    const deletedForUsers = conversation.deleted_for_users || [];
    if (!deletedForUsers.includes(user.id)) {
      deletedForUsers.push(user.id);
    }

    const { error: updateError } = await adminClient
      .from('conversations')
      .update({ deleted_for_users: deletedForUsers })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete conversation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also soft delete all messages in the conversation for this user
    const { data: messages } = await adminClient
      .from('messages')
      .select('id, deleted_for_users')
      .eq('conversation_id', conversationId);

    if (messages) {
      for (const msg of messages) {
        const msgDeletedFor = msg.deleted_for_users || [];
        if (!msgDeletedFor.includes(user.id)) {
          msgDeletedFor.push(user.id);
          await adminClient
            .from('messages')
            .update({ deleted_for_users: msgDeletedFor })
            .eq('id', msg.id);
        }
      }
    }

    console.log(`Conversation ${conversationId} soft deleted for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
