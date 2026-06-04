#!/usr/bin/env bash
# SessionStart hook: context 壓縮後重新注入關鍵規則

cat << 'EOF'
⚠️  Context 已壓縮，以下為本專案關鍵規則提醒：

1. API 回應格式：{ data: <payload|null>, error: <ERROR_CODE|null>, message: <string> }
2. 建立訂單必須在 db.transaction() 中原子執行（建立訂單 + 扣庫存 + 清空購物車）
3. 購物車雙模式驗證：JWT 優先，降級為 X-Session-Id（若 Bearer token 無效則直接 401，不降級）
4. JWT：HS256 演算法、7 天有效期、payload = { userId, email, role }
5. 所有 SQL 使用參數化查詢（?），禁止字串拼接
6. 測試串行執行（fileParallelism: false），禁止 mock 資料庫
7. EJS 模板：前台用 layouts/front.ejs，後台用 layouts/admin.ejs

詳見 CLAUDE.md 與 docs/ 目錄。
EOF
