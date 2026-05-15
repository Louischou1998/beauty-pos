import { useMemo, useState } from 'react';
import {
  Table, Tag, Button, Modal, Form, Input, InputNumber, Select,
  Space, Typography, Progress, Drawer, Timeline, Popconfirm,
  Alert, Badge, message,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  MinusCircleOutlined, HistoryOutlined, WarningOutlined,
} from '@ant-design/icons';
import { useApi } from '../../hooks/useApi';
import { inventoryApi } from '../../api/inventory';
import { parseApiError } from '../../utils/apiError';
import ExcelImportButtons from '../../components/ExcelImportButtons';
import {
  parseExcelFile,
  downloadXlsxTemplate,
  rowToInventory,
  INVENTORY_TEMPLATE_HEADERS,
  importRowsSequential,
} from '../../utils/excelImport';

const { Text } = Typography;

const CATEGORIES = ['美髮', '洗護', '染後護理', '頭皮護理', '造型'];

export default function Inventory() {
  const { data: items, loading, setData: setItems } = useApi(inventoryApi.list, { deps: [] });
  const [activeCategory, setActiveCategory] = useState('美髮');
  const [searchText, setSearchText] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [useOpen, setUseOpen] = useState(false);
  const [useTarget, setUseTarget] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [form] = Form.useForm();
  const [useForm] = Form.useForm();
  const [importing, setImporting] = useState(false);

  const lowStockItems = useMemo(() => (items ?? []).filter((i) => i.is_low), [items]);
  const filteredItems = useMemo(() => {
    const list = items ?? [];
    return list.filter((item) => {
      const categoryOk = activeCategory === '全部' || item.category === activeCategory;
      const keyword = searchText.trim().toLowerCase();
      const searchOk = !keyword || item.name.toLowerCase().includes(keyword);
      return categoryOk && searchOk;
    });
  }, [items, activeCategory, searchText]);

  const openEdit = (item) => { setEditItem(item); form.setFieldsValue(item); setAddOpen(true); };
  const openUse = (item) => { setUseTarget(item); useForm.resetFields(); setUseOpen(true); };

  const openHistory = async (item) => {
    setHistoryTarget(item);
    try {
      const data = await inventoryApi.getUsage(item.id);
      setHistoryData(data);
    } catch (err) {
      const { message: errMsg } = parseApiError(err, '讀取使用記錄失敗');
      setHistoryData([]);
      message.error(errMsg);
    }
    setHistoryOpen(true);
  };

  const handleSave = async (values) => {
    try {
      if (editItem) {
        const updated = await inventoryApi.update(editItem.id, values);
        setItems((prev) => prev.map((i) => i.id === editItem.id ? { ...updated, is_low: Number(updated.quantity) <= Number(updated.low_stock_threshold) } : i));
      } else {
        const created = await inventoryApi.create(values);
        setItems((prev) => [...prev, { ...created, is_low: Number(created.quantity) <= Number(created.low_stock_threshold) }]);
      }
    } catch (err) {
      const { message: errMsg } = parseApiError(err, editItem ? '更新失敗' : '新增失敗');
      message.error(errMsg);
      return;
    }
    message.success(editItem ? '已更新' : '已新增');
    setAddOpen(false);
    setEditItem(null);
    form.resetFields();
  };

  const handleUse = async (values) => {
    try {
      const updated = await inventoryApi.use(useTarget.id, values);
      setItems((prev) => prev.map((i) => i.id === useTarget.id ? { ...updated, is_low: Number(updated.quantity) <= Number(updated.low_stock_threshold) } : i));
    } catch (err) {
      const { message: errMsg } = parseApiError(err, '扣料失敗');
      message.error(errMsg);
      return;
    }
    message.success(`已扣除 ${values.quantity_used} ${useTarget.unit}`);
    setUseOpen(false);
  };

  const handleDelete = async (id) => {
    try { await inventoryApi.remove(id); } catch (err) { message.warning(parseApiError(err, '刪除失敗').message); }
    setItems((prev) => prev.filter((i) => i.id !== id));
    message.success('已刪除');
  };

  const downloadInventoryTemplate = () => {
    downloadXlsxTemplate(
      '庫存匯入範本.xlsx',
      INVENTORY_TEMPLATE_HEADERS,
      [['範例染劑', '美髮', '瓶', 12, 3, 80]],
    );
  };

  const handleInventoryExcelImport = async (file) => {
    setImporting(true);
    try {
      const rows = await parseExcelFile(file);
      const payloads = rows
        .map(rowToInventory)
        .filter((p) => p.name && Number.isFinite(p.quantity));
      if (payloads.length === 0) {
        message.warning('沒有可匯入的資料（請確認「品項名稱」「現有庫存」）');
        return;
      }
      const { ok, errors } = await importRowsSequential(payloads, async (payload) => {
        const created = await inventoryApi.create(payload);
        setItems((prev) => [
          ...(prev ?? []),
          { ...created, is_low: Number(created.quantity) <= Number(created.low_stock_threshold) },
        ]);
      });
      if (errors.length) {
        message.warning(`匯入完成：成功 ${ok} 筆，失敗 ${errors.length} 筆`);
      } else {
        message.success(`已匯入 ${ok} 筆庫存品項`);
      }
    } catch (err) {
      message.error(err?.message || '無法解析 Excel');
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    {
      title: '品項',
      key: 'name',
      render: (_, r) => (
        <Space>
          {r.is_low && <WarningOutlined style={{ color: '#ff4d4f' }} />}
          <Text strong={r.is_low} style={{ color: r.is_low ? '#ff4d4f' : undefined }}>{r.name}</Text>
        </Space>
      ),
    },
    {
      title: '分類',
      dataIndex: 'category',
      key: 'category',
      render: (v) => <Tag>{v}</Tag>,
      filters: CATEGORIES.map((c) => ({ text: c, value: c })),
      onFilter: (v, r) => r.category === v,
    },
    {
      title: '庫存',
      key: 'quantity',
      render: (_, r) => {
        const pct = Math.min(100, Math.round((Number(r.quantity) / (Number(r.low_stock_threshold) * 3)) * 100));
        return (
          <Space direction="vertical" size={2} style={{ width: 120 }}>
            <Text style={{ color: r.is_low ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
              {Number(r.quantity)} {r.unit}
            </Text>
            <Progress percent={pct} size="small" showInfo={false}
              strokeColor={r.is_low ? '#ff4d4f' : '#52c41a'} />
          </Space>
        );
      },
    },
    {
      title: '警戒值',
      key: 'threshold',
      render: (_, r) => `${Number(r.low_stock_threshold)} ${r.unit}`,
    },
    {
      title: '單位成本',
      dataIndex: 'cost_per_unit',
      key: 'cost_per_unit',
      render: (v) => `$${Number(v)}`,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<MinusCircleOutlined />} onClick={() => openUse(r)}>耗用</Button>
          <Button size="small" icon={<HistoryOutlined />} onClick={() => openHistory(r)}>記錄</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>編輯</Button>
          <Popconfirm title="確認刪除？" onConfirm={() => handleDelete(r.id)} okText="確認" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-wrap">
      {lowStockItems.length > 0 && (
        <Alert
          type="error" showIcon icon={<WarningOutlined />}
          message={`低庫存警示：${lowStockItems.map((i) => i.name).join('、')} 庫存不足`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 16 }} align="center">
        <Space>
          <div className="page-title-text">庫存耗材</div>
          {lowStockItems.length > 0 && <Badge count={lowStockItems.length} color="red" className="pulse-dot" />}
        </Space>
        <Space wrap>
          <ExcelImportButtons
            disabled={importing || loading}
            onDownloadTemplate={downloadInventoryTemplate}
            onSelectFile={handleInventoryExcelImport}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditItem(null); form.resetFields(); setAddOpen(true); }}>
            新增品項
          </Button>
        </Space>
      </Space>

      <Space wrap style={{ marginBottom: 12 }}>
        <Input
          placeholder="搜尋品項名稱..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 220 }}
        />
        {['全部', ...CATEGORIES].map((cat) => (
          <Button
            key={cat}
            size="small"
            type={activeCategory === cat ? 'primary' : 'default'}
            className="interactive-pop"
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </Space>

      <Table dataSource={filteredItems} columns={columns} rowKey="id" loading={loading}
        rowClassName={(r) => r.is_low ? 'ant-table-row-danger' : ''}
      />

      {/* 新增/編輯 Modal */}
      <Modal destroyOnClose title={editItem ? '編輯品項' : '新增品項'} open={addOpen}
        onCancel={() => { setAddOpen(false); setEditItem(null); form.resetFields(); }}
        onOk={() => form.submit()} okText="儲存" cancelText="取消">
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="品項名稱" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="分類">
            <Select>{CATEGORIES.map((c) => <Select.Option key={c} value={c}>{c}</Select.Option>)}</Select>
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="quantity" label="現有庫存" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="unit" label="單位" initialValue="個" style={{ width: 80 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="low_stock_threshold" label="警戒值" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="cost_per_unit" label="單位成本 ($)">
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 耗用 Modal */}
      <Modal destroyOnClose title={`耗用 — ${useTarget?.name}`} open={useOpen}
        onCancel={() => setUseOpen(false)} onOk={() => useForm.submit()} okText="確認扣除" cancelText="取消">
        <Form form={useForm} layout="vertical" onFinish={handleUse}>
          <Form.Item name="quantity_used" label={`耗用數量 (${useTarget?.unit ?? ''})`} rules={[{ required: true }]}>
            <InputNumber min={0.01} max={Number(useTarget?.quantity ?? 0)} step={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="備註">
            <Input placeholder="服務項目或說明" />
          </Form.Item>
        </Form>
        {useTarget && (
          <Alert type="info" message={`目前庫存：${Number(useTarget.quantity)} ${useTarget.unit}`} showIcon />
        )}
      </Modal>

      {/* 使用紀錄 Drawer */}
      <Drawer destroyOnClose title={`${historyTarget?.name} — 使用記錄`} open={historyOpen}
        onClose={() => setHistoryOpen(false)} width={400}>
        {historyData.length === 0
          ? <Text type="secondary">尚無記錄</Text>
          : (
            <Timeline items={historyData.map((h) => ({
              color: 'blue',
              children: (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(h.used_at).toLocaleString('zh-TW')}
                  </Text>
                  <div><Text strong>耗用：{Number(h.quantity_used)} {historyTarget?.unit}</Text></div>
                  {h.note && <Text type="secondary">{h.note}</Text>}
                </div>
              ),
            }))} />
          )
        }
      </Drawer>
    </div>
  );
}
