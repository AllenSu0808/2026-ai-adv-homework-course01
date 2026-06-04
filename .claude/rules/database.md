---
paths:
  - "src/database.js"
  - "src/routes/**"
---

# 資料庫規則

- 所有 SQL 查詢必須使用 `db.prepare('... WHERE id = ?').get(id)` 參數化語法，禁止字串拼接 SQL
- 欄位命名使用 snake_case（`product_id`、`created_at`、`order_no`）
- 主鍵一律使用 UUID TEXT，以 `uuidv4()` 產生，不使用自增整數
- 多步驟寫入（跨表 INSERT/UPDATE/DELETE）必須包在 `db.transaction(() => { ... })()` 中確保原子性
- 新增資料表在 `src/database.js` 的 `initializeDatabase()` 中加入 `CREATE TABLE IF NOT EXISTS`，並加上適當 CHECK constraint
- `price` 欄位 CHECK(price > 0)，`stock` 欄位 CHECK(stock >= 0)，這是 DB 層約束，路由層也應提前驗證
- 路由直接 `require('../database')` 取得連線，無需透過 service 層包裝
- 不要在路由 handler 之外保留 prepared statement 物件供複用（better-sqlite3 的 prepare 已被最佳化，每次重新 prepare 代價極低）
