import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Plus, Trash2, CheckCircle2, ShieldAlert, Lock, Zap, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { igQueryKeys } from '@/lib/instagramCache';
import { igImageUrl } from '@/lib/igImage';

export function InstagramAccountsPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [username, setUsername] = useState('');
  const [pending, setPending] = useState<string[]>([]);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: igQueryKeys.accounts(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_accounts').select('*')
        .eq('user_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    placeholderData: (prev) => prev,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    // Jab tak followers/posts na aa jaaye tez poll, uske baad halka refresh.
    refetchInterval: (query) => {
      const data = (query.state.data as any[] | undefined) ?? [];
      const incomplete = data.some((a) => !a.last_fetched_at || (!a.followers && !a.posts_count));
      return incomplete ? 3000 : 20000;
    },
    refetchIntervalInBackground: false,
  });

  // Trigger a one-time refresh for accounts whose data is empty.
  const kicked = useRef<Set<string>>(new Set());
  useEffect(() => {
    accounts.forEach((a: any) => {
      if (a.followers || a.posts_count) return;
      if (kicked.current.has(a.id)) return;
      kicked.current.add(a.id);
      supabase.functions
        .invoke('instagram-refresh-media', { body: { account_id: a.id, source: 'auto-heal' } })
        .then(() => {
          qc.invalidateQueries({ queryKey: igQueryKeys.accounts() });
          qc.invalidateQueries({ queryKey: igQueryKeys.postsSummary() });
        })
        .catch(() => {});
    });
  }, [accounts, qc]);

  // Persistent 30-day link usage from audit log (survives account deletion).
  const { data: linkEvents = [] } = useQuery({
    queryKey: igQueryKeys.linkEvents(user?.id),
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('instagram_link_events')
        .select('username, created_at')
        .eq('user_id', user!.id)
        .eq('event_type', 'link')
        .gte('created_at', since)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    placeholderData: (prev) => prev,
  });

  const linkMut = useMutation({
    mutationFn: async (u: string) => {
      const { data, error } = await supabase.functions.invoke('instagram-link-account', { body: { username: u } });
      if (error) {
        let msg = error.message;
        try {
          const ctx: any = (error as any).context;
          if (ctx?.json) { const j = await ctx.json(); if (j?.error) msg = j.error; }
          else if (ctx?.text) { const t = await ctx.text(); const j = JSON.parse(t); if (j?.error) msg = j.error; }
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async (d) => {
      const uname = String(d.account.username).toLowerCase();
      toast.success(`Linked @${uname} — profile & posts load ho rahe hain...`);
      setUsername('');
      setPending((p) => (p.includes(uname) ? p : [...p, uname]));
      qc.invalidateQueries({ queryKey: igQueryKeys.accounts() });
      qc.invalidateQueries({ queryKey: igQueryKeys.linkEvents() });
      qc.invalidateQueries({ queryKey: igQueryKeys.postsSummary() });

      const refresh = async () => {
        try {
          await supabase.functions.invoke('instagram-refresh-media', {
            body: { account_id: d.account.id, source: 'link' },
          });
        } catch { /* retry below */ }
        qc.invalidateQueries({ queryKey: igQueryKeys.accounts() });
        qc.invalidateQueries({ queryKey: igQueryKeys.postsSummary() });
      };

      await refresh();
      // Retry once if the scraper is rate-limited, so data reliably arrives.
      setTimeout(async () => {
        const fresh = qc.getQueryData<any[]>(igQueryKeys.accounts(user?.id)) ?? [];
        const acc = fresh.find((a) => a.id === d.account.id);
        if (!acc || (!acc.followers && !acc.posts_count)) await refresh();
        setPending((p) => p.filter((x) => x !== uname));
      }, 8000);
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const toggleAutoMut = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('instagram_accounts')
        .update({ auto_boost_enabled: enabled })
        .eq('id', id);
      if (error) throw error;
      return enabled;
    },
    onMutate: async ({ id, enabled }) => {
      const key = igQueryKeys.accounts(user?.id);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<any[]>(key);
      qc.setQueryData<any[]>(key, (old) =>
        (old ?? []).map((a) => (a.id === id ? { ...a, auto_boost_enabled: enabled } : a))
      );
      return { prev, key };
    },
    onError: (e: Error, _vars, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
      toast.error(e.message);
    },
    onSuccess: (enabled) => {
      toast.success(enabled ? 'Auto post order ON for this account' : 'Auto post order OFF for this account');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: igQueryKeys.accounts() });
    },
  });


  const [checking, setChecking] = useState<string | null>(null);
  const checkMut = useMutation({
    mutationFn: async (id: string) => {
      setChecking(id);
      const { data, error } = await supabase.functions.invoke('instagram-poll', { body: { account_id: id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (d: any) => {
      const ordered = Number(d?.ordersPlaced ?? 0);
      if (ordered > 0) toast.success(`${ordered} new post detect hua — order lag gaya`);
      else toast.info('No new post found — data refreshed');
      qc.invalidateQueries({ queryKey: igQueryKeys.accounts() });
      qc.invalidateQueries({ queryKey: igQueryKeys.postsSummary() });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setChecking(null),
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('instagram_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Account removed');
      qc.invalidateQueries({ queryKey: igQueryKeys.accounts() });
      qc.invalidateQueries({ queryKey: igQueryKeys.postsSummary() });
    },
  });



  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5 bg-[#0a0a14]/80 border border-white/10">
        <label className="block text-xs font-semibold uppercase tracking-wider text-white/80 mb-2">Add Instagram Username</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/75">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && username) linkMut.mutate(username); }}
              placeholder="your_username"
              className="w-full h-11 pl-8 pr-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-white/65 focus:outline-none focus:border-purple-400/40"
            />
          </div>
          <button
            disabled={!username || linkMut.isPending}
            onClick={() => linkMut.mutate(username)}
            className="h-11 px-5 rounded-xl font-semibold bg-gradient-to-b from-purple-500 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            {linkMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Link
          </button>
        </div>
        <p className="mt-2 text-[11px] text-white/75 flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3" /> Read-only. We only fetch public profile info & posts.
        </p>

        {(() => {
          const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const recent = (linkEvents as any[]).filter(e => new Date(e.created_at).getTime() >= cutoff);
          const used = recent.length;
          const remaining = Math.max(0, 10 - used);
          const blocked = remaining === 0;
          const oldest = recent.reduce<Date | null>((min, a) => {
            const d = new Date(a.created_at);
            return !min || d < min ? d : min;
          }, null);
          const resetAt = oldest ? new Date(oldest.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
          const resetStr = resetAt ? resetAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : null;
          return (
            <div className={`mt-3 rounded-xl px-3 py-2 text-[12px] flex flex-wrap items-start gap-x-2 gap-y-1 border ${
              blocked
                ? 'bg-rose-500/10 border-rose-400/30 text-rose-200'
                : remaining <= 1
                  ? 'bg-amber-500/10 border-amber-400/30 text-amber-200'
                  : 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
            }`}>
              {blocked ? <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
              <span className="font-semibold">{used}/10 links used</span>
              <span className="opacity-80 hidden sm:inline">·</span>
              <span className="basis-full sm:basis-auto sm:flex-1 min-w-0">
                {blocked
                  ? `Monthly limit reached. Slot frees on ${resetStr}, or remove an existing account.`
                  : `${remaining} more account${remaining === 1 ? '' : 's'} can be linked in this 30-day window${resetStr ? ` · next reset ${resetStr}` : ''}.`}
              </span>
            </div>
          );
        })()}
      </div>

      <div className="space-y-3">
        {!isLoading && accounts.length > 0 && (
          <div className="rounded-2xl p-3 bg-sky-500/10 border border-sky-400/30 text-[12px] text-sky-100 flex items-start gap-2">
            <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="min-w-0">
              Auto check is off (to save API requests). After uploading a new post, press that account's{' '}
              <b>Check</b> button — only then the new post is detected and the order is placed.
            </span>
          </div>
        )}

        {isLoading && accounts.length === 0 && <div className="text-center text-white/80 py-8">Loading...</div>}
        {pending
          .filter((u) => !accounts.some((a: any) => String(a.username).toLowerCase() === u))
          .map((u) => (
            <div key={`pending-${u}`} className="rounded-2xl p-4 bg-[#0a0a14]/80 border border-purple-400/20 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/5 animate-pulse shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold !text-white truncate">@{u}</span>
                <p className="text-[11px] text-purple-200/80 mt-1 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Profile & posts fetch ho rahe hain...
                </p>
              </div>
            </div>
          ))}
        {!isLoading && accounts.length === 0 && pending.length === 0 && (
          <div className="text-center py-10 rounded-2xl border border-dashed border-white/10 text-white/75">
            No Instagram accounts linked yet.
          </div>
        )}

        {accounts.map((a: any) => (
          <div key={a.id} className="rounded-2xl p-4 bg-[#0a0a14]/80 border border-white/10 flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg ring-2 ring-purple-400/30">
                {a.username[0]?.toUpperCase()}
              </div>
              {a.avatar_url && (
                <img
                  src={igImageUrl(a.avatar_url)}
                  alt={a.username}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="absolute inset-0 w-14 h-14 rounded-full object-cover ring-2 ring-purple-400/30 transition-opacity duration-300 opacity-0"
                  onLoad={(e) => { (e.target as HTMLImageElement).style.opacity = '1'; }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold !text-white truncate">@{a.username}</span>
                {a.is_verified && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
              </div>
              {a.full_name && <p className="text-[13px] text-white/85 truncate">{a.full_name}</p>}
              {!a.last_fetched_at && !a.followers && !a.posts_count ? (
                <p className="text-[11px] text-purple-200/80 mt-0.5 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading profile...
                </p>
              ) : (
                <p className="text-[11px] text-white/75 mt-0.5">
                  {a.followers?.toLocaleString('en-IN') ?? 0} followers · {a.posts_count ?? 0} posts
                </p>
              )}

            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(() => {
                const on = a.auto_boost_enabled === true;
                return (
                  <button
                    onClick={() => toggleAutoMut.mutate({ id: a.id, enabled: !on })}
                    title={on ? 'Auto post order ON — orders are placed on new posts' : 'Auto post order OFF'}
                    className={`h-9 px-3 rounded-lg text-[12px] font-semibold border flex items-center gap-2 transition-colors disabled:opacity-60 ${
                      on
                        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-white/60'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Auto</span>
                    <span className={`w-8 h-4 rounded-full relative transition-colors ${on ? 'bg-emerald-500/70' : 'bg-white/15'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
                    </span>
                  </button>
                );
              })()}
              <button
                onClick={() => checkMut.mutate(a.id)}
                disabled={checking === a.id}
                title="Check for new posts — an order is placed if a new post is found"
                className="h-9 px-3 rounded-lg text-[12px] font-semibold bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-100 flex items-center gap-2 disabled:opacity-60"
              >
                {checking === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Check
              </button>
              <Link to={`/my-posts?account=${encodeURIComponent(a.id)}`} className="px-3 h-9 rounded-lg text-[12px] font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center">

                View Posts
              </Link>

              <button
                onClick={() => confirm(`Remove @${a.username}?`) && removeMut.mutate(a.id)}
                className="w-9 h-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-400/20 text-red-300 flex items-center justify-center"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
