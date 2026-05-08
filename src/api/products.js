import client from './client';
export const productsApi = {
  list: () => client.get('/products/'),
  create: (data) => client.post('/products/', data),
  update: (id, data) => client.patch(`/products/${id}`, data),
  remove: (id) => client.delete(`/products/${id}`),
};
