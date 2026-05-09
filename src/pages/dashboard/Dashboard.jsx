import { useMemo } from 'react';
import { Card, Col, Row, Table, Tag, Typography, Alert } from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, TeamOutlined,
  WalletOutlined, RiseOutlined,
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

export default function Dashboard() {
  const today = dayjs().format('YYYY-MM-DD');
  const { data: summary, error: summaryError } = useApi(() => reportsApi.summary('week'), { deps: [] });
  const { data: rawBookings, error: bookingsError } = useApi(() => bookingsApi.list(today), { deps: [today] });
  const { data: customers, error: customersError } = useApi(customersApi.list, { deps: [] });
  const { data: staffs, error: staffsError } = useApi(staffApi.list, { deps: [] });
  const { data: services, error: servicesError } = useApi(servicesApi.list, { deps: [] });

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
  const stats = [
    { title: '近7日營收', value: `$${Number(summary?.total_revenue ?? 0).toLocaleString()}`, sub: '資料來源：DB', icon: <WalletOutlined />, grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)', glow: 'rgba(99,102,241,.35)' },
    { title: '今日預約', value: bookings.length, sub: '筆', icon: <CalendarOutlined />, grad: 'linear-gradient(135deg,#06b6d4,#6366f1)', glow: 'rgba(6,182,212,.3)' },
    { title: '待確認', value: pendingCount, sub: '筆需處理', icon: <ClockCircleOutlined />, grad: 'linear-gradient(135deg,#f59e0b,#f43f5e)', glow: 'rgba(245,158,11,.3)' },
    { title: '近7日到客', value: Number(summary?.total_bookings ?? 0), sub: '人次', icon: <TeamOutlined />, grad: 'linear-gradient(135deg,#10b981,#06b6d4)', glow: 'rgba(16,185,129,.3)' },
  ];

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

      {/* 今日預約 */}
      <Card title={<div className="card-title-bar">今日預約列表</div>}
        extra={<Text style={{ color: '#6366f1', fontSize: 13, fontWeight: 600 }}>共 {bookings.length} 筆</Text>}>
        <Table dataSource={bookings} columns={columns} rowKey="id" pagination={false} size="middle" />
      </Card>
    </div>
  );
}
