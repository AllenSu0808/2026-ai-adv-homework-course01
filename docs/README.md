# 花卉電商網站

花卉電商網站，提供前台商品瀏覽、購物車、結帳下單，後台管理員管理商品與訂單。

## 技術棧

| 類別 | 技術 |
|------|------|
| 後端框架 | Node.js + Express ~4.16 |
| 模板引擎 | EJS（伺服端渲染） |
| 資料庫 | SQLite（better-sqlite3） |
| 認證 | JWT（jsonwebtoken） + bcrypt |
| CSS 框架 | TailwindCSS v4 |
| 測試 | Vitest + Supertest |
| API 文件 | swagger-jsdoc（`@openapi` JSDoc 標記） |

## 快速開始

```bash
# 1. 複製環境變數設定
cp .env.example .env
# 編輯 .env，至少填入 JWT_SECRET

# 2. 安裝相依套件
npm install

# 3. 啟動開發伺服器
npm run dev:server

# 4. （另開終端機）監聽 TailwindCSS
npm run dev:css
```

伺服器預設監聽 `http://localhost:3001`。

### 預設管理員帳號

| 欄位 | 值 |
|------|-----|
| Email | admin@hexschool.com |
| 密碼 | 12345678 |

（可透過 `.env` 的 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 覆蓋）

## 常用指令

| 指令 | 說明 |
|------|------|
| `npm run dev:server` | 開發模式啟動伺服器 |
| `npm run dev:css` | 監聽 TailwindCSS 變更 |
| `npm start` | 生產模式（build CSS + 啟動） |
| `npm test` | 執行所有整合測試 |
| `npm run openapi` | 產生 openapi.json |

## 文件索引

| 文件 | 說明 |
|------|------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | 架構、目錄結構、API 路由、資料庫 Schema |
| [DEVELOPMENT.md](DEVELOPMENT.md) | 開發規範、命名規則、新增功能步驟 |
| [FEATURES.md](FEATURES.md) | 功能清單與完成狀態 |
| [TESTING.md](TESTING.md) | 測試規範與指南 |
| [CHANGELOG.md](CHANGELOG.md) | 更新日誌 |
| [plans/](plans/) | 進行中開發計畫 |
