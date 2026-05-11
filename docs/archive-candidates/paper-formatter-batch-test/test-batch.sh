#!/usr/bin/env bash
# ═══════════════════════════════════════════════════
# 批量跑论文 — Batch Paper Processing Test
# ═══════════════════════════════════════════════════
# 用法:
#   ./test-batch.sh                              # 用预设论文
#   ./test-batch.sh ~/Desktop/*.docx             # 指定文件
#   ./test-batch.sh --dir ~/Downloads thesis     # 按文件名过滤
# ═══════════════════════════════════════════════════

set -euo pipefail

API="${API:-http://localhost:4000/api/v1}"
FORMATTER="${FORMATTER:-http://localhost:5000}"
LOG_DIR="./batch-results/$(date +%Y%m%d_%H%M%S)"

# ── Color helpers ──
red()   { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }
blue()  { echo -e "\033[34m$1\033[0m"; }
dim()   { echo -e "\033[2m$1\033[0m"; }

# ── Init ──
mkdir -p "$LOG_DIR"
SUMMARY="$LOG_DIR/SUMMARY.md"
SUMMARY_JSON="$LOG_DIR/summary.json"
FAILED=0
PASSED=0
TOTAL=0
RESULTS='[]'

echo "# 批量论文排版测试" > "$SUMMARY"
echo "" >> "$SUMMARY"
echo "| # | 文件名 | 上传 | 分析 | 格式化 | 耗时 | 备注 |" >> "$SUMMARY"
echo "|---|---|---|---|---|---|---|" >> "$SUMMARY"

# ── Collect files ──
FILES=()

if [[ $# -eq 0 ]]; then
  # 默认: 用桌面上的论文相关文件
  for f in "$HOME/Desktop/"*论文*".docx" "$HOME/Desktop/"*毕业*".docx" "$HOME/Desktop/"*格式*".docx" "$HOME/Desktop/"*.docx; do
    [ -f "$f" ] && FILES+=("$f")
  done
elif [[ "$1" == "--dir" && -n "$2" ]]; then
  SEARCH_DIR="$2"
  FILTER="${3:-}"
  while IFS= read -r -d '' f; do
    FILES+=("$f")
  done < <(find "$SEARCH_DIR" -name "*.docx" \( -iname "*${FILTER}*" -o -iname "*论文*" -o -iname "*thesis*" \) -print0 2>/dev/null || true)
  if [ ${#FILES[@]} -eq 0 ]; then
    while IFS= read -r -d '' f; do
      FILES+=("$f")
    done < <(find "$SEARCH_DIR" -name "*.docx" -print0 2>/dev/null | head -z -n 20 || true)
  fi
else
  for f in "$@"; do
    [ -f "$f" ] && FILES+=("$f")
  done
fi

if [ ${#FILES[@]} -eq 0 ]; then
  red "❌ 未找到 .docx 文件。请指定路径: $0 ~/path/to/files/*.docx"
  exit 1
fi

blue "📋 共找到 ${#FILES[@]} 个论文文件"
echo ""

# ── Check health ──
blue "🔍 检查服务状态..."
API_BASE="${API%/api/v1}"
if ! curl -sf "$API_BASE/health" > /dev/null 2>&1; then
  red "❌ API Gateway 无响应 ($API_BASE)"
  exit 1
fi
green "✅ API Gateway OK"

if ! curl -sf "$FORMATTER/health" > /dev/null 2>&1; then
  red "⚠️  Formatter 无响应 ($FORMATTER) — 格式化将跳过"
  FORMATTER_DOWN=true
else
  green "✅ Formatter OK"
  FORMATTER_DOWN=false
fi

# ── Rules / Profiles ──
# 用无 profile 模式 (auto-detection)，让系统自动检测格式问题
dim "ℹ️  使用自动检测模式（无学校规则包）"

echo ""

# ═══════════════════════════════════════════════════
#  批量处理主循环
# ═══════════════════════════════════════════════════

process_one() {
  local FILE="$1"
  local INDEX="$2"
  local BASENAME
  BASENAME=$(basename "$FILE")
  local LOGFILE="$LOG_DIR/$(printf "%02d" "$INDEX")_${BASENAME%.*}.log"

  TOTAL=$((TOTAL + 1))
  local START_TIME
  START_TIME=$(date +%s)

  echo -e "$(blue "[$INDEX/${#FILES[@]}]") $(dim "$BASENAME")"
  echo "" > "$LOGFILE"

  local UPLOAD_OK="✗"
  local ANALYZE_OK="✗"
  local FORMAT_OK="✗"
  local DURATION="—"

  # ── 1. Upload ──
  echo -n "  $(dim "上传...")"
  local UPLOAD_RES
  UPLOAD_RES=$(curl -sf -X POST "$API/documents" \
    -F "file=@$FILE" 2>&1)
  local DOC_ID
  DOC_ID=$(echo "$UPLOAD_RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('docId',''))" 2>/dev/null || echo "")

  if [ -z "$DOC_ID" ]; then
    echo " $(red "✗")"
    echo "  $(red "  上传失败: $UPLOAD_RES")" | tee -a "$LOGFILE"
    echo "$INDEX | $BASENAME | ✗ | — | — | — | 上传失败 |" >> "$SUMMARY"
    FAILED=$((FAILED + 1))
    RESULTS=$(echo "$RESULTS" | python3 -c "
import sys, json
r = json.load(sys.stdin)
r.append({'index': $INDEX, 'file': '$BASENAME', 'docId': '', 'upload': False, 'analyze': False, 'format': False, 'error': 'upload_failed'})
print(json.dumps(r))
" 2>/dev/null || echo "$RESULTS")
    return
  fi
  UPLOAD_OK="✓"
  echo " $(green "$DOC_ID")"

  # ── 2. Analyze ──
  echo -n "  $(dim "分析...")"
  local ANALYZE_RES
  ANALYZE_RES=$(curl -sf -X POST "$API/jobs/analyze" \
    -H "Content-Type: application/json" \
    -d "{\"docId\": \"$DOC_ID\"}" 2>&1)
  local JOB_ID
  JOB_ID=$(echo "$ANALYZE_RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('jobId',''))" 2>/dev/null || echo "")

  if [ -z "$JOB_ID" ]; then
    echo " $(red "✗")"
    echo "  $(red "  分析启动失败: $ANALYZE_RES")" | tee -a "$LOGFILE"
    echo "$INDEX | $BASENAME | ✓ | ✗ | — | — | 分析启动失败 |" >> "$SUMMARY"
    FAILED=$((FAILED + 1))
    RESULTS=$(echo "$RESULTS" | python3 -c "
import sys, json
r = json.load(sys.stdin)
r.append({'index': $INDEX, 'file': '$BASENAME', 'docId': '$DOC_ID', 'upload': True, 'analyze': False, 'format': False, 'error': 'analyze_start_failed'})
print(json.dumps(r))
" 2>/dev/null || echo "$RESULTS")
    return
  fi

  # 轮询分析结果
  local ANALYZE_DONE=false
  local ANALYZE_RESULT=""
  for i in $(seq 1 30); do
    sleep 1
    ANALYZE_RESULT=$(curl -sf "$API/jobs/$JOB_ID" 2>/dev/null || echo "")
    local STATUS
    STATUS=$(echo "$ANALYZE_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "")
    if [ "$STATUS" = "completed" ]; then
      ANALYZE_DONE=true
      break
    elif [ "$STATUS" = "failed" ]; then
      break
    fi
  done

  if [ "$ANALYZE_DONE" != true ]; then
    echo " $(red "✗")"
    local ERR_MSG
    ERR_MSG=$(echo "$ANALYZE_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error_message','timeout'))" 2>/dev/null || echo "timeout")
    echo "  $(red "  分析失败: $ERR_MSG")" | tee -a "$LOGFILE"
    echo "$INDEX | $BASENAME | ✓ | ✗ | — | — | 分析失败 |" >> "$SUMMARY"
    FAILED=$((FAILED + 1))
    RESULTS=$(echo "$RESULTS" | python3 -c "
import sys, json
r = json.load(sys.stdin)
r.append({'index': $INDEX, 'file': '$BASENAME', 'docId': '$DOC_ID', 'upload': True, 'analyze': False, 'format': False, 'error': 'analyze_failed: $ERR_MSG', 'analyzeResult': '$(echo "$ANALYZE_RESULT" | head -c 200)'})
print(json.dumps(r))
" 2>/dev/null || echo "$RESULTS")
    return
  fi
  ANALYZE_OK="✓"
  echo " $(green "✓")"

  # 保存分析结果
  echo "$ANALYZE_RESULT" > "$LOG_DIR/$(printf "%02d" "$INDEX")_${BASENAME%.*}_analyze.json"

  # 提取关键指标
  local RULES_PASSED
  RULES_PASSED=$(echo "$ANALYZE_RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
r = d.get('result',{}).get('rules',{})
print(f\"{r.get('passed',0)}/{r.get('passed',0)+r.get('warnings',0)+r.get('failed',0)} 通过\")
" 2>/dev/null || echo "")
  local HEADING_COUNT
  HEADING_COUNT=$(echo "$ANALYZE_RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
h = d.get('result',{}).get('rawHeadings',[])
print(len(h))
" 2>/dev/null || echo "0")

  # ── 3. Format ──
  if [ "$FORMATTER_DOWN" = false ]; then
    echo -n "  $(dim "格式化...")"
    local FORMAT_RES
    FORMAT_RES=$(curl -sf -X POST "$API/jobs/format" \
      -H "Content-Type: application/json" \
      -d "{\"docId\": \"$DOC_ID\"}" 2>&1)
    local FORMAT_JOB_ID
    FORMAT_JOB_ID=$(echo "$FORMAT_RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('jobId',''))" 2>/dev/null || echo "")

    if [ -z "$FORMAT_JOB_ID" ]; then
      echo " $(red "✗")"
      echo "  $(red "  格式化启动失败")" | tee -a "$LOGFILE"
    else
      local FORMAT_DONE=false
      for i in $(seq 1 30); do
        sleep 1
        FORMAT_RESULT=$(curl -sf "$API/jobs/$FORMAT_JOB_ID" 2>/dev/null || echo "")
        local FSTATUS
        FSTATUS=$(echo "$FORMAT_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null || echo "")
        if [ "$FSTATUS" = "completed" ]; then
          FORMAT_DONE=true
          break
        elif [ "$FSTATUS" = "failed" ]; then
          break
        fi
      done

      if [ "$FORMAT_DONE" = true ]; then
        FORMAT_OK="✓"
        echo " $(green "✓")"
        # 保存下载链接
        echo "$FORMAT_RESULT" > "$LOG_DIR/$(printf "%02d" "$INDEX")_${BASENAME%.*}_format.json"
      else
        echo " $(red "✗")"
        echo "  $(red "  格式化超时或失败")" | tee -a "$LOGFILE"
      fi
    fi
  else
    FORMAT_OK="—"
    dim "  (格式化跳过 — 服务不可用)"
  fi

  # ── 汇总 ──
  local END_TIME
  END_TIME=$(date +%s)
  DURATION="$((END_TIME - START_TIME))s"

  HC="${HEADING_COUNT:-0}"
  RP="${RULES_PASSED:-}"

  local ROW_NOTE="headings_${HC}"
  [ -n "$RP" ] && ROW_NOTE="$RP"

  echo "$INDEX | $BASENAME | $UPLOAD_OK | $ANALYZE_OK | $FORMAT_OK | $DURATION | $ROW_NOTE |" >> "$SUMMARY"
  PASSED=$((PASSED + 1))
  echo "$(dim "  完成: $DURATION")"
  echo ""
}

# ═══════════════════════════════════════════════════
#  Execute
# ═══════════════════════════════════════════════════

IDX=0
for F in "${FILES[@]}"; do
  IDX=$((IDX + 1))
  process_one "$F" "$IDX"
done

echo "$RESULTS" > "$SUMMARY_JSON"

# ═══════════════════════════════════════════════════
#  最终统计
# ═══════════════════════════════════════════════════

echo "═══════════════════════════════════════════" | tee -a "$SUMMARY"
echo "" >> "$SUMMARY"

if [ "$FAILED" -eq 0 ]; then
  green "✅ 全部通过: $PASSED/$TOTAL"
  echo "**结果: ✅ 全部通过 ($PASSED/$TOTAL)**" >> "$SUMMARY"
else
  red "❌ $FAILED/$TOTAL 失败"
  echo "**结果: ❌ $FAILED/$TOTAL 失败**" >> "$SUMMARY"
fi

echo "" >> "$SUMMARY"
echo "---" >> "$SUMMARY"
echo "运行时间: $(date '+%Y-%m-%d %H:%M:%S')" >> "$SUMMARY"
echo "报告目录: $LOG_DIR" >> "$SUMMARY"

echo ""
blue "📝 详细报告: $LOG_DIR"
blue "📊 摘要: $SUMMARY"
echo ""
cat "$SUMMARY"
