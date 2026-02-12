import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ValidateCouponRequest = {
  couponCode: string;
  productIds?: string[];
};

function normalizeCode(code: string) {
  return code.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { couponCode, productIds = [] } = (await req.json()) as ValidateCouponRequest;
    const normalized = normalizeCode(couponCode || "");

    if (!normalized) {
      return new Response(JSON.stringify({ success: false, error: "Missing couponCode" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: coupon, error: couponError } = await supabaseClient
      .from("coupons")
      .select("*")
      .ilike("code", normalized)
      .eq("is_active", true)
      .maybeSingle();

    if (couponError) {
      console.error("[VALIDATE-COUPON] Coupon query error", couponError);
      return new Response(JSON.stringify({ success: false, error: "Failed to validate coupon" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!coupon) {
      return new Response(JSON.stringify({ success: false, error: "Invalid coupon code" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Date validity
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return new Response(JSON.stringify({ success: false, error: "This coupon is not yet active" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return new Response(JSON.stringify({ success: false, error: "This coupon has expired" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Max redemptions
    const timesRedeemed = coupon.times_redeemed ?? 0;
    if (coupon.max_redemptions && timesRedeemed >= coupon.max_redemptions) {
      return new Response(JSON.stringify({ success: false, error: "This coupon has reached its maximum usage" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Product scoping (optional)
    if (coupon.applies_to_products && coupon.applies_to_products.length > 0) {
      if (productIds.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "This coupon does not apply to the selected products" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hasApplicableProduct = productIds.some((pid) => coupon.applies_to_products?.includes(pid));
      if (!hasApplicableProduct) {
        return new Response(JSON.stringify({ success: false, error: "This coupon does not apply to the selected products" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Product type applicability (optional)
    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabaseClient
        .from("products")
        .select("id, product_type")
        .in("id", productIds);

      if (productsError) {
        console.error("[VALIDATE-COUPON] Products query error", productsError);
        return new Response(JSON.stringify({ success: false, error: "Failed to validate coupon" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isSubLike = (t?: string | null) => t === "subscription" || t === "membership";
      const hasSubscription = (products ?? []).some((p) => isSubLike(p.product_type));
      const hasOneTime = (products ?? []).some((p) => !isSubLike(p.product_type));

      if (hasOneTime && coupon.applies_to_one_time === false) {
        return new Response(JSON.stringify({ success: false, error: "This coupon only applies to subscriptions" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (hasSubscription && coupon.applies_to_subscriptions === false) {
        return new Response(JSON.stringify({ success: false, error: "This coupon only applies to one-time purchases" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        coupon: {
          code: coupon.code,
          discountType: coupon.discount_type,
          percentOff: coupon.percent_off,
          amountOff: coupon.amount_off,
          currency: coupon.currency,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[VALIDATE-COUPON] Error", message);
    return new Response(JSON.stringify({ success: false, error: "Failed to validate coupon" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
