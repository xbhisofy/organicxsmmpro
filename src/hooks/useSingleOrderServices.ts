import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SingleService } from '@/lib/single-order';
export async function singleOrderAction(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('single-order', { body });
  if (error) {
    let message = error.message;
    try { const payload = await error.context?.json(); message = payload?.error || message; } catch { /* non-JSON failure */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
export function useSingleOrderServices() {
  return useQuery({ queryKey: ['single-order-services'], queryFn: async () => {
    const { data, error } = await supabase.from('single_order_services').select('*').eq('is_active', true).order('category');
    if (error) throw error;
    return data as SingleService[];
  }, staleTime: 30000, refetchOnMount: 'always', refetchOnWindowFocus: true });
}