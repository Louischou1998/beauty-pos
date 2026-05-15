import client from './client';
import { cached, getCached, bust } from './cache';

const withCache = (key, fn) => Object.assign(() => cached(key, fn), { getCache: () => getCached(key) });

export const customersApi = {
  list: withCache('customers', () => client.get('/customers/')),
  create: async (data) => { const r = await client.post('/customers/', data); bust('customers'); return r; },
  update: async (id, data) => { const r = await client.patch(`/customers/${id}`, data); bust('customers'); return r; },
  topup: async (id, data) => { const r = await client.post(`/customers/${id}/topup`, data); bust('customers'); return r; },
  history: (id) => client.get(`/customers/${id}/history`),
  remove: async (id) => { const r = await client.delete(`/customers/${id}`); bust('customers'); return r; },
  birthdays: (days = 30) => client.get(`/customers/birthdays?days=${days}`),
};
