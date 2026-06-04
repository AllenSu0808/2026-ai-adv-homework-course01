#!/usr/bin/env bash
# PostToolUse hook: 編輯原始碼後自動執行測試

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | node -e "
let b='';
process.stdin.on('data',d=>b+=d);
process.stdin.on('end',()=>{
  try{
    const d=JSON.parse(b);
    process.stdout.write(d.tool_input?.file_path||d.file_path||'');
  }catch(e){}
});
" 2>/dev/null || echo "")

FILE_PATH="${FILE_PATH//\\//}"

# 只在 src/ 原始碼或進入點被修改時觸發（不含測試檔本身）
if [[ "$FILE_PATH" == */src/* ]] || \
   [[ "$FILE_PATH" == */app.js ]] || \
   [[ "$FILE_PATH" == */server.js ]]; then
  echo "🧪 原始碼已更新，執行整合測試..."
  npm test 2>&1
fi
