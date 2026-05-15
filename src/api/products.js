import client from './client';
import { cached, getCached, bust } from './cache';

const withCache = (key, fn) => Object.assign(() => cached(key, fn), { getCache: () => getCached(key) });

export const productsApi = {
  list: withCache('products', () => client.get('/products/')),
  create: async (data) => { const r = await client.post('/products/', data); bust('products'); return r; },
  update: async (id, data) => { const r = await client.patch(`/products/${id}`, data); bust('products'); return r; },
  remove: async (id) => { const r = await client.delete(`/products/${id}`); bust('products'); return r; },
};
