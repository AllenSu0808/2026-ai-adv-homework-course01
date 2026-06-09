# 更新日誌

## [Unreleased]

### Added

- 綠界 ECPay AIO 全方位金流整合（CMV-SHA256 協議）
  - `POST /api/ecpay/checkout/:orderId`：建立交易並回傳 HTML auto-submit form，前端以 `document.write()` 導向綠界付款頁
  - `GET /api/ecpay/status/:orderId`：呼叫 QueryTradeInfo/V5 主動查詢付款狀態，TradeStatus='1' 時更新訂單為 paid
  - `POST /api/ecpay/notify`：ReturnURL stub，驗證 CheckMacValue 後更新訂單狀態
- 新增 `/payment/complete` 前台頁面：ECPay ClientBackURL 落地頁，自動查詢付款狀態，成功後 3 秒倒數跳回訂單詳情頁
- `src/utils/ecpay.js` ECPay 工具模組：CheckMacValue 計算（含 Node.js 版 URL encode）、timing-safe 驗證、QueryTradeInfo 呼叫、HTML form 產生
- 訂單詳情頁新增「使用綠界付款」按鈕（保留「模擬付款成功／失敗」供開發測試用）

### Changed

- `orders` 資料表新增 `ecpay_merchant_trade_no TEXT` 欄位（透過 `runMigrations()` 遷移，相容現有資料庫）
- 訂單詳情頁付款按鈕區塊重新配置：ECPay 真實付款為主要按鈕，模擬付款按鈕標示為「模擬」

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
