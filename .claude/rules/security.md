---
# 全域規則（無 paths 限制）
---

# 安全性規則

- 所有 SQL 查詢必須使用 better-sqlite3 的參數化語法（`?` 佔位符），禁止任何形式的字串拼接 SQL
- 密碼必須以 bcrypt hash 儲存，salt rounds 生產環境使用 10，測試環境使用 1（`NODE_ENV === 'test'`）
- JWT 簽署演算法固定為 `HS256`，驗證時必須指定 `{ algorithms: ['HS256'] }`，禁止省略此選項
- `JWT_SECRET` 只從 `process.env` 讀取，禁止硬寫在程式碼中
- CORS 設定只允許 `process.env.FRONTEND_URL` 指定的來源，不要使用 `origin: '*'`
- 使用者輸入的 email 須通過正則格式驗證，不直接信任傳入值
- 管理員帳號只由 seed 機制建立，禁止透過 API 直接設定 `role: 'admin'`
- `.env` 檔案禁止 commit 進版控（已在 `.gitignore` 中排除），只 commit `.env.example`
