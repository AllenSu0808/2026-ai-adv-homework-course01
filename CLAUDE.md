# CLAUDE.md

## 專案概述

花卉電商網站 — Node.js / Express 後端 + EJS 伺服端渲染，搭配 SQLite 資料庫（better-sqlite3）、TailwindCSS v4、JWT 認證。

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

## 關鍵規則

- 所有 API 回應統一格式：`{ data, error, message }`，任何新 API 必須遵守
- 購物車路由使用雙模式驗證（JWT 優先，降級為 `X-Session-Id`），其他 API 路由一律使用 `authMiddleware`
- 資料庫直接使用 `better-sqlite3` 連線，無 ORM，所有 SQL 須使用參數化查詢防止 injection
- 建立訂單必須在 transaction 中執行（建立訂單、扣庫存、清空購物車三步原子化）
- 功能開發使用 `docs/plans/` 記錄計畫；完成後移至 `docs/plans/archive/`

## 詳細文件

- [docs/README.md](docs/README.md) — 項目介紹與快速開始
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 架構、目錄結構、資料流
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — 開發規範、命名規則
- [docs/FEATURES.md](docs/FEATURES.md) — 功能列表與完成狀態
- [docs/TESTING.md](docs/TESTING.md) — 測試規範與指南
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — 更新日誌

## 必要遵守項目

- 新增商品時 `price` 必須為正整數、`stock` 必須為非負整數（DB CHECK constraint）
- JWT payload 包含 `{ userId, email, role }`，簽署演算法固定為 `HS256`，有效期 `7d`
- 刪除商品前須確認無 `pending` 狀態訂單引用（避免觸發 409）
- 測試以 `fileParallelism: false` 串行執行，共用同一個真實 SQLite 資料庫，禁止 mock DB
- EJS 模板須套用 layout，前台用 `layouts/front.ejs`，後台用 `layouts/admin.ejs`
