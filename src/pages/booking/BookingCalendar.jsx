import { useState, useCallback, useMemo, useEffect, memo } from 'react';
import {
  Button, Modal, Form, Select, TimePicker, DatePicker, Switch,
  Tag, Typography, Space, Card, Avatar, Alert, Tooltip, Badge, notification, message,
  Row, Col, Divider,
} from 'antd';
import { PlusOutlined, WarningOutlined, CheckCircleOutlined, LeftOutlined, RightOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApi } from '../../hooks/useApi';
import { useWebSocket } from '../../hooks/useWebSocket';
import { bookingsApi } from '../../api/bookings';
import { staffApi } from '../../api/staff';
import { servicesApi } from '../../api/services';
import { customersApi } from '../../api/customers';
import { parseApiError } from '../../utils/apiError';

const { Text } = Typography;
const HAIR_KEYWORDS = ['髮', '剪', '染', '燙', '護', '頭皮', '造型', '吹整'];
const BUSINESS_OPEN_MINUTES = 9 * 60;
const BUSINESS_CLOSE_MINUTES = 22 * 60;

const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9;
  const min = i % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${min}`;
});

const STATUS_CONFIG = {
  confirmed: { color: 'blue', bg: '#e6f4ff', border: '#91caff', label: '已確認' },
  in_progress: { color: 'green', bg: '#f6ffed', border: '#b7eb8f', label: '進行中' },
  pending: { color: 'gold', bg: '#fffbe6', border: '#ffe58f', label: '待確認' },
  done: { color: 'default', bg: '#fafafa', border: '#d9d9d9', label: '完成' },
};

const SHIFT_TIME_WINDOWS = {
  morning: { start: 9 * 60, end: 13 * 60 },
  afternoon: { start: 13 * 60, end: 18 * 60 },
  full: { start: 9 * 60, end: 22 * 60 },
  off: { start: 0, end: 0 },
};

const toMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const fromMinutes = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const hasConflict = (bookings, staffId, date, startTime, endTime, excludeId = null) => {
  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);
  return bookings.some(
    (b) =>
      b.id !== excludeId &&
      b.staffId === staffId &&
      b.date === date &&
      toMinutes(b.startTime) < endMin &&
      toMinutes(b.endTime) > startMin
  );
};

const isValidTimeWindow = (startMin, endMin) =>
  startMin >= BUSINESS_OPEN_MINUTES && endMin <= BUSINESS_CLOSE_MINUTES && startMin < endMin;

const BookingCell = memo(function BookingCell({ booking, onClick, onDone }) {
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.done;
  const isDone = booking.status === 'done' || booking.status === 'cancelled';
  return (
    <Tooltip title={`${booking.customerName} / ${booking.serviceName} / ${booking.startTime}`}>
      <div
        onClick={() => onClick(booking)}
        style={{
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderLeft: `3px solid ${cfg.border}`,
          borderRadius: 4,
          padding: '2px 6px 2px 6px',
          fontSize: 11,
          cursor: 'pointer',
          marginBottom: 2,
          lineHeight: 1.4,
          position: 'relative',
          opacity: isDone ? 0.55 : 1,
        }}
      >
        {!isDone && (
          <div
            onClick={(e) => { e.stopPropagation(); onDone(booking); }}
            style={{
              position: 'absolute', top: 2, right: 2,
              width: 16, height: 16, borderRadius: 3,
              border: '1.5px solid #52c41a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#fff', cursor: 'pointer', zIndex: 1,
              fontSize: 10, color: '#52c41a', fontWeight: 700,
            }}
            title="標記完成"
          >✓</div>
        )}
        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 18 }}>
          {booking.customerName}
        </div>
        <div style={{ color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {booking.serviceName}
        </div>
      </div>
    </Tooltip>
  );
});

export default function BookingCalendar() {
  const [showPastRecords, setShowPastRecords] = useState(false);
  const today = useMemo(() => dayjs().startOf('day'), []);
  const currentRangeStart = today;
  const [weekStart, setWeekStart] = useState(currentRangeStart);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day')),
    [weekStart]
  );
  const visibleWeekDays = useMemo(
    () => (showPastRecords ? weekDays : weekDays.filter((d) => !d.isBefore(today, 'day'))),
    [showPastRecords, weekDays, today]
  );
  const weekDayStrings = useMemo(
    () => visibleWeekDays.map((d) => d.format('YYYY-MM-DD')),
    [visibleWeekDays]
  );

  const loadWeekBookings = useCallback(async () => {
    if (!visibleWeekDays.length) return [];
    return bookingsApi.listRange(
      visibleWeekDays[0].format('YYYY-MM-DD'),
      visibleWeekDays[visibleWeekDays.length - 1].format('YYYY-MM-DD'),
    );
  }, [visibleWeekDays]);

  const { data: apiBookings, refetch, error: bookingsError } = useApi(
    loadWeekBookings,
    { mockData: null, deps: [weekDayStrings.join('|')], fallbackToMock: false }
  );
  const { data: staffData, error: staffError } = useApi(staffApi.list, null);
  const { data: serviceData, error: serviceError } = useApi(servicesApi.list, null);
  const { data: customerData, error: customerError } = useApi(customersApi.list, null);

  const staffList = useMemo(() => {
    const list = staffData ?? [];
    const filtered = list.filter((s) =>
      (s.skills ?? []).some((sk) => HAIR_KEYWORDS.some((kw) => String(sk).includes(kw)))
    );
    return filtered.length ? filtered : list;
  }, [staffData]);
  const serviceList = useMemo(() => {
    const list = serviceData ?? [];
    const filtered = list.filter((s) => HAIR_KEYWORDS.some((kw) => String(s.name).includes(kw)));
    return filtered.length ? filtered : list;
  }, [serviceData]);
  const customerList = useMemo(() => customerData ?? [], [customerData]);

  const customerMap = useMemo(() => new Map(customerList.map((c) => [c.id, c])), [customerList]);
  const staffMap = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList]);
  const serviceMap = useMemo(() => new Map(serviceList.map((s) => [s.id, s])), [serviceList]);

  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBooking, setDetailBooking] = useState(null);
  const [conflictWarning, setConflictWarning] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [scheduleMap, setScheduleMap] = useState({});
  const [form] = Form.useForm();
  const effectiveSelectedStaffId = useMemo(() => {
    if (!staffList.length) return null;
    if (selectedStaffId && staffList.some((s) => s.id === selectedStaffId)) return selectedStaffId;
    return staffList[0].id;
  }, [selectedStaffId, staffList]);

  const bookings = useMemo(() => {
    if (!apiBookings) return [];
    const result = [];
    for (const booking of apiBookings) {
      const customer = customerMap.get(booking.customer_id);
      const items = booking.items ?? [];
      if (!items.length) continue;

      // 依 staff_id 分組，同一技師的服務合併成一格
      const byStaff = new Map();
      for (const item of items) {
        if (!byStaff.has(item.staff_id)) byStaff.set(item.staff_id, []);
        byStaff.get(item.staff_id).push(item);
      }

      for (const [staffId, staffItems] of byStaff) {
        const firstItem = staffItems[0];
        const serviceNames = staffItems
          .map((si) => serviceMap.get(si.service_id)?.name ?? `服務#${si.service_id}`)
          .join('、');
        result.push({
          id: `${booking.id}_${staffId}`,
          bookingId: booking.id,
          customerId: booking.customer_id,
          customerName: customer?.name ?? `顧客#${booking.customer_id}`,
          staffId,
          staffName: staffMap.get(staffId)?.name ?? `技師#${staffId}`,
          serviceName: serviceNames,
          date: dayjs(firstItem.start_at).format('YYYY-MM-DD'),
          startTime: dayjs(firstItem.start_at).format('HH:mm'),
          endTime: dayjs(firstItem.end_at).format('HH:mm'),
          status: booking.status,
          price: staffItems.reduce((s, si) => s + Number(si.price), 0),
        });
      }
    }
    return result;
  }, [apiBookings, customerMap, staffMap, serviceMap]);

  const canBookBySchedule = useCallback((staffId, bookingDate, startMin, endMin) => {
    if (!staffId || !bookingDate) return true;
    const shiftType = scheduleMap[`${staffId}_${bookingDate}`];
    if (!shiftType) return true;
    const window = SHIFT_TIME_WINDOWS[shiftType];
    if (!window || shiftType === 'off') return false;
    return startMin >= window.start && endMin <= window.end;
  }, [scheduleMap]);

  const isOffBySchedule = useCallback((staffId, bookingDate) => {
    if (!staffId || !bookingDate) return false;
    return scheduleMap[`${staffId}_${bookingDate}`] === 'off';
  }, [scheduleMap]);

  const loadSchedules = useCallback(async () => {
    if (!effectiveSelectedStaffId || !visibleWeekDays.length) {
      setScheduleMap({});
      return;
    }
    try {
      const rows = await staffApi.listSchedules(
        effectiveSelectedStaffId,
        visibleWeekDays[0].format('YYYY-MM-DD'),
        visibleWeekDays[visibleWeekDays.length - 1].format('YYYY-MM-DD')
      );
      const next = {};
      rows.forEach((row) => {
        const date = dayjs(row.work_date).format('YYYY-MM-DD');
        next[`${effectiveSelectedStaffId}_${date}`] = row.shift_type;
      });
      setScheduleMap(next);
    } catch (_err) {
      setScheduleMap({});
    }
  }, [effectiveSelectedStaffId, visibleWeekDays]);

  const scheduleKey = useMemo(
    () => `${effectiveSelectedStaffId ?? ''}|${weekDayStrings.join('|')}`,
    [effectiveSelectedStaffId, weekDayStrings]
  );

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules, scheduleKey]);

  // WebSocket：收到新預約時刷新並顯示通知
  useWebSocket('/ws/bookings', useCallback((msg) => {
    if (msg.event === 'booking_created') {
      refetch();
      notification.info({ message: '新預約', description: `訂單 #${msg.data.booking_id} 已建立`, placement: 'topRight', duration: 4 });
    }
  }, [refetch]));

  // 預先建 Map，避免每個格子都跑 O(n) filter
  const bookingCellMap = useMemo(() => {
    const map = new Map();
    for (const b of bookings) {
      const key = `${b.staffId}_${b.date}_${b.startTime}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(b);
    }
    return map;
  }, [bookings]);

  const getBookingsForCell = useCallback(
    (dateStr, slot) => bookingCellMap.get(`${effectiveSelectedStaffId}_${dateStr}_${slot}`) ?? [],
    [bookingCellMap, effectiveSelectedStaffId],
  );

  const handleCellClick = useCallback((b) => { setDetailBooking(b); setDetailOpen(true); }, []);

  const handleDone = useCallback(async (b) => {
    try {
      await bookingsApi.updateStatus(b.bookingId, 'done');
      await refetch();
    } catch { message.error('更新失敗'); }
  }, [refetch]);

  const canGoPrevWeek = showPastRecords || weekStart.isAfter(currentRangeStart, 'day');

  const checkConflict = () => {
    setConflictWarning(null);
  };

  const handleAdd = async (values) => {
    const { customerId, bookingDate, startTime, items } = values;
    const customer = customerList.find((c) => c.id === customerId);
    if (!customer || !items?.length) {
      message.error('請確認顧客與服務項目');
      return;
    }
    const bookingDateStr = bookingDate.format('YYYY-MM-DD');
    const bookingItems = [];
    const startDateTime = startTime
      .year(bookingDate.year()).month(bookingDate.month()).date(bookingDate.date())
      .second(0).millisecond(0);

    for (const item of items) {
      const service = serviceList.find((s) => s.id === item.serviceId);
      const staff = staffList.find((s) => s.id === item.staffId);
      if (!service || !staff) { message.error('服務或技師資料不完整，請重新整理'); return; }
      bookingItems.push({
        service_id: service.id,
        staff_id: staff.id,
        start_at: startDateTime.toISOString(),
        price: Number(service.price),
      });
    }

    try {
      await bookingsApi.create({ customer_id: customer.id, note: null, items: bookingItems });
      await refetch();
      setAddOpen(false);
      setConflictWarning(null);
      form.resetFields();
      message.success(`預約已建立（${bookingItems.length} 項服務）`);
    } catch (err) {
      const { code, message: errMsg } = parseApiError(err, '建立預約失敗');
      message.error(code ? `${errMsg} (${code})` : errMsg);
    }
  };

  const handleStatusChange = async (status) => {
    if (!detailBooking?.bookingId) return;
    try {
      await bookingsApi.updateStatus(detailBooking.bookingId, status);
      await refetch();
      setDetailBooking((prev) => ({ ...prev, status }));
    } catch (err) {
      const { message: errMsg } = parseApiError(err, '更新狀態失敗');
      message.error(errMsg);
    }
  };

  return (
    <div className="page-wrap">
      {(bookingsError || staffError || serviceError || customerError) && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message="資料載入失敗，請確認 API 與登入狀態"
        />
      )}
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <div className="page-title-text">
          預約行事曆 — {weekDays[0].format('YYYY/MM/DD')} ~ {weekDays[6].format('YYYY/MM/DD')}
          <Tag color="magenta" style={{ marginLeft: 8 }}>美髮優先</Tag>
        </div>
        <Space>
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>看歷史</Text>
            <Switch
              size="small"
              checked={showPastRecords}
              onChange={(checked) => {
                setShowPastRecords(checked);
                if (!checked && weekStart.isBefore(currentRangeStart, 'day')) {
                  setWeekStart(currentRangeStart);
                }
              }}
            />
          </Space>
          <Button
            icon={<LeftOutlined />}
            disabled={!canGoPrevWeek}
            onClick={() => {
              if (!canGoPrevWeek) return;
              setWeekStart((d) => d.subtract(7, 'day'));
            }}
          />
          <Button icon={<RightOutlined />} onClick={() => setWeekStart((d) => d.add(7, 'day'))} />
          <Select
            style={{ width: 180 }}
            placeholder="選擇員工"
            value={effectiveSelectedStaffId}
            onChange={setSelectedStaffId}
          >
            {staffList.map((s) => (
              <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
            ))}
          </Select>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <Badge key={k} color={v.color} text={v.label} />
          ))}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setConflictWarning(null);
              form.setFieldsValue({
                bookingDate: weekDays[0],
                items: [{ staffId: effectiveSelectedStaffId ?? undefined }],
              });
              setAddOpen(true);
            }}
          >
            新增預約
          </Button>
        </Space>
      </Space>

      <Card bodyStyle={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ width: 64, padding: '8px 12px', borderBottom: '1px solid #f0f0f0', fontSize: 12, color: '#999' }}>
                時段
              </th>
              {visibleWeekDays.map((d) => (
                <th key={d.format('YYYY-MM-DD')} style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', borderLeft: '1px solid #f0f0f0', minWidth: 130 }}>
                  <Text strong>{d.format('MM/DD')}</Text>
                  <div style={{ fontSize: 11, color: '#666' }}>{d.format('ddd')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot, idx) => (
              <tr
                key={slot}
                style={{
                  borderBottom: idx % 2 === 1 ? '1px solid #e8e8e8' : '1px solid #f5f5f5',
                  background: idx % 2 === 0 ? '#fff' : '#fafafa',
                }}
              >
                <td style={{ padding: '4px 12px', fontSize: 11, color: idx % 2 === 0 ? '#666' : '#bbb', verticalAlign: 'top', userSelect: 'none' }}>
                  {slot}
                </td>
                {visibleWeekDays.map((d) => {
                  const dateStr = d.format('YYYY-MM-DD');
                  const cells = getBookingsForCell(dateStr, slot);
                  const offDay = isOffBySchedule(effectiveSelectedStaffId, dateStr);
                  return (
                    <td
                      key={dateStr}
                      style={{
                        padding: 3,
                        borderLeft: '1px solid #f0f0f0',
                        verticalAlign: 'top',
                        minHeight: 28,
                        background: offDay ? '#fff1f0' : undefined,
                      }}
                    >
                      {offDay && slot === '09:00' ? (
                        <Text type="danger" style={{ fontSize: 11 }}>休假</Text>
                      ) : null}
                      {cells.map((b) => (
                        <BookingCell
                          key={b.id}
                          booking={b}
                          onClick={handleCellClick}
                          onDone={handleDone}
                        />
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* 新增預約 Modal */}
      <Modal
        destroyOnClose
        title="新增預約"
        open={addOpen}
        onCancel={() => { setAddOpen(false); setConflictWarning(null); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="確認新增" cancelText="取消"
        okButtonProps={{ disabled: !!conflictWarning }}
        width={580}
      >
        {conflictWarning && (
          <Alert
            type="error"
            icon={<WarningOutlined />}
            message={conflictWarning}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Form form={form} layout="vertical" onFinish={handleAdd} onValuesChange={checkConflict}>
          <Form.Item name="customerId" label="顧客" rules={[{ required: true }]}>
            <Select placeholder="選擇顧客" showSearch optionFilterProp="children">
              {customerList.map((c) => (
                <Select.Option key={c.id} value={c.id}>{c.name} ({c.phone})</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="bookingDate" label="預約日期" rules={[{ required: true }]}>
                <DatePicker
                  style={{ width: '100%' }}
                  disabledDate={(current) =>
                    !showPastRecords && current && current.startOf('day').isBefore(today)
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="startTime" label="開始時間" rules={[{ required: true }]}>
                <TimePicker
                  format="HH:mm"
                  minuteStep={30}
                  style={{ width: '100%' }}
                  disabledTime={() => ({
                    disabledHours: () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 22, 23],
                    disabledMinutes: () => Array.from({ length: 60 }, (_, i) => i).filter((m) => m !== 0 && m !== 30),
                  })}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ fontSize: 13, margin: '8px 0 12px' }}>服務項目</Divider>

          <Form.List name="items" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <Row gutter={8}>
                        <Col span={13}>
                          <Form.Item
                            name={[field.name, 'serviceId']}
                            label={index === 0 ? '服務項目' : undefined}
                            rules={[{ required: true, message: '請選服務' }]}
                            style={{ marginBottom: 8 }}
                          >
                            <Select placeholder="選擇服務" showSearch optionFilterProp="children">
                              {serviceList.map((s) => (
                                <Select.Option key={s.id} value={s.id}>
                                  {s.name} <span style={{ color: '#999', fontSize: 11 }}>${s.price}</span>
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={11}>
                          <Form.Item
                            name={[field.name, 'staffId']}
                            label={index === 0 ? '指定技師' : undefined}
                            rules={[{ required: true, message: '請選技師' }]}
                            style={{ marginBottom: 8 }}
                          >
                            <Select placeholder="選擇技師">
                              {staffList.map((s) => (
                                <Select.Option key={s.id} value={s.id}>
                                  <Space size={6}>
                                    <Avatar size="small" style={{ background: s.color, flexShrink: 0 }}>{s.name[0]}</Avatar>
                                    {s.name}
                                  </Space>
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        size="small"
                        style={{ marginTop: index === 0 ? 30 : 4, flexShrink: 0 }}
                        onClick={() => remove(field.name)}
                      />
                    )}
                  </div>
                ))}
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    block
                    size="small"
                  >
                    新增服務項目（如：剪＋染＋護）
                  </Button>
                </Form.Item>

              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* 預約詳情 Modal */}
      <Modal
        destroyOnClose
        title="預約詳情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          detailBooking?.status !== 'done' && detailBooking?.status !== 'cancelled' && (
            <Button key="done" type="primary" icon={<CheckCircleOutlined />}
              onClick={() => { handleStatusChange('done'); setDetailOpen(false); }}>
              完成
            </Button>
          ),
          detailBooking?.status !== 'cancelled' && detailBooking?.status !== 'done' && (
            <Button key="cancel" danger onClick={() => { handleStatusChange('cancelled'); setDetailOpen(false); }}>
              取消預約
            </Button>
          ),
          <Button key="close" onClick={() => setDetailOpen(false)}>關閉</Button>,
        ].filter(Boolean)}
      >
        {detailBooking && (
          <div style={{ lineHeight: 2 }}>
            <div><Text type="secondary">顧客：</Text><Text strong>{detailBooking.customerName}</Text></div>
            <div><Text type="secondary">服務：</Text><Text>{detailBooking.serviceName}</Text></div>
            <div><Text type="secondary">技師：</Text><Text>{detailBooking.staffName}</Text></div>
            <div><Text type="secondary">時間：</Text><Text>{detailBooking.startTime}</Text></div>
            <div><Text type="secondary">金額：</Text><Text style={{ color: '#f50' }}>${detailBooking.price.toLocaleString()}</Text></div>
            <div>
              <Text type="secondary">狀態：</Text>
              <Tag color={STATUS_CONFIG[detailBooking.status]?.color}>
                {STATUS_CONFIG[detailBooking.status]?.label}
              </Tag>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
