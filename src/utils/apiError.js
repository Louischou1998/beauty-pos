const ERROR_CODE_MESSAGES = {
  VALIDATION_ERROR: '輸入資料格式有誤，請檢查後重試',
  SERVICE_NOT_FOUND: '找不到服務項目，請重新整理後再試',
  PRODUCT_NOT_FOUND: '找不到商品資料，請重新整理後再試',
  BOOKING_NOT_FOUND: '找不到預約資料，可能已被刪除',
  BOOKING_CONFLICT: '該時段已被預約，請改選其他時間',
  INVALID_TIME_SLOT: '預約時間需為 30 分鐘整點，且需落在營業時間內',
  EMPTY_CHECKOUT: '結帳項目不可為空',
  PAYMENT_TOTAL_MISMATCH: '付款總額與應收金額不一致',
  INSUFFICIENT_STOCK: '商品庫存不足，請調整數量',
  NO_AVAILABLE_STAFF: '目前沒有可預約的技師',
  STAFF_NOT_AVAILABLE: '指定技師目前不可預約',
  STAFF_OFF_SHIFT: '該技師此時段為休假或非排班時段，無法預約',
};

export function parseApiError(error, fallbackMessage = '操作失敗') {
  if (!error?.response) {
    return { code: 'NETWORK_ERROR', message: '無法連線到伺服器，請檢查 API 是否啟動' };
  }
  if (error?.response?.status === 401) {
    return { code: 'UNAUTHORIZED', message: '登入已失效，請重新登入' };
  }
  if (error?.response?.status === 403) {
    return { code: 'FORBIDDEN', message: '你沒有此操作權限' };
  }
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') {
    return { code: null, message: detail };
  }
  if (detail && typeof detail === 'object') {
    const code = detail.code ?? null;
    const mappedMessage = code ? ERROR_CODE_MESSAGES[code] : null;
    return {
      code,
      message: mappedMessage ?? detail.message ?? fallbackMessage,
      meta: detail.meta ?? {},
    };
  }
  return { code: null, message: fallbackMessage };
}
