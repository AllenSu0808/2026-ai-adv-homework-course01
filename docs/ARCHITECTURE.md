# 架構文件

## 目錄結構

```
.
├── server.js                    # HTTP 伺服器進入點，驗證 JWT_SECRET
├── app.js                       # Express 設定、middleware、路由掛載
├── generate-openapi.js          # 掃描 @openapi JSDoc 產生 openapi.json
├── swagger-config.js            # swagger-jsdoc 設定（API info、securitySchemes）
├── vitest.config.js             # Vitest 測試設定（串行執行順序）
├── public/
│   ├── css/
│   │   └── input.css            # TailwindCSS 入口，build 後輸出 output.css
│   └── js/
│       ├── api.js               # 前端共用 API 請求工具（fetch wrapper）
│       ├── auth.js              # 前端登入狀態管理（localStorage token）
│       ├── header-init.js       # 導覽列動態渲染（登入/登出按鈕）
│       ├── notification.js      # Toast 通知元件
│       └── pages/               # 各頁面專屬 JS（checkout.js、cart.js、payment-complete.js 等）
├── src/
│   ├── database.js              # better-sqlite3 連線、建表、seed data
│   ├── middleware/
│   │   ├── authMiddleware.js    # 驗證 Authorization: Bearer JWT
│   │   ├── adminMiddleware.js   # 確認 role === 'admin'
│   │   ├── sessionMiddleware.js # 解析 X-Session-Id header → req.sessionId
│   │   └── errorHandler.js     # Express 全域錯誤處理
│   ├── utils/
│   │   └── ecpay.js             # 綠界工具函式（CheckMacValue、buildAutoSubmitForm、queryTradeInfo）
│   └── routes/
│       ├── authRoutes.js        # /api/auth（register、login、profile）
│       ├── productRoutes.js     # /api/products（公開商品列表、詳情）
│       ├── cartRoutes.js        # /api/cart（雙模式驗證購物車）
│       ├── orderRoutes.js       # /api/orders（使用者訂單）
│       ├── ecpayRoutes.js       # /api/ecpay（綠界金流：checkout、status、notify）
│       ├── adminProductRoutes.js# /api/admin/products（管理員商品 CRUD）
│       ├── adminOrderRoutes.js  # /api/admin/orders（管理員訂單查詢）
│       └── pageRoutes.js        # / 前台 + /admin 後台 EJS 頁面渲染
├── views/
│   ├── layouts/
│   │   ├── front.ejs            # 前台 layout（接收 body、title、pageScript）
│   │   └── admin.ejs            # 後台 layout
│   ├── pages/                   # 各頁面 EJS partials（index、cart、checkout、payment-complete 等）
│   └── partials/                # 共用元件（head、header、footer、notification）
└── tests/
    ├── setup.js                 # 輔助函式：getAdminToken、registerUser
    ├── auth.test.js
    ├── products.test.js
    ├── cart.test.js
    ├── orders.test.js
    ├── adminProducts.test.js
    └── adminOrders.test.js
```

## 啟動流程

```
node server.js
  → 檢查 JWT_SECRET（缺少則 process.exit(1)）
  → require('./app')
    → require('./src/database')   ← 此時建立 SQLite 連線、建表、seed
    → 掛載 middleware（cors、json、urlencoded、session）
    → 掛載 API 路由
    → 掛載頁面路由
    → 404 handler
    → errorHandler
  → app.listen(PORT)
```

## API 路由總覽

| 前綴 | 路由檔案 | 認證 | 說明 |
|------|---------|------|------|
| `/api/auth` | `authRoutes.js` | 無（register/login）/ JWT（profile） | 註冊、登入、個人資料 |
| `/api/products` | `productRoutes.js` | 無 | 公開商品列表（分頁）、商品詳情 |
| `/api/cart` | `cartRoutes.js` | dualAuth（JWT 或 X-Session-Id） | 購物車 CRUD |
| `/api/orders` | `orderRoutes.js` | JWT 必須 | 建立訂單、訂單列表、詳情、模擬付款 |
| `/api/ecpay` | `ecpayRoutes.js` | JWT 必須（notify 除外） | 綠界金流：建立交易、查詢付款狀態、ReturnURL stub |
| `/api/admin/products` | `adminProductRoutes.js` | JWT + role=admin | 商品 CRUD（後台） |
| `/api/admin/orders` | `adminOrderRoutes.js` | JWT + role=admin | 訂單查詢（後台，支援 status 篩選） |
| `/` | `pageRoutes.js` | 無（頁面本身不做 API 驗證） | EJS 頁面渲染 |

## API 統一回應格式

所有 API 端點一律回傳以下結構：

```json
{
  "data": <payload 或 null>,
  "error": "ERROR_CODE 或 null",
  "message": "說明文字"
}
```

**常見 error code：**

| Code | HTTP 狀態 | 說明 |
|------|----------|------|
| `VALIDATION_ERROR` | 400 | 欄位缺失或格式錯誤 |
| `UNAUTHORIZED` | 401 | 未登入或 token 無效/過期 |
| `FORBIDDEN` | 403 | 權限不足（非 admin） |
| `NOT_FOUND` | 404 | 資源不存在 |
| `CONFLICT` | 409 | 資源衝突（Email 重複、商品有未完成訂單） |
| `STOCK_INSUFFICIENT` | 400 | 庫存不足 |
| `CART_EMPTY` | 400 | 購物車為空（建立訂單時） |
| `INVALID_STATUS` | 400 | 訂單狀態不允許此操作 |

## 認證與授權機制

### authMiddleware

- 讀取 `Authorization: Bearer <token>` header
- 以 `jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })` 驗證
- 驗證後從 DB 確認 userId 存在（避免已刪除帳號仍能使用舊 token）
- 成功則將 `{ userId, email, role }` 注入 `req.user`
- 失敗一律回傳 401

### adminMiddleware

- 接在 `authMiddleware` 之後執行
- 檢查 `req.user.role === 'admin'`，否則回傳 403

### dualAuth（購物車專用）

- 優先嘗試 JWT 驗證（同 authMiddleware）
- 若無 `Authorization` header，改讀 `req.sessionId`（由 sessionMiddleware 從 `X-Session-Id` 解析）
- 若兩者皆無則回傳 401
- **重要：** 若 `Authorization` header 存在但 token 無效，立即回傳 401（不降級到 session）

### JWT 規格

| 欄位 | 值 |
|------|-----|
| 演算法 | HS256 |
| 有效期 | 7 天 |
| Payload | `{ userId, email, role }` |
| Secret 來源 | `process.env.JWT_SECRET` |

## 資料庫 Schema

### users

| 欄位 | 型別 | 約束 |
|------|------|------|
| id | TEXT | PRIMARY KEY（UUID） |
| email | TEXT | UNIQUE NOT NULL |
| password_hash | TEXT | NOT NULL |
| name | TEXT | NOT NULL |
| role | TEXT | NOT NULL DEFAULT 'user', CHECK IN ('user','admin') |
| created_at | TEXT | NOT NULL DEFAULT datetime('now') |

### products

| 欄位 | 型別 | 約束 |
|------|------|------|
| id | TEXT | PRIMARY KEY（UUID） |
| name | TEXT | NOT NULL |
| description | TEXT | nullable |
| price | INTEGER | NOT NULL CHECK(price > 0) |
| stock | INTEGER | NOT NULL DEFAULT 0 CHECK(stock >= 0) |
| image_url | TEXT | nullable |
| created_at | TEXT | NOT NULL DEFAULT datetime('now') |
| updated_at | TEXT | NOT NULL DEFAULT datetime('now') |

### cart_items

| 欄位 | 型別 | 約束 |
|------|------|------|
| id | TEXT | PRIMARY KEY（UUID） |
| session_id | TEXT | nullable（訪客模式） |
| user_id | TEXT | nullable，FK → users(id) |
| product_id | TEXT | NOT NULL，FK → products(id) |
| quantity | INTEGER | NOT NULL DEFAULT 1 CHECK(quantity > 0) |

> `session_id` 與 `user_id` 二擇一，對應雙模式驗證。

### orders

| 欄位 | 型別 | 約束 |
|------|------|------|
| id | TEXT | PRIMARY KEY（UUID） |
| order_no | TEXT | UNIQUE NOT NULL（格式：`ORD-YYYYMMDD-XXXXX`） |
| user_id | TEXT | NOT NULL，FK → users(id) |
| recipient_name | TEXT | NOT NULL |
| recipient_email | TEXT | NOT NULL |
| recipient_address | TEXT | NOT NULL |
| total_amount | INTEGER | NOT NULL |
| status | TEXT | NOT NULL DEFAULT 'pending', CHECK IN ('pending','paid','failed') |
| ecpay_merchant_trade_no | TEXT | nullable；綠界交易編號（格式：`EC` + 10 位時間戳 + 8 位隨機大寫英數） |
| created_at | TEXT | NOT NULL DEFAULT datetime('now') |

> `ecpay_merchant_trade_no` 欄位由 `runMigrations()` 動態遷移新增，相容於不包含此欄位的舊有資料庫。

### order_items

| 欄位 | 型別 | 約束 |
|------|------|------|
| id | TEXT | PRIMARY KEY（UUID） |
| order_id | TEXT | NOT NULL，FK → orders(id) |
| product_id | TEXT | NOT NULL，FK → products(id) |
| product_name | TEXT | NOT NULL（快照，避免商品更名影響歷史訂單） |
| product_price | INTEGER | NOT NULL（快照） |
| quantity | INTEGER | NOT NULL |

## 建立訂單資料流

```
POST /api/orders
  → authMiddleware（須登入）
  → 驗證收件資訊（name、email、address 必填）
  → 從 DB 查詢使用者的購物車（user_id）
  → 確認購物車不為空
  → 確認所有商品庫存足夠
  → 計算總金額
  → db.transaction()：
      1. INSERT INTO orders
      2. INSERT INTO order_items（每項商品快照 name + price）
      3. UPDATE products SET stock = stock - quantity（逐一扣減）
      4. DELETE FROM cart_items WHERE user_id = ?（清空購物車）
  → 回傳訂單資訊
```

## EJS Layout 模式

頁面渲染流程：

```js
// pageRoutes.js 內
res.render('pages/<page>', {}, (err, body) => {
  res.render('layouts/front', { body, title: '頁面標題', pageScript: '/js/pages/<page>.js' });
});
```

- `body`：頁面內容 HTML 字串，注入至 layout 的 `<%- body %>`
- `pageScript`：頁面專屬 JS 路徑，layout 在 `</body>` 前以 `<script src="<%= pageScript %>">` 引入
- 後台頁面改用 `layouts/admin.ejs`

## ECPay 付款資料流

### localhost 架構限制

本專案僅在本機運行，ECPay 伺服器無法觸達 `ReturnURL`（Server Notify）。因此付款狀態確認改為前端主動查詢，流程如下：

```
[訂單詳情頁] 使用者點擊「使用綠界付款」
  → POST /api/ecpay/checkout/:orderId（JWT 認證）
      → 驗證訂單屬於當前使用者且 status = 'pending'
      → 生成 MerchantTradeNo（EC + 10位時間戳 + 8位隨機大寫英數）
      → UPDATE orders SET ecpay_merchant_trade_no = ? WHERE id = ?
      → buildCheckoutParams()：組建 ItemName（截短至 200 字元）、ClientBackURL、ReturnURL 等必填欄位
      → generateCheckMacValue()：計算 SHA256 CheckMacValue
      → buildAutoSubmitForm()：產生帶隱藏欄位的 HTML form 字串
      → 回傳 { data: { form: '<html...>' } }
  → 前端：window.open('', '_self').document.write(form)
  → 瀏覽器自動提交 form 至 https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5

[綠界付款頁] 使用者完成付款
  → ECPay ClientBackURL 導向 http://localhost:PORT/payment/complete?orderId=xxx
  （此時 ECPay 也會嘗試呼叫 ReturnURL，但 localhost 無法接收）

[payment-complete 頁面] 
  → Vue 3 onMounted()：呼叫 GET /api/ecpay/status/:orderId
      → 從 DB 讀取 ecpay_merchant_trade_no
      → 呼叫 queryTradeInfo(merchantTradeNo)
          → HTTPS POST https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5
          → 回傳 URL-encoded 字串，解析後取得 TradeStatus
      → TradeStatus === '1'（已付款）且 status = 'pending'：
          UPDATE orders SET status = 'paid' WHERE id = ?
      → 回傳 { data: { paid: true/false, tradeStatus, merchantTradeNo } }
  → 顯示付款成功：3 秒倒數後導向 /orders/:orderId
  → 付款未完成：顯示橙色提示，提供手動前往訂單頁連結
```

### CheckMacValue 計算（Node.js 實作）

ECPay 使用 .NET URL encoding 規則，Node.js 內建 `encodeURIComponent` 需額外處理：

1. `encodeURIComponent(raw)`
2. `%20` → `+`
3. `~` → `%7e`
4. `'` → `%27`
5. 全部轉小寫
6. 7 個 .NET 字元還原：`%2d`→`-`、`%5f`→`_`、`%2e`→`.`、`%21`→`!`、`%2a`→`*`、`%28`→`(`、`%29`→`)`
7. `SHA256(HashKey=xxx&<已排序參數字串>&HashIV=xxx)` → `toUpperCase()`

驗證時以 `crypto.timingSafeEqual` 比較，防止 timing attack。
