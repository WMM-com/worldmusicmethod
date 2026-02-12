/**
 * Get the Stripe secret key, preferring STRIPE_LIVE_SECRET_KEY over the
 * connector-managed STRIPE_SECRET_KEY.
 */
export function getStripeSecretKey(): string {
  return Deno.env.get("STRIPE_LIVE_SECRET_KEY") || Deno.env.get("STRIPE_SECRET_KEY") || "";
}
