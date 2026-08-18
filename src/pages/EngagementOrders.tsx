import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Loader2, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Play,
  RefreshCw,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  ChevronRight,
  Zap,
  Timer,
  Search,
  X,
  BarChart3
} from "lucide-react";

const ENGAGEMENT_ICONS = {
  views: Eye,
  likes: Heart,
  comments: MessageCircle,
  saves: Bookmark,
  shares: Share2,
};

const STATUS_CONFIG = {
  pending: { color: "bg-secondary text-foreground border border-border", icon: Clock },
  processing: { color: "bg-foreground text-background", icon: Play },
  completed: { color: "bg-secondary text-foreground border border-border", icon: CheckCircle2 },
  partial: { color: "bg-secondary text-foreground border border-border", icon: RefreshCw },
  failed: { color: "bg-secondary text-foreground border border-border", icon: XCircle },
  started: { color: "bg-foreground text-background", icon: Play },
};

export default function EngagementOrders() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { formatPrice } = useCurrency();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setSearchQuery(q);
  }, [searchParams]);


  // Debounced server-side search (scales to lakhs of orders)
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [debouncedSearch]);

  // Server-aggregated page: one light row per order (no nested runs payload)
  const { data: pages, refetch, isFetching } = useQuery({
    queryKey: ['engagement-orders', user?.id, debouncedSearch, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_engagement_orders_page', {
        _limit: PAGE_SIZE,
        _offset: 0,
        _search: debouncedSearch || null,
      } as never);
      if (error) throw error;
      const first = (data ?? []) as any[];
      if (page === 0) return first;
      const rest: any[] = [];
      for (let p = 1; p <= page; p++) {
        const { data: more, error: e2 } = await supabase.rpc('get_engagement_orders_page', {
          _limit: PAGE_SIZE,
          _offset: p * PAGE_SIZE,
          _search: debouncedSearch || null,
        } as never);
        if (e2) throw e2;
        rest.push(...((more ?? []) as any[]));
      }
      return [...first, ...rest];
    },
    enabled: !!user,
    staleTime: 15000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    refetchInterval: 20000,
  });

  const orders = pages;
  const filteredOrders = orders;
  const hasMore = (orders?.length ?? 0) >= (page + 1) * PAGE_SIZE;


  // INSTANT RENDER - no loading state
  if (!user && !authLoading) {
    navigate('/auth');
    return null;
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> Engagement Orders</h1>
            <p className="text-muted-foreground">Track your full engagement deliveries in real-time</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => navigate('/engagement-order')}>
              + New Order
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number or video link..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <p className="text-sm text-muted-foreground">
            {filteredOrders?.length || 0} result{filteredOrders?.length !== 1 ? 's' : ''} found for "{searchQuery}"
          </p>
        )}

        {/* Orders List */}
        {orders?.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No engagement orders yet</p>
            <Button onClick={() => navigate('/engagement-order')}>
              Place Your First Order
            </Button>
          </Card>
        ) : filteredOrders?.length === 0 ? (
          <Card className="p-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No orders found for "{searchQuery}"</p>
            <p className="text-sm text-muted-foreground mb-4">Try searching with order number or video link</p>
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders?.map((order) => (
              <OrderCard key={order.id} order={order} onClick={() => navigate(`/engagement-orders/${order.order_number}`)} />
            ))}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" disabled={isFetching} onClick={() => setPage((p) => p + 1)}>
                  {isFetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function OrderCard({ order, onClick }: { order: any; onClick: () => void }) {
  const { formatPrice } = useCurrency();
  // All heavy aggregation is done server-side in get_engagement_orders_page()
  const completedRuns = Number(order.completed_runs ?? 0);
  const totalRuns = Number(order.total_runs ?? 0);
  const pendingCount = Number(order.pending_runs ?? 0);
  const activeRuns = Number(order.active_runs ?? 0);
  const totalDelivered = Number(order.delivered ?? 0);
  const totalQuantity = Number(order.total_quantity ?? 0);
  const progressPercent = totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 0;
  const nextRun = order.next_run_at ? { scheduled_at: order.next_run_at } : null;

  let effectiveStatus = order.status as string;
  if (effectiveStatus !== 'cancelled' && effectiveStatus !== 'failed' && effectiveStatus !== 'paused') {
    if (totalQuantity > 0 && totalDelivered >= totalQuantity) {
      effectiveStatus = 'completed';
    } else if (activeRuns > 0 || pendingCount > 0 || totalDelivered > 0) {
      effectiveStatus = 'processing';
    }
  }
  const StatusIcon = STATUS_CONFIG[effectiveStatus as keyof typeof STATUS_CONFIG]?.icon || Clock;
  const statusColor = STATUS_CONFIG[effectiveStatus as keyof typeof STATUS_CONFIG]?.color || "";

  return (
    <Card 
      className="glass-card overflow-hidden cursor-pointer hover:border-muted-foreground/50 transition-all"
      onClick={onClick}
    >
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <CardTitle className="text-lg text-foreground">Order #{order.order_number}</CardTitle>
              <Badge className={statusColor}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {effectiveStatus}
              </Badge>
              {order.campaign_name && (
                <Badge variant="outline" className="border-primary/40 text-primary">
                  ⚡ {order.campaign_name}
                </Badge>
              )}
              {order.is_organic_mode && (
                <Badge variant="outline" className="border-border text-muted-foreground">
                  🌱 Organic
                </Badge>
              )}
            </div>
            <a 
              href={order.link} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {order.link.length > 50 ? order.link.slice(0, 50) + '...' : order.link}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="text-right flex items-center gap-2">
            <div>
              <p className="font-semibold text-foreground">{formatPrice(order.total_price || 0)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Real-time Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-3 bg-secondary rounded-xl border border-border">
            <Zap className="h-4 w-4 mx-auto mb-1 text-foreground" />
            <p className="text-sm font-bold text-foreground">{totalDelivered.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Delivered</p>
          </div>
          <div className="p-3 bg-secondary rounded-xl border border-border">
            <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-foreground" />
            <p className="text-sm font-bold text-foreground">{completedRuns}</p>
            <p className="text-[10px] text-muted-foreground">Complete</p>
          </div>
          <div className="p-3 bg-secondary rounded-xl border border-border">
            <Clock className="h-4 w-4 mx-auto mb-1 text-foreground" />
            <p className="text-sm font-bold text-foreground">{pendingCount}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </div>
          <div className="p-3 bg-secondary rounded-xl border border-border">
            <Play className="h-4 w-4 mx-auto mb-1 text-foreground" />
            <p className="text-sm font-bold text-foreground">{activeRuns}</p>
            <p className="text-[10px] text-muted-foreground">Active</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{completedRuns} / {totalRuns} runs</span>
            <span>{totalDelivered.toLocaleString()} / {totalQuantity.toLocaleString()}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Next Run Timer */}
        {nextRun && (
          <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl border border-border text-sm">
            <Timer className="h-4 w-4 text-foreground" />
            <span className="text-muted-foreground">Next run:</span>
            <strong className="text-foreground">{format(new Date(nextRun.scheduled_at), 'HH:mm')}</strong>
            <span className="text-muted-foreground">
              ({formatDistanceToNow(new Date(nextRun.scheduled_at), { addSuffix: true })})
            </span>
          </div>
        )}

        {/* Engagement Items */}
        <div className="flex flex-wrap gap-2">
          {order.items?.map((item: any) => {
            const Icon = ENGAGEMENT_ICONS[item.engagement_type as keyof typeof ENGAGEMENT_ICONS] || Eye;
            const itemCompleted = Number(item.completed_runs ?? 0);
            const itemTotalRuns = Number(item.total_runs ?? 0);
            const itemDelivered = Number(item.delivered ?? 0);

            return (
              <Badge 
                key={item.id}
                variant="secondary"
                className="flex items-center gap-1.5 py-1.5 px-3"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="capitalize">{item.engagement_type}:</span>
                <span className="font-mono">{itemDelivered.toLocaleString()}/{item.quantity.toLocaleString()}</span>
                <span className="text-muted-foreground">({itemCompleted}/{itemTotalRuns})</span>
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}