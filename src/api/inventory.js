import client from './client';

export const inventoryApi = {
  list: () => client.get('/inventory'),
  create: (data) => client.post('/inventory', data),
  update: (id, data) => client.patch(`/inventory/${id}`, data),
  remove: (id) => client.delete(`/inventory/${id}`),
  use: (id, data) => client.post(`/inventory/${id}/use`, data),
  getUsage: (id) => client.get(`/inventory/${id}/usage`),
};
