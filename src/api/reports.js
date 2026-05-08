import client from './client';

export const reportsApi = {
  summary: (period) => client.get('/reports/summary', { params: { period } }),
  daily: (period) => client.get('/reports/daily', { params: { period } }),
  dailyStaff: (period) => client.get('/reports/daily-staff', { params: { period } }),
  staff: (period) => client.get('/reports/staff', { params: { period } }),
  categories: (period) => client.get('/reports/categories', { params: { period } }),
};
