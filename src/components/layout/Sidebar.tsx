import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Package, Wallet, ListOrdered, Settings, LifeBuoy, Shield, LogOut, Rocket, Sparkles, X, Code2, Droplets, Instagram, Grid3x3, Zap, History } from 'lucide-react';
import logo from '@/assets/logo.jpg';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';

interface SidebarProps { onClose?: () => void; }

const userNavItems = [
  { icon: ShoppingCart, label: 'Single Order', path: '/single-order' },
  { icon: History, label: 'Order History', path: '/orders' },
  { icon: Rocket, label: 'Full Engagement', path: '/engagement-order', highlight: true },
  { icon: Sparkles, label: 'Engagement Orders', path: '/engagement-orders' },
  { icon: Droplets, label: 'Mass Order', path: '/mass-order', highlight: true },
  { icon: Wallet, label: 'Wallet', path: '/wallet' },
  { icon: LifeBuoy, label: 'Support', path: '/support' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];


const adminNavItems = [{ icon: Shield, label: 'Admin Panel', path: '/admin' }, { icon: Package, label: 'Single Order Services', path: '/admin/single-order-services' }];

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const { isAdmin, signOut, wallet, profile, user } = useAuth();
  const { formatPrice } = useCurrency();

  const displayEmail = profile?.email || user?.email || '';
  const displayName =
    profile?.full_name ||
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
    displayEmail.split('@')[0] ||
    'User';
  const showUser = Boolean(profile || user);

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-card backdrop-blur-xl border-r border-border">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="OrganicSMM Pro" className="w-9 h-9 rounded-lg object-cover ring-1 ring-border" />
          <div className="flex flex-col">
            <span className="text-[15px] font-bold tracking-normal leading-tight text-foreground">OrganicSMM Pro</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] leading-tight text-primary">✦ v2.0</span>
          </div>
        </Link>
        <Button aria-label="Close menu" variant="ghost" onClick={onClose} className="lg:hidden mr-6 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* User info */}
      {showUser && (
        <div className="mx-4 mb-3 flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-secondary border border-border">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-foreground shrink-0 bg-primary text-primary-foreground">
            {displayName[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold truncate text-foreground">{displayName}</p>
            <p className="text-[10px] truncate text-muted-foreground">{displayEmail}</p>
          </div>
        </div>
      )}


      {/* Wallet */}
      <div className="mx-4 mb-4">
        <div className="relative rounded-lg p-4 bg-primary/5 border border-primary/20 overflow-hidden">
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wallet className="w-3 h-3 text-primary" />
              <span className="text-[9px] font-semibold uppercase tracking-wider text-primary">Wallet Balance</span>
            </div>
            <p className="text-[22px] font-extrabold tracking-normal mb-3 text-foreground">{formatPrice(wallet?.balance || 0)}</p>
            <Link to="/wallet" onClick={onClose} className="flex items-center justify-center gap-1.5 w-full h-8 rounded-lg text-[11px] font-semibold text-primary-foreground bg-primary hover:bg-primary transition-colors shadow-sm">
              <Wallet className="w-3 h-3" /> Add Funds
            </Link>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin">
        <p className="px-3 mb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Menu</p>
        {userNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={onClose}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition-all duration-150 border',
                isActive
                  ? 'bg-primary/10 border-primary/15 text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <item.icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className="flex-1">{item.label}</span>
              {(item as any).highlight && !isActive && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold bg-primary/20 text-primary border border-primary/30">HOT</span>
              )}
            </Link>
          );
        })}

        {/* Auto Boost */}
        {(() => {
          const isActive = location.pathname === '/auto-boost';
          return (
            <Link
              to="/auto-boost"
              onClick={onClose}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition-all duration-150 border',
                isActive
                  ? 'bg-primary/10 border-primary/15 text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <Zap className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className="flex-1">Auto Boost</span>
              {!isActive && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold bg-primary/20 text-primary border border-primary/30">AUTO</span>
              )}
            </Link>
          );
        })()}

        {isAdmin && (
          <>
            <div className="my-3 mx-3 border-t border-border" />
            <p className="px-3 mb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Admin</p>
            {adminNavItems.map((item) => {
              const isActive = item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path} onClick={onClose}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition-all duration-150 border',
                    isActive
                      ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  <item.icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Currency */}
      <div className="px-3 pb-2">
        <div className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[12px] font-medium bg-secondary border border-border text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-base">🇮🇳</span>
            <span className="uppercase tracking-wider">INR</span>
          </div>
          <span className="text-[10px] text-muted-foreground">₹</span>
        </div>
      </div>

      {/* Telegram */}
      <div className="px-3 pb-1">
        <a href="https://t.me/whopcampaign" target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-colors bg-accent/10 border border-accent/20 text-accent hover:bg-accent/15">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          <div className="flex flex-col">
            <span className="font-semibold text-[11px]">Join our Telegram</span>
            <span className="text-[10px] text-accent">Updates & support</span>
          </div>
        </a>
      </div>

      {/* Sign out */}
      <div className="p-3 border-t border-border">
        <Button variant="ghost" onClick={() => signOut()} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-destructive/10">
          <LogOut className="w-3.5 h-3.5 text-destructive" />
          <span>Sign out</span>
        </Button>
      </div>
    </div>
  );
}
