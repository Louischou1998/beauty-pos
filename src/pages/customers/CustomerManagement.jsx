import { useState } from 'react';
import ExcelImportButtons from '../../components/ExcelImportButtons';
import {
  parseExcelFile,
  downloadXlsxTemplate,
  rowToCustomer,
  CUSTOMER_TEMPLATE_HEADERS,
  importRowsSequential,
} from '../../utils/excelImport';
import {
  Table, Tag, Button, Modal, Form, Input, Select, InputNumber,
  Space, Typography, Tabs, Descriptions, Statistic, Row, Col,
  Popconfirm, Alert, message, Badge, Tooltip, Timeline, Spin,
  DatePicker, Card, Empty,
} from 'antd';
import {
  PlusOutlined, EditOutlined, WalletOutlined, GiftOutlined,
  UserOutlined, WarningOutlined, BellOutlined, ScissorOutlined,
  DeleteOutlined, CopyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApi } from '../../hooks/useApi';
import { customersApi } from '../../api/customers';
import { staffApi } from '../../api/staff';
import { hairRecordsApi } from '../../api/hairRecords';
import { parseApiError } from '../../utils/apiError';

const { Text } = Typography;

const LEVELS = [
  { value: '一般', color: 'default' },
  { value: '黃金', color: 'gold' },
  { value: 'VIP', color: 'purple' },
];

const HAIR_CONDITIONS = ['正常', '乾燥', '受損', '漂染後', '油性', '混合'];

function revisitStatus(customer) {
  if (!customer.last_visit_at) return null;
  const lastVisit = dayjs(customer.last_visit_at);
  const dueDate = lastVisit.add(customer.revisit_days ?? 30, 'day');
  const daysLeft = dueDate.diff(dayjs(), 'day');
  return { dueDate, daysLeft, overdue: daysLeft < 0 };
}

function HairRecordTab({ customerId, staffList }) {
  const [records, setRecords] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const loadRecords = async () => {
    if (records !== null) return;
    setLoadingRecords(true);
    try {
      const data = await hairRecordsApi.list(customerId);
      setRecords(data ?? []);
    } catch (err) {
      setLoadErr(parseApiError(err, '讀取失敗').message);
    } finally {
      setLoadingRecords(false);
    }
  };

  if (records === null && !loadingRecords && !loadErr) loadRecords();

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ record_date: dayjs() });
    setFormOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    form.setFieldsValue({
      record_date: dayjs(r.record_date),
      staff_id: r.staff_id ?? undefined,
      service_names: r.service_names,
      color_formula: r.color_formula,
      hair_condition: r.hair_condition || undefined,
      notes: r.notes,
    });
    setFormOpen(true);
  };

  const handleSave = async (values) => {
    setSaving(true);
    const payload = {
      ...values,
      record_date: values.record_date.format('YYYY-MM-DD'),
      staff_id: values.staff_id ?? null,
    };
    try {
      if (editing) {
        const updated = await hairRecordsApi.update(customerId, editing.id, payload);
        setRecords((prev) => prev.map((r) => r.id === editing.id ? updated : r));
        message.success('已更新');
      } else {
        const created = await hairRecordsApi.create(customerId, payload);
        setRecords((prev) => [created, ...(prev ?? [])]);
        message.success('已新增');
      }
      setFormOpen(false);
    } catch (err) {
      message.error(parseApiError(err, '儲存失敗').message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await hairRecordsApi.remove(customerId, id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      message.success('已刪除');
    } catch (err) {
      message.error(parseApiError(err, '刪除失敗').message);
    }
  };

  const copyFormula = (formula) => {
    navigator.clipboard?.writeText(formula);
    message.success('配方已複製');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>共 {(records ?? []).length} 筆紀錄</Text>
        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={openAdd}>新增紀錄</Button>
      </div>

      {loadingRecords && <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>}
      {loadErr && <Alert type="error" showIcon message={loadErr} />}

      {!loadingRecords && !loadErr && (records ?? []).length === 0 && (
        <Empty description="尚無美髮紀錄" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}

      {!loadingRecords && !loadErr && (records ?? []).map((r) => (
        <Card
          key={r.id}
          size="small"
          style={{
            marginBottom: 10,
            background: 'rgba(238,242,255,0.6)',
            border: '1px solid rgba(99,102,241,0.12)',
            borderRadius: 12,
          }}
          bodyStyle={{ padding: '10px 14px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <Text strong style={{ color: '#4338ca' }}>{dayjs(r.record_date).format('YYYY/MM/DD')}</Text>
                {r.staff_name && <Tag color="blue" style={{ fontSize: 11 }}>{r.staff_name}</Tag>}
                {r.hair_condition && <Tag color="cyan" style={{ fontSize: 11 }}>{r.hair_condition}</Tag>}
              </div>
              {r.service_names && (
                <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
                  <ScissorOutlined style={{ marginRight: 4, color: '#6366f1' }} />
                  {r.service_names}
                </div>
              )}
              {r.color_formula && (
                <div style={{
                  fontSize: 12, color: '#7c3aed', background: 'rgba(139,92,246,0.08)',
                  borderRadius: 6, padding: '3px 8px', display: 'inline-flex',
                  alignItems: 'center', gap: 6, marginBottom: 4,
                }}>
                  <span>🎨 {r.color_formula}</span>
                  <Tooltip title="複製配方">
                    <CopyOutlined
                      style={{ cursor: 'pointer', fontSize: 11 }}
                      onClick={() => copyFormula(r.color_formula)}
                    />
                  </Tooltip>
                </div>
              )}
              {r.notes && (
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>備註：{r.notes}</div>
              )}
            </div>
            <Space size={4} style={{ flexShrink: 0, marginLeft: 8 }}>
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
              <Popconfirm title="確認刪除？" onConfirm={() => handleDelete(r.id)} okText="確認" cancelText="取消">
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          </div>
        </Card>
      ))}

      <Modal
        title={editing ? '編輯美髮紀錄' : '新增美髮紀錄'}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onOk={() => form.submit()}
        okText={saving ? '儲存中...' : '儲存'}
        okButtonProps={{ loading: saving }}
        cancelText="取消"
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="record_date" label="到訪日期" rules={[{ required: true, message: '請選日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="staff_id" label="服務技師">
                <Select allowClear placeholder="選擇技師">
                  {staffList.map((s) => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="service_names" label="服務項目">
                <Input placeholder="例：剪髮、染髮、護髮" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hair_condition" label="髮質狀況">
                <Select allowClear placeholder="選擇髮質">
                  {HAIR_CONDITIONS.map((c) => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="color_formula" label="染髮配方">
            <Input.TextArea rows={2} placeholder="例：7N 70% + Copper 30%，6% 氧化劑" />
          </Form.Item>
          <Form.Item name="notes" label="備註">
            <Input.TextArea rows={2} placeholder="其他注意事項或顧客偏好" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default function CustomerManagement() {
  const { data: customers, loading, error: customersError, setData: setCustomers } = useApi(customersApi.list, { deps: [] });
  const { data: staffData } = useApi(staffApi.list, { deps: [] });
  const staffList = staffData ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  const [form] = Form.useForm();
  const [topUpForm] = Form.useForm();
  const [importing, setImporting] = useState(false);

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    form.setFieldsValue({
      ...r,
      birthday: r.birthday ? dayjs(r.birthday) : undefined,
    });
    setModalOpen(true);
  };

  const openDetail = async (r) => {
    setSelected(r);
    setDetailOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const rows = await customersApi.history(r.id);
      setHistoryData(rows ?? []);
    } catch (err) {
      setHistoryData([]);
      setHistoryError(parseApiError(err, '讀取消費紀錄失敗').message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSave = async (values) => {
    const payload = {
      ...values,
      birthday: values.birthday ? values.birthday.format('YYYY-MM-DD') : null,
    };
    try {
      if (editing) {
        const u = await customersApi.update(editing.id, payload);
        setCustomers((p) => p.map((c) => c.id === editing.id ? u : c));
      } else {
        const c = await customersApi.create(payload);
        setCustomers((p) => [...p, c]);
      }
    } catch (err) {
      const { message: errMsg } = parseApiError(err, editing ? '更新失敗' : '新增失敗');
      message.error(errMsg);
      return;
    }
    message.success(editing ? '已更新' : '已新增');
    setModalOpen(false); form.resetFields();
  };

  const handleTopUp = async ({ amount, type }) => {
    try {
      const u = await customersApi.topup(selected.id, { amount, type });
      setCustomers((p) => p.map((c) => c.id === selected.id ? u : c));
      setSelected(u);
    } catch (err) {
      const { message: errMsg } = parseApiError(err, '儲值/加點失敗');
      message.error(errMsg);
      return;
    }
    message.success('已完成'); setTopUpOpen(false); topUpForm.resetFields();
  };

  const handleDelete = async (id) => {
    try { await customersApi.remove(id); } catch (err) { message.warning(parseApiError(err, '刪除失敗').message); }
    setCustomers((p) => p.filter((c) => c.id !== id));
    message.success('已刪除');
  };

  const downloadCustomerTemplate = () => {
    downloadXlsxTemplate(
      '顧客匯入範本.xlsx',
      CUSTOMER_TEMPLATE_HEADERS,
      [['王小美', '0912345678', 'demo@mail.com', '一般']],
    );
  };

  const handleCustomerExcelImport = async (file) => {
    setImporting(true);
    try {
      const rows = await parseExcelFile(file);
      const payloads = rows.map(rowToCustomer).filter((p) => p.name && p.phone);
      if (payloads.length === 0) {
        message.warning('沒有可匯入的資料（請確認「姓名」「電話」）');
        return;
      }
      const { ok, errors } = await importRowsSequential(payloads, async (payload) => {
        const c = await customersApi.create(payload);
        setCustomers((p) => [...(p ?? []), c]);
      });
      if (errors.length) {
        message.warning(`匯入完成：成功 ${ok} 筆，失敗 ${errors.length} 筆（常見原因：電話重複）`);
      } else {
        message.success(`已匯入 ${ok} 筆顧客`);
      }
    } catch (err) {
      message.error(err?.message || '無法解析 Excel');
    } finally {
      setImporting(false);
    }
  };

  const reminderList = (customers ?? [])
    .map((c) => ({ ...c, _revisit: revisitStatus(c) }))
    .filter((c) => c._revisit)
    .sort((a, b) => a._revisit.daysLeft - b._revisit.daysLeft);

  const overdueCount = reminderList.filter((c) => c._revisit.overdue).length;

  const columns = [
    {
      title: '顧客', key: 'name',
      render: (_, r) => {
        const rv = revisitStatus(r);
        const hasBirthday = r.birthday && dayjs(r.birthday).month() === dayjs().month() && dayjs(r.birthday).date() === dayjs().date();
        return (
          <Space>
            <Button type="link" style={{ padding: 0 }} onClick={() => openDetail(r)}>
              <Space><UserOutlined /><Text strong>{r.name}</Text></Space>
            </Button>
            {hasBirthday && <Tooltip title="今天生日 🎂"><span>🎂</span></Tooltip>}
            {rv?.overdue && <Tooltip title="回訪已逾期"><WarningOutlined style={{ color: '#ff4d4f' }} /></Tooltip>}
          </Space>
        );
      },
    },
    { title: '電話', dataIndex: 'phone', key: 'phone' },
    { title: '等級', dataIndex: 'level', key: 'level', render: (v) => <Tag color={LEVELS.find((l) => l.value === v)?.color}>{v}</Tag> },
    { title: '儲值', dataIndex: 'balance', key: 'balance', render: (v) => `$${Number(v).toLocaleString()}` },
    { title: '點數', dataIndex: 'points', key: 'points', render: (v) => `${Number(v)} 點` },
    { title: '累計消費', dataIndex: 'total_spent', key: 'total_spent', render: (v) => `$${Number(v).toLocaleString()}`, sorter: (a, b) => a.total_spent - b.total_spent },
    {
      title: '操作', key: 'actions',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>編輯</Button>
          <Popconfirm title="確認刪除？" onConfirm={() => handleDelete(r.id)} okText="確認" cancelText="取消">
            <Button size="small" danger>刪除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const reminderColumns = [
    { title: '顧客', dataIndex: 'name', key: 'name', render: (v, r) => <Button type="link" onClick={() => openDetail(r)}>{v}</Button> },
    { title: '等級', dataIndex: 'level', key: 'level', render: (v) => <Tag color={LEVELS.find((l) => l.value === v)?.color}>{v}</Tag> },
    { title: '上次到訪', dataIndex: 'last_visit_at', key: 'last_visit', render: (v) => v?.slice(0, 10) ?? '—' },
    {
      title: '回訪狀態', key: 'status',
      render: (_, r) => {
        const rv = revisitStatus(r);
        if (!rv) return '—';
        return rv.overdue
          ? <Tag color="red"><WarningOutlined /> 逾期 {Math.abs(rv.daysLeft)} 天</Tag>
          : rv.daysLeft <= 7
            ? <Tag color="orange">還有 {rv.daysLeft} 天</Tag>
            : <Tag color="green">還有 {rv.daysLeft} 天</Tag>;
      },
    },
    { title: '電話', dataIndex: 'phone', key: 'phone' },
  ];

  return (
    <div className="page-wrap">
      {customersError && <Alert type="error" message="顧客資料載入失敗，請確認 API 與登入狀態" showIcon style={{ marginBottom: 12 }} />}

      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 16 }} align="center">
        <div className="page-title-text">顧客管理</div>
        <Space wrap>
          <ExcelImportButtons
            disabled={importing || loading}
            onDownloadTemplate={downloadCustomerTemplate}
            onSelectFile={handleCustomerExcelImport}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增顧客</Button>
        </Space>
      </Space>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'list', label: '顧客列表',
          children: <Table dataSource={customers ?? []} columns={columns} rowKey="id" loading={loading} />,
        },
        {
          key: 'reminder',
          label: <Space><BellOutlined /><span>回訪提醒</span>{overdueCount > 0 && <Badge count={overdueCount} />}</Space>,
          children: (
            <>
              {overdueCount > 0 && (
                <Alert type="warning" showIcon style={{ marginBottom: 12 }}
                  message={`${overdueCount} 位顧客回訪已逾期，建議盡快聯繫`} />
              )}
              <Table dataSource={reminderList} columns={reminderColumns} rowKey="id"
                rowClassName={(r) => r._revisit?.overdue ? 'ant-table-row-warning' : ''} />
            </>
          ),
        },
      ]} />

      {/* 新增/編輯 Modal */}
      <Modal title={editing ? '編輯顧客' : '新增顧客'} open={modalOpen}
        onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="儲存" cancelText="取消" width={560}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="phone" label="電話" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="email" label="Email"><Input /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="level" label="會員等級" initialValue="一般">
                <Select>{LEVELS.map((l) => <Select.Option key={l.value} value={l.value}>{l.value}</Select.Option>)}</Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="birthday" label="生日">
                <DatePicker style={{ width: '100%' }} placeholder="選擇生日" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="revisit_days" label="建議回訪天數" initialValue={30}>
                <InputNumber min={1} max={365} suffix="天" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="allergy_info" label="過敏 / 禁忌資訊">
            <Input.TextArea rows={2} placeholder="例：對薰衣草精油過敏、酒精敏感" />
          </Form.Item>
          <Form.Item name="preferred_staff_id" label="偏好技師">
            <Select allowClear placeholder="不指定">
              {staffList.map((s) => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 顧客詳情 Modal */}
      <Modal title={`${selected?.name} — 顧客詳情`} open={detailOpen}
        onCancel={() => setDetailOpen(false)} width={680}
        footer={[
          <Button key="topup" icon={<WalletOutlined />} type="primary" onClick={() => setTopUpOpen(true)}>儲值 / 加點</Button>,
          <Button key="close" onClick={() => setDetailOpen(false)}>關閉</Button>,
        ]}>
        {selected && (
          <Tabs items={[
            {
              key: 'info', label: '基本資料',
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={8}><Statistic title="儲值餘額" value={Number(selected.balance)} prefix="$" valueStyle={{ color: '#722ed1' }} /></Col>
                    <Col span={8}><Statistic title="點數" value={selected.points} suffix="點" /></Col>
                    <Col span={8}><Statistic title="到訪次數" value={selected.visits} suffix="次" /></Col>
                  </Row>
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="姓名">{selected.name}</Descriptions.Item>
                    <Descriptions.Item label="等級"><Tag color={LEVELS.find((l) => l.value === selected.level)?.color}>{selected.level}</Tag></Descriptions.Item>
                    <Descriptions.Item label="電話">{selected.phone}</Descriptions.Item>
                    <Descriptions.Item label="Email">{selected.email || '—'}</Descriptions.Item>
                    <Descriptions.Item label="生日">
                      {selected.birthday
                        ? <span>{dayjs(selected.birthday).format('MM 月 DD 日')} 🎂</span>
                        : <Text type="secondary">—</Text>}
                    </Descriptions.Item>
                    <Descriptions.Item label="偏好技師">
                      {staffList.find((s) => s.id === selected.preferred_staff_id)?.name ?? '不指定'}
                    </Descriptions.Item>
                    <Descriptions.Item label="建議回訪">{selected.revisit_days ?? 30} 天</Descriptions.Item>
                    <Descriptions.Item label="累計消費">${Number(selected.total_spent).toLocaleString()}</Descriptions.Item>
                    <Descriptions.Item label="過敏/禁忌" span={2}>
                      {selected.allergy_info
                        ? <Text type="danger"><WarningOutlined /> {selected.allergy_info}</Text>
                        : <Text type="secondary">無</Text>}
                    </Descriptions.Item>
                  </Descriptions>
                </>
              ),
            },
            {
              key: 'hair', label: <Space><ScissorOutlined />美髮紀錄</Space>,
              children: <HairRecordTab customerId={selected.id} staffList={staffList} />,
            },
            {
              key: 'history', label: '消費紀錄',
              children: (
                <>
                  {historyLoading && <Spin />}
                  {historyError && <Alert type="error" showIcon message={historyError} style={{ marginBottom: 12 }} />}
                  {!historyLoading && !historyError && historyData.length === 0 && (
                    <Text type="secondary">目前沒有消費紀錄</Text>
                  )}
                  {!historyLoading && !historyError && historyData.length > 0 && (
                    <Timeline
                      items={historyData.map((h) => ({
                        color: 'purple',
                        children: (
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {dayjs(h.date).format('YYYY-MM-DD HH:mm')}
                            </Text>
                            <div>
                              <Text strong>{h.service_name}</Text> — {h.staff_name}
                            </div>
                            <Text style={{ color: '#f50' }}>${Number(h.amount).toLocaleString()}</Text>
                          </div>
                        ),
                      }))}
                    />
                  )}
                </>
              ),
            },
          ]} />
        )}
      </Modal>

      {/* 儲值/加點 Modal */}
      <Modal title="儲值 / 加點" open={topUpOpen}
        onCancel={() => setTopUpOpen(false)} onOk={() => topUpForm.submit()} okText="確認" cancelText="取消">
        <Form form={topUpForm} layout="vertical" onFinish={handleTopUp}>
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
