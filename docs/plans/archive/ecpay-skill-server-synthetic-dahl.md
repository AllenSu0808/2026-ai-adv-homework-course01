# ECPay 綠界金流整合計畫

## Context

花卉電商網站需要串接綠界 ECPay AIO 全方位金流，讓使用者可在訂單詳情頁點擊「使用綠界付款」後跳轉至綠界標準付款頁完成付款。由於專案僅運行於 localhost，ECPay 無法觸達 `ReturnURL`（Server Notify），因此付款狀態確認改為本地端主動呼叫 `QueryTradeInfo` API 查詢。

## 技術規格摘要（來自 ECPay skill + guides/01 + guides/13）

- **協議**：CMV-SHA256（AIO 全方位金流）
- **建立訂單端點**：`POST https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5`（回應為 HTML auto-submit form）
- **查詢端點**：`POST https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5`（回應為 URL-encoded 字串）
- **CheckMacValue**：`encodeURIComponent → %20→+ → ~→%7e → '→%27 → toLowerCase → .NET 7 字元替換 → SHA256 → toUpperCase`
- **MerchantTradeNo**：最長 20 字元，僅英數字，永久唯一
- **ClientBackURL**：付款完成後消費者瀏覽器被導回（不帶付款結果）
- **TradeStatus**：`'1'` = 已付款，`'0'` = 未付款

## 實作架構

### 付款流程

```
[訂單詳情頁] → 點擊「使用綠界付款」
     ↓
POST /api/ecpay/checkout/:orderId（JWT 認證）
     ↓ 儲存 ecpay_merchant_trade_no 到 DB
     ↓ 回傳 HTML auto-submit form
     ↓ 前端用 document.write() 提交 form
     ↓
[綠界付款頁] → 使用者完成付款
     ↓ ClientBackURL = http://localhost:3001/payment/complete?orderId=xxx
     ↓
[payment-complete 頁面] → 自動呼叫 GET /api/ecpay/status/:orderId
     ↓ 後端呼叫 QueryTradeInfo，TradeStatus='1' 則更新 status='paid'
     ↓ 顯示付款結果，3 秒後導回訂單詳情頁
```

## 需新增 / 修改的檔案

### 新建（4 個）

#### 1. `src/utils/ecpay.js`
ECPay 工具函式，包含：
- `ecpayUrlEncode(source)` — Node.js CheckMacValue 專用 URL encode（`encodeURIComponent → %20→+ → ~→%7e → '→%27 → toLowerCase → 7 字元替換`）
- `generateCheckMacValue(params, hashKey, hashIv)` — SHA256 計算
- `verifyCheckMacValue(params, hashKey, hashIv)` — timing-safe 驗證（用 `crypto.timingSafeEqual`）
- `buildCheckoutParams(order, items)` — 組建 AIO 必填參數物件，包含 `MerchantTradeNo` 生成邏輯
- `buildAutoSubmitForm(params, actionUrl)` — 產生 HTML `<form>` 字串（帶 CheckMacValue）
- `queryTradeInfo(merchantTradeNo)` — 呼叫 QueryTradeInfo/V5，回傳解析後物件（用內建 `https` 模組，無需額外套件）

**MerchantTradeNo 格式**：`EC` + `Date.now().toString().slice(-10)` + `Math.random().toString(36).slice(2,10).toUpperCase()` = 20 字元

**環境變數讀取**：
```javascript
const MERCHANT_ID = process.env.ECPAY_MERCHANT_ID;
const HASH_KEY    = process.env.ECPAY_HASH_KEY;
const HASH_IV     = process.env.ECPAY_HASH_IV;
const BASE_URL    = process.env.BASE_URL || 'http://localhost:3001';
const IS_STAGING  = (process.env.ECPAY_ENV || 'staging') !== 'production';
```

#### 2. `src/routes/ecpayRoutes.js`
三個端點，全部套用 `authMiddleware`（notify 端點除外）：

| 方法 | 路徑 | 說明 |
|------|------|------|
| `POST` | `/api/ecpay/checkout/:orderId` | 建立 ECPay 交易，回傳 HTML form |
| `GET`  | `/api/ecpay/status/:orderId`  | 主動查詢付款狀態 |
| `POST` | `/api/ecpay/notify`           | ReturnURL stub（localhost 收不到，但 ECPay 必填） |

**checkout 路由細節**：
- 驗證 order 屬於當前 user 且 status = 'pending'
- 生成 merchantTradeNo，用參數化 SQL 存入 `ecpay_merchant_trade_no`
- 組建 params（含 `ClientBackURL`、`ReturnURL`、`ItemName` 截短至 200 字元）
- 回傳 `{ data: { form: '<html...>' }, error: null, message: '跳轉至綠界付款頁' }`

**status 路由細節**：
- 取出 order 的 `ecpay_merchant_trade_no`，若無則 400
- 呼叫 `queryTradeInfo(merchantTradeNo)`
- 若 `TradeStatus === '1'` 且 order.status 仍為 pending，更新為 paid
- 回傳 `{ data: { status, paid: bool, tradeStatus }, error: null, message }`

**notify 路由細節**（stub）：
- 不套用 `authMiddleware`（綠界呼叫，無 JWT）
- 驗證 CheckMacValue（`verifyCheckMacValue`）
- 若 RtnCode === '1'，更新訂單狀態
- 回應純文字 `1|OK`（HTTP 200，Content-Type: text/plain）

#### 3. `views/pages/payment-complete.ejs`
前台頁面（套 `layouts/front.ejs`），顯示：
- 載入中 spinner（初始）
- 付款成功：綠色勾勾 + 訊息 + 3 秒後自動跳轉到訂單詳情
- 付款失敗/查詢中：橙色警示 + 手動查看訂單按鈕
- 傳入 EJS 變數：`orderId`（從 query string 取得）

#### 4. `public/js/pages/payment-complete.js`
- 頁面載入後立即呼叫 `GET /api/ecpay/status/:orderId`
- 根據回應更新 Vue/DOM 狀態（參考 order-detail.js 的 Vue 3 寫法）
- 付款成功：3 秒倒數後 `window.location = '/orders/' + orderId`

### 修改（5 個）

#### 5. `src/database.js`
在 `initializeDatabase()` 末尾加入欄位遷移（`try/catch` 處理已存在的情況）：
```javascript
try {
  db.exec('ALTER TABLE orders ADD COLUMN ecpay_merchant_trade_no TEXT');
} catch (_) { /* column already exists */ }
```

#### 6. `app.js`
在 `/api/orders` 路由後新增：
```javascript
app.use('/api/ecpay', require('./src/routes/ecpayRoutes'));
```

#### 7. `src/routes/pageRoutes.js`
新增 `/payment/complete` 頁面路由：
```javascript
router.get('/payment/complete', function (req, res) {
  renderFront(res, 'payment-complete', {
    title: '付款確認',
    pageScript: 'payment-complete',
    orderId: req.query.orderId || ''
  });
});
```

#### 8. `views/pages/order-detail.ejs`
在 Payment Buttons 區塊（`v-if="order.status === 'pending'"`）中新增 ECPay 按鈕：
```html
<button
  @click="ecpayCheckout"
  :disabled="paying"
  class="bg-rose-primary text-white px-8 py-3 rounded-full text-sm font-medium hover:bg-rose-primary/90 transition-colors disabled:opacity-50"
>
  {{ paying ? '處理中...' : '使用綠界付款' }}
</button>
```

#### 9. `public/js/pages/order-detail.js`
新增 `ecpayCheckout()` 方法：
- 呼叫 `POST /api/ecpay/checkout/:orderId`
- 成功後取得 `data.form`（HTML 字串），建立隱藏 iframe 或用 `document.write()` 提交
- 建議做法：`const win = window.open('', '_self'); win.document.write(form); win.document.close();`

## CheckMacValue 實作（Node.js 版，來自 guides/13 line 202-262）

```javascript
const crypto = require('crypto');

function ecpayUrlEncode(source) {
  let encoded = encodeURIComponent(source)
    .replace(/%20/g, '+').replace(/~/g, '%7e').replace(/'/g, '%27');
  encoded = encoded.toLowerCase();
  const replacements = { '%2d':'-','%5f':'_','%2e':'.','%21':'!','%2a':'*','%28':'(','%29':')' };
  for (const [old, char] of Object.entries(replacements)) {
    encoded = encoded.split(old).join(char);
  }
  return encoded;
}

function generateCheckMacValue(params, hashKey, hashIv) {
  const filtered = Object.fromEntries(Object.entries(params).filter(([k]) => k !== 'CheckMacValue'));
  const sorted = Object.keys(filtered).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const paramStr = sorted.map(k => `${k}=${filtered[k]}`).join('&');
  const raw = `HashKey=${hashKey}&${paramStr}&HashIV=${hashIv}`;
  return crypto.createHash('sha256').update(ecpayUrlEncode(raw), 'utf8').digest('hex').toUpperCase();
}
```

## ItemName 組建注意事項

- 多項商品以 `#` 分隔：`商品A x1#商品B x2`
- 長度截斷至 200 字元（超過會掉單）
- 不含 `echo`、`curl`、`wget` 等 WAF 關鍵字

## 驗證步驟

1. 啟動伺服器：`npm run dev:server`
2. 登入後前往任一 pending 訂單詳情頁
3. 點擊「使用綠界付款」→ 確認跳轉至 `payment-stage.ecpay.com.tw`
4. 使用測試信用卡 `4311-9522-2222-2222`，3DS 驗證碼 `1234` 完成付款
5. 確認被導回 `http://localhost:3001/payment/complete?orderId=xxx`
6. 確認頁面自動查詢並顯示「付款成功」
7. 確認導回訂單詳情後 `status` 已更新為 `paid`
8. 執行 `npm test` 確認現有測試全部通過（ECPay 路由只需手動測試）

## 相依套件

無需新增套件。使用 Node.js 內建 `crypto`、`https`、`querystring`/`URLSearchParams` 模組。
