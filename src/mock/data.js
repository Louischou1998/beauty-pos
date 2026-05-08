export const mockStaff = [
  { id: 1, name: '小美', color: '#f56a00', skills: ['美容', '美甲'], commission_rate: 35 },
  { id: 2, name: '小雯', color: '#7265e6', skills: ['美髮', '燙染'], commission_rate: 40 },
  { id: 3, name: '阿芳', color: '#00a2ae', skills: ['SPA', '美容'], commission_rate: 35 },
  { id: 4, name: '小琪', color: '#e6704a', skills: ['美甲', '美睫'], commission_rate: 38 },
];

export const mockServices = [
  { id: 1, name: '基礎護膚', duration: 60, price: 1200, category: '美容' },
  { id: 2, name: '深層清潔', duration: 90, price: 1800, category: '美容' },
  { id: 3, name: '剪髮', duration: 45, price: 500, category: '美髮' },
  { id: 4, name: '燙髮', duration: 150, price: 3000, category: '美髮' },
  { id: 5, name: '凝膠指甲', duration: 60, price: 800, category: '美甲' },
  { id: 6, name: '卸甲', duration: 30, price: 300, category: '美甲' },
  { id: 7, name: '全身SPA', duration: 120, price: 2500, category: 'SPA' },
  { id: 8, name: '美睫嫁接', duration: 90, price: 1500, category: '美睫' },
];

export const mockProducts = [
  { id: 101, name: '玻尿酸保濕精華', category: '保養品', price: 1800, cost: 600, stock: 24, barcode: 'P001' },
  { id: 102, name: 'SPF50 防曬乳', category: '防曬', price: 680, cost: 200, stock: 32, barcode: 'P002' },
  { id: 103, name: '深層清潔面膜 (5片)', category: '面膜', price: 450, cost: 120, stock: 18, barcode: 'P003' },
  { id: 104, name: '角蛋白護髮素', category: '護髮', price: 980, cost: 320, stock: 8, barcode: 'P004' },
  { id: 105, name: '指緣修護油', category: '美甲', price: 380, cost: 90, stock: 15, barcode: 'P005' },
  { id: 106, name: '舒緩按摩精油 30ml', category: 'SPA', price: 1200, cost: 400, stock: 6, barcode: 'P006' },
];

export const mockCustomers = [
  { id: 1, name: '陳小姐', phone: '0912-345-678', level: 'VIP', points: 3200, balance: 5000, total_spent: 28000, visits: 14,
    allergy_info: '對薰衣草精油過敏', preferred_staff_id: 1, revisit_days: 21, last_visit_at: '2026-04-16' },
  { id: 2, name: '林太太', phone: '0923-456-789', level: '一般', points: 800, balance: 0, total_spent: 6500, visits: 5,
    allergy_info: '', preferred_staff_id: null, revisit_days: 30, last_visit_at: '2026-04-07' },
  { id: 3, name: '王小姐', phone: '0934-567-890', level: '黃金', points: 1500, balance: 2000, total_spent: 15000, visits: 9,
    allergy_info: '對酒精成分敏感', preferred_staff_id: 2, revisit_days: 28, last_visit_at: '2026-04-09' },
  { id: 4, name: '張女士', phone: '0945-678-901', level: 'VIP', points: 5600, balance: 8000, total_spent: 52000, visits: 26,
    allergy_info: '', preferred_staff_id: 1, revisit_days: 14, last_visit_at: '2026-04-23' },
];

export const mockBookings = [
  { id: 1, customerId: 1, customerName: '陳小姐', staffId: 1, staffName: '小美',
    serviceId: 1, serviceName: '基礎護膚', date: '2026-05-07', startTime: '10:00', endTime: '11:00', status: 'confirmed', price: 1200 },
  { id: 2, customerId: 3, customerName: '王小姐', staffId: 2, staffName: '小雯',
    serviceId: 4, serviceName: '燙髮', date: '2026-05-07', startTime: '09:00', endTime: '11:30', status: 'in_progress', price: 3000 },
  { id: 3, customerId: 2, customerName: '林太太', staffId: 3, staffName: '阿芳',
    serviceId: 7, serviceName: '全身SPA', date: '2026-05-07', startTime: '14:00', endTime: '16:00', status: 'confirmed', price: 2500 },
  { id: 4, customerId: 4, customerName: '張女士', staffId: 4, staffName: '小琪',
    serviceId: 5, serviceName: '凝膠指甲', date: '2026-05-07', startTime: '13:00', endTime: '14:00', status: 'pending', price: 800 },
];

export const mockCoupons = [
  { id: 1, code: 'WELCOME10', name: '新客九折', type: 'percent', value: 0.1, min_amount: 0, max_uses: 100, used_count: 23, valid_until: '2026-12-31', is_active: 1 },
  { id: 2, code: 'SAVE200', name: '滿千折兩百', type: 'fixed', value: 200, min_amount: 1000, max_uses: 50, used_count: 8, valid_until: '2026-06-30', is_active: 1 },
  { id: 3, code: 'VIP2026', name: 'VIP 八五折', type: 'percent', value: 0.15, min_amount: 2000, max_uses: 0, used_count: 12, valid_until: '2026-12-31', is_active: 1 },
  { id: 4, code: 'SUMMER', name: '夏日免費卸甲', type: 'free_service', value: 300, min_amount: 800, max_uses: 30, used_count: 30, valid_until: '2026-07-31', is_active: 0 },
];

export const mockPayments = [
  { id: 1, booking_id: 1, method: 'cash', amount: 1200, created_at: '2026-05-07T11:05:00' },
  { id: 2, booking_id: 2, method: 'card', amount: 2000, created_at: '2026-05-07T11:32:00' },
  { id: 3, booking_id: 2, method: 'store_value', amount: 1000, created_at: '2026-05-07T11:32:00' },
  { id: 4, booking_id: 3, method: 'line_pay', amount: 2500, created_at: '2026-05-07T16:05:00' },
];

export const mockCommissions = [
  { id: 1, staff_id: 1, staff_name: '小美', booking_id: 1, type: 'service', service_name: '基礎護膚', base_amount: 1200, commission_rate: 35, commission_amount: 420, is_designated: true, created_at: '2026-05-07' },
  { id: 2, staff_id: 2, staff_name: '小雯', booking_id: 2, type: 'service', service_name: '燙髮', base_amount: 3000, commission_rate: 40, commission_amount: 1200, is_designated: false, created_at: '2026-05-07' },
  { id: 3, staff_id: 3, staff_name: '阿芳', booking_id: 3, type: 'service', service_name: '全身SPA', base_amount: 2500, commission_rate: 35, commission_amount: 875, is_designated: false, created_at: '2026-05-07' },
  { id: 4, staff_id: 1, staff_name: '小美', booking_id: 1, type: 'product', service_name: '玻尿酸保濕精華', base_amount: 1800, commission_rate: 10, commission_amount: 180, is_designated: true, created_at: '2026-05-07' },
];

export const mockStats = {
  todayRevenue: 15800,
  todayBookings: 12,
  pendingBookings: 3,
  activeCustomers: 4,
};
