import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  timeout: 8000,
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err)
);

export default client;
