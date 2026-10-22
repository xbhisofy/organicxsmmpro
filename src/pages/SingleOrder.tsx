import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShoppingCart, Search, History, Loader2, Clock, Gauge, RefreshCw, ShieldCheck, Star, Ban, ArrowRight, Wallet, CheckCircle2, Globe, Instagram, Youtube } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { singleOrderAction, useSingleOrderServices } from '@/hooks/useSingleOrderServices';
import { SINGLE_PLATFORMS, singleOrderTotal, validateSingleOrder } from '@/lib/single-order';
import { toast } from 'sonner';

export default function SingleOrder() {
  const [params] = useSearchParams();
  const { data: services = [], isLoading, error, refetch } = useSingleOrderServices();
  const { wallet, refreshWallet } = useAuth();
  const { formatPrice } = useCurrency();
  const [platform, setPlatform] = useState('All');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [serviceId, setServiceId] = useState(params.get('service') || '');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ order_number: number; status: string; message?: string; refunded?: boolean } | null>(null);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const submitting = useRef(false);
  const filtered = useMemo(() => services.filter(s => (platform === 'All' || s.platform === platform) && `${s.name} ${s.category} ${s.provider_service_number}`.toLowerCase().includes(search.toLowerCase())), [services, platform, search]);
  const categories = [...new Set(filtered.map(s => s.category))];
  const requestedCategory = filtered.find(s => s.id === serviceId)?.category;
  const selectedCategory = categories.includes(category) ? category : requestedCategory || categories[0] || '';
  const available = filtered.filter(s => s.category === selectedCategory);
  const selected = available.find(s => s.id === serviceId) || available[0];
  const count = Number(quantity);
  const total = singleOrderTotal(count || 0, Number(selected?.price_per_k || 0));
  const issue = validateSingleOrder(selected, link.trim(), count, Number(wallet?.balance || 0));
  const choose = (id: string) => { setServiceId(id); setQuantity(''); setResult(null); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current || !selected) return;
    if (issue) return toast.error(issue);
    submitting.current = true; setBusy(true); setResult(null);
    const fingerprint = JSON.stringify([selected.id, link.trim(), count]);
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
    try {
      const data = await singleOrderAction({ action: 'place', catalogue_id: selected.id, link: link.trim(), quantity: count, request_id: request.current.id });
      setResult(data);
      await refreshWallet();
      toast[data.refunded ? 'error' : 'success'](data.refunded ? 'Provider rejected the order. Wallet refunded.' : `Order #${data.order_number} created`);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not place order'); }
    finally { submitting.current = false; setBusy(false); }
  };
  const details = [
    { icon: Clock, name: 'Start time', value: 'Provider dependent' },
    { icon: Gauge, name: 'Speed', value: selected?.speed },
    { icon: RefreshCw, name: 'Refill', value: selected?.refill },
    { icon: Ban, name: 'Cancel', value: selected?.cancel_allowed },
    { icon: ShieldCheck, name: 'Drop', value: selected?.drop_type },
    { icon: Star, name: 'Quality', value: selected?.quality },
  ];
  return <DashboardLayout><div className="mx-auto max-w-4xl space-y-6 pb-28 sm:pb-20">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
      <div className="flex items-center gap-3"><ShoppingCart className="h-8 w-8 text-primary" /><div><p className="text-xs text-muted-foreground">OrganicSMM Pro</p><h1 className="text-2xl sm:text-3xl tracking-normal">Single Order</h1></div></div>
      <Button variant="outline" asChild><Link to="/orders"><History className="mr-2 h-4 w-4" />Order History</Link></Button>
    </header>
    <div className="flex flex-wrap gap-2" aria-label="Platforms">{SINGLE_PLATFORMS.map(p => { const Icon = p === 'Instagram' ? Instagram : p === 'YouTube' ? Youtube : Globe; return <Button key={p} size="sm" variant={p === platform ? 'default' : 'outline'} onClick={() => { setPlatform(p); setCategory(''); choose(''); }} aria-pressed={p === platform}><Icon className="mr-1.5 h-3.5 w-3.5" />{p}</Button>; })}</div>
    {error ? <div role="alert" className="text-destructive flex items-center gap-3">Services could not load.<Button variant="outline" onClick={() => refetch()}>Retry</Button></div> : null}
    <form onSubmit={submit} className="space-y-6">
      <section className="space-y-4 border-y border-border py-6">
        <h2 className="flex items-center gap-3 text-base tracking-normal"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">1</span>Search or pick a service</h2>
        <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search service" placeholder="Search by name, category or service number" value={search} onChange={e => { setSearch(e.target.value); choose(''); }} className="h-12 pl-10" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Category</Label><Select value={selectedCategory} onValueChange={v => { setCategory(v); choose(''); }} disabled={isLoading || !categories.length}><SelectTrigger aria-label="Category" className="h-12"><SelectValue placeholder={isLoading ? 'Loading services…' : 'No categories'} /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem value={c} key={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Service</Label><Select value={selected?.id || ''} onValueChange={choose} disabled={!available.length}><SelectTrigger aria-label="Service" className="h-12"><SelectValue placeholder="Choose a service" /></SelectTrigger><SelectContent>{available.map(s => <SelectItem value={s.id} key={s.id}>{s.provider_service_number} · {s.name} · {formatPrice(Number(s.price_per_k))} / 1,000</SelectItem>)}</SelectContent></Select></div>
        </div>
        {!isLoading && !filtered.length && !error && <p className="text-sm text-muted-foreground">{services.length ? 'No matching services.' : 'No Single Order services available yet.'}</p>}
        {selected && <p className="text-sm text-primary">Rate per 1,000: <strong>{formatPrice(Number(selected.price_per_k))}</strong></p>}
      </section>
      <section className="space-y-5">
        <h2 className="flex items-center gap-3 text-base tracking-normal"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">2</span>Order details</h2>
        {selected && <><dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">{details.map(d => <div key={d.name} className="flex min-w-0 gap-2.5"><d.icon className="h-5 w-5 shrink-0 text-primary" /><div><dt className="text-xs text-muted-foreground">{d.name}</dt><dd className="text-sm font-medium break-words">{d.value || 'Not specified'}</dd></div></div>)}</dl>
          {selected.description && <div className="border-l-2 border-primary bg-secondary/40 px-4 py-3"><p className="mb-2 text-sm font-semibold">Service #{selected.provider_service_number}</p><p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{selected.description}</p></div>}</>}
        <div className="space-y-2"><Label htmlFor="single-link">Target link</Label><Input id="single-link" type="url" required value={link} onChange={e => { setLink(e.target.value); setResult(null); }} placeholder="https://www.instagram.com/reel/…" className="h-12" /></div>
        <div className="space-y-2"><Label htmlFor="single-quantity">Quantity</Label><Input id="single-quantity" type="number" step="1" min={selected?.min_quantity || 1} max={selected?.max_quantity} required value={quantity} onChange={e => { setQuantity(e.target.value); setResult(null); }} placeholder={selected ? `${selected.min_quantity.toLocaleString()} – ${selected.max_quantity.toLocaleString()}` : 'Enter quantity'} className="h-12" />{selected && <p className="text-xs text-muted-foreground">Min: {selected.min_quantity.toLocaleString()} · Max: {selected.max_quantity.toLocaleString()}</p>}</div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
        <div><p className="text-xs text-muted-foreground">Total amount</p><p className="text-2xl font-bold text-primary">{formatPrice(total)}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Wallet className="h-3 w-3" />Balance: {formatPrice(Number(wallet?.balance || 0))}</p></div>
        <div className="flex flex-col items-end gap-2"><Button type="submit" disabled={busy || !selected || !!result} className="h-12 gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}Place Order<ArrowRight className="h-4 w-4" /></Button>{quantity && link && issue && <p className="max-w-64 text-right text-xs text-destructive">{issue}</p>}</div>
      </footer>
    </form>
    {result && <div role="status" className="border border-border rounded-lg p-4 space-y-3"><p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-primary" />Order #{result.order_number} · {result.status}</p><p className="text-sm text-muted-foreground">{result.message || (result.refunded ? 'Your wallet has been refunded.' : 'Your order is saved in Order History.')}</p><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/orders">View Order History</Link></Button><Button variant="ghost" onClick={() => { request.current = null; setResult(null); setQuantity(''); }}>New Order</Button></div></div>}
  </div></DashboardLayout>;
}