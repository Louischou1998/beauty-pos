import { useMemo } from 'react';
import { Card, Col, Row, Table, Tag, Typography, Alert, Space, Badge } from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, TeamOutlined,
  WalletOutlined, RiseOutlined, GiftOutlined, WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApi } from '../../hooks/useApi';
import { reportsApi } from '../../api/reports';
import { bookingsApi } from '../../api/bookings';
import { customersApi } from '../../api/customers';
import { staffApi } from '../../api/staff';
import { servicesApi } from '../../api/services';

const { Text } = Typography;

const STATUS = {
  confirmed:   { color: 'blue',    label: '已確認' },
  in_progress: { color: 'success', label: '進行中' },
  pending:     { color: 'warning', label: '待確認' },
  done:        { color: 'default', label: '已完成' },
  cancelled:   { color: 'error',   label: '已取消' },
};

const columns = [
  {
    title: '顧客', dataIndex: 'customerName', key: 'name',
    render: (v) => <Text strong style={{ color: '#1e1b4b' }}>{v}</Text>,
  },
  { title: '服務', dataIndex: 'serviceName', key: 'service' },
  {
    title: '技師', dataIndex: 'staffName', key: 'staff',
    render: (v) => <Tag style={{ background: 'rgba(99,102,241,.08)', color: '#6366f1' }}>{v}</Tag>,
  },
  {
    title: '時段', key: 'time',
    render: (_, r) => <Text type="secondary" style={{ fontSize: 13 }}>{r.startTime} – {r.endTime}</Text>,
  },
  {
    title: '狀態', dataIndex: 'status', key: 'status',
    render: (s) => <Tag color={STATUS[s]?.color}>{STATUS[s]?.label}</Tag>,
  },
  {
    title: '金額', dataIndex: 'price', key: 'price',
    render: (p) => <Text strong style={{ color: '#6366f1' }}>${p.toLocaleString()}</Text>,
  },
];

function revisitStatus(customer) {
  if (!customer.last_visit_at) return null;
  const lastVisit = dayjs(customer.last_visit_at);
  const dueDate = lastVisit.add(customer.revisit_days ?? 30, 'day');
  return dueDate.diff(dayjs(), 'day');
}

export default function Dashboard() {
  const today = dayjs().format('YYYY-MM-DD');
  const { data: summary, error: summaryError } = useApi(() => reportsApi.summary('week'), { deps: [] });
  const { data: rawBookings, error: bookingsError } = useApi(() => bookingsApi.list(today), { deps: [today] });
  const { data: customers, error: customersError } = useApi(customersApi.list, { deps: [] });
  const { data: staffs, error: staffsError } = useApi(staffApi.list, { deps: [] });
  const { data: services, error: servicesError } = useApi(servicesApi.list, { deps: [] });
  const { data: upcomingBirthdays } = useApi(() => customersApi.birthdays(14), { deps: [] });

  const customerMap = useMemo(() => new Map((customers ?? []).map((c) => [c.id, c.name])), [customers]);
  const staffMap = useMemo(() => new Map((staffs ?? []).map((s) => [s.id, s.name])), [staffs]);
  const serviceMap = useMemo(() => new Map((services ?? []).map((s) => [s.id, s.name])), [services]);

  const bookings = useMemo(() => {
    if (!rawBookings) return [];
    return rawBookings.flatMap((booking) =>
      (booking.items ?? []).map((item) => ({
        id: item.id,
        customerName: customerMap.get(booking.customer_id) ?? `顧客#${booking.customer_id}`,
        serviceName: serviceMap.get(item.service_id) ?? `服務#${item.service_id}`,
        staffName: staffMap.get(item.staff_id) ?? `技師#${item.staff_id}`,
        startTime: dayjs(item.start_at).format('HH:mm'),
        endTime: dayjs(item.end_at).format('HH:mm'),
        status: booking.status,
        price: Number(item.price),
      }))
    );
  }, [rawBookings, customerMap, serviceMap, staffMap]);

  const pendingCount = useMemo(() => bookings.filter((b) => b.status === 'pending').length, [bookings]);

  // 久未回訪（逾期超過 14 天，最多顯示 5 筆）
  const overdueCustomers = useMemo(() => {
    return (customers ?? [])
      .map((c) => ({ ...c, daysLeft: revisitStatus(c) }))
      .filter((c) => c.daysLeft !== null && c.daysLeft < -14)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);
  }, [customers]);

  const stats = useMemo(() => [
    { title: '近7日營收', value: `$${Number(summary?.total_revenue ?? 0).toLocaleString()}`, sub: '資料來源：DB', icon: <WalletOutlined />, grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)', glow: 'rgba(99,102,241,.35)' },
    { title: '今日預約', value: bookings.length, sub: '筆', icon: <CalendarOutlined />, grad: 'linear-gradient(135deg,#06b6d4,#6366f1)', glow: 'rgba(6,182,212,.3)' },
    { title: '待確認', value: pendingCount, sub: '筆需處理', icon: <ClockCircleOutlined />, grad: 'linear-gradient(135deg,#f59e0b,#f43f5e)', glow: 'rgba(245,158,11,.3)' },
    { title: '近7日到客', value: Number(summary?.total_bookings ?? 0), sub: '人次', icon: <TeamOutlined />, grad: 'linear-gradient(135deg,#10b981,#06b6d4)', glow: 'rgba(16,185,129,.3)' },
  ], [summary, bookings.length, pendingCount]);

  return (
    <div className="page-wrap">
      {(summaryError || bookingsError || customersError || staffsError || servicesError) && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message="資料載入失敗，請確認 API 與登入狀態"
        />
      )}
      {/* 頁首 */}
      <div className="page-heading">
        <div>
          <div className="page-title-text">今日總覽</div>
          <div className="page-subtitle">{dayjs().format('YYYY 年 M 月 D 日 · dddd')}</div>
        </div>
      </div>

      {/* 統計卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {stats.map((s, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <div className="stat-card" style={{ padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Text style={{ color: '#6b7280', fontSize: 13, display: 'block', marginBottom: 10 }}>{s.title}</Text>
                  <Text style={{ fontSize: 30, fontWeight: 800, color: '#1e1b4b', lineHeight: 1 }}>{s.value}</Text>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RiseOutlined style={{ color: '#10b981', fontSize: 12 }} />
                    <Text style={{ fontSize: 12, color: '#10b981' }}>{s.sub}</Text>
                  </div>
                </div>
                <div className="stat-icon-chip" style={{ background: s.grad, boxShadow: `0 6px 18px ${s.glow}` }}>
                  {s.icon}
                </div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* 生日/回訪提醒 */}
      {((upcomingBirthdays ?? []).length > 0 || overdueCustomers.length > 0) && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {(upcomingBirthdays ?? []).length > 0 && (
            <Col xs={24} md={12}>
              <Card
                title={
                  <div className="card-title-bar">
                    <GiftOutlined style={{ color: '#f43f5e' }} />
                    近 14 天生日
                    <Badge count={(upcomingBirthdays ?? []).length} style={{ background: 'linear-gradient(135deg,#f43f5e,#f59e0b)', marginLeft: 4 }} />
                  </div>
                }
                size="small"
              >
                <Space direction="vertical" style={{ width: '100%' }} size={6}>
                  {(upcomingBirthdays ?? []).map((item) => (
                    <div key={item.customer.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 10px', borderRadius: 8,
                      background: item.days_until === 0
                        ? 'rgba(244,63,94,0.08)'
                        : item.days_until <= 3
                          ? 'rgba(245,158,11,0.07)'
                          : 'rgba(99,102,241,0.05)',
                    }}>
                      <Space>
                        <span style={{ fontSize: 16 }}>{item.days_until === 0 ? '🎂' : '🎁'}</span>
                        <div>
                          <Text strong style={{ fontSize: 13 }}>{item.customer.name}</Text>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.customer.phone}</div>
                        </div>
                      </Space>
                      <Tag color={item.days_until === 0 ? 'red' : item.days_until <= 3 ? 'orange' : 'blue'} style={{ fontSize: 12 }}>
                        {item.days_until === 0 ? '今天生日！' : `${item.days_until} 天後`}
                      </Tag>
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>
          )}
          {overdueCustomers.length > 0 && (
            <Col xs={24} md={12}>
              <Card
                title={
                  <div className="card-title-bar">
                    <WarningOutlined style={{ color: '#f59e0b' }} />
                    久未回訪
                    <Badge count={overdueCustomers.length} style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', marginLeft: 4 }} />
                  </div>
                }
                size="small"
              >
                <Space direction="vertical" style={{ width: '100%' }} size={6}>
                  {overdueCustomers.map((c) => (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.06)',
                    }}>
                      <Space>
                        <span style={{ fontSize: 16 }}>💇</span>
                        <div>
                          <Text strong style={{ fontSize: 13 }}>{c.name}</Text>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.phone}</div>
                        </div>
                      </Space>
                      <Tag color="orange" style={{ fontSize: 12 }}>
                        逾期 {Math.abs(c.daysLeft)} 天
                      </Tag>
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>
          )}
        </Row>
      )}

      {/* 今日預約 */}
      <Card title={<div className="card-title-bar">今日預約列表</div>}
        extra={<Text style={{ color: '#6366f1', fontSize: 13, fontWeight: 600 }}>共 {bookings.length} 筆</Text>}>
        <Table dataSource={bookings} columns={columns} rowKey="id" pagination={false} size="middle" />
      </Card>
    </div>
  );
}
