import client from './client';
import { cached, getCached, refresh } from './cache';

const withCache = (key, fn) => Object.assign(() => cached(key, fn), { getCache: () => getCached(key) });
const listFn = () => client.get('/services/');

export const servicesApi = {
  list: withCache('services', listFn),
  listCategories: withCache('serviceCategories', () => client.get('/services/categories')),
  create: async (data) => { const r = await client.post('/services/', data); refresh('services', listFn); return r; },
  update: async (id, data) => { const r = await client.patch(`/services/${id}`, data); refresh('services', listFn); return r; },
  remove: async (id) => { const r = await client.delete(`/services/${id}`); refresh('services', listFn); return r; },
};
