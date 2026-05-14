import client from './client';

export const hairRecordsApi = {
  list: (customerId) => client.get(`/customers/${customerId}/hair-records`),
  create: (customerId, data) => client.post(`/customers/${customerId}/hair-records`, data),
  update: (customerId, recordId, data) => client.patch(`/customers/${customerId}/hair-records/${recordId}`, data),
  remove: (customerId, recordId) => client.delete(`/customers/${customerId}/hair-records/${recordId}`),
};
