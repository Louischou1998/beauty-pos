import client from './client';

export const bookingsApi = {
  list: (date) => client.get('/bookings/', { params: date ? { date } : {} }),
  create: (data) => client.post('/bookings/', data),
  updateStatus: (id, status) => client.patch(`/bookings/${id}/status`, { status }),
};
