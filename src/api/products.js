import client from './client';
import { cached, getCached, refresh } from './cache';

const withCache = (key, fn) => Object.assign(() => cached(key, fn), { getCache: () => getCached(key) });
const listFn = () => client.get('/products/');

export const productsApi = {
  list: withCache('products', listFn),
  create: async (data) => { const r = await client.post('/products/', data); refresh('products', listFn); return r; },
  update: async (id, data) => { const r = await client.patch(`/products/${id}`, data); refresh('products', listFn); return r; },
  remove: async (id) => { const r = await client.delete(`/products/${id}`); refresh('products', listFn); return r; },
};
