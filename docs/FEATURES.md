# 功能清單

## 前台功能

### 認證（`/api/auth`）

**狀態：✅ 完成**

| 端點 | 方法 | 認證 | 說明 |
|------|------|------|------|
| `/api/auth/register` | POST | 無 | 註冊新帳號 |
| `/api/auth/login` | POST | 無 | 登入取得 JWT |
| `/api/auth/profile` | GET | JWT | 取得個人資料 |

**行為描述：**

- 註冊：必填 `email`（格式驗證）、`password`（最少 6 字元）、`name`；成功後立即回傳 JWT（無需另外登入）
- 登入：email 不存在或密碼錯誤統一回傳相同訊息（避免帳號列舉）
- 所有新帳號預設 `role = 'user'`；管理員帳號僅由種子資料建立

---

### 商品（`/api/products`）

**狀態：✅ 完成**

| 端點 | 方法 | 認證 | 說明 |
|------|------|------|------|
| `/api/products` | GET | 無 | 商品列表（分頁） |
| `/api/products/:id` | GET | 無 | 商品詳情 |

**行為描述：**

- 列表支援查詢參數 `?page=1&limit=10`（page 最小 1，limit 範圍 1–100，預設 10）
- 回應包含 `pagination: { total, page, limit, totalPages }`
- 依 `created_at DESC` 排序

---

### 購物車（`/api/cart`）

**狀態：✅ 完成**

| 端點 | 方法 | 認證 | 說明 |
|------|------|------|------|
| `/api/cart` | GET | dualAuth | 查看購物車（含總計） |
| `/api/cart` | POST | dualAuth | 加入商品 |
| `/api/cart/:itemId` | PATCH | dualAuth | 修改數量 |
| `/api/cart/:itemId` | DELETE | dualAuth | 移除項目 |

**行為描述：**

- **雙模式驗證**：已登入用戶以 `user_id` 識別購物車；訪客以 `X-Session-Id` header 識別
- **加入購物車累加邏輯**：若相同商品已在購物車，`quantity` 累加（不重複建立），累加後超過庫存則回傳 `STOCK_INSUFFICIENT`
- 訪客結帳前須先登入，登入後的購物車資料以 `user_id` 重新識別（需前端處理合併）
- GET 回應包含每項商品的即時庫存（`product.stock`），前端可用於顯示庫存警示

---

### 訂單（`/api/orders`）

**狀態：✅ 完成**

| 端點 | 方法 | 認證 | 說明 |
|------|------|------|------|
| `/api/orders` | POST | JWT | 從購物車建立訂單 |
| `/api/orders` | GET | JWT | 我的訂單列表 |
| `/api/orders/:id` | GET | JWT | 訂單詳情 |
| `/api/orders/:id/pay` | PATCH | JWT | 模擬付款（開發測試用） |

**行為描述：**

- **建立訂單為原子操作**：在單一 `db.transaction()` 中完成建立訂單、建立訂單明細（快照商品名稱與價格）、扣減庫存、清空購物車
- 訂單編號格式：`ORD-YYYYMMDD-XXXXX`（5 位隨機大寫英數）
- `order_items` 儲存建立時的商品名稱與價格快照，後續商品更新不影響歷史訂單
- 模擬付款：`action: 'success'` → status 改為 `paid`；`action: 'fail'` → status 改為 `failed`；僅 `pending` 狀態的訂單可付款
- 訂單狀態：`pending`（待付款）→ `paid`（已付款）或 `failed`（付款失敗）
- 真實金流付款請見 ECPay 章節；模擬付款端點僅供開發與整合測試使用

---

### 綠界 ECPay 金流（`/api/ecpay`）

**狀態：✅ 完成**

| 端點 | 方法 | 認證 | 說明 |
|------|------|------|------|
| `/api/ecpay/checkout/:orderId` | POST | JWT | 建立 ECPay 交易，回傳 HTML auto-submit form |
| `/api/ecpay/status/:orderId` | GET | JWT | 主動查詢付款狀態（呼叫 QueryTradeInfo） |
| `/api/ecpay/notify` | POST | 無 | ReturnURL stub（ECPay 伺服器回呼用，localhost 無法實際收到） |

**行為描述：**

- **建立交易（checkout）**：驗證訂單屬於當前使用者且狀態為 `pending`；生成唯一的 `MerchantTradeNo`（格式 `EC` + 10 位時間戳 + 8 位隨機大寫英數，共 20 字）儲存至 `orders.ecpay_merchant_trade_no`；組建 AIO 全方位金流必填參數並計算 CheckMacValue；回傳帶有隱藏欄位的 HTML 自動提交表單字串，前端以 `document.write()` 即時導向綠界付款頁
- **查詢狀態（status）**：讀取訂單的 `ecpay_merchant_trade_no`，呼叫綠界 QueryTradeInfo/V5 API；若 `TradeStatus === '1'`（已付款）且訂單仍為 `pending`，更新訂單狀態為 `paid`；回傳 `{ status, paid: bool, tradeStatus, merchantTradeNo }`
- **ReturnURL stub（notify）**：驗證 CheckMacValue（使用 timing-safe 比較），若 `RtnCode === '1'` 則更新訂單狀態；回應純文字 `1|OK`（ECPay 要求格式）；本地端運行時 ECPay 無法觸達此端點，付款確認主要依靠 status 端點的主動查詢
- **localhost 限制因應**：由於 ECPay 伺服器無法向 localhost 發送 Server Notify，付款結果確認改為前端主動呼叫 `GET /api/ecpay/status/:orderId`；付款完成後 ClientBackURL 導回 `/payment/complete?orderId=xxx` 頁面，頁面自動觸發查詢
- **CheckMacValue 計算**：`encodeURIComponent → %20→+ → ~→%7e → '→%27 → toLowerCase → 7 字元 .NET 替換 → SHA256 → toUpperCase`；驗證時使用 `crypto.timingSafeEqual` 防止 timing attack
- 無需新增 npm 套件，所有 ECPay HTTP 通訊使用 Node.js 內建 `https`、`crypto`、`URLSearchParams` 模組

---

## 後台功能（管理員）

### 商品管理（`/api/admin/products`）

**狀態：✅ 完成**

| 端點 | 方法 | 認證 | 說明 |
|------|------|------|------|
| `/api/admin/products` | GET | JWT + admin | 後台商品列表（分頁） |
| `/api/admin/products` | POST | JWT + admin | 新增商品 |
| `/api/admin/products/:id` | PUT | JWT + admin | 編輯商品（全欄位覆蓋，未傳欄位保留原值） |
| `/api/admin/products/:id` | DELETE | JWT + admin | 刪除商品 |

**行為描述：**

- 新增必填：`name`（非空字串）、`price`（正整數）、`stock`（非負整數）；`description` 與 `image_url` 選填
- 編輯（PUT）為部分更新語意：只更新傳入的欄位，未傳欄位保留資料庫現有值；更新時 `updated_at` 自動設為 `datetime('now')`
- 刪除前檢查：若商品存在 `status = 'pending'` 的訂單引用，回傳 409 CONFLICT

---

### 訂單管理（`/api/admin/orders`）

**狀態：✅ 完成**

| 端點 | 方法 | 認證 | 說明 |
|------|------|------|------|
| `/api/admin/orders` | GET | JWT + admin | 後台訂單列表（分頁 + 狀態篩選） |
| `/api/admin/orders/:id` | GET | JWT + admin | 後台訂單詳情（含訂購人資訊） |

**行為描述：**

- 列表支援 `?status=pending|paid|failed` 篩選，不傳則回傳全部
- 詳情回應額外包含 `user: { name, email }`（訂購人資訊）

---

## 前台頁面

**狀態：✅ 完成**

| 路徑 | 頁面 | 說明 |
|------|------|------|
| `/` | 首頁 | 商品列表 |
| `/products/:id` | 商品詳情 | 商品資訊 + 加入購物車 |
| `/cart` | 購物車 | 購物車管理 |
| `/checkout` | 結帳 | 填寫收件資訊 |
| `/orders` | 訂單列表 | 我的訂單 |
| `/orders/:id` | 訂單詳情 | 訂單資訊 + 付款操作 |
| `/payment/complete` | 付款確認 | ECPay 付款完成後的落地頁，自動查詢付款狀態 |
| `/login` | 登入/註冊 | 帳號登入與註冊 |
| `/admin/products` | 後台商品管理 | 商品 CRUD 頁面 |
| `/admin/orders` | 後台訂單管理 | 訂單查詢頁面 |
