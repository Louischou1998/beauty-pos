import client from './client';
import { cached, getCached, bust } from './cache';

const withCache = (key, fn) => Object.assign(() => cached(key, fn), { getCache: () => getCached(key) });

export const staffApi = {
  list: withCache('staff', () => client.get('/staff/')),
  create: async (data) => { const r = await client.post('/staff/', data); bust('staff'); return r; },
  update: async (id, data) => { const r = await client.patch(`/staff/${id}`, data); bust('staff'); return r; },
  remove: async (id) => { const r = await client.delete(`/staff/${id}`); bust('staff'); return r; },
  listSchedules: (id, startDate, endDate) =>
    client.get(`/staff/${id}/schedules`, { params: { start_date: startDate, end_date: endDate } }),
  upsertSchedules: (id, items) => client.put(`/staff/${id}/schedules`, items),
};
