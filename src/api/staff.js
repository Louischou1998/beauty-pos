import client from './client';
import { cached, getCached, refresh } from './cache';

const withCache = (key, fn) => Object.assign(() => cached(key, fn), { getCache: () => getCached(key) });
const listFn = () => client.get('/staff/');

export const staffApi = {
  list: withCache('staff', listFn),
  create: async (data) => { const r = await client.post('/staff/', data); refresh('staff', listFn); return r; },
  update: async (id, data) => { const r = await client.patch(`/staff/${id}`, data); refresh('staff', listFn); return r; },
  remove: async (id) => { const r = await client.delete(`/staff/${id}`); refresh('staff', listFn); return r; },
  listSchedules: (id, startDate, endDate) =>
    client.get(`/staff/${id}/schedules`, { params: { start_date: startDate, end_date: endDate } }),
  upsertSchedules: (id, items) => client.put(`/staff/${id}/schedules`, items),
};
