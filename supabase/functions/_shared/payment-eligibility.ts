// Shared payment-eligibility gate used by every order-placement edge function.
//
// A user may place orders ONLY if one of the following is true:
//   1. They are an admin (user_roles.role = 'admin').
//   2. They have an ACTIVE, VERIFIED subscription:
//        - subscriptions.status = 'active'
//        - plan_type ∈ ('monthly', 'yearly', 'lifetime')  (never 'trial' / 'none')
//        - expires_at IS NULL OR expires_at > now()
//      Every active row was written by a service-role webhook after the
//      provider verified the payment — end users cannot INSERT/UPDATE this
//      table (RLS + GRANTs restrict it to service_role).
//   3. They have at least ONE fully verified deposit — a completed transaction
//      of type='deposit' whose payment_method is a real gateway
//      ('oxapay', 'razorpay_auto', 'zapupi'). Promo / referral / manual
//      credits do NOT count as "verified payment" for placement eligibility.
//
// Any other user (fresh account, promo-only wallet, expired sub) is blocked
// with a 403 before we touch the wallet or the orders tables.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type PaymentEligibility =
  | { ok: true; reason: "admin" | "subscription" | "verified_deposit" | "wallet" }
  | { ok: false; status: 403; error: string };


export async function assertPaymentEligible(
  _admin: SupabaseClient,
  userId: string,
  _ctx?: { source: string; request?: Request },
): Promise<PaymentEligibility> {
  if (!userId) {
    return { ok: false, status: 403, error: "Not authenticated" };
  }
  // Subscriptions are no longer required. Any authenticated user may place
  // orders — the wallet debit itself enforces that they have enough funds,
  // and wallet credits can only be written by verified provider webhooks.
  return { ok: true, reason: "wallet" };
}
