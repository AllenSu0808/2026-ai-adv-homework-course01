---
paths:
  - "src/routes/**"
---

# API 設計規則

- 所有 API 回應必須使用統一格式：`{ data: <payload|null>, error: <ERROR_CODE|null>, message: <string> }`
- 成功時 `error` 為 `null`，失敗時 `data` 為 `null`
- error code 使用全大寫底線格式（VALIDATION_ERROR、NOT_FOUND、UNAUTHORIZED、FORBIDDEN、CONFLICT、STOCK_INSUFFICIENT）
- 新增路由時，路徑使用 kebab-case 複數名詞（`/api/products`、`/api/orders`），資源操作用標準 HTTP method
- 每個路由 handler 正上方須加 `@openapi` JSDoc 標記，完成後執行 `npm run openapi` 確認格式正確
- 需要認證的一般路由使用 `authMiddleware`，管理員路由用 `authMiddleware + adminMiddleware`，購物車用內建 `dualAuth`
- 不要在路由 handler 中直接使用 `console.log` 作為正式輸出；錯誤往 `next(err)` 傳遞給 `errorHandler`
- 分頁參數固定為 `?page=1&limit=10`，limit 上限 100，回應包含 `pagination: { total, page, limit, totalPages }`
