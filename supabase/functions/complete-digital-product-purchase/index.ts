import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      productId, 
      buyerId, 
      buyerEmail, 
      sellerId, 
      amount, 
      currency, 
      paymentProvider, 
      providerPaymentId 
    } = await req.json();

    console.log("[complete-digital-product-purchase] Starting", { productId, buyerEmail, paymentProvider });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get product details
    const { data: product, error: productError } = await supabaseClient
      .from("digital_products")
      .select("title, file_url")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      throw new Error("Product not found");
    }

    // Check if purchase already exists
    const { data: existingPurchase } = await supabaseClient
      .from("digital_product_purchases")
      .select("id, download_token")
      .eq("product_id", productId)
      .eq("provider_payment_id", providerPaymentId)
      .single();

    let downloadToken: string;
    let purchaseId: string;

    if (existingPurchase) {
      // Update existing purchase to completed
      downloadToken = existingPurchase.download_token;
      purchaseId = existingPurchase.id;
      
      await supabaseClient
        .from("digital_product_purchases")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", existingPurchase.id);
    } else {
      // Create new purchase record
      const { data: newPurchase, error: insertError } = await supabaseClient
        .from("digital_product_purchases")
        .insert({
          product_id: productId,
          buyer_id: buyerId || null,
          buyer_email: buyerEmail,
          seller_id: sellerId,
          amount,
          currency,
          payment_provider: paymentProvider,
          provider_payment_id: providerPaymentId,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .select("id, download_token")
        .single();

      if (insertError) {
        throw new Error(`Failed to create purchase record: ${insertError.message}`);
      }

      downloadToken = newPurchase.download_token;
      purchaseId = newPurchase.id;
    }

    // Generate download URL
    const baseUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") 
      || "https://worldmusicmethod.lovable.app";
    const downloadUrl = `${baseUrl}/download/${downloadToken}`;

    // Send email with download link
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 24px;">Thank you for your purchase!</h1>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            You have successfully purchased <strong>${product.title}</strong>.
          </p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #333; font-size: 18px;">Download Your Product</h2>
            <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
              Click the button below to download your file. This link expires in 7 days and allows up to 5 downloads.
            </p>
            <a href="${downloadUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Download Now
            </a>
          </div>
          
          <p style="color: #999; font-size: 12px;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${downloadUrl}" style="color: #6366f1;">${downloadUrl}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          
          <p style="color: #999; font-size: 12px;">
            Order Reference: ${purchaseId}<br/>
            Amount Paid: ${currency} ${amount}
          </p>
        </div>
      `;

      await supabaseClient.functions.invoke("send-email-ses", {
        body: {
          to: buyerEmail,
          subject: `Your download is ready: ${product.title}`,
          html: emailHtml,
          text: `Thank you for purchasing ${product.title}. Download your file here: ${downloadUrl} (expires in 7 days, max 5 downloads)`,
        },
      });

      console.log("[complete-digital-product-purchase] Email sent to:", buyerEmail);
    } catch (emailError) {
      // Log but don't fail - purchase is complete
      console.error("[complete-digital-product-purchase] Failed to send email:", emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        purchaseId, 
        downloadToken,
        downloadUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[complete-digital-product-purchase] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
