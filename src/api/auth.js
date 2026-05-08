import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export const authApi = {
  login: async (email, password) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    const res = await axios.post(`${BASE}/auth/login`, form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data;
  },
  me: async (token) => {
    const res = await axios.get(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
};
