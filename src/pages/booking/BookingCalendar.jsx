import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Button, Modal, Form, Select, TimePicker, DatePicker, Switch,
  Tag, Typography, Space, Card, Avatar, Alert, Tooltip, Badge, notification, message,
} from 'antd';
import { PlusOutlined, WarningOutlined, CheckCircleOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
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

function BookingCell({ booking, onClick }) {
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.done;
  return (
    <Tooltip title={`${booking.customerName} / ${booking.serviceName} / ${booking.startTime}–${booking.endTime}`}>
      <div
        onClick={() => onClick(booking)}
        style={{
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderLeft: `3px solid ${cfg.border}`,
          borderRadius: 4,
          padding: '2px 6px',
          fontSize: 11,
          cursor: 'pointer',
          marginBottom: 2,
          lineHeight: 1.4,
        }}
      >
        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {booking.customerName}
        </div>
        <div style={{ color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {booking.serviceName}
        </div>
        <Tag color={cfg.color} style={{ fontSize: 10, padding: '0 3px', lineHeight: '16px' }}>
          {cfg.label}
        </Tag>
      </div>
    </Tooltip>
  );
}

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
      const results = await Promise.all(weekDayStrings.map((date) => bookingsApi.list(date)));
      return results.flat();
  }, [weekDayStrings]);

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
    return apiBookings.flatMap((booking) => {
      const customer = customerMap.get(booking.customer_id);
      return (booking.items ?? []).map((item) => {
        const staff = staffMap.get(item.staff_id);
        const service = serviceMap.get(item.service_id);
        return {
          id: item.id,
          bookingId: booking.id,
          customerId: booking.customer_id,
          customerName: customer?.name ?? `顧客#${booking.customer_id}`,
          staffId: item.staff_id,
          staffName: staff?.name ?? `技師#${item.staff_id}`,
          serviceId: item.service_id,
          serviceName: service?.name ?? `服務#${item.service_id}`,
          date: dayjs(item.start_at).format('YYYY-MM-DD'),
          startTime: dayjs(item.start_at).format('HH:mm'),
          endTime: dayjs(item.end_at).format('HH:mm'),
          status: booking.status,
          price: Number(item.price),
        };
      });
    });
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

  const getBookingsForCell = (dateStr, slot) =>
    bookings.filter(
      (b) =>
        b.staffId === effectiveSelectedStaffId &&
        b.date === dateStr &&
        b.startTime === slot
    );

  const canGoPrevWeek = showPastRecords || weekStart.isAfter(currentRangeStart, 'day');

  const checkConflict = (changedValues, allValues) => {
    const { staffId, serviceId, startTime, bookingDate } = allValues;
    if (!staffId || !serviceId || !startTime || !bookingDate) {
      setConflictWarning(null);
      return;
    }
    const service = serviceList.find((s) => s.id === serviceId);
    if (!service) return;
    const startStr = startTime.format('HH:mm');
    const startMin = toMinutes(startStr);
    const endMin = toMinutes(startStr) + service.duration;
    const endStr = fromMinutes(endMin);
    if (!isValidTimeWindow(startMin, endMin)) {
      setConflictWarning('預約時間需在 09:00~22:00，且服務不可超過營業結束時間');
      return;
    }
    const dateStr = bookingDate.format('YYYY-MM-DD');
    if (!canBookBySchedule(staffId, dateStr, startMin, endMin)) {
      setConflictWarning('此技師該日期班別不可預約此時段（含休假）');
      return;
    }
    const conflict = hasConflict(bookings, staffId, dateStr, startStr, endStr);
    setConflictWarning(conflict ? `${startStr}–${endStr} 與現有預約衝突` : null);
  };

  const handleAdd = async (values) => {
    const service = serviceList.find((s) => s.id === values.serviceId);
    const staff = staffList.find((s) => s.id === values.staffId);
    const customer = customerList.find((c) => c.id === values.customerId);
    if (!service || !staff || !customer) {
      message.error('顧客 / 服務 / 技師資料不完整，請重新整理');
      return;
    }
    const startStr = values.startTime.format('HH:mm');
    const startMin = toMinutes(startStr);
    const endMin = toMinutes(startStr) + service.duration;
    const endStr = fromMinutes(endMin);
    const bookingDate = values.bookingDate;
    const bookingDateStr = bookingDate.format('YYYY-MM-DD');
    if (!isValidTimeWindow(startMin, endMin)) {
      setConflictWarning('預約時間需在 09:00~22:00，且服務不可超過營業結束時間');
      return;
    }
    if (!canBookBySchedule(staff.id, bookingDateStr, startMin, endMin)) {
      setConflictWarning('此技師該日期班別不可預約此時段（含休假）');
      return;
    }

    if (hasConflict(bookings, staff.id, bookingDateStr, startStr, endStr)) {
      setConflictWarning(`${staff.name} 在 ${bookingDateStr} ${startStr}–${endStr} 已有預約，請換時段`);
      return;
    }

    try {
      await bookingsApi.create({
        customer_id: customer.id,
        note: null,
        items: [{
          service_id: service.id,
          staff_id: staff.id,
          start_at: values.startTime
            .year(bookingDate.year())
            .month(bookingDate.month())
            .date(bookingDate.date())
            .second(0)
            .millisecond(0)
            .toISOString(),
          price: Number(service.price),
        }],
      });
      await refetch();
      setAddOpen(false);
      setConflictWarning(null);
      form.resetFields();
      message.success('預約已建立');
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
                staffId: effectiveSelectedStaffId ?? undefined,
                bookingDate: weekDays[0],
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
                        <BookingCell key={b.id} booking={b} onClick={(b) => { setDetailBooking(b); setDetailOpen(true); }} />
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
        title="新增預約"
        open={addOpen}
        onCancel={() => { setAddOpen(false); setConflictWarning(null); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="確認新增" cancelText="取消"
        okButtonProps={{ disabled: !!conflictWarning }}
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
          <Form.Item name="serviceId" label="服務項目（美髮）" rules={[{ required: true }]}>
            <Select placeholder="選擇服務" showSearch optionFilterProp="children">
              {serviceList.map((s) => (
                <Select.Option key={s.id} value={s.id}>{s.name} — {s.duration}分鐘 / ${s.price}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="staffId" label="指定技師（美髮）" rules={[{ required: true }]}>
            <Select placeholder="選擇技師">
              {staffList.map((s) => (
                <Select.Option key={s.id} value={s.id}>
                  <Space>
                    <Avatar size="small" style={{ background: s.color }}>{s.name[0]}</Avatar>
                    {s.name}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="bookingDate" label="預約日期" rules={[{ required: true }]}>
            <DatePicker
              style={{ width: '100%' }}
              onChange={() => checkConflict({}, form.getFieldsValue())}
              disabledDate={(current) =>
                !showPastRecords && current && current.startOf('day').isBefore(today)
              }
            />
          </Form.Item>
          <Form.Item name="startTime" label="開始時間" rules={[{ required: true }]}>
            <TimePicker
              format="HH:mm"
              minuteStep={30}
              style={{ width: '100%' }}
              disabledTime={() => ({
                disabledHours: () => [
                  0, 1, 2, 3, 4, 5, 6, 7, 8,
                  22, 23,
                ],
                disabledMinutes: () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
              })}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 預約詳情 Modal */}
      <Modal
        title="預約詳情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="cancel" danger onClick={() => { handleStatusChange('cancelled'); setDetailOpen(false); }}>
            取消預約
          </Button>,
          detailBooking?.status === 'confirmed' && (
            <Button key="start" type="primary" icon={<CheckCircleOutlined />}
              onClick={() => handleStatusChange('in_progress')}>
              開始服務
            </Button>
          ),
          detailBooking?.status === 'in_progress' && (
            <Button key="done" type="primary" icon={<CheckCircleOutlined />}
              onClick={() => { handleStatusChange('done'); setDetailOpen(false); }}>
              完成服務
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
            <div><Text type="secondary">時段：</Text><Text>{detailBooking.startTime} – {detailBooking.endTime}</Text></div>
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
