import client from './client';
import { cached, getCached, bust } from './cache';

const withCache = (key, fn) => Object.assign(() => cached(key, fn), { getCache: () => getCached(key) });

export const couponsApi = {
  list: withCache('coupons', () => client.get('/coupons')),
  create: async (data) => { const r = await client.post('/coupons', data); bust('coupons'); return r; },
  validate: (code, amount) => client.post('/coupons/validate', null, { params: { code, amount } }),
  toggle: async (id) => { const r = await client.patch(`/coupons/${id}/toggle`); bust('coupons'); return r; },
};
