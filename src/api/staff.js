import client from './client';
import { cached, bust } from './cache';

export const staffApi = {
  list: () => cached('staff', () => client.get('/staff/')),
  create: async (data) => { const r = await client.post('/staff/', data); bust('staff'); return r; },
  update: async (id, data) => { const r = await client.patch(`/staff/${id}`, data); bust('staff'); return r; },
  remove: async (id) => { const r = await client.delete(`/staff/${id}`); bust('staff'); return r; },
  listSchedules: (id, startDate, endDate) =>
    client.get(`/staff/${id}/schedules`, { params: { start_date: startDate, end_date: endDate } }),
  upsertSchedules: (id, items) => client.put(`/staff/${id}/schedules`, items),
};
