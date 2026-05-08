import client from './client';

export const staffApi = {
  list: () => client.get('/staff/'),
  create: (data) => client.post('/staff/', data),
  update: (id, data) => client.patch(`/staff/${id}`, data),
  remove: (id) => client.delete(`/staff/${id}`),
  listSchedules: (id, startDate, endDate) =>
    client.get(`/staff/${id}/schedules`, { params: { start_date: startDate, end_date: endDate } }),
  upsertSchedules: (id, items) => client.put(`/staff/${id}/schedules`, items),
};
