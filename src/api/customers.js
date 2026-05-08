import client from './client';

export const customersApi = {
  list: () => client.get('/customers/'),
  create: (data) => client.post('/customers/', data),
  update: (id, data) => client.patch(`/customers/${id}`, data),
  topup: (id, data) => client.post(`/customers/${id}/topup`, data),
  history: (id) => client.get(`/customers/${id}/history`),
  remove: (id) => client.delete(`/customers/${id}`),
};
