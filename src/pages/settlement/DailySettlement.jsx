import { useState } from 'react';
import {
  Card, Col, Row, Statistic, Table, Tag, Typography, DatePicker,
  Space, Button, Alert,
} from 'antd';
import { PrinterOutlined, WalletOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApi } from '../../hooks/useApi';
import { paymentsApi } from '../../api/payments';
import { parseApiError } from '../../utils/apiError';

const { Text } = Typography;

const METHOD_CONFIG = {
  cash: { label: '現金', color: '#52c41a' },
  card: { label: '刷卡', color: '#1677ff' },
  line_pay: { label: 'LINE Pay', color: '#00b900' },
  store_value: { label: '儲值金', color: '#722ed1' },
};

export default function DailySettlement() {
  const [date, setDate] = useState(() => dayjs());
  const dateStr = date.format('YYYY-MM-DD');

  const { data: summary, loading: l1, error: summaryError } = useApi(
    () => paymentsApi.dailySummary(dateStr), null, [dateStr]
  );
  const { data: transactions, loading: l2, error: txError } = useApi(
    () => paymentsApi.list(dateStr), null, [dateStr]
  );

  const columns = [
    { title: '時間', dataIndex: 'created_at', key: 'time', render: (v) => v?.slice(11, 16) },
    { title: '訂單', dataIndex: 'booking_id', key: 'booking_id', render: (v) => `#${v}` },
    {
      title: '付款方式', dataIndex: 'method', key: 'method',
      render: (v) => <Tag color={METHOD_CONFIG[v]?.color ?? 'default'}>{METHOD_CONFIG[v]?.label ?? v}</Tag>,
    },
    {
      title: '金額', dataIndex: 'amount', key: 'amount',
      render: (v) => <Text strong>${Number(v).toLocaleString()}</Text>,
    },
    { title: '備註', dataIndex: 'note', key: 'note', render: (v) => <Text type="secondary">{v}</Text> },
  ];

  return (
    <div className="page-wrap">
      {(summaryError || txError) && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message={parseApiError(summaryError || txError, '日結資料讀取失敗').message}
        />
      )}

      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 16 }}>
        <Space>
          <div className="page-title-text">日結報表</div>
          <DatePicker value={date} onChange={setDate} allowClear={false} />
        </Space>
        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>列印</Button>
      </Space>

      {/* 付款方式統計 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="當日總收入" value={summary?.total ?? 0}
              prefix={<WalletOutlined />} suffix="元"
              valueStyle={{ color: '#722ed1', fontSize: 24 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="交易筆數" value={summary?.transaction_count ?? 0} suffix="筆" /></Card>
        </Col>
        <Col span={12}>
          <Card title={<div className="card-title-bar">各付款方式</div>}>
            <Row gutter={8}>
              {(summary?.by_method ?? []).map((m) => (
                <Col span={12} key={m.method} style={{ marginBottom: 8 }}>
                  <Space>
                    <Tag color={METHOD_CONFIG[m.method]?.color ?? 'default'} style={{ margin: 0 }}>
                      {METHOD_CONFIG[m.method]?.label ?? m.method}
                    </Tag>
                    <Text strong>${Number(m.total).toLocaleString()}</Text>
                    <Text type="secondary">({m.count}筆)</Text>
                  </Space>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 現金盤點 */}
      <Card title={<div className="card-title-bar">現金盤點</div>} style={{ marginBottom: 24 }}>
        <Row gutter={24}>
          {['cash'].map(() => {
            const cashMethod = (summary?.by_method ?? []).find((m) => m.method === 'cash');
            const expected = cashMethod ? Number(cashMethod.total) : 0;
            return (
              <Col span={8} key="cash">
                <Statistic title="系統現金應收" value={expected} prefix="$" />
                <Text type="secondary" style={{ fontSize: 12 }}>請核對實際收到的現金金額</Text>
              </Col>
            );
          })}
          <Col span={8}>
            <Statistic title="刷卡 + 電子支付"
              value={(summary?.by_method ?? []).filter((m) => m.method !== 'cash').reduce((s, m) => s + Number(m.total), 0)}
              prefix="$" />
          </Col>
          <Col span={8}>
            <Statistic title="儲值金扣抵"
              value={(summary?.by_method ?? []).find((m) => m.method === 'store_value')?.total ?? 0}
              prefix="$" valueStyle={{ color: '#722ed1' }} />
          </Col>
        </Row>
      </Card>

      {/* 交易明細 */}
      <Card title={<div className="card-title-bar">交易明細</div>}>
        <Table dataSource={transactions ?? []} columns={columns} rowKey="id"
          loading={l1 || l2} pagination={{ pageSize: 20 }} size="middle" />
      </Card>
    </div>
  );
}
