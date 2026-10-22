import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bitcoin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';

const QUICK_AMOUNTS = [500, 1000, 5000, 10000];
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 500000;

export default function OxapayDepositCard() {
  const [amount, setAmount] = useState<string>('1000');
  const { rates } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const polledRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    const deposit = searchParams.get('deposit');
    const orderId = searchParams.get('order_id');
    if (!deposit || !orderId || !orderId.startsWith('oxw_')) return;
    if (polledRef.current === orderId) return;
    polledRef.current = orderId;
    if (deposit === 'success') pollUntilCredited(orderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function clearParams() {
    const next = new URLSearchParams(searchParams);
    next.delete('deposit'); next.delete('order_id');
    setSearchParams(next, { replace: true });
  }

  async function pollUntilCredited(orderId: string) {
    setPolling(true);
    const start = Date.now(); const MAX_MS = 120_000; const INTERVAL = 4_000;
    toast.loading('Verifying crypto payment…', { id: `ox-${orderId}` });
    while (Date.now() - start < MAX_MS) {
      if (!mountedRef.current) { toast.dismiss(`ox-${orderId}`); return; }
      try {
        const { data } = await supabase.functions.invoke('oxapay-sync-deposit', { body: { order_id: orderId } });
        if (!mountedRef.current) { toast.dismiss(`ox-${orderId}`); return; }
        if (data?.credited || data?.status === 'success') {
          toast.success('🎉 Wallet credited!', { id: `ox-${orderId}` });
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          clearParams(); setPolling(false); return;
        }
        if (data?.status === 'failed') { toast.error('Payment expired.', { id: `ox-${orderId}` }); clearParams(); setPolling(false); return; }
      } catch (e) { console.error('sync error', e); }
      await new Promise((r) => setTimeout(r, INTERVAL));
    }
    if (!mountedRef.current) { toast.dismiss(`ox-${orderId}`); return; }
    toast.dismiss(`ox-${orderId}`);
    toast.message('Still waiting for blockchain confirmation. It will credit automatically.');
    clearParams(); setPolling(false);
  }

  async function handlePay() {
    const inr = Math.floor(Number(amount) || 0);
    if (!inr || inr < MIN_AMOUNT) return toast.error(`Minimum is ₹${MIN_AMOUNT}`);
    if (inr > MAX_AMOUNT) return toast.error(`Maximum is ₹${MAX_AMOUNT}`);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('oxapay-create-wallet-topup', { body: { amount_inr: inr } });
      if (error) throw error;
      if (!data?.payment_url) throw new Error(data?.error || 'No payment URL');
      window.location.href = data.payment_url;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Could not start payment');
      setLoading(false);
    }
  }

  const usd = (Number(amount || 0) / (rates.INR || 83.5)).toFixed(2);

  return (
    <div className="relative rounded-lg bg-gradient-to-br from-card to-card border border-border p-6 backdrop-blur-md shadow-sm">
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center">
            <Bitcoin className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-foreground leading-tight">Pay with Crypto</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">USDT · BTC · LTC · TRX · ETH</p>
          </div>
        </div>
        <div className="flex -space-x-1.5">
          <div className="w-6 h-6 rounded-full bg-accent border-2 border-card flex items-center justify-center text-[8px] font-bold text-foreground">T</div>
          <div className="w-6 h-6 rounded-full bg-accent border-2 border-card flex items-center justify-center text-[8px] font-bold text-foreground">B</div>
          <div className="w-6 h-6 rounded-full bg-accent border-2 border-card flex items-center justify-center text-[8px] font-bold text-foreground">E</div>
        </div>
      </div>

      <div className="relative space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5 ml-1">
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Amount</label>
            <span className="text-[11px] font-semibold text-muted-foreground">≈ ${usd} USD</span>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-muted-foreground">₹</span>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-secondary border border-border rounded-lg py-3.5 pl-10 pr-16 text-xl font-bold tracking-normal text-foreground outline-none focus:border-border focus:bg-secondary transition-all placeholder:text-muted-foreground"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground tracking-wider">INR</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((q) => {
            const active = Number(amount) === q;
            return (
              <Button variant="ghost"
                key={q}
                onClick={() => setAmount(String(q))}
                className={
                  'py-2.5 rounded-lg text-xs font-semibold transition-all border ' +
                  (active
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-secondary border-border text-muted-foreground hover:bg-secondary hover:border-border hover:text-foreground')
                }
              >
                ₹{q >= 1000 ? `${q / 1000}k` : q}
              </Button>
            );
          })}
        </div>

        <Button variant="ghost"
          onClick={handlePay}
          disabled={loading || polling}
          className="relative w-full py-3.5 rounded-lg font-semibold text-primary-foreground flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 bg-primary hover:bg-primary shadow-sm"
        >
          {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> <span>Opening OxaPay…</span></>)
            : polling ? (<><Loader2 className="w-4 h-4 animate-spin" /> <span>Verifying payment…</span></>)
            : (<><Bitcoin className="w-4 h-4" /> <span>Pay ≈ ${usd} in Crypto</span></>)}
        </Button>

        <div className="flex items-center justify-center gap-1.5 pt-1">
          <div className="w-1 h-1 rounded-full bg-success animate-pulse" />
          <p className="text-[10px] text-muted-foreground font-medium">Auto-credit after blockchain confirmation</p>
        </div>
      </div>
    </div>
  );
}
