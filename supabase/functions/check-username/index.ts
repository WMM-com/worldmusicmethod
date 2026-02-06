import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const RESERVED_USERNAMES = [
  'admin', 'administrator', 'root', 'system', 'support', 'help',
  'mod', 'moderator', 'staff', 'official', 'team', 'api',
  'www', 'mail', 'ftp', 'blog', 'shop', 'store', 'app',
  'dashboard', 'settings', 'account', 'profile', 'login',
  'signup', 'auth', 'register', 'about', 'contact', 'terms',
  'privacy', 'legal', 'billing', 'pricing', 'checkout', 'cart',
  'media', 'events', 'courses', 'messages', 'notifications',
  'social', 'community', 'groups', 'meet', 'video',
  'null', 'undefined', 'test', 'demo',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username } = await req.json()

    if (!username || typeof username !== 'string') {
      return new Response(
        JSON.stringify({ available: false, error: 'Username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cleaned = username.toLowerCase().trim()

    // Validate format: 3-30 chars, letters/numbers/hyphens/underscores
    if (!/^[a-z0-9_-]{3,30}$/.test(cleaned)) {
      let error = 'Username must be 3-30 characters using only letters, numbers, hyphens, and underscores'
      if (cleaned.length < 3) error = 'Username must be at least 3 characters'
      if (cleaned.length > 30) error = 'Username must be 30 characters or less'
      return new Response(
        JSON.stringify({ available: false, error }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cannot start/end with hyphen or underscore
    if (/^[-_]|[-_]$/.test(cleaned)) {
      return new Response(
        JSON.stringify({ available: false, error: 'Username cannot start or end with a hyphen or underscore' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No consecutive special characters
    if (/[-_]{2,}/.test(cleaned)) {
      return new Response(
        JSON.stringify({ available: false, error: 'Username cannot have consecutive hyphens or underscores' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check reserved words
    if (RESERVED_USERNAMES.includes(cleaned)) {
      return new Response(
        JSON.stringify({ available: false, error: 'This username is reserved' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the requesting user's ID from auth (optional - allows us to skip self-match)
    const authHeader = req.headers.get('Authorization')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let currentUserId: string | null = null
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } }
      })
      const { data: { user } } = await anonClient.auth.getUser()
      currentUserId = user?.id || null
    }

    // Check if username exists in profiles (excluding current user)
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('username', cleaned)
      .limit(1)

    const { data: existing, error: dbError } = await query

    if (dbError) {
      console.error('DB error checking username:', dbError)
      return new Response(
        JSON.stringify({ available: false, error: 'Unable to check availability. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If the username belongs to the current user, it's "available" (they already own it)
    if (existing && existing.length > 0) {
      if (currentUserId && existing[0].id === currentUserId) {
        return new Response(
          JSON.stringify({ available: true, message: 'This is your current username' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ available: false, error: 'Username is already taken' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Also check username_history for recently abandoned usernames (within 90 days)
    const { data: historyMatch, error: historyError } = await supabase
      .from('username_history')
      .select('user_id, changed_at')
      .eq('old_username', cleaned)
      .order('changed_at', { ascending: false })
      .limit(1)

    if (!historyError && historyMatch && historyMatch.length > 0) {
      const changedAt = new Date(historyMatch[0].changed_at)
      const daysSince = Math.floor((Date.now() - changedAt.getTime()) / (1000 * 60 * 60 * 24))
      // If the username was abandoned less than 90 days ago by someone else, block it
      if (daysSince < 90 && historyMatch[0].user_id !== currentUserId) {
        return new Response(
          JSON.stringify({ available: false, error: 'This username was recently used and is temporarily unavailable' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log(`Username check: "${cleaned}" is available`)

    return new Response(
      JSON.stringify({ available: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('check-username error:', err)
    return new Response(
      JSON.stringify({ available: false, error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
