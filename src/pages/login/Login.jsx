import { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Space } from 'antd';
import { UserOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async ({ email, password }) => {
    setLoading(true); setError('');
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) navigate('/');
    else setError(result.message);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #ecfeff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* 裝飾 blobs */}
      <div style={{ position: 'fixed', width: 500, height: 500, borderRadius: '50%', background: '#6366f1', filter: 'blur(120px)', opacity: .15, top: -150, left: -150, animation: 'floatBlob 8s ease-in-out infinite alternate' }} />
      <div style={{ position: 'fixed', width: 400, height: 400, borderRadius: '50%', background: '#8b5cf6', filter: 'blur(100px)', opacity: .12, bottom: -100, right: -100, animation: 'floatBlob 10s ease-in-out infinite alternate-reverse' }} />
      <div style={{ position: 'fixed', width: 250, height: 250, borderRadius: '50%', background: '#06b6d4', filter: 'blur(80px)', opacity: .12, top: '40%', right: '30%', animation: 'floatBlob 12s ease-in-out infinite alternate' }} />

      <div style={{ width: 420, padding: '0 16px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 12, filter: 'drop-shadow(0 8px 24px rgba(99,102,241,0.3))' }}>💅</div>
          <Title level={2} style={{ margin: 0, background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Beauty POS
          </Title>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>美業管理系統</Text>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: 24,
          padding: '36px 32px',
          boxShadow: '0 8px 40px rgba(99,102,241,0.12)',
        }}>
          <Title level={4} style={{ marginBottom: 24, color: '#1e1b4b', fontWeight: 700 }}>登入帳號</Title>

          {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16, borderRadius: 10 }} />}

          <Form layout="vertical" onFinish={handleSubmit} initialValues={{ email: 'admin@beauty-pos.com' }}>
            <Form.Item name="email" rules={[{ required: true, message: '請輸入帳號' }]}>
              <Input
                prefix={<UserOutlined style={{ color: '#6366f1' }} />}
                placeholder="Email / 帳號"
                size="large"
                style={{ height: 48 }}
              />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '請輸入密碼' }]}>
              <Input.Password
                prefix={<LockOutlined style={{ color: '#6366f1' }} />}
                placeholder="密碼"
                size="large"
                style={{ height: 48 }}
              />
            </Form.Item>
            <Button
              type="primary" htmlType="submit" block size="large" loading={loading}
              style={{
                height: 50, borderRadius: 12, fontSize: 15, fontWeight: 600,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
              }}
              icon={<ArrowRightOutlined />}
            >
              登入
            </Button>
          </Form>

          {import.meta.env.DEV && (
            <div style={{
              marginTop: 24, padding: '12px 16px', borderRadius: 12,
              background: 'rgba(238,242,255,0.8)', border: '1px solid rgba(99,102,241,0.15)',
            }}>
              <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>測試帳號（僅開發環境顯示）</Text>
              <Text style={{ fontSize: 12, color: '#4f46e5' }}>管理員：admin@beauty-pos.com / admin1234</Text><br />
              <Text style={{ fontSize: 12, color: '#7c3aed' }}>技師：staff1@beauty-pos.com / staff1234</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
