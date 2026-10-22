export interface SingleService {
  id: string; service_id: string; provider_account_id: string; provider_service_number: string; provider_name: string;
  name: string; category: string; platform: string; price_per_k: number; provider_rate_usd: number;
  min_quantity: number; max_quantity: number; description: string | null; speed: string | null;
  refill: string | null; cancel_allowed: string | null; quality: string | null; drop_type: string | null; is_active: boolean;
}
export const SINGLE_PLATFORMS = ['All', 'Instagram', 'YouTube', 'TikTok', 'Facebook', 'Twitter/X', 'Telegram', 'Spotify', 'LinkedIn', 'Other'];
export function singleOrderTotal(quantity: number, rate: number) { return Math.round(quantity / 1000 * rate * 1e6) / 1e6; }
export function validateSingleOrder(service: SingleService | undefined, link: string, quantity: number, balance: number) {
  if (!service || !service.is_active) return 'Choose an available service';
  try { const url = new URL(link); if (!['http:', 'https:'].includes(url.protocol)) return 'Enter a valid public link'; } catch { return 'Enter a valid public link'; }
  if (!Number.isInteger(quantity) || quantity < service.min_quantity || quantity > service.max_quantity) return `Quantity must be between ${service.min_quantity.toLocaleString()} and ${service.max_quantity.toLocaleString()}`;
  if (singleOrderTotal(quantity, Number(service.price_per_k)) <= 0) return 'Service price is not configured';
  if (singleOrderTotal(quantity, Number(service.price_per_k)) > balance) return 'Insufficient wallet balance';
  return null;
}