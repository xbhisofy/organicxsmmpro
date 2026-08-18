// Polls Instagram accounts that have Auto Boost ON and places engagement orders on brand-new posts.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

async function runPoll(runId: string) {
  {
    console.log(`[poll ${runId}] start`);
  try {

    // 1) Only accounts with Auto Boost explicitly ON
    const { data: accounts, error: accErr } = await admin
      .from("instagram_accounts")
      .select("id,user_id,username,auto_boost_enabled")
      .eq("status", "active")
      .eq("auto_boost_enabled", true);
    if (accErr) throw accErr;
    if (!accounts?.length) {
      console.log(`[poll ${runId}] no accounts with auto_boost_enabled=true`);
      return;
    }

    const userIds = [...new Set(accounts.map((a) => a.user_id))];
    const { data: presets } = await admin.from("engagement_presets").select("*").in("user_id", userIds);
    const presetMap = new Map<string, any>();
    (presets ?? []).forEach((p: any) => presetMap.set(p.user_id, p));

    let ordersPlaced = 0;
    const details: any[] = [];

    for (const acc of accounts) {
      const preset = presetMap.get(acc.user_id);
      const q = {
        views: preset?.views ?? 0,
        likes: preset?.likes ?? 0,
        comments: preset?.comments ?? 0,
        saves: preset?.saves ?? 0,
        shares: preset?.shares ?? 0,
        reposts: preset?.reposts ?? 0,
        drip_minutes: preset?.drip_minutes ?? 0,
        drip_percent_per_run: preset?.drip_percent_per_run ?? 0,
      };
      const totalQ = q.views + q.likes + q.comments + q.saves + q.shares + q.reposts;
      if (totalQ <= 0) {
        details.push({ account: acc.username, skipped: "no_preset_quantities" });
        continue;
      }

      // 2) Snapshot known media BEFORE refresh so we can diff reliably
      const { data: before } = await admin
        .from("instagram_media")
        .select("media_id")
        .eq("account_id", acc.id);
      const known = new Set((before ?? []).map((m: any) => String(m.media_id)));
      const firstEverScrape = known.size === 0;

      // 3) Refresh media (synchronous — we need fresh rows to compare)
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/instagram-refresh-media`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          body: JSON.stringify({ account_id: acc.id, source: "poll" }),
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
          console.log(`[poll ${runId}] auto-order placed @${acc.username} ${np.shortcode}`);
        } else {
          console.error(`[poll ${runId}] auto-order failed @${acc.username}`, r);
          details.push({ account: acc.username, failed: np.shortcode, error: (r as any).error ?? "unknown" });
        }
      }
    }

    console.log(`[poll ${runId}] done: ${accounts.length} accounts, ${ordersPlaced} auto-orders`, JSON.stringify(details));
    return;
  } catch (e) {
    console.error(`[poll ${runId}] error`, e);
  }
  }
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const runId = crypto.randomUUID().slice(0, 8);
  // Scraper calls can take a minute; run in background so cron never times out.
  const task = runPoll(runId);
  try { (globalThis as any).EdgeRuntime?.waitUntil?.(task); } catch { /* ignore */ }
  return new Response(JSON.stringify({ ok: true, accepted: true, run_id: runId }), {
    status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

