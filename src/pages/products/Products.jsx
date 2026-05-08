import { useState } from 'react';
import {
  Table, Tag, Button, Modal, Form, Input, InputNumber,
  Space, Typography, Popconfirm, Alert, message, Select,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BarcodeOutlined } from '@ant-design/icons';
import { useApi } from '../../hooks/useApi';
import { productsApi } from '../../api/products';
import { parseApiError } from '../../utils/apiError';

const { Text } = Typography;
const CATEGORIES = ['洗髮', '護髮', '造型', '染燙', '頭皮保養'];

export default function Products() {
  const { data: products, loading, error, setData } = useApi(productsApi.list, null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (r) => { setEditing(r); form.setFieldsValue(r); setModalOpen(true); };

  const handleSave = async (values) => {
    try {
      if (editing) {
        const u = await productsApi.update(editing.id, values);
        setData((p) => p.map((x) => x.id === editing.id ? u : x));
      } else {
        const c = await productsApi.create(values);
        setData((p) => [...p, c]);
      }
      message.success(editing ? '已更新' : '已新增');
      setModalOpen(false);
      form.resetFields();
    } catch (err) {
      const { message: errMsg } = parseApiError(err, editing ? '更新失敗' : '新增失敗');
      message.error(errMsg);
    }
  };

  const handleDelete = async (id) => {
    try {
      await productsApi.remove(id);
      setData((p) => p.filter((x) => x.id !== id));
      message.success('已刪除');
    } catch (err) {
      message.error(parseApiError(err, '刪除失敗').message);
    }
  };

  const columns = [
    { title: '商品名稱', dataIndex: 'name', key: 'name', render: (v) => <Text strong>{v}</Text> },
    { title: '分類', dataIndex: 'category', key: 'category', render: (v) => <Tag>{v}</Tag> },
    { title: '售價', dataIndex: 'price', key: 'price', render: (v) => `$${Number(v).toLocaleString()}`, sorter: (a, b) => a.price - b.price },
    { title: '成本', dataIndex: 'cost', key: 'cost', render: (v) => <Text type="secondary">${Number(v).toLocaleString()}</Text> },
    {
      title: '毛利率', key: 'margin',
      render: (_, r) => {
        const margin = r.price > 0 ? Math.round((1 - r.cost / r.price) * 100) : 0;
        return <Text style={{ color: margin >= 50 ? '#52c41a' : margin >= 30 ? '#faad14' : '#ff4d4f' }}>{margin}%</Text>;
      },
    },
    {
      title: '庫存', dataIndex: 'stock', key: 'stock',
      render: (v) => <Tag color={v <= 5 ? 'red' : v <= 15 ? 'orange' : 'green'}>{v} 件</Tag>,
    },
    { title: '條碼', dataIndex: 'barcode', key: 'barcode', render: (v) => v ? <Text code>{v}</Text> : '—' },
    {
      title: '操作', key: 'actions',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>編輯</Button>
          <Popconfirm title="確認下架？" onConfirm={() => handleDelete(r.id)} okText="確認" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-wrap">
      {error && (
        <Alert
          type="error"
          message="商品資料載入失敗，請確認 API 與登入狀態"
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}
      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 16 }}>
        <div className="page-title-text">商品管理</div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增商品</Button>
      </Space>
      <Table dataSource={products ?? []} columns={columns} rowKey="id" loading={loading} />

      <Modal title={editing ? '編輯商品' : '新增商品'} open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()} okText="儲存" cancelText="取消">
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="商品名稱" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="分類">
            <Select>{CATEGORIES.map((c) => <Select.Option key={c} value={c}>{c}</Select.Option>)}</Select>
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="price" label="售價" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0} prefix="$" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="cost" label="成本" style={{ flex: 1 }}>
              <InputNumber min={0} prefix="$" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="stock" label="初始庫存">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="barcode" label="條碼">
            <Input prefix={<BarcodeOutlined />} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
