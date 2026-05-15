import client from './client';
import { cached, getCached, refresh } from './cache';

const withCache = (key, fn) => Object.assign(() => cached(key, fn), { getCache: () => getCached(key) });
const listFn = () => client.get('/inventory');

export const inventoryApi = {
  list: withCache('inventory', listFn),
  create: async (data) => { const r = await client.post('/inventory', data); refresh('inventory', listFn); return r; },
  update: async (id, data) => { const r = await client.patch(`/inventory/${id}`, data); refresh('inventory', listFn); return r; },
  remove: async (id) => { const r = await client.delete(`/inventory/${id}`); refresh('inventory', listFn); return r; },
  use: async (id, data) => { const r = await client.post(`/inventory/${id}/use`, data); refresh('inventory', listFn); return r; },
  getUsage: (id) => client.get(`/inventory/${id}/usage`),
};
