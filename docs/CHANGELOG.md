# 更新日誌

## [Unreleased]

## [1.0.0] - 2026-06-04

### Added

- 使用者認證：註冊、登入、個人資料（JWT，有效期 7 天）
- 公開商品 API：列表（分頁）、詳情
- 購物車 API：雙模式驗證（JWT 已登入 / X-Session-Id 訪客）
- 訂單 API：建立訂單（transaction 原子化）、列表、詳情、模擬付款
- 後台商品管理 API：CRUD（需 admin 角色）
- 後台訂單管理 API：列表（支援狀態篩選）、詳情（需 admin 角色）
- EJS 前台頁面：首頁、商品詳情、購物車、結帳、訂單列表、訂單詳情、登入
- EJS 後台頁面：商品管理、訂單管理
- Vitest + Supertest 整合測試（6 個測試檔，串行執行）
- OpenAPI 規格自動產生（`npm run openapi`）
