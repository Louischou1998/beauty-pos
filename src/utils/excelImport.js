import * as XLSX from 'xlsx';

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('讀取檔案失敗'));
    reader.readAsArrayBuffer(file);
  });
}

function normHeader(s) {
  return String(s).replace(/\s/g, '').trim();
}

export function findCell(row, aliases) {
  const map = {};
  for (const k of Object.keys(row)) {
    map[normHeader(k)] = row[k];
  }
  for (const a of aliases) {
    const key = normHeader(a);
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      const v = map[key];
      if (v !== '' && v != null) return v;
    }
  }
  return undefined;
}

export function downloadXlsxTemplate(filename, headerRow, sampleRows = []) {
  const aoa = [headerRow, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '匯入');
  XLSX.writeFile(wb, filename, { compression: true });
}

const PRODUCT_ALIASES = {
  name: ['商品名稱', '名稱', 'name'],
  category: ['分類', 'category'],
  price: ['售價', 'price'],
  cost: ['成本', 'cost'],
  stock: ['庫存', 'stock'],
  barcode: ['條碼', 'barcode'],
};

export function rowToProduct(row) {
  const get = (field) => findCell(row, PRODUCT_ALIASES[field]);
  const name = String(get('name') ?? '').trim();
  const priceRaw = get('price');
  return {
    name,
    category: (() => {
      const c = get('category');
      return c != null && String(c).trim() !== '' ? String(c).trim() : undefined;
    })(),
    price: priceRaw === undefined || priceRaw === '' ? NaN : Number(priceRaw),
    cost: (() => {
      const c = get('cost');
      return c === undefined || c === '' ? 0 : Number(c);
    })(),
    stock: (() => {
      const s = get('stock');
      return s === undefined || s === '' ? 0 : Number(s);
    })(),
    barcode: (() => {
      const b = get('barcode');
      return b != null && String(b).trim() !== '' ? String(b).trim() : undefined;
    })(),
  };
}

export const PRODUCT_TEMPLATE_HEADERS = ['商品名稱', '分類', '售價', '成本', '庫存', '條碼'];

const CUSTOMER_ALIASES = {
  name: ['姓名', '名稱', 'name'],
  phone: ['電話', '手機', 'phone'],
  email: ['email', 'Email', '信箱'],
  level: ['會員等級', '等級', 'level'],
};

export function rowToCustomer(row) {
  const get = (field) => findCell(row, CUSTOMER_ALIASES[field]);
  return {
    name: String(get('name') ?? '').trim(),
    phone: String(get('phone') ?? '').trim(),
    email: (() => {
      const e = get('email');
      return e != null && String(e).trim() !== '' ? String(e).trim() : undefined;
    })(),
    level: (() => {
      const l = get('level');
      const s = l != null ? String(l).trim() : '';
      if (!s) return '一般';
      return ['一般', '黃金', 'VIP'].includes(s) ? s : '一般';
    })(),
  };
}

export const CUSTOMER_TEMPLATE_HEADERS = ['姓名', '電話', 'Email', '會員等級'];

const STAFF_ALIASES = {
  name: ['姓名', '名稱', 'name'],
  phone: ['電話', '手機', 'phone'],
  skills: ['技能', '技能標籤', 'skills'],
  commission_rate: ['提成比例', '提成', 'commission_rate', '提成%'],
  color: ['代表色', '顏色', 'color', '色碼'],
};

export function rowToStaff(row) {
  const get = (field) => findCell(row, STAFF_ALIASES[field]);
  const skillsRaw = get('skills');
  const skills = String(skillsRaw ?? '')
    .split(/[,，、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const cr = get('commission_rate');
  const commission_rate = cr === undefined || cr === '' ? 35 : Number(cr);
  const colorRaw = get('color');
  let color = colorRaw != null && String(colorRaw).trim() !== '' ? String(colorRaw).trim() : '#1677ff';
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) color = '#1677ff';
  return {
    name: String(get('name') ?? '').trim(),
    phone: (() => {
      const p = get('phone');
      return p != null && String(p).trim() !== '' ? String(p).trim() : undefined;
    })(),
    skills,
    commission_rate: Number.isFinite(commission_rate) ? commission_rate : 35,
    color,
  };
}

export const STAFF_TEMPLATE_HEADERS = ['姓名', '電話', '技能', '提成比例', '代表色'];

const INVENTORY_ALIASES = {
  name: ['品項名稱', '名稱', 'name'],
  category: ['分類', 'category'],
  unit: ['單位', 'unit'],
  quantity: ['現有庫存', '庫存', '數量', 'quantity'],
  low_stock_threshold: ['警戒值', '低庫存警戒', 'low_stock_threshold'],
  cost_per_unit: ['單位成本', '成本', 'cost_per_unit'],
};

export function rowToInventory(row) {
  const get = (field) => findCell(row, INVENTORY_ALIASES[field]);
  const q = get('quantity');
  const th = get('low_stock_threshold');
  const cpu = get('cost_per_unit');
  return {
    name: String(get('name') ?? '').trim(),
    category: (() => {
      const c = get('category');
      return c != null && String(c).trim() !== '' ? String(c).trim() : undefined;
    })(),
    unit: (() => {
      const u = get('unit');
      return u != null && String(u).trim() !== '' ? String(u).trim() : '個';
    })(),
    quantity: q === undefined || q === '' ? 0 : Number(q),
    low_stock_threshold: th === undefined || th === '' ? 10 : Number(th),
    cost_per_unit: cpu === undefined || cpu === '' ? 0 : Number(cpu),
  };
}

export const INVENTORY_TEMPLATE_HEADERS = ['品項名稱', '分類', '單位', '現有庫存', '警戒值', '單位成本'];

export async function importRowsSequential(rows, perRow) {
  const errors = [];
  let ok = 0;
  for (let i = 0; i < rows.length; i++) {
    const excelRow = i + 2;
    try {
      await perRow(rows[i], i);
      ok += 1;
    } catch (err) {
      errors.push({ excelRow, err });
    }
  }
  return { ok, errors };
}
