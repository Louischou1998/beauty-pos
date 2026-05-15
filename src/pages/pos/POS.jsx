import { useState, useMemo } from 'react';
import {
  Card, Col, Row, Button, Tag, Typography, Divider,
  Select, Space, Empty, Modal, message, Spin, Result,
  Input, Tabs, InputNumber, Alert, Form, Popconfirm, Grid,
} from 'antd';
import {
  DeleteOutlined, ShoppingCartOutlined, CheckCircleOutlined,
  GiftOutlined, PlusOutlined, TagOutlined, MinusCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { servicesApi } from '../../api/services';
import { customersApi } from '../../api/customers';
import { productsApi } from '../../api/products';
import { couponsApi } from '../../api/coupons';
import { checkoutApi } from '../../api/checkout';
import { staffApi } from '../../api/staff';
import { parseApiError } from '../../utils/apiError';

const { Text } = Typography;

const PRODUCT_CATEGORIES = ['全部', '洗護', '染後護理', '造型', '頭皮護理'];
const PAYMENT_METHODS = [
  { value: 'cash', label: '現金' },
  { value: 'card', label: '刷卡' },
  { value: 'line_pay', label: 'LINE Pay' },
  { value: 'store_value', label: '儲值金' },
];

function ItemGrid({
  items, category, categories, onCategoryChange, onAdd, labelKey = 'category',
  canManage, onEdit, onDelete,
}) {
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
          <Col key={s.id} xs={12} sm={12} md={8} lg={8}>
            <Card
              hoverable
              size="small"
              onClick={() => onAdd(s)}
              style={{ cursor: 'pointer', textAlign: 'center', position: 'relative' }}
              bodyStyle={{ padding: 10 }}
            >
              {canManage && (
                <Space
                  size={2}
                  style={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button type="default" size="small" icon={<EditOutlined />} onClick={() => onEdit(s)} />
                  <Popconfirm title="確認刪除？" description="將下架此項目" onConfirm={() => onDelete(s)} okText="確認" cancelText="取消">
                    <Button type="default" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              )}
              <Tag color="blue" style={{ marginBottom: 4, fontSize: 11 }}>{s[labelKey]}</Tag>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{s.name}</div>
              {s.duration != null && s.duration > 0 && (
                <Text type="secondary" style={{ fontSize: 11 }}>{s.duration} 分鐘</Text>
              )}
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
  const screens = Grid.useBreakpoint();
  const isNarrow = !screens.md;
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: services, error: servicesError, setData: setServicesData } = useApi(servicesApi.list, null);
  const { data: serviceCategories } = useApi(servicesApi.listCategories, null);
  const { data: customers, error: customersError } = useApi(customersApi.list, null);
  const { data: products, error: productsError, setData: setProductsData } = useApi(productsApi.list, null);
  const { data: staffs, error: staffError } = useApi(staffApi.list, null);

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceEditing, setServiceEditing] = useState(null);
  const [serviceForm] = Form.useForm();
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productEditing, setProductEditing] = useState(null);
  const [productForm] = Form.useForm();

  const [cart, setCart] = useState([]);
  const [svcCat, setSvcCat] = useState('全部');
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

  // 動態分類：優先用後端 category_id，沒有才 fallback 推斷
  const categoryMap = useMemo(
    () => new Map((serviceCategories ?? []).map((c) => [c.id, c.name])),
    [serviceCategories],
  );
  const SERVICE_CATEGORIES = useMemo(
    () => ['全部', ...(serviceCategories ?? []).map((c) => c.name)],
    [serviceCategories],
  );
  const displayServiceList = useMemo(() => serviceList.map((s) => ({
    ...s,
    category: s.category_id
      ? (categoryMap.get(s.category_id) ?? inferServiceCategory(s.name))
      : inferServiceCategory(s.name),
  })), [serviceList, categoryMap]);

  const openAddService = () => {
    setServiceEditing(null);
    serviceForm.resetFields();
    setServiceModalOpen(true);
  };
  const openEditService = (row) => {
    setServiceEditing(row);
    serviceForm.setFieldsValue({
      name: row.name,
      category_id: row.category_id ?? undefined,
      duration: row.duration,
      price: row.price,
    });
    setServiceModalOpen(true);
  };
  const saveService = async (values) => {
    const payload = {
      name: values.name,
      category_id: values.category_id ?? null,
      duration: values.duration,
      price: values.price,
    };
    try {
      if (serviceEditing) {
        const u = await servicesApi.update(serviceEditing.id, payload);
        setServicesData((prev) => (prev ?? []).map((x) => (x.id === serviceEditing.id ? { ...x, ...u } : x)));
        message.success('服務已更新');
      } else {
        const c = await servicesApi.create(payload);
        setServicesData((prev) => [...(prev ?? []), c]);
        message.success('服務已新增');
      }
      setServiceModalOpen(false);
      serviceForm.resetFields();
    } catch (err) {
      const { message: errMsg } = parseApiError(err, serviceEditing ? '更新失敗' : '新增失敗');
      message.error(errMsg);
    }
  };
  const deleteServiceRow = async (row) => {
    try {
      await servicesApi.remove(row.id);
      setServicesData((prev) => (prev ?? []).filter((x) => x.id !== row.id));
      message.success('已刪除');
    } catch (err) {
      message.error(parseApiError(err, '刪除失敗').message);
    }
  };

  const openAddProduct = () => {
    setProductEditing(null);
    productForm.resetFields();
    setProductModalOpen(true);
  };
  const openEditProduct = (row) => {
    setProductEditing(row);
    productForm.setFieldsValue({
      name: row.name,
      category: row.category,
      price: row.price,
      cost: row.cost,
      stock: row.stock,
      barcode: row.barcode,
    });
    setProductModalOpen(true);
  };
  const saveProduct = async (values) => {
    try {
      if (productEditing) {
        const u = await productsApi.update(productEditing.id, values);
        setProductsData((prev) => (prev ?? []).map((x) => (x.id === productEditing.id ? u : x)));
        message.success('商品已更新');
      } else {
        const c = await productsApi.create(values);
        setProductsData((prev) => [...(prev ?? []), c]);
        message.success('商品已新增');
      }
      setProductModalOpen(false);
      productForm.resetFields();
    } catch (err) {
      const { message: errMsg } = parseApiError(err, productEditing ? '更新失敗' : '新增失敗');
      message.error(errMsg);
    }
  };
  const deleteProductRow = async (row) => {
    try {
      await productsApi.remove(row.id);
      setProductsData((prev) => (prev ?? []).filter((x) => x.id !== row.id));
      message.success('已刪除');
    } catch (err) {
      message.error(parseApiError(err, '刪除失敗').message);
    }
  };

  const addToCart = useCallback((item, type) => {
    const key = `${type}_${item.id}`;
    setCart((prev) => {
      const existing = prev.find((i) => i._key === key);
      if (existing) return prev.map((i) => i._key === key ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, _key: key, _type: type, qty: 1, staffId: null, isDesignated: false }];
    });
  }, []);

  const removeFromCart = useCallback((key) => setCart((prev) => prev.filter((i) => i._key !== key)), []);
  const updateStaff = useCallback((key, staffId) => setCart((prev) => prev.map((i) => i._key === key ? { ...i, staffId } : i)), []);
  const toggleDesignated = useCallback((key) => setCart((prev) => prev.map((i) => i._key === key ? { ...i, isDesignated: !i.isDesignated } : i)), []);
  const applyStaffToAllServices = useCallback((staffId) =>
    setCart((prev) => prev.map((i) => (i._type === 'service' ? { ...i, staffId } : i))), []);

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
    <div
      style={{
        padding: isNarrow ? '12px 10px' : 16,
        height: isNarrow ? 'auto' : 'calc(100vh - 58px)',
        minHeight: isNarrow ? 'calc(100vh - 52px)' : undefined,
        display: 'flex',
        flexDirection: isNarrow ? 'column' : 'row',
        gap: isNarrow ? 12 : 16,
        overflow: isNarrow ? 'visible' : 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* 左：商品/服務選擇 */}
      <div style={{ flex: 1, overflow: isNarrow ? 'visible' : 'auto', minWidth: 0 }}>
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
                <>
                  {isAdmin && (
                    <div style={{ marginBottom: 12 }}>
                      <Button type="primary" icon={<PlusOutlined />} size="small" onClick={openAddService}>新增服務</Button>
                    </div>
                  )}
                  <ItemGrid
                    items={displayServiceList}
                    category={svcCat}
                    categories={SERVICE_CATEGORIES}
                    labelKey="category"
                    onCategoryChange={setSvcCat}
                    onAdd={(s) => addToCart(s, 'service')}
                    canManage={isAdmin}
                    onEdit={openEditService}
                    onDelete={deleteServiceRow}
                  />
                </>
              ),
            },
            {
              key: 'product', label: '商品銷售',
              children: (
                <>
                  {isAdmin && (
                    <div style={{ marginBottom: 12 }}>
                      <Button type="primary" icon={<PlusOutlined />} size="small" onClick={openAddProduct}>新增商品</Button>
                    </div>
                  )}
                  <ItemGrid
                    items={productList}
                    category={prdCat}
                    categories={PRODUCT_CATEGORIES}
                    onCategoryChange={setPrdCat}
                    onAdd={(p) => addToCart(p, 'product')}
                    canManage={isAdmin}
                    onEdit={openEditProduct}
                    onDelete={deleteProductRow}
                  />
                </>
              ),
            },
          ]}
        />
      </div>

      {/* 右：購物車 */}
      <div
        style={{
          width: isNarrow ? '100%' : 360,
          maxWidth: '100%',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Card
          title={<Space><ShoppingCartOutlined /><span>結帳清單</span></Space>}
          style={{ flex: 1, overflow: 'auto', minHeight: isNarrow ? 200 : undefined }}
          bodyStyle={{ padding: 10 }}
          extra={
            <Select allowClear placeholder="選顧客" style={{ width: isNarrow ? 110 : 130 }}
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
              <div key={item._key} style={{
                background: 'rgba(238,242,255,0.65)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(99,102,241,0.12)',
                borderRadius: 10,
                padding: 8,
                marginBottom: 8,
                transition: 'box-shadow .2s',
              }}>
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

      <Modal
        title={serviceEditing ? '編輯服務' : '新增服務'}
        open={serviceModalOpen}
        onCancel={() => { setServiceModalOpen(false); serviceForm.resetFields(); }}
        onOk={() => serviceForm.submit()}
        okText="儲存"
        cancelText="取消"
      >
        <Form form={serviceForm} layout="vertical" onFinish={saveService}>
          <Form.Item name="name" label="服務名稱" rules={[{ required: true, message: '請輸入名稱' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category_id" label="服務分類（後台）">
            <Select allowClear placeholder="選擇資料庫分類（可留空）" options={(serviceCategories ?? []).map((c) => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Form.Item name="duration" label="時長（分鐘）" rules={[{ required: true, message: '請輸入時長' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="price" label="價格" rules={[{ required: true, message: '請輸入價格' }]}>
            <InputNumber min={0} prefix="$" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={productEditing ? '編輯商品' : '新增商品'}
        open={productModalOpen}
        onCancel={() => { setProductModalOpen(false); productForm.resetFields(); }}
        onOk={() => productForm.submit()}
        okText="儲存"
        cancelText="取消"
      >
        <Form form={productForm} layout="vertical" onFinish={saveProduct}>
          <Form.Item name="name" label="商品名稱" rules={[{ required: true, message: '請輸入名稱' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="分類">
            <Select placeholder="選擇分類">
              {PRODUCT_CATEGORIES.filter((c) => c !== '全部').map((c) => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="price" label="售價" rules={[{ required: true, message: '請輸入售價' }]} style={{ flex: 1 }}>
              <InputNumber min={0} prefix="$" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="cost" label="成本" style={{ flex: 1 }}>
              <InputNumber min={0} prefix="$" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="stock" label="庫存">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="barcode" label="條碼">
            <Input />
          </Form.Item>
        </Form>
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
