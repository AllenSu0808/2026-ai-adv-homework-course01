#!/usr/bin/env bash
# PreToolUse hook: 阻止編輯敏感檔案

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

# 正規化路徑分隔符
FILE_PATH="${FILE_PATH//\\//}"

BASENAME=$(basename "$FILE_PATH")

# 敏感檔案黑名單
if [[ "$BASENAME" == ".env" ]] || \
   [[ "$FILE_PATH" == *".env."* && "$FILE_PATH" != *".env.example"* ]] || \
   [[ "$BASENAME" == "*.sqlite" || "$FILE_PATH" == *database.sqlite ]] || \
   [[ "$BASENAME" == "package-lock.json" ]]; then
  echo "🚫 BLOCKED: 禁止直接編輯敏感檔案: $FILE_PATH" >&2
  exit 2
fi
