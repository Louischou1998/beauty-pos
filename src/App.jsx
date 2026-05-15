import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ConfigProvider } from 'antd';
import zhTW from 'antd/locale/zh_TW';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/login/Login';
import Dashboard from './pages/dashboard/Dashboard';
import BookingCalendar from './pages/booking/BookingCalendar';
import POS from './pages/pos/POS';
import StaffManagement from './pages/staff/StaffManagement';
import CustomerManagement from './pages/customers/CustomerManagement';
import Inventory from './pages/inventory/Inventory';
import Reports from './pages/reports/Reports';
import BookingPortal from './pages/portal/BookingPortal';
import Products from './pages/products/Products';
import Coupons from './pages/coupons/Coupons';
import DailySettlement from './pages/settlement/DailySettlement';
import Payroll from './pages/payroll/Payroll';

const theme = {
  token: {
    colorPrimary: '#6366f1',
    colorInfo: '#06b6d4',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    borderRadius: 10,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', sans-serif",
    colorBgContainer: 'rgba(255,255,255,0.8)',
    colorBgElevated: 'rgba(255,255,255,0.95)',
    boxShadow: '0 4px 24px rgba(99,102,241,0.10)',
    boxShadowSecondary: '0 2px 12px rgba(99,102,241,0.08)',
  },
  components: {
    Card: { borderRadiusLG: 16 },
    Table: { borderRadius: 12 },
    Modal: { borderRadiusLG: 20 },
    Drawer: { borderRadius: 20 },
  },
};

const API_ROOT = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1')
  .replace(/\/api\/v1\/?$/, '');

const AdminRoute = ({ children }) => <ProtectedRoute adminOnly>{children}</ProtectedRoute>;

export default function App() {
  // Keep Render free tier awake — ping every 14 minutes
  useEffect(() => {
    const ping = () => fetch(`${API_ROOT}/health`).catch(() => {});
    ping();
    const id = setInterval(ping, 14 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <ErrorBoundary>
    <ConfigProvider locale={zhTW} theme={theme}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/portal" element={<BookingPortal />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/booking" element={<BookingCalendar />} />
                    <Route path="/pos" element={<POS />} />
                    <Route path="/staff" element={<AdminRoute><StaffManagement /></AdminRoute>} />
                    <Route path="/customers" element={<AdminRoute><CustomerManagement /></AdminRoute>} />
                    <Route path="/products" element={<AdminRoute><Products /></AdminRoute>} />
                    <Route path="/inventory" element={<AdminRoute><Inventory /></AdminRoute>} />
                    <Route path="/coupons" element={<AdminRoute><Coupons /></AdminRoute>} />
                    <Route path="/settlement" element={<AdminRoute><DailySettlement /></AdminRoute>} />
                    <Route path="/payroll" element={<AdminRoute><Payroll /></AdminRoute>} />
                    <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
    </ErrorBoundary>
  );
}
