import { useState } from 'react';
import { Layout, Menu, Typography, Avatar, Dropdown } from 'antd';
import {
  DashboardOutlined, CalendarOutlined, ShoppingCartOutlined,
  TeamOutlined, UserOutlined, BarChartOutlined, InboxOutlined,
  LogoutOutlined, DownOutlined, ShopOutlined, TagOutlined,
  AccountBookOutlined, DollarOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const MENU_GROUPS = [
  {
    items: [
      { key: '/', icon: <DashboardOutlined />, label: '今日總覽', roles: ['admin', 'staff'] },
      { key: '/booking', icon: <CalendarOutlined />, label: '預約行事曆', roles: ['admin', 'staff'] },
      { key: '/pos', icon: <ShoppingCartOutlined />, label: 'POS 收銀', roles: ['admin', 'staff'] },
    ],
  },
  {
    label: '管理',
    items: [
      { key: '/customers', icon: <UserOutlined />, label: '顧客管理', roles: ['admin'] },
      { key: '/staff', icon: <TeamOutlined />, label: '員工管理', roles: ['admin'] },
      { key: '/products', icon: <ShopOutlined />, label: '商品管理', roles: ['admin'] },
      { key: '/inventory', icon: <InboxOutlined />, label: '庫存耗材', roles: ['admin'] },
      { key: '/coupons', icon: <TagOutlined />, label: '預先儲值', roles: ['admin'] },
    ],
  },
  {
    label: '財務',
    items: [
      { key: '/settlement', icon: <AccountBookOutlined />, label: '日結報表', roles: ['admin'] },
      { key: '/payroll', icon: <DollarOutlined />, label: '薪資結算', roles: ['admin'] },
      { key: '/reports', icon: <BarChartOutlined />, label: '業績報表', roles: ['admin'] },
    ],
  },
];

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // 展開選單 items，含分組標題
  const menuItems = [];
  MENU_GROUPS.forEach((group, gi) => {
    const visible = group.items.filter((m) => !user || m.roles.includes(user.role));
    if (!visible.length) return;
    if (gi > 0 && !collapsed) {
      menuItems.push({ type: 'divider', key: `divider-${gi}` });
      menuItems.push({
        key: `group-${gi}`,
        disabled: true,
        label: <span style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', paddingLeft: 2 }}>{group.label}</span>,
        style: { cursor: 'default', height: 26, minHeight: 26, lineHeight: '26px', marginBottom: 0 },
      });
    }
    visible.forEach((m) => menuItems.push(m));
  });

  const currentLabel = MENU_GROUPS.flatMap((g) => g.items).find((m) => m.key === location.pathname)?.label ?? 'Beauty POS';

  const userMenu = {
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: '登出', danger: true }],
    onClick: ({ key }) => { if (key === 'logout') { logout(); navigate('/login'); } },
  };

  return (
    <Layout style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Decorative blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      {/* Sidebar */}
      <Sider
        collapsible collapsed={collapsed} onCollapse={setCollapsed}
        className="pos-sider" width={192}
        style={{ position: 'relative', zIndex: 10 }}
      >
        {/* Logo area */}
        <div style={{
          padding: collapsed ? '20px 0' : '20px 16px 16px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 4,
        }}>
          <div style={{ fontSize: collapsed ? 26 : 28, lineHeight: 1, marginBottom: collapsed ? 0 : 6 }}>💅</div>
          {!collapsed && (
            <>
              <div style={{
                fontSize: 15, fontWeight: 800, letterSpacing: '0.04em',
                background: 'linear-gradient(135deg,#c4b5fd,#67e8f9)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Beauty POS
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2, letterSpacing: '.05em' }}>
                美業管理系統
              </div>
            </>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => { if (!key.startsWith('group-') && key !== 'divider-0') navigate(key); }}
          style={{ background: 'transparent', border: 'none', padding: '4px 0', flex: 1, overflow: 'hidden auto' }}
          inlineCollapsed={collapsed}
        />
      </Sider>

      <Layout style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Header
          className="pos-header"
          style={{ padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 3, height: 20, borderRadius: 2, background: 'linear-gradient(180deg,#6366f1,#8b5cf6)', flexShrink: 0 }} />
            <Text style={{ fontSize: 16, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-.01em' }}>{currentLabel}</Text>
          </div>

          {user && (
            <Dropdown menu={userMenu} trigger={['click']} placement="bottomRight">
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                padding: '5px 14px', borderRadius: 24,
                background: 'rgba(99,102,241,0.07)',
                border: '1px solid rgba(99,102,241,0.18)',
                transition: 'all .2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.14)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <Avatar size={28} style={{
                  background: user.role === 'admin' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#06b6d4,#6366f1)',
                  fontSize: 12, fontWeight: 800,
                }}>
                  {user.name[0]}
                </Avatar>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e1b4b' }}>{user.name}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>{user.role === 'admin' ? '管理員' : '技師'}</div>
                </div>
                <DownOutlined style={{ fontSize: 10, color: '#6366f1' }} />
              </div>
            </Dropdown>
          )}
        </Header>

        <Content style={{ overflow: 'auto', position: 'relative', zIndex: 1 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
