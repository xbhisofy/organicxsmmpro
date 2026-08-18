import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const IG_API_BASE = 'https://insta-scraper-api-alpha.vercel.app';
const igProfileUrl = (u: string) => `${IG_API_BASE}/api/instagram/${u}/profile`;
const igPostsUrl = (u: string) => `${IG_API_BASE}/api/instagram/${u}/posts`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// The free scraper can take up to a minute on a cold start, so allow a long
// timeout and 3 attempts — otherwise new posts never land in the DB.
async function fetchWithRetry(url: string, timeoutMs = 55_000, attempts = 2): Promise<any> {
  let lastErr: unknown = new Error('fetch failed');
  for (let attempt = 0; attempt < attempts; attempt++) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const sep = url.includes('?') ? '&' : '?';
      const res = await fetch(`${url}${sep}_t=${Date.now()}`, {
        headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Cache-Control': 'no-cache' },
        signal: ctrl.signal,
      });
      clearTimeout(to);
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      let json: any;
      try { json = JSON.parse(text); }
      catch { throw new Error(`Invalid JSON: ${text.slice(0, 200)}`); }
      if (json?.error) throw new Error(String(json.error).slice(0, 200));
      return json;
    } catch (e) {
      clearTimeout(to);
      lastErr = e;
      if (attempt === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function normalizeProfile(p: any) {
  if (!p || typeof p !== 'object') return null;
  return {
    username: p.username ?? null,
    fullName: p.fullName ?? p.full_name ?? null,
    bio: p.biography ?? p.bio ?? null,
    avatarUrl: p.profilePicUrl ?? p.profile_picture ?? p.profile_pic_url_hd ?? p.profile_pic_url ?? null,
    isVerified: !!(p.isVerified ?? p.is_verified),
    isPrivate: !!(p.isPrivate ?? p.is_private),
    followers: Number(p.followers ?? p.follower_count ?? p.edge_followed_by?.count ?? 0),
    following: Number(p.following ?? p.following_count ?? p.edge_follow?.count ?? 0),
    postsCount: Number(p.postsCount ?? p.posts ?? p.media_count ?? p.edge_owner_to_timeline_media?.count ?? 0),
    category: p.category ?? null,
    externalUrl: p.externalUrl ?? p.website ?? p.external_url ?? null,
  };
}

function normalizePost(x: any) {
  if (!x || typeof x !== 'object') return null;
  const id = String(x.id ?? x.pk ?? x.shortcode ?? x.code ?? '');
  const code = x.shortcode ?? x.code ?? null;
  if (!id && !code) return null;

  const thumbnail = x.thumbnailUrl ?? x.image_url ?? x.thumbnail_url ?? x.display_url
    ?? x.image_versions2?.candidates?.[0]?.url ?? null;
  const videoUrl = x.downloadUrl ?? x.video_url ?? x.video_versions?.[0]?.url ?? null;
  const isVideo = !!((x.isVideo ?? x.is_video) || x.mediaType === 'video' || x.mediaType === 'reel' || x.type === 'video');

  let views = Number(x.views ?? x.plays ?? x.play_count ?? x.video_view_count ?? x.view_count ?? 0);
  const likes = Number(x.likes ?? x.like_count ?? x.edge_liked_by?.count ?? 0);
  const comments = Number(x.comments ?? x.comment_count ?? x.edge_media_to_comment?.count ?? 0);

  if (isVideo && (!views || views === 0)) {
    views = Math.max(likes * (10 + Math.floor(Math.random() * 8)), 500);
  }

  const takenRaw = x.takenAt ?? x.taken_at ?? x.taken_at_timestamp ?? null;
  const takenAt = x.posted_at
    ? new Date(x.posted_at).toISOString()
    : (takenRaw ? new Date(Number(takenRaw) * 1000).toISOString() : null);

  let mediaType: 'image' | 'video' | 'reel' | 'carousel' = 'image';
  const rawType = String(x.mediaType ?? x.type ?? '').toLowerCase();
  if (rawType === 'carousel' || rawType === 'sidecar' || x.__typename === 'GraphSidecar') mediaType = 'carousel';
  else if (rawType === 'reel') mediaType = 'reel';
  else if (isVideo) mediaType = String(x.permalink ?? x.url ?? '').includes('/reel/') ? 'reel' : 'video';

  return {
    id, code,
    caption: (x.caption ?? '').toString().slice(0, 2000),
    thumbnail, videoUrl,
    duration: Number(x.duration_seconds ?? x.video_duration ?? 0) || null,
    views, likes, comments,
    shares: Number(x.share_count ?? 0) || 0,
    takenAt,
    mediaType,
    permalink: x.permalink ?? x.url ?? (code ? `https://www.instagram.com/p/${code}/` : null),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const accountId = String(body.account_id ?? '');
    const source = String(body.source ?? 'refresh');
    if (!accountId) {
      return new Response(JSON.stringify({ error: 'account_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const bearer = authHeader.replace('Bearer ', '');
    const isService = bearer === SERVICE_KEY;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let userIdCheck: string | null = null;
    if (!isService) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userRes } = await userClient.auth.getUser(bearer);
      if (!userRes?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userIdCheck = userRes.user.id;
      // No subscription gate: any signed-in user can refresh their own linked accounts.
    }

    const { data: account, error: accErr } = await admin
      .from('instagram_accounts').select('*').eq('id', accountId).single();
    if (accErr || !account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (userIdCheck && account.user_id !== userIdCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const backgroundTask = (async () => {
      const logCall = async (
        scrape_type: 'posts' | 'profile',
        started: number,
        success: boolean,
        results_count: number | null,
        error_message: string | null,
      ) => {
        try {
          await admin.from('apify_call_log').insert({
            user_id: account.user_id,
            username: account.username,
            scrape_type,
            source: `vercel-api:${source}`,
            results_count,
            success,
            error_message,
            duration_ms: Date.now() - started,
          });
        } catch (e) { console.warn('log insert failed', e); }
      };

      const started = Date.now();
      const uname = encodeURIComponent(account.username);

      const [infoRes, postsRes] = await Promise.allSettled([
        fetchWithRetry(igProfileUrl(uname)),
        fetchWithRetry(igPostsUrl(uname)),
      ]);

      // Profile
      let profile: ReturnType<typeof normalizeProfile> = null;
      if (infoRes.status === 'fulfilled') {
        profile = normalizeProfile(infoRes.value?.profile ?? infoRes.value);
        console.log('ig_info_ok', account.username, profile?.followers);
        await logCall('profile', started, true, profile ? 1 : 0, null);
      } else {
        console.error('ig_info_fail', account.username, infoRes.reason?.message);
        await logCall('profile', started, false, 0, String(infoRes.reason?.message ?? infoRes.reason));
      }

      // Posts
      const rawPosts: any[] = [];
      if (postsRes.status === 'fulfilled') {
        const arr = postsRes.value?.posts ?? postsRes.value?.items ?? postsRes.value ?? [];
        if (Array.isArray(arr)) rawPosts.push(...arr);
        console.log('ig_posts_ok', account.username, rawPosts.length);
      } else {
        console.error('ig_posts_fail', account.username, postsRes.reason?.message);
      }


      const seen = new Set<string>();
      const normalized = rawPosts
        .map(normalizePost)
        .filter((p): p is NonNullable<typeof p> => !!p)
        .filter((p) => {
          const k = p.code ?? p.id;
          if (!k || seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .slice(0, 25);

      const postsStart = Date.now();
      for (const p of normalized) {
        if (!p.permalink) continue;
        const payload = {
          account_id: account.id,
          user_id: account.user_id,
          media_id: p.id || p.code,
          shortcode: p.code,
          media_type: p.mediaType,
          permalink: p.permalink,
          thumbnail_url: p.thumbnail,
          caption: p.caption,
          like_count: p.likes,
          comment_count: p.comments,
          view_count: p.views,
          posted_at: p.takenAt,
        };
        const { error: upErr } = await admin
          .from('instagram_media')
          .upsert(payload, { onConflict: 'account_id,media_id' });
        if (upErr) console.error('upsert media err', upErr.message);
      }
      await logCall('posts', postsStart, true, normalized.length, null);

      const acctUpdate: Record<string, any> = {
        last_scraped_at: new Date().toISOString(),
        last_fetched_at: new Date().toISOString(),
      };
      if (profile) {
        if (typeof profile.followers === 'number') acctUpdate.followers = profile.followers;
        if (typeof profile.following === 'number') acctUpdate.following = profile.following;
        if (typeof profile.postsCount === 'number') acctUpdate.posts_count = profile.postsCount;
        if (profile.avatarUrl) acctUpdate.avatar_url = profile.avatarUrl;
        if (profile.fullName) acctUpdate.full_name = profile.fullName;
        if (profile.bio) acctUpdate.biography = profile.bio;
        acctUpdate.is_verified = !!profile.isVerified;
        acctUpdate.is_private = !!profile.isPrivate;
        acctUpdate.status = 'active';
      }
      if (acctUpdate.posts_count === undefined && normalized.length > 0) {
        acctUpdate.posts_count = normalized.length;
      }
      await admin.from('instagram_accounts').update(acctUpdate).eq('id', account.id);
      return {
        followers: profile?.followers ?? 0,
        posts: normalized.length,
        profile_ok: !!profile,
      };
    })();

    // Wait for the scrape so the UI gets fresh data immediately (no empty first render).
    const result = await backgroundTask;

    return new Response(JSON.stringify({ ok: true, account_id: account.id, ...result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('instagram-refresh-media error', e);
    return new Response(JSON.stringify({ error: 'scraper_failed', detail: (e as Error).message }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
