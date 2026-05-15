import client from './client';
import { cached, getCached, refresh } from './cache';

const withCache = (key, fn) => Object.assign(() => cached(key, fn), { getCache: () => getCached(key) });
const listFn = () => client.get('/coupons');

export const couponsApi = {
  list: withCache('coupons', listFn),
  create: async (data) => { const r = await client.post('/coupons', data); refresh('coupons', listFn); return r; },
  validate: (code, amount) => client.post('/coupons/validate', null, { params: { code, amount } }),
  toggle: async (id) => { const r = await client.patch(`/coupons/${id}/toggle`); refresh('coupons', listFn); return r; },
};
