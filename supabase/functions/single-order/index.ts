import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const settings = z.object({ name: z.string().trim().min(1).max(500), category: z.string().trim().min(1).max(200), platform: z.string().min(1).max(50), price_per_k: z.number().finite().positive(), min_quantity: z.number().int().positive(), max_quantity: z.number().int().positive(), description: z.string().max(10000).nullable().optional(), is_active: z.boolean() }).refine(v => v.max_quantity >= v.min_quantity, 'Maximum must be at least minimum');
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('admin-list') }),
  z.object({ action: z.literal('import'), account_id: z.string().uuid(), service_number: z.string().trim().min(1).max(100), category: z.string().trim().min(1).max(200), platform: z.string().min(1).max(50), price_inr: z.number().positive().optional() }),
  z.object({ action: z.literal('update'), id: z.string().uuid(), values: settings }),
  z.object({ action: z.literal('place'), catalogue_id: z.string().uuid(), request_id: z.string().uuid(), link: z.string().trim().url().max(2000).refine(v => /^https?:\/\//i.test(v)), quantity: z.number().int().positive() }),
  z.object({ action: z.literal('status'), order_id: z.string().uuid() }),
]);
async function providerCall(account: { api_url: string; api_key: string }, values: Record<string, string>) {
  const response = await fetch(account.api_url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ key: account.api_key, ...values }), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('Provider could not be reached. Please try again.');
  return await response.json();
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
    if (!token) return reply({ error: 'Please sign in' }, 401);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return reply({ error: 'Please sign in again' }, 401);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return reply({ error: parsed.error.issues.map(i => i.message).join('; ') }, 400);
    const body = parsed.data;
    if (['admin-list', 'import', 'update'].includes(body.action)) {
      const { data: role } = await admin.from('user_roles').select('id').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      if (!role) return reply({ error: 'Admin access required' }, 403);
    }
    if (body.action === 'admin-list') {
      const [catalogue, accounts] = await Promise.all([
        admin.from('single_order_services').select('*').order('created_at', { ascending: false }),
        admin.from('provider_accounts').select('id,name,provider_id,is_active').eq('is_active', true).order('priority'),
      ]);
      if (catalogue.error || accounts.error) throw catalogue.error || accounts.error;
      return reply({ services: catalogue.data, accounts: accounts.data });
    }
    if (body.action === 'import') {
      const { data: account, error } = await admin.from('provider_accounts').select('*').eq('id', body.account_id).eq('is_active', true).single();
      if (error || !account) return reply({ error: 'Active provider not found' }, 400);
      const all = await providerCall(account, { action: 'services' });
      if (!Array.isArray(all)) return reply({ error: 'Provider did not return a service list' }, 400);
      const svc = all.find(s => String(s.service) === body.service_number);
      if (!svc) return reply({ error: 'Service number not found on this provider' }, 404);
      if (svc.type && !['default', 'standard'].includes(String(svc.type).toLowerCase())) return reply({ error: 'This service needs special inputs. Import a standard link + quantity service.' }, 400);
      let currency: string;
      const balance = await providerCall(account, { action: 'balance' });
      currency = String(balance.currency || account.balance_currency || '').toUpperCase();
      const rates: Record<string, number> = { USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.79, AED: 3.67 };
      if (!rates[currency]) return reply({ error: 'Provider currency is unavailable or unsupported; contact support before importing.' }, 400);
      const rate = Number(svc.rate) / rates[currency];
      const min = Number(svc.min), max = Number(svc.max);
      if (!Number.isFinite(rate) || rate <= 0 || !Number.isInteger(min) || min < 1 || !Number.isInteger(max) || max < min) return reply({ error: 'Provider returned invalid price or quantity limits' }, 400);
      const values = { name: String(svc.name), category: body.category, platform: body.platform, provider_name: account.name, provider_service_number: body.service_number, provider_account_id: account.id, provider_rate_usd: rate, price_per_k: body.price_inr ? body.price_inr / 83.5 : rate, min_quantity: min, max_quantity: max, description: String(svc.desc || svc.description || ''), speed: String(svc.speed || 'Not specified'), refill: svc.refill ? 'Yes' : 'No', cancel_allowed: svc.cancel ? 'Yes' : 'No', quality: String(svc.quality || 'Not specified'), drop_type: String(svc.drop_type || 'Not specified'), is_active: true, updated_at: new Date().toISOString() };
      const { data: existing } = await admin.from('single_order_services').select('id').eq('provider_account_id', account.id).eq('provider_service_number', body.service_number).maybeSingle();
      if (existing) return reply({ error: 'Already imported. Edit the existing service below.' }, 409);
      const { data: service, error: serviceError } = await admin.from('services').insert({ provider_id: account.provider_id, provider_service_id: body.service_number, name: values.name, category: values.category, description: values.description, price: values.price_per_k, min_quantity: min, max_quantity: max, is_active: true, drip_feed_enabled: false }).select('id').single();
      if (serviceError || !service) throw serviceError || new Error('Could not create service');
      const { error: mappingError } = await admin.from('service_provider_mapping').insert({ service_id: service.id, provider_account_id: account.id, provider_service_id: body.service_number, sort_order: 1, is_active: true });
      if (mappingError) { await admin.from('services').delete().eq('id', service.id); throw mappingError; }
      const { error: catalogueError } = await admin.from('single_order_services').insert({ ...values, service_id: service.id });
      if (catalogueError) {
        await admin.from('service_provider_mapping').delete().eq('service_id', service.id);
        await admin.from('services').delete().eq('id', service.id);
        throw catalogueError;
      }
      return reply({ success: true });
    }
    if (body.action === 'update') {
      const { data, error } = await admin.from('single_order_services').update({ ...body.values, updated_at: new Date().toISOString() }).eq('id', body.id).select('id').single();
      if (error || !data) throw error || new Error('Service not found');
      return reply({ success: true });
    }
    if (body.action === 'place') {
      const { data: created, error } = await admin.rpc('create_single_order', { p_user_id: user.id, p_catalogue_id: body.catalogue_id, p_link: body.link, p_quantity: body.quantity, p_request_id: body.request_id });
      if (error) return reply({ error: error.message }, 400);
      if (created.duplicate) return reply(created);
      const { data: catalogue } = await admin.from('single_order_services').select('provider_account_id,provider_service_number').eq('id', body.catalogue_id).single();
      const { data: account } = await admin.from('provider_accounts').select('api_url,api_key').eq('id', catalogue?.provider_account_id).single();
      if (!account || !catalogue) {
        await admin.rpc('refund_rejected_single_order', { p_order_id: created.order_id, p_reason: 'Provider unavailable' });
        return reply({ ...created, status: 'failed', refunded: true });
      }
      const { data: claimed, error: claimError } = await admin.from('orders').update({ status: 'processing', error_message: 'Dispatching provider order...' }).eq('id', created.order_id).eq('status', 'pending').select('id').maybeSingle();
      if (claimError || !claimed) return reply({ ...created, status: 'pending' });
      try {
        const result = await providerCall(account, { action: 'add', service: catalogue.provider_service_number, link: body.link, quantity: String(body.quantity) });
        if (result.error) {
          await admin.rpc('refund_rejected_single_order', { p_order_id: created.order_id, p_reason: String(result.error) });
          return reply({ ...created, status: 'failed', refunded: true, message: 'Provider rejected the order. Wallet refunded.' });
        }
        const providerId = result.order || result.id;
        if (!providerId) throw new Error('Provider confirmation missing');
        const { error: saved } = await admin.from('orders').update({ provider_order_id: String(providerId), status: 'processing', error_message: null }).eq('id', created.order_id);
        if (saved) throw saved;
        return reply({ ...created, status: 'processing' });
      } catch {
        await admin.from('orders').update({ error_message: '[Dispatch uncertain] Provider confirmation required; do not place again.', status: 'processing' }).eq('id', created.order_id);
        return reply({ ...created, status: 'processing', message: 'Awaiting provider confirmation. Check Order History; do not place again.' });
      }
    }
    if (body.action === 'status') {
      const { data: order } = await admin.from('orders').select('*').eq('id', body.order_id).eq('user_id', user.id).not('single_order_service_id', 'is', null).single();
      if (!order) return reply({ error: 'Order not found' }, 404);
      if (!order.provider_order_id || ['completed', 'failed', 'cancelled', 'partial'].includes(order.status)) return reply({ order });
      const { data: account } = await admin.from('provider_accounts').select('api_url,api_key').eq('id', order.single_order_provider_account_id).single();
      if (!account) return reply({ error: 'Provider not available' }, 400);
      const result = await providerCall(account, { action: 'status', order: order.provider_order_id });
      if (result.error) return reply({ error: 'Provider status is temporarily unavailable' }, 400);
      const raw = String(result.status || '').toLowerCase().replace(/[\s_-]/g, '');
      const statuses: Record<string, string> = { completed: 'completed', complete: 'completed', partial: 'partial', canceled: 'cancelled', cancelled: 'cancelled', pending: 'processing', inprogress: 'processing', processing: 'processing' };
      const remains = Number(result.remains), start = Number(result.start_count);
      const { data, error } = await admin.from('orders').update({ status: statuses[raw] || 'processing', ...(Number.isFinite(remains) ? { remains: Math.max(0, remains) } : {}), ...(Number.isFinite(start) ? { start_count: Math.max(0, start) } : {}), updated_at: new Date().toISOString() }).eq('id', order.id).select('*').single();
      if (error) throw error;
      return reply({ order: data });
    }
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : 'Something went wrong. Please try again.' }, 400);
  }
});