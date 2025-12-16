import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  venue_name?: string;
  venue_address?: string;
  notes?: string;
}

// Refresh access token if expired
async function refreshToken(connection: any): Promise<string | null> {
  if (!connection.refresh_token) return connection.access_token;
  
  const expiresAt = new Date(connection.token_expires_at);
  if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return connection.access_token;
  }

  console.log(`Refreshing token for provider: ${connection.provider}`);
  
  let tokenUrl: string;
  let clientId: string | undefined;
  let clientSecret: string | undefined;

  switch (connection.provider) {
    case "google":
      tokenUrl = "https://oauth2.googleapis.com/token";
      clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
      break;
    case "outlook":
      tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
      clientId = Deno.env.get("OUTLOOK_CLIENT_ID");
      clientSecret = Deno.env.get("OUTLOOK_CLIENT_SECRET");
      break;
    case "yahoo":
      tokenUrl = "https://api.login.yahoo.com/oauth2/get_token";
      clientId = Deno.env.get("YAHOO_CLIENT_ID");
      clientSecret = Deno.env.get("YAHOO_CLIENT_SECRET");
      break;
    default:
      return connection.access_token;
  }

  if (!clientId || !clientSecret) return connection.access_token;

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: connection.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("Token refresh failed");
      return null;
    }

    const tokens = await response.json();
    
    // Update stored tokens
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase
      .from("calendar_connections")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || connection.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return tokens.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

// Google Calendar sync
async function syncGoogleCalendar(accessToken: string, event: CalendarEvent, action: "create" | "update" | "delete") {
  const baseUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const googleEvent = {
    summary: event.title,
    start: { dateTime: event.start_time, timeZone: "UTC" },
    end: { dateTime: event.end_time || event.start_time, timeZone: "UTC" },
    location: event.venue_address || event.venue_name || undefined,
    description: event.notes || undefined,
  };

  if (action === "create") {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(googleEvent),
    });
    return response.json();
  } else if (action === "update") {
    const response = await fetch(`${baseUrl}/${event.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(googleEvent),
    });
    return response.json();
  } else if (action === "delete") {
    await fetch(`${baseUrl}/${event.id}`, {
      method: "DELETE",
      headers,
    });
    return { deleted: true };
  }
}

// Outlook Calendar sync
async function syncOutlookCalendar(accessToken: string, event: CalendarEvent, action: "create" | "update" | "delete") {
  const baseUrl = "https://graph.microsoft.com/v1.0/me/calendar/events";
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const outlookEvent = {
    subject: event.title,
    start: { dateTime: event.start_time, timeZone: "UTC" },
    end: { dateTime: event.end_time || event.start_time, timeZone: "UTC" },
    location: { displayName: event.venue_name || event.venue_address || "" },
    body: { contentType: "text", content: event.notes || "" },
  };

  if (action === "create") {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(outlookEvent),
    });
    return response.json();
  } else if (action === "update") {
    const response = await fetch(`${baseUrl}/${event.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(outlookEvent),
    });
    return response.json();
  } else if (action === "delete") {
    await fetch(`${baseUrl}/${event.id}`, {
      method: "DELETE",
      headers,
    });
    return { deleted: true };
  }
}

// Yahoo Calendar sync (via CalDAV)
async function syncYahooCalendar(accessToken: string, event: CalendarEvent, action: "create" | "update" | "delete") {
  // Yahoo uses CalDAV which requires different handling
  console.log("Yahoo calendar sync - CalDAV implementation needed");
  return { provider: "yahoo", status: "not_fully_implemented" };
}

// Apple Calendar sync (via CalDAV)
async function syncAppleCalendar(accessToken: string, event: CalendarEvent, action: "create" | "update" | "delete") {
  // Apple uses CalDAV which requires different handling
  console.log("Apple calendar sync - CalDAV implementation needed");
  return { provider: "apple", status: "not_fully_implemented" };
}

// Fetch events from provider
async function fetchEventsFromProvider(provider: string, accessToken: string, startDate: string, endDate: string) {
  if (provider === "google") {
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("timeMin", startDate);
    url.searchParams.set("timeMax", endDate);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch Google events");
    }
    
    const data = await response.json();
    return (data.items || []).map((item: any) => ({
      externalId: item.id,
      title: item.summary || "Untitled",
      start_time: item.start?.dateTime || item.start?.date,
      end_time: item.end?.dateTime || item.end?.date,
      venue_name: item.location || null,
      notes: item.description || null,
    }));
  }
  
  if (provider === "outlook") {
    const url = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${startDate}&endDateTime=${endDate}`;
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch Outlook events");
    }
    
    const data = await response.json();
    return (data.value || []).map((item: any) => ({
      externalId: item.id,
      title: item.subject || "Untitled",
      start_time: item.start?.dateTime,
      end_time: item.end?.dateTime,
      venue_name: item.location?.displayName || null,
      notes: item.body?.content || null,
    }));
  }
  
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid token");
    }

    const { action, provider, event, startDate, endDate } = await req.json();
    console.log(`Calendar sync action: ${action}, provider: ${provider}`);

    // Get calendar connection
    const { data: connections, error: connError } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .single();

    if (connError || !connections) {
      throw new Error(`No ${provider} calendar connected`);
    }

    const accessToken = await refreshToken(connections);
    if (!accessToken) {
      throw new Error("Failed to get valid access token");
    }

    let result;

    if (action === "sync_event") {
      // Sync a single event to the calendar
      switch (provider) {
        case "google":
          result = await syncGoogleCalendar(accessToken, event, "create");
          break;
        case "outlook":
          result = await syncOutlookCalendar(accessToken, event, "create");
          break;
        case "yahoo":
          result = await syncYahooCalendar(accessToken, event, "create");
          break;
        case "apple":
          result = await syncAppleCalendar(accessToken, event, "create");
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } else if (action === "fetch_events") {
      // Fetch events from the calendar
      result = await fetchEventsFromProvider(provider, accessToken, startDate, endDate);
    } else if (action === "sync_all") {
      // Sync all user events to the calendar
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", startDate || new Date().toISOString());

      const results = [];
      for (const evt of events || []) {
        try {
          let syncResult;
          switch (provider) {
            case "google":
              syncResult = await syncGoogleCalendar(accessToken, evt, "create");
              break;
            case "outlook":
              syncResult = await syncOutlookCalendar(accessToken, evt, "create");
              break;
            default:
              syncResult = { skipped: true, provider };
          }
          results.push({ eventId: evt.id, success: true, result: syncResult });
        } catch (error: any) {
          results.push({ eventId: evt.id, success: false, error: error.message });
        }
      }
      result = { synced: results.length, results };
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Calendar sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
