import client from './client';
import { cached, bust } from './cache';

export const servicesApi = {
  list: () => cached('services', () => client.get('/services/')),
  listCategories: () => cached('serviceCategories', () => client.get('/services/categories')),
  create: async (data) => { const r = await client.post('/services/', data); bust('services'); return r; },
  update: async (id, data) => { const r = await client.patch(`/services/${id}`, data); bust('services'); return r; },
  remove: async (id) => { const r = await client.delete(`/services/${id}`); bust('services'); return r; },
};
