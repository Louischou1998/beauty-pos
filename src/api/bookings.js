import client from './client';

export const bookingsApi = {
  list: (date) => client.get('/bookings/', { params: date ? { date } : {} }),
  listRange: (startDate, endDate) => client.get('/bookings/', { params: { start_date: startDate, end_date: endDate } }),
  create: (data) => client.post('/bookings/', data),
  updateStatus: (id, status) => client.patch(`/bookings/${id}/status`, { status }),
};
