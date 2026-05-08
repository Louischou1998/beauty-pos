import { useState, useCallback, useMemo } from 'react';
import {
  Card, Col, Row, Statistic, Table, Typography,
  Select, Space, Progress, Alert, Spin,
} from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, LabelList,
} from 'recharts';
import { useApi } from '../../hooks/useApi';
import { useWebSocket } from '../../hooks/useWebSocket';
import { reportsApi } from '../../api/reports';
import { parseApiError } from '../../utils/apiError';

const { Text } = Typography;

const PERIODS = [
  { value: 'week', label: '本週' },
  { value: 'month', label: '本月' },
  { value: 'quarter', label: '本季' },
];

const COLORS = ['#ff69b4', '#9370db', '#40e0d0', '#90ee90', '#ffa500'];

const renderPieLabel = ({ name, percent, value }) => {
  if (!value || value <= 0 || percent <= 0.01) return '';
  return `${name} ${(percent * 100).toFixed(0)}%`;
};

const staffColumns = [
  {
    title: '技師',
    key: 'name',
    render: (_, r) => (
      <Space>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color }} />
        <Text strong>{r.name}</Text>
      </Space>
    ),
  },
  { title: '預約數', dataIndex: 'bookings', key: 'bookings', sorter: (a, b) => a.bookings - b.bookings },
  {
    title: '業績', dataIndex: 'revenue', key: 'revenue',
    render: (v) => `$${Number(v).toLocaleString()}`,
    sorter: (a, b) => a.revenue - b.revenue, defaultSortOrder: 'descend',
  },
  {
    title: '提成', dataIndex: 'commission', key: 'commission',
    render: (v) => <Text style={{ color: '#52c41a' }}>${Number(v).toLocaleString()}</Text>,
  },
  {
    title: '佔比', key: 'ratio',
    render: (_, r) => {
      const list = r._all ?? [];
      const total = list.reduce((s, x) => s + Number(x.revenue), 0) || 1;
      const pct = Math.round((Number(r.revenue) / total) * 100);
      return <Progress percent={pct} size="small" strokeColor={r.color} />;
    },
  },
];

export default function Reports() {
  const [period, setPeriod] = useState('week');

  const { data: summary, loading: l1, refetch: r1, error: e1 } = useApi(() => reportsApi.summary(period), null, [period]);
  const { data: daily, loading: l2, refetch: r2, error: e2 } = useApi(() => reportsApi.daily(period), null, [period]);
  const { data: dailyStaff, loading: l3, refetch: r3, error: e3 } = useApi(() => reportsApi.dailyStaff(period), null, [period]);
  const { data: staffPerf, loading: l4, refetch: r4, error: e4 } = useApi(() => reportsApi.staff(period), null, [period]);
  const { data: categories, loading: l5, refetch: r5, error: e5 } = useApi(() => reportsApi.categories(period), null, [period]);

  const refetchAll = useCallback(() => { r1(); r2(); r3(); r4(); r5(); }, [r1, r2, r3, r4, r5]);

  // 有新訂單時自動重新整理報表
  useWebSocket('/ws/bookings', (msg) => {
    if (msg.event === 'booking_created') refetchAll();
  });

  const loading = l1 || l2 || l3 || l4 || l5;
  const catWithColors = (categories ?? []).map((c, i) => ({ ...c, color: COLORS[i % COLORS.length] }));
  const staffWithRef = (staffPerf ?? []).map((s) => ({ ...s, _all: staffPerf ?? [] }));
  const staffColorMap = new Map((staffPerf ?? []).map((s) => [s.name, s.color || COLORS[0]]));

  const dailyFormatted = (daily ?? []).map((d) => ({
    ...d,
    date: typeof d.date === 'string' ? d.date.slice(5).replace('-', '/') : d.date,
  }));
  const staffStackData = useMemo(() => {
    const map = new Map();
    (dailyStaff ?? []).forEach((row) => {
      const dateKey = String(row.date).slice(5).replace('-', '/');
      if (!map.has(dateKey)) map.set(dateKey, { date: dateKey });
      const target = map.get(dateKey);
      target[row.staff_name] = Number(row.revenue) || 0;
    });
    return Array.from(map.values());
  }, [dailyStaff]);
  const staffNames = useMemo(() => {
    const totalMap = new Map();
    (dailyStaff ?? []).forEach((row) => {
      totalMap.set(row.staff_name, (totalMap.get(row.staff_name) ?? 0) + (Number(row.revenue) || 0));
    });
    return Array.from(totalMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [dailyStaff]);
  const staffStackDataWithTotals = useMemo(
    () => staffStackData.map((d) => {
      const total = staffNames.reduce((sum, name) => sum + Number(d[name] ?? 0), 0);
      const topKey = [...staffNames].reverse().find((name) => Number(d[name] ?? 0) > 0) ?? null;
      const row = {
        ...d,
        __total: total,
        __topKey: topKey,
      };
      if (topKey) {
        row[`__label_${topKey}`] = total;
      }
      return row;
    }),
    [staffStackData, staffNames]
  );

  return (
    <div className="page-wrap">
      {(e1 || e2 || e3 || e4 || e5) && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message={parseApiError(e1 || e2 || e3 || e4 || e5, '報表讀取失敗').message}
        />
      )}

      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 16 }}>
        <div className="page-title-text">業績報表</div>
        <Select value={period} onChange={setPeriod} style={{ width: 100 }}>
          {PERIODS.map((p) => <Select.Option key={p.value} value={p.value}>{p.label}</Select.Option>)}
        </Select>
      </Space>

      <Spin spinning={loading}>
        {/* KPI */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic title="總營收" value={summary?.total_revenue ?? 0} prefix="$"
                valueStyle={{ color: '#722ed1' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="總預約數" value={summary?.total_bookings ?? 0} suffix="筆" /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="客單價" value={summary?.avg_per_booking ?? 0} prefix="$" /></Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="總提成支出"
                value={(staffPerf ?? []).reduce((s, x) => s + Number(x.commission), 0)}
                prefix="$" valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          {/* 每日營收（員工金額堆疊） */}
          <Col span={16}>
            <Card title={<div className="card-title-bar">每日員工營收（金額堆疊）</div>}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={staffStackDataWithTotals} margin={{ top: 28, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(v, name) => [`$${Number(v).toLocaleString()}`, `${name} 營收`]} />
                  {staffNames.map((name, idx) => (
                    <Bar
                      key={name}
                      dataKey={name}
                      stackId="daily-staff-share"
                      fill={staffColorMap.get(name) ?? COLORS[idx % COLORS.length]}
                    >
                      <LabelList
                        dataKey={`__label_${name}`}
                        position="top"
                        formatter={(v) => (Number(v) > 0 ? `$${Number(v).toLocaleString()}` : '')}
                        style={{ fill: '#374151', fontSize: 12 }}
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* 服務項目佔比 */}
          <Col span={8}>
            <Card title={<div className="card-title-bar">美髮服務項目佔比</div>}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={catWithColors} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85} dataKey="value"
                    label={renderPieLabel}
                    labelLine={false}>
                    {catWithColors.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, '營收']} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* 預約數趨勢 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card title={<div className="card-title-bar">每日預約數</div>}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dailyFormatted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="bookings" stroke="#1677ff" strokeWidth={2} dot={{ r: 4 }} name="預約數" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* 技師業績 */}
        <Card title={<div className="card-title-bar">技師業績排行</div>}>
          <Table dataSource={staffWithRef} columns={staffColumns}
            rowKey="id" pagination={false} size="middle" />
        </Card>
      </Spin>
    </div>
  );
}
