import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { LiveChatWidget } from '@/components/chat/LiveChatWidget';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps { children: ReactNode; }

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [user, isLoading, navigate]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden selection:bg-primary/15 antialiased relative">
      <div className="flex w-full">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-40">
          <Sidebar />
        </aside>

        {/* Mobile top bar */}
        <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-3 bg-card/95 backdrop-blur-xl border-b border-border">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-transparent border-none">
              <Sidebar onClose={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold tracking-wide">OrganicSMM Pro</span>
          <div className="w-9" />
        </header>

        <main className="w-full relative lg:pl-64">
          <div className="min-h-screen pt-16 lg:pt-6 pb-10 px-3 sm:px-5 lg:px-8">
            <div className="max-w-6xl mx-auto w-full">{children}</div>
          </div>
        </main>
      </div>

      <LiveChatWidget />
    </div>
  );
}
