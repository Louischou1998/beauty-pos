/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';
import client from '../api/client';
import { parseApiError } from '../utils/apiError';
import { staffApi } from '../api/staff';
import { servicesApi } from '../api/services';
import { customersApi } from '../api/customers';
import { productsApi } from '../api/products';
import { inventoryApi } from '../api/inventory';
import { couponsApi } from '../api/coupons';
import { clearAntOverlays } from '../utils/clearAntOverlays';

const AuthContext = createContext(null);

const TOKEN_KEY = 'beauty_pos_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      authApi.me(token)
        .then(setUser)
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          delete client.defaults.headers.common.Authorization;
          setUser(null);
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem(TOKEN_KEY, res.access_token);
      client.defaults.headers.common['Authorization'] = `Bearer ${res.access_token}`;
      // 預載所有資料，最多等 8 秒，超時就直接進去
      await Promise.race([
        Promise.all([
          staffApi.list(),
          servicesApi.list(),
          servicesApi.listCategories(),
          customersApi.list(),
          productsApi.list(),
          inventoryApi.list(),
          couponsApi.list(),
        ]),
        new Promise((resolve) => setTimeout(resolve, 8000)),
      ]).catch(() => {});
      setUser(res.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: parseApiError(err, '登入失敗').message };
    }
  };

  const logout = () => {
    clearAntOverlays();
    localStorage.removeItem(TOKEN_KEY);
    delete client.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
