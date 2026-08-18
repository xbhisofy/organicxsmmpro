// Shared order-placement gate.
// Subscriptions were removed: any authenticated user can place orders as long
// as their wallet has enough balance (wallet credits only come from verified
// provider webhooks, and the debit RPC enforces the balance).

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
