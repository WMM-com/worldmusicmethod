/**
 * Agora Debugging Utilities
 * 
 * Use these utilities to diagnose "invalid vendor key" and other connection issues.
 */

import { supabase } from "@/integrations/supabase/client";

interface DebugResult {
  success: boolean;
  step: string;
  details: Record<string, unknown>;
  error?: string;
}

/**
 * Comprehensive Agora setup diagnostic
 * Run this in the browser console: window.debugAgora("test-channel")
 */
export async function runAgoraDiagnostics(channelName: string = "test-room"): Promise<DebugResult[]> {
  const results: DebugResult[] = [];
  
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║           AGORA INTEGRATION DIAGNOSTIC                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  // Step 1: Check authentication
  console.log("Step 1: Checking authentication...");
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    results.push({
      success: false,
      step: "Authentication",
      details: {},
      error: "No active session. You must be logged in to generate tokens."
    });
    console.error("❌ Not authenticated. Please log in first.");
    return results;
  }
  
  results.push({
    success: true,
    step: "Authentication",
    details: {
      userId: session.user.id,
      email: session.user.email,
      tokenExpiry: session.expires_at
    }
  });
  console.log("✓ Authenticated as:", session.user.email);
  
  // Step 2: Test token generation
  console.log("\nStep 2: Testing token generation...");
  try {
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke("generate-agora-token", {
      body: {
        channelName,
        uid: 0,
        role: "publisher"
      }
    });
    const duration = Date.now() - startTime;
    
    if (error) {
      results.push({
        success: false,
        step: "Token Generation",
        details: { duration: `${duration}ms` },
        error: error.message
      });
      console.error("❌ Token generation failed:", error.message);
      return results;
    }
    
    if (data.error) {
      results.push({
        success: false,
        step: "Token Generation",
        details: { duration: `${duration}ms`, response: data },
        error: data.error
      });
      console.error("❌ Token API returned error:", data.error);
      
      // Specific troubleshooting hints
      if (data.error.includes("Invalid Agora App ID")) {
        console.error("\n🔧 TROUBLESHOOTING: Invalid App ID");
        console.error("   1. Go to Agora Console: https://console.agora.io/");
        console.error("   2. Select your project");
        console.error("   3. Copy the App ID exactly (32 hex characters)");
        console.error("   4. Update AGORA_APP_ID in Supabase secrets");
      }
      
      if (data.error.includes("Missing Agora App Certificate")) {
        console.error("\n🔧 TROUBLESHOOTING: Missing App Certificate");
        console.error("   1. Go to Agora Console > Project Management");
        console.error("   2. Click your project > Features > App Certificate");
        console.error("   3. Enable Primary Certificate");
        console.error("   4. Copy and add AGORA_APP_CERTIFICATE to Supabase secrets");
      }
      
      return results;
    }
    
    results.push({
      success: true,
      step: "Token Generation",
      details: {
        duration: `${duration}ms`,
        appId: data.appId ? `${data.appId.slice(0, 8)}...${data.appId.slice(-4)}` : "N/A",
        channel: data.channel,
        uid: data.uid,
        expiresIn: `${data.expiresIn}s`,
        tokenPreview: data.token ? `${data.token.slice(0, 30)}...` : "N/A"
      }
    });
    
    console.log("✓ Token generated successfully");
    console.log("  App ID:", data.appId ? `${data.appId.slice(0, 8)}...` : "N/A");
    console.log("  Channel:", data.channel);
    console.log("  UID:", data.uid);
    console.log("  Expires in:", data.expiresIn, "seconds");
    
    // Step 3: Validate App ID format
    console.log("\nStep 3: Validating App ID format...");
    if (data.appId) {
      const isValidFormat = /^[a-f0-9]{32}$/i.test(data.appId);
      if (isValidFormat) {
        results.push({
          success: true,
          step: "App ID Validation",
          details: { format: "32-character hex string", valid: true }
        });
        console.log("✓ App ID format is valid");
      } else {
        results.push({
          success: false,
          step: "App ID Validation",
          details: { length: data.appId.length },
          error: "App ID format is invalid"
        });
        console.error("❌ App ID format is invalid");
        console.error("   Expected: 32 hex characters");
        console.error("   Got:", data.appId.length, "characters");
      }
    }
    
    // Step 4: Test token validation (optional - requires Agora token tester)
    console.log("\nStep 4: Token validation...");
    console.log("  To validate the token, use Agora's token tester:");
    console.log("  https://webdemo.agora.io/basicVideoCall/index.html");
    console.log("  Enter the following:");
    console.log("    App ID:", data.appId);
    console.log("    Channel:", data.channel);
    console.log("    Token:", data.token);
    console.log("    UID:", data.uid, "(use 0 or leave empty)");
    
    results.push({
      success: true,
      step: "Token Validation Info",
      details: {
        testerUrl: "https://webdemo.agora.io/basicVideoCall/index.html",
        appId: data.appId,
        channel: data.channel,
        token: data.token,
        uid: data.uid
      }
    });
    
  } catch (err) {
    results.push({
      success: false,
      step: "Token Generation",
      details: {},
      error: err instanceof Error ? err.message : "Unknown error"
    });
    console.error("❌ Exception during token generation:", err);
  }
  
  // Summary
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                      DIAGNOSTIC SUMMARY                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Results: ${passed} passed, ${failed} failed\n`);
  
  results.forEach(r => {
    const icon = r.success ? "✓" : "❌";
    console.log(`${icon} ${r.step}`);
    if (r.error) console.log(`   Error: ${r.error}`);
  });
  
  if (failed === 0) {
    console.log("\n✅ All diagnostics passed! If you're still seeing errors:");
    console.log("   1. Check browser console for Agora SDK errors");
    console.log("   2. Ensure the channel name matches exactly (case-sensitive)");
    console.log("   3. Verify the Agora project is active in the console");
  }
  
  return results;
}

/**
 * Quick test to fetch a token and display results
 */
export async function testTokenGeneration(channelName: string = "test-channel"): Promise<void> {
  console.log("Testing token generation for channel:", channelName);
  
  try {
    const { data, error } = await supabase.functions.invoke("generate-agora-token", {
      body: { channelName, uid: 0, role: "publisher" }
    });
    
    if (error) {
      console.error("Function error:", error);
      return;
    }
    
    console.log("Response:", data);
    
    if (data.token) {
      console.log("\n📋 Copy these values to test in Agora Web Demo:");
      console.log("App ID:", data.appId);
      console.log("Channel:", data.channel);
      console.log("Token:", data.token);
      console.log("UID:", data.uid);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

// Expose to window for console debugging
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).debugAgora = runAgoraDiagnostics;
  (window as unknown as Record<string, unknown>).testAgoraToken = testTokenGeneration;
}
