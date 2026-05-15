import client from './client';
import { cached, getCached, refresh } from './cache';

const withCache = (key, fn) => Object.assign(() => cached(key, fn), { getCache: () => getCached(key) });
const listFn = () => client.get('/customers/');

export const customersApi = {
  list: withCache('customers', listFn),
  create: async (data) => { const r = await client.post('/customers/', data); refresh('customers', listFn); return r; },
  update: async (id, data) => { const r = await client.patch(`/customers/${id}`, data); refresh('customers', listFn); return r; },
  topup: async (id, data) => { const r = await client.post(`/customers/${id}/topup`, data); refresh('customers', listFn); return r; },
  history: (id) => client.get(`/customers/${id}/history`),
  remove: async (id) => { const r = await client.delete(`/customers/${id}`); refresh('customers', listFn); return r; },
  birthdays: (days = 30) => client.get(`/customers/birthdays?days=${days}`),
};
