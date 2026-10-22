import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Sparkles, Zap, Shield, BarChart3, Wallet as WalletIcon,
  Shuffle, Activity, Check, Instagram, Youtube, MessageCircle, Globe
} from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import logo from '@/assets/logo.jpg';
import heroVisual from '@/assets/hero-visual.jpg';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

/**
 * OrganicSMM Pro — Software-style landing (Violet Aurora).
 * Dark canvas, fine grid, violet aurora glows, display headline with serif italic accent.
 */

const Index = () => {
  const { user } = useAuth();


  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden selection:bg-primary/30 antialiased">
      <PageMeta
        title="OrganicSMM Pro — The Growth Engine for Social Magic"
        description="Precision-engineered organic engagement for Instagram, TikTok and YouTube. Multi-provider failover, wallet, live dashboard."
        canonicalPath="/"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
      />

      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="OrganicSMM Pro" width={32} height={32} fetchPriority="high" decoding="async" className="h-8 w-8 rounded-md object-cover ring-1 ring-border" />
            <span className="text-[15px] font-semibold tracking-normal">OrganicSMM Pro</span>
            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18em] text-muted-foreground ml-2 px-1.5 py-0.5 rounded border border-border">v2</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#auto-boost" className="hover:text-foreground transition-colors">Auto Boost</a>
            <a href="#platforms" className="hover:text-foreground transition-colors">Platforms</a>
            <Link to="/support" className="hover:text-foreground transition-colors">Support</Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              to="/auth"
              className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary transition-all shadow-sm active:scale-[0.98]"
            >
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>
      <main>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-card">
        <img src={heroVisual} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
        <div className="absolute inset-0 bg-card/80" />
        <div className="relative max-w-5xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-10 sm:pb-12 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card backdrop-blur-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-primary">
              OrganicSMM Pro Software v2.0
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-foreground text-4xl sm:text-6xl lg:text-[76px] font-bold tracking-normal leading-[1.08] mb-6"
            style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
          >
            OrganicSMM <span className="text-primary">Pro</span>
          </h1>

          {/* Sub */}
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Instagram, TikTok aur YouTube par 100% organic engagement — zero bots.
            Auto Boost every new post, multi-provider failover, instant wallet
            top-ups and live order tracking, all in one panel.
          </p>



          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/auth"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary transition-all shadow-sm active:scale-[0.98]"
            >
              Launch Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/wallet"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 bg-card border border-border text-foreground font-semibold rounded-lg hover:bg-card transition-all backdrop-blur-md"
            >
              Add funds
            </Link>
          </div>

          {/* Platforms strip */}
          <div className="mt-10 pt-6 border-t border-border">
            <p className="text-[10px] tracking-[0.24em] uppercase text-muted-foreground mb-5">
              Built for the platforms that matter
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-muted-foreground">
              {[
                { Icon: Instagram, label: 'INSTAGRAM' },
                { Icon: Sparkles, label: 'TIKTOK' },
                { Icon: Youtube, label: 'YOUTUBE' },
                { Icon: MessageCircle, label: 'TELEGRAM' },
                { Icon: Globe, label: 'FACEBOOK' },
              ].map(({ Icon, label }) => (
                <div key={label} className="flex items-center gap-2 hover:text-muted-foreground transition-colors">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-semibold tracking-[0.18em]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24 sm:py-32 border-t border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="max-w-2xl mb-14">
            <p className="text-[11px] tracking-[0.22em] uppercase text-primary mb-4">
              The Software
            </p>
            <h2 className="text-foreground text-3xl sm:text-5xl font-bold tracking-normal leading-[1.1]">
              Engineered like infrastructure,
              <br />
              <span
                className="italic text-primary"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                used like a product.
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[
              {
                Icon: Activity,
                title: 'Organic Drip-Feed',
                body: 'Time-spread delivery with natural variance — engagement that looks human because the schedule is.',
              },
              {
                Icon: Shuffle,
                title: 'Multi-Provider Failover',
                body: 'Auto-rotation across providers with live balance monitoring. Zero balance? Backup provider takes over.',
              },
              {
                Icon: WalletIcon,
                title: 'Wallet & UPI Deposits',
                body: 'Fully automatic ZapUPI top-ups. No screenshots, no approvals. Credited the second payment clears.',
              },
              {
                Icon: BarChart3,
                title: 'Live Dashboard',
                body: 'Real-time runs, status, charts. Watch every dispatch tick across providers as it happens.',
              },
              {
                Icon: Shield,
                title: 'Subscription Gated',
                body: 'Locked behind monthly or lifetime plans, so the system stays clean and the queue stays fast.',
              },
              {
                Icon: Zap,
                title: 'Bundles & Mass Order',
                body: 'One click ships engagement combos across multiple posts — built for creators who scale fast.',
              },
            ].map(({ Icon, title, body }) => (
              <div
                key={title}
                className="group relative rounded-lg border border-border bg-card p-6 hover:bg-card hover:border-border transition-all backdrop-blur-sm"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auto Boost */}
      <section id="auto-boost" className="relative py-20 border-t border-border">
        <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-4">Auto Boost</p>
              <h2 className="text-foreground text-3xl sm:text-4xl font-bold tracking-normal leading-tight mb-4">
                Post it, the order places itself
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6 max-w-lg">
                Link your Instagram account once and set the quantity for views, likes, comments,
                saves and shares. When a new post goes up, the order is placed automatically within
                1–3 minutes and delivered gradually over the time window you chose.
              </p>

              <ul className="space-y-3 mb-8">
                {[
                  'A separate on/off switch for every account',
                  'Delivery time from 6 hours to 7 days',
                  'Your saved quantity presets are used every time',
                  'Auto orders appear in history with a ⚡ badge',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-[14px] text-muted-foreground">
                    <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={user ? '/auto-boost' : '/auth'}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-lg text-[13px] font-semibold text-foreground border border-border bg-card hover:bg-card transition-colors"
              >
                <Zap className="h-4 w-4 text-primary" />
                {user ? 'Open Auto Boost' : 'Set up Auto Boost'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Example setup */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
                <p className="text-[13px] font-semibold text-foreground">Example setup</p>
                <span className="text-[11px] text-muted-foreground">@yourhandle</span>
              </div>

              <dl className="space-y-2.5 text-[13px]">
                {[
                  ['Views', '10,000'],
                  ['Likes', '850'],
                  ['Comments', '40'],
                  ['Saves', '220'],
                  ['Shares', '180'],
                  ['Delivery time', '72 hours'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4 pt-4 border-t border-border text-[12px] text-muted-foreground leading-relaxed">
                This is just an example — you can change the quantity and timing any time from the
                Auto Boost page.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Platforms */}
      <section id="platforms" className="relative py-24 border-t border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[11px] tracking-[0.22em] uppercase text-primary mb-4">
              Cross-platform
            </p>
            <h2 className="text-foreground text-3xl sm:text-5xl font-bold tracking-normal leading-[1.1] mb-5">
              One control room for{' '}
              <span
                className="italic text-primary"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                every channel.
              </span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8 max-w-lg">
              Plug in a URL, pick a bundle, hit launch. OrganicSMM Pro handles the
              routing, the dispatch, and the retries — so you don't have to
              babysit any of it.
            </p>
            <ul className="space-y-3">
              {[
                'Instagram followers, likes, views & reels',
                'TikTok views, hearts & followers',
                'YouTube views, subs & engagement',
                'Telegram, Facebook, X — all routed',
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="h-5 w-5 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="relative rounded-lg border border-border bg-gradient-to-br from-card to-card p-6 backdrop-blur-md shadow-sm">
              <div className="flex items-center gap-1.5 mb-5">
                <span className="h-2.5 w-2.5 rounded-full bg-card" />
                <span className="h-2.5 w-2.5 rounded-full bg-card" />
                <span className="h-2.5 w-2.5 rounded-full bg-card" />
                <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-muted-foreground">organicsmm.live</span>
              </div>
              <div className="space-y-3">
                {[
                  { p: 'Instagram', t: 'Reel views', q: '12,500', s: 'Running' },
                  { p: 'TikTok', t: 'Hearts', q: '4,200', s: 'Queued' },
                  { p: 'YouTube', t: 'Subscribers', q: '850', s: 'Complete' },
                  { p: 'Instagram', t: 'Followers', q: '2,000', s: 'Running' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card px-3.5 py-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">{r.p}</div>
                      <div className="text-sm font-medium">{r.t}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{r.q}</div>
                      <div className={`text-[10px] uppercase tracking-widest ${r.s === 'Complete' ? 'text-success' : r.s === 'Queued' ? 'text-warning' : 'text-primary'}`}>
                        {r.s}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="relative py-24 border-t border-border">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="text-foreground text-3xl sm:text-5xl font-bold tracking-normal leading-[1.1] mb-5">
            Ready to ship{' '}
            <span
              className="italic text-primary"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              real growth?
            </span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Skip the panel templates. Run growth like software.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary transition-all shadow-sm active:scale-[0.98]"
          >
            Launch Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="OrganicSMM Pro" className="h-6 w-6 rounded object-cover ring-1 ring-border" />
            <span>© {new Date().getFullYear()} OrganicSMM Pro. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/legal/terms" className="hover:text-muted-foreground">Terms</Link>
            <Link to="/legal/privacy" className="hover:text-muted-foreground">Privacy</Link>
            <Link to="/support" className="hover:text-muted-foreground">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
