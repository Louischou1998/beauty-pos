import { useEffect, useState } from 'react';
import {
  Card, Steps, Button, Form, Input, Typography,
  Space, Tag, Result, Alert, Row, Col, Avatar,
} from 'antd';
import {
  ScissorOutlined, UserOutlined, ClockCircleOutlined,
  CheckCircleOutlined, PhoneOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { parseApiError } from '../../utils/apiError';

const { Title, Text } = Typography;

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

const CATEGORIES = ['全部', '美髮'];
const CAT_COLORS = { 美髮: 'purple' };

async function fetchPortal(path, params = {}) {
  const res = await axios.get(`${BASE}/portal/${path}`, { params });
  return res.data;
}

async function submitBooking(data) {
  const res = await axios.post(`${BASE}/portal/book`, data);
  return res.data;
}

export default function BookingPortal() {
  const [step, setStep] = useState(0);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedDate, setSelectedDate] = useState('2026-05-08');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [catFilter, setCatFilter] = useState('全部');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const displaySlots = selectedService ? slots : [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [servicesData, staffData] = await Promise.all([
          fetchPortal('services'),
          fetchPortal('staff'),
        ]);
        if (cancelled) return;
        setServices((servicesData ?? []).map((s) => ({ ...s, category: '美髮' })));
        setStaff(staffData ?? []);
      } catch (err) {
        if (!cancelled) setLoadError(parseApiError(err, '載入預約資料失敗').message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!selectedService || !selectedDate) return () => { cancelled = true; };
    (async () => {
      try {
        const data = await fetchPortal('available-slots', {
          service_id: selectedService.id,
          staff_id: selectedStaff?.id,
          date: selectedDate,
        });
        if (cancelled) return;
        const available = (data ?? [])
          .filter((s) => s.available)
          .map((s) => s.time.slice(11, 16));
        setSlots(available);
        if (selectedSlot && !available.includes(selectedSlot)) {
          setSelectedSlot(null);
        }
      } catch (err) {
        if (!cancelled) setLoadError(parseApiError(err, '載入可預約時段失敗').message);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedService, selectedStaff, selectedDate, selectedSlot]);

  const filteredServices = catFilter === '全部' ? services : services.filter((s) => s.category === catFilter);

  const handleConfirm = async (values) => {
    setLoading(true);
    setLoadError(null);
    const startAt = `${selectedDate}T${selectedSlot}:00`;
    try {
      const apiResult = await submitBooking({
        customer_name: values.name,
        customer_phone: values.phone,
        service_id: selectedService.id,
        staff_id: selectedStaff?.id ?? null,
        start_at: startAt,
      });
      setResult(apiResult);
      setStep(3);
    } catch (err) {
      setLoadError(parseApiError(err, '送出預約失敗').message);
    }
    setLoading(false);
  };

  const reset = () => {
    setStep(0); setSelectedService(null); setSelectedStaff(null);
    setSelectedSlot(null); setResult(null); form.resetFields();
  };

  const steps = [
    { title: '選服務', icon: <ScissorOutlined /> },
    { title: '選時間', icon: <ClockCircleOutlined /> },
    { title: '填資料', icon: <UserOutlined /> },
    { title: '完成', icon: <CheckCircleOutlined /> },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e8d5f5 100%)', padding: '32px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* 標題 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💅</div>
          <Title level={2} style={{ color: '#722ed1', margin: 0 }}>線上預約</Title>
          <Text type="secondary">選擇您的服務，輕鬆完成預約</Text>
        </div>

        <Card style={{ borderRadius: 16, boxShadow: '0 8px 32px rgba(114,46,209,0.1)' }}>
          <Steps current={step} items={steps} style={{ marginBottom: 32 }} />
          {loadError && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={loadError} />}

          {/* Step 0 : 選服務 */}
          {step === 0 && (
            <div>
              <Space wrap style={{ marginBottom: 16 }}>
                {CATEGORIES.map((c) => (
                  <Button key={c} type={catFilter === c ? 'primary' : 'default'}
                    size="small" onClick={() => setCatFilter(c)}>{c}</Button>
                ))}
              </Space>
              <Row gutter={[12, 12]}>
                {filteredServices.map((s) => (
                  <Col key={s.id} xs={24} sm={12}>
                    <Card
                      hoverable size="small"
                      onClick={() => { setSelectedService(s); setStep(1); }}
                      style={{
                        cursor: 'pointer',
                        border: selectedService?.id === s.id ? '2px solid #722ed1' : undefined,
                        borderRadius: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Tag color={CAT_COLORS[s.category]} style={{ marginBottom: 4 }}>{s.category}</Tag>
                          <div style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</div>
                          <Text type="secondary" style={{ fontSize: 12 }}>{s.duration} 分鐘</Text>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#722ed1' }}>
                          ${s.price.toLocaleString()}
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}

          {/* Step 1 : 選時間 + 技師 */}
          {step === 1 && (
            <div>
              <Alert type="info" showIcon style={{ marginBottom: 16 }}
                message={`已選：${selectedService?.name}｜${selectedService?.duration} 分鐘｜$${selectedService?.price}`} />

              <div style={{ marginBottom: 16 }}>
                <Text strong>指定技師（可不選）</Text>
                <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                  <Col>
                    <Card
                      hoverable size="small" onClick={() => setSelectedStaff(null)}
                      style={{
                        cursor: 'pointer', textAlign: 'center', width: 80,
                        border: !selectedStaff ? '2px solid #722ed1' : undefined, borderRadius: 12,
                      }}
                    >
                      <UserOutlined style={{ fontSize: 20, color: '#999' }} />
                      <div style={{ fontSize: 11, marginTop: 4 }}>不指定</div>
                    </Card>
                  </Col>
                  {staff.map((s) => (
                    <Col key={s.id}>
                      <Card
                        hoverable size="small" onClick={() => setSelectedStaff(s)}
                        style={{
                          cursor: 'pointer', textAlign: 'center', width: 80,
                          border: selectedStaff?.id === s.id ? '2px solid #722ed1' : undefined, borderRadius: 12,
                        }}
                      >
                        <Avatar size="small" style={{ background: s.color }}>{s.name[0]}</Avatar>
                        <div style={{ fontSize: 11, marginTop: 4 }}>{s.name}</div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>

              <div style={{ marginBottom: 16 }}>
                <Text strong>選擇日期</Text>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ marginTop: 8, width: 180, display: 'block' }} />
              </div>

              <div>
                <Text strong>選擇時段</Text>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {displaySlots.map((slot) => (
                    <Button key={slot}
                      type={selectedSlot === slot ? 'primary' : 'default'}
                      size="small"
                      onClick={() => setSelectedSlot(slot)}
                      style={{ borderRadius: 20, minWidth: 64 }}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              </div>

              <Space style={{ marginTop: 24 }}>
                <Button onClick={() => setStep(0)}>上一步</Button>
                <Button type="primary" disabled={!selectedSlot} onClick={() => setStep(2)}>
                  下一步
                </Button>
              </Space>
            </div>
          )}

          {/* Step 2 : 填寫顧客資料 */}
          {step === 2 && (
            <div>
              <Alert type="info" showIcon style={{ marginBottom: 16 }}
                message={`${selectedService?.name}｜${selectedDate} ${selectedSlot}｜技師：${selectedStaff?.name ?? '不指定'}`} />

              <Form form={form} layout="vertical" onFinish={handleConfirm}>
                <Form.Item name="name" label="姓名" rules={[{ required: true, message: '請輸入姓名' }]}>
                  <Input prefix={<UserOutlined />} placeholder="您的姓名" size="large" />
                </Form.Item>
                <Form.Item name="phone" label="手機號碼"
                  rules={[{ required: true, message: '請輸入手機號碼' }]}>
                  <Input prefix={<PhoneOutlined />} placeholder="09xx-xxx-xxx" size="large" />
                </Form.Item>
                <Form.Item name="note" label="備註（過敏史、特殊需求）">
                  <Input.TextArea rows={2} placeholder="選填" />
                </Form.Item>
                <Space>
                  <Button onClick={() => setStep(1)}>上一步</Button>
                  <Button type="primary" htmlType="submit" loading={loading}>確認送出預約</Button>
                </Space>
              </Form>
            </div>
          )}

          {/* Step 3 : 完成 */}
          {step === 3 && result && (
            <Result
              status="success"
              title="預約成功！"
              subTitle={
                <div style={{ textAlign: 'left', maxWidth: 360, margin: '0 auto' }}>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">訂單編號：</Text>
                    <Text strong>#{result.booking_id}</Text>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">服務：</Text>
                    <Text strong>{result.service_name}</Text>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">技師：</Text>
                    <Text>{result.staff_name}</Text>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">時間：</Text>
                    <Text>{selectedDate} {selectedSlot}</Text>
                  </div>
                  <div>
                    <Text type="secondary">費用：</Text>
                    <Text strong style={{ color: '#722ed1' }}>${Number(result.price).toLocaleString()}</Text>
                  </div>
                </div>
              }
              extra={[
                <Button key="back" type="primary" onClick={reset}>再次預約</Button>,
              ]}
            />
          )}
        </Card>

        <div style={{ textAlign: 'center', marginTop: 16, color: '#999', fontSize: 12 }}>
          如需修改或取消，請致電門市
        </div>
      </div>
    </div>
  );
}
