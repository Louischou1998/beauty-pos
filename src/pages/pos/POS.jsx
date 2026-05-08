import { useState } from 'react';
import {
  Card, Col, Row, Button, Tag, Typography, Divider,
  Select, Space, Empty, Modal, message, Spin, Result,
  Input, Tabs, InputNumber, Alert,
} from 'antd';
import {
  DeleteOutlined, ShoppingCartOutlined, CheckCircleOutlined,
  GiftOutlined, PlusOutlined, TagOutlined, MinusCircleOutlined,
} from '@ant-design/icons';
import { useApi } from '../../hooks/useApi';
import { servicesApi } from '../../api/services';
import { customersApi } from '../../api/customers';
import { productsApi } from '../../api/products';
import { couponsApi } from '../../api/coupons';
import { checkoutApi } from '../../api/checkout';
import { staffApi } from '../../api/staff';
import { parseApiError } from '../../utils/apiError';

const { Text } = Typography;

const SERVICE_CATEGORIES = ['全部', '美髮', '染燙', '護理', '造型'];
const PRODUCT_CATEGORIES = ['全部', '洗護', '染後護理', '造型', '頭皮護理'];
const PAYMENT_METHODS = [
  { value: 'cash', label: '現金' },
  { value: 'card', label: '刷卡' },
  { value: 'line_pay', label: 'LINE Pay' },
  { value: 'store_value', label: '儲值金' },
];

function ItemGrid({ items, category, categories, onCategoryChange, onAdd, labelKey = 'category' }) {
  const filtered = category === '全部' ? items : items.filter((s) => s[labelKey] === category);
  return (
    <>
      <Space wrap style={{ marginBottom: 12 }}>
        {categories.map((c) => (
          <Button key={c} type={category === c ? 'primary' : 'default'} size="small" onClick={() => onCategoryChange(c)}>{c}</Button>
        ))}
      </Space>
      <Row gutter={[10, 10]}>
        {filtered.map((s) => (
          <Col key={s.id} span={8}>
            <Card hoverable size="small" onClick={() => onAdd(s)}
              style={{ cursor: 'pointer', textAlign: 'center' }} bodyStyle={{ padding: 10 }}>
              <Tag color="blue" style={{ marginBottom: 4, fontSize: 11 }}>{s[labelKey]}</Tag>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{s.name}</div>
              {s.duration && <Text type="secondary" style={{ fontSize: 11 }}>{s.duration} 分鐘</Text>}
              {s.stock !== undefined && (
                <div><Text type="secondary" style={{ fontSize: 11 }}>庫存 {s.stock}</Text></div>
              )}
              <div style={{ color: '#f50', fontWeight: 600 }}>${Number(s.price).toLocaleString()}</div>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}

function inferServiceCategory(name = '') {
  if (/(染|燙)/.test(name)) return '染燙';
  if (/(護|頭皮|養護)/.test(name)) return '護理';
  if (/(造型|吹整)/.test(name)) return '造型';
  return '美髮';
}

export default function POS() {
  const { data: services, error: servicesError } = useApi(servicesApi.list, null);
  const { data: customers, error: customersError } = useApi(customersApi.list, null);
  const { data: products, error: productsError } = useApi(productsApi.list, null);
  const { data: staffs, error: staffError } = useApi(staffApi.list, null);

  const [cart, setCart] = useState([]);
  const [svcCat, setSvcCat] = useState('美髮');
  const [prdCat, setPrdCat] = useState('全部');
  const [customerId, setCustomerId] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);    // validated coupon
  const [couponMsg, setCouponMsg] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  // split payment: [{ method, amount }]
  const [payments, setPayments] = useState([{ method: 'cash', amount: 0 }]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);

  const serviceList = services ?? [];
  const customerList = customers ?? [];
  const productList = products ?? [];
  const staffList = staffs ?? [];
  const displayServiceList = serviceList.map((s) => ({
    ...s,
    category: s.category ?? inferServiceCategory(s.name),
  }));

  const addToCart = (item, type) => {
    const key = `${type}_${item.id}`;
    setCart((prev) => {
      const existing = prev.find((i) => i._key === key);
      if (existing) return prev.map((i) => i._key === key ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, _key: key, _type: type, qty: 1, staffId: null, isDesignated: false }];
    });
  };

  const removeFromCart = (key) => setCart((prev) => prev.filter((i) => i._key !== key));
  const updateStaff = (key, staffId) => setCart((prev) => prev.map((i) => i._key === key ? { ...i, staffId } : i));
  const toggleDesignated = (key) => setCart((prev) => prev.map((i) => i._key === key ? { ...i, isDesignated: !i.isDesignated } : i));
  const applyStaffToAllServices = (staffId) =>
    setCart((prev) => prev.map((i) => (i._type === 'service' ? { ...i, staffId } : i)));

  const subtotal = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const couponDiscount = coupon ? (coupon.type === 'percent' ? Math.round(subtotal * Number(coupon.value)) : Number(coupon.value)) : 0;
  const total = subtotal - couponDiscount;

  const paymentTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = total - paymentTotal;
  const unassignedServiceItems = cart.filter((item) => item._type === 'service' && !item.staffId);

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await couponsApi.validate(couponCode.trim(), subtotal);
      if (res.valid) {
        setCoupon(res.coupon);
        setCouponMsg(`✅ ${res.message} — 折抵 $${res.discount}`);
      } else {
        setCoupon(null);
        setCouponMsg(`❌ ${res.message}`);
      }
    } catch (err) {
      const { message: errMsg } = parseApiError(err, '優惠券驗證失敗');
      setCoupon(null);
      setCouponMsg(`❌ ${errMsg}`);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return message.warning('請先選擇項目');
    // 自動填入剩餘金額到第一筆付款
    setPayments([{ method: 'cash', amount: total }]);
    setCheckoutOpen(true);
  };

  const handlePaymentChange = (idx, field, val) => {
    setPayments((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  };
  const addPayment = () => setPayments((prev) => [...prev, { method: 'card', amount: 0 }]);
  const removePayment = (idx) => setPayments((prev) => prev.filter((_, i) => i !== idx));

  const confirmCheckout = async () => {
    if (!staffList.length) return message.error('目前沒有可用技師，無法結帳');
    const hasUnassignedStaff = cart.some((item) => item._type === 'service' && !item.staffId);
    if (hasUnassignedStaff) return message.error('請為所有服務項目指定技師');
    if (Math.abs(remaining) > 0.5) return message.error(`還差 $${Math.abs(remaining).toFixed(0)}，請確認付款金額`);
    setLoading(true);
    const items = cart.flatMap((item) =>
      Array.from({ length: item.qty }, () => ({
        type: item._type,
        item_id: item.id,
        staff_id: item.staffId ?? staffList[0]?.id,
        price: Number(item.price),
        is_designated: item.isDesignated,
      }))
    );
    try {
      const res = await checkoutApi.submit({
        customer_id: customerId || null,
        coupon_code: coupon ? couponCode : null,
        payments: payments.map((p) => ({ method: p.method, amount: Number(p.amount) })),
        items,
      });
      setReceipt(res);
    } catch (err) {
      setLoading(false);
      const { message: errMsg } = parseApiError(err, '結帳失敗，請稍後再試');
      message.error(errMsg);
      return;
    }
    setLoading(false);
    setCheckoutOpen(false);
    setReceiptOpen(true);
    setCart([]); setCustomerId(null); setCoupon(null); setCouponCode(''); setCouponMsg('');
    setPayments([{ method: 'cash', amount: 0 }]);
  };

  return (
    <div style={{ padding: 16, height: 'calc(100vh - 52px)', display: 'flex', gap: 16, overflow: 'hidden' }}>
      {/* 左：商品/服務選擇 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {(servicesError || customersError || productsError || staffError) && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message="資料載入失敗，請確認 API 與登入狀態"
          />
        )}
        <Tabs
          items={[
            {
              key: 'service', label: '服務項目',
              children: (
                <ItemGrid items={displayServiceList} category={svcCat} categories={SERVICE_CATEGORIES}
                  labelKey="category"
                  onCategoryChange={setSvcCat} onAdd={(s) => addToCart(s, 'service')} />
              ),
            },
            {
              key: 'product', label: '商品銷售',
              children: (
                <ItemGrid items={productList} category={prdCat} categories={PRODUCT_CATEGORIES}
                  onCategoryChange={setPrdCat} onAdd={(p) => addToCart(p, 'product')} />
              ),
            },
          ]}
        />
      </div>

      {/* 右：購物車 */}
      <div style={{ width: 360, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Card
          title={<Space><ShoppingCartOutlined /><span>結帳清單</span></Space>}
          style={{ flex: 1, overflow: 'auto' }}
          bodyStyle={{ padding: 10 }}
          extra={
            <Select allowClear placeholder="選顧客" style={{ width: 130 }}
              value={customerId} onChange={setCustomerId} size="small">
              {customerList.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}{c.level !== '一般' ? ` [${c.level}]` : ''}
                </Select.Option>
              ))}
            </Select>
          }
        >
          {cart.length === 0
            ? <Empty description="點擊左方項目加入" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            : cart.map((item) => (
              <div key={item._key} style={{ background: '#fafafa', borderRadius: 6, padding: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Space>
                    <Tag color={item._type === 'service' ? 'blue' : 'green'} style={{ fontSize: 10 }}>
                      {item._type === 'service' ? '服務' : '商品'}
                    </Tag>
                    <Text strong style={{ fontSize: 12 }}>{item.name}</Text>
                  </Space>
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeFromCart(item._key)} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  {item._type === 'service'
                    ? (
                      <Space size={4}>
                        <Select allowClear placeholder="技師" size="small" style={{ width: 90 }}
                          value={item.staffId} onChange={(v) => updateStaff(item._key, v)}>
                          {staffList.map((s) => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
                        </Select>
                        <Button size="small" type={item.isDesignated ? 'primary' : 'default'}
                          style={{ fontSize: 11 }} onClick={() => toggleDesignated(item._key)}>
                          指定
                        </Button>
                      </Space>
                    )
                    : <Text type="secondary" style={{ fontSize: 11 }}>庫存 {item.stock}</Text>
                  }
                  <Text style={{ color: '#f50', fontWeight: 600 }}>${(Number(item.price) * item.qty).toLocaleString()}</Text>
                </div>
              </div>
            ))
          }

          {/* 優惠券 */}
          <Divider style={{ margin: '8px 0' }} />
          <Space.Compact style={{ width: '100%' }}>
            <Input
              prefix={<TagOutlined />} placeholder="優惠碼" size="small"
              value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onPressEnter={validateCoupon}
            />
            <Button size="small" loading={couponLoading} onClick={validateCoupon}>套用</Button>
          </Space.Compact>
          {couponMsg && (
            <div style={{ fontSize: 12, marginTop: 4, color: coupon ? '#52c41a' : '#ff4d4f' }}>{couponMsg}</div>
          )}
        </Card>

        {/* 金額 */}
        <Card size="small" style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text type="secondary">小計</Text><Text>${subtotal.toLocaleString()}</Text>
          </div>
          {couponDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: '#52c41a' }}>優惠折抵</Text>
              <Text style={{ color: '#52c41a' }}>-${couponDiscount.toLocaleString()}</Text>
            </div>
          )}
          <Divider style={{ margin: '6px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text strong style={{ fontSize: 15 }}>合計</Text>
            <Text strong style={{ fontSize: 18, color: '#f50' }}>${total.toLocaleString()}</Text>
          </div>
          <Button type="primary" size="large" block icon={<CheckCircleOutlined />} onClick={handleCheckout}>
            前往結帳
          </Button>
        </Card>
      </div>

      {/* 結帳 Modal（分拆付款）*/}
      <Modal title="結帳付款" open={checkoutOpen}
        onOk={confirmCheckout} onCancel={() => setCheckoutOpen(false)}
        okText={loading ? <Spin size="small" /> : '確認收款'}
        okButtonProps={{ disabled: loading || Math.abs(remaining) > 0.5 }}
        cancelText="返回">
        <div style={{ marginBottom: 12 }}>
          <Text strong style={{ fontSize: 16 }}>應收：$</Text>
          <Text strong style={{ fontSize: 20, color: '#f50' }}>{total.toLocaleString()}</Text>
        </div>
        {unassignedServiceItems.length > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="尚有服務未指定技師，請先完成指定"
            description={
              <div style={{ marginTop: 8 }}>
                <Space style={{ marginBottom: 8 }} wrap>
                  <Text type="secondary">快速套用全部服務：</Text>
                  <Select
                    placeholder="選技師"
                    size="small"
                    style={{ width: 140 }}
                    onChange={applyStaffToAllServices}
                  >
                    {staffList.map((s) => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
                  </Select>
                </Space>
                {unassignedServiceItems.map((item) => (
                  <div key={item._key} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontSize: 12 }}>{item.name} x{item.qty}</Text>
                    <Select
                      placeholder="指定技師"
                      size="small"
                      style={{ width: 120 }}
                      value={item.staffId}
                      onChange={(v) => updateStaff(item._key, v)}
                    >
                      {staffList.map((s) => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
                    </Select>
                  </div>
                ))}
              </div>
            }
          />
        )}
        {payments.map((p, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <Select value={p.method} onChange={(v) => handlePaymentChange(idx, 'method', v)} style={{ width: 120 }}>
              {PAYMENT_METHODS.map((m) => <Select.Option key={m.value} value={m.value}>{m.label}</Select.Option>)}
            </Select>
            <InputNumber
              value={p.amount} min={0}
              onChange={(v) => handlePaymentChange(idx, 'amount', v)}
              style={{ flex: 1 }} prefix="$"
            />
            {payments.length > 1 && (
              <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => removePayment(idx)} />
            )}
          </div>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} size="small" onClick={addPayment}>新增付款方式</Button>
        {remaining !== 0 && (
          <Alert style={{ marginTop: 8 }}
            type={remaining > 0 ? 'warning' : 'info'}
            message={remaining > 0 ? `尚差 $${remaining.toFixed(0)}` : `找零 $${Math.abs(remaining).toFixed(0)}`}
            showIcon size="small"
          />
        )}
      </Modal>

      {/* 收據 Modal */}
      <Modal title="結帳完成" open={receiptOpen} onCancel={() => setReceiptOpen(false)}
        footer={[<Button key="close" type="primary" onClick={() => setReceiptOpen(false)}>完成</Button>]}>
        <Result
          status="success"
          title={`收款 $${Number(receipt?.total ?? 0).toLocaleString()}`}
          subTitle={
            <div style={{ textAlign: 'left' }}>
              {receipt?.coupon_discount > 0 && <div style={{ color: '#52c41a' }}>優惠折抵：-${Number(receipt.coupon_discount).toLocaleString()}</div>}
              {(receipt?.payments ?? []).map((p, i) => (
                <div key={i}>{PAYMENT_METHODS.find((m) => m.value === p.method)?.label}：${Number(p.amount).toLocaleString()}</div>
              ))}
              {receipt?.points_earned > 0 && (
                <div style={{ color: '#722ed1', marginTop: 8 }}>
                  <GiftOutlined /> 獲得 {receipt.points_earned} 點
                </div>
              )}
              {receipt?.booking_id && <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>訂單 #{receipt.booking_id}</div>}
            </div>
          }
        />
      </Modal>
    </div>
  );
}
