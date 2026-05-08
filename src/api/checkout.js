import client from './client';

export const checkoutApi = {
  submit: (data) => client.post('/checkout/', data),
};
