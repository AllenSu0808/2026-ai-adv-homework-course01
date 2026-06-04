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
| `/api/orders/:id/pay` | PATCH | JWT | 模擬付款 |

**行為描述：**

- **建立訂單為原子操作**：在單一 `db.transaction()` 中完成建立訂單、建立訂單明細（快照商品名稱與價格）、扣減庫存、清空購物車
- 訂單編號格式：`ORD-YYYYMMDD-XXXXX`（5 位隨機大寫英數）
- `order_items` 儲存建立時的商品名稱與價格快照，後續商品更新不影響歷史訂單
- 模擬付款：`action: 'success'` → status 改為 `paid`；`action: 'fail'` → status 改為 `failed`；僅 `pending` 狀態的訂單可付款
- 訂單狀態：`pending`（待付款）→ `paid`（已付款）或 `failed`（付款失敗）

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
| `/orders/:id` | 訂單詳情 | 訂單資訊 |
| `/login` | 登入/註冊 | 帳號登入與註冊 |
| `/admin/products` | 後台商品管理 | 商品 CRUD 頁面 |
| `/admin/orders` | 後台訂單管理 | 訂單查詢頁面 |
