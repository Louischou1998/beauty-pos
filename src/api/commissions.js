import client from './client';
export const commissionsApi = {
  list: (params) => client.get('/commissions/', { params }),
  payroll: (month) => client.get('/commissions/payroll', { params: { month } }),
};
