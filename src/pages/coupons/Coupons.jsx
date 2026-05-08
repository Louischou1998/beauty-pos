import { useMemo, useState } from 'react';
import {
  Table, Tag, Button, Modal, Form, Input, InputNumber, Select,
  Space, Typography, Alert, message, Statistic, Row, Col,
} from 'antd';
import { WalletOutlined, GiftOutlined, SearchOutlined } from '@ant-design/icons';
import { useApi } from '../../hooks/useApi';
import { customersApi } from '../../api/customers';
import { parseApiError } from '../../utils/apiError';

const { Text } = Typography;

export default function Coupons() {
  const { data: customers, loading, error, setData } = useApi(customersApi.list, { deps: [] });
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [form] = Form.useForm();

  const customerList = useMemo(() => customers ?? [], [customers]);
  const filteredCustomers = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return customerList;
    return customerList.filter((c) =>
      c.name.toLowerCase().includes(key) || String(c.phone ?? '').toLowerCase().includes(key)
    );
  }, [customerList, keyword]);

  const totalBalance = useMemo(
    () => customerList.reduce((sum, c) => sum + Number(c.balance ?? 0), 0),
    [customerList]
  );
  const totalPoints = useMemo(
    () => customerList.reduce((sum, c) => sum + Number(c.points ?? 0), 0),
    [customerList]
  );
  const memberCount = customerList.length;

  const openTopup = (customer) => {
    setSelectedCustomer(customer);
    form.setFieldsValue({ type: 'balance', amount: 1000 });
    setModalOpen(true);
  };

  const handleTopup = async (values) => {
    if (!selectedCustomer) return;
    try {
      const updated = await customersApi.topup(selectedCustomer.id, values);
      setData((prev) => prev.map((c) => (c.id === selectedCustomer.id ? updated : c)));
      message.success('已完成預先儲值 / 加點');
      setModalOpen(false);
      form.resetFields();
    } catch (err) {
      message.error(parseApiError(err, '儲值失敗').message);
    }
  };

  const columns = [
    {
      title: '顧客',
      dataIndex: 'name',
      key: 'name',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.phone || '—'}</Text>
        </Space>
      ),
    },
    { title: '等級', dataIndex: 'level', key: 'level', render: (v) => <Tag>{v}</Tag> },
    {
      title: '儲值餘額',
      dataIndex: 'balance',
      key: 'balance',
      render: (v) => <Text strong style={{ color: '#722ed1' }}>${Number(v).toLocaleString()}</Text>,
    },
    {
      title: '點數',
      dataIndex: 'points',
      key: 'points',
      render: (v) => <Text>{Number(v)} 點</Text>,
    },
    {
      title: '累積消費',
      dataIndex: 'total_spent',
      key: 'total_spent',
      render: (v) => `$${Number(v).toLocaleString()}`,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, r) => (
        <Button type="primary" size="small" onClick={() => openTopup(r)}>
          儲值 / 加點
        </Button>
      ),
    },
  ];

  return (
    <div className="page-wrap">
      {error && <Alert type="error" message="資料載入失敗，請確認 API 與登入狀態" showIcon style={{ marginBottom: 12 }} />}
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={8}><Statistic title="會員數" value={memberCount} /></Col>
        <Col span={8}><Statistic title="儲值總額" prefix="$" value={totalBalance} precision={0} /></Col>
        <Col span={8}><Statistic title="點數總量" value={totalPoints} suffix="點" /></Col>
      </Row>
      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 16 }}>
        <div className="page-title-text">客戶預先儲值管理</div>
        <Input
          placeholder="搜尋顧客姓名或電話"
          prefix={<SearchOutlined />}
          style={{ width: 240 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </Space>
      <Table dataSource={filteredCustomers} columns={columns} rowKey="id" loading={loading} />

      <Modal title={`儲值 / 加點 — ${selectedCustomer?.name ?? ''}`} open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()} okText="確認" cancelText="取消">
        <Form form={form} layout="vertical" onFinish={handleTopup}>
          <Form.Item name="type" label="類型" initialValue="balance" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="balance"><WalletOutlined /> 儲值金</Select.Option>
              <Select.Option value="points"><GiftOutlined /> 點數</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="金額 / 點數" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
