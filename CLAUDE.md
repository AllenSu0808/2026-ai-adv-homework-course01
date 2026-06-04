# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案簡介

花卉電商網站，採用 Node.js / Express 後端 + EJS 伺服端渲染，搭配 SQLite 資料庫（better-sqlite3）。

## 常用指令

```bash
# 開發（僅啟動伺服器，需先手動 build CSS 或另開終端機執行 dev:css）
npm run dev:server

# 監聽 TailwindCSS 變更
npm run dev:css

# 生產模式啟動（build CSS + 啟動伺服器）
npm start

# 執行所有測試
npm test

# 執行單一測試檔案
npx vitest run tests/auth.test.js

# 產生 OpenAPI 規格檔（輸出至 openapi.json）
npm run openapi
```

啟動前需先設定 `.env`，至少須有 `JWT_SECRET`（伺服器啟動時若缺少此值會直接中止）。可複製 `.env.example` 作為範本。

## 架構概覽

### 進入點

- [server.js](server.js)：HTTP 伺服器，啟動時驗證 `JWT_SECRET`
- [app.js](app.js)：Express 設定，掛載所有 middleware 與路由

### 資料庫

- [src/database.js](src/database.js)：匯出單一 `better-sqlite3` 連線，`require` 時自動建立資料表並植入種子資料（管理員帳號與商品）。SQLite 檔案位於專案根目錄 `database.sqlite`（不進版控）。
- 所有路由直接 `require('../database')` 使用此連線，無 ORM。

### 路由層級

API 路由（前綴 `/api`）：

| 路徑 | 說明 |
|------|------|
| `/api/auth` | 註冊、登入、個人資料 |
| `/api/products` | 公開商品列表與詳情 |
| `/api/cart` | 購物車（雙模式驗證） |
| `/api/orders` | 使用者訂單 |
| `/api/admin/products` | 管理員商品管理 |
| `/api/admin/orders` | 管理員訂單管理 |

頁面路由（`/`）由 [src/routes/pageRoutes.js](src/routes/pageRoutes.js) 渲染 EJS。

### 驗證機制

- 一般 API：使用 [src/middleware/authMiddleware.js](src/middleware/authMiddleware.js)，驗證 `Authorization: Bearer <JWT>`
- 購物車：使用 [src/routes/cartRoutes.js](src/routes/cartRoutes.js) 內的 `dualAuth`，優先以 JWT 驗證，若無則改用 `X-Session-Id` header（訪客模式）
- 管理員 API：另有 [src/middleware/adminMiddleware.js](src/middleware/adminMiddleware.js) 確認 `role === 'admin'`

### API 回應格式

所有 API 統一回傳：

```json
{ "data": ..., "error": "ERROR_CODE 或 null", "message": "說明文字" }
```

### 前端頁面

EJS 使用 layout 模式，前台套用 [views/layouts/front.ejs](views/layouts/front.ejs)，後台套用 [views/layouts/admin.ejs](views/layouts/admin.ejs)。頁面渲染時傳入 `{ body, title, pageScript }`，`pageScript` 指定頁面專屬 JS 檔路徑。

### 測試

測試以 Vitest + Supertest 對真實 SQLite 資料庫執行整合測試（非 mock）。測試檔案依固定順序串行執行（`fileParallelism: false`），共用同一個資料庫實例。輔助函式（`getAdminToken`、`registerUser`）定義於 [tests/setup.js](tests/setup.js)。

### API 文件

路由檔中以 `@openapi` JSDoc 標記 OpenAPI 規格，執行 `npm run openapi` 後由 [generate-openapi.js](generate-openapi.js) 產出 `openapi.json`。
