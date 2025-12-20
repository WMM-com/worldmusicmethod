import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_SECRET");
  
  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error("Failed to get PayPal access token");
  }
  
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, password } = await req.json();
    
    console.log("[CAPTURE-PAYPAL-ORDER] Starting", { orderId });

    const accessToken = await getPayPalAccessToken();

    // Capture the order
    const captureResponse = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await captureResponse.json();

    if (!captureResponse.ok) {
      console.error("[CAPTURE-PAYPAL-ORDER] Capture error:", captureData);
      throw new Error(captureData.message || "Failed to capture PayPal order");
    }

    console.log("[CAPTURE-PAYPAL-ORDER] Order captured", { status: captureData.status });

    // Parse custom data from the order
    const purchaseUnit = captureData.purchase_units?.[0];
    const customData = JSON.parse(purchaseUnit?.payments?.captures?.[0]?.custom_id || purchaseUnit?.custom_id || "{}");
    
    const { email, full_name, product_id, product_type, course_id } = customData;

    console.log("[CAPTURE-PAYPAL-ORDER] Custom data", customData);

    // Create user account and enrollment
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user exists
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
    const user = existingUser?.users?.find(u => u.email === email);

    let userId: string;

    if (user) {
      userId = user.id;
      console.log("[CAPTURE-PAYPAL-ORDER] Existing user found", { userId });
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser.user.id;
      console.log("[CAPTURE-PAYPAL-ORDER] New user created", { userId });
    }

    // Create course enrollment if it's a course product
    if (product_type === "course" && course_id) {
      const { error: enrollError } = await supabaseClient
        .from("course_enrollments")
        .upsert({
          user_id: userId,
          course_id,
          enrollment_type: "purchase",
          is_active: true,
        }, {
          onConflict: "user_id,course_id",
        });

      if (enrollError) {
        console.error("[CAPTURE-PAYPAL-ORDER] Enrollment error:", enrollError);
      } else {
        console.log("[CAPTURE-PAYPAL-ORDER] Course enrollment created");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        captureId: captureData.id,
        status: captureData.status,
        userId,
        courseId: course_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CAPTURE-PAYPAL-ORDER] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
