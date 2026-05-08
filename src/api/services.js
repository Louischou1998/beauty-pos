import client from './client';

export const servicesApi = {
  list: () => client.get('/services'),
  create: (data) => client.post('/services', data),
  remove: (id) => client.delete(`/services/${id}`),
};
