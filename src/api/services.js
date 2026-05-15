import client from './client';
import { cached, getCached, bust } from './cache';

const withCache = (key, fn) => Object.assign(() => cached(key, fn), { getCache: () => getCached(key) });

export const servicesApi = {
  list: withCache('services', () => client.get('/services/')),
  listCategories: withCache('serviceCategories', () => client.get('/services/categories')),
  create: async (data) => { const r = await client.post('/services/', data); bust('services'); return r; },
  update: async (id, data) => { const r = await client.patch(`/services/${id}`, data); bust('services'); return r; },
  remove: async (id) => { const r = await client.delete(`/services/${id}`); bust('services'); return r; },
};
