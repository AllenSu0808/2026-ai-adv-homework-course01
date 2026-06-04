# 開發規範

## 命名規則

| 對象 | 規則 | 範例 |
|------|------|------|
| 路由檔案 | camelCase + Routes.js | `productRoutes.js`、`adminOrderRoutes.js` |
| Middleware 檔案 | camelCase + Middleware.js | `authMiddleware.js`、`adminMiddleware.js` |
| 資料庫欄位 | snake_case | `product_id`、`created_at`、`order_no` |
| API 請求 body | camelCase | `productId`、`recipientName`、`recipientEmail` |
| API 回應 data | snake_case（與 DB 欄位一致） | `product_id`、`total_amount` |
| UUID 主鍵 | `uuidv4()` | 所有表的 `id` 欄位 |
| EJS 頁面 | kebab-case.ejs | `product-detail.ejs`、`order-detail.ejs` |
| 前端 JS 頁面檔 | kebab-case.js（放 `public/js/pages/`） | `product-detail.js`、`admin-orders.js` |

## 模組系統

本專案使用 **CommonJS**（`require` / `module.exports`），**不使用 ES Module**。

唯一例外：`vitest.config.js` 使用 `import/export`（Vitest 設定檔強制 ESM）。

## 環境變數

| 變數 | 用途 | 必要 | 預設值 |
|------|------|------|--------|
| `JWT_SECRET` | JWT 簽署密鑰 | **必要**（缺少則伺服器拒絕啟動） | 無 |
| `PORT` | 伺服器監聽 port | 選填 | `3001` |
| `BASE_URL` | 伺服器基礎 URL | 選填 | `http://localhost:3001` |
| `FRONTEND_URL` | CORS 允許來源 | 選填 | `http://localhost:5173` |
| `ADMIN_EMAIL` | 種子管理員 Email | 選填 | `admin@hexschool.com` |
| `ADMIN_PASSWORD` | 種子管理員密碼 | 選填 | `12345678` |
| `NODE_ENV` | 環境標識 | 選填 | 無 |

> `NODE_ENV=test` 時 bcrypt salt rounds 降為 1，加快測試速度。

## 新增 API 端點步驟

1. 在對應的 `src/routes/*.js` 新增路由 handler
2. 依規範回傳 `{ data, error, message }` 格式
3. 在 handler 上方加上 `@openapi` JSDoc 標記（參考現有路由格式）
4. 執行 `npm run openapi` 確認 openapi.json 更新正確
5. 在對應的 `tests/*.test.js` 補上整合測試

## 新增 Middleware 步驟

1. 在 `src/middleware/` 新建 `<name>Middleware.js`
2. 匯出單一函式 `function <name>Middleware(req, res, next)`
3. 在 `app.js` 或路由檔 `router.use()` 掛載

## 新增資料表步驟

1. 在 `src/database.js` 的 `initializeDatabase()` 中加入 `CREATE TABLE IF NOT EXISTS`
2. 如需 seed data，新增對應的 `seed<TableName>()` 函式並在 `initializeDatabase()` 呼叫
3. 欄位命名使用 snake_case
4. 主鍵一律用 UUID TEXT，以 `uuidv4()` 產生

## JSDoc @openapi 格式

路由檔中每個端點須標記 OpenAPI 規格，格式範例：

```js
/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: 取得商品列表
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                 error:
 *                   type: string
 *                   nullable: true
 *                 message:
 *                   type: string
 */
```

需要 JWT 認證的端點加上：

```yaml
security:
  - bearerAuth: []
```

## 計畫歸檔流程

1. **計畫命名格式**：`docs/plans/YYYY-MM-DD-<feature-name>.md`
2. **計畫文件結構**：User Story → Spec（技術規格）→ Tasks（可勾選清單）
3. **功能完成後**：將計畫檔案移至 `docs/plans/archive/`
4. **同步更新**：`docs/FEATURES.md`（標記完成）與 `docs/CHANGELOG.md`（新增變更記錄）
