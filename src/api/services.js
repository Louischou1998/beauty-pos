import client from './client';

export const servicesApi = {
  list: () => client.get('/services/'),
  listCategories: () => client.get('/services/categories'),
  create: (data) => client.post('/services/', data),
  update: (id, data) => client.patch(`/services/${id}`, data),
  remove: (id) => client.delete(`/services/${id}`),
};
