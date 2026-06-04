---
paths:
  - "tests/**"
---

# 測試規則

- 測試使用 Vitest + Supertest，對真實 SQLite 資料庫執行整合測試，禁止 mock `better-sqlite3` 或資料庫模組
- 測試檔案以固定順序串行執行（`fileParallelism: false`），順序：auth → products → cart → orders → adminProducts → adminOrders
- 每個測試檔從 `./setup.js` 引入 `request`、`getAdminToken`、`registerUser`，不要重複定義
- `registerUser()` email 使用 timestamp + random 確保唯一，避免測試間衝突
- 需要管理員 token 的測試呼叫 `getAdminToken()`，種子帳號為 `admin@hexschool.com`，不要在測試中硬寫 token
- 測試訂單建立前，必須先以已登入帳號（user_id 模式，非 session）加入購物車
- 每個 `describe` 區塊聚焦一個端點或功能，`it` 描述預期行為（「應該回傳 200 與商品列表」）
- 驗證回應結構時同時檢查 `res.body.error` 與 `res.body.data`，不只檢查 HTTP status code
