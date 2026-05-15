import { useEffect, useMemo, useState } from 'react';
import {
  Table, Tag, Button, Modal, Form, Input, Select, ColorPicker,
  Space, Avatar, Drawer, Calendar, Badge, Typography, Popconfirm, Alert, message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApi } from '../../hooks/useApi';
import { staffApi } from '../../api/staff';
import { parseApiError } from '../../utils/apiError';
import ExcelImportButtons from '../../components/ExcelImportButtons';
import {
  parseExcelFile,
  downloadXlsxTemplate,
  rowToStaff,
  STAFF_TEMPLATE_HEADERS,
  importRowsSequential,
} from '../../utils/excelImport';

const { Text } = Typography;

const SKILLS = ['美容', '美髮', '美甲', 'SPA', '美睫', '燙染', '護膚', '按摩'];
const SKILL_COLORS = {
  美容: 'pink', 美髮: 'purple', 美甲: 'cyan', SPA: 'green',
  美睫: 'orange', 燙染: 'volcano', 護膚: 'magenta', 按摩: 'blue',
};

const SHIFT_TYPES = [
  { value: 'morning', label: '早班', color: 'blue' },
  { value: 'afternoon', label: '午班', color: 'orange' },
  { value: 'full', label: '全天', color: 'green' },
  { value: 'off', label: '休假', color: 'default' },
];

export default function StaffManagement() {
  const { data: staffList, loading, error: staffError, setData: setStaffList } = useApi(
    staffApi.list,
    null
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(dayjs());
  const [selectedShiftType, setSelectedShiftType] = useState('full');
  const [scheduleMap, setScheduleMap] = useState({});
  const [form] = Form.useForm();
  const [importing, setImporting] = useState(false);

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (r) => { setEditing(r); form.setFieldsValue(r); setModalOpen(true); };
  const openSchedule = (r) => {
    setSelectedStaff(r);
    setDrawerOpen(true);
    setCalendarMonth(dayjs());
  };

  const monthRange = useMemo(() => ({
    start: calendarMonth.startOf('month').format('YYYY-MM-DD'),
    end: calendarMonth.endOf('month').format('YYYY-MM-DD'),
  }), [calendarMonth]);

  useEffect(() => {
    if (!selectedStaff || !drawerOpen) return;
    const load = async () => {
      try {
        const rows = await staffApi.listSchedules(selectedStaff.id, monthRange.start, monthRange.end);
        const nextMap = {};
        rows.forEach((row) => {
          nextMap[dayjs(row.work_date).format('YYYY-MM-DD')] = row.shift_type;
        });
        setScheduleMap(nextMap);
      } catch (err) {
        message.warning(parseApiError(err, '讀取排班失敗').message);
      }
    };
    load();
  }, [selectedStaff, drawerOpen, monthRange.start, monthRange.end]);

  const handleSave = async (values) => {
    const color = typeof values.color === 'string' ? values.color : (values.color?.toHexString?.() ?? '#1677ff');
    const payload = { ...values, color };
    try {
      if (editing) {
        const updated = await staffApi.update(editing.id, payload);
        setStaffList((prev) => prev.map((s) => s.id === editing.id ? updated : s));
      } else {
        const created = await staffApi.create(payload);
        setStaffList((prev) => [...prev, created]);
      }
    } catch (err) {
      const { message: errMsg } = parseApiError(err, editing ? '更新失敗' : '新增失敗');
      message.error(errMsg);
      return;
    }
    message.success(editing ? '已更新' : '已新增');
    setModalOpen(false);
    form.resetFields();
  };

  const handleDelete = async (id) => {
    try { await staffApi.remove(id); } catch (err) { message.warning(parseApiError(err, '刪除失敗').message); }
    setStaffList((prev) => prev.filter((s) => s.id !== id));
    message.success('已刪除');
  };

  const downloadStaffTemplate = () => {
    downloadXlsxTemplate(
      '員工匯入範本.xlsx',
      STAFF_TEMPLATE_HEADERS,
      [['李小華', '0922000111', '美髮,染髮', 35, '#6366f1']],
    );
  };

  const handleStaffExcelImport = async (file) => {
    setImporting(true);
    try {
      const rows = await parseExcelFile(file);
      const payloads = rows
        .map(rowToStaff)
        .filter((p) => p.name && p.skills.length > 0);
      if (payloads.length === 0) {
        message.warning('沒有可匯入的資料（請確認「姓名」「技能」，技能可用逗號分隔）');
        return;
      }
      const { ok, errors } = await importRowsSequential(payloads, async (payload) => {
        const created = await staffApi.create(payload);
        setStaffList((prev) => [...(prev ?? []), created]);
      });
      if (errors.length) {
        message.warning(`匯入完成：成功 ${ok} 筆，失敗 ${errors.length} 筆`);
      } else {
        message.success(`已匯入 ${ok} 筆技師`);
      }
    } catch (err) {
      message.error(err?.message || '無法解析 Excel');
    } finally {
      setImporting(false);
    }
  };

  const dateCellRender = (value) => {
    if (!selectedStaff) return null;
    const shift = scheduleMap[value.format('YYYY-MM-DD')];
    const cfg = SHIFT_TYPES.find((t) => t.value === shift);
    if (!cfg) return null;
    return (
      <Badge
        color={cfg.color === 'default' ? 'gray' : cfg.color}
        text={<span style={{ fontSize: 10 }}>{cfg.label}</span>}
      />
    );
  };

  const handleSelectDate = async (value) => {
    if (!selectedStaff) return;
    const workDate = value.format('YYYY-MM-DD');
    try {
      await staffApi.upsertSchedules(selectedStaff.id, [{ work_date: workDate, shift_type: selectedShiftType }]);
      setScheduleMap((prev) => ({ ...prev, [workDate]: selectedShiftType }));
      const shiftLabel = SHIFT_TYPES.find((s) => s.value === selectedShiftType)?.label ?? selectedShiftType;
      message.success(`${workDate} 已設定為 ${shiftLabel}`);
    } catch (err) {
      message.error(parseApiError(err, '儲存排班失敗').message);
    }
  };

  const columns = useMemo(() => [
    {
      title: '技師',
      key: 'name',
      render: (_, r) => (
        <Space>
          <Avatar style={{ background: r.color }}>{r.name[0]}</Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.phone}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '技能',
      dataIndex: 'skills',
      key: 'skills',
      render: (skills) => skills?.map((s) => <Tag key={s} color={SKILL_COLORS[s]}>{s}</Tag>),
    },
    {
      title: '提成',
      dataIndex: 'commission_rate',
      key: 'commission_rate',
      render: (v) => `${v ?? 35}%`,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<CalendarOutlined />} onClick={() => openSchedule(r)}>排班</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>編輯</Button>
          <Popconfirm title="確認刪除？" onConfirm={() => handleDelete(r.id)} okText="確認" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ], [openSchedule, openEdit, handleDelete]);

  return (
    <div className="page-wrap">
      {staffError && <Alert type="error" message="員工資料載入失敗，請檢查 API 與登入狀態" showIcon style={{ marginBottom: 12 }} />}
      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 16 }} align="center">
        <div className="page-title-text">員工管理</div>
        <Space wrap>
          <ExcelImportButtons
            disabled={importing || loading}
            onDownloadTemplate={downloadStaffTemplate}
            onSelectFile={handleStaffExcelImport}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增技師</Button>
        </Space>
      </Space>

      <Table dataSource={staffList ?? []} columns={columns} rowKey="id" loading={loading} />

      <Modal title={editing ? '編輯技師' : '新增技師'} open={modalOpen}
        onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="儲存" cancelText="取消">
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label="電話"><Input /></Form.Item>
          <Form.Item name="skills" label="技能標籤" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="選擇技能">
              {SKILLS.map((s) => <Select.Option key={s} value={s}>{s}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="commission_rate" label="提成比例 (%)" rules={[{ required: true }]}>
            <Input type="number" min={0} max={100} suffix="%" />
          </Form.Item>
          <Form.Item name="color" label="代表色"><ColorPicker /></Form.Item>
        </Form>
      </Modal>

      <Drawer title={`${selectedStaff?.name} — 排班表`} open={drawerOpen}
        onClose={() => setDrawerOpen(false)} width={480}>
        {selectedStaff && (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              先選班別，再點日期儲存到資料庫
            </Text>
            <Select
              style={{ width: '100%', marginBottom: 12 }}
              value={selectedShiftType}
              onChange={setSelectedShiftType}
              options={SHIFT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
            <Space wrap style={{ marginBottom: 12 }}>
              {SHIFT_TYPES.map((t) => (
                <Badge key={t.value} color={t.color === 'default' ? 'gray' : t.color} text={t.label} />
              ))}
            </Space>
            <Calendar
              fullscreen={false}
              cellRender={dateCellRender}
              value={calendarMonth}
              onPanelChange={(value) => setCalendarMonth(value)}
              onSelect={handleSelectDate}
            />
          </>
        )}
      </Drawer>
    </div>
  );
}
