# 理工科适配链路 · 合入与验收清单(P0 收尾)

> 目标:把本轮全部产物按依赖顺序、可验证地合入 paper-formatter 仓库。
> 每步含「改动点 / 验收命令 / 通过标准」。按序执行,前一步绿灯再进下一步。

---

## 产物清单(11 份,均经测试)

| # | 文件 | 落点 | 类型 | 测试 |
|---|------|------|------|------|
| 1 | discipline-inference.ts | api-gateway/src/rules/ | 学科推断打分 | 逻辑自检 |
| 2 | discipline-stem-rules.yaml | word-system-skill/rules/layers/ | 学科规则层 | 三方对账 |
| 3 | discipline.detectors.ts | api-gateway/src/rules/detectors/ | 11 个学科 detector | 三方对账 |
| 4 | reference-fields.detector.ts | api-gateway/src/rules/detectors/ | 参考文献字段级 | 11/11 |
| 5 | parse_enrich.py | docx-parser/src/ | 解析器四项增强 | 5/5 |
| 6 | parse_ref_refactor.py | 合入 parse.py | 文献识别重构 | 8/8 |
| 7 | patch-1-priority.ts | 替换 priority.ts | 权重化排序 | — |
| 8 | patch-2-canonical-rule-map.ts | 改 canonical-rule-map.ts | canonical 注册 | — |
| 9 | patch-3-analyze-job-runner.ts | 改 analyze-job-runner.ts | 主链路接入 | — |
| 10 | test_parse_enrich.py | docx-parser/tests/ | parser 单测 | 5/5 |
| 11 | (e2e) | docx-parser/tests/ | 端到端集成 | 全绿 |

---

## 合入顺序(按依赖,低风险先行)

### 阶段 A · 解析器(上游先行,独立可验证)

**A1. 合入 parse_ref_refactor 的文献识别重构**
- 改动:把 `_REF_ENTRY_PATTERNS` + `looks_like_reference_entry()` 复制进 parse.py 模块级;
  替换 detect_structure() 原 reference_entry 分支(`^\[\d+` + `text[:120]`)为放宽识别 + 不截断。
- 验收:`python3 src/parse.py <含点号制文献的docx>` → structure 中 reference_entry 数 = 实际文献数,且 text 含完整页码/DOI。
- 通过标准:点号制/括号制文献不再漏标;`grep '"type": "reference_entry"'` 输出条目 text 不以 120 字截断。

**A2. 合入 parse_enrich 四项增强**
- 改动:parse_enrich.py 放入 docx-parser/src/;parse.py 顶部 `from parse_enrich import enrich_parse_result`;
  parse_docx() 内 `return result` 前加 `result = enrich_parse_result(doc, result)`。
- 验收:`python3 tests/test_parse_enrich.py` → 5/5;`python3 tests/e2e_test.py` → 全绿。
- 通过标准:公式入 structure、is_three_line 标记、dpi 计算、subscript 标记全部产出。

**A3. 回归既有解析**
- 验收:对现有 fixtures 跑 parse.py,diff 输出。
- 通过标准:新增字段为「增量」,既有字段值不变(parse_enrich 纯增量,不应改动原 schema)。

### 阶段 B · 规则引擎(中游,依赖 A 的字段)

**B1. 替换 priority.ts(patch-1)**
- 改动:RuleDetection 加 `ruleSource?: RuleSource` 字段;整文件替换 priority.ts 为权重化版本。
- 验收:单测一组带不同 ruleSource 的 detection,断言 discipline(250) 排在 GB(200) 前、school(400) 后。
- 通过标准:同严重度下排序 = user>school>CAFA>discipline>GB>system。

**B2. 放入两个 detector 文件 + 改 canonical-rule-map(patch-2)**
- 改动:discipline.detectors.ts、reference-fields.detector.ts 放入 detectors/;
  按 patch-2 在 DETECTOR_TO_CANONICAL_RULE_ID 追加 11+6 条映射;
  SUB_SUP_SCRIPT 重映射到 canonical_formula_font;
  canonicalizeRuleDetections 内回填 detection.ruleSource。
- ⚠ 必做:reference-fields 的 6 条 canonical(canonical_reference_numbering 等)也要进 yaml(见 B3)。
- 验收:`getCanonicalRuleCoverage` 对新 ruleId 返回 covered,非 missing_mapping。
- 通过标准:17 个新 ruleId 全部 covered。

**B3. 学科 yaml 入库**
- 改动:discipline-stem-rules.yaml 放入 rules/layers/;补 6 条 reference 字段 canonical 规则定义。
- 验收:yaml 通过 school-rules.schema 校验(字段齐全)。
- 通过标准:12+6 条规则 schema 校验通过。

### 阶段 C · 主链路接入(下游,依赖 A+B)

**C1. analyze-job-runner 接入(patch-3)**
- 改动:detectionContext 构建后插 `inferDiscipline`;stem 时 mergeDisciplineLayer;
  detectors 注册表追加 `...disciplineDetectors` + referenceFieldsDetector;
  job 结果附 disciplineHint。
- 验收:上传理工科 docx,job 结果含 disciplineHint 且 ruleDetails 出现公式/三线表/参考文献条目。
- 通过标准:理工科文档左栏出现学科条目;文科文档不出现(回落 GB)。

**C2. 学科 detector 条件启用**
- 改动:runFormatRuleDetectors 按 ctx 上学科标记过滤,discipline detector 仅 stem 启用。
- 验收:文科 docx(无公式)不触发任何 discipline detector。
- 通过标准:非 stem 文档 disciplineDetectors 产出为空。

### 阶段 D · 前端(最后,可独立)

**D1. Step4DiffBanner 加 disciplineConfirm 变体**
- 改动:读 job 结果 disciplineHint.needsBanner;渲染「已按理工科校验 · 改为文科」;
  [改为文科] 触发 useDiffReviewController 重算(切 discipline=humanities)。
- 验收:模糊带文档浮现 banner;忽略 banner 不重算;点击才重算。
- 通过标准:高置信文档无 banner 但学科条目正常显隐。

---

## 已知缺口(非阻塞,标注清楚)

- **图轴/图例 detector 空跑**:依赖 parser 产 chart 类型 + 图内 embeddedText,当前未实现(P2,图内文本抽取成本高)。已在 discipline.detectors.ts 注释。
- **单元格级竖线漏判**:parse_enrich 仅判表格级 tblBorders;文档用 tcBorders 画竖线会漏(P1)。已在 parse_enrich.py NOTE 标注。
- **autoFix 半残**:公式/参考文献多产 manual_review;reference_format_update 策略声明未实现(P1)。

## 验收总命令

```bash
# 阶段 A
cd services/docx-parser && python3 tests/test_parse_enrich.py && python3 tests/e2e_test.py
# 阶段 B/C(TS)
cd services/api-gateway && npm test -- rules/
# 全链路冒烟:上传一份理工科论文,确认左栏出现公式/三线表/参考文献字段条目
```
