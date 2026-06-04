---
paths:
  - "views/**"
---

# 前端/模板規則

- 所有頁面必須套用 layout：前台用 `layouts/front.ejs`，後台用 `layouts/admin.ejs`
- 頁面渲染固定傳入三個變數：`body`（頁面內容字串）、`title`（頁籤標題）、`pageScript`（頁面專屬 JS 路徑）
- 在 layout 中以 `<%- body %>` 輸出 HTML（unescaped），頁面 partial 中的動態文字用 `<%= %>` 輸出（自動 HTML escape，防 XSS）
- 動態插入 HTML 片段（如 innerHTML 或後端渲染 HTML 字串）時必須確認來源可信，避免 XSS
- 頁面專屬 JS 放在 `public/js/pages/<page-name>.js`，並在 `pageRoutes.js` 的 `pageScript` 參數中引用
- 共用元件（header、footer、notification）放在 `views/partials/`，以 `<%- include('../partials/<name>') %>` 引入
- TailwindCSS class 直接寫在 EJS 模板中，不要新增自訂 CSS class（除非 TailwindCSS 無法實現）
- 前端 JS 透過 `public/js/api.js` 的工具函式呼叫 API，不要在頁面 JS 中直接使用 raw `fetch`
