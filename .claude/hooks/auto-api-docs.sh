#!/usr/bin/env bash
# PostToolUse hook: 編輯路由檔後自動產生 openapi.json

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

# 只在路由檔被修改時觸發
if [[ "$FILE_PATH" == */routes/*.js ]]; then
  echo "📄 路由檔已更新，重新產生 openapi.json..."
  npm run openapi 2>&1 | tail -3
fi
