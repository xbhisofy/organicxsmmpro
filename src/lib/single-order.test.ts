import { describe, expect, it } from 'vitest';
import { singleOrderTotal, validateSingleOrder, type SingleService } from './single-order';
const service = { is_active: true, min_quantity: 500, max_quantity: 100000, price_per_k: 2 } as SingleService;
describe('Single Order checkout', () => {
  it('charges quantity / 1,000 at the admin rate', () => { expect(singleOrderTotal(1500, 2)).toBe(3); });
  it('enforces minimum and maximum quantities', () => { expect(validateSingleOrder(service, 'https://instagram.com/reel/test/', 499, 500)).toContain('Quantity'); expect(validateSingleOrder(service, 'https://instagram.com/reel/test/', 100001, 500)).toContain('Quantity'); });
  it('rejects fractional quantities', () => { expect(validateSingleOrder(service, 'https://instagram.com/reel/test/', 500.5, 500)).toContain('Quantity'); });
  it('does not allow orders beyond wallet funds', () => { expect(validateSingleOrder(service, 'https://instagram.com/reel/test/', 1500, 2.99)).toBe('Insufficient wallet balance'); expect(validateSingleOrder(service, 'https://instagram.com/reel/test/', 1500, 3)).toBeNull(); });
  it('rejects inactive services', () => { expect(validateSingleOrder({ ...service, is_active: false }, 'https://instagram.com/reel/test/', 500, 10)).toBe('Choose an available service'); });
  it('only allows public HTTP or HTTPS links', () => { expect(validateSingleOrder(service, 'javascript:alert(1)', 500, 10)).toBe('Enter a valid public link'); });
});