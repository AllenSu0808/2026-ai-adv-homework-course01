---
# 全域規則（無 paths 限制）
---

# Git Commit 規則

- Commit message 格式：`<type>: <描述>`（全小寫，繁體中文描述）
- 允許的 type 類型：
  - `feat`：新增功能
  - `fix`：修復 bug
  - `refactor`：重構（不影響功能）
  - `test`：新增或修改測試
  - `docs`：文件變更
  - `style`：格式調整（不影響邏輯）
  - `chore`：設定檔、工具、依賴更新
- 禁止 commit 以下檔案：`.env`、`*.sqlite`、`database.sqlite`、`*.key`、`*.pem`
- `package-lock.json` 應納入版控，不要加入 `.gitignore`
- 每次 commit 聚焦單一目的，不要把多個不相關的修改混在一個 commit
- 不在 commit message 中加入 `Co-Authored-By` 標記
