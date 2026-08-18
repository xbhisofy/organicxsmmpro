// Checks Instagram accounts for brand-new posts and places engagement orders.
// Runs only on demand — user "Check" button (per account) or an explicit call.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// A post is considered "new" only if it was posted within this window.
const NEW_POST_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6h

async function placeOrder(user_id: string, link: string, p: Record<string, number>, campaign_name?: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/instagram-place-engagement`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    body: JSON.stringify({ user_id, link, ...p, source: "poll-auto", campaign_name }),
  });
  const j = await res.json().catch(() => ({}));
  return { ok: res.ok, ...j };
}

async function runPoll(runId: string, accountIds: string[] | null) {
  console.log(`[poll ${runId}] start`, accountIds ?? "all-auto");
  const details: any[] = [];
  let ordersPlaced = 0;

  let query = admin
    .from("instagram_accounts")
    .select("id,user_id,username,auto_boost_enabled")
    .eq("status", "active");
  // Manual check: only the requested account(s), regardless of the Auto toggle.
  if (accountIds?.length) query = query.in("id", accountIds);
  else query = query.eq("auto_boost_enabled", true);

  const { data: accounts, error: accErr } = await query;
  if (accErr) throw accErr;
  if (!accounts?.length) return { ordersPlaced: 0, details: [{ skipped: "no_accounts" }] };

  const userIds = [...new Set(accounts.map((a) => a.user_id))];
  const { data: presets } = await admin.from("engagement_presets").select("*").in("user_id", userIds);
  const presetMap = new Map<string, any>();
  (presets ?? []).forEach((p: any) => presetMap.set(p.user_id, p));

  for (const acc of accounts) {
    const preset = presetMap.get(acc.user_id);
    const q = {
      views: preset?.views ?? 0,
      likes: preset?.likes ?? 0,
      comments: preset?.comments ?? 0,
      saves: preset?.saves ?? 0,
      shares: preset?.shares ?? 0,
      reposts: preset?.reposts ?? 0,
      delivery_hours: preset?.delivery_hours ?? 0,
    };
    const totalQ = q.views + q.likes + q.comments + q.saves + q.shares + q.reposts;
    if (totalQ <= 0) {
      details.push({ account: acc.username, skipped: "no_preset_quantities" });
      continue;
    }

    // Snapshot known media BEFORE refresh so we can diff reliably
    const { data: before } = await admin
      .from("instagram_media")
      .select("media_id")
      .eq("account_id", acc.id);
    const known = new Set((before ?? []).map((m: any) => String(m.media_id)));
    const firstEverScrape = known.size === 0;

    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/instagram-refresh-media`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
        body: JSON.stringify({ account_id: acc.id, source: accountIds ? "manual-check" : "poll" }),
      });
      if (!r.ok) console.error(`[poll ${runId}] refresh HTTP ${r.status} for ${acc.username}`);
    } catch (e) {
      console.error(`[poll ${runId}] refresh failed for ${acc.username}`, e);
    }

    const { data: after } = await admin
      .from("instagram_media")
      .select("media_id,shortcode,permalink,posted_at,engagement_applied")
      .eq("account_id", acc.id)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(15);

    await admin.from("instagram_poll_state").upsert({
      account_id: acc.id,
      last_seen_media_id: after?.[0]?.media_id ?? null,
      last_polled_at: new Date().toISOString(),
    });

    if (firstEverScrape) {
      details.push({ account: acc.username, skipped: "first_scrape_baseline", posts: after?.length ?? 0 });
      continue;
    }

    const now = Date.now();
    const newPosts = (after ?? []).filter((m: any) => {
      if (known.has(String(m.media_id))) return false;
      if (m.engagement_applied) return false;
      if (!m.permalink) return false;
      if (m.posted_at && now - new Date(m.posted_at).getTime() > NEW_POST_MAX_AGE_MS) return false;
      return true;
    });

    if (!newPosts.length) {
      details.push({ account: acc.username, skipped: "no_new_posts" });
      continue;
    }

    for (const np of newPosts.slice(0, 3)) {
      const r = await placeOrder(acc.user_id, np.permalink, q, `Auto Boost — @${acc.username}`);
      if (r.ok) {
        ordersPlaced++;
        await admin
          .from("instagram_media")
          .update({ engagement_applied: true })
          .eq("account_id", acc.id)
          .eq("media_id", np.media_id);
        details.push({ account: acc.username, ordered: np.shortcode });
      } else {
        console.error(`[poll ${runId}] auto-order failed @${acc.username}`, r);
        details.push({ account: acc.username, failed: np.shortcode, error: (r as any).error ?? "unknown" });
      }
    }
  }

  console.log(`[poll ${runId}] done: ${accounts.length} accounts, ${ordersPlaced} orders`, JSON.stringify(details));
  return { ordersPlaced, details, accounts: accounts.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const runId = crypto.randomUUID().slice(0, 8);
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => ({} as any));
    const accountId = body?.account_id ? String(body.account_id) : null;

    if (accountId) {
      // Manual "Check" from the app — authenticate the user and scope to their account.
      const authHeader = req.headers.get("Authorization") ?? "";
      const bearer = authHeader.replace("Bearer ", "");
      if (bearer !== SERVICE_KEY) {
        const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
        const { data: userRes } = await userClient.auth.getUser(bearer);
        if (!userRes?.user) return json({ error: "Unauthorized" }, 401);
        const { data: acc } = await admin
          .from("instagram_accounts").select("id,user_id").eq("id", accountId).maybeSingle();
        if (!acc) return json({ error: "Account not found" }, 404);
        if (acc.user_id !== userRes.user.id) return json({ error: "Forbidden" }, 403);
      }
      const result = await runPoll(runId, [accountId]);
      return json({ ok: true, run_id: runId, ...result });
    }

    // No account_id: check all Auto-enabled accounts in the background.
    const task = runPoll(runId, null);
    try { (globalThis as any).EdgeRuntime?.waitUntil?.(task); } catch { /* ignore */ }
    return json({ ok: true, accepted: true, run_id: runId }, 202);
  } catch (e) {
    console.error(`[poll ${runId}] error`, e);
    return json({ error: (e as Error).message }, 500);
  }
});
