# 測試規範

## 測試框架

- **Vitest**：測試執行器
- **Supertest**：HTTP 請求模擬（直接測試 Express app，不需啟動真實 server）

## 測試檔案與執行順序

測試以 `fileParallelism: false` **串行**執行，共用同一個真實 SQLite 資料庫（`database.sqlite`）。

| 順序 | 檔案 | 測試範圍 |
|------|------|---------|
| 1 | `tests/auth.test.js` | 註冊、登入、個人資料 |
| 2 | `tests/products.test.js` | 公開商品列表、詳情 |
| 3 | `tests/cart.test.js` | 購物車 CRUD（雙模式驗證） |
| 4 | `tests/orders.test.js` | 建立訂單、付款、訂單查詢 |
| 5 | `tests/adminProducts.test.js` | 後台商品管理 |
| 6 | `tests/adminOrders.test.js` | 後台訂單管理 |

執行順序有依賴關係：`cart` 需要 `products` 的種子資料，`orders` 需要 `cart` 建立的商品。

## 輔助函式（tests/setup.js）

```js
// 以種子管理員帳號登入，回傳 JWT token
async function getAdminToken(): Promise<string>

// 動態建立測試使用者，回傳 { token, user }
async function registerUser(overrides?: { email?, password?, name? }): Promise<{ token, user }>
```

`registerUser` 的 email 預設為 `test-<timestamp>-<random>@example.com`，確保每次測試互不衝突。

## 撰寫新測試

### 基本結構

```js
import { describe, it, expect } from 'vitest';
import { request, getAdminToken, registerUser } from './setup.js';

describe('功能區塊', () => {
  it('應該 <預期行為>', async () => {
    const { token } = await registerUser();

    const res = await request(app)
      .get('/api/some-endpoint')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toMatchObject({ ... });
  });
});
```

### 購物車測試（訪客模式）

```js
const sessionId = 'test-session-' + Date.now();

const res = await request(app)
  .post('/api/cart')
  .set('X-Session-Id', sessionId)
  .send({ productId: '<id>', quantity: 1 });
```

### 管理員 API 測試

```js
const adminToken = await getAdminToken();

const res = await request(app)
  .post('/api/admin/products')
  .set('Authorization', `Bearer ${adminToken}`)
  .send({ name: '測試商品', price: 100, stock: 10 });
```

## 常見陷阱

**1. 測試間資料殘留**

由於共用同一個 DB，前一個測試建立的資料會影響後續測試。若需要乾淨狀態，在 `beforeEach` / `afterEach` 中清理特定資料，或使用唯一識別碼（如 timestamp）避免衝突。

**2. 禁止 mock 資料庫**

本專案整合測試對真實 SQLite 執行，**禁止 mock `better-sqlite3` 或 DB 相關模組**，否則 DB constraint 行為無法被測試覆蓋。

**3. 訂單測試需要購物車有資料**

`POST /api/orders` 要求購物車非空，測試前需先呼叫 `POST /api/cart` 加入商品（須使用已登入狀態的 `user_id`，不可用 session 模式）。

**4. 並行執行問題**

`vitest.config.js` 已設定 `fileParallelism: false`，不要改回 `true`，否則多個測試同時寫入同一個 SQLite 會導致鎖定錯誤。

**5. 種子管理員帳號固定**

`getAdminToken()` 使用 `admin@hexschool.com` / `12345678` 登入，這個帳號在 DB 初始化時由 `seedAdminUser()` 建立。若測試刪除了此帳號，後續管理員相關測試會失敗。

## 執行指令

```bash
# 執行全部測試
npm test

# 執行單一測試檔
npx vitest run tests/auth.test.js

# 監聽模式（開發時）
npx vitest
```
