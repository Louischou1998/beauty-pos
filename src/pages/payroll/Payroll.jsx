import { useCallback, useState } from 'react';
import {
  Card, Col, Row, Table, Tag, Typography, Space, DatePicker,
  Avatar, Statistic, Progress, Alert, Modal,
} from 'antd';
import dayjs from 'dayjs';
import { useApi } from '../../hooks/useApi';
import { commissionsApi } from '../../api/commissions';
import { parseApiError } from '../../utils/apiError';

const { Text } = Typography;

export default function Payroll() {
  const [month, setMonth] = useState(() => dayjs());
  const [detailStaff, setDetailStaff] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const monthStr = month.format('YYYY-MM');

  const fetchPayroll = useCallback(
    () => commissionsApi.payroll(monthStr),
    [monthStr]
  );
  const fetchDetails = useCallback(
    () => (detailStaff ? commissionsApi.list({ staff_id: detailStaff.staff_id, month: monthStr }) : Promise.resolve([])),
    [detailStaff, monthStr]
  );

  const { data: payroll, loading, error: payrollError } = useApi(
    fetchPayroll, null, [monthStr]
  );
  const { data: details, error: detailError } = useApi(
    fetchDetails,
    null,
    [detailStaff?.staff_id, monthStr]
  );

  const openDetail = (row) => { setDetailStaff(row); setDetailOpen(true); };

  const totalRevenue = (payroll ?? []).reduce((s, r) => s + r.revenue, 0);

  const columns = [
    {
      title: '技師', key: 'name',
      render: (_, r) => (
        <Space>
          <Avatar style={{ background: r.color }}>{r.staff_name[0]}</Avatar>
          <Text strong>{r.staff_name}</Text>
        </Space>
      ),
    },
    { title: '服務筆數', dataIndex: 'transactions', key: 'transactions', sorter: (a, b) => a.transactions - b.transactions },
    {
      title: '業績', dataIndex: 'revenue', key: 'revenue',
      render: (v, r) => {
        const pct = totalRevenue > 0 ? Math.round(v / totalRevenue * 100) : 0;
        return (
          <Space direction="vertical" size={2}>
            <Text strong>${Number(v).toLocaleString()}</Text>
            <Progress
              percent={pct}
              size="small"
              strokeColor={r.color}
              style={{ width: 100 }}
              showInfo={false}
            />
          </Space>
        );
      },
      sorter: (a, b) => a.revenue - b.revenue,
      defaultSortOrder: 'descend',
    },
    {
      title: '抽成合計', dataIndex: 'commission', key: 'commission',
      render: (v) => <Text strong style={{ color: '#52c41a' }}>${Number(v).toLocaleString()}</Text>,
    },
    {
      title: '指定加成', dataIndex: 'designated_commission', key: 'designated_commission',
      render: (v) => <Tag color="gold">${Number(v).toLocaleString()}</Tag>,
    },
    {
      title: '操作', key: 'actions',
      render: (_, r) => <a onClick={() => openDetail(r)}>明細</a>,
    },
  ];

  const detailColumns = [
    { title: '日期', dataIndex: 'created_at', key: 'date', render: (v) => String(v).slice(0, 10) },
    {
      title: '類型', dataIndex: 'type', key: 'type',
      render: (v, r) => (
        <Space>
          <Tag color={v === 'service' ? 'blue' : 'green'}>{v === 'service' ? '服務' : '商品'}</Tag>
          {r.is_designated && <Tag color="gold">指定</Tag>}
        </Space>
      ),
    },
    { title: '項目', dataIndex: 'item_name', key: 'item_name' },
    { title: '業績', dataIndex: 'base_amount', key: 'base_amount', render: (v) => `$${Number(v).toLocaleString()}` },
    { title: '抽成率', dataIndex: 'commission_rate', key: 'rate', render: (v) => `${Number(v)}%` },
    {
      title: '抽成金額', dataIndex: 'commission_amount', key: 'amount',
      render: (v) => <Text style={{ color: '#52c41a' }}>${Number(v).toLocaleString()}</Text>,
    },
  ];

  return (
    <div className="page-wrap">
      {(payrollError || detailError) && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message={parseApiError(payrollError || detailError, '薪資資料讀取失敗').message}
        />
      )}

      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 16 }}>
        <div className="page-title-text">薪資 / 抽成結算</div>
        <DatePicker picker="month" value={month} onChange={setMonth} allowClear={false} />
      </Space>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card><Statistic title="本月總業績" value={totalRevenue} prefix="$" valueStyle={{ color: '#722ed1' }} /></Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="總抽成支出"
              value={(payroll ?? []).reduce((s, r) => s + r.commission, 0)}
              prefix="$" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="指定加成合計"
              value={(payroll ?? []).reduce((s, r) => s + r.designated_commission, 0)}
              prefix="$" valueStyle={{ color: '#d48806' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="員工人數" value={(payroll ?? []).length} suffix="人" /></Card>
        </Col>
      </Row>

      <Card title={<div className="card-title-bar">技師業績與抽成明細</div>}>
        <Table dataSource={payroll ?? []} columns={columns} rowKey="staff_id" loading={loading} pagination={false} />
      </Card>

      <Modal destroyOnClose title={`${detailStaff?.staff_name} — ${monthStr} 抽成明細`}
        open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={700}>
        <Table dataSource={details ?? []} columns={detailColumns} rowKey="id" size="small"
          summary={() => {
            const total = (details ?? []).reduce((s, r) => s + Number(r.commission_amount), 0);
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={5}><Text strong>合計</Text></Table.Summary.Cell>
                <Table.Summary.Cell>
                  <Text strong style={{ color: '#52c41a' }}>${total.toLocaleString()}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Modal>
    </div>
  );
}
