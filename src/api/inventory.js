import client from './client';
import { cached, getCached, bust } from './cache';

const withCache = (key, fn) => Object.assign(() => cached(key, fn), { getCache: () => getCached(key) });

export const inventoryApi = {
  list: withCache('inventory', () => client.get('/inventory')),
  create: async (data) => { const r = await client.post('/inventory', data); bust('inventory'); return r; },
  update: async (id, data) => { const r = await client.patch(`/inventory/${id}`, data); bust('inventory'); return r; },
  remove: async (id) => { const r = await client.delete(`/inventory/${id}`); bust('inventory'); return r; },
  use: async (id, data) => { const r = await client.post(`/inventory/${id}/use`, data); bust('inventory'); return r; },
  getUsage: (id) => client.get(`/inventory/${id}/usage`),
};
