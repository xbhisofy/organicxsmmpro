import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Save, ArrowLeft, Search, Package, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { singleOrderAction } from '@/hooks/useSingleOrderServices';
import { SINGLE_PLATFORMS, type SingleService } from '@/lib/single-order';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from 'sonner';

function ServiceEditor({ service, onSaved }: { service: SingleService; onSaved: () => void }) {
  const { rates, formatPrice } = useCurrency();
  const [values, setValues] = useState(service);
  const [price, setPrice] = useState(String(Number(service.price_per_k) * rates.INR));
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await singleOrderAction({ action: 'update', id: service.id, values: { name: values.name, category: values.category, platform: values.platform, price_per_k: Number(price) / rates.INR, min_quantity: Number(values.min_quantity), max_quantity: Number(values.max_quantity), description: values.description, is_active: values.is_active } }); toast.success('Service saved'); onSaved(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save'); }
    finally { setBusy(false); }
  };
  return <form onSubmit={save} className="rounded-lg border border-border bg-card p-4 sm:p-5 space-y-4">
    <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{service.provider_name} · #{service.provider_service_number}</p><div className="flex items-center gap-2"><Label htmlFor={`active-${service.id}`}>{values.is_active ? 'Active' : 'Inactive'}</Label><Switch id={`active-${service.id}`} checked={values.is_active} onCheckedChange={v => setValues({ ...values, is_active: v })} /></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`name-${service.id}`}>Name</Label><Input id={`name-${service.id}`} required value={values.name} onChange={e => setValues({ ...values, name: e.target.value })} /></div><div className="space-y-2"><Label htmlFor={`category-${service.id}`}>Admin category</Label><Input id={`category-${service.id}`} required value={values.category} onChange={e => setValues({ ...values, category: e.target.value })} /></div></div>
    <div className="grid gap-4 sm:grid-cols-4"><div className="space-y-2"><Label htmlFor={`price-${service.id}`}>Rate / 1,000 (₹)</Label><Input id={`price-${service.id}`} type="number" min="0.000001" step="any" required value={price} onChange={e => setPrice(e.target.value)} /></div><div className="space-y-2"><Label htmlFor={`min-${service.id}`}>Min</Label><Input id={`min-${service.id}`} type="number" min="1" required value={values.min_quantity} onChange={e => setValues({ ...values, min_quantity: Number(e.target.value) })} /></div><div className="space-y-2"><Label htmlFor={`max-${service.id}`}>Max</Label><Input id={`max-${service.id}`} type="number" min={values.min_quantity} required value={values.max_quantity} onChange={e => setValues({ ...values, max_quantity: Number(e.target.value) })} /></div><div className="space-y-2"><Label>Platform</Label><Select value={values.platform} onValueChange={v => setValues({ ...values, platform: v })}><SelectTrigger aria-label={`Platform for ${service.name}`}><SelectValue /></SelectTrigger><SelectContent>{SINGLE_PLATFORMS.slice(1).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="space-y-2"><Label htmlFor={`desc-${service.id}`}>Description</Label><Textarea id={`desc-${service.id}`} value={values.description || ''} onChange={e => setValues({ ...values, description: e.target.value })} /></div>
    <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Provider rate: {formatPrice(Number(service.provider_rate_usd))} / 1,000</p><Button disabled={busy} size="sm" className="gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</Button></div>
  </form>;
}
export default function AdminSingleOrderServices() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState('');
  const [number, setNumber] = useState('');
  const [categoryChoice, setCategoryChoice] = useState('new');
  const [category, setCategory] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [price, setPrice] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin-single-order-services'], queryFn: () => singleOrderAction({ action: 'admin-list' }), refetchOnMount: 'always' });
  const services: SingleService[] = data?.services || [];
  const accounts: { id: string; name: string; provider_id: string }[] = data?.accounts || [];
  const categories = [...new Set(services.map(s => s.category))];
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['single-order-services'] }); refetch(); };
  const importService = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await singleOrderAction({ action: 'import', account_id: account, service_number: number.trim(), category: categoryChoice === 'new' ? category : categoryChoice, platform, ...(price ? { price_inr: Number(price) } : {}) }); toast.success('Service imported'); setOpen(false); setNumber(''); refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Import failed'); }
    finally { setBusy(false); }
  };
  return <DashboardLayout><div className="space-y-6 pb-8">
    <Button asChild variant="ghost" size="sm"><Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Admin Panel</Link></Button>
    <header className="flex flex-wrap justify-between gap-4 items-center"><div className="flex items-center gap-3"><Package className="h-7 w-7 text-primary" /><div><h1 className="text-2xl tracking-normal">Single Order Services</h1><p className="text-sm text-muted-foreground">{services.length} services · {services.filter(s => s.is_active).length} active</p></div></div><Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Import Service</Button></header>
    <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search imported services" className="pl-10" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services or providers" /></div>
    {isLoading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
    {error && <div role="alert" className="text-destructive">Services could not load. <Button variant="outline" onClick={() => refetch()}>Retry</Button></div>}
    {!isLoading && !error && !services.length && <div className="py-12 text-center border-y border-border"><Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><h2 className="text-lg tracking-normal">No Single Order services yet</h2><Button className="mt-4 gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Import Service</Button></div>}
    <div className="space-y-4">{services.filter(s => `${s.name} ${s.category} ${s.provider_name}`.toLowerCase().includes(search.toLowerCase())).map(s => <ServiceEditor key={`${s.id}-${s.is_active}-${s.price_per_k}-${s.name}-${s.category}`} service={s} onSaved={refresh} />)}</div>
    <Dialog open={open} onOpenChange={v => { if (!busy) setOpen(v); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Import Single Service</DialogTitle></DialogHeader><form onSubmit={importService} className="space-y-4">
      <div className="space-y-2"><Label>Provider</Label><Select value={account} onValueChange={setAccount}><SelectTrigger aria-label="Provider"><SelectValue placeholder="Select a provider" /></SelectTrigger><SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.provider_id})</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="import-number">Provider Service Number</Label><Input id="import-number" required value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. 1234" /></div>
      <div className="space-y-2"><Label>Admin Category</Label><Select value={categoryChoice} onValueChange={setCategoryChoice}><SelectTrigger aria-label="Admin Category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">Create new category</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>{categoryChoice === 'new' && <Input aria-label="New category" required value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Instagram Views" />}</div>
      <div className="space-y-2"><Label>Platform</Label><Select value={platform} onValueChange={setPlatform}><SelectTrigger aria-label="Import platform"><SelectValue /></SelectTrigger><SelectContent>{SINGLE_PLATFORMS.slice(1).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="import-price">User rate / 1,000 (₹, optional)</Label><Input id="import-price" type="number" min="0.000001" step="any" value={price} onChange={e => setPrice(e.target.value)} placeholder="Provider rate if left blank" /></div>
      <Button type="submit" disabled={busy || !account} className="w-full gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Import</Button>
    </form></DialogContent></Dialog>
  </div></DashboardLayout>;
}