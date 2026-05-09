import client from './client';
export const paymentsApi = {
  list: (date) => client.get('/payments/', { params: date ? { date_str: date } : {} }),
  dailySummary: (date) => client.get('/payments/daily-summary', { params: date ? { date_str: date } : {} }),
};
