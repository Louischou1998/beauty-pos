import client from './client';
export const couponsApi = {
  list: () => client.get('/coupons'),
  create: (data) => client.post('/coupons', data),
  validate: (code, amount) => client.post('/coupons/validate', null, { params: { code, amount } }),
  toggle: (id) => client.patch(`/coupons/${id}/toggle`),
};
